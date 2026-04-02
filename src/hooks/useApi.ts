/**
 * WebSocket JSON-RPC API Hook
 * 管理与设备的 WebSocket 连接，支持 JSON-RPC 调用和事件订阅
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import type {
    JsonRpcRequest,
    JsonRpcSuccessResponse,
    JsonRpcErrorResponse,
    JsonRpcEvent,
} from '../types/device';

/** 重连间隔（毫秒） */
const RECONNECT_INTERVAL = 3000;
/** 最大重连间隔 */
const MAX_RECONNECT_INTERVAL = 30000;
/** 请求超时（毫秒） */
const REQUEST_TIMEOUT = 10000;

/**
 * JSON-RPC 调用回调类型
 */
type PendingRequest = {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
};

/**
 * 事件订阅回调类型
 */
type EventCallback = (event: JsonRpcEvent) => void;

/**
 * WebSocket API Hook
 * 提供与设备的实时通信能力
 *
 * @param wsUrl WebSocket 连接地址，如 ws://192.168.1.100:9090
 */
export function useApi(wsUrl?: string) {
    const wsRef = useRef<WebSocket | null>(null);
    const pendingRef = useRef<Map<string, PendingRequest>>(new Map());
    const subscribersRef = useRef<Map<string, Set<EventCallback>>>(new Map());
    const reqIdRef = useRef(0);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectDelayRef = useRef(RECONNECT_INTERVAL);
    const tokenRef = useRef<string | undefined>(undefined);

    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);

    /**
     * 生成请求 ID
     */
    const nextId = useCallback((): string => {
        reqIdRef.current += 1;
        return `req-${reqIdRef.current}`;
    }, []);

    /**
     * 处理收到的消息
     */
    const handleMessage = useCallback((data: string) => {
        let parsed: unknown;
        try {
            parsed = JSON.parse(data);
        } catch {
            console.warn('WebSocket 收到无效 JSON:', data);
            return;
        }

        const msg = parsed as Record<string, unknown>;

        // 事件推送（包含 event 字段）
        if (msg.event) {
            const event = parsed as JsonRpcEvent;
            // 匹配订阅的 pattern
            subscribersRef.current.forEach((callbacks, pattern) => {
                if (matchPattern(event.event, pattern)) {
                    callbacks.forEach(cb => cb(event));
                }
            });
            return;
        }

        // JSON-RPC 响应（包含 id 字段）
        if (msg.id) {
            const id = msg.id as string;
            const pending = pendingRef.current.get(id);
            if (!pending) return;

            clearTimeout(pending.timer);
            pendingRef.current.delete(id);

            if ('error' in msg) {
                const errorResp = parsed as unknown as JsonRpcErrorResponse;
                pending.reject(
                    new Error(errorResp.error.message || `错误码: ${errorResp.error.code}`)
                );
            } else {
                const successResp = parsed as unknown as JsonRpcSuccessResponse;
                pending.resolve(successResp.result);
            }
        }
    }, []);

    /**
     * 建立 WebSocket 连接
     */
    const connect = useCallback((url?: string) => {
        const targetUrl = url || wsUrl;
        if (!targetUrl) return;

        // 清理旧连接
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setConnecting(true);
        reconnectDelayRef.current = RECONNECT_INTERVAL;

        const ws = new WebSocket(targetUrl);

        ws.onopen = () => {
            setConnected(true);
            setConnecting(false);
            console.log('WebSocket 已连接:', targetUrl);
        };

        ws.onmessage = (event) => {
            handleMessage(event.data as string);
        };

        ws.onclose = () => {
            setConnected(false);
            setConnecting(false);
            console.log('WebSocket 已断开:', targetUrl);
            // 自动重连
            scheduleReconnect(targetUrl);
        };

        ws.onerror = (error) => {
            console.warn('WebSocket 错误:', error);
        };

        wsRef.current = ws;
    }, [wsUrl, handleMessage]);

    /**
     * 计划重连
     */
    const scheduleReconnect = useCallback((url: string) => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
        }

        reconnectTimerRef.current = setTimeout(() => {
            console.log('尝试重新连接...', url);
            connect(url);
        }, reconnectDelayRef.current);

        // 指数退避
        reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * 2,
            MAX_RECONNECT_INTERVAL
        );
    }, [connect]);

    /**
     * 主动断开连接
     */
    const disconnect = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setConnected(false);
        setConnecting(false);
    }, []);

    /**
     * JSON-RPC 调用
     *
     * @param method 方法名，如 'lighting.cue.play'
     * @param params 调用参数
     * @returns Promise<result>
     */
    const call = useCallback(<T = unknown>(
        method: string,
        params?: Record<string, unknown>
    ): Promise<T> => {
        return new Promise((resolve, reject) => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                reject(new Error('WebSocket 未连接'));
                return;
            }

            const id = nextId();
            const request: JsonRpcRequest = {
                id,
                method,
                params: params || {},
            };

            // 如果有 token 则附带
            if (tokenRef.current) {
                request.token = tokenRef.current;
            }

            // 设置超时
            const timer = setTimeout(() => {
                pendingRef.current.delete(id);
                reject(new Error(`请求超时: ${method}`));
            }, REQUEST_TIMEOUT);

            pendingRef.current.set(id, {
                resolve: resolve as (r: unknown) => void,
                reject,
                timer,
            });

            wsRef.current.send(JSON.stringify(request));
        });
    }, [nextId]);

    /**
     * 订阅事件
     * 支持通配符：* 匹配单层级，** 匹配多层级
     *
     * @param pattern 事件匹配模式，如 'lighting.*' 或 'system.**'
     * @param callback 事件回调
     */
    const subscribe = useCallback(async (
        pattern: string,
        callback: EventCallback
    ): Promise<void> => {
        // 注册本地回调
        if (!subscribersRef.current.has(pattern)) {
            subscribersRef.current.set(pattern, new Set());
        }
        subscribersRef.current.get(pattern)!.add(callback);

        // 发送订阅请求
        try {
            await call('subscribe', { pattern });
        } catch (err) {
            console.warn('订阅失败:', pattern, err);
        }
    }, [call]);

    /**
     * 取消订阅
     */
    const unsubscribe = useCallback(async (
        pattern: string,
        callback: EventCallback
    ): Promise<void> => {
        const callbacks = subscribersRef.current.get(pattern);
        if (callbacks) {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                subscribersRef.current.delete(pattern);
            }
        }

        try {
            await call('unsubscribe', { pattern });
        } catch (err) {
            console.warn('取消订阅失败:', pattern, err);
        }
    }, [call]);

    /**
     * 设置认证 Token
     */
    const setToken = useCallback((token: string | undefined) => {
        tokenRef.current = token;
    }, []);

    /**
     * 组件卸载时断开连接
     */
    useEffect(() => {
        return () => {
            disconnect();
            // 清理所有待处理请求
            pendingRef.current.forEach(pending => {
                clearTimeout(pending.timer);
                pending.reject(new Error('连接已关闭'));
            });
            pendingRef.current.clear();
        };
    }, [disconnect]);

    return {
        connected,
        connecting,
        connect,
        disconnect,
        call,
        subscribe,
        unsubscribe,
        setToken,
    };
}

/**
 * 事件名匹配通配符
 * * 匹配单层级：lighting.* 匹配 lighting.cue
 * ** 匹配多层级：system.** 匹配 system.auth.expired
 */
function matchPattern(eventName: string, pattern: string): boolean {
    const eventParts = eventName.split('.');
    const patternParts = pattern.split('.');

    for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i] === '**') {
            // ** 匹配剩余所有层级
            return true;
        }
        if (i >= eventParts.length) {
            return false;
        }
        if (patternParts[i] !== '*' && patternParts[i] !== eventParts[i]) {
            return false;
        }
    }

    return eventParts.length === patternParts.length;
}

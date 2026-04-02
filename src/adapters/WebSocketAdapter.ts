/**
 * WebSocket JSON-RPC 适配器
 * 用于 JRAiController 等使用 WebSocket 通信的设备
 * 基于 useApi.ts 的逻辑改为类实现，支持 JSON-RPC 调用、事件订阅和自动重连
 */

import type {
    Device,
    ConnectionState,
    AdapterEventCallback,
    JsonRpcRequest,
    JsonRpcSuccessResponse,
    JsonRpcErrorResponse,
} from '../types/device';
import { DeviceAdapter } from './DeviceAdapter';

/** 重连基础间隔（毫秒） */
const RECONNECT_INTERVAL = 3000;

/** 最大重连间隔（毫秒） */
const MAX_RECONNECT_INTERVAL = 30000;

/** 请求超时时间（毫秒） */
const REQUEST_TIMEOUT = 10000;

/**
 * 待处理的 JSON-RPC 请求
 */
interface PendingRequest {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
}

/**
 * WebSocket JSON-RPC 适配器
 * 通过 WebSocket 连接与设备进行 JSON-RPC 通信
 */
export class WebSocketAdapter extends DeviceAdapter {
    readonly protocolType = 'websocket' as const;

    /** WebSocket 实例 */
    private ws: WebSocket | null = null;

    /** 待处理的请求映射，key 为请求 ID */
    private pendingRequests: Map<string, PendingRequest> = new Map();

    /** 请求 ID 自增计数器 */
    private requestIdCounter = 0;

    /** 重连定时器 */
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    /** 当前重连延迟 */
    private reconnectDelay = RECONNECT_INTERVAL;

    /** 重连目标 URL */
    private targetUrl = '';

    /** 是否为主动断开（不触发自动重连） */
    private intentionalDisconnect = false;

    constructor(device: Device) {
        super(device);
    }

    /**
     * 建立 WebSocket 连接
     * 连接到 ws://{device.host}:{device.wsPort}
     */
    async connect(): Promise<void> {
        this.targetUrl = `ws://${this.device.host}:${this.device.wsPort}`;
        this.intentionalDisconnect = false;

        // 清理旧连接
        this.closeWebSocket();

        this.state = 'connecting';

        return new Promise<void>((resolve, reject) => {
            const ws = new WebSocket(this.targetUrl);

            ws.onopen = () => {
                this.state = 'connected';
                this.reconnectDelay = RECONNECT_INTERVAL;
                resolve();
            };

            ws.onmessage = (event) => {
                this.handleMessage(event.data as string);
            };

            ws.onclose = () => {
                const wasConnected = this.state === 'connected';
                this.state = 'disconnected';

                // 如果不是主动断开，则尝试自动重连
                if (!this.intentionalDisconnect) {
                    this.scheduleReconnect();
                }
            };

            ws.onerror = () => {
                if (this.state === 'connecting') {
                    this.state = 'disconnected';
                    reject(new Error(`无法连接到 ${this.targetUrl}`));
                }
            };

            this.ws = ws;
        });
    }

    /**
     * 主动断开连接
     * 清理 WebSocket 和重连定时器
     */
    disconnect(): void {
        this.intentionalDisconnect = true;
        this.clearReconnectTimer();
        this.closeWebSocket();

        // 清理所有待处理请求
        this.pendingRequests.forEach(pending => {
            clearTimeout(pending.timer);
            pending.reject(new Error('连接已关闭'));
        });
        this.pendingRequests.clear();

        this.state = 'disconnected';
    }

    /**
     * 发送 JSON-RPC 调用请求
     *
     * @param method 方法名，如 'lighting.cue.play'
     * @param params 调用参数
     * @returns Promise<result> 服务端返回的结果
     */
    async call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket 未连接');
        }

        const id = this.nextId();
        const request: JsonRpcRequest = {
            id,
            method,
            params: params || {},
        };

        // 如果有 Token 则附带
        if (this.tokenValue) {
            request.token = this.tokenValue;
        }

        return new Promise<T>((resolve, reject) => {
            // 设置请求超时
            const timer = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`请求超时: ${method}`));
            }, REQUEST_TIMEOUT);

            this.pendingRequests.set(id, {
                resolve: resolve as (result: unknown) => void,
                reject,
                timer,
            });

            this.ws!.send(JSON.stringify(request));
        });
    }

    /**
     * 订阅事件（扩展基类方法，同时发送远端订阅请求）
     */
    subscribe(event: string, callback: AdapterEventCallback): void {
        super.subscribe(event, callback);

        // 向服务端发送订阅请求
        this.call('subscribe', { pattern: event }).catch(() => {
            // 订阅请求失败不影响本地注册
        });
    }

    /**
     * 取消订阅事件（扩展基类方法，同时发送远端取消订阅请求）
     */
    unsubscribe(event: string, callback: AdapterEventCallback): void {
        super.unsubscribe(event, callback);

        // 如果该模式已无本地订阅者，通知服务端取消
        const callbacks = this.listeners.get(event);
        if (!callbacks || callbacks.size === 0) {
            this.call('unsubscribe', { pattern: event }).catch(() => {
                // 取消订阅请求失败可忽略
            });
        }
    }

    /**
     * 生成请求 ID
     */
    private nextId(): string {
        this.requestIdCounter += 1;
        return `req-${this.requestIdCounter}`;
    }

    /**
     * 处理收到的 WebSocket 消息
     * 根据消息类型分发到事件系统或 resolve 对应的 pending request
     */
    private handleMessage(data: string): void {
        let parsed: unknown;
        try {
            parsed = JSON.parse(data);
        } catch {
            return;
        }

        const msg = parsed as Record<string, unknown>;

        // 事件推送（包含 event 字段）
        if (msg.event) {
            const eventName = msg.event as string;
            const eventData = msg.data;
            this.emitEvent(eventName, eventData);
            return;
        }

        // JSON-RPC 响应（包含 id 字段）
        if (msg.id) {
            const id = msg.id as string;
            const pending = this.pendingRequests.get(id);
            if (!pending) return;

            clearTimeout(pending.timer);
            this.pendingRequests.delete(id);

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
    }

    /**
     * 计划自动重连（指数退避）
     */
    private scheduleReconnect(): void {
        this.clearReconnectTimer();

        this.reconnectTimer = setTimeout(() => {
            this.connect().catch(() => {
                // 重连失败，下次 scheduleReconnect 会继续尝试
            });
        }, this.reconnectDelay);

        // 指数退避：每次翻倍，上限 MAX_RECONNECT_INTERVAL
        this.reconnectDelay = Math.min(
            this.reconnectDelay * 2,
            MAX_RECONNECT_INTERVAL
        );
    }

    /**
     * 清理重连定时器
     */
    private clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    /**
     * 关闭 WebSocket 连接（不触发重连逻辑）
     */
    private closeWebSocket(): void {
        if (this.ws) {
            // 防止 onclose 触发重连
            this.ws.onclose = null;
            this.ws.close();
            this.ws = null;
        }
    }
}

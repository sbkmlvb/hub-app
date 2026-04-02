/**
 * 设备适配器抽象基类
 * 所有协议适配器继承此类，实现具体的通信逻辑
 */

import type { Device, ProtocolType, ConnectionState, AdapterEventCallback } from '../types/device';

/**
 * 设备适配器抽象基类
 * 提供统一的事件订阅/分发机制，子类实现具体的连接和通信逻辑
 */
export abstract class DeviceAdapter {
    /** 关联的设备信息 */
    protected device: Device;

    /** 当前连接状态 */
    protected state: ConnectionState = 'disconnected';

    /** 事件订阅者，key 为匹配模式（支持通配符） */
    protected listeners: Map<string, Set<AdapterEventCallback>> = new Map();

    /** 认证 Token */
    protected tokenValue: string | undefined;

    constructor(device: Device) {
        this.device = device;
    }

    /** 建立连接 */
    abstract connect(): Promise<void>;

    /** 断开连接 */
    abstract disconnect(): void;

    /** 发起 JSON-RPC 调用 */
    abstract call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;

    /** 适配器对应的协议类型 */
    abstract readonly protocolType: ProtocolType;

    /**
     * 获取当前连接状态
     */
    getConnectionState(): ConnectionState {
        return this.state;
    }

    /**
     * 设置认证 Token
     */
    setToken(token: string): void {
        this.tokenValue = token;
    }

    /**
     * 订阅事件
     * 支持通配符模式：* 匹配单层级，** 匹配多层级
     *
     * @param event 事件匹配模式，如 'lighting.*' 或 'system.**'
     * @param callback 事件回调
     */
    subscribe(event: string, callback: AdapterEventCallback): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    /**
     * 取消订阅事件
     *
     * @param event 事件匹配模式
     * @param callback 要移除的回调
     */
    unsubscribe(event: string, callback: AdapterEventCallback): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
                this.listeners.delete(event);
            }
        }
    }

    /**
     * 分发事件到匹配的订阅者
     *
     * @param event 事件名称
     * @param data 事件数据
     */
    protected emitEvent(event: string, data: unknown): void {
        this.listeners.forEach((callbacks, pattern) => {
            if (matchPattern(event, pattern)) {
                callbacks.forEach(cb => cb(event, data));
            }
        });
    }
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

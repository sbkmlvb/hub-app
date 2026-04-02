/**
 * HTTP REST 适配器
 * 用于只需要 HTTP 通信的设备场景（如设备发现、文件操作等）
 */

import type { Device, ConnectionState } from '../types/device';
import { DeviceAdapter } from './DeviceAdapter';

/** HTTP 请求超时时间（毫秒） */
const REQUEST_TIMEOUT = 5000;

/**
 * 方法名到 HTTP 端点的映射
 * 将 JSON-RPC 风格的 method 映射为 REST API 路径和请求方法
 */
const METHOD_ROUTE_MAP: Record<string, { path: string; httpMethod: string }> = {
    'system.info':              { path: '/api/identity',       httpMethod: 'GET' },
    'system.auth.login':        { path: '/api/auth/login',     httpMethod: 'POST' },
    'system.auth.check':        { path: '/api/auth/check',     httpMethod: 'GET' },
    'system.auth.logout':       { path: '/api/auth/logout',    httpMethod: 'POST' },
    'system.restart':           { path: '/api/system/restart', httpMethod: 'POST' },
    'system.shutdown':          { path: '/api/system/shutdown',httpMethod: 'POST' },
    'file.list':                { path: '/api/files',          httpMethod: 'GET' },
    'file.upload':              { path: '/api/files/upload',   httpMethod: 'POST' },
    'file.download':            { path: '/api/files/download', httpMethod: 'GET' },
};

/**
 * HTTP REST 适配器
 * 通过 HTTP REST API 与设备通信
 */
export class HttpAdapter extends DeviceAdapter {
    readonly protocolType = 'http' as const;

    /** 基础 URL */
    private baseUrl: string;

    constructor(device: Device) {
        super(device);
        this.baseUrl = `http://${device.host}:${device.httpPort}`;
    }

    /**
     * 检查设备是否可达
     * 通过 GET /api/identity 验证连接
     */
    async connect(): Promise<void> {
        this.state = 'connecting';

        try {
            const response = await fetch(`${this.baseUrl}/api/identity`, {
                signal: AbortSignal.timeout(REQUEST_TIMEOUT),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            this.state = 'connected';
        } catch (error) {
            this.state = 'disconnected';
            throw new Error(`设备连接失败: ${this.device.host}`);
        }
    }

    /**
     * 断开连接（HTTP 无状态，空操作）
     */
    disconnect(): void {
        this.state = 'disconnected';
    }

    /**
     * 通过 HTTP 发送请求
     * 将 method 映射到对应的 REST API 端点
     *
     * @param method 方法名，如 'system.info'
     * @param params 请求参数
     * @returns 响应数据
     */
    async call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
        const route = METHOD_ROUTE_MAP[method];

        if (!route) {
            throw new Error(`不支持的 HTTP 方法: ${method}`);
        }

        const url = `${this.baseUrl}${route.path}`;
        const options: RequestInit = {
            method: route.httpMethod,
            headers: {
                'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        };

        // 附带 Token
        if (this.tokenValue) {
            (options.headers as Record<string, string>)['Authorization'] =
                `Bearer ${this.tokenValue}`;
        }

        // POST 请求附带请求体
        if (route.httpMethod === 'POST' && params) {
            options.body = JSON.stringify(params);
        }

        // GET 请求附带查询参数
        if (route.httpMethod === 'GET' && params) {
            const queryString = Object.entries(params)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
                .join('&');
            const separator = route.path.includes('?') ? '&' : '?';
            return this.executeRequest<T>(`${url}${separator}${queryString}`, options);
        }

        return this.executeRequest<T>(url, options);
    }

    /**
     * 执行 HTTP 请求并处理响应
     */
    private async executeRequest<T>(url: string, options: RequestInit): Promise<T> {
        const response = await fetch(url, options);

        if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            throw new Error(
                errorBody?.error?.message || `HTTP ${response.status}`
            );
        }

        return await response.json() as T;
    }
}

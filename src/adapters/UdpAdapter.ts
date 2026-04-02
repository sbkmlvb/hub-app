/**
 * UDP 适配器
 * 用于电柜等使用 UDP 二进制协议的设备
 * 注意：React Native 环境需要原生模块支持 UDP，当前为接口框架和 mock 实现
 */

import type { Device, ConnectionState } from '../types/device';
import { DeviceAdapter } from './DeviceAdapter';

/** 默认 UDP 端口 */
const DEFAULT_UDP_PORT = 9000;

/** 请求超时时间（毫秒） */
const REQUEST_TIMEOUT = 5000;

/**
 * 待处理的 UDP 请求
 */
interface PendingUdpRequest {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
}

/**
 * UDP 二进制协议适配器
 * 提供基本的报文编解码框架，具体协议待实现时填充
 */
export class UdpAdapter extends DeviceAdapter {
    readonly protocolType = 'udp' as const;

    /** 待处理的请求 */
    private pendingRequests: Map<string, PendingUdpRequest> = new Map();

    /** 请求 ID 计数器 */
    private requestCounter = 0;

    /** 是否已绑定 */
    private bound = false;

    constructor(device: Device) {
        super(device);
    }

    /**
     * 建立 UDP 连接
     * 在 React Native 中需要原生模块支持，当前为 mock 实现
     */
    async connect(): Promise<void> {
        this.state = 'connecting';

        try {
            // TODO: 实际实现中使用原生模块绑定 UDP socket
            // const socket = new NativeUdpSocket();
            // socket.bind(this.device.httpPort || DEFAULT_UDP_PORT);
            // socket.on('message', (data: Buffer) => this.handleMessage(data));

            this.bound = true;
            this.state = 'connected';
        } catch (error) {
            this.state = 'disconnected';
            throw new Error(`UDP 连接失败: ${this.device.host}`);
        }
    }

    /**
     * 断开 UDP 连接
     */
    disconnect(): void {
        this.bound = false;
        this.state = 'disconnected';

        // 清理待处理请求
        this.pendingRequests.forEach(pending => {
            clearTimeout(pending.timer);
            pending.reject(new Error('连接已关闭'));
        });
        this.pendingRequests.clear();
    }

    /**
     * 发送 UDP 请求
     * 将 method + params 编码为二进制报文发送，等待响应解码
     *
     * @param method 方法名
     * @param params 请求参数
     * @returns 解码后的响应数据
     */
    async call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
        if (!this.bound) {
            throw new Error('UDP 未连接');
        }

        const id = String(++this.requestCounter);

        return new Promise<T>((resolve, reject) => {
            // 编码报文
            const packet = this.encodePacket(id, method, params);

            // TODO: 实际发送报文
            // this.socket.send(packet, this.device.host, this.device.httpPort || DEFAULT_UDP_PORT);

            // 设置超时
            const timer = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`UDP 请求超时: ${method}`));
            }, REQUEST_TIMEOUT);

            this.pendingRequests.set(id, {
                resolve: resolve as (result: unknown) => void,
                reject,
                timer,
            });
        });
    }

    /**
     * 编码二进制报文
     * 报文格式：[头部(4字节长度)][ID(变长)][方法名(变长)][参数JSON(变长)]
     * 具体协议格式待与设备端协商后实现
     *
     * @param id 请求 ID
     * @param method 方法名
     * @param params 参数
     * @returns 编码后的二进制数据（Uint8Array）
     */
    private encodePacket(
        id: string,
        method: string,
        params?: Record<string, unknown>
    ): Uint8Array {
        const idBytes = new TextEncoder().encode(id);
        const methodBytes = new TextEncoder().encode(method);
        const paramsBytes = params
            ? new TextEncoder().encode(JSON.stringify(params))
            : new Uint8Array(0);

        // 简单的 TLV 格式：总长度(4) + ID长度(1) + ID + 方法长度(1) + 方法 + 参数
        const totalLength = 4 + 1 + idBytes.length + 1 + methodBytes.length + paramsBytes.length;
        const buffer = new Uint8Array(totalLength);

        // 写入总长度（大端序）
        const view = new DataView(buffer.buffer);
        view.setUint32(0, totalLength);

        let offset = 4;

        // 写入 ID
        buffer[offset] = idBytes.length;
        offset += 1;
        buffer.set(idBytes, offset);
        offset += idBytes.length;

        // 写入方法名
        buffer[offset] = methodBytes.length;
        offset += 1;
        buffer.set(methodBytes, offset);
        offset += methodBytes.length;

        // 写入参数
        if (paramsBytes.length > 0) {
            buffer.set(paramsBytes, offset);
        }

        return buffer;
    }

    /**
     * 解码二进制报文
     *
     * @param data 接收到的二进制数据
     * @returns 解码后的对象，包含 id 和 result/error
     */
    private decodePacket(data: Uint8Array): { id: string; result?: unknown; error?: string } {
        if (data.length < 6) {
            throw new Error('报文长度不足');
        }

        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        const totalLength = view.getUint32(0);
        let offset = 4;

        // 读取 ID
        const idLength = data[offset];
        offset += 1;
        const id = new TextDecoder().decode(data.slice(offset, offset + idLength));
        offset += idLength;

        // 剩余部分作为结果 JSON
        const resultJson = new TextDecoder().decode(data.slice(offset));

        try {
            const result = JSON.parse(resultJson);
            return { id, result };
        } catch {
            return { id, error: '响应解码失败' };
        }
    }

    /**
     * 处理收到的 UDP 消息
     */
    private handleMessage(data: Uint8Array): void {
        try {
            const response = this.decodePacket(data);
            const pending = this.pendingRequests.get(response.id);
            if (!pending) return;

            clearTimeout(pending.timer);
            this.pendingRequests.delete(response.id);

            if (response.error) {
                pending.reject(new Error(response.error));
            } else {
                pending.resolve(response.result);
            }
        } catch {
            // 解码失败，忽略该报文
        }
    }
}

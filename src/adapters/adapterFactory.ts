/**
 * 适配器工厂
 * 根据设备产品类型创建对应的协议适配器实例
 */

import type { Device } from '../types/device';
import { DeviceAdapter } from './DeviceAdapter';
import { WebSocketAdapter } from './WebSocketAdapter';
import { HttpAdapter } from './HttpAdapter';

/**
 * 适配器工厂注册表
 * key 为设备 productType，value 为创建适配器的工厂函数
 */
const adapterRegistry: Map<string, (device: Device) => DeviceAdapter> = new Map([
    ['jraicontroller', (d) => new WebSocketAdapter(d)],
    ['audiomixer', (d) => new WebSocketAdapter(d)],
    ['videoprocessor', (d) => new WebSocketAdapter(d)],
    ['electricalCabinet', (d) => new HttpAdapter(d)],
]);

/**
 * 创建设备适配器
 * 根据设备的 productType 查找注册的工厂函数，创建对应的适配器实例
 * 未注册的产品类型默认使用 WebSocket 适配器
 *
 * @param device 设备信息
 * @returns 适配器实例
 */
export function createAdapter(device: Device): DeviceAdapter {
    const factory = adapterRegistry.get(device.productType);
    if (factory) {
        return factory(device);
    }
    // 未知设备类型默认使用 WebSocket
    return new WebSocketAdapter(device);
}

/**
 * 注册自定义适配器工厂
 * 允许外部模块为新的产品类型注册适配器
 *
 * @param productType 产品类型标识
 * @param factory 适配器工厂函数
 */
export function registerAdapter(
    productType: string,
    factory: (device: Device) => DeviceAdapter
): void {
    adapterRegistry.set(productType, factory);
}

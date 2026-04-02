/**
 * 设备插件注册表
 * 管理各产品类型的插件，提供注册、查询和获取插件页面的功能
 */

import type { DevicePlugin, DevicePluginPage } from '../types/device';

/** 插件注册表，key 为 productType */
const pluginRegistry: Map<string, DevicePlugin> = new Map();

/**
 * 注册设备插件
 * 将插件注册到全局注册表中，后续可通过 productType 查询
 *
 * @param plugin 设备插件对象
 */
export function registerPlugin(plugin: DevicePlugin): void {
    pluginRegistry.set(plugin.productType, plugin);
}

/**
 * 获取指定产品类型的插件
 *
 * @param productType 产品类型标识
 * @returns 插件对象，未找到返回 undefined
 */
export function getPlugin(productType: string): DevicePlugin | undefined {
    return pluginRegistry.get(productType);
}

/**
 * 获取所有已注册的插件
 *
 * @returns 插件列表
 */
export function getAllPlugins(): DevicePlugin[] {
    return Array.from(pluginRegistry.values());
}

/**
 * 获取指定产品类型的插件页面列表
 *
 * @param productType 产品类型标识
 * @returns 页面列表，未找到返回空数组
 */
export function getPluginPages(productType: string): DevicePluginPage[] {
    return pluginRegistry.get(productType)?.pages || [];
}

/**
 * 设备管理 Hook
 * 管理已添加的设备列表，支持 AsyncStorage 持久化
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scanDevice } from '../services/api';
import { detectSubnets } from '../services/network';
import type { SubnetInfo } from '../services/network';
import type { Device, DeviceInfo } from '../types/device';

/** AsyncStorage 存储键 */
const STORAGE_KEY = 'hub_app_devices';

/**
 * 设备管理 Hook
 * 提供设备列表的增删查改和局域网扫描功能
 */
export function useDevices() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);

    /** 从 AsyncStorage 加载设备列表 */
    const loadDevices = useCallback(async () => {
        try {
            const json = await AsyncStorage.getItem(STORAGE_KEY);
            if (json) {
                setDevices(JSON.parse(json));
            }
        } catch (err) {
            console.warn('加载设备列表失败:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    /** 保存设备列表到 AsyncStorage */
    const saveDevices = useCallback(async (list: Device[]) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (err) {
            console.warn('保存设备列表失败:', err);
        }
    }, []);

    /** 初始化时加载 */
    useEffect(() => {
        loadDevices();
    }, [loadDevices]);

    /**
     * 获取设备列表
     */
    const getDevices = useCallback((): Device[] => {
        return devices;
    }, [devices]);

    /**
     * 添加设备
     * 将扫描到的设备信息保存到本地列表
     */
    const addDevice = useCallback(async (
        ip: string,
        deviceInfo: DeviceInfo
    ): Promise<Device> => {
        const now = new Date().toISOString();

        const device: Device = {
            deviceId: deviceInfo.deviceId,
            deviceName: deviceInfo.deviceName,
            productType: deviceInfo.productType,
            productVersion: deviceInfo.productVersion,
            host: ip,
            httpPort: deviceInfo.endpoints.http.port,
            wsPort: deviceInfo.endpoints.websocket.port,
            addedAt: now,
            lastConnected: now,
            interaction: deviceInfo.interaction.mode,
            description: deviceInfo.description,
            online: true,
            quickActions: deviceInfo.capabilities?.quickActions,
        };

        // 检查是否已存在（同一 deviceId）
        const existingIndex = devices.findIndex(
            d => d.deviceId === device.deviceId
        );

        let updatedDevices: Device[];
        if (existingIndex >= 0) {
            // 已存在则更新
            updatedDevices = [...devices];
            updatedDevices[existingIndex] = {
                ...updatedDevices[existingIndex],
                ...device,
                addedAt: updatedDevices[existingIndex].addedAt,
                token: updatedDevices[existingIndex].token,
            };
        } else {
            // 不存在则新增
            updatedDevices = [...devices, device];
        }

        setDevices(updatedDevices);
        await saveDevices(updatedDevices);
        return device;
    }, [devices, saveDevices]);

    /**
     * 删除设备
     */
    const removeDevice = useCallback(async (deviceId: string) => {
        const updatedDevices = devices.filter(d => d.deviceId !== deviceId);
        setDevices(updatedDevices);
        await saveDevices(updatedDevices);
    }, [devices, saveDevices]);

    /**
     * 更新设备的在线状态
     */
    const updateDeviceStatus = useCallback(async (
        deviceId: string,
        online: boolean
    ) => {
        const updatedDevices = devices.map(d =>
            d.deviceId === deviceId
                ? { ...d, online, lastConnected: new Date().toISOString() }
                : d
        );
        setDevices(updatedDevices);
        await saveDevices(updatedDevices);
    }, [devices, saveDevices]);

    /**
     * 更新设备的认证 Token
     */
    const updateDeviceToken = useCallback(async (
        deviceId: string,
        token: string
    ) => {
        const updatedDevices = devices.map(d =>
            d.deviceId === deviceId ? { ...d, token } : d
        );
        setDevices(updatedDevices);
        await saveDevices(updatedDevices);
    }, [devices, saveDevices]);

    /**
     * 扫描单个子网 IP 段
     *
     * @param subnetPrefix 子网前缀，如 '192.168.1'
     * @param onFound 发现设备时的回调
     * @param concurrency 并发数，默认 20
     */
    const scanSubnet = useCallback(async (
        subnetPrefix: string,
        onFound?: (device: { ip: string; info: DeviceInfo }) => void,
        concurrency: number = 20
    ): Promise<{ ip: string; info: DeviceInfo }[]> => {
        const found: { ip: string; info: DeviceInfo }[] = [];

        // 生成 IP 列表（1-254）
        const ips: string[] = [];
        for (let i = 1; i <= 254; i++) {
            ips.push(`${subnetPrefix}.${i}`);
        }

        // 分批并发扫描
        for (let i = 0; i < ips.length; i += concurrency) {
            const batch = ips.slice(i, i + concurrency);
            const results = await Promise.allSettled(
                batch.map(async (ip) => {
                    const info = await scanDevice(ip);
                    return { ip, info };
                })
            );

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    found.push(result.value);
                    onFound?.(result.value);
                }
            }
        }

        return found;
    }, []);

    /**
     * 自动扫描所有检测到的子网
     * 先获取本机网卡信息，再逐一扫描各子网
     *
     * @param onFound 发现设备时的回调（实时通知）
     * @param onSubnetChange 开始扫描新子网时的回调
     */
    const autoScan = useCallback(async (
        onFound?: (device: { ip: string; info: DeviceInfo }) => void,
        onSubnetChange?: (subnet: SubnetInfo) => void
    ): Promise<{
        found: { ip: string; info: DeviceInfo }[];
        scannedSubnets: SubnetInfo[];
    }> => {
        const subnets = await detectSubnets();
        const allFound: { ip: string; info: DeviceInfo }[] = [];

        for (const subnet of subnets) {
            onSubnetChange?.(subnet);
            const results = await scanSubnet(subnet.prefix, (device) => {
                allFound.push(device);
                onFound?.(device);
            });
            // scanSubnet 内部已通过 onFound 回调添加，这里合并去重
            for (const r of results) {
                if (!allFound.find(f => f.ip === r.ip)) {
                    allFound.push(r);
                }
            }
        }

        return { found: allFound, scannedSubnets: subnets };
    }, [scanSubnet]);

    return {
        devices,
        loading,
        getDevices,
        addDevice,
        removeDevice,
        updateDeviceStatus,
        updateDeviceToken,
        scanSubnet,
        autoScan,
        reload: loadDevices,
    };
}

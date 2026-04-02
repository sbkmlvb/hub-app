/**
 * 首页 - 已添加设备列表
 * 显示所有已添加的设备卡片，支持添加新设备、管理已有设备
 */

import React, { useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import theme, { spacing, borderRadius, fontSize } from '../constants/theme';
import { useDevices } from '../hooks/useDevices';
import { useApi } from '../hooks/useApi';
import { DeviceCard } from '../components/DeviceCard';
import type { Device, RootStackParamList } from '../types/device';

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export function HomeScreen() {
    const navigation = useNavigation<HomeNavigationProp>();
    const { devices, loading, removeDevice, reload } = useDevices();
    const api = useApi();

    /** 页面重新获得焦点时刷新设备列表 */
    useFocusEffect(
        useCallback(() => {
            reload();
        }, [reload])
    );

    /** 点击设备卡片，进入设备控制页 */
    const handleDevicePress = useCallback((device: Device) => {
        (navigation as any).navigate('Device', { device });
    }, [navigation]);

    /** 长按设备卡片，弹出管理菜单 */
    const handleDeviceLongPress = useCallback((device: Device) => {
        Alert.alert(
            device.deviceName,
            '选择操作',
            [
                {
                    text: '删除设备',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            '确认删除',
                            `确定要删除 "${device.deviceName}" 吗？`,
                            [
                                { text: '取消', style: 'cancel' },
                                {
                                    text: '删除',
                                    style: 'destructive',
                                    onPress: () => removeDevice(device.deviceId),
                                },
                            ]
                        );
                    },
                },
                { text: '取消', style: 'cancel' },
            ]
        );
    }, [removeDevice]);

    /** 快捷操作回调 */
    const handleQuickAction = useCallback(async (
        device: Device,
        method: string,
        params?: Record<string, unknown>
    ) => {
        const wsUrl = `ws://${device.host}:${device.wsPort}`;
        try {
            // 确保已连接
            if (!api.connected) {
                api.connect(wsUrl);
                // 等待连接建立（简化处理）
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            if (device.token) {
                api.setToken(device.token);
            }
            await api.call(method, params);
        } catch (err) {
            Alert.alert('操作失败', err instanceof Error ? err.message : '请检查网络连接');
        }
    }, [api]);

    /** 跳转到扫描页 */
    const handleAddDevice = useCallback(() => {
        (navigation as any).navigate('Scan');
    }, [navigation]);

    /** 渲染设备卡片 */
    const renderDevice = useCallback(({ item }: { item: Device }) => (
        <DeviceCard
            device={item}
            onPress={handleDevicePress}
            onLongPress={handleDeviceLongPress}
            onQuickAction={handleQuickAction}
        />
    ), [handleDevicePress, handleDeviceLongPress, handleQuickAction]);

    /** 空列表占位 */
    const renderEmpty = useCallback(() => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>+</Text>
            <Text style={styles.emptyTitle}>暂无设备</Text>
            <Text style={styles.emptySubtitle}>
                点击右上角"添加设备"扫描局域网中的设备
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddDevice}>
                <Text style={styles.emptyButtonText}>添加设备</Text>
            </TouchableOpacity>
        </View>
    ), [handleAddDevice]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            {/* 顶部栏 */}
            <View style={styles.header}>
                <Text style={styles.title}>JRAi Hub</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAddDevice}
                >
                    <Text style={styles.addButtonText}>+ 添加设备</Text>
                </TouchableOpacity>
            </View>

            {/* 设备列表 */}
            <FlatList
                data={devices}
                renderItem={renderDevice}
                keyExtractor={item => item.deviceId}
                contentContainerStyle={
                    devices.length === 0 ? styles.listEmpty : styles.list
                }
                ListEmptyComponent={renderEmpty}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xxxl,
        paddingBottom: spacing.lg,
    },
    title: {
        fontSize: fontSize.hero,
        fontWeight: '700',
        color: theme.textPrimary,
    },
    addButton: {
        backgroundColor: theme.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonText: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: '#ffffff',
    },
    list: {
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxl,
    },
    listEmpty: {
        flexGrow: 1,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xxl,
    },
    emptyIcon: {
        fontSize: 64,
        color: theme.textTertiary,
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: fontSize.xxl,
        fontWeight: '600',
        color: theme.textSecondary,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        fontSize: fontSize.md,
        color: theme.textTertiary,
        textAlign: 'center',
        marginBottom: spacing.xl,
    },
    emptyButton: {
        backgroundColor: theme.primary,
        paddingHorizontal: spacing.xxl,
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.md,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyButtonText: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: '#ffffff',
    },
});

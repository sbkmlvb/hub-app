/**
 * Hub 仪表盘页面
 *
 * 平板模式：左侧设备迷你卡片列表 + 右侧快捷控制面板
 * 手机模式：设备列表 + 控制面板垂直堆叠
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import theme, { spacing, borderRadius, fontSize } from '../../constants/theme';
import { useDevices } from '../../hooks/useDevices';
import { SplitView } from '../../components/layout/SplitView';
import type { Device, RootStackParamList } from '../../types/device';

type HubNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function HubScreen() {
    const navigation = useNavigation<HubNavigationProp>();
    const { devices } = useDevices();
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

    const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId) || null;

    /** 点击设备迷你卡片 */
    const handleDeviceSelect = useCallback((device: Device) => {
        setSelectedDeviceId(device.deviceId);
    }, []);

    /** 跳转到设备详情 */
    const handleOpenConsole = useCallback((deviceId: string) => {
        navigation.navigate('DeviceDetail', { deviceId });
    }, [navigation]);

    /** 跳转到设备扫描 */
    const handleAddDevice = useCallback(() => {
        navigation.navigate('DeviceScan');
    }, [navigation]);

    /** 渲染设备迷你卡片 */
    const renderMiniCard = useCallback(({ item }: { item: Device }) => {
        const isSelected = selectedDeviceId === item.deviceId;
        return (
            <TouchableOpacity
                style={[styles.miniCard, isSelected && styles.miniCardActive]}
                onPress={() => handleDeviceSelect(item)}
                activeOpacity={0.7}
            >
                <View style={styles.miniCardHeader}>
                    <Text style={styles.miniCardName} numberOfLines={1}>
                        {item.deviceName}
                    </Text>
                    <View style={[
                        styles.statusDot,
                        { backgroundColor: item.online ? theme.online : theme.offline },
                    ]} />
                </View>
                <Text style={styles.miniCardDesc} numberOfLines={1}>
                    {item.description || item.productType}
                </Text>
            </TouchableOpacity>
        );
    }, [selectedDeviceId, handleDeviceSelect]);

    /** 左面板：设备列表 */
    const leftPanel = (
        <View style={styles.leftPanel}>
            <Text style={styles.panelTitle}>JRAi Hub</Text>
            <FlatList
                data={devices}
                renderItem={renderMiniCard}
                keyExtractor={item => item.deviceId}
                contentContainerStyle={styles.deviceList}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>暂无设备</Text>
                    </View>
                }
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddDevice}>
                <Text style={styles.addButtonText}>+ 添加设备</Text>
            </TouchableOpacity>
        </View>
    );

    /** 右面板：快捷控制 */
    const rightPanel = (
        <View style={styles.rightPanel}>
            {selectedDevice ? (
                <>
                    <Text style={styles.deviceNameTitle}>
                        {selectedDevice.deviceName}
                    </Text>
                    <View style={styles.quickActionsGrid}>
                        {/* TODO: 从 selectedDevice.quickActions 渲染快捷操作按钮组 */}
                        <Text style={styles.placeholderText}>
                            快捷操作按钮区域
                        </Text>
                    </View>
                    <View style={styles.eventStreamArea}>
                        {/* TODO: 实现事件流列表 */}
                        <Text style={styles.placeholderText}>
                            事件流区域
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.consoleButton}
                        onPress={() => handleOpenConsole(selectedDevice.deviceId)}
                    >
                        <Text style={styles.consoleButtonText}>
                            进入控制台
                        </Text>
                    </TouchableOpacity>
                </>
            ) : (
                <View style={styles.emptyRight}>
                    <Text style={styles.emptyRightText}>
                        选择左侧设备查看控制面板
                    </Text>
                </View>
            )}
        </View>
    );

    /** 底部全局状态栏 */
    const statusBar = (
        <View style={styles.globalStatusBar}>
            {/* TODO: 接入实际网络状态 */}
            <View style={styles.statusBarItem}>
                <View style={[styles.statusDot, { backgroundColor: theme.online }]} />
                <Text style={styles.statusBarText}>网络正常</Text>
            </View>
            <Text style={styles.statusBarText}>
                已连接 {devices.filter(d => d.online).length}/{devices.length} 台设备
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <SplitView left={leftPanel} right={rightPanel} leftRatio={0.35} />
            </View>
            {statusBar}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    content: {
        flex: 1,
    },
    /** 左面板 */
    leftPanel: {
        flex: 1,
        backgroundColor: theme.background,
        padding: spacing.lg,
    },
    panelTitle: {
        fontSize: fontSize.xxl,
        fontWeight: '700',
        color: theme.textPrimary,
        marginBottom: spacing.lg,
    },
    deviceList: {
        paddingBottom: spacing.md,
    },
    miniCard: {
        backgroundColor: theme.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderLeftWidth: 3,
        borderLeftColor: 'transparent',
    },
    miniCardActive: {
        borderLeftColor: theme.primary,
        backgroundColor: theme.surfaceVariant,
    },
    miniCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
    },
    miniCardName: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: theme.textPrimary,
        flex: 1,
        marginRight: spacing.sm,
    },
    miniCardDesc: {
        fontSize: fontSize.xs,
        color: theme.textTertiary,
    },
    emptyState: {
        paddingVertical: spacing.xxl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: fontSize.md,
        color: theme.textTertiary,
    },
    addButton: {
        backgroundColor: theme.primary,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
        minHeight: 44,
        justifyContent: 'center',
        marginTop: spacing.sm,
    },
    addButtonText: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: '#ffffff',
    },
    /** 右面板 */
    rightPanel: {
        flex: 1,
        backgroundColor: theme.background,
        padding: spacing.lg,
    },
    deviceNameTitle: {
        fontSize: fontSize.xl,
        fontWeight: '700',
        color: theme.textPrimary,
        marginBottom: spacing.lg,
    },
    quickActionsGrid: {
        backgroundColor: theme.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        minHeight: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    eventStreamArea: {
        flex: 1,
        backgroundColor: theme.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: fontSize.sm,
        color: theme.textTertiary,
    },
    consoleButton: {
        backgroundColor: theme.primary,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    consoleButtonText: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: '#ffffff',
    },
    emptyRight: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyRightText: {
        fontSize: fontSize.lg,
        color: theme.textTertiary,
    },
    /** 全局状态栏 */
    globalStatusBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: theme.surface,
        borderTopWidth: 1,
        borderTopColor: theme.border,
    },
    statusBarItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.sm,
    },
    statusBarText: {
        fontSize: fontSize.xs,
        color: theme.textSecondary,
    },
});

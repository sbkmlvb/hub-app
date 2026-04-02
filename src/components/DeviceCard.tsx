/**
 * 设备卡片组件
 * 显示设备名称、在线状态、快捷操作按钮
 */

import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
} from 'react-native';
import theme, { spacing, borderRadius, fontSize } from '../constants/theme';
import type { Device } from '../types/device';
import { QuickAction } from './QuickAction';

interface DeviceCardProps {
    /** 设备信息 */
    device: Device;
    /** 点击卡片的回调 */
    onPress: (device: Device) => void;
    /** 长按卡片的回调（用于删除等操作） */
    onLongPress?: (device: Device) => void;
    /** 快捷操作回调 */
    onQuickAction?: (device: Device, method: string, params?: Record<string, unknown>) => void;
}

/**
 * 设备卡片
 * 展示设备基本信息，支持点击进入、长按管理、快捷操作
 */
export function DeviceCard({
    device,
    onPress,
    onLongPress,
    onQuickAction,
}: DeviceCardProps) {
    /** 处理快捷操作 */
    const handleQuickAction = (
        action: { method: string; params?: Record<string, unknown>; confirmRequired?: boolean; confirmMessage?: string },
        e: any
    ) => {
        // 阻止事件冒泡，避免触发卡片点击
        e?.stopPropagation?.();

        if (action.confirmRequired) {
            Alert.alert(
                '确认操作',
                action.confirmMessage || '确定执行此操作吗？',
                [
                    { text: '取消', style: 'cancel' },
                    {
                        text: '确定',
                        onPress: () => onQuickAction?.(device, action.method, action.params),
                    },
                ]
            );
        } else {
            onQuickAction?.(device, action.method, action.params);
        }
    };

    /** 获取产品类型中文名 */
    const getProductTypeLabel = (type: string): string => {
        const labels: Record<string, string> = {
            jraicontroller: '舞台控制台',
            audiomixer: '数字调音台',
            videoprocessor: '视频处理器',
        };
        return labels[type] || type;
    };

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={() => onPress(device)}
            onLongPress={() => onLongPress?.(device)}
            activeOpacity={0.7}
        >
            {/* 头部：设备信息 */}
            <View style={styles.header}>
                <View style={styles.info}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name} numberOfLines={1}>
                            {device.deviceName}
                        </Text>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: device.online ? theme.online : theme.offline },
                        ]} />
                    </View>
                    <Text style={styles.subtitle}>
                        {getProductTypeLabel(device.productType)} | {device.host}
                    </Text>
                    {device.description ? (
                        <Text style={styles.description} numberOfLines={1}>
                            {device.description}
                        </Text>
                    ) : null}
                </View>
                <Text style={styles.version}>v{device.productVersion}</Text>
            </View>

            {/* 快捷操作按钮行 */}
            {device.quickActions && device.quickActions.length > 0 ? (
                <View style={styles.actions}>
                    {device.quickActions.map(action => (
                        <QuickAction
                            key={action.id}
                            title={action.title}
                            onPress={(e) => handleQuickAction(action, e)}
                        />
                    ))}
                </View>
            ) : null}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: theme.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    info: {
        flex: 1,
        marginRight: spacing.md,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    name: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: theme.textPrimary,
        marginRight: spacing.sm,
        flex: 1,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    subtitle: {
        fontSize: fontSize.sm,
        color: theme.textSecondary,
        marginBottom: spacing.xs,
    },
    description: {
        fontSize: fontSize.xs,
        color: theme.textTertiary,
    },
    version: {
        fontSize: fontSize.xs,
        color: theme.textTertiary,
    },
    actions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: spacing.md,
        gap: spacing.sm,
    },
});

/**
 * 设备概览页面
 *
 * 顶部：返回按钮 + 设备名称 + 在线状态
 * 中部：设备信息卡（产品类型、版本、IP、端口、Token状态）
 * 下部：功能模块入口网格 + 快捷操作按钮
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import theme, { spacing, borderRadius, fontSize } from '../../constants/theme';
import { useDevices } from '../../hooks/useDevices';
import { getPluginPages } from '../../devicePlugins/registry';
import type { RootStackParamList, Device, InteractionMode } from '../../types/device';

type DetailRouteProp = RouteProp<RootStackParamList, 'DeviceDetail'>;
type DetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function DeviceOverviewScreen() {
    const navigation = useNavigation<DetailNavigationProp>();
    const route = useRoute<DetailRouteProp>();
    const { deviceId } = route.params;
    const { devices } = useDevices();

    const device = devices.find(d => d.deviceId === deviceId);

    /** 获取设备插件页面列表 */
    const pluginPages = device
        ? getPluginPages(device.productType)
        : [];

    /** 进入设备控制 */
    const handleOpenControl = useCallback((mode: InteractionMode) => {
        navigation.navigate('DeviceControl', {
            deviceId,
            interaction: mode,
        });
    }, [navigation, deviceId]);

    /** 渲染设备未找到状态 */
    if (!device) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.backButton}>返回</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.notFound}>
                    <Text style={styles.notFoundText}>设备未找到</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* 顶部栏 */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>返回</Text>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.deviceName} numberOfLines={1}>
                        {device.deviceName}
                    </Text>
                    <View style={styles.statusRow}>
                        <View style={[
                            styles.statusDot,
                            { backgroundColor: device.online ? theme.online : theme.offline },
                        ]} />
                        <Text style={styles.statusText}>
                            {device.online ? '在线' : '离线'}
                        </Text>
                    </View>
                </View>
                <View style={{ width: 48 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* 设备信息卡 */}
                <View style={styles.infoCard}>
                    <InfoRow label="产品类型" value={device.productType} />
                    <InfoRow label="软件版本" value={`v${device.productVersion}`} />
                    <InfoRow label="IP 地址" value={device.host} />
                    <InfoRow label="HTTP 端口" value={String(device.httpPort)} />
                    <InfoRow label="WebSocket 端口" value={String(device.wsPort)} />
                    <InfoRow
                        label="Token 状态"
                        value={device.token ? '已认证' : '未认证'}
                        valueColor={device.token ? theme.online : theme.warning}
                    />
                </View>

                {/* 功能模块入口网格 */}
                {pluginPages.length > 0 ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>功能模块</Text>
                        <View style={styles.moduleGrid}>
                            {pluginPages.map(page => (
                                <TouchableOpacity
                                    key={page.id}
                                    style={styles.moduleCard}
                                    onPress={() => handleOpenControl(device.interaction)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.moduleIcon}>{page.icon}</Text>
                                    <Text style={styles.moduleTitle}>{page.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : null}

                {/* 快捷操作 */}
                {device.quickActions && device.quickActions.length > 0 ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>快捷操作</Text>
                        <View style={styles.quickActionsRow}>
                            {device.quickActions.map(action => (
                                <TouchableOpacity
                                    key={action.id}
                                    style={styles.quickActionButton}
                                    onPress={() => {
                                        // TODO: 发送快捷操作指令
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.quickActionTitle}>
                                        {action.title}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : null}

                {/* 进入控制台大按钮 */}
                <TouchableOpacity
                    style={styles.consoleButton}
                    onPress={() => handleOpenControl(device.interaction)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.consoleButtonText}>进入控制台</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

/** 信息行组件 */
function InfoRow({
    label,
    value,
    valueColor,
}: {
    label: string;
    value: string;
    valueColor?: string;
}) {
    return (
        <View style={infoStyles.row}>
            <Text style={infoStyles.label}>{label}</Text>
            <Text style={[infoStyles.value, valueColor && { color: valueColor }]}>
                {value}
            </Text>
        </View>
    );
}

const infoStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    label: {
        fontSize: fontSize.sm,
        color: theme.textSecondary,
    },
    value: {
        fontSize: fontSize.sm,
        color: theme.textPrimary,
        fontWeight: '500',
    },
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    /** 顶部栏 */
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        paddingBottom: spacing.md,
    },
    backButton: {
        fontSize: fontSize.md,
        color: theme.primary,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    deviceName: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: theme.textPrimary,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: spacing.sm,
    },
    statusText: {
        fontSize: fontSize.xs,
        color: theme.textSecondary,
    },
    /** 滚动内容 */
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    /** 设备信息卡 */
    infoCard: {
        backgroundColor: theme.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    /** 未找到设备 */
    notFound: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notFoundText: {
        fontSize: fontSize.lg,
        color: theme.textTertiary,
    },
    /** 分组区域 */
    section: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: theme.textPrimary,
        marginBottom: spacing.md,
    },
    /** 功能模块网格 */
    moduleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    moduleCard: {
        width: 100,
        height: 100,
        backgroundColor: theme.surface,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    moduleIcon: {
        fontSize: 28,
        marginBottom: spacing.xs,
    },
    moduleTitle: {
        fontSize: fontSize.xs,
        color: theme.textPrimary,
        fontWeight: '500',
    },
    /** 快捷操作 */
    quickActionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    quickActionButton: {
        backgroundColor: theme.surfaceVariant,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickActionTitle: {
        fontSize: fontSize.sm,
        color: theme.textPrimary,
        fontWeight: '500',
    },
    /** 控制台按钮 */
    consoleButton: {
        backgroundColor: theme.primary,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
    },
    consoleButtonText: {
        fontSize: fontSize.lg,
        fontWeight: '700',
        color: '#ffffff',
    },
});

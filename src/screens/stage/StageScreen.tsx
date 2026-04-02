/**
 * 舞台总控页面
 *
 * 顶部：全局操作栏（当前CUE + 场景快切 + 全黑 + 紧急停止）
 * 中部：横向三栏面板（灯光/媒体/其他设备）
 * 底部：事件日志区域
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
} from 'react-native';

import theme, { spacing, borderRadius, fontSize } from '../../constants/theme';
import { useDevices } from '../../hooks/useDevices';

/** 面板类型 */
type PanelType = 'lighting' | 'media' | 'devices';

/** 模拟事件日志条目 */
interface LogEntry {
    id: string;
    time: string;
    message: string;
    level: 'info' | 'warning' | 'error';
}

export function StageScreen() {
    const { devices } = useDevices();
    const [isBlackout, setIsBlackout] = useState(false);

    // TODO: 接入实际 CUE 数据
    const currentCue = '未加载';

    /** 全黑切换 */
    const handleBlackout = useCallback(() => {
        setIsBlackout(prev => !prev);
        // TODO: 发送全黑/恢复指令到连接的设备
    }, []);

    /** 紧急停止 */
    const handleEmergencyStop = useCallback(() => {
        // TODO: 向所有设备发送紧急停止指令
    }, []);

    /** 渲染三栏面板中的单个面板 */
    const renderPanel = (title: string, _type: PanelType) => (
        <View style={styles.panel}>
            <Text style={styles.panelTitle}>{title}</Text>
            <View style={styles.panelContent}>
                {/* TODO: 根据面板类型加载对应设备列表和控制项 */}
                <Text style={styles.panelPlaceholder}>
                    {_type === 'lighting' && '灯光设备控制'}
                    {_type === 'media' && '媒体播放控制'}
                    {_type === 'devices' && '其他设备控制'}
                </Text>
                <Text style={styles.panelHint}>
                    连接设备后在此显示
                </Text>
            </View>
        </View>
    );

    /** 模拟日志数据 */
    const logEntries: LogEntry[] = [
        // TODO: 接入实际事件订阅
    ];

    return (
        <View style={styles.container}>
            {/* 顶部全局操作栏 */}
            <View style={styles.toolbar}>
                <View style={styles.cueInfo}>
                    <Text style={styles.cueLabel}>当前CUE</Text>
                    <Text style={styles.cueValue}>{currentCue}</Text>
                </View>

                {/* TODO: 场景快切按钮组 */}

                <TouchableOpacity
                    style={[
                        styles.toolButton,
                        isBlackout && styles.blackoutActive,
                    ]}
                    onPress={handleBlackout}
                    activeOpacity={0.7}
                >
                    <Text style={[
                        styles.toolButtonText,
                        isBlackout && styles.blackoutActiveText,
                    ]}>
                        {isBlackout ? '恢复' : '全黑'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.emergencyButton}
                    onPress={handleEmergencyStop}
                    activeOpacity={0.7}
                >
                    <Text style={styles.emergencyButtonText}>紧急停止</Text>
                </TouchableOpacity>
            </View>

            {/* 中部三栏面板 */}
            <ScrollView
                horizontal
                style={styles.panelsContainer}
                contentContainerStyle={styles.panelsContent}
                showsHorizontalScrollIndicator={false}
            >
                {renderPanel('灯光', 'lighting')}
                {renderPanel('媒体', 'media')}
                {renderPanel('设备', 'devices')}
            </ScrollView>

            {/* 底部事件日志 */}
            <View style={styles.logSection}>
                <Text style={styles.logTitle}>事件日志</Text>
                <FlatList
                    data={logEntries}
                    renderItem={({ item }) => (
                        <View style={styles.logItem}>
                            <Text style={styles.logTime}>{item.time}</Text>
                            <Text style={[
                                styles.logMessage,
                                item.level === 'error' && styles.logError,
                                item.level === 'warning' && styles.logWarning,
                            ]}>
                                {item.message}
                            </Text>
                        </View>
                    )}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={
                        <Text style={styles.logEmpty}>暂无事件</Text>
                    }
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    /** 顶部工具栏 */
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
        paddingBottom: spacing.md,
        backgroundColor: theme.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        gap: spacing.md,
    },
    cueInfo: {
        marginRight: spacing.lg,
    },
    cueLabel: {
        fontSize: fontSize.xs,
        color: theme.textTertiary,
    },
    cueValue: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: theme.textPrimary,
    },
    toolButton: {
        backgroundColor: theme.surfaceVariant,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolButtonText: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: theme.textPrimary,
    },
    blackoutActive: {
        backgroundColor: theme.error,
    },
    blackoutActiveText: {
        color: '#ffffff',
    },
    emergencyButton: {
        backgroundColor: theme.error,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emergencyButtonText: {
        fontSize: fontSize.md,
        fontWeight: '700',
        color: '#ffffff',
    },
    /** 中部面板区域 */
    panelsContainer: {
        flex: 1,
    },
    panelsContent: {
        padding: spacing.lg,
        gap: spacing.lg,
    },
    panel: {
        width: 280,
        backgroundColor: theme.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
    },
    panelTitle: {
        fontSize: fontSize.lg,
        fontWeight: '700',
        color: theme.textPrimary,
        marginBottom: spacing.md,
    },
    panelContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
    },
    panelPlaceholder: {
        fontSize: fontSize.md,
        color: theme.textSecondary,
        marginBottom: spacing.xs,
    },
    panelHint: {
        fontSize: fontSize.xs,
        color: theme.textTertiary,
    },
    /** 底部日志区域 */
    logSection: {
        maxHeight: 160,
        backgroundColor: theme.surface,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    logTitle: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: theme.textSecondary,
        marginBottom: spacing.sm,
    },
    logItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
    },
    logTime: {
        fontSize: fontSize.xs,
        color: theme.textTertiary,
        marginRight: spacing.md,
        fontFamily: 'monospace',
    },
    logMessage: {
        fontSize: fontSize.xs,
        color: theme.textSecondary,
        flex: 1,
    },
    logError: {
        color: theme.error,
    },
    logWarning: {
        color: theme.warning,
    },
    logEmpty: {
        fontSize: fontSize.xs,
        color: theme.textTertiary,
        paddingVertical: spacing.sm,
    },
});

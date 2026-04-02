/**
 * 设置页面
 *
 * 分组列表：连接管理 / 外观 / 安全 / 高级 / 关于
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Switch,
    StyleSheet,
} from 'react-native';

import theme, { spacing, borderRadius, fontSize } from '../../constants/theme';

/** 设置项数据 */
interface SettingItem {
    id: string;
    title: string;
    subtitle?: string;
    type: 'navigate' | 'toggle' | 'value';
    value?: string | boolean;
}

/** 设置分组 */
interface SettingGroup {
    title: string;
    items: SettingItem[];
}

/** 设置分组数据 */
const settingGroups: SettingGroup[] = [
    {
        title: '连接管理',
        items: [
            { id: 'network_iface', title: '网络接口', subtitle: '选择使用的网络接口', type: 'navigate' },
            { id: 'mdns_discovery', title: 'mDNS 自动发现', subtitle: '自动发现局域网设备', type: 'toggle', value: true },
            { id: 'scan_range', title: '默认扫描范围', subtitle: '扫描 IP 范围配置', type: 'navigate' },
        ],
    },
    {
        title: '外观',
        items: [
            { id: 'theme_mode', title: '主题', subtitle: '暗色主题', type: 'value', value: '暗色' },
            { id: 'layout_mode', title: '布局模式', subtitle: '自动适配', type: 'navigate' },
            { id: 'font_size', title: '字体大小', subtitle: '标准', type: 'navigate' },
        ],
    },
    {
        title: '安全',
        items: [
            { id: 'auto_auth', title: '自动认证', subtitle: '记住密码并自动登录', type: 'toggle', value: false },
            { id: 'remember_password', title: '密码记忆', subtitle: '保存设备连接密码', type: 'toggle', value: true },
        ],
    },
    {
        title: '高级',
        items: [
            { id: 'timeout', title: '超时设置', subtitle: '连接超时 5 秒', type: 'navigate' },
            { id: 'debug_mode', title: '调试模式', subtitle: '显示详细日志信息', type: 'toggle', value: false },
        ],
    },
    {
        title: '关于',
        items: [
            { id: 'version', title: '版本', type: 'value', value: '1.4.2' },
            { id: 'build', title: '构建号', type: 'value', value: '20260402' },
        ],
    },
];

export function SettingsScreen() {
    // TODO: 使用 AsyncStorage 持久化设置状态
    const [toggleStates, setToggleStates] = useState<Record<string, boolean>>(() => {
        const states: Record<string, boolean> = {};
        settingGroups.forEach(group => {
            group.items.forEach(item => {
                if (item.type === 'toggle') {
                    states[item.id] = item.value as boolean;
                }
            });
        });
        return states;
    });

    /** 切换开关 */
    const handleToggle = useCallback((id: string) => {
        setToggleStates(prev => ({
            ...prev,
            [id]: !prev[id],
        }));
        // TODO: 保存到 AsyncStorage
    }, []);

    /** 点击导航项 */
    const handleNavigate = useCallback((_id: string) => {
        // TODO: 打开对应的子页面或弹窗
    }, []);

    /** 渲染单个设置项 */
    const renderSettingItem = (item: SettingItem) => {
        switch (item.type) {
            case 'toggle':
                return (
                    <View style={styles.settingItem} key={item.id}>
                        <View style={styles.settingText}>
                            <Text style={styles.settingTitle}>{item.title}</Text>
                            {item.subtitle ? (
                                <Text style={styles.settingSubtitle}>
                                    {item.subtitle}
                                </Text>
                            ) : null}
                        </View>
                        <Switch
                            value={toggleStates[item.id] ?? false}
                            onValueChange={() => handleToggle(item.id)}
                            trackColor={{ false: theme.border, true: theme.primary }}
                            thumbColor="#ffffff"
                        />
                    </View>
                );

            case 'value':
                return (
                    <View style={styles.settingItem} key={item.id}>
                        <View style={styles.settingText}>
                            <Text style={styles.settingTitle}>{item.title}</Text>
                        </View>
                        <Text style={styles.settingValue}>
                            {item.value as string}
                        </Text>
                    </View>
                );

            case 'navigate':
            default:
                return (
                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => handleNavigate(item.id)}
                        activeOpacity={0.7}
                        key={item.id}
                    >
                        <View style={styles.settingText}>
                            <Text style={styles.settingTitle}>{item.title}</Text>
                            {item.subtitle ? (
                                <Text style={styles.settingSubtitle}>
                                    {item.subtitle}
                                </Text>
                            ) : null}
                        </View>
                        <Text style={styles.settingArrow}>></Text>
                    </TouchableOpacity>
                );
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>设置</Text>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {settingGroups.map(group => (
                    <View key={group.title} style={styles.group}>
                        <Text style={styles.groupTitle}>{group.title}</Text>
                        <View style={styles.groupCard}>
                            {group.items.map(renderSettingItem)}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        paddingBottom: spacing.md,
    },
    headerTitle: {
        fontSize: fontSize.xxl,
        fontWeight: '700',
        color: theme.textPrimary,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    /** 分组 */
    group: {
        marginBottom: spacing.xl,
    },
    groupTitle: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: theme.textTertiary,
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    groupCard: {
        backgroundColor: theme.surface,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    /** 单个设置项 */
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        minHeight: 52,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    settingText: {
        flex: 1,
        marginRight: spacing.md,
    },
    settingTitle: {
        fontSize: fontSize.md,
        color: theme.textPrimary,
    },
    settingSubtitle: {
        fontSize: fontSize.xs,
        color: theme.textTertiary,
        marginTop: spacing.xs,
    },
    settingValue: {
        fontSize: fontSize.sm,
        color: theme.textSecondary,
    },
    settingArrow: {
        fontSize: fontSize.lg,
        color: theme.textTertiary,
    },
});

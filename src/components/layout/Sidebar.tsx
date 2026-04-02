/**
 * 侧边栏导航组件
 *
 * 用于平板模式的主要导航，竖向排列的图标导航条。
 * 配合 ResponsiveLayout 的 sidebar 插槽使用。
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme, { spacing, borderRadius, fontSize } from '../../constants/theme';

/** 侧边栏导航项数据 */
export interface SidebarItem {
    /** 导航标识 */
    id: string;
    /** 显示图标（emoji 或文字） */
    icon: string;
    /** 显示标题 */
    title: string;
}

interface SidebarProps {
    /** 当前选中的导航项 ID */
    activeId: string;
    /** 导航项列表 */
    items: SidebarItem[];
    /** 导航项点击回调 */
    onSelect: (id: string) => void;
}

/** 主强调色 20% 透明度，用于选中态背景 */
const PRIMARY_ALPHA_20 = 'rgba(124, 92, 252, 0.2)';

/**
 * 侧边栏导航
 * 竖向排列的图标导航条，平板模式使用
 */
export function Sidebar({ activeId, items, onSelect }: SidebarProps) {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Logo 区域 */}
            <View style={styles.logoArea}>
                <Text style={styles.logoIcon}>J</Text>
            </View>

            {/* 导航项列表 */}
            <View style={styles.navItems}>
                {items.map(item => {
                    const isActive = activeId === item.id;
                    return (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.navItem,
                                isActive && styles.navItemActive,
                            ]}
                            onPress={() => onSelect(item.id)}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.navIcon,
                                isActive && styles.navIconActive,
                            ]}>
                                {item.icon}
                            </Text>
                            <Text style={[
                                styles.navTitle,
                                isActive && styles.navTitleActive,
                            ]} numberOfLines={1}>
                                {item.title}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    /** 侧边栏容器：固定宽度，居中对齐 */
    container: {
        width: 60,
        backgroundColor: theme.surface,
        borderRightWidth: 1,
        borderRightColor: theme.border,
        alignItems: 'center',
    },
    /** Logo 区域：顶部居中 */
    logoArea: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    /** Logo 图标文字 */
    logoIcon: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.primary,
    },
    /** 导航项容器：填充剩余空间 */
    navItems: {
        flex: 1,
        paddingTop: spacing.md,
        alignItems: 'center',
    },
    /** 单个导航项 */
    navItem: {
        width: 56,
        height: 56,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    /** 选中态导航项背景 */
    navItemActive: {
        backgroundColor: PRIMARY_ALPHA_20,
    },
    /** 导航图标 */
    navIcon: {
        fontSize: 20,
    },
    /** 选中态导航图标 */
    navIconActive: {
        color: theme.primary,
    },
    /** 导航标题 */
    navTitle: {
        fontSize: 10,
        color: theme.textTertiary,
        marginTop: 2,
    },
    /** 选中态导航标题 */
    navTitleActive: {
        color: theme.primary,
    },
});

/**
 * 响应式布局容器
 *
 * 根据屏幕宽度自动选择布局模式：
 * - 平板模式（宽度 >= 768）：左侧边栏 + 右侧主内容
 * - 手机模式：仅主内容区域（由底部 Tab 导航提供导航）
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import theme, { breakpoints } from '../../constants/theme';

interface ResponsiveLayoutProps {
    /** 侧边栏内容（平板模式显示） */
    sidebar?: ReactNode;
    /** 主内容区 */
    children: ReactNode;
}

/**
 * 响应式布局容器
 * 平板模式：左侧边栏 + 右侧主内容
 * 手机模式：仅主内容（由底部 Tab 导航）
 */
export function ResponsiveLayout({ sidebar, children }: ResponsiveLayoutProps) {
    const { width } = useWindowDimensions();
    const isTablet = width >= breakpoints.tablet;

    // 手机模式或无侧边栏内容时，只渲染主内容
    if (!isTablet || !sidebar) {
        return <View style={styles.container}>{children}</View>;
    }

    // 平板模式：侧边栏 + 主内容
    return (
        <View style={styles.container}>
            <View style={styles.sidebar}>{sidebar}</View>
            <View style={styles.main}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    /** 外层容器：水平排列 */
    container: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: theme.background,
    },
    /** 侧边栏：固定宽度窄栏 */
    sidebar: {
        width: 60,
        backgroundColor: theme.surface,
        borderRightWidth: 1,
        borderRightColor: theme.border,
    },
    /** 主内容区：填充剩余空间 */
    main: {
        flex: 1,
    },
});

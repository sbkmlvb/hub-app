/**
 * 分栏视图组件
 *
 * 用于内容区域的左右分栏显示：
 * - 平板模式（宽度 >= 768）：左右水平分栏，比例可配置
 * - 手机模式：垂直堆叠排列
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import theme, { spacing } from '../../constants/theme';

interface SplitViewProps {
    /** 左侧面板内容 */
    left: ReactNode;
    /** 右侧面板内容 */
    right: ReactNode;
    /** 左侧面板占比（0-1），默认 0.35 */
    leftRatio?: number;
    /** 面板间距，默认 0（无边距，由面板自身 padding 控制） */
    gap?: number;
}

/**
 * 分栏视图
 * 平板模式显示左右分栏，手机模式垂直堆叠
 */
export function SplitView({ left, right, leftRatio = 0.35, gap = 0 }: SplitViewProps) {
    const { width } = useWindowDimensions();
    const isTablet = width >= 768;

    // 手机模式：垂直堆叠
    if (!isTablet) {
        return (
            <View style={styles.stack}>
                <View style={styles.stackLeft}>{left}</View>
                <View style={styles.stackRight}>{right}</View>
            </View>
        );
    }

    // 平板模式：左右分栏
    return (
        <View style={[styles.split, gap ? { gap } : undefined]}>
            <View style={[styles.leftPanel, { flex: leftRatio }]}>{left}</View>
            <View style={[styles.rightPanel, { flex: 1 - leftRatio }]}>{right}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    /** 平板分栏容器：水平排列 */
    split: {
        flex: 1,
        flexDirection: 'row',
    },
    /** 左侧面板 */
    leftPanel: {
        flex: 0.35,
    },
    /** 右侧面板 */
    rightPanel: {
        flex: 0.65,
    },
    /** 手机堆叠容器：垂直排列 */
    stack: {
        flex: 1,
        gap: spacing.sm,
    },
    /** 手机模式左侧内容（堆叠时为上半部分） */
    stackLeft: {
        flex: 1,
    },
    /** 手机模式右侧内容（堆叠时为下半部分） */
    stackRight: {
        flex: 1,
    },
});

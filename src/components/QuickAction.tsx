/**
 * 快捷操作按钮组件
 * 用于设备卡片上的快速操作入口
 */

import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    GestureResponderEvent,
} from 'react-native';
import theme, { spacing, borderRadius, fontSize } from '../constants/theme';

interface QuickActionProps {
    /** 按钮标题 */
    title: string;
    /** 点击回调 */
    onPress: (event: GestureResponderEvent) => void;
    /** 按钮样式变体 */
    variant?: 'default' | 'danger';
    /** 是否禁用 */
    disabled?: boolean;
}

/**
 * 快捷操作按钮
 * 大触摸区域，适合触摸屏操作
 */
export function QuickAction({
    title,
    onPress,
    variant = 'default',
    disabled = false,
}: QuickActionProps) {
    return (
        <TouchableOpacity
            style={[
                styles.button,
                variant === 'danger' ? styles.danger : styles.default,
                disabled && styles.disabled,
            ]}
            onPress={onPress}
            disabled={disabled}
            activeOpacity={0.7}
        >
            <Text
                style={[
                    styles.text,
                    variant === 'danger' ? styles.dangerText : styles.defaultText,
                    disabled && styles.disabledText,
                ]}
            >
                {title}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    button: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        minHeight: 44, // 触摸友好的最小高度
        alignItems: 'center',
        justifyContent: 'center',
    },
    default: {
        backgroundColor: theme.surfaceVariant,
    },
    danger: {
        backgroundColor: 'rgba(244, 67, 54, 0.15)',
    },
    disabled: {
        opacity: 0.5,
    },
    text: {
        fontSize: fontSize.sm,
        fontWeight: '500',
    },
    defaultText: {
        color: theme.textPrimary,
    },
    dangerText: {
        color: theme.error,
    },
    disabledText: {
        color: theme.textTertiary,
    },
});

/**
 * 登录模态页面
 *
 * 居中弹窗：设备名 + 密码输入框 + 取消/连接按钮 + 加载状态
 * 透明背景模态，用于设备认证
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import theme, { spacing, borderRadius, fontSize } from '../../constants/theme';
import { login } from '../../services/api';
import { useDevices } from '../../hooks/useDevices';
import type { RootStackParamList } from '../../types/device';

type LoginRouteProp = RouteProp<RootStackParamList, 'LoginModal'>;
type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function LoginModalScreen() {
    const navigation = useNavigation<LoginNavigationProp>();
    const route = useRoute<LoginRouteProp>();
    const { deviceId } = route.params;
    const { devices, updateDeviceToken } = useDevices();

    const device = devices.find(d => d.deviceId === deviceId);

    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /** 取消登录 */
    const handleCancel = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    /** 执行登录 */
    const handleLogin = useCallback(async () => {
        if (!password.trim()) {
            setError('请输入密码');
            return;
        }

        if (!device) {
            setError('设备不存在');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await login(device.host, device.httpPort, { password: password.trim() });
            await updateDeviceToken(device.deviceId, result.token);
            navigation.goBack();
        } catch (err) {
            setError(err instanceof Error ? err.message : '认证失败，请检查密码');
        } finally {
            setLoading(false);
        }
    }, [password, device, updateDeviceToken, navigation]);

    return (
        <View style={styles.overlay}>
            <KeyboardAvoidingView
                style={styles.centerContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.dialog}>
                    {/* 标题 */}
                    <Text style={styles.dialogTitle}>设备认证</Text>
                    <Text style={styles.dialogSubtitle}>
                        {device?.deviceName || '未知设备'}
                    </Text>

                    {/* 设备信息 */}
                    {device ? (
                        <Text style={styles.deviceInfo}>
                            {device.host}:{device.httpPort}
                        </Text>
                    ) : null}

                    {/* 密码输入框 */}
                    <TextInput
                        style={styles.passwordInput}
                        value={password}
                        onChangeText={(text) => {
                            setPassword(text);
                            setError(null);
                        }}
                        placeholder="请输入设备密码"
                        placeholderTextColor={theme.textTertiary}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!loading}
                    />

                    {/* 错误提示 */}
                    {error ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : null}

                    {/* 按钮组 */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleCancel}
                            disabled={loading}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelButtonText}>取消</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.connectButton,
                                loading && styles.buttonDisabled,
                            ]}
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.7}
                        >
                            {loading ? (
                                <ActivityIndicator color="#ffffff" size="small" />
                            ) : (
                                <Text style={styles.connectButtonText}>连接</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    /** 透明遮罩 */
    overlay: {
        flex: 1,
        backgroundColor: theme.overlay,
        justifyContent: 'center',
        alignItems: 'center',
    },
    /** 居中容器 */
    centerContainer: {
        width: '100%',
        alignItems: 'center',
    },
    /** 弹窗卡片 */
    dialog: {
        width: '85%',
        maxWidth: 400,
        backgroundColor: theme.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
    },
    dialogTitle: {
        fontSize: fontSize.xl,
        fontWeight: '700',
        color: theme.textPrimary,
        marginBottom: spacing.xs,
    },
    dialogSubtitle: {
        fontSize: fontSize.lg,
        color: theme.textSecondary,
        marginBottom: spacing.xs,
    },
    deviceInfo: {
        fontSize: fontSize.sm,
        color: theme.textTertiary,
        marginBottom: spacing.lg,
    },
    /** 密码输入框 */
    passwordInput: {
        backgroundColor: theme.background,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        fontSize: fontSize.md,
        color: theme.textPrimary,
        minHeight: 48,
        marginBottom: spacing.md,
    },
    /** 错误提示 */
    errorText: {
        fontSize: fontSize.sm,
        color: theme.error,
        marginBottom: spacing.md,
    },
    /** 按钮组 */
    buttonRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: theme.surfaceVariant,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    cancelButtonText: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: theme.textSecondary,
    },
    connectButton: {
        flex: 1,
        backgroundColor: theme.primary,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    connectButtonText: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: '#ffffff',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});

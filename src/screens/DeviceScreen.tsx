/**
 * 设备控制页
 * 根据 interaction.mode 决定展示方式：
 * - webview: 加载 WebView
 * - native: 显示原生控制面板
 * - hybrid: WebView + 原生快捷操作
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import theme, { spacing, borderRadius, fontSize } from '../constants/theme';
import { useApi } from '../hooks/useApi';
import { login } from '../services/api';
import { QuickAction } from '../components/QuickAction';
import type { Device, RootStackParamList, InteractionMode } from '../types/device';

type DeviceRouteProp = RouteProp<RootStackParamList, 'Device'>;
type DeviceNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Device'>;

export function DeviceScreen() {
    const navigation = useNavigation<DeviceNavigationProp>();
    const route = useRoute<DeviceRouteProp>();
    const device = route.params.device;
    const api = useApi();

    const [authenticating, setAuthenticating] = useState(false);
    const [authenticated, setAuthenticated] = useState(!!device.token);
    const [showLogin, setShowLogin] = useState(false);
    const [password, setPassword] = useState('');

    /** 连接 WebSocket */
    useEffect(() => {
        const wsUrl = `ws://${device.host}:${device.wsPort}`;
        api.connect(wsUrl);
        return () => {
            api.disconnect();
        };
    }, [device.host, device.wsPort]);

    /** 处理 WebSocket 连接状态变化 */
    useEffect(() => {
        if (api.connected && device.token) {
            api.setToken(device.token);
            setAuthenticated(true);
        }
    }, [api.connected]);

    /** WebView 入口 URL */
    const webviewUrl = `http://${device.host}:${device.httpPort}/`;

    /** 注入到 WebView 的平台信息 */
    const injectedJavaScript = `
        window.JRAiPlatform = {
            platform: 'android',
            deviceId: '${device.deviceId}',
            token: '${device.token || ''}',
            version: '1.0.0',
            close: function() { window.ReactNativeWebView.postMessage('close'); },
            openDevice: function(id) { window.ReactNativeWebView.postMessage('openDevice:' + id); }
        };
        true;
    `;

    /** 处理 WebView 消息 */
    const handleWebViewMessage = useCallback((event: any) => {
        const data = event.nativeEvent.data;
        if (data === 'close') {
            navigation.goBack();
        } else if (data.startsWith('openDevice:')) {
            // 跳转到其他设备（后续实现）
            console.log('打开设备:', data.replace('openDevice:', ''));
        }
    }, [navigation]);

    /** 快捷操作回调 */
    const handleQuickAction = useCallback(async (
        method: string,
        params?: Record<string, unknown>
    ) => {
        try {
            await api.call(method, params);
        } catch (err) {
            Alert.alert('操作失败', err instanceof Error ? err.message : '请检查连接');
        }
    }, [api]);

    /** 渲染顶部栏 */
    const renderHeader = () => (
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
                        { backgroundColor: api.connected ? theme.online : theme.offline },
                    ]} />
                    <Text style={styles.statusText}>
                        {api.connected ? '已连接' : '未连接'}
                    </Text>
                </View>
            </View>
            <View style={{ width: 48 }} />
        </View>
    );

    /** 渲染快捷操作栏 */
    const renderQuickActions = () => {
        if (!device.quickActions || device.quickActions.length === 0) return null;

        return (
            <View style={styles.quickActionsBar}>
                {device.quickActions.map(action => (
                    <QuickAction
                        key={action.id}
                        title={action.title}
                        variant={action.confirmRequired ? 'danger' : 'default'}
                        onPress={() => {
                            if (action.confirmRequired) {
                                Alert.alert(
                                    '确认操作',
                                    action.confirmMessage || '确定执行此操作吗？',
                                    [
                                        { text: '取消', style: 'cancel' },
                                        {
                                            text: '确定',
                                            onPress: () => handleQuickAction(action.method, action.params),
                                        },
                                    ]
                                );
                            } else {
                                handleQuickAction(action.method, action.params);
                            }
                        }}
                    />
                ))}
            </View>
        );
    };

    /** 渲染 WebView 模式 */
    const renderWebview = () => (
        <View style={styles.webviewContainer}>
            <WebView
                source={{ uri: webviewUrl }}
                injectedJavaScript={injectedJavaScript}
                onMessage={handleWebViewMessage}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={styles.loadingText}>加载中...</Text>
                    </View>
                )}
                style={styles.webview}
            />
        </View>
    );

    /** 渲染原生控制模式 */
    const renderNative = () => (
        <View style={styles.nativeContainer}>
            <Text style={styles.nativeTitle}>原生控制面板</Text>
            <Text style={styles.nativeHint}>
                通过 WebSocket API 控制设备
            </Text>

            {/* 连接状态 */}
            <View style={styles.statusCard}>
                <Text style={styles.statusCardTitle}>连接信息</Text>
                <Text style={styles.statusCardText}>
                    WebSocket: {api.connected ? '已连接' : '未连接'}
                </Text>
                <Text style={styles.statusCardText}>
                    认证: {authenticated ? '已认证' : '未认证'}
                </Text>
            </View>

            {/* 快捷操作 */}
            {renderQuickActions()}
        </View>
    );

    /** 根据交互模式选择渲染方式 */
    const renderContent = () => {
        switch (device.interaction) {
            case 'webview':
                return (
                    <>
                        {renderWebview()}
                        {renderQuickActions()}
                    </>
                );
            case 'native':
                return renderNative();
            case 'hybrid':
                return (
                    <>
                        {renderWebview()}
                        {renderQuickActions()}
                    </>
                );
            default:
                // 未知模式降级为 WebView
                return renderWebview();
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            {renderHeader()}
            {renderContent()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xxxl,
        paddingBottom: spacing.md,
        backgroundColor: theme.background,
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
    webviewContainer: {
        flex: 1,
    },
    webview: {
        flex: 1,
        backgroundColor: theme.background,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.background,
    },
    loadingText: {
        fontSize: fontSize.md,
        color: theme.textSecondary,
        marginTop: spacing.md,
    },
    nativeContainer: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
    },
    nativeTitle: {
        fontSize: fontSize.xxl,
        fontWeight: '700',
        color: theme.textPrimary,
        marginBottom: spacing.sm,
    },
    nativeHint: {
        fontSize: fontSize.md,
        color: theme.textSecondary,
        marginBottom: spacing.xl,
    },
    statusCard: {
        backgroundColor: theme.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.xl,
    },
    statusCardTitle: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: theme.textPrimary,
        marginBottom: spacing.md,
    },
    statusCardText: {
        fontSize: fontSize.sm,
        color: theme.textSecondary,
        marginBottom: spacing.xs,
    },
    quickActionsBar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        backgroundColor: theme.background,
    },
});

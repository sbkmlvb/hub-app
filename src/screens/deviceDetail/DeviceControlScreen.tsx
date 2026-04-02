/**
 * 设备控制页面
 *
 * 根据 interaction.mode 渲染不同内容：
 * - webview: WebView 全屏
 * - native: 原生控制面板占位
 * - hybrid: WebView + 原生快捷操作面板
 */

import React, { useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import theme, { spacing, borderRadius, fontSize } from '../../constants/theme';
import { useDevices } from '../../hooks/useDevices';
import { useApi } from '../../hooks/useApi';
import { QuickAction } from '../../components/QuickAction';
import type { RootStackParamList, InteractionMode } from '../../types/device';

// WebView 仅在原生平台可用，Web 平台使用 iframe 降级
let WebViewComponent: React.ComponentType<any> | null = null;
try {
    WebViewComponent = require('react-native-webview').WebView;
} catch {
    WebViewComponent = null;
}

const isNativePlatform = Platform.OS === 'android' || Platform.OS === 'ios';

type ControlRouteProp = RouteProp<RootStackParamList, 'DeviceControl'>;
type ControlNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function DeviceControlScreen() {
    const navigation = useNavigation<ControlNavigationProp>();
    const route = useRoute<ControlRouteProp>();
    const { deviceId, interaction } = route.params;
    const { devices } = useDevices();
    const api = useApi();

    const device = devices.find(d => d.deviceId === deviceId);

    /** 连接 WebSocket */
    useEffect(() => {
        if (device) {
            const wsUrl = `ws://${device.host}:${device.wsPort}`;
            api.connect(wsUrl);
            if (device.token) {
                api.setToken(device.token);
            }
        }
        return () => {
            api.disconnect();
        };
    }, [device?.host, device?.wsPort]);

    /** 快捷操作回调 */
    const handleQuickAction = useCallback(async (
        method: string,
        params?: Record<string, unknown>
    ) => {
        try {
            await api.call(method, params);
        } catch (err) {
            // TODO: 错误提示
        }
    }, [api]);

    /** WebView 入口 URL */
    const webviewUrl = device
        ? `http://${device.host}:${device.httpPort}/`
        : '';

    /** 注入到 WebView 的平台信息 */
    const injectedJavaScript = device ? `
        window.JRAiPlatform = {
            platform: 'mobile',
            deviceId: '${device.deviceId}',
            token: '${device.token || ''}',
            version: '1.0.0',
            close: function() { window.ReactNativeWebView.postMessage('close'); }
        };
        true;
    ` : 'true;';

    /** 处理 WebView 消息 */
    const handleWebViewMessage = useCallback((event: any) => {
        const data = event.nativeEvent.data;
        if (data === 'close') {
            navigation.goBack();
        }
    }, [navigation]);

    /** 渲染顶部栏 */
    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.backButton}>返回</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
                {device?.deviceName || '设备控制'}
            </Text>
            <View style={styles.statusRow}>
                <View style={[
                    styles.statusDot,
                    { backgroundColor: api.connected ? theme.online : theme.offline },
                ]} />
            </View>
        </View>
    );

    /** 渲染 WebView（原生平台） */
    const renderNativeWebview = () => {
        if (!WebViewComponent) {
            return renderWebFallback();
        }
        return (
            <WebViewComponent
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
        );
    };

    /** 渲染 Web 平台降级方案（iframe） */
    const renderWebFallback = () => (
        <View style={styles.webview}>
            {webviewUrl ? (
                <iframe
                    src={webviewUrl}
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        backgroundColor: theme.background,
                    }}
                    title={device?.deviceName || '设备控制'}
                />
            ) : (
                <View style={styles.loadingOverlay}>
                    <Text style={styles.loadingText}>无有效地址</Text>
                </View>
            )}
        </View>
    );

    /** 渲染 WebView（根据平台自动选择） */
    const renderWebview = () => {
        if (isNativePlatform) {
            return renderNativeWebview();
        }
        return renderWebFallback();
    };

    /** 渲染快捷操作栏 */
    const renderQuickActions = () => {
        if (!device?.quickActions || device.quickActions.length === 0) return null;

        return (
            <View style={styles.quickActionsBar}>
                {device.quickActions.map(action => (
                    <QuickAction
                        key={action.id}
                        title={action.title}
                        variant={action.confirmRequired ? 'danger' : 'default'}
                        onPress={() => handleQuickAction(action.method, action.params)}
                    />
                ))}
            </View>
        );
    };

    /** 渲染原生控制模式 */
    const renderNative = () => (
        <View style={styles.nativeContainer}>
            <Text style={styles.nativeTitle}>原生控制面板</Text>
            <Text style={styles.nativeHint}>
                通过 WebSocket API 控制设备
            </Text>

            {/* 连接状态卡 */}
            <View style={styles.statusCard}>
                <Text style={styles.statusCardTitle}>连接信息</Text>
                <Text style={styles.statusCardText}>
                    WebSocket: {api.connected ? '已连接' : '未连接'}
                </Text>
                <Text style={styles.statusCardText}>
                    认证: {device?.token ? '已认证' : '未认证'}
                </Text>
            </View>

            {/* TODO: 根据插件页面列表渲染原生控制组件 */}

            {renderQuickActions()}
        </View>
    );

    /** 根据交互模式选择渲染方式 */
    const renderContent = () => {
        switch (interaction) {
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
                return renderWebview();
        }
    };

    /** 设备未找到 */
    if (!device) {
        return (
            <View style={styles.container}>
                {renderHeader()}
                <View style={styles.notFound}>
                    <Text style={styles.notFoundText}>设备未找到</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
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
    /** 顶部栏 */
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    backButton: {
        fontSize: fontSize.md,
        color: theme.primary,
    },
    headerTitle: {
        flex: 1,
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: theme.textPrimary,
        textAlign: 'center',
        marginHorizontal: spacing.md,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    /** WebView */
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
    /** 原生控制 */
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
    /** 快捷操作栏 */
    quickActionsBar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
    },
    /** 未找到 */
    notFound: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notFoundText: {
        fontSize: fontSize.lg,
        color: theme.textTertiary,
    },
});

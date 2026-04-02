/**
 * 设备扫描模态页面
 *
 * 复用扫描逻辑，调整为模态风格（顶部有关闭按钮）
 * 支持手动输入 IP 和自动检测子网扫描
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import theme, { spacing, borderRadius, fontSize } from '../../constants/theme';
import { scanDevice } from '../../services/api';
import { detectSubnets } from '../../services/network';
import type { SubnetInfo } from '../../services/network';
import { useDevices } from '../../hooks/useDevices';
import type { DeviceInfo, RootStackParamList } from '../../types/device';

type ScanNavigationProp = NativeStackNavigationProp<RootStackParamList>;

/** 扫描结果条目 */
interface ScanResult {
    ip: string;
    info: DeviceInfo;
}

export function DeviceScanScreen() {
    const navigation = useNavigation<ScanNavigationProp>();
    const { addDevice, scanSubnet } = useDevices();

    const [ipInput, setIpInput] = useState('');
    const [scanning, setScanning] = useState(false);
    const [scanResults, setScanResults] = useState<ScanResult[]>([]);
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
    const [detectedSubnets, setDetectedSubnets] = useState<SubnetInfo[]>([]);
    const [currentSubnet, setCurrentSubnet] = useState<string>('');

    /** 进入页面时自动检测子网 */
    useEffect(() => {
        detectSubnets().then(subnets => {
            setDetectedSubnets(subnets);
        });
    }, []);

    /** 扫描单个 IP */
    const handleScanIp = useCallback(async () => {
        const ip = ipInput.trim();
        if (!ip) {
            Alert.alert('提示', '请输入设备 IP 地址');
            return;
        }

        setScanning(true);
        try {
            const info = await scanDevice(ip);
            const result: ScanResult = { ip, info };
            setScanResults(prev => {
                const exists = prev.find(r => r.info.deviceId === info.deviceId);
                if (exists) return prev;
                return [result, ...prev];
            });
        } catch {
            Alert.alert('未发现设备', `在 ${ip} 上未找到可连接的设备`);
        } finally {
            setScanning(false);
        }
    }, [ipInput]);

    /** 自动扫描所有子网 */
    const handleAutoScan = useCallback(async () => {
        setScanning(true);
        setScanResults([]);
        const results: ScanResult[] = [];

        try {
            const subnets = detectedSubnets.length > 0
                ? detectedSubnets
                : await detectSubnets();

            if (subnets.length === 0) {
                Alert.alert('提示', '未检测到可用的网络接口');
                setScanning(false);
                return;
            }

            for (const subnet of subnets) {
                setCurrentSubnet(subnet.prefix);
                const found = await scanSubnet(subnet.prefix, (device) => {
                    results.push(device);
                    setScanResults([...results]);
                });
                for (const r of found) {
                    if (!results.find(f => f.ip === r.ip)) {
                        results.push(r);
                    }
                }
                setScanResults([...results]);
            }

            if (results.length === 0) {
                Alert.alert('扫描完成', '未在局域网中发现设备');
            }
        } catch {
            Alert.alert('扫描失败', '网络扫描过程中出现错误');
        } finally {
            setScanning(false);
            setCurrentSubnet('');
        }
    }, [detectedSubnets, scanSubnet]);

    /** 点击扫描结果添加设备 */
    const handleResultPress = useCallback(async (result: ScanResult) => {
        if (addedIds.has(result.info.deviceId)) return;

        try {
            await addDevice(result.ip, result.info);
            setAddedIds(prev => new Set(prev).add(result.info.deviceId));
        } catch {
            Alert.alert('添加失败', '保存设备信息时出错');
        }
    }, [addDevice, addedIds]);

    /** 关闭模态 */
    const handleClose = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    /** 渲染扫描结果条目 */
    const renderResult = useCallback(({ item }: { item: ScanResult }) => {
        const added = addedIds.has(item.info.deviceId);
        return (
            <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleResultPress(item)}
                activeOpacity={0.7}
            >
                <View style={styles.resultInfo}>
                    <Text style={styles.resultName}>{item.info.deviceName}</Text>
                    <Text style={styles.resultDetail}>
                        {item.info.productType} | {item.ip} | v{item.info.productVersion}
                    </Text>
                </View>
                <Text style={[styles.resultAdd, added && styles.resultAdded]}>
                    {added ? '已添加' : '+ 添加'}
                </Text>
            </TouchableOpacity>
        );
    }, [handleResultPress, addedIds]);

    return (
        <View style={styles.container}>
            {/* 模态顶部栏（带关闭按钮） */}
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>扫描设备</Text>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                    <Text style={styles.closeButtonText}>关闭</Text>
                </TouchableOpacity>
            </View>

            {/* IP 输入区域 */}
            <View style={styles.inputSection}>
                <Text style={styles.sectionTitle}>手动输入 IP</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.ipInput}
                        value={ipInput}
                        onChangeText={setIpInput}
                        placeholder="例如 192.168.1.100"
                        placeholderTextColor={theme.textTertiary}
                        keyboardType="numeric"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <TouchableOpacity
                        style={[styles.scanButton, scanning && styles.buttonDisabled]}
                        onPress={handleScanIp}
                        disabled={scanning}
                    >
                        <Text style={styles.scanButtonText}>扫描</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* 自动扫描区域 */}
            <View style={styles.subnetSection}>
                <Text style={styles.sectionTitle}>局域网扫描</Text>

                {detectedSubnets.length > 0 ? (
                    <View style={styles.subnetTags}>
                        {detectedSubnets.map(subnet => (
                            <TouchableOpacity
                                key={subnet.prefix}
                                style={styles.subnetTag}
                                disabled={scanning}
                                onPress={async () => {
                                    // TODO: 扫描指定子网
                                }}
                            >
                                <Text style={styles.subnetTagText}>
                                    {subnet.prefix}.x
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : null}

                <TouchableOpacity
                    style={[styles.fullScanButton, scanning && styles.buttonDisabled]}
                    onPress={handleAutoScan}
                    disabled={scanning}
                >
                    {scanning ? (
                        <View style={styles.scanningRow}>
                            <ActivityIndicator color="#ffffff" size="small" />
                            <Text style={styles.fullScanButtonText}>
                                {currentSubnet
                                    ? `正在扫描 ${currentSubnet}.x ...`
                                    : '扫描中...'}
                            </Text>
                        </View>
                    ) : (
                        <Text style={styles.fullScanButtonText}>
                            自动扫描全部网段
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* 扫描结果 */}
            {scanResults.length > 0 ? (
                <View style={styles.resultsSection}>
                    <Text style={styles.sectionTitle}>
                        发现 {scanResults.length} 台设备
                    </Text>
                    <FlatList
                        data={scanResults}
                        renderItem={renderResult}
                        keyExtractor={item => `${item.ip}-${item.info.deviceId}`}
                    />
                </View>
            ) : scanning ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={styles.loadingText}>正在扫描...</Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        overflow: 'hidden',
    },
    /** 模态顶部栏 */
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
        backgroundColor: theme.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    modalTitle: {
        fontSize: fontSize.xl,
        fontWeight: '700',
        color: theme.textPrimary,
    },
    closeButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: theme.surfaceVariant,
    },
    closeButtonText: {
        fontSize: fontSize.md,
        color: theme.primary,
        fontWeight: '600',
    },
    /** IP 输入区域 */
    inputSection: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
    },
    sectionTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: theme.textPrimary,
        marginBottom: spacing.md,
    },
    inputRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    ipInput: {
        flex: 1,
        backgroundColor: theme.surface,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        fontSize: fontSize.md,
        color: theme.textPrimary,
        minHeight: 48,
    },
    scanButton: {
        backgroundColor: theme.primary,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    scanButtonText: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: '#ffffff',
    },
    /** 子网扫描区域 */
    subnetSection: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.border,
    },
    subnetTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    subnetTag: {
        backgroundColor: theme.surface,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    subnetTagText: {
        fontSize: fontSize.sm,
        fontWeight: '600',
        color: theme.textPrimary,
    },
    fullScanButton: {
        backgroundColor: theme.surfaceVariant,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
    },
    scanningRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    fullScanButtonText: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: theme.textPrimary,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    /** 扫描结果区域 */
    resultsSection: {
        flex: 1,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.lg,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.surface,
        borderRadius: borderRadius.md,
        padding: spacing.lg,
        marginBottom: spacing.sm,
    },
    resultInfo: {
        flex: 1,
        marginRight: spacing.md,
    },
    resultName: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: theme.textPrimary,
        marginBottom: spacing.xs,
    },
    resultDetail: {
        fontSize: fontSize.xs,
        color: theme.textSecondary,
    },
    resultAdd: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: theme.primary,
    },
    resultAdded: {
        color: theme.textTertiary,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
    },
    loadingText: {
        fontSize: fontSize.md,
        color: theme.textSecondary,
        marginTop: spacing.md,
    },
});

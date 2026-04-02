/**
 * 扫描发现设备页
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
    StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import theme, { spacing, borderRadius, fontSize } from '../constants/theme';
import { scanDevice } from '../services/api';
import { detectSubnets } from '../services/network';
import type { SubnetInfo } from '../services/network';
import { useDevices } from '../hooks/useDevices';
import type { DeviceInfo, RootStackParamList } from '../types/device';

type ScanNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Scan'>;

/** 扫描结果条目 */
interface ScanResult {
    ip: string;
    info: DeviceInfo;
}

export function ScanScreen() {
    const navigation = useNavigation<ScanNavigationProp>();
    const { addDevice, scanSubnet } = useDevices();

    const [ipInput, setIpInput] = useState('');
    const [scanning, setScanning] = useState(false);
    const [scanResults, setScanResults] = useState<ScanResult[]>([]);
    // 已添加的 deviceId 集合，用于 UI 状态切换
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

    // 自动检测到的子网列表
    const [detectedSubnets, setDetectedSubnets] = useState<SubnetInfo[]>([]);
    // 当前正在扫描的子网（用于 UI 展示进度）
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
            Alert.alert(
                '未发现设备',
                `在 ${ip} 上未找到可连接的设备，请检查 IP 地址和网络连接。`
            );
        } finally {
            setScanning(false);
        }
    }, [ipInput]);

    /** 自动扫描所有检测到的子网 */
    const handleAutoScan = useCallback(async () => {
        setScanning(true);
        setScanResults([]);
        const results: ScanResult[] = [];

        try {
            const subnets = detectedSubnets.length > 0
                ? detectedSubnets
                : await detectSubnets();

            if (subnets.length === 0) {
                Alert.alert('提示', '未检测到可用的网络接口，请检查网络连接');
                setScanning(false);
                return;
            }

            // 依次扫描每个子网
            for (const subnet of subnets) {
                setCurrentSubnet(subnet.prefix);
                const found = await scanSubnet(subnet.prefix, (device) => {
                    results.push(device);
                    setScanResults([...results]);
                });
                // 合并去重
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

    /** 扫描指定子网（点击子网标签触发） */
    const handleScanSpecificSubnet = useCallback(async (prefix: string) => {
        setScanning(true);
        setScanResults([]);
        setCurrentSubnet(prefix);
        const results: ScanResult[] = [];

        try {
            const found = await scanSubnet(prefix, (device) => {
                results.push(device);
                setScanResults([...results]);
            });
            for (const r of found) {
                if (!results.find(f => f.ip === r.ip)) {
                    results.push(r);
                }
            }
            setScanResults([...results]);

            if (results.length === 0) {
                Alert.alert('扫描完成', `在 ${prefix}.x 网段未发现设备`);
            }
        } catch {
            Alert.alert('扫描失败', '网络扫描过程中出现错误');
        } finally {
            setScanning(false);
            setCurrentSubnet('');
        }
    }, [scanSubnet]);

    /** 点击扫描结果添加设备 */
    const handleResultPress = useCallback(async (result: ScanResult) => {
        // 已添加则跳过
        if (addedIds.has(result.info.deviceId)) return;

        try {
            await addDevice(result.ip, result.info);
            setAddedIds(prev => new Set(prev).add(result.info.deviceId));
        } catch {
            Alert.alert('添加失败', '保存设备信息时出错');
        }
    }, [addDevice, addedIds]);

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
                    {item.info.description ? (
                        <Text style={styles.resultDesc} numberOfLines={1}>
                            {item.info.description}
                        </Text>
                    ) : null}
                </View>
                <Text style={[styles.resultAdd, added && styles.resultAdded]}>
                    {added ? '已添加' : '+ 添加'}
                </Text>
            </TouchableOpacity>
        );
    }, [handleResultPress, addedIds]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* 顶部栏 */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backButton}>返回</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>扫描设备</Text>
                <View style={{ width: 48 }} />
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

                {/* 已检测到的子网列表 */}
                {detectedSubnets.length > 0 ? (
                    <View style={styles.subnetList}>
                        <Text style={styles.sectionHint}>
                            已检测到 {detectedSubnets.length} 个网络接口：
                        </Text>
                        <View style={styles.subnetTags}>
                            {detectedSubnets.map(subnet => (
                                <TouchableOpacity
                                    key={subnet.prefix}
                                    style={[
                                        styles.subnetTag,
                                        scanning && styles.buttonDisabled,
                                    ]}
                                    onPress={() => handleScanSpecificSubnet(subnet.prefix)}
                                    disabled={scanning}
                                >
                                    <Text style={styles.subnetTagText}>
                                        {subnet.prefix}.x
                                    </Text>
                                    {subnet.localIp ? (
                                        <Text style={styles.subnetTagIp}>
                                            ({subnet.localIp})
                                        </Text>
                                    ) : null}
                                </TouchableOpacity>
                            ))}
                        </View>
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
                    <Text style={styles.loadingText}>
                        {currentSubnet
                            ? `正在扫描 ${currentSubnet}.x ...`
                            : '正在检测网络...'}
                    </Text>
                </View>
            ) : null}
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
        paddingBottom: spacing.lg,
    },
    backButton: {
        fontSize: fontSize.md,
        color: theme.primary,
    },
    headerTitle: {
        fontSize: fontSize.xxl,
        fontWeight: '700',
        color: theme.textPrimary,
    },
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
    sectionHint: {
        fontSize: fontSize.sm,
        color: theme.textTertiary,
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
    subnetSection: {
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: theme.border,
    },
    subnetList: {
        marginBottom: spacing.md,
    },
    subnetTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    subnetTag: {
        flexDirection: 'row',
        alignItems: 'center',
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
    subnetTagIp: {
        fontSize: fontSize.xs,
        color: theme.textTertiary,
        marginLeft: spacing.xs,
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
    resultDesc: {
        fontSize: fontSize.xs,
        color: theme.textTertiary,
        marginTop: spacing.xs,
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

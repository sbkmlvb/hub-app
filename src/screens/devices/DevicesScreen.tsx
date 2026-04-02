/**
 * 设备管理页面
 *
 * 平板模式：左侧筛选列表 + 右侧设备详情
 * 手机模式：列表和详情垂直堆叠
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import theme, { spacing, borderRadius, fontSize } from '../../constants/theme';
import { useDevices } from '../../hooks/useDevices';
import { DeviceCard } from '../../components/DeviceCard';
import { SplitView } from '../../components/layout/SplitView';
import type { Device, RootStackParamList } from '../../types/device';

type DevicesNavigationProp = NativeStackNavigationProp<RootStackParamList>;

/** 筛选标签类型 */
type FilterType = 'all' | 'online' | 'offline';

export function DevicesScreen() {
    const navigation = useNavigation<DevicesNavigationProp>();
    const { devices, removeDevice } = useDevices();
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchText, setSearchText] = useState('');
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

    /** 根据筛选和搜索条件过滤设备 */
    const filteredDevices = devices.filter(d => {
        // 筛选条件
        if (filter === 'online' && !d.online) return false;
        if (filter === 'offline' && d.online) return false;
        // 搜索条件
        if (searchText) {
            const keyword = searchText.toLowerCase();
            return (
                d.deviceName.toLowerCase().includes(keyword) ||
                d.host.toLowerCase().includes(keyword) ||
                d.productType.toLowerCase().includes(keyword)
            );
        }
        return true;
    });

    const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId) || null;

    /** 点击设备卡片 */
    const handleDevicePress = useCallback((device: Device) => {
        setSelectedDeviceId(device.deviceId);
    }, []);

    /** 跳转到设备详情 */
    const handleOpenConsole = useCallback((deviceId: string) => {
        navigation.navigate('DeviceDetail', { deviceId });
    }, [navigation]);

    /** 跳转到设备扫描 */
    const handleScanDevice = useCallback(() => {
        navigation.navigate('DeviceScan');
    }, [navigation]);

    /** 筛选标签列表 */
    const filterLabels: { key: FilterType; label: string }[] = [
        { key: 'all', label: '全部' },
        { key: 'online', label: '在线' },
        { key: 'offline', label: '离线' },
    ];

    /** 左面板：筛选 + 搜索 + 列表 */
    const leftPanel = (
        <View style={styles.leftPanel}>
            {/* 筛选标签 */}
            <View style={styles.filterRow}>
                {filterLabels.map(item => (
                    <TouchableOpacity
                        key={item.key}
                        style={[
                            styles.filterTag,
                            filter === item.key && styles.filterTagActive,
                        ]}
                        onPress={() => setFilter(item.key)}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.filterTagText,
                            filter === item.key && styles.filterTagTextActive,
                        ]}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* 搜索框 */}
            <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="搜索设备名称或IP"
                placeholderTextColor={theme.textTertiary}
            />

            {/* 设备列表 */}
            <FlatList
                data={filteredDevices}
                renderItem={({ item }) => (
                    <DeviceCard
                        device={item}
                        onPress={handleDevicePress}
                    />
                )}
                keyExtractor={item => item.deviceId}
                contentContainerStyle={styles.deviceList}
                ListEmptyComponent={
                    <View style={styles.emptyList}>
                        <Text style={styles.emptyListText}>
                            {searchText ? '未找到匹配的设备' : '暂无设备'}
                        </Text>
                    </View>
                }
            />

            {/* 扫描按钮 */}
            <TouchableOpacity style={styles.scanButton} onPress={handleScanDevice}>
                <Text style={styles.scanButtonText}>+ 扫描设备</Text>
            </TouchableOpacity>
        </View>
    );

    /** 右面板：设备详情 */
    const rightPanel = (
        <View style={styles.rightPanel}>
            {selectedDevice ? (
                <>
                    {/* 设备信息卡 */}
                    <View style={styles.detailCard}>
                        <View style={styles.detailHeader}>
                            <Text style={styles.detailName}>
                                {selectedDevice.deviceName}
                            </Text>
                            <View style={[
                                styles.statusBadge,
                                {
                                    backgroundColor: selectedDevice.online
                                        ? theme.online
                                        : theme.offline,
                                },
                            ]}>
                                <Text style={styles.statusText}>
                                    {selectedDevice.online ? '在线' : '离线'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.detailInfo}>
                            <Text style={styles.detailRow}>
                                类型: {selectedDevice.productType}
                            </Text>
                            <Text style={styles.detailRow}>
                                地址: {selectedDevice.host}:{selectedDevice.httpPort}
                            </Text>
                            <Text style={styles.detailRow}>
                                版本: v{selectedDevice.productVersion}
                            </Text>
                        </View>
                    </View>

                    {/* TODO: 快捷操作按钮组 */}

                    {/* 进入控制台按钮 */}
                    <TouchableOpacity
                        style={styles.consoleButton}
                        onPress={() => handleOpenConsole(selectedDevice.deviceId)}
                    >
                        <Text style={styles.consoleButtonText}>
                            进入控制台
                        </Text>
                    </TouchableOpacity>
                </>
            ) : (
                <View style={styles.emptyDetail}>
                    <Text style={styles.emptyDetailText}>
                        选择左侧设备查看详情
                    </Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <SplitView left={leftPanel} right={rightPanel} leftRatio={0.35} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    /** 左面板 */
    leftPanel: {
        flex: 1,
        backgroundColor: theme.background,
        padding: spacing.lg,
    },
    filterRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    filterTag: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: theme.surface,
        minHeight: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterTagActive: {
        backgroundColor: theme.primary,
    },
    filterTagText: {
        fontSize: fontSize.sm,
        color: theme.textSecondary,
    },
    filterTagTextActive: {
        color: '#ffffff',
        fontWeight: '600',
    },
    searchInput: {
        backgroundColor: theme.surface,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        fontSize: fontSize.md,
        color: theme.textPrimary,
        marginBottom: spacing.md,
        minHeight: 44,
    },
    deviceList: {
        paddingBottom: spacing.md,
    },
    emptyList: {
        paddingVertical: spacing.xxl,
        alignItems: 'center',
    },
    emptyListText: {
        fontSize: fontSize.md,
        color: theme.textTertiary,
    },
    scanButton: {
        backgroundColor: theme.primary,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        marginTop: spacing.sm,
    },
    scanButtonText: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: '#ffffff',
    },
    /** 右面板 */
    rightPanel: {
        flex: 1,
        backgroundColor: theme.background,
        padding: spacing.lg,
    },
    detailCard: {
        backgroundColor: theme.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    detailName: {
        fontSize: fontSize.xl,
        fontWeight: '700',
        color: theme.textPrimary,
        flex: 1,
        marginRight: spacing.md,
    },
    statusBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.sm,
    },
    statusText: {
        fontSize: fontSize.xs,
        color: '#ffffff',
        fontWeight: '600',
    },
    detailInfo: {
        gap: spacing.xs,
    },
    detailRow: {
        fontSize: fontSize.sm,
        color: theme.textSecondary,
    },
    consoleButton: {
        backgroundColor: theme.primary,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
    },
    consoleButtonText: {
        fontSize: fontSize.lg,
        fontWeight: '700',
        color: '#ffffff',
    },
    emptyDetail: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyDetailText: {
        fontSize: fontSize.lg,
        color: theme.textTertiary,
    },
});

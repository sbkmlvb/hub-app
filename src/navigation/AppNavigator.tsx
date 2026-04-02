/**
 * 应用导航配置
 * 三层导航结构：
 * 1. 根导航（RootStack）- 管理主应用区和模态栈
 * 2. 主Tab导航（MainTabs）- 平板侧边栏 / 手机底部Tab
 * 3. 设备详情栈（DeviceDetailStack）- 设备控制页面
 */

import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import type {
    RootStackParamList,
    MainTabParamList,
} from '../types/device';
import theme, { fontSize, breakpoints } from '../constants/theme';

// 主Tab页面
import { HubScreen } from '../screens/hub/HubScreen';
import { DevicesScreen } from '../screens/devices/DevicesScreen';
import { StageScreen } from '../screens/stage/StageScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';

// 设备详情页面
import { DeviceOverviewScreen } from '../screens/deviceDetail/DeviceOverviewScreen';
import { DeviceControlScreen } from '../screens/deviceDetail/DeviceControlScreen';

// 模态页面
import { DeviceScanScreen } from '../screens/modals/DeviceScanScreen';
import { LoginModalScreen } from '../screens/modals/LoginModalScreen';

// 布局组件
import { Sidebar } from '../components/layout/Sidebar';
import type { SidebarItem } from '../components/layout/Sidebar';

// 导航器实例
const RootStack = createNativeStackNavigator<RootStackParamList>();
const BottomTab = createBottomTabNavigator<MainTabParamList>();

/** 侧边栏导航项 */
const sidebarItems: SidebarItem[] = [
    { id: 'Hub', icon: '🏠', title: '首页' },
    { id: 'Devices', icon: '📡', title: '设备' },
    { id: 'Stage', icon: '🎭', title: '舞台' },
    { id: 'Settings', icon: '⚙️', title: '设置' },
];

/** 页面组件映射 */
const screenMap: Record<string, React.ComponentType<any>> = {
    Hub: HubScreen,
    Devices: DevicesScreen,
    Stage: StageScreen,
    Settings: SettingsScreen,
};

/**
 * 手机模式底部Tab导航
 * 使用标准 BottomTabNavigator
 */
function PhoneTabs() {
    return (
        <BottomTab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.surface,
                    borderTopColor: theme.border,
                    borderTopWidth: 1,
                },
                tabBarActiveTintColor: theme.primary,
                tabBarInactiveTintColor: theme.textTertiary,
                tabBarLabelStyle: {
                    fontSize: fontSize.xs,
                },
            }}
        >
            <BottomTab.Screen
                name="Hub"
                component={HubScreen}
                options={{ title: '首页' }}
            />
            <BottomTab.Screen
                name="Devices"
                component={DevicesScreen}
                options={{ title: '设备' }}
            />
            <BottomTab.Screen
                name="Stage"
                component={StageScreen}
                options={{ title: '舞台' }}
            />
            <BottomTab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: '设置' }}
            />
        </BottomTab.Navigator>
    );
}

/**
 * 平板模式布局
 * 左侧固定侧边栏 + 右侧内容区域
 */
function TabletLayout() {
    const [activeTab, setActiveTab] = useState('Hub');
    const ActiveScreen = screenMap[activeTab] || HubScreen;

    return (
        <View style={styles.tabletContainer}>
            <Sidebar
                activeId={activeTab}
                items={sidebarItems}
                onSelect={setActiveTab}
            />
            <View style={styles.tabletContent}>
                <ActiveScreen />
            </View>
        </View>
    );
}

/**
 * 主应用入口
 * 根据屏幕尺寸选择平板侧边栏布局或手机底部Tab布局
 * 独立组件，确保 hooks 调用符合 React 规则
 */
function MainEntry() {
    const { width } = useWindowDimensions();

    if (width >= breakpoints.tablet) {
        return <TabletLayout />;
    }
    return <PhoneTabs />;
}

/**
 * 根导航器
 * 管理主应用页面、设备详情、模态弹窗
 */
export function AppNavigator() {
    return (
        <RootStack.Navigator
            initialRouteName="Main"
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.background },
            }}
        >
            {/* 主应用入口：平板侧边栏 / 手机底部Tab */}
            <RootStack.Screen
                name="Main"
                component={MainEntry}
                options={{ headerShown: false }}
            />

            {/* 设备详情 */}
            <RootStack.Screen
                name="DeviceDetail"
                component={DeviceOverviewScreen}
                options={{ animation: 'slide_from_right' }}
            />

            {/* 设备控制 */}
            <RootStack.Screen
                name="DeviceControl"
                component={DeviceControlScreen}
                options={{ animation: 'slide_from_right' }}
            />

            {/* 设备扫描模态 */}
            <RootStack.Screen
                name="DeviceScan"
                component={DeviceScanScreen}
                options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                }}
            />

            {/* 登录模态 */}
            <RootStack.Screen
                name="LoginModal"
                component={LoginModalScreen}
                options={{
                    presentation: 'transparentModal',
                }}
            />
        </RootStack.Navigator>
    );
}

const styles = StyleSheet.create({
    /** 平板布局容器：水平排列 */
    tabletContainer: {
        flex: 1,
        flexDirection: 'row',
    },
    /** 平板内容区域：填充侧边栏剩余空间 */
    tabletContent: {
        flex: 1,
    },
});

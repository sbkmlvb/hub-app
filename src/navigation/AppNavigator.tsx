/**
 * 应用导航配置
 * 使用 React Navigation 配置导航栈：Home -> Scan -> Device
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { ScanScreen } from '../screens/ScanScreen';
import { DeviceScreen } from '../screens/DeviceScreen';
import type { RootStackParamList } from '../types/device';
import theme from '../constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * 应用导航器
 * 配置所有页面的路由和导航选项
 */
export function AppNavigator() {
    return (
        <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
                headerShown: false,
                contentStyle: {
                    backgroundColor: theme.background,
                },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    title: 'JRAi Hub',
                }}
            />
            <Stack.Screen
                name="Scan"
                component={ScanScreen}
                options={{
                    title: '扫描设备',
                    animation: 'slide_from_bottom',
                }}
            />
            <Stack.Screen
                name="Device"
                component={DeviceScreen}
                options={{
                    title: '设备控制',
                    animation: 'slide_from_right',
                }}
            />
        </Stack.Navigator>
    );
}

/**
 * 应用入口
 * 包裹 NavigationContainer，加载导航器
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { initAutoUpdate } from './src/services/updater';

export default function App() {
    useEffect(() => {
        // 启动后检查更新（延迟 2 秒，避免影响首屏加载）
        const timer = setTimeout(() => initAutoUpdate(), 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <NavigationContainer>
            <AppNavigator />
        </NavigationContainer>
    );
}

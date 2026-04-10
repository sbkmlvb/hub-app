/**
 * 自动更新服务
 * 支持两种更新策略：
 * 1. OTA 热更新：通过 expo-updates 下载新 JS 包，无需重新安装
 * 2. APK 整包下载：检查服务器最新版本，提示用户下载安装新 APK
 */

import { Platform } from 'react-native';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    lastCheckTime: 'update_last_check',
    skippedVersion: 'update_skipped_version',
};

/** 服务器版本信息 */
interface ServerVersionInfo {
    /** 最新版本号 */
    version: string;
    /** 版本代码（Android versionCode） */
    versionCode: number;
    /** 更新说明 */
    releaseNotes: string;
    /** APK 下载地址 */
    apkUrl: string;
    /** 是否强制更新 */
    forceUpdate: boolean;
    /** 最低支持版本（低于此版本必须更新） */
    minSupportedVersion: string;
    /** 文件大小（字节） */
    fileSize: number;
    /** MD5 校验 */
    md5: string;
}

/** 更新检查结果 */
interface UpdateCheckResult {
    /** 是否有更新可用 */
    hasUpdate: boolean;
    /** 是否为 OTA 热更新（无需下载APK） */
    isOtaUpdate: boolean;
    /** 是否强制更新 */
    forceUpdate: boolean;
    /** 服务器版本信息 */
    versionInfo?: ServerVersionInfo;
    /** OTA 更新清单（expo-updates 提供） */
    otaManifest?: Updates.UpdateCheckResult;
}

/** 更新下载进度 */
interface DownloadProgress {
    /** 是否正在下载 */
    downloading: boolean;
    /** 已下载字节数 */
    downloadedBytes: number;
    /** 总字节数 */
    totalBytes: number;
    /** 下载进度（0-1） */
    progress: number;
}

/** 更新事件回调 */
type UpdateCallback = (result: UpdateCheckResult) => void;
type ProgressCallback = (progress: DownloadProgress) => void;

/**
 * 检查 OTA 热更新
 * 通过 expo-updates 检查是否有新的 JS 包可用
 */
export async function checkOtaUpdate(): Promise<Updates.UpdateCheckResult | null> {
    // Web 平台不支持 expo-updates
    if (__DEV__ || Platform.OS === 'web') {
        return null;
    }

    try {
        const result = await Updates.checkForUpdateAsync();
        return result;
    } catch (err) {
        console.warn('OTA更新检查失败:', err);
        return null;
    }
}

/**
 * 下载并应用 OTA 热更新
 * 下载完成后需要重启App才能生效
 */
export async function downloadOtaUpdate(): Promise<boolean> {
    if (__DEV__ || Platform.OS === 'web') {
        return false;
    }

    try {
        const update = await Updates.fetchUpdateAsync();
        if (update.isNew) {
            // 新更新已下载，需要重启生效
            await Updates.reloadAsync();
            return true;
        }
        return false;
    } catch (err) {
        console.warn('OTA更新下载失败:', err);
        return false;
    }
}

/**
 * 检查服务器上的 APK 整包更新
 * 从更新服务器获取最新版本信息
 */
export async function checkServerUpdate(): Promise<ServerVersionInfo | null> {
    try {
        // 从 app.json extra 获取更新服务器地址
        const updateUrl = Updates.extra?.updateServerUrl || 'https://update.jrai.com';
        const response = await fetch(`${updateUrl}/api/version/latest`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-App-Version': Updates.runtimeVersion || '1.0.0',
                'X-Platform': Platform.OS,
            },
        });

        if (!response.ok) return null;

        const info: ServerVersionInfo = await response.json();
        return info;
    } catch (err) {
        console.warn('服务器版本检查失败:', err);
        return null;
    }
}

/**
 * 比较版本号
 * 返回: 1 = v1 > v2, -1 = v1 < v2, 0 = 相等
 */
function compareVersion(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    const maxLen = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLen; i++) {
        const n1 = parts1[i] || 0;
        const n2 = parts2[i] || 0;
        if (n1 > n2) return 1;
        if (n1 < n2) return -1;
    }
    return 0;
}

/**
 * 综合检查更新
 * 先检查 OTA 热更新，再检查 APK 整包更新
 * 返回完整的更新检查结果
 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
    const currentVersion = Updates.runtimeVersion || '1.0.0';

    // 1. 先检查 OTA 热更新（仅原生平台）
    const otaResult = await checkOtaUpdate();
    if (otaResult?.isAvailable) {
        return {
            hasUpdate: true,
            isOtaUpdate: true,
            forceUpdate: false,
            otaManifest: otaResult,
        };
    }

    // 2. 检查服务器 APK 整包更新
    const serverInfo = await checkServerUpdate();
    if (!serverInfo) {
        return { hasUpdate: false, isOtaUpdate: false, forceUpdate: false };
    }

    // 检查是否有新版本
    if (compareVersion(serverInfo.version, currentVersion) <= 0) {
        return { hasUpdate: false, isOtaUpdate: false, forceUpdate: false };
    }

    // 检查是否跳过过此版本
    const skippedVersion = await AsyncStorage.getItem(STORAGE_KEYS.skippedVersion);
    if (skippedVersion === serverInfo.version && !serverInfo.forceUpdate) {
        return { hasUpdate: false, isOtaUpdate: false, forceUpdate: false };
    }

    return {
        hasUpdate: true,
        isOtaUpdate: false,
        forceUpdate: serverInfo.forceUpdate,
        versionInfo: serverInfo,
    };
}

/**
 * 执行更新
 * OTA 更新：直接下载并重启
 * APK 更新：返回下载链接，由调用方处理下载安装
 */
export async function performUpdate(result: UpdateCheckResult): Promise<string | null> {
    if (result.isOtaUpdate) {
        await downloadOtaUpdate();
        return null;
    }

    // APK 更新：返回下载地址
    return result.versionInfo?.apkUrl || null;
}

/**
 * 跳过本次版本更新
 */
export async function skipUpdate(version: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.skippedVersion, version);
}

/**
 * 获取 APK 下载链接
 */
export function getApkDownloadUrl(): string {
    return Updates.extra?.apkDownloadUrl || 'https://update.jrai.com/api/apk/latest';
}

/**
 * 记录更新检查时间
 */
export async function recordCheckTime(): Promise<void> {
    await AsyncStorage.setItem(
        STORAGE_KEYS.lastCheckTime,
        new Date().toISOString()
    );
}

/**
 * 是否需要检查更新（距上次检查超过指定间隔）
 * @param intervalMs 检查间隔（毫秒），默认 24 小时
 */
export async function shouldCheckUpdate(intervalMs: number = 24 * 60 * 60 * 1000): Promise<boolean> {
    const lastCheck = await AsyncStorage.getItem(STORAGE_KEYS.lastCheckTime);
    if (!lastCheck) return true;

    const elapsed = Date.now() - new Date(lastCheck).getTime();
    return elapsed >= intervalMs;
}

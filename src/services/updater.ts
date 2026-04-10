/**
 * 自动更新模块
 * 检查更新服务器版本，提示用户下载安装新 APK
 * 与 3dview 项目保持一致的更新策略
 */

import { Platform, Alert, Linking } from 'react-native';
import { APP_VERSION } from '../constants/version';

// 更新服务器地址 — 打包前请改为实际服务器 IP
const UPDATE_SERVER = 'http://192.168.88.53:3457';

export interface VersionInfo {
  versionCode: number;
  versionName: string;
  apkFileName: string;
  updateLog: string;
  forceUpdate: boolean;
  downloadUrl: string;
  pageUrl: string;
}

/** 当前应用版本号（与 build.gradle 中 versionCode 保持一致） */
const CURRENT_VERSION_CODE = APP_VERSION.code;

/** 检查是否有新版本 */
export async function checkForUpdate(): Promise<{ hasUpdate: boolean; info: VersionInfo | null }> {
  try {
    const resp = await fetch(`${UPDATE_SERVER}/api/version`, { cache: 'no-store' });
    if (!resp.ok) return { hasUpdate: false, info: null };
    const info: VersionInfo = await resp.json();
    return {
      hasUpdate: info.versionCode > CURRENT_VERSION_CODE,
      info,
    };
  } catch (e) {
    console.warn('[Updater] 检查更新失败:', e);
    return { hasUpdate: false, info: null };
  }
}

/** 触发 APK 下载（打开系统浏览器下载） */
export function triggerDownload(downloadUrl: string) {
  if (Platform.OS === 'android') {
    Linking.openURL(downloadUrl);
  } else {
    Linking.openURL(downloadUrl);
  }
}

/** 在 App 启动时调用 */
export async function initAutoUpdate(options?: {
  silent?: boolean;
  onUpdate?: (info: VersionInfo) => void;
  onNoUpdate?: () => void;
}) {
  const { silent = false, onUpdate, onNoUpdate } = options || {};

  const { hasUpdate, info } = await checkForUpdate();

  if (hasUpdate && info) {
    if (onUpdate) {
      onUpdate(info);
    } else if (!silent) {
      showUpdateDialog(info);
    }
  } else {
    onNoUpdate?.();
  }
}

/** React Native 更新弹窗 */
function showUpdateDialog(info: VersionInfo) {
  const buttons: any[] = [
    {
      text: '立即更新',
      onPress: () => triggerDownload(info.downloadUrl),
    },
  ];

  // 非强制更新允许跳过
  if (!info.forceUpdate) {
    buttons.unshift({
      text: '稍后再说',
      style: 'cancel' as const,
    });
  }

  Alert.alert(
    `发现新版本 v${info.versionName}`,
    info.updateLog,
    buttons,
    { cancelable: !info.forceUpdate }
  );
}

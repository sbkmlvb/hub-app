/**
 * 暗色主题颜色常量
 * 以 #1e1e2e 为主背景色，适合触摸操作的大按钮设计
 */

const theme = {
    /** 主背景色 */
    background: '#1e1e2e',
    /** 卡片/表面背景色 */
    surface: '#2a2a3d',
    /** 表面色变体（按压状态） */
    surfaceVariant: '#33334d',
    /** 主强调色（蓝紫色调） */
    primary: '#7c5cfc',
    /** 主强调色浅色 */
    primaryLight: '#9b82fc',
    /** 主强调色暗色 */
    primaryDark: '#5a3dcc',
    /** 次强调色（青色） */
    secondary: '#4ecdc4',
    /** 文字主色（白色） */
    textPrimary: '#e0e0e0',
    /** 文字次色（灰色） */
    textSecondary: '#8888a0',
    /** 文字三级色 */
    textTertiary: '#5a5a72',
    /** 分割线/边框色 */
    border: '#3a3a52',
    /** 成功色（绿色） */
    success: '#4caf50',
    /** 警告色（黄色） */
    warning: '#ff9800',
    /** 错误色（红色） */
    error: '#f44336',
    /** 在线状态色 */
    online: '#4caf50',
    /** 离线状态色 */
    offline: '#666680',
    /** 透明色 */
    transparent: 'transparent',
    /** 遮罩色 */
    overlay: 'rgba(0, 0, 0, 0.5)',
};

/** 通用间距 */
export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
};

/** 通用圆角 */
export const borderRadius = {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 24,
    full: 9999,
};

/** 通用字体大小 */
export const fontSize = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    title: 32,
    hero: 40,
};

export default theme;

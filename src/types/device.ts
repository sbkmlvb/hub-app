/**
 * 设备相关类型定义
 * 对接 MOBILE_API_SPEC.md 中定义的数据结构
 */

/** 交互模式 */
export type InteractionMode = 'webview' | 'native' | 'hybrid' | 'miniapp';

/** 认证方式 */
export type AuthMethod = 'password' | 'oauth' | 'pin' | 'none';

/** 快捷操作定义（来自设备 identity 响应） */
export interface QuickAction {
    /** 快捷操作唯一标识 */
    id: string;
    /** 显示名称 */
    title: string;
    /** 图标标识 */
    icon?: string;
    /** 对应的 WebSocket API 方法名 */
    method: string;
    /** 调用参数 */
    params?: Record<string, unknown>;
    /** 是否需要用户二次确认 */
    confirmRequired?: boolean;
    /** 确认提示文案 */
    confirmMessage?: string;
}

/** Web 页面信息 */
export interface WebPage {
    /** 页面路径 */
    path: string;
    /** 页面标题 */
    title: string;
    /** 图标标识 */
    icon?: string;
    /** 页面描述 */
    description?: string;
}

/** 设备能力声明 */
export interface DeviceCapabilities {
    /** WebView 模式下的可用页面 */
    webPages?: WebPage[];
    /** 快捷操作列表 */
    quickActions?: QuickAction[];
    /** 可订阅的事件列表 */
    events?: string[];
}

/** 设备端点信息 */
export interface DeviceEndpoints {
    http: {
        port: number;
        baseUrl: string;
    };
    websocket: {
        port: number;
        url: string;
    };
}

/** 认证配置 */
export interface DeviceAuth {
    /** 是否需要认证 */
    required: boolean;
    /** 支持的认证方式 */
    methods: AuthMethod[];
}

/** 交互配置 */
export interface DeviceInteraction {
    /** 交互模式 */
    mode: InteractionMode;
    /** WebView 入口 URL（相对于 baseUrl） */
    entryUrl: string;
    /** 模式描述 */
    description?: string;
}

/**
 * GET /api/identity 响应结构
 * 设备身份信息，无需认证
 */
export interface DeviceInfo {
    /** 设备唯一标识 */
    deviceId: string;
    /** 设备名称 */
    deviceName: string;
    /** 产品类型标识（如 jraicontroller） */
    productType: string;
    /** 产品软件版本 */
    productVersion: string;
    /** API 协议版本 */
    apiVersion: string;
    /** 厂商名称 */
    manufacturer?: string;
    /** 产品型号 */
    model?: string;
    /** 连接端点 */
    endpoints: DeviceEndpoints;
    /** 交互配置 */
    interaction: DeviceInteraction;
    /** 认证配置 */
    auth: DeviceAuth;
    /** 设备图标 URL */
    icon?: string;
    /** 产品描述 */
    description?: string;
    /** 设备能力声明 */
    capabilities?: DeviceCapabilities;
}

/**
 * 本地保存的设备信息
 * 包含连接状态和认证信息
 */
export interface Device {
    /** 设备唯一标识 */
    deviceId: string;
    /** 设备名称 */
    deviceName: string;
    /** 产品类型 */
    productType: string;
    /** 产品版本 */
    productVersion: string;
    /** 设备 IP 地址 */
    host: string;
    /** HTTP 端口 */
    httpPort: number;
    /** WebSocket 端口 */
    wsPort: number;
    /** 添加时间 */
    addedAt: string;
    /** 最后连接时间 */
    lastConnected: string;
    /** 认证 Token（可选，未登录时为空） */
    token?: string;
    /** 交互模式 */
    interaction: InteractionMode;
    /** 设备描述 */
    description?: string;
    /** 在线状态 */
    online: boolean;
    /** 快捷操作列表 */
    quickActions?: QuickAction[];
}

/** HTTP 登录请求参数 */
export interface LoginParams {
    password: string;
}

/** HTTP 登录响应 */
export interface LoginResult {
    token: string;
    expiresIn: number;
}

/** 认证检查响应 */
export interface AuthCheckResult {
    authenticated: boolean;
}

/** WebSocket JSON-RPC 请求 */
export interface JsonRpcRequest {
    id: string;
    method: string;
    params?: Record<string, unknown>;
    token?: string;
}

/** WebSocket JSON-RPC 成功响应 */
export interface JsonRpcSuccessResponse {
    id: string;
    result: unknown;
    timestamp: number;
}

/** WebSocket JSON-RPC 错误响应 */
export interface JsonRpcErrorResponse {
    id: string;
    error: {
        code: number;
        message: string;
        details?: unknown;
    };
    timestamp: number;
}

/** WebSocket JSON-RPC 响应（联合类型） */
export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

/** WebSocket 事件推送 */
export interface JsonRpcEvent {
    event: string;
    data: unknown;
    timestamp: number;
    source?: string;
}

/** 产品类型枚举（已知产品类型） */
export type ProductType = 'jraicontroller' | 'audiomixer' | 'videoprocessor' | 'electricalCabinet' | string;

/** 通信协议类型 */
export type ProtocolType = 'websocket' | 'http' | 'udp' | 'tcp';

/** 设备连接状态 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/** 设备适配器事件回调 */
export type AdapterEventCallback = (event: string, data: unknown) => void;

/** 设备适配器接口 - UI层通过此接口与设备通信 */
export interface IDeviceAdapter {
    /** 连接设备 */
    connect(): Promise<void>;
    /** 断开连接 */
    disconnect(): void;
    /** 调用设备方法 */
    call<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;
    /** 订阅设备事件 */
    subscribe(event: string, callback: AdapterEventCallback): void;
    /** 取消订阅 */
    unsubscribe(event: string, callback: AdapterEventCallback): void;
    /** 获取连接状态 */
    getConnectionState(): ConnectionState;
    /** 设置认证Token */
    setToken(token: string): void;
    /** 使用的协议类型 */
    readonly protocolType: ProtocolType;
}

/** 设备插件页面定义 */
export interface DevicePluginPage {
    /** 页面唯一标识 */
    id: string;
    /** 显示标题 */
    title: string;
    /** 图标名称 */
    icon: string;
    /** 页面组件名（用于动态加载） */
    componentName: string;
    /** 排序权重 */
    order?: number;
}

/** 设备插件定义 */
export interface DevicePlugin {
    /** 产品类型 */
    productType: string;
    /** 插件名称 */
    name: string;
    /** 插件页面列表 */
    pages: DevicePluginPage[];
    /** 创建设备适配器的工厂方法 */
    createAdapter(device: Device): IDeviceAdapter;
}

/** 主Tab导航参数 */
export type MainTabParamList = {
    Hub: undefined;
    Devices: undefined;
    Stage: undefined;
    Settings: { section?: string };
};

/** 设备详情栈导航参数 */
export type DeviceDetailParamList = {
    DeviceOverview: { deviceId: string };
    DeviceControl: { deviceId: string };
};

/** 全局模态栈导航参数 */
export type ModalParamList = {
    DeviceScan: undefined;
    LoginModal: { deviceId: string };
};

/** 根导航参数 */
export type RootStackParamList = {
    Main: undefined;
    DeviceDetail: { deviceId: string };
    DeviceControl: { deviceId: string; interaction: InteractionMode };
    DeviceScan: undefined;
    LoginModal: { deviceId: string };
};

/**
 * API 服务
 * 负责与设备 HTTP 接口通信
 * 对接 MOBILE_API_SPEC.md 中定义的 REST API
 */

import type {
    DeviceInfo,
    LoginParams,
    LoginResult,
    AuthCheckResult,
} from '../types/device';

/** HTTP 请求超时时间（毫秒） */
const REQUEST_TIMEOUT = 5000;

/**
 * 构建设备 HTTP 基础 URL
 */
function buildBaseUrl(ip: string, port: number = 8080): string {
    return `http://${ip}:${port}`;
}

/**
 * 通用 HTTP 请求封装
 */
async function request<T>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => null);
            throw new Error(
                errorBody?.error?.message || `HTTP ${response.status}`
            );
        }

        return await response.json() as T;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * 扫描设备 - 调用 GET /api/identity
 * 无需认证，用于识别设备类型和能力
 *
 * @param ip 设备 IP 地址
 * @param port HTTP 端口，默认 8080
 * @returns 设备身份信息
 */
export async function scanDevice(ip: string, port?: number): Promise<DeviceInfo> {
    const url = `${buildBaseUrl(ip, port)}/api/identity`;
    return request<DeviceInfo>(url);
}

/**
 * HTTP 登录 - 调用 POST /api/auth/login
 *
 * @param ip 设备 IP 地址
 * @param password 登录密码
 * @param port HTTP 端口，默认 8080
 * @returns 登录结果，包含 token
 */
export async function login(
    ip: string,
    password: string,
    port?: number
): Promise<LoginResult> {
    const url = `${buildBaseUrl(ip, port)}/api/auth/login`;
    const body: LoginParams = { password };
    return request<LoginResult>(url, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

/**
 * 检查认证状态 - 调用 GET /api/auth/check
 *
 * @param ip 设备 IP 地址
 * @param token 认证 Token
 * @param port HTTP 端口，默认 8080
 * @returns 认证状态
 */
export async function checkAuth(
    ip: string,
    token: string,
    port?: number
): Promise<AuthCheckResult> {
    const url = `${buildBaseUrl(ip, port)}/api/auth/check`;
    return request<AuthCheckResult>(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

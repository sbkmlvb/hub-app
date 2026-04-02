/**
 * 网络接口检测服务
 * 自动获取本机活跃网卡的 IP 地址，推导可扫描的子网
 *
 * 优先使用 expo-network 原生 API，浏览器环境回退到 WebRTC 探测
 */

import { Platform } from 'react-native';
import * as Network from 'expo-network';

/** 检测到的子网信息 */
export interface SubnetInfo {
    /** 子网前缀，如 '192.168.1' */
    prefix: string;
    /** 本机在该子网上的 IP 地址 */
    localIp: string;
    /** 网络类型 */
    type: 'wifi' | 'ethernet' | 'unknown';
}

/**
 * 从 IP 地址提取子网前缀（/24）
 * '192.168.88.100' → '192.168.88'
 */
function extractSubnetPrefix(ip: string): string | null {
    const parts = ip.split('.');
    if (parts.length !== 4) return null;
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
}

/**
 * 判断是否为私有 IP 地址（RFC 1918）
 */
function isPrivateIp(ip: string): boolean {
    if (ip.startsWith('10.')) return true;
    if (ip.startsWith('192.168.')) return true;
    // 172.16.x.x ~ 172.31.x.x
    if (ip.startsWith('172.')) {
        const second = parseInt(ip.split('.')[1], 10);
        if (second >= 16 && second <= 31) return true;
    }
    return false;
}

/**
 * 通过 WebRTC ICE 候选获取本机局域网 IP（浏览器环境兜底）
 * 原理：RTCPeerConnection 建立 ICE 候选时会暴露本机 srflx 地址
 */
function getLocalIpViaWebRTC(): Promise<string[]> {
    return new Promise((resolve) => {
        const ips: string[] = [];

        try {
            const pc = new RTCPeerConnection({
                iceServers: [], // 不需要 STUN/TURN，只需本机地址
            });
            pc.createDataChannel('');

            pc.onicecandidate = (event) => {
                if (!event.candidate) {
                    // 候选收集完毕
                    pc.close();
                    resolve(ips);
                    return;
                }

                // 从候选字符串中提取 IP
                // 格式示例: "candidate:...typ host ... 192.168.88.100 ..."
                const candidate = event.candidate.candidate;
                const match = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
                if (match && isPrivateIp(match[1]) && !ips.includes(match[1])) {
                    ips.push(match[1]);
                }
            };

            // 设置超时，防止 ICE 收集挂起
            setTimeout(() => {
                pc.close();
                resolve(ips);
            }, 3000);

            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .catch(() => resolve(ips));
        } catch {
            resolve(ips);
        }
    });
}

/**
 * 通过原生 API 获取本机 IP（Android / iOS）
 */
async function getLocalIpNative(): Promise<string | null> {
    try {
        const ip = await Network.getIpAddressAsync();
        if (ip && ip !== '0.0.0.0' && isPrivateIp(ip)) {
            return ip;
        }
    } catch {
        // 原生 API 不可用
    }
    return null;
}

/**
 * 获取本机所有可扫描的子网
 *
 * 检测策略：
 * 1. 原生环境（Android/iOS）：expo-network 获取 WiFi IP
 * 2. 浏览器环境：WebRTC ICE 候选探测本机 IP
 * 3. 全部失败时回退到常见子网
 */
export async function detectSubnets(): Promise<SubnetInfo[]> {
    const subnets: SubnetInfo[] = [];
    const seenPrefixes = new Set<string>();

    // 策略 1：原生 API（Android / iOS）
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const ip = await getLocalIpNative();
        if (ip) {
            const prefix = extractSubnetPrefix(ip);
            if (prefix) {
                seenPrefixes.add(prefix);
                subnets.push({ prefix, localIp: ip, type: 'wifi' });
            }
        }
    }

    // 策略 2：WebRTC 探测（浏览器环境或原生检测失败的兜底）
    if (subnets.length === 0) {
        const webrtcIps = await getLocalIpViaWebRTC();
        for (const ip of webrtcIps) {
            const prefix = extractSubnetPrefix(ip);
            if (prefix && !seenPrefixes.has(prefix)) {
                seenPrefixes.add(prefix);
                subnets.push({ prefix, localIp: ip, type: 'ethernet' });
            }
        }
    }

    // 策略 3：全部失败，回退到常见子网
    if (subnets.length === 0) {
        const fallbacks = ['192.168.1', '192.168.0', '10.0.0'];
        for (const prefix of fallbacks) {
            subnets.push({ prefix, localIp: '', type: 'unknown' });
        }
    }

    return subnets;
}

/**
 * 获取本机首选 IP 地址
 */
export async function getLocalIp(): Promise<string | null> {
    // 原生环境优先
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const ip = await getLocalIpNative();
        if (ip) return ip;
    }

    // 浏览器环境兜底
    const webrtcIps = await getLocalIpViaWebRTC();
    return webrtcIps.length > 0 ? webrtcIps[0] : null;
}

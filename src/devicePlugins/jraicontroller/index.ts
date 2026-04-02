/**
 * JRAiController 设备插件
 * 定义 JRAiController 舞台灯光控制器的功能页面和适配器绑定
 */

import type { DevicePlugin, DevicePluginPage } from '../../types/device';
import { registerPlugin } from '../registry';
import { createAdapter } from '../../adapters/adapterFactory';

/** JRAiController 设备功能页面定义 */
const pages: DevicePluginPage[] = [
    { id: 'cues', title: 'CUE控制', icon: 'bulb', componentName: 'CueListPage', order: 1 },
    { id: 'channels', title: '通道控制', icon: 'slider', componentName: 'ChannelFaderPage', order: 2 },
    { id: 'groups', title: '灯组控制', icon: 'spotlight', componentName: 'GroupControlPage', order: 3 },
    { id: 'scenes', title: '场景管理', icon: 'image', componentName: 'ScenePage', order: 4 },
    { id: 'sequences', title: '序列编辑', icon: 'clapperboard', componentName: 'SequencePage', order: 5 },
    { id: 'media', title: '媒体播放', icon: 'music', componentName: 'MediaPlayPage', order: 6 },
    { id: 'dmx', title: 'DMX管理', icon: 'plug', componentName: 'DmxManagerPage', order: 7 },
    { id: 'stage', title: '舞台布局', icon: 'layout', componentName: 'StageLayoutPage', order: 8 },
    { id: 'project', title: '项目管理', icon: 'folder', componentName: 'ProjectPage', order: 9 },
];

/** JRAiController 设备插件定义 */
const jraiControllerPlugin: DevicePlugin = {
    productType: 'jraicontroller',
    name: 'JRAiController 舞台灯光控制器',
    pages,
    createAdapter: (device) => {
        return createAdapter(device);
    },
};

// 注册插件到全局注册表
registerPlugin(jraiControllerPlugin);

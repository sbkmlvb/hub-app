# JRAi Hub App 页面框架设计方案

## Context

JRAi Hub 是 JRAiController 生态的移动端中枢应用，用于发现、管理和控制各类舞台设备（灯光控制台、调音台、视频处理器、电柜等）。当前项目仅有3个基础页面（Home/Scan/Device），采用手机竖屏线性导航，需要升级为平板优先的专业级页面框架。

**设计约束**：
- 平板为主（横屏大屏），兼容手机
- 多协议设备支持：WebSocket JSON-RPC、HTTP REST、UDP、TCP
- 设备类型驱动：不同产品有不同交互模式（webview/native/hybrid/miniapp）
- 暗色主题（#1e1e2e 主背景，#7c5cfc 主色）
- 参考：Luminair、StageLight 等专业灯光控制App

---

## 一、导航架构：响应式双布局

**平板**（>=768dp）：侧边栏图标导航 + 主内容区（支持分栏）
**手机**（<768dp）：底部 Tab 栏 + 单栏内容

```
三层导航结构：
├── MainApp（平板侧边栏 / 手机底部Tab）
│   ├── Hub（仪表盘）
│   ├── Devices（设备管理）
│   ├── Stage（舞台总控）
│   └── Settings（设置）
├── DeviceDetailStack（设备详情）
│   ├── DeviceOverview（设备概览）
│   ├── DeviceControl（设备控制主界面）
│   └── DevicePages/[...]（设备子页面，按产品类型动态注册）
└── GlobalModals（全局弹层）
    ├── LoginModal / ConfirmDialog / NotificationOverlay / QuickActionSheet
```

---

## 二、完整页面定义

### 2.1 一级页面（主Tab/侧边栏）

#### Hub 仪表盘
- **用途**：全局概览、快速操控中心，打开App后的首页
- **平板布局**：左右分栏（40%/60%）
  - 左侧：所有设备的迷你状态卡片（在线状态+关键数据如当前CUE名、通道活跃数）
  - 右侧：选中设备的快捷控制面板
    - CUE 快捷播控栏（上一个/播放/下一个 + 进度条）
    - 全局快捷操作按钮组（来自 capabilities.quickActions）
    - 实时事件流（订阅 lighting.*/system.* 等事件）

#### Devices 设备管理
- **用途**：设备全生命周期管理 + 进入设备控制的主入口
- **平板布局**：左右分栏（35%/65%）
  - 左侧：筛选标签（全部/在线/离线/类型）+ 搜索 + 设备列表
  - 右侧：选中设备的详情卡片 + 快捷操作 + "进入控制台"按钮
  - 子模态：DeviceScan（mDNS自动发现 + 子网扫描 + 手动IP输入）

#### Stage 舞台总控
- **用途**：跨设备协同控制，演出场景下的"万能遥控器"
- **平板布局**：
  - 顶部：全局操作栏（场景快切、全黑、紧急停止、当前CUE名）
  - 中部：横向三栏面板（灯光CUE控制 | 媒体播放控制 | 电柜/其他设备）
  - 底部可选：序列时间线 / 事件日志

#### Settings 设置
- **用途**：应用全局配置
- 分组：连接管理（网络/mDNS）、外观（主题/布局/字体）、安全（认证/密码）、通知、高级（超时/调试）、关于

### 2.2 二级页面（设备详情栈）

#### DeviceOverview 设备概览
- **用途**：单设备完整信息 + 功能入口
- 内容：设备状态信息卡 + 功能模块入口网格（灯光/序列/媒体/DMX/舞台/项目/系统） + 快捷操作栏

#### DeviceControl 设备控制主界面（三种模式）
- **webview模式**（JRAiController）：WebView全屏 + 底部快捷操作栏
- **native模式**（调音台/电柜）：左侧功能导航 + 右侧原生控制面板
- **hybrid模式**（视频处理器）：WebView（监控画面）+ 原生快捷面板混合

### 2.3 设备专用原生控制页面

**JRAiController**：
- CueListPage、ChannelFaderPage、GroupControlPage、ScenePage
- SequencePage、MediaPlayPage、DmxManagerPage、StageLayoutPage、ProjectPage

**AudioMixer 调音台**：
- MixerFaderPage（推子面板）、MixerScenePage（场景预设）
- MixerEffectsPage（效果器）、MixerMonitorPage（电平监视）

**ElectricalCabinet 电柜**：
- RelayControlPage（继电器开关网格 + 电力参数）
- PowerMonitorPage（电压/电流/功率图表）
- RelayScenePage（继电器场景预设）

**VideoProcessor 视频处理器**：
- VideoMonitorPage、VideoSwitchPage、VideoPresetPage

### 2.4 全局组件/浮层
- LoginModal（设备认证弹窗）
- NotificationOverlay（全局告警通知Toast）
- QuickActionSheet（快捷操作面板）
- ConnectionStatusBar（连接状态指示条）

---

## 三、多协议抽象层

```
UI组件层 → DeviceAdapter（统一接口）→ ProtocolAdapter
  ├── WebSocketAdapter → JSON-RPC over WS（JRAiController）
  ├── HttpAdapter → REST API（设备发现/认证/文件）
  ├── UdpAdapter → 二进制协议（电柜）
  └── TcpAdapter → 自定义协议（预留）
```

**核心原则**：UI层不感知协议细节，统一通过 `adapter.call(method, params)` 和 `adapter.subscribe(event, cb)` 操作。

---

## 四、文件组织

```
hub-app/src/
  adapters/           # 协议适配层
    DeviceAdapter.ts、WebSocketAdapter.ts、HttpAdapter.ts、UdpAdapter.ts、adapterFactory.ts
  protocols/          # 协议编解码
    jsonRpc.ts、electricalCabinet.ts、mdnsDiscovery.ts
  devicePlugins/      # 设备插件（按产品类型注册）
    jraicontroller/、audiomixer/、electricalCabinet/、videoprocessor/
  navigation/         # 导航配置（重构为三层）
    AppNavigator.tsx
  screens/
    hub/              # Hub仪表盘
    devices/          # 设备管理
    stage/            # 舞台总控
    settings/         # 设置
    deviceDetail/     # 设备详情栈
    modals/           # 全局弹层
  components/
    common/           # 通用UI组件
    device/           # 设备相关组件
    control/          # 控制面板组件（推子、按钮、状态指示等）
    layout/           # 布局组件（侧边栏、分栏视图、自适应容器）
  hooks/
    useDeviceAdapter.ts  # 设备适配器Hook
    useResponsive.ts     # 响应式布局Hook
  types/              # 类型定义（扩展路由参数、设备能力等）
  constants/
    theme.ts          # 补充面板/分栏/告警色等设计token
```

---

## 五、实现分期

### 第一期：基础架构升级
1. 响应式导航系统（侧边栏 + 底部Tab自适应）
2. DeviceAdapter 协议抽象层（封装现有 useApi/api.ts）
3. 设备插件注册机制
4. 路由类型扩展（MainTabParamList、DeviceDetailParamList、ModalParamList）

### 第二期：核心页面
1. Hub 仪表盘（分屏 + 事件订阅）
2. Devices 设备管理页（分栏视图）
3. DeviceOverview + DeviceControl 多模式渲染
4. LoginModal 全局认证

### 第三期：专业控制页面
1. JRAiController 原生控制页面组（CUE播控、推子等）
2. 电柜 UDP 协议适配 + 继电器控制
3. Stage 舞台总控

### 第四期：高级功能
1. mDNS 自动发现
2. 调音台/视频处理器插件
3. 手势和动画优化
4. 文件上传

---

## 六、新增依赖

| 包名 | 用途 |
|------|------|
| `@react-navigation/bottom-tabs` | 手机底部Tab导航 |
| `react-native-reanimated` | 流畅动画（推子、转场） |
| `react-native-gesture-handler` | 手势支持 |
| `react-native-svg` | 图表、状态指示 |
| `@react-native-community/netinfo` | 网络状态检测 |

## 七、关键文件修改

- `src/types/device.ts` — 扩展路由参数类型
- `src/navigation/AppNavigator.tsx` — 重构为三层导航器
- `src/hooks/useApi.ts` — 提取为 WebSocketAdapter
- `src/constants/theme.ts` — 补充设计token
- `src/screens/DeviceScreen.tsx` — 拆分为 DeviceOverview + DeviceControl

## 八、验证方式

1. 平板模式：侧边栏导航 + 分栏布局正确显示
2. 手机模式：底部Tab + 单栏布局自适应
3. 设备扫描和添加流程完整可用
4. WebView 设备可正常打开和交互
5. 不同产品类型设备加载对应的控制页面
6. 多协议设备通信正常（WS/HTTP/UDP）

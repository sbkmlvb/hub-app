#!/bin/bash
# JRAi Hub 一键构建发布脚本
#
# 用法:
#   ./update-server/publish.sh              # 完整流程（默认版本号自增）
#   ./update-server/publish.sh 1.2.0        # 指定版本号
#   ./update-server/publish.sh build        # 仅打包（不发布）
#   ./update-server/publish.sh publish      # 仅发布（用已有 APK）
#   ./update-server/publish.sh server       # 仅启动更新服务器
#
# 完整流程: 更新版本号 → prebuild → 注入签名 → 构建 APK → 复制 → 更新 version.json

set -e
cd "$(dirname "$0")/.."

# ─── 配置 ─────────────────────────────────────────────
PROJECT_NAME="JRAiHub"
APK_OUTPUT="${PROJECT_NAME}-release.apk"
VERSION_JSON="update-server/version.json"
KEYSTORE_FILE="android/app/release-key.jks"
KEYSTORE_PASS="jraihub123"
KEY_ALIAS="jraihub"
KEY_PASS="jraihub123"
GRADLE_MIRROR="https://mirrors.cloud.tencent.com/gradle"
UPDATE_SERVER_PORT=3457

export ANDROID_HOME=~/android-sdk
export ANDROID_SDK_ROOT=~/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

# ─── 颜色 ─────────────────────────────────────────────
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ─── 解析参数 ─────────────────────────────────────────
ACTION="full"
VERSION_NAME=""

case "$1" in
  build)   ACTION="build" ;;
  publish) ACTION="publish" ;;
  server)  ACTION="server" ;;
  *)       VERSION_NAME="${1:-}"; ACTION="full" ;;
esac

# ─── 辅助函数 ─────────────────────────────────────────

# 读取当前 versionCode
get_current_code() {
  grep -o '"versionCode": [0-9]*' "$VERSION_JSON" | grep -o '[0-9]*'
}

# 计算新版本号
resolve_version() {
  CURRENT_CODE=$(get_current_code)
  NEW_CODE=$((CURRENT_CODE + 1))
  if [ -z "$VERSION_NAME" ]; then
    VERSION_NAME=$(grep -o '"versionName": "[^"]*"' "$VERSION_JSON" | grep -o '"[^"]*"$' | tr -d '"')
    # 自动补丁版本自增，如 1.0.0 → 1.0.1
    IFS='.' read -r major minor patch <<< "$VERSION_NAME"
    patch=$((patch + 1))
    VERSION_NAME="${major}.${minor}.${patch}"
  fi
}

# 更新所有文件中的版本号
update_version_numbers() {
  info "更新版本号 → v${VERSION_NAME} (Build ${NEW_CODE})"

  # build.gradle
  sed -i "s/versionCode [0-9]*/versionCode ${NEW_CODE}/" android/app/build.gradle
  sed -i "s/versionName \"[^\"]*\"/versionName \"${VERSION_NAME}\"/" android/app/build.gradle

  # app.json
  sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"${VERSION_NAME}\"/" app.json

  # src/constants/version.ts
  if [ -f "src/constants/version.ts" ]; then
    sed -i "s/code: [0-9]*/code: ${NEW_CODE}/" src/constants/version.ts
    sed -i "s/name: '[^']*'/name: '${VERSION_NAME}'/" src/constants/version.ts
  fi

  ok "版本号已更新"
}

# Expo prebuild 并注入 release 签名配置
prebuild_and_inject_signing() {
  info "同步 Expo 原生项目 (prebuild)..."

  # 备份 keystore（prebuild --clean 会清空 android 目录）
  local KS_TMP=""
  if [ -f "$KEYSTORE_FILE" ]; then
    KS_TMP=$(mktemp)
    cp "$KEYSTORE_FILE" "$KS_TMP"
    info "已备份 release keystore"
  fi

  npx expo prebuild --platform android --clean 2>&1 | tail -5

  # 恢复 keystore
  if [ -n "$KS_TMP" ] && [ -f "$KS_TMP" ]; then
    cp "$KS_TMP" "$KEYSTORE_FILE"
    rm -f "$KS_TMP"
    ok "已恢复 release keystore"
  fi

  # 注入 release 签名配置到 build.gradle
  info "注入 release 签名配置..."
  python3 -c "
import re
with open('android/app/build.gradle', 'r') as f:
    content = f.read()

# 注入 release signingConfigs（在 debug 块之后）
old_signing = '''    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }'''
new_signing = '''    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file('release-key.jks')
            storePassword '${KEYSTORE_PASS}'
            keyAlias '${KEY_ALIAS}'
            keyPassword '${KEY_PASS}'
        }
    }'''
content = content.replace(old_signing, new_signing)

# release buildType 使用 signingConfigs.release
content = content.replace(
    'signingConfig signingConfigs.debug\\n            def enableShrinkResources',
    'signingConfig signingConfigs.release\\n            def enableShrinkResources'
)

with open('android/app/build.gradle', 'w') as f:
    f.write(content)
"
  ok "签名配置已注入"

  # 确保 Gradle 使用国内镜像
  local GRADLE_PROPS="android/gradle/wrapper/gradle-wrapper.properties"
  if grep -q "services.gradle.org" "$GRADLE_PROPS" 2>/dev/null; then
    sed -i "s|https://services.gradle.org|${GRADLE_MIRROR}|g" "$GRADLE_PROPS"
    info "已切换 Gradle 下载镜像为腾讯源"
  fi
}

# Gradle 构建 APK
build_apk() {
  info "构建 Release APK（Gradle assembleRelease）..."
  android/gradlew assembleRelease -p android --no-daemon 2>&1 | tail -5
  ok "Gradle 构建完成"
}

# 复制 APK 到项目根目录
copy_apk() {
  local SRC="android/app/build/outputs/apk/release/app-release.apk"
  if [ ! -f "$SRC" ]; then
    error "APK 未找到: $SRC"
  fi
  cp "$SRC" "$APK_OUTPUT"
  local SIZE
  SIZE=$(du -h "$APK_OUTPUT" | cut -f1)
  ok "APK 已复制: ${APK_OUTPUT} (${SIZE})"
}

# 更新 version.json
update_version_json() {
  info "更新 version.json..."
  python3 -c "
import json
with open('${VERSION_JSON}', 'r') as f:
    d = json.load(f)
d['versionCode'] = ${NEW_CODE}
d['versionName'] = '${VERSION_NAME}'
d['apkFileName'] = '${APK_OUTPUT}'
with open('${VERSION_JSON}', 'w') as f:
    json.dump(d, f, indent=2, ensure_ascii=False)
    f.write('\n')
"
  ok "version.json 已更新"
}

# 启动更新服务器
start_server() {
  info "安装服务器依赖..."
  cd update-server
  npm install --silent 2>/dev/null
  info "启动更新服务器 (端口 ${UPDATE_SERVER_PORT})..."
  node server.js
}

# 杀掉已运行的服务器进程
stop_server() {
  local PID
  PID=$(lsof -ti :${UPDATE_SERVER_PORT} 2>/dev/null || true)
  if [ -n "$PID" ]; then
    warn "端口 ${UPDATE_SERVER_PORT} 已被占用 (PID: ${PID})，正在关闭..."
    kill $PID 2>/dev/null || true
    sleep 1
  fi
}

# ─── 获取本机 IP ──────────────────────────────────────
get_local_ip() {
  ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || hostname -I | awk '{print $1}'
}

# ─── 主流程 ───────────────────────────────────────────

case "$ACTION" in
  server)
    echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     JRAi Hub 更新服务器              ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
    stop_server
    start_server
    ;;

  build)
    resolve_version
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     JRAi Hub 构建                    ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
    echo -e "  版本: v${VERSION_NAME} (Build ${NEW_CODE})"
    echo ""

    update_version_numbers
    prebuild_and_inject_signing
    build_apk
    copy_apk
    update_version_json

    echo ""
    ok "构建完成! APK: ${APK_OUTPUT}"
    echo "  运行 ./update-server/publish.sh publish 发布到服务器"
    ;;

  publish)
    if [ ! -f "$APK_OUTPUT" ]; then
      error "未找到 ${APK_OUTPUT}，请先运行 build"
    fi
    echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     JRAi Hub 发布                    ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"

    stop_server
    start_server
    ;;

  full)
    resolve_version
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     JRAi Hub 构建并发布              ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
    echo -e "  版本: v${VERSION_NAME} (Build ${NEW_CODE})"
    echo -e "  流程: 版本号 → prebuild → 签名注入 → 构建 → 复制 → 发布"
    echo ""

    update_version_numbers
    prebuild_and_inject_signing
    build_apk
    copy_apk
    update_version_json

    echo ""
    ok "构建完成! 启动更新服务器..."
    stop_server

    LOCAL_IP=$(get_local_ip)
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║       发布成功!                          ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║  APK:  ${APK_OUTPUT} $(du -h "$APK_OUTPUT" | cut -f1)${NC}"
    echo -e "${GREEN}║  版本: v${VERSION_NAME} (Build ${NEW_CODE})${NC}"
    echo -e "${GREEN}║  下载: http://${LOCAL_IP}:${UPDATE_SERVER_PORT}${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
    echo ""

    cd update-server
    npm install --silent 2>/dev/null
    node server.js
    ;;
esac

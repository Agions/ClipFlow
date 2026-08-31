#!/usr/bin/env bash
# ClipFlow One-Line Installer
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/ClipFlow/ClipFlow/main/install.sh | bash -s -- 1.9.8
#
# Works on: macOS, Linux, Windows (Git Bash / WSL)

set -e

# ── Args ──────────────────────────────────────────
VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  echo "❌ 请指定版本号，例如:"
  echo "   curl -fsSL https://raw.githubusercontent.com/ClipFlow/ClipFlow/main/install.sh | bash -s -- 1.9.8"
  exit 1
fi

REPO="ClipFlow/ClipFlow"
INSTALL_DIR="${HOME}/Applications/ClipFlow.app"
TMPDIR="${TMPDIR:-/tmp}"
ARTIFACT_DIR="${TMPDIR}/cutdeck-install"

mkdir -p "$ARTIFACT_DIR"
cd "$ARTIFACT_DIR"

# ── Detect OS / Arch ──────────────────────────────
detect_os() {
  case "$(uname -s)" in
    Linux*)     echo "linux" ;;
    Darwin*)    echo "macos" ;;
    MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
    *)          echo "unknown" ;;
  esac
}

download() {
  local artifact_path="$1"
  local filename="$2"
  local url="https://github.com/${REPO}/releases/download/${VERSION}/${artifact_path}"

  echo "⬇️  下载 $filename..."
  if ! curl -fLo "${ARTIFACT_DIR}/${filename}" -H "Accept: application/octet-stream" "$url"; then
    echo "❌ 下载失败: $url"
    exit 1
  fi
}

install_macos() {
  local dmg="${ARTIFACT_DIR}/ClipFlow.dmg"
  download "ClipFlow-macos-dmg/ClipFlow.dmg" "ClipFlow.dmg"

  echo "📦 挂载 DMG..."
  hdiutil attach "$dmg" -mountpoint /Volumes/ClipFlow -nobrowse

  echo "🧹 移除旧版..."
  rm -rf "$INSTALL_DIR"

  echo "📦 复制到 Applications..."
  cp -r /Volumes/ClipFlow/ClipFlow.app "$INSTALL_DIR"

  hdiutil detach /Volumes/ClipFlow
  rm -f "$dmg"

  echo "✅ 安装完成: ${INSTALL_DIR}"
  echo "   启动: open \"${INSTALL_DIR}\""
}

install_linux_appimage() {
  local appimage="${ARTIFACT_DIR}/ClipFlow.AppImage"
  download "ClipFlow-linux-appimage/ClipFlow.AppImage" "ClipFlow.AppImage"

  chmod +x "$appimage"

  BIN_DIR="${HOME}/.local/bin"
  mkdir -p "$BIN_DIR"
  mv "$appimage" "${BIN_DIR}/ClipFlow"

  echo "✅ 安装完成: ${BIN_DIR}/ClipFlow"
  echo "   运行: ${BIN_DIR}/ClipFlow"
}

install_linux_deb() {
  local deb="${ARTIFACT_DIR}/cutdeck.deb"
  DEB_FILE=$(find release -name "*.deb" 2>/dev/null | head -1)
  if [ -z "$DEB_FILE" ]; then
    echo "❌ 未找到 deb 包，跳过..."
    return
  fi
  cp "$DEB_FILE" "$deb"
  sudo dpkg -i "$deb" || sudo apt-get -f install -y
  rm -f "$deb"
  echo "✅ 安装完成"
}

install_windows() {
  local exe=$(find release -name "*.exe" 2>/dev/null | head -1)
  if [ -z "$exe" ]; then
    echo "❌ 未找到 exe 安装包，跳过..."
    return
  fi
  echo "📦 运行安装程序: $exe"
  powershell -Command "Start-Process msiexec.exe -Wait -ArgumentList '/i', '$exe'"
  echo "✅ 安装完成"
}

# ── Main ──────────────────────────────────────────
main() {
  local os=$(detect_os)
  echo "🖥️  系统: ${os}"
  echo "📦 版本: ${VERSION}"

  case "$os" in
    macos)  install_macos ;;
    linux)
      if curl -sfI "https://github.com/${REPO}/releases/download/${VERSION}/ClipFlow-linux-appimage/ClipFlow.AppImage" > /dev/null 2>&1; then
        install_linux_appimage
      else
        install_linux_deb
      fi
      ;;
    windows) install_windows ;;
    *)      echo "❌ 不支持的操作系统: ${os}" ; exit 1 ;;
  esac
}

main

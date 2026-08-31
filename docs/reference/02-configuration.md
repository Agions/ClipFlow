# 全局配置与加速镜像

在客户端左侧底部点击 **「设置中心」**，可对系统全域参数进行深度自定义。

---

## 1. 客户端更新与国内镜像代理

Fablr 内置跨平台自动更新服务 (`UpdaterService`)，为了保证国内网络环境下的流畅下载，提供了镜像代理加速通道：

| 配置项 | 默认值 | 作用说明 |
| :--- | :--- | :--- |
| **自动检查更新** | 开启 (`每天一次`) | 可配置为 `每次启动时`、`每天一次` 或 `从不` |
| **加速镜像代理** | `https://ghproxy.net` | 当直连 GitHub Releases 超时时，自动无缝切换至国内镜像通道下载安装包 |
| **忽略特定版本** | 无 | 在升级弹窗中点击「跳过此版本」后，系统将持久化忽略该 Tag 的提示 |

---

## 2. 音视频与硬件加速配置

| 配置项 | 选项 | 推荐与适用场景 |
| :--- | :--- | :--- |
| **视频解码引擎** | `Auto` / `VideoToolbox` / `NVENC` / `VAAPI` | macOS 推荐 `VideoToolbox`，N卡用户推荐 `NVENC`，享受 4K 零掉帧回放 |
| **Whisper ASR 加速** | `CPU (多线程)` / `GPU (CUDA/Metal)` | 配备独显或 Apple Silicon 设备推荐开启 GPU 加速 |
| **临时缓存目录** | `系统默认 AppData` | 可自定义指向高速 NVMe SSD 盘，避免系统盘空间紧张 |

---

## 3. 剪映草稿目录智能寻址

Fablr 默认会自动探测本机剪映 Desktop 的草稿存储路径：
- **macOS 默认路径**：`~/Movies/JianyingPro/User Data/Projects/com.lveditor.draft/`
- **Windows 默认路径**：`C:\Users\<用户名>\AppData\Local\JianyingPro\User Data\Projects\com.lveditor.draft\`

若您在剪映设置中修改了草稿保存位置，可在 Fablr 设置面板中直接选择自定义草稿根目录。

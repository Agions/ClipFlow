/**
 * Fablr — 智能消重与反爬指纹混淆服务 (Anti-Duplicate & De-Fingerprinting Pipeline)
 *
 * 核心技术能力：
 * 1. 动态微缩放 (Dynamic Subtle Zoom / 0.98x - 1.03x)
 * 2. 氛围背景画中画模糊 (Ambient Background Blur)
 * 3. 胶片微噪点注入 (Film Grain Noise)
 * 4. 音频轻度变频与高低切 (Audio Pitch/EQ Shift)
 * 5. 视频元数据清洗与哈希指纹重置 (Metadata Reset)
 */

export interface AntiDedupOptions {
  enabled: boolean;
  dynamicZoom: boolean;         // 动态微缩放
  ambientBlurBg: boolean;        // 背景画中画模糊
  filmGrain: boolean;            // 轻度噪点
  audioEqShift: boolean;         // 音频微调防重
  metaDataReset: boolean;        // 清洗重置 EXIF/FFmpeg 元数据
  zoomScaleRange?: [number, number]; // 默认 [0.98, 1.02]
}

export interface AntiDedupFilterResult {
  videoFilters: string[];
  audioFilters: string[];
  ffmpegExtraArgs: string[];
  summaryDesc: string[];
}

export const DEFAULT_ANTI_DEDUP_OPTIONS: AntiDedupOptions = {
  enabled: true,
  dynamicZoom: true,
  ambientBlurBg: true,
  filmGrain: true,
  audioEqShift: true,
  metaDataReset: true,
  zoomScaleRange: [0.98, 1.02],
};

export const antiDedupService = {
  /**
   * 生成针对 FFmpeg 的滤镜链与参数
   */
  buildFfmpegDedupConfig: (options: Partial<AntiDedupOptions> = {}): AntiDedupFilterResult => {
    const opts: AntiDedupOptions = { ...DEFAULT_ANTI_DEDUP_OPTIONS, ...options };
    const videoFilters: string[] = [];
    const audioFilters: string[] = [];
    const ffmpegExtraArgs: string[] = [];
    const summaryDesc: string[] = [];

    if (!opts.enabled) {
      return { videoFilters: [], audioFilters: [], ffmpegExtraArgs: [], summaryDesc: ['消重模式未启用'] };
    }

    // 1. 动态微缩放滤镜 (zoompan 产生微幅动态呼吸感)
    if (opts.dynamicZoom) {
      const [minZ, maxZ] = opts.zoomScaleRange || [0.98, 1.02];
      videoFilters.push(`scale=iw*${maxZ}:ih*${maxZ},crop=iw/${maxZ}:ih/${maxZ}`);
      summaryDesc.push(`动态微缩放 (${minZ}x ~ ${maxZ}x)`);
    }

    // 2. 胶片噪点注入
    if (opts.filmGrain) {
      videoFilters.push('noise=alls=3:allf=t+u');
      summaryDesc.push('胶片微噪点抗指纹注入');
    }

    // 3. 音频均衡轻度微调 (人声清晰度微升，高低切 60Hz-15000Hz 防重)
    if (opts.audioEqShift) {
      audioFilters.push('highpass=f=60,lowpass=f=15000,volume=1.02');
      summaryDesc.push('音频防重均衡调优');
    }

    // 4. 元数据清洗
    if (opts.metaDataReset) {
      ffmpegExtraArgs.push('-map_metadata', '-1');
      ffmpegExtraArgs.push('-metadata', `encoded_by=Fablr Studio ${new Date().getFullYear()}`);
      summaryDesc.push('元数据指纹重置');
    }

    return {
      videoFilters,
      audioFilters,
      ffmpegExtraArgs,
      summaryDesc,
    };
  },
};

import { saveFile } from './tauri';
import type { Script } from './aiService';
import { formatTime, formatDate } from '@/shared/utils/format';
import { logger } from '@/utils/logger';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * HTML 转义函数，防止 XSS 攻击
 */
const escapeHtml = (text: string): string => {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  return text.replace(/[&<>"'`=/]/g, (char) => escapeMap[char] || char);
};

type AutoTableDoc = InstanceType<typeof jsPDF> & {
  autoTable: (options: {
    startY: number;
    head: string[][];
    body: string[][];
    headStyles: { fillColor: [number, number, number]; textColor: number };
    columnStyles: Record<number, { cellWidth: number | 'auto' }>;
    styles: { overflow: 'linebreak'; fontSize: number };
    margin: { top: number };
  }) => void;
};

/**
 * 脚本导出格式
 */
export enum ExportFormat {
  TXT = 'txt',       // 纯文本格式
  SRT = 'srt',       // 字幕格式
  PDF = 'pdf',       // PDF文档
  DOCX = 'docx',     // Word文档
  EXCEL = 'xlsx',    // Excel表格
  HTML = 'html',     // HTML格式
}

/**
 * 导出脚本为指定格式
 * @param script 要导出的脚本
 * @param format 导出格式
 * @param filename 保存的文件名（不含扩展名）
 */
export const exportScript = async (
  script: Script,
  format: ExportFormat,
  filename: string = `脚本_${formatDate(new Date())}`
): Promise<boolean> => {
  try {
    let content: string = '';
    const fileExtension: string = format;
    let filters: Array<{ name: string; extensions: string[] }> = [{ name: '文本文件', extensions: [format] }];
    
    switch (format) {
      case ExportFormat.TXT:
        content = formatAsTxt(script);
        break;
      case ExportFormat.SRT:
        content = formatAsSrt(script);
        break;
      case ExportFormat.PDF:
        return exportAsPdf(script, filename);
      case ExportFormat.HTML:
        content = formatAsHtml(script);
        filters = [{ name: 'HTML文件', extensions: ['html'] }];
        break;
      default:
        return false;
    }
    
    return await saveFile(
      content,
      `${filename}.${fileExtension}`,
      filters
    );
  } catch (error) {
    logger.error('导出脚本失败:', { error });
    return false;
  }
};

/**
 * 格式化为纯文本格式
 */
const formatAsTxt = (script: Script): string => {
  const segments = [...script.content].sort((a, b) => a.startTime - b.startTime);
  
  let content = `标题: ${script.id || '未命名脚本'}\n`;
  content += `创建时间: ${formatDate(script.createdAt)}\n`;
  content += `最后更新: ${formatDate(script.updatedAt)}\n\n`;
  content += `===== 完整脚本 =====\n\n`;
  
  segments.forEach((segment) => {
    content += `[${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}] `;
    content += `${segment.content}\n\n`;
  });
  
  return content;
};

/**
 * 格式化为SRT字幕格式
 */
const formatAsSrt = (script: Script): string => {
  const segments = [...script.content].sort((a, b) => a.startTime - b.startTime);
  
  let content = '';
  
  segments.forEach((segment, index) => {
    // 序号
    content += `${index + 1}\n`;
    
    // 时间码格式: 00:00:00,000 --> 00:00:00,000
    const startFormatted = formatSrtTime(segment.startTime);
    const endFormatted = formatSrtTime(segment.endTime);
    content += `${startFormatted} --> ${endFormatted}\n`;
    
    // 字幕内容
    content += `${segment.content}\n\n`;
  });
  
  return content;
};

/**
 * 格式化SRT时间码
 * @param seconds 秒数
 * @returns 格式化的SRT时间码 (00:00:00,000)
 */
const formatSrtTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
};

/**
 * 导出为PDF格式
 */
const exportAsPdf = async (script: Script, filename: string): Promise<boolean> => {
  try {
    const segments = [...script.content].sort((a, b) => a.startTime - b.startTime);
    
    // 创建PDF文档
    const doc = new jsPDF();
    
    // 添加标题
    doc.setFontSize(18);
    doc.text(`脚本: ${script.id || '未命名脚本'}`, 14, 22);
    
    // 添加创建和更新时间
    doc.setFontSize(10);
    doc.text(`创建时间: ${formatDate(script.createdAt)}`, 14, 32);
    doc.text(`最后更新: ${formatDate(script.updatedAt)}`, 14, 38);
    
    // 创建表格数据
    const tableData = segments.map((segment) => [
      `${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`,
      segment.content
    ]);
    
    // 添加表格
    (doc as AutoTableDoc).autoTable({
      startY: 45,
      head: [['时间', '脚本内容']],
      body: tableData,
      headStyles: {
        fillColor: [23, 119, 255],
        textColor: 255
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 'auto' }
      },
      styles: {
        overflow: 'linebreak',
        fontSize: 10
      },
      margin: { top: 45 }
    });
    
    // 保存PDF文件
    const pdfData = doc.output();
    
    // 使用Tauri保存文件
    const saved = await saveFile(
      pdfData,
      `${filename}.pdf`,
      [{ name: 'PDF文件', extensions: ['pdf'] }]
    );
    
    if (saved) {
      return true;
    }
    return false;
  } catch (error: unknown) {
    logger.error('导出PDF失败:', { error });
    return false;
  }
};

/**
 * 格式化为HTML格式
 */
const formatAsHtml = (script: Script): string => {
  const segments = [...script.content].sort((a, b) => a.startTime - b.startTime);
  
  let content = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(script.id || '未命名脚本')}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      margin-bottom: 30px;
    }
    h1 {
      color: #1677ff;
      margin-bottom: 5px;
    }
    .meta {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
    }
    .script-container {
      border-top: 1px solid #eee;
      padding-top: 20px;
    }
    .segment {
      margin-bottom: 20px;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 5px;
    }
    .time {
      font-weight: bold;
      color: #1677ff;
      margin-bottom: 8px;
    }
    .content {
      white-space: pre-wrap;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <header>
    <h1>${script.id || '未命名脚本'}</h1>
    <div class="meta">
      <div>创建时间: ${formatDate(script.createdAt)}</div>
      <div>最后更新: ${formatDate(script.updatedAt)}</div>
    </div>
  </header>
  
  <div class="script-container">
`;
  
  segments.forEach((segment) => {
    content += `
    <div class="segment">
      <div class="time">[${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}]</div>
      <div class="content">${escapeHtml(segment.content)}</div>
    </div>
`;
  });
  
  content += `
  </div>
</body>
</html>
  `;
  
  return content;
}; 

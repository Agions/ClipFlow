import { Script, ScriptSegment } from '@/types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// 声明扩展模块，解决TypeScript类型问题
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: {
      startY?: number;
      head: string[][];
      body: string[][];
      headStyles?: { fillColor?: [number, number, number] };
      styles?: { overflow?: 'linebreak' | 'ellipsize' | 'hidden' | 'visible'; cellWidth?: 'auto' | 'wrap' | number };
      columnStyles?: Record<number, { cellWidth?: 'auto' | 'wrap' | number }>;
    }) => jsPDF;
  }
}

/**
 * 将脚本导出为PDF文件
 * @param script 要导出的脚本
 * @param projectName 项目名称
 */
export const exportScriptToPDF = (script: Script, projectName: string) => {
  // 创建新的PDF文档，使用A4尺寸
  const doc = new jsPDF();
  
  // 设置PDF文档信息
  const title = `${projectName} - 解说脚本`;
  doc.setProperties({
    title,
    author: 'CutDeck',
    creator: 'CutDeck Script Generator',
    subject: '视频解说脚本',
  });
  
  // 添加标题
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  
  // 添加创建时间
  doc.setFontSize(10);
  doc.text(`创建时间: ${new Date(script.createdAt).toLocaleString()}`, 14, 30);
  doc.text(`最后更新: ${new Date(script.updatedAt).toLocaleString()}`, 14, 35);
  
  // 计算总时长
  const totalDuration = script.content.reduce(
    (acc: number, segment: ScriptSegment) => acc + (segment.endTime - segment.startTime),
    0
  );
  doc.text(`总时长: ${Math.floor(totalDuration / 60)}分${totalDuration % 60}秒`, 14, 40);
  doc.text(`段落数: ${script.content.length}`, 14, 45);
  
  // 格式化时间函数
  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };
  
  // 准备表格数据
  const tableData = script.content.map((segment) => [
    `${formatTime(segment.startTime)} - ${formatTime(segment.endTime)}`,
    segment.type === 'narration' ? '旁白' : 
    segment.type === 'dialogue' ? '对话' : '描述',
    segment.content,
  ]);
  
  // 使用autoTable插件创建表格
  doc.autoTable({
    startY: 50,
    head: [['时间', '类型', '内容']],
    body: tableData,
    headStyles: { fillColor: [24, 144, 255] },
    styles: { overflow: 'linebreak', cellWidth: 'auto' },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 25 },
      2: { cellWidth: 'auto' },
    },
  });
  
  // 添加页脚
  const pageCount = ((doc as jsPDF & { internal: { pages: unknown[] } }).internal.pages?.length || 1) - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.text(
      `CutDeck - 第 ${i} 页，共 ${pageCount} 页`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
  
  // 保存PDF文件
  const filename = `${projectName.replace(/[^\w\s]/gi, '')}_脚本_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  
  return filename;
}; 

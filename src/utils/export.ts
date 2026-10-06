import { saveAs } from 'file-saver';
import type { DashboardSummary } from '@/types';

const FILE_PREFIX = '看板';

// 通用：html2canvas 截取 DOM 节点为 canvas，失败时回退到 Blob 兜底提示
// P2-3：html2canvas/jspdf/xlsx 都是重量级依赖（每个几十上百 KB gzip），
// 一律函数内 dynamic import——只在用户真正点"导出"时才按需下载，不进首屏/页面初始 chunk。
async function capture(element: HTMLElement) {
  const { default: html2canvas } = await import('html2canvas');
  return html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2, // 2 倍缩放保证清晰
    useCORS: true,
    logging: false,
  });
}

/** 导出当前看板为 PNG 图片 */
export async function exportDashboardPng(element: HTMLElement) {
  const canvas = await capture(element);
  canvas.toBlob((blob) => {
    if (blob) saveAs(blob, `${FILE_PREFIX}.png`);
    else console.warn('PNG 导出失败：toBlob 返回空');
  }, 'image/png');
}

/** 导出当前看板为 PDF（按 A4 尺寸分页） */
export async function exportDashboardPdf(element: HTMLElement) {
  const { jsPDF } = await import('jspdf');
  const canvas = await capture(element);
  const pdf = new jsPDF('p', 'pt', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  // 按比例把长图铺到 A4，超出部分分页
  const ratio = pageWidth / canvasWidth;
  const scaledHeight = canvasHeight * ratio;
  const imgData = canvas.toDataURL('image/png');
  let heightLeft = scaledHeight;
  let position = 0;
  pdf.addImage(imgData, 'PNG', 0, position, pageWidth, scaledHeight);
  heightLeft -= pageHeight;
  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    // 负偏移实现连续分页
    pdf.addImage(imgData, 'PNG', 0, position, pageWidth, scaledHeight);
    heightLeft -= pageHeight;
  }
  pdf.save(`${FILE_PREFIX}.pdf`);
}

/** 导出看板数据为 Excel（每块数据一个 sheet）；xlsx 按需加载 */
export async function exportDashboardExcel(data: DashboardSummary) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const addSheet = (name: string, rows: Record<string, unknown>[]) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  addSheet(
    '关键指标',
    data.kpis.map((k) => ({ 指标: k.title, 数值: k.value, 单位: k.unit, 较上月: `${k.trend}%` })),
  );
  addSheet(
    '员工趋势',
    data.trend.map((d) => ({ 月份: d.date, 员工数: d.value })),
  );
  addSheet(
    '部门分布',
    data.deptDist.map((d) => ({ 部门: d.name, 人数: d.value })),
  );
  addSheet(
    '职位分布',
    data.positionDist.map((p) => ({ 职位: p.name, 人数: p.value })),
  );
  addSheet(
    '能力雷达',
    data.radar.map((r) => ({ 能力项: r.name, 得分: r.value })),
  );
  addSheet(
    '部门绩效排行',
    data.rank.map((r) => ({ 部门: r.name, 绩效: r.value })),
  );

  XLSX.writeFile(wb, `${FILE_PREFIX}.xlsx`);
}

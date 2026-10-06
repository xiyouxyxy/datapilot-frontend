import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, RadarChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  RadarComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ECharts, ComposeOption } from 'echarts/core';
import type {
  BarSeriesOption,
  LineSeriesOption,
  PieSeriesOption,
  RadarSeriesOption,
} from 'echarts/charts';
import type {
  GridComponentOption,
  LegendComponentOption,
  RadarComponentOption,
  TooltipComponentOption,
} from 'echarts/components';
import { Spin, Empty } from 'antd';
import { useAppStore } from '@/store/app';

export type ECOption = ComposeOption<
  | LineSeriesOption
  | BarSeriesOption
  | PieSeriesOption
  | RadarSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | TooltipComponentOption
  | RadarComponentOption
>;
// 按需注册
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  RadarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  RadarComponent,
  CanvasRenderer,
]);

export interface BiChartClickParams {
  name: string;
  value: string | number;
  seriesType?: string;
  dataIndex?: number;
}

interface BiChartProps {
  option: ECOption;
  height?: number | string;
  loading?: boolean;
  /** 图表点击回调（用于联动），参数为被点击的数据项 */
  onClick?: (params: BiChartClickParams) => void;
}

// 判断 series 是否携带真实数据（radar 的 data 是嵌套对象，需单独取值判定）
function seriesHasData(s: unknown): boolean {
  const data = (s as { data?: unknown }).data;
  if (Array.isArray(data)) {
    if (data.length === 0) return false;
    // 需看 value 是否非空：radar 系列 value 是数组（空数组=无数据），
    // 普通 { value: number } 系列（bar/pie 显式 value）应视为有数据。
    const first = data[0] as { value?: unknown } | undefined;
    if (first && typeof first === 'object' && 'value' in (first as object)) {
      return !(Array.isArray(first.value) && first.value.length === 0);
    }
    return true;
  }
  return Boolean(data);
}

// biChart 薄封装：收敛 echarts 实例生命周期与通用能力（loading/空数据/resize/暗色）。
export default function BiChart({ option, height = 320, loading = false, onClick }: BiChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | undefined>(undefined);
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick; // 每次渲染同步最新回调，不重复绑定/解绑
  const theme = useAppStore((s) => s.theme);

  // 是否有真实数据：任一 series 有数据即可渲染（radar 也不例外）
  const hasData = Array.isArray(option.series) && option.series.some(seriesHasData);

  // 图表生命周期：仅当「有数据且非 loading」时创建实例；条件任一不满足即销毁并留空。
  // 容器元素始终渲染，避免空数据/加载期挂载无效实例（radar 空 value 会抛错）。
  useEffect(() => {
    // 无条件先销毁旧实例，保证 state 翻转（有→无/loading态）时不留残留
    const prev = chartRef.current;
    chartRef.current = undefined;
    prev?.dispose();
    // 仅在有数据且非 loading 时创建新实例
    if (!ref.current || loading || !hasData) return;
    const container = ref.current;
    const chart = echarts.init(container, theme === 'dark' ? 'dark' : undefined);
    chartRef.current = chart;
    chart.setOption(option, true);
    // 图表点击（联动入口）：把 echarts 事件参数规整成业务友好结构回调出去
    const handler = (p: echarts.ECElementEvent) => {
      onClickRef.current?.({
        name: String(p.name ?? ''),
        value: (p.value as string | number) ?? '',
        seriesType: p.seriesType,
        dataIndex: p.dataIndex,
      });
    };
    chart.on('click', handler);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(container);
    return () => {
      observer.disconnect();
      chart.off('click', handler);
      chart.dispose();
      if (chartRef.current === chart) chartRef.current = undefined;
    };
    // 依赖 loading 与 hasData：数据到位后重新建图，加载中/空数据时销毁。
    // 刻意不含 option：option 的增量更新由下方独立 effect 处理，若在此加入 option
    // 会导致每次数据变化都销毁重建 echarts 实例（性能劣化）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, loading, hasData]);

  // option 变化：有实例则增量更新
  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  const showEmpty = !loading && Array.isArray(option.series) && !hasData;

  return (
    <div style={{ position: 'relative', height }}>
      <Spin spinning={loading}>
        {showEmpty ? (
          <Empty description="暂无数据" style={{ marginTop: 60 }} />
        ) : (
          <div ref={ref} style={{ width: '100%', height }} aria-label="数据图表" />
        )}
      </Spin>
    </div>
  );
}

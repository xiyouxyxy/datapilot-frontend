import { useEffect, useMemo, useRef, useState } from 'react';
import { App, Row, Col, Statistic, Tag, Button, Space, Tooltip, Dropdown } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ReloadOutlined,
  DownloadOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import BiChart from '@/pages/components/BiChart';
import type { ECOption } from '@/pages/components/BiChart';
import DashboardCard from '@/pages/components/DashboardCard';
import * as dashboardService from '@/services/dashboard';
import { storage } from '@/utils/storage';
import { exportDashboardPng, exportDashboardPdf, exportDashboardExcel } from '@/utils/export';
import { STORAGE_KEYS } from '@/constants';
import type { DashboardSummary } from '@/types';

// 看板卡片 key 字面量联合：卡片本身在下方按 key 硬编码渲染，这里只用于类型与持久化约束
type CardKey = 'kpi' | 'trend' | 'dept' | 'position' | 'radar' | 'rank';

const DEFAULT_HIDDEN: CardKey[] = [];

function loadHidden(): CardKey[] {
  const saved = storage.get<CardKey[]>(STORAGE_KEYS.DASHBOARD);
  return Array.isArray(saved) ? saved : DEFAULT_HIDDEN;
}

interface KpiValue {
  title: string;
  value: number;
  unit: string;
  trend: number;
}

function KpiCard({ title, value, unit, trend }: KpiValue) {
  return (
    <div>
      <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)' }}>{title}</div>
      <Statistic
        value={value}
        suffix={unit}
        styles={{ content: { fontSize: 22, fontWeight: 600 } }}
      />
      <Tag
        color={trend >= 0 ? 'green' : 'red'}
        icon={trend >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        style={{ marginTop: 4 }}
      >
        {trend >= 0 ? '+' : ''}
        {trend}% 较上月
      </Tag>
    </div>
  );
}

export default function DashboardPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dept, setDept] = useState<string | undefined>(undefined);
  const [hiddenCards, setHiddenCards] = useState<CardKey[]>(loadHidden);

  // 数据加载：随筛选部门变化重新请求，实现图表联动
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setData(await dashboardService.summary(dept));
      } finally {
        setLoading(false);
      }
    })();
  }, [dept]);

  // 布局持久化：隐藏列表变化即写 localStorage
  useEffect(() => {
    storage.set(STORAGE_KEYS.DASHBOARD, hiddenCards);
  }, [hiddenCards]);

  const toggleCard = (key: CardKey) => {
    setHiddenCards((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const restoreDefault = () => setHiddenCards([]);

  // 卡片操作按钮：隐藏当前卡（全局「恢复默认布局」在顶部）
  const cardExtra = (key: CardKey) => (
    <Tooltip title="隐藏此卡片">
      <Button size="small" icon={<EyeInvisibleOutlined />} onClick={() => toggleCard(key)} />
    </Tooltip>
  );

  const trendOption = useMemo<ECOption>(
    () => ({
      tooltip: { trigger: 'axis' },
      grid: { left: 12, right: 20, bottom: 8, top: 30, containLabel: true },
      xAxis: { type: 'category', data: data?.trend.map((d) => d.date) ?? [] },
      yAxis: { type: 'value' },
      series: [
        {
          name: '员工数',
          type: 'line',
          smooth: true,
          data: data?.trend.map((d) => d.value) ?? [],
          areaStyle: { opacity: 0.15 },
        },
      ],
    }),
    [data],
  );

  // 部门柱颜色：选中部门用品牌绿，否则亮蓝
  const deptBarColor = (index: number) => {
    if (!dept) return '#1677ff';
    const pair = data?.deptDist[index];
    return pair && pair.name === dept ? '#52c41a' : '#91caff';
  };

  const deptOption = useMemo<ECOption>(
    () => ({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, bottom: 8, top: 30 },
      xAxis: { type: 'category', data: data?.deptDist.map((d) => d.name) ?? [] },
      yAxis: { type: 'value' },
      series: [
        {
          name: '人数',
          type: 'bar',
          barMaxWidth: 32,
          // 当前选中部门高亮为绿色，其余默认蓝（color 支持回调按 index 着色）
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
          },
          data: (data?.deptDist ?? []).map((d, i) => ({
            value: d.value,
            itemStyle: { color: deptBarColor(i) },
          })),
        },
      ],
    }),
    // deptBarColor 是每次 render 重建的纯函数，其依赖即 data 与 dept，二者已在数组内；
    // 若把 deptBarColor 本身加入依赖会导致 useMemo 每次 render 都失效（恒不缓存）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, dept],
  );

  // 点击部门柱 → 切换联动筛选
  const handleDeptClick = (name: string) => {
    if (!dept || dept !== name) {
      setDept(name);
      message.success(`已筛选部门：${name}`);
    } else {
      setDept(undefined);
      message.success('已清除部门筛选');
    }
  };

  const positionOption = useMemo<ECOption>(
    () => ({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0 },
      series: [
        {
          name: '职位分布',
          type: 'pie',
          radius: ['40%', '68%'],
          center: ['50%', '44%'],
          label: { show: false },
          data: (data?.positionDist ?? []).map((p) => ({ name: p.name, value: p.value })),
        },
      ],
    }),
    [data],
  );

  const radarOption = useMemo<ECOption>(
    () => ({
      tooltip: {},
      radar: {
        indicator: (data?.radar ?? []).map((r) => ({ name: r.name, max: 100 })),
        radius: '62%',
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: (data?.radar ?? []).map((r) => r.value),
              name: '能力',
              areaStyle: { opacity: 0.2 },
            },
          ],
        },
      ],
    }),
    [data],
  );

  const rankOption = useMemo<ECOption>(
    () => ({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 48, right: 20, bottom: 8, top: 10, containLabel: true },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', inverse: true, data: data?.rank.map((r) => r.name) ?? [] },
      series: [
        {
          name: '绩效',
          type: 'bar',
          barMaxWidth: 20,
          itemStyle: { color: '#52c41a', borderRadius: [0, 4, 4, 0] },
          data: data?.rank.map((r) => r.value) ?? [],
        },
      ],
    }),
    [data],
  );

  const isHidden = (key: CardKey) => hiddenCards.includes(key);

  // 导出：html2canvas 需要截取真实 DOM，故给可导出内容挂 ref
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false); // 是否正在导出

  const handleExport = async (kind: 'png' | 'pdf' | 'excel') => {
    if (!exportRef.current) return;
    if (kind === 'excel') {
      if (!data) return;
      exportDashboardExcel(data);
      message.success('Excel 已导出');
      return;
    }
    setExporting(true);
    try {
      if (kind === 'png') {
        await exportDashboardPng(exportRef.current);
        message.success('PNG 已导出');
      } else {
        await exportDashboardPdf(exportRef.current);
        message.success('PDF 已导出');
      }
    } catch (e) {
      console.error('导出失败', e);
      message.error('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const exportMenuItems = [
    { key: 'png', label: '导出 PNG', icon: <FileImageOutlined /> },
    { key: 'pdf', label: '导出 PDF', icon: <FilePdfOutlined /> },
    { key: 'excel', label: '导出 Excel', icon: <FileExcelOutlined /> },
  ];

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={18}>
          <Space wrap>
            {dept && (
              <Tag
                color="green"
                closable
                onClose={() => setDept(undefined)}
                style={{ fontSize: 14 }}
              >
                当前筛选：{dept}
              </Tag>
            )}
            <Button
              size="small"
              icon={<ReloadOutlined />}
              data-track="dashboard:reset"
              onClick={() => setDept(undefined)}
              disabled={exporting}
            >
              重置筛选
            </Button>
            <Button
              size="small"
              icon={<EyeOutlined />}
              data-track="dashboard:restore"
              onClick={restoreDefault}
              disabled={exporting}
            >
              恢复默认布局
            </Button>
            <Dropdown
              menu={{
                items: exportMenuItems,
                onClick: ({ key }) => void handleExport(key as 'png' | 'pdf' | 'excel'),
              }}
            >
              <Button
                type="primary"
                size="small"
                icon={<DownloadOutlined />}
                data-track="dashboard:export"
                loading={exporting}
              >
                导出看板
              </Button>
            </Dropdown>
          </Space>
        </Col>
      </Row>

      <div ref={exportRef}>
        <Row gutter={[16, 16]}>
          {!isHidden('kpi') && (
            <Col xs={24} data-track-expose="dashboard:kpi">
              <DashboardCard title="关键指标" height={132} extra={cardExtra('kpi')}>
                <Row gutter={[16, 0]}>
                  {data?.kpis.map((k) => (
                    <Col xs={12} sm={6} key={k.title}>
                      <KpiCard title={k.title} value={k.value} unit={k.unit} trend={k.trend} />
                    </Col>
                  ))}
                </Row>
              </DashboardCard>
            </Col>
          )}

          {!isHidden('trend') && (
            <Col xs={24} lg={14} data-track-expose="dashboard:trend">
              <DashboardCard title="员工人数趋势" extra={cardExtra('trend')}>
                <BiChart option={trendOption} loading={loading} />
              </DashboardCard>
            </Col>
          )}
          {!isHidden('dept') && (
            <Col xs={24} lg={10} data-track-expose="dashboard:dept">
              <DashboardCard title="部门分布" extra={cardExtra('dept')}>
                <BiChart
                  option={deptOption}
                  loading={loading}
                  onClick={(p) => handleDeptClick(p.name)}
                />
              </DashboardCard>
            </Col>
          )}
          {!isHidden('position') && (
            <Col xs={24} lg={10} data-track-expose="dashboard:position">
              <DashboardCard title="职位分布" extra={cardExtra('position')}>
                <BiChart option={positionOption} loading={loading} />
              </DashboardCard>
            </Col>
          )}
          {!isHidden('radar') && (
            <Col xs={24} lg={14} data-track-expose="dashboard:radar">
              <DashboardCard title="能力雷达" extra={cardExtra('radar')}>
                <BiChart option={radarOption} loading={loading} />
              </DashboardCard>
            </Col>
          )}
          {!isHidden('rank') && (
            <Col xs={24} data-track-expose="dashboard:rank">
              <DashboardCard title="部门绩效排行" extra={cardExtra('rank')}>
                <BiChart option={rankOption} loading={loading} />
              </DashboardCard>
            </Col>
          )}
        </Row>
      </div>
    </Space>
  );
}

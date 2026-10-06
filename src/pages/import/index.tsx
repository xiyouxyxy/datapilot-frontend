import { useMemo, useState } from 'react';
import {
  Card,
  Upload,
  Button,
  Table,
  Alert,
  Space,
  Tag,
  Typography,
  App,
  Flex,
  Progress,
} from 'antd';
import { InboxOutlined, DownloadOutlined, CheckOutlined } from '@ant-design/icons';
import {
  parseEmployeeExcel,
  parseEmployeeCsv,
  downloadImportTemplate,
  downloadImportCsvTemplate,
  type ImportEmployeeRow,
  type ParseOutcome,
} from '@/utils/excelParser';
import { importMany } from '@/services/employee';
import type { ColumnsType } from 'antd/es/table';

type ImportState =
  | { phase: 'idle' }
  | { phase: 'parsing' }
  | { phase: 'parsed'; outcome: ParseOutcome }
  | { phase: 'importing' }
  | { phase: 'done'; imported: number };

export default function ImportPage() {
  const { modal, message } = App.useApp();
  const [state, setState] = useState<ImportState>({ phase: 'idle' });
  const [progress, setProgress] = useState(0);

  const onFile = async (file: File) => {
    setState({ phase: 'parsing' });
    setProgress(0);
    try {
      // 按扩展名路由：xlsx/xls 走 excel Worker 骨架，csv 走文本 Worker 解析；进度回调驱动进度条
      const isCsv = /\.csv$/i.test(file.name);
      const parse = isCsv ? parseEmployeeCsv : parseEmployeeExcel;
      const outcome = await parse(file, (p) => setProgress(p));
      if (outcome.rows.length === 0 && outcome.errors.length === 0) {
        message.warning('文件中没有可导入的数据行');
        setState({ phase: 'idle' });
        setProgress(0);
        return;
      }
      setState({ phase: 'parsed', outcome });
    } catch (err) {
      message.error(`解析失败：${err instanceof Error ? err.message : '未知错误'}`);
      setState({ phase: 'idle' });
      setProgress(0);
    }
    return false; // 阻止 antd 默认上传动作（纯前端）
  };

  const doImport = async () => {
    if (state.phase !== 'parsed') return;
    const validRows = state.outcome.rows;
    if (validRows.length === 0) {
      message.error('没有可导入的有效行，请先修正错误');
      return;
    }
    modal.confirm({
      title: '确认导入',
      content: `将批量写入 ${validRows.length} 条员工（错误行会被跳过）。是否继续？`,
      okText: '导入',
      cancelText: '取消',
      onOk: async () => {
        setState({ phase: 'importing' });
        try {
          const rows = validRows.map(({ __row: _row, ...e }) => ({
            ...e,
            gender: e.gender,
            status: e.status,
          }));
          const res = await importMany(rows);
          setState({ phase: 'done', imported: res.imported ?? validRows.length });
        } catch {
          setState({ phase: 'parsed', outcome: state.outcome });
          message.error('导入失败，请重试');
        }
      },
    });
  };

  const columns = useMemo(() => buildColumns(), []);
  const parsed = state.phase === 'parsed' ? state.outcome : undefined;

  return (
    <Card title="员工数据导入（Excel / CSV）">
      {state.phase !== 'done' ? (
        <Flex vertical gap={16}>
          <Alert
            type="info"
            showIcon
            message="支持 .xlsx / .xls / .csv 文件，解析在 Web Worker 中完成（不上传服务器）；请先下载模板填写后导入。"
          />

          <Upload.Dragger
            accept=".xlsx,.xls,.csv"
            maxCount={1}
            showUploadList={false}
            beforeUpload={onFile}
            disabled={state.phase === 'parsing'}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              {state.phase === 'parsing' ? '正在解析…' : '点击或拖拽 Excel / CSV 文件到此上传'}
            </p>
            <p className="ant-upload-hint">
              支持 .xlsx / .xls / .csv，首次使用请先下载模板，避免列名或格式对不上。
            </p>
          </Upload.Dragger>

          {state.phase === 'parsing' && (
            <Flex vertical gap={4}>
              <Progress percent={progress} status={progress >= 100 ? 'success' : 'active'} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                正在 Web Worker 中解析文件，主线程不阻塞…
              </Typography.Text>
            </Flex>
          )}

          <Space>
            <Button icon={<DownloadOutlined />} onClick={downloadImportTemplate}>
              下载导入模板（Excel）
            </Button>
            <Button icon={<DownloadOutlined />} onClick={downloadImportCsvTemplate}>
              下载导入模板（CSV）
            </Button>
          </Space>

          {parsed && (
            <Card size="small" title="解析结果">
              {parsed.errors.length > 0 ? (
                <Alert
                  style={{ marginBottom: 12 }}
                  type="error"
                  showIcon
                  message={`发现 ${parsed.errors.length} 处错误，${parsed.rows.length} 条有效行可导入`}
                  description={
                    <ul style={{ paddingInlineStart: 18, margin: 0 }}>
                      {parsed.errors.slice(0, 8).map((er, i) => (
                        <li key={i}>
                          <Tag>第 {er.row} 行</Tag>
                          {er.field}: {er.message}
                        </li>
                      ))}
                      {parsed.errors.length > 8 && <li>… 共 {parsed.errors.length} 处</li>}
                    </ul>
                  }
                />
              ) : (
                <Alert
                  style={{ marginBottom: 12 }}
                  type="success"
                  showIcon
                  message={`共解析出 ${parsed.rows.length} 条有效数据，全部校验通过`}
                />
              )}

              <Table<ImportEmployeeRow>
                rowKey="__row"
                size="small"
                dataSource={parsed.rows}
                columns={columns}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                bordered
              />
            </Card>
          )}

          {state.phase === 'parsed' && parsed && (
            <Flex>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                disabled={parsed.rows.length === 0}
                onClick={doImport}
              >
                批量导入 {parsed.rows.length} 条有效数据
              </Button>
            </Flex>
          )}
        </Flex>
      ) : (
        <Alert
          type="success"
          icon={<CheckOutlined />}
          showIcon
          message={`导入完成：成功写入 ${state.imported} 条员工数据`}
          description={
            <Space style={{ marginTop: 8 }}>
              <Button type="primary" onClick={() => setState({ phase: 'idle' })}>
                继续导入
              </Button>
            </Space>
          }
        />
      )}
    </Card>
  );
}

function buildColumns(): ColumnsType<ImportEmployeeRow> {
  const base: { key: keyof ImportEmployeeRow; label: string }[] = [
    { key: '__row', label: '序号' },
    { key: 'name', label: '姓名' },
    { key: 'gender', label: '性别' },
    { key: 'dept', label: '部门' },
    { key: 'position', label: '岗位' },
    { key: 'salary', label: '薪资' },
    { key: 'phone', label: '电话' },
    { key: 'email', label: '邮箱' },
    { key: 'entryDate', label: '入职日期' },
    { key: 'status', label: '状态' },
    { key: 'idCard', label: '身份证号' },
  ];
  return base.map((c) => ({
    title: c.label,
    dataIndex: c.key,
    key: c.key,
    render: (v: unknown) =>
      v === undefined || v === null || v === '' ? (
        <Typography.Text type="danger">缺失</Typography.Text>
      ) : (
        (v as React.ReactNode)
      ),
  }));
}

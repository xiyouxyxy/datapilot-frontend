import { Button, Space, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import Authority from '@/components/Authority';
import Field from '@/components/Field';
import { PERM, FIELD } from '@/constants';
import type { Employee } from '@/types';

export type ColKey =
  'name' | 'dept' | 'position' | 'phone' | 'salary' | 'idCard' | 'status' | 'action';
export const ALL_COLUMN_KEYS: ColKey[] = [
  'name',
  'dept',
  'position',
  'phone',
  'salary',
  'idCard',
  'status',
  'action',
];

export interface ColOption {
  text: string;
  value: string;
}

// 多列筛选项（dept/position/status 的下拉选项，运行时从全量数据聚合）
export interface TableFilterOpts {
  dept: ColOption[];
  position: ColOption[];
  status: ColOption[];
}

// 当前生效的筛选条件（受控，用于列头 filteredValue 回填）
export interface ColumnFilters {
  dept?: string;
  position?: string;
  status?: string;
}

const COLUMN_WIDTHS: Record<ColKey, number> = {
  name: 100,
  dept: 110,
  position: 100,
  phone: 150,
  salary: 120,
  idCard: 190,
  status: 90,
  action: 170,
};

const COLUMN_TITLES: Record<ColKey, string> = {
  name: '姓名',
  dept: '部门',
  position: '职位',
  phone: '电话',
  salary: '薪资',
  idCard: '身份证',
  status: '状态',
  action: '操作',
};

export function keyToTitle(k: ColKey): string {
  return COLUMN_TITLES[k];
}

// 选择列必须显式定宽：否则 table-layout: fixed 下未设宽度的列会独吞全部剩余空间，被撑成超宽空列
export const SELECTION_COL_WIDTH = 48;

// 横向滚动宽度按当前可见列宽动态求和，避免隐藏某些列后出现留白/错位
export function calcTableScrollX(colKeys: ColKey[]): number {
  return colKeys.reduce((sum, k) => sum + COLUMN_WIDTHS[k], SELECTION_COL_WIDTH);
}

interface BuildColumnsOptions {
  colKeys: ColKey[];
  filterOpts: TableFilterOpts;
  filters: ColumnFilters;
  onEdit: (record: Employee) => void;
  onDelete: (record: Employee) => void;
}

// 列定义工厂：把列配置从组件里抽出，onEdit/onDelete 作为参数显式传入，消除过期闭包隐患。
// 列宽固定以维持虚拟滚动行高/列宽一致；filteredValue 受控，筛选项回填到列头。
export function buildColumns({
  colKeys,
  filterOpts,
  filters,
  onEdit,
  onDelete,
}: BuildColumnsOptions): ColumnsType<Employee> {
  const keyToCol = (k: ColKey): ColumnsType<Employee>[number] => {
    switch (k) {
      case 'name':
        return {
          key: 'name',
          title: '姓名',
          dataIndex: 'name',
          width: COLUMN_WIDTHS.name,
          ellipsis: true,
        };
      case 'dept':
        return {
          key: 'dept',
          title: '部门',
          dataIndex: 'dept',
          width: COLUMN_WIDTHS.dept,
          ellipsis: true,
          filters: filterOpts.dept,
          filteredValue: filters.dept ? [filters.dept] : null,
        };
      case 'position':
        return {
          key: 'position',
          title: '职位',
          dataIndex: 'position',
          width: COLUMN_WIDTHS.position,
          ellipsis: true,
          filters: filterOpts.position,
          filteredValue: filters.position ? [filters.position] : null,
        };
      case 'phone':
        return {
          key: 'phone',
          title: '电话',
          dataIndex: 'phone',
          width: COLUMN_WIDTHS.phone,
          ellipsis: true,
        };
      case 'salary':
        return {
          key: 'salary',
          title: '薪资',
          dataIndex: 'salary',
          width: COLUMN_WIDTHS.salary,
          ellipsis: true,
          render: (v: number) => <Field code={FIELD.SALARY}>¥{v}</Field>,
        };
      case 'idCard':
        return {
          key: 'idCard',
          title: '身份证',
          dataIndex: 'idCard',
          width: COLUMN_WIDTHS.idCard,
          ellipsis: true,
          render: (v: string) => <Field code={FIELD.IDCARD}>{v}</Field>,
        };
      case 'status':
        return {
          key: 'status',
          title: '状态',
          dataIndex: 'status',
          width: COLUMN_WIDTHS.status,
          filters: filterOpts.status,
          filteredValue: filters.status ? [filters.status] : null,
          render: (s: Employee['status']) => <Tag>{s}</Tag>,
        };
      case 'action':
        return {
          key: 'action',
          title: '操作',
          width: COLUMN_WIDTHS.action,
          render: (_: unknown, record: Employee) => (
            <Space size={0}>
              <Authority code={PERM.EMP_EDIT}>
                <Button type="link" onClick={() => onEdit(record)}>
                  编辑
                </Button>
              </Authority>
              <Authority code={PERM.EMP_DELETE}>
                <Button type="link" danger onClick={() => onDelete(record)}>
                  删除
                </Button>
              </Authority>
            </Space>
          ),
        };
    }
  };
  return ALL_COLUMN_KEYS.filter((k) => colKeys.includes(k)).map(keyToCol);
}

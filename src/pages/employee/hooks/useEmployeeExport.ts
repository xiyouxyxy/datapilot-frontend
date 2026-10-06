import { useCallback } from 'react';
import { App } from 'antd';
import { useUserStore } from '@/store/user';
import { PERM } from '@/constants';
import type { Employee } from '@/types';
import { downloadEmployeeCsv } from '@/utils/employeeCsv';

// 导出交互层：权限前置判断 + 确定导出行（选中优先，否则全量）+ 调纯函数下载 + 结果提示。
// 脱敏判定收敛到 buildEmployeeCsv 内部（走 desensitize 的 hasField 规则），不再散落布尔。
export function useEmployeeExport({
  data,
  selectedRows,
}: {
  data: Employee[];
  selectedRows: Employee[];
}) {
  const { message } = App.useApp();
  const hasButton = useUserStore((s) => s.hasButton);
  const fields = useUserStore((s) => s.permissions.fields);

  const handleExport = useCallback(() => {
    if (!hasButton(PERM.EMP_EXPORT)) {
      message.warning('你没有导出权限');
      return;
    }
    const rows = selectedRows.length ? selectedRows : data;
    if (rows.length === 0) {
      message.warning('没有可导出的数据');
      return;
    }
    downloadEmployeeCsv(rows, fields);
    message.success(`已导出 ${rows.length} 条员工数据`);
  }, [hasButton, fields, message, data, selectedRows]);

  return { handleExport };
}

// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Authority from '../index';
import { useUserStore } from '@/store/user';

// 每个用例前重置权限，避免跨用例污染
function setButtons(buttons: string[]) {
  useUserStore.setState({ permissions: { menus: [], buttons, fields: [] } });
}

function queryExportBtn() {
  return screen.queryByRole('button', { name: '导出' });
}

describe('<Authority> 按钮级权限组件', () => {
  beforeEach(() => setButtons([]));

  it('有权限时渲染 children', () => {
    setButtons(['employee.export']);
    render(
      <Authority code="employee.export">
        <button>导出</button>
      </Authority>,
    );
    expect(queryExportBtn()).not.toBeNull();
  });

  it('无权限时不渲染 children', () => {
    setButtons(['employee.delete']);
    render(
      <Authority code="employee.export">
        <button>导出</button>
      </Authority>,
    );
    expect(queryExportBtn()).toBeNull();
  });

  it('通配 * 对任意 code 放行', () => {
    setButtons(['*']);
    render(
      <Authority code="whatever.action">
        <span>全功能</span>
      </Authority>,
    );
    expect(screen.getByText('全功能')).toBeTruthy();
  });

  it('无权限时渲染 fallback 替换内容', () => {
    setButtons([]);
    render(
      <Authority code="employee.export" fallback={<span>无权限</span>}>
        <button>导出</button>
      </Authority>,
    );
    expect(screen.getByText('无权限')).toBeTruthy();
    expect(queryExportBtn()).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import { hasButton, hasField, hasMenu } from '../permission';

describe('权限判定纯函数', () => {
  describe('hasButton', () => {
    it('无权限码时拒绝', () => {
      expect(hasButton([], 'employee.export')).toBe(false);
      expect(hasButton(['employee.add'], 'employee.export')).toBe(false);
    });
    it('精确权限码命中返回 true', () => {
      expect(hasButton(['employee.export', 'employee.delete'], 'employee.export')).toBe(true);
    });
    it('通配符 * 全开', () => {
      expect(hasButton(['*'], 'anything.else')).toBe(true);
      expect(hasButton(['*', 'x'], 'employee.export')).toBe(true);
    });
    // 回归：过去的写法 `buttons.includes(code)` 对数组里出现 undefined 等情况也应安全（无需抛错即可）
    it('空 code 不报错', () => {
      expect(hasButton(['*'], '')).toBe(true);
      expect(hasButton([], '')).toBe(false);
    });
  });

  describe('hasField', () => {
    it('字段级权限：精确/hasField 与通配', () => {
      expect(hasField(['salary'], 'salary')).toBe(true);
      expect(hasField(['salary'], 'idCard')).toBe(false);
      expect(hasField(['*'], 'idCard')).toBe(true);
      expect(hasField([], 'salary')).toBe(false);
    });
  });

  describe('hasMenu', () => {
    it('保留页面级菜单权限语义', () => {
      expect(hasMenu(['dashboard', 'employee'], 'dashboard')).toBe(true);
      expect(hasMenu(['dashboard'], 'employee')).toBe(false);
      expect(hasMenu(['*'], 'form')).toBe(true);
      expect(hasMenu([], 'dashboard')).toBe(false);
    });
  });
});

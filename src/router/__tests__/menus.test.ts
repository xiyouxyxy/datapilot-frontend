import { describe, it, expect } from 'vitest';
import { MENU_CONFIG, pathToMenuKey, filterMenusByPermission } from '../menus';

describe('路由/菜单工具', () => {
  describe('pathToMenuKey', () => {
    it('由路径找到菜单 key', () => {
      expect(pathToMenuKey('/dashboard')).toBe('dashboard');
      expect(pathToMenuKey('/employee')).toBe('employee');
    });
    it('未知路径返回 undefined', () => {
      expect(pathToMenuKey('/nope')).toBeUndefined();
    });
  });

  describe('filterMenusByPermission', () => {
    it('* 通配（admin）返回全部菜单', () => {
      const r = filterMenusByPermission(MENU_CONFIG, ['*']);
      expect(r.length).toBe(MENU_CONFIG.length);
      expect(r.map((m) => m.key)).toEqual(MENU_CONFIG.map((m) => m.key));
    });
    it('按已有 key 过滤，只保留命中的菜单', () => {
      const r = filterMenusByPermission(MENU_CONFIG, ['dashboard', 'workflow']);
      expect(r.map((m) => m.key).sort()).toEqual(['dashboard', 'workflow']);
    });
    it('无任何权限返回空数组（不抛错）', () => {
      expect(filterMenusByPermission(MENU_CONFIG, [])).toEqual([]);
    });
    it('不修改原始配置（纯函数，结果为新数组）', () => {
      const snapshot = MENU_CONFIG.map((m) => m.key);
      filterMenusByPermission(MENU_CONFIG, ['dashboard']);
      expect(MENU_CONFIG.map((m) => m.key)).toEqual(snapshot);
    });
  });
});

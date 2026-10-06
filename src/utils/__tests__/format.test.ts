import { describe, it, expect } from 'vitest';
import { formatNumber, formatMoney, formatDate, formatDateTime, trendText } from '../format';

describe('格式化函数', () => {
  describe('formatNumber / formatMoney', () => {
    it('千分位', () => {
      expect(formatNumber(1234567)).toBe('1,234,567');
    });
    it('金额带 ¥ 前缀', () => {
      expect(formatMoney(1234567.89)).toBe('¥1,234,567.89');
      expect(formatMoney(0)).toBe('¥0');
    });
  });

  describe('formatDate / formatDateTime', () => {
    it('空/非法输入回退 -', () => {
      expect(formatDate()).toBe('-');
      expect(formatDate(undefined)).toBe('-');
      expect(formatDate('not-a-date')).toBe('-');
      expect(formatDateTime('not-a-date')).toBe('-');
    });
    // 用本地时间构造 Date，避免 CI 时区导致 cross-midnight 误判
    it('Date 对象格式化为 YYYY-MM-DD', () => {
      expect(formatDate(new Date(2024, 0, 5))).toBe('2024-01-05');
      expect(formatDate(new Date(2024, 11, 31))).toBe('2024-12-31');
    });
    it('dateTime 格式为 YYYY-MM-DD HH:mm', () => {
      expect(formatDateTime(new Date(2024, 0, 5, 8, 30))).toBe('2024-01-05 08:30');
      expect(formatDateTime(new Date(2024, 11, 31, 23, 59))).toBe('2024-12-31 23:59');
    });
  });

  describe('trendText', () => {
    it('正数 ↑ 负数 ↓，保留 1 位小数', () => {
      expect(trendText(12.34)).toBe('↑ 12.3%');
      expect(trendText(-8.66)).toBe('↓ 8.7%');
    });
    it('0 视为上升', () => {
      expect(trendText(0)).toBe('↑ 0.0%');
    });
  });
});

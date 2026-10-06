// 轻量 localStorage 封装，所有读写带 try/catch，避免隐私模式/容量异常导致崩溃。

export const storage = {
  get<T>(key: string): T | null {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota / private mode */
    }
  },
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

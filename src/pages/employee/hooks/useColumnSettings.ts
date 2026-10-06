import { useCallback, useState } from 'react';
import { STORAGE_KEYS } from '@/constants';
import { storage } from '@/utils/storage';
import { ALL_COLUMN_KEYS, type ColKey } from '../columns';

// 版本化持久化：schema 变化（新增/删除列）时 +1，旧版本数据在 load 时被重置为默认。
// 旧格式（未版本化的纯数组）也在此兼容迁移。
const STORAGE_VERSION = 1;

interface ColumnSettingPayload {
  v: number;
  keys: ColKey[];
}

// 去重 + 过滤掉已不存在的列；空值兜底为默认全显，避免"全不勾"存坏数据
function sanitize(keys: ColKey[]): ColKey[] {
  const dedup = Array.from(
    new Set(keys.filter((k) => (ALL_COLUMN_KEYS as readonly string[]).includes(k))),
  );
  return dedup.length ? dedup : [...ALL_COLUMN_KEYS];
}

function loadInitial(): ColKey[] {
  const stored = storage.get<unknown>(STORAGE_KEYS.TABLE_SETTINGS);
  if (Array.isArray(stored)) return sanitize(stored as ColKey[]);
  if (stored && typeof stored === 'object') {
    const p = stored as ColumnSettingPayload;
    if (p.v === STORAGE_VERSION && Array.isArray(p.keys)) return sanitize(p.keys);
  }
  return [...ALL_COLUMN_KEYS];
}

// 列设置：可见列（有序 ColKey[]）+ 草稿编辑 + 版本化持久化
export function useColumnSettings() {
  const [colKeys, setColKeys] = useState<ColKey[]>(loadInitial);
  const [draftColKeys, setDraftColKeys] = useState<ColKey[]>(colKeys);
  const [colSetOpen, setColSetOpen] = useState(false);

  const openSettings = useCallback(() => {
    setDraftColKeys(colKeys);
    setColSetOpen(true);
  }, [colKeys]);

  const applySettings = useCallback(() => {
    const next = sanitize(draftColKeys);
    setColKeys(next);
    storage.set(STORAGE_KEYS.TABLE_SETTINGS, {
      v: STORAGE_VERSION,
      keys: next,
    } satisfies ColumnSettingPayload);
    setColSetOpen(false);
  }, [draftColKeys]);

  const resetSettings = useCallback(() => setDraftColKeys([...ALL_COLUMN_KEYS]), []);
  const closeSettings = useCallback(() => setColSetOpen(false), []);

  return {
    colKeys,
    draftColKeys,
    colSetOpen,
    setDraftColKeys,
    openSettings,
    applySettings,
    resetSettings,
    closeSettings,
  };
}

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { storage } from '@/utils/storage';
import { LANG_KEY } from '@/constants';
import zh from './locales/zh';
import en from './locales/en';

export const resources = {
  'zh-CN': { translation: zh },
  'en-US': { translation: en },
} as const;

export type AppLanguage = 'zh-CN' | 'en-US';

const DEFAULT_LANG: AppLanguage = 'zh-CN';

// 启动语言：优先读 localStorage 偏好，其次浏览器语言，兜底中文
function initialLanguage(): AppLanguage {
  const saved = storage.get<string>(LANG_KEY);
  if (saved === 'en-US' || saved === 'zh-CN') return saved;
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en')
    ? 'en-US'
    : DEFAULT_LANG;
}

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage(),
  fallbackLng: DEFAULT_LANG,
  interpolation: { escapeValue: false }, // React 本身已做转义，无需 i18next 再转义
});

export function changeLanguage(lang: AppLanguage) {
  storage.set(LANG_KEY, lang);
  void i18n.changeLanguage(lang);
}

// 让 useTranslation 的 t() 获得键名补全与类型校验
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: (typeof resources)['zh-CN'];
  }
}

export default i18n;
export { zh, en };

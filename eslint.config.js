import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  // 全局忽略：构建产物、依赖、以及 scripts 下的一次性校验脚本（非 src 业务代码）
  globalIgnores(['dist', 'node_modules', 'scripts/**', '*.config.js']),
  {
    // 关键修复：把 ts/tsx 纳入 lint 范围，让 TS 代码真正被检查（此前只配了 js/jsx）
    files: ['**/*.{js,jsx,ts,tsx}'],
    // 路由文件同时导出 `router`（配置对象）与 `Page` 组件，是 createBrowserRouter 的标准写法，
    // 不适用「文件只能导出组件」的 fast-refresh 约束，这里对 router/index.tsx 豁免。
    ignores: ['src/router/index.tsx'],
    extends: [
      js.configs.recommended,
      // TS 规则：用 recommended（语法层）而非 recommendedTypeChecked，
      // 因为项目未开启 projectService，类型感知规则会误报/拖慢。
      tseslint.configs.recommended,
      // react-hooks：只保留经典两条（hooks 调用顺序 + 依赖项），
      // 关掉 7.x 新增的 React Compiler 强相关规则（refs/set-state-in-effect/immutability 等），
      // 项目未启用 React Compiler，这些规则会把「latest-ref」「effect 拉数据」等
      // 业界标准写法误报为 error（详见下方 rules）。
      // 注意：这里手动列规则，替代 reactHooks.configs.flat.recommended 的激进预设。
      reactRefresh.configs.vite,
      // 关闭与 Prettier 冲突的格式类规则，放最后以覆盖前面
      prettier,
    ],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // react-hooks 经典两条（保持与官方推荐一致）
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // react-hooks 7.x 的 Compiler 规则对本项目（未开 React Compiler）过于激进，
      // 显式关闭，避免把 latest-ref / effect 内同步 setState 等标准写法误报为 error：
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-render': 'off',
      'react-hooks/use-memo': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/globals': 'off',
      'react-hooks/error-boundaries': 'off',
      'react-hooks/unsupported-syntax': 'off',
      'react-hooks/config': 'off',
      'react-hooks/gating': 'off',
      // 未使用变量/any 交给 TS 编译器与 IDE 提示，lint 层降为 warn 避免阻塞
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          // 忽略 rest 解构中被丢弃的兄弟字段（如 const { __row, ...rest } = x 里的 __row）
          ignoreRestSiblings: true,
          // 忽略下划线前缀的未使用参数（如 _row）
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]);

import type zh from './zh';

// 用 as const + 键名约束，保证 en 与 zh 结构完全一致（缺键会在编译期报错）
const en: Record<keyof typeof zh, unknown> = {
  brand: 'DataPilot',
  menu: {
    dashboard: 'Dashboard',
    employee: 'Employees',
    import: 'Data Import',
    workflow: 'Workflow',
    form: 'Form Demo',
  },
  login: {
    subtitle: 'Enterprise Data Analytics Platform',
    username: 'Username',
    password: 'Password',
    login: 'Sign In',
    otherLogin: 'Other ways to sign in',
    sso: 'Sign in with SSO',
    quickHint: 'Quick sign-in by role',
    usernameRequired: 'Please enter your username',
    passwordRequired: 'Please enter your password',
    welcomeBack: 'Welcome back, {{name}}',
  },
  header: {
    logout: 'Log out',
  },
  lang: {
    switch: 'Switch language',
    zh: '简体中文',
    en: 'English',
  },
};

export default en as typeof zh;

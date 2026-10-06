import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  collapsed: boolean;
  theme: 'light' | 'dark';
  primaryColor: string;
  toggleCollapsed: () => void;
  setTheme: (t: 'light' | 'dark') => void;
  setPrimaryColor: (c: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      collapsed: false,
      theme: 'light',
      primaryColor: '#1677ff',
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      setTheme: (t) => set({ theme: t }),
      setPrimaryColor: (c) => set({ primaryColor: c }),
    }),
    { name: 'bi-app' },
  ),
);

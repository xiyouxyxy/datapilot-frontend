import { create } from 'zustand';
import type { AppMessage } from '@/types';
import * as messageService from '@/services/message';
import { genRealtimeMessage } from '@/mock/message';

interface MessageState {
  list: AppMessage[];
  unread: number;
  loaded: boolean;
  load: () => Promise<void>;
  addMessage: (m: AppMessage) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  startSubscribe: () => void;
  stopSubscribe: () => void;
}

let _timer: ReturnType<typeof setInterval> | null = null;

export const useMessageStore = create<MessageState>((set, get) => ({
  list: [],
  unread: 0,
  loaded: false,
  load: async () => {
    const list = await messageService.list();
    set({ list, unread: list.filter((m) => !m.read).length, loaded: true });
  },
  addMessage: (m) => set((s) => ({ list: [m, ...s.list], unread: s.unread + (m.read ? 0 : 1) })),
  markRead: (id) => {
    messageService.read(id).catch(() => undefined);
    set((s) => {
      const list = s.list.map((m) => (m.id === id ? { ...m, read: true } : m));
      return { list, unread: list.filter((m) => !m.read).length };
    });
  },
  markAllRead: () => {
    messageService.readAll().catch(() => undefined);
    set((s) => ({ list: s.list.map((m) => ({ ...m, read: true })), unread: 0 }));
  },
  // 前端模拟 SSE：定时推送实时消息（生产环境替换为 EventSource/WebSocket）
  startSubscribe: () => {
    if (_timer) return;
    _timer = setInterval(() => {
      get().addMessage(genRealtimeMessage());
    }, 8000);
  },
  stopSubscribe: () => {
    if (_timer) {
      clearInterval(_timer);
      _timer = null;
    }
  },
}));

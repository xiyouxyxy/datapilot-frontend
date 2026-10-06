// P1-3 埋点 SDK：PV/UV、点击、曝光、性能（FCP / LCP / TTI）三层采集。
// 开发环境上报到 console，生产环境留 sendBeacon 上报接口（对接自建监控 / 友盟 / 神策 等）。
// 纯工具，不含 React 依赖；路由 PV 由页面/布局层用 useLocation 触发。

const UID_KEY = 'dp_track_uid';
const UV_KEY_PREFIX = 'dp_track_uv_'; // uv: 同一天首次访问才记一名 UV
const DEV_ENDPOINT = '/monitor/track'; // 生产上报接口占位

// 全站共用一个 IntersectionObserver 实例，避免为每个曝光元素新建观察器
let exposureObserver: IntersectionObserver | undefined;
// 兜底重扫定时器句柄（懒加载路由下，路由变化时的首次扫描可能早于页面内容挂载）
let rescanTimer: number | undefined;

type TrackType = 'pv' | 'uv' | 'click' | 'expose' | 'perf';

interface TrackData {
  type: TrackType;
  name: string; // 事件名/指标名
  page?: string; // location.pathname
  value?: number | string; // 如 LCP 时长 / 点击元素
  props?: Record<string, unknown>;
  uid: string;
  ts: number;
}

function env(): string | undefined {
  return import.meta.env?.MODE;
}
const isDev = env() !== 'production';

function getUid(): string {
  try {
    let uid = localStorage.getItem(UID_KEY);
    if (!uid) {
      uid = crypto?.randomUUID?.() ?? `u_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(UID_KEY, uid);
    }
    return uid;
  } catch {
    return 'unknown';
  }
}

function pageNow(): string {
  return typeof location !== 'undefined' ? location.pathname + location.search : '';
}

/** 单条上报：开发打 console，生产走 sendBeacon 到后端接口 */
function send(data: Omit<TrackData, 'uid' | 'ts'>): void {
  const payload: TrackData = { ...data, uid: getUid(), ts: Date.now() };
  if (isDev) {
    console.info(`[Track:${payload.type}]`, payload);
    return;
  }
  try {
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(DEV_ENDPOINT, blob);
    } else {
      void fetch(DEV_ENDPOINT, { method: 'POST', body: blob, keepalive: true });
    }
  } catch {
    /* 静默失败：埋点不影响业务 */
  }
}

export const track = {
  uid: getUid(),

  // ---------------- 第 1 层：页面（PV / UV） ----------------
  pv(route?: string): void {
    send({ type: 'pv', name: 'pageview', page: route ?? pageNow() });
    // UV 口径：同一设备同一天只记一次
    const day = new Date().toISOString().slice(0, 10);
    const uvKey = UV_KEY_PREFIX + day;
    let first = false;
    try {
      if (localStorage.getItem(uvKey) !== '1') {
        localStorage.setItem(uvKey, '1');
        first = true;
      }
    } catch {
      first = true;
    }
    if (first) send({ type: 'uv', name: 'uv', page: route ?? pageNow() });
  },

  // ---------------- 第 2 层：点击（事件委托，采集 data-track） ----------------
  click(info: { name: string; page?: string }): void {
    send({ type: 'click', name: info.name, page: info.page ?? pageNow() });
  },

  /** 在 document 上注册一次委托即可采集全站按钮/链接（含 data-track 语义名） */
  enableClickDelegation(): () => void {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const el = target?.closest?.('[data-track], button, a[href]') as HTMLElement | null;
      if (!el) return;
      track.click({ name: el.dataset?.track ?? describe(el) });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  },

  // ---------------- 第 3 层：曝光（IntersectionObserver） ----------------
  observeExposure(el: Element, name: string, threshold = 0.5): void {
    if (typeof IntersectionObserver === 'undefined') return;
    if (!exposureObserver) {
      exposureObserver = new IntersectionObserver(
        (entries) => {
          for (const en of entries) if (en.isIntersecting) track.expose(en.target as HTMLElement);
        },
        { threshold },
      );
    }
    (el as HTMLElement).dataset.trackExpose = name; // 供 entry 读语义名
    exposureObserver.observe(el);
  },
  expose(el: HTMLElement): void {
    const name = el.dataset?.trackExpose;
    if (name) send({ type: 'expose', name, page: pageNow() });
  },
  /** 扫描并订阅当前可见的 [data-track-expose] 元素（路由切换后调用） */
  scanExposure(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    scanExposeNow();
    // 懒加载路由 + StrictMode：路由变化的首次扫描常早于页面 chunk 挂载（此时只剩 Suspense fallback），
    // 元素还没渲染导致 querySelectorAll 扫空、且后续不再触发。故再做 rAF + 延时兜底重扫（observe 幂等）。
    requestAnimationFrame(scanExposeNow);
    if (rescanTimer) window.clearTimeout(rescanTimer);
    rescanTimer = window.setTimeout(scanExposeNow, 500);
  },

  // ---------------- 性能：FCP / LCP / TTI ----------------
  observePerf(): () => void {
    if (typeof PerformanceObserver === 'undefined') return () => undefined;
    const stops: Array<() => void> = [];

    // 兜底：直接读 buffered entries，避免 FCP/LCP 先于 observer 附着而发生导致漏采
    const reportBufferedPaints = () => {
      try {
        for (const e of performance.getEntriesByType('first-contentful-paint')) {
          if (e.startTime) track.perf('FCP', e.startTime);
        }
        const lcpEntries = performance.getEntriesByType(
          'largest-contentful-paint',
        ) as PerformanceEntry[];
        if (lcpEntries.length) track.perf('LCP', lcpEntries[lcpEntries.length - 1].startTime);
      } catch {
        /* 打点容错 */
      }
    };

    // FCP / LCP
    try {
      const paintObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') track.perf('FCP', entry.startTime);
        }
      });
      paintObs.observe({ type: 'paint', buffered: true });
      stops.push(() => paintObs.disconnect());

      const lcpObs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) track.perf('LCP', last.startTime);
      });
      lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
      stops.push(() => lcpObs.disconnect());
    } catch {
      /* 打点容错 */
    }

    // 初始化后立即读一次缓冲，兜住先于本 SDK 已发生的首屏性能事件
    reportBufferedPaints();

    // TTI：启发式估算 —— 主线程空闲前最后一个 LongTask 的结束时间
    try {
      const longObs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) track.perf('TTI', last.startTime + last.duration);
      });
      longObs.observe({ type: 'longtask', buffered: true });
      stops.push(() => longObs.disconnect());
    } catch {
      /* 打点容错 */
    }

    // 兜底：导航类耗时（DOMContentLoaded / Load）
    window.addEventListener('load', () => {
      const nav = performance.getEntriesByType?.('navigation')[0] as
        PerformanceNavigationTiming | undefined;
      if (!nav) return;
      track.perf('domInteractive', nav.domInteractive);
      track.perf('loadEvent', nav.loadEventEnd);
      track.timing('nav', {
        dns: nav.domainLookupEnd - nav.domainLookupStart,
        tcp: nav.connectEnd - nav.connectStart,
        ttfb: nav.responseStart - nav.requestStart,
        domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      });
    });

    return () => stops.forEach((s) => s());
  },
  perf(name: string, value: number): void {
    send({ type: 'perf', name, value: Math.round(value), page: pageNow() });
  },
  timing(name: string, props: Record<string, unknown>): void {
    send({ type: 'perf', name, props, page: pageNow() });
  },

  init(): () => void {
    const stops: Array<() => void> = [];
    stops.push(this.enableClickDelegation());
    stops.push(this.observePerf());
    return () => stops.forEach((s) => s());
  },
};

/** 扫一遍当前 [data-track-expose] 元素并订阅（observe 幂等，重复调用无副作用） */
function scanExposeNow(): void {
  if (typeof IntersectionObserver === 'undefined') return;
  document.querySelectorAll<HTMLElement>('[data-track-expose]').forEach((el) => {
    track.observeExposure(el, el.dataset.trackExpose ?? '');
  });
}

/** 兜底描述：从元素标签/文本/类名拼一个可读的事件名 */
function describe(el: HTMLElement): string {
  const text = (el.innerText ?? '').trim().slice(0, 12);
  if (text) return `${el.tagName.toLowerCase()}:${text}`;
  const cls = Array.from(el.classList).join('.');
  return `${el.tagName.toLowerCase()}${cls ? `:${cls}` : ''}`;
}

export default track;

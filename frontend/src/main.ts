import './styles.css';

const app = document.getElementById('app');
if (!app) throw new Error('App root missing');
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '')
  || '/api';

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
let accessToken = localStorage.getItem('harmony_access_token') ?? '';
let userEmail = localStorage.getItem('harmony_user_email') ?? 'אורח';
let userRole = localStorage.getItem('harmony_user_role') ?? 'other';

const setSession = (token: string, email: string, role: string) => {
  accessToken = token;
  userEmail = email;
  userRole = role;
  localStorage.setItem('harmony_access_token', token);
  localStorage.setItem('harmony_user_email', email);
  localStorage.setItem('harmony_user_role', role);
};

const clearSession = () => {
  accessToken = '';
  userEmail = 'אורח';
  userRole = 'other';
  localStorage.removeItem('harmony_access_token');
  localStorage.removeItem('harmony_user_email');
  localStorage.removeItem('harmony_user_role');
};

const withCacheBust = (path: string): string => {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}_ts=${Date.now()}`;
};

const api = async <T>(path: string, body?: unknown): Promise<T> => {
  const isGet = !body;
  const requestPath = isGet ? withCacheBust(path) : path;
  const res = await fetch(`${apiBaseUrl}${requestPath}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
    cache: 'no-store',
    body: body ? JSON.stringify(body) : undefined,
  });
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (res.status === 401) {
    clearSession();
    toast('פג תוקף ההתחברות. התחברו מחדש.', 'error');
    if (!['#/', '#/login', '#/register'].includes(location.hash || '#/')) {
      location.hash = '#/login';
    }
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: string }).message)
        : 'Request failed';
    throw new Error(message);
  }
  return payload as T;
};

const toast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
  const root = byId<HTMLDivElement>('toastRoot');
  if (!root) return;
  const item = document.createElement('div');
  item.className = `toast toast-${type}`;
  item.textContent = message;
  root.appendChild(item);
  setTimeout(() => {
    item.classList.add('toast-hide');
    setTimeout(() => item.remove(), 250);
  }, 2600);
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const LS_ONBOARDING_DONE = 'harmony_onboarding_done';
const LS_PARTNER_DISPLAY_NAME = 'harmony_partner_display_name';
const LS_WEEKLY_FOCUS = 'harmony_weekly_focus';

const WEEKLY_RITUAL_SUGGESTIONS = [
  'הערב: עשר דקות בלי טלפון — רק שיחה קצרה או שקט משותף.',
  'לבחור משהו קטן ביחד: טיילו רבע שעת או ארוחת ערב בלי מסך.',
  'לבקש בעדינות עזרה אחת להיום, בלי רשימת תלונות.',
  'לפני שינה — נושא רגוע וקצר, במקום "לסגור את כל הפרקים".',
  'לכתוב הודעה של הערכה (משפט אחד) ולשלוח בצהריים.',
];

const ROUTES_WITH_STAGGER = new Set([
  '#/dashboard',
  '#/platform',
  '#/connect',
  '#/cycle',
  '#/preferences',
  '#/ai',
  '#/assistant',
  '#/emergency',
  '#/mood',
  '#/timeline',
  '#/insights',
  '#/notifications',
  '#/goals',
]);

const isoWeekKey = (d = new Date()): string => {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - dow);
  const yStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((x.getTime() - yStart.getTime()) / 86400000 + 1) / 7);
  return `${x.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

const ritualWeekStorageKey = (weekKey: string) => `harmony_ritual_done_${weekKey}`;

const pickWeeklyRitualText = (): string => {
  const key = isoWeekKey();
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) >>> 0;
  }
  return WEEKLY_RITUAL_SUGGESTIONS[h % WEEKLY_RITUAL_SUGGESTIONS.length];
};

const tsFromMaybeDate = (v?: string): number => {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
};

const formatHebrewTimelineDate = (ms: number): string => {
  if (!ms) return 'תאריך לא זמין';
  try {
    return new Date(ms).toLocaleString('he-IL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'תאריך לא זמין';
  }
};

type TimelineMergedItem = {
  at: number;
  kind: 'mood' | 'ai_translate' | 'ai_emergency' | 'cycle' | 'goal' | 'ritual';
  title: string;
  body: string;
};

const scheduleShellStagger = () => {
  queueMicrotask(() => {
    requestAnimationFrame(() => {
      document.querySelector('main.layout')?.classList.add('page-enter-ready');
    });
  });
};

const partnerNicknameForAdvice = (): string =>
  localStorage.getItem(LS_PARTNER_DISPLAY_NAME)?.trim() || '';

/** מנתח יום בודד — עוזר לחישובי מחזור בדאשבורד הגבר */
const stripTime = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const parseYmd = (value: string): Date => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return stripTime(new Date(value));
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  return new Date(y, mo, day);
};

const addDays = (d: Date, days: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};

const diffDays = (a: Date, b: Date): number =>
  Math.round((stripTime(a).getTime() - stripTime(b).getTime()) / 86400000);

type MaleCycleEntry = {
  startDate: string;
  endDate?: string;
  energyLevel?: number;
  symptoms?: string[];
};

type MaleAdvice = {
  phase: 'during' | 'between' | 'unknown' | 'no_data';
  phaseLabel: string;
  headline: string;
  body: string;
  tips: string[];
  snapshot: string;
};

const buildMalePartnerAdvice = (
  partnerName: string,
  entries: MaleCycleEntry[],
): MaleAdvice => {
  const firstName = partnerName.trim().split(/\s+/)[0] || 'בת הזוג';
  if (!entries.length) {
    return {
      phase: 'no_data',
      phaseLabel: 'אין נתוני מחזור',
      headline: `${firstName} עדיין לא עדכנה מחזור`,
      body: 'ברגע שתעדכן תאריכי התחלה/סיום, אנרגיה או תסמינים — כאן יופיעו עצות ממוקדות. בינתיים: שמרו על שפה רגועה ותשאלו מה עוזר.',
      tips: [
        'שאלה פשוטה: "מה היית רוצה שאעשה בשבילך השבוע?"',
        'אל תנחשו — בקשו רשות לפני "פתרונות מהירים".',
        'אם לוחצים לכם לדחוף עניין — קחו הפסקה של 10 דקות לפני שאתם ממשיכים.',
      ],
      snapshot: 'לא הוזנו תאריכים או תסמינים עדיין.',
    };
  }

  const sorted = [...entries].sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
  const latest = sorted[0];
  const start = parseYmd(latest.startDate);
  const end = latest.endDate ? parseYmd(latest.endDate) : null;
  const today = stripTime(new Date());
  const periodFallbackEnd = addDays(start, 7);

  let phase: MaleAdvice['phase'] = 'unknown';
  if (end) {
    if (today >= start && today <= end) phase = 'during';
    else if (today > end) phase = 'between';
    else if (today < start) phase = 'unknown';
  } else {
    if (today >= start && today <= periodFallbackEnd) phase = 'during';
    else if (today > periodFallbackEnd) phase = 'between';
    else if (today < start) phase = 'unknown';
  }

  const symptoms = (latest.symptoms || []).map((s) => s.toLowerCase());
  const symptomsText = (latest.symptoms || []).join(' ').toLowerCase();
  const energy = latest.energyLevel;
  const hasPain =
    symptomsText.includes('כאב') ||
    symptomsText.includes('כאבים') ||
    symptoms.some((s) => s.includes('כאב'));
  const hasFatigue =
    symptomsText.includes('עייפ') ||
    symptomsText.includes('שחיק') ||
    symptomsText.includes('חולש');
  const lowEnergy = energy !== undefined && energy <= 4;

  const snapshotParts: string[] = [];
  snapshotParts.push(`מחזור אחרון מתחיל ב־${latest.startDate}`);
  if (latest.endDate) snapshotParts.push(`סיום מדווח: ${latest.endDate}`);
  if (energy !== undefined) snapshotParts.push(`אנרגיה (1–10): ${energy}`);
  if ((latest.symptoms || []).length) snapshotParts.push(`תסמינים: ${(latest.symptoms || []).join(', ')}`);
  const snapshot = snapshotParts.join(' · ');

  const symptomTips: string[] = [];
  if (hasPain) {
    symptomTips.push('אם מדובר בכאבים — תנו מרחב פיזי, חום/מים חמים אם מתאים, ובלי בדיחות על "הורמונים".');
  }
  if (hasFatigue || lowEnergy) {
    symptomTips.push('אנרגיה נמוכה = פחות משימות, יותר גיבוי מעשי (אוכל, סידורים, שקט).');
  }
  if (!symptomTips.length && (latest.symptoms || []).length) {
    symptomTips.push('יש תסמינים שמוזנים — קראו אותם בקול רגוע ואל תמזגו "אבל זה לא כזה נורא".');
  }

  if (phase === 'during') {
    return {
      phase: 'during',
      phaseLabel: 'בזמן המחזור (לפי הנתונים שהוזנו)',
      headline: `עכשיו זה זמן רגיש יותר עבור ${firstName}`,
      body: 'בשלב הזה כדאי פחות לחץ, פחות ביקורת, ויותר עקביות קטנה: מים, מנוחה, ושפה רכה. אם אתם חייבים לדבר על משהו כבד — קבעו זמן קצר ומודע, לא "על הדרך".',
      tips: [
        'תבנית מומלצת: "אני פה. מה עוזר לך היום — שקט, עזרה בבית, או משהו אחר?"',
        'אם מתחיל ויכוח — עצרו, חזרו אחרי 20 דקות. זה לא חולשה, זה שיקול דעת.',
        'אם היא מתעייפת מהיר — אל תגלגלו משימות "בונוס"; קחו דברים מהשולחן.',
        ...symptomTips.slice(0, 2),
      ],
      snapshot,
    };
  }

  if (phase === 'between') {
    const daysSinceEnd = end ? diffDays(today, end) : diffDays(today, periodFallbackEnd);
      const timingNote =
      end && daysSinceEnd >= 0
        ? `${daysSinceEnd} ימים אחרי סיום תיאור המחזור האחרון.`
        : 'המצב מוגדר כבין-מחזורי לפי התאריכים שהוזנו.';

    return {
      phase: 'between',
      phaseLabel: 'לפני המחזור הבא / בין מחזורים',
      headline: `${firstName} כרגע לא בזמן מחזור מדווח — זמן טוב לבנות רזרבה זוגית`,
      body: `שלב זה מתאים לשגרה יותר יציבה, אבל עדיין כדאי לזכור מה עשה בה אתכם קשה בשבוע שעבר. ${timingNote} זה הרגע למנוע "הפתעות" ולתאם ציפיות כשכולם רגועים.`,
      tips: [
        'תזמנו משהו קטן ובדוק (ארוחה, טיול קצר) בלי הפקה של טלנובלה.',
        'אם בא לכם לפתור מתח מתמשך — עשו את זה כשיש מרווח, לא לפני שינה.',
        'בקשו עדכון קצר: "איך את מרגישה השבוע?" — בלי לחץ לפרטים.',
        ...symptomTips.slice(0, 1),
      ],
      snapshot,
    };
  }

  return {
    phase: 'unknown',
    phaseLabel: 'נתונים חלקיים',
    headline: `קשה לסווג את השלב בדיוק — אבל אפשר עדיין לעזור ל־${firstName}`,
    body: 'נראה שחסרים תאריכים מספיקים או שיש רישום שעדיין לא מסתנכרן ליום היום. אם משהו לא סגור — עדיף לשאול ישירות מאשר להניח.',
    tips: [
      '"אני רוצה להבין איפה את נמצאת עכשיו — מה מרגיש לך נכון לשתף?"',
      'אל תהפכו ניחושים לעובדות. אם אין דאטה — יש שיחה.',
      ...symptomTips.slice(0, 2),
    ],
    snapshot,
  };
};

const renderMaleDashboardCards = (partnerFullName: string, advice: MaleAdvice): string => {
  const tipsList = advice.tips.map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  return `
    <article class="platform-card dashboard-male-card page-card-stagger">
      <h3>${escapeHtml(advice.phaseLabel)}</h3>
      <p class="dashboard-male-headline">${escapeHtml(advice.headline)}</p>
      <p class="helper-text">${escapeHtml(advice.body)}</p>
      <p class="dashboard-snapshot"><strong>מבט על הנתונים:</strong> ${escapeHtml(advice.snapshot)}</p>
      <ul class="dashboard-tips">${tipsList}</ul>
      <p class="helper-text subtle">הנתונים מבוססים על מה ש${escapeHtml(partnerFullName)} מזינה במעקב המחזור. לא רפואי — רק כיוון זוגי.</p>
    </article>
    <article class="platform-card dashboard-male-card page-card-stagger">
      <h3>קישור מהיר</h3>
      <p class="helper-text">מעקב מלא אחר הנתונים בדף "מעקב מחזור". חיבור זוגי מתעדכן בדף "חיבור זוגי".</p>
      <div class="actions">
        <a class="btn ghost link-btn" href="#/cycle">למעקב מחזור</a>
        <a class="btn ghost link-btn" href="#/connect">חיבור זוגי</a>
      </div>
    </article>`;
};

const loadMaleDashboardInsights = async () => {
  const mount = byId<HTMLDivElement>('maleDashboardMount');
  if (!mount) return;
  mount.innerHTML =
    '<article class="platform-card"><p>טוען עצות לפי נתוני בת הזוג…</p></article>';
  try {
    const partnerData = await api<{
      connected: boolean;
      partner: null | { name: string; email: string; role: string };
    }>('/couples/partner/me');

    if (!partnerData.connected || !partnerData.partner) {
      mount.innerHTML = `<article class="platform-card dashboard-male-card">
          <h3>עדיין אין חיבור זוגי פעיל</h3>
        <p class="helper-text">כדי לקבל כאן עצות לפני ובמהלך המחזור לפי הנתונים של בת הזוג — צריך להשלים חיבור זוגי תחילה.</p>
        <div class="actions"><a class="btn primary link-btn" href="#/connect">מעבר לחיבור זוגי</a></div>
      </article>`;
      return;
    }

    if (partnerData.partner.role !== 'female') {
      mount.innerHTML = `<article class="platform-card dashboard-male-card">
        <h3>חיבור פעיל</h3>
        <p>${escapeHtml(partnerData.partner.name)} מחובר/ת. עצות מחזור מותאמות מוצגות כשבן/בת הזוג עם תפקיד "אישה" מזינים מעקב מחזור.</p>
      </article>`;
      return;
    }

    const cycleData = await api<{ entries: MaleCycleEntry[] }>('/tracking/cycle/view');
    const partnerLabel = partnerNicknameForAdvice() || partnerData.partner.name;
    const advice = buildMalePartnerAdvice(partnerLabel, cycleData.entries);
    mount.innerHTML = renderMaleDashboardCards(partnerLabel, advice);
  } catch {
    mount.innerHTML = `<article class="platform-card dashboard-male-card"><p class="helper-text">לא הצלחנו לטעון את העצות. נסו לרענן או בדקו שהתחברתם מחדש.</p></article>`;
  }
};

const shellTemplate = (
  content: string,
  withNav = false,
  _showTitle = false,
  showHeader = false,
) => `
  <div class="scene">
    <div class="bg-shape shape-one"></div>
    <div class="bg-shape shape-two"></div>
    <div class="bg-shape shape-three"></div>
    <div class="grid-overlay"></div>
  </div>
  <main class="layout" dir="rtl">
    ${
      showHeader
        ? `<header class="hero glass">
      <div>
        <p class="badge">פלטפורמת HarmonyAI</p>
        ${showTitle ? '<h1>HarmonyAI</h1>' : ''}
        <p class="subtitle">אינטליגנציה זוגית חכמה עם ממשק מודרני, חלוקה לעמודים ברורים ותהליך שימוש פשוט.</p>
      </div>
      <div class="stats">
        <div><span>${userEmail}</span><small>משתמש</small></div>
        <div><span>${accessToken ? 'מחובר' : 'אורח'}</span><small>סטטוס התחברות</small></div>
        <div><span>${userRole === 'male' ? 'פלטפורמת גבר' : userRole === 'female' ? 'פלטפורמת אישה' : 'פלטפורמה כללית'}</span><small>סביבת שימוש</small></div>
      </div>
    </header>`
        : ''
    }
    ${
      withNav
        ? `<nav class="panel glass nav">
      <div class="nav-top">
        <div class="nav-brand">
          <span class="nav-logo" aria-hidden="true">❤</span>
          <span class="nav-title">Harmony</span>
        </div>
        <button id="menuToggle" class="menu-toggle" type="button" aria-label="תפריט">☰</button>
      </div>
      <div id="navLinks" class="nav-links">
        <div class="nav-group">
          <span class="nav-group-label">מרכז</span>
          <div class="nav-group-links">
            <a href="#/dashboard">דאשבורד</a>
            <a href="#/platform">הפלטפורמה שלי</a>
            <a href="#/connect">חיבור זוגי</a>
            <a href="#/cycle">מעקב מחזור</a>
          </div>
        </div>
        <div class="nav-group">
          <span class="nav-group-label">כלים</span>
          <div class="nav-group-links">
            <a href="#/ai">תרגום רגשי</a>
            <a href="#/assistant">עוזר יומי</a>
            <a href="#/emergency">מצב חירום</a>
          </div>
        </div>
        <div class="nav-group">
          <span class="nav-group-label">מעקב והגדרות</span>
          <div class="nav-group-links">
            <a href="#/mood">מצב רוח</a>
            <a href="#/timeline">טיימליין זוגי</a>
            <a href="#/insights">אינסייטים</a>
            <a href="#/goals">יעדים</a>
            <a href="#/notifications">התראות</a>
            <a href="#/preferences">העדפות ופרטיות</a>
          </div>
        </div>
      </div>
      <button id="logoutBtn" class="btn ghost nav-logout">התנתקות</button>
    </nav>
    <section class="panel glass state-strip">
      <span class="state-label">מצב נוכחי:</span>
      <button class="state-chip state-chip-green" type="button">ירוק</button>
      <button class="state-chip state-chip-yellow" type="button">צהוב</button>
      <button class="state-chip state-chip-red" type="button">אדום</button>
    </section>`
        : ''
    }
    ${content}
    <div id="toastRoot" class="toast-root" aria-live="polite"></div>
  </main>
`;

const renderLanding = () => {
  app.innerHTML = shellTemplate(
    `<section class="panel glass page auth-page">
      <div class="home-hero">
        <div class="logo-wrap" aria-hidden="true">
          <svg viewBox="0 0 220 220" class="home-logo">
            <defs>
              <linearGradient id="logoGradA" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#7c7bff"></stop>
                <stop offset="50%" stop-color="#bb69ff"></stop>
                <stop offset="100%" stop-color="#4de2d6"></stop>
              </linearGradient>
              <linearGradient id="logoGradB" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#ff7ba8"></stop>
                <stop offset="100%" stop-color="#ffb14d"></stop>
              </linearGradient>
              <filter id="logoGlow">
                <feGaussianBlur stdDeviation="4" result="blur"></feGaussianBlur>
                <feMerge>
                  <feMergeNode in="blur"></feMergeNode>
                  <feMergeNode in="SourceGraphic"></feMergeNode>
                </feMerge>
              </filter>
            </defs>
            <circle cx="110" cy="110" r="88" fill="none" stroke="url(#logoGradA)" stroke-width="5" class="logo-ring"></circle>
            <path d="M62 120 C 62 88, 98 76, 110 102 C 122 76, 158 88, 158 120 C 158 146, 133 164, 110 180 C 87 164, 62 146, 62 120 Z" fill="none" stroke="url(#logoGradA)" stroke-width="8" stroke-linejoin="round" filter="url(#logoGlow)"></path>
            <path d="M88 122 C 88 108, 104 103, 110 114 C 116 103, 132 108, 132 122 C 132 135, 120 145, 110 153 C 100 145, 88 135, 88 122 Z" fill="url(#logoGradB)" opacity="0.9"></path>
            <circle cx="110" cy="110" r="102" fill="none" stroke="url(#logoGradB)" stroke-width="1.5" stroke-dasharray="8 8" class="logo-orbit"></circle>
          </svg>
        </div>

        <div class="home-copy">
          <p class="home-kicker">HarmonyAI — פחות ניחושים, יותר קרבה</p>
          <h2 class="home-headline">כשהרגש עולה, קל לפספס מה האחר אומר באמת</h2>
          <div class="home-visual-accent" aria-hidden="true">
            <span class="home-visual-dot"></span>
            <span class="home-visual-line"></span>
            <span class="home-visual-heart">✦</span>
            <span class="home-visual-line"></span>
            <span class="home-visual-dot"></span>
          </div>
          <p class="helper-text home-lead">
            כאן תמצאו כלים לשיחה רגועה יותר: להבין טקסטים, לעצור ריב לפני שהוא מתפוצץ, ולעקוב אחרי מחזור
            ומצב רוח — ביחד, בלי בושה ובלי אבחון רפואי.
          </p>
          <ul class="home-points">
            <li><strong>מעקב מחזור ומצב רוח</strong> — תמונה אמיתית לזמנים רגישים</li>
            <li><strong>חיבור זוגי</strong> — שיתוף נתונים רק מה שמתאים לכם</li>
            <li><strong>תרגום רגשי ומצב חירום</strong> — עזר מיידי כשנדחפתם לפינה מילולית</li>
          </ul>
        </div>
      </div>

      <div class="actions home-cta">
        <a class="btn primary link-btn home-cta-primary" href="#/register">התחלה — יצירת חשבון</a>
        <a class="btn ghost link-btn" href="#/login">כבר משתמשים? התחברות</a>
      </div>

      <div class="entry-note">
        <strong>למה השקעה של דקה?</strong>
        <span
          >אחרי הרשמה קצרה תעברו הגדרות זוגיות (כינוי, מיקוד שבועי) ותגיעו לדאשבורד עם טיימליין שמושך נתונים
          מהאפליקציה — לא טקסט דמה.</span
        >
      </div>
    </section>`,
    false,
    false,
    false,
  );
};

const renderRegister = () => {
  app.innerHTML = shellTemplate(
    `<section class="panel glass page auth-page">
      <h2 class="page-title">הרשמה</h2>
      <p class="helper-text page-lead">פרטים בסיסיים, ואז שלושה שלבים קצרים (כינוי ומיקוד שבועי) לפני הדאשבורד.</p>
      <div class="form-grid">
        <input id="name" placeholder="שם מלא" />
        <input id="email" placeholder="אימייל" />
        <input id="password" placeholder="סיסמה" type="password" />
        <select id="role">
          <option value="male">גבר</option>
          <option value="female">אישה</option>
          <option value="other" selected>אחר</option>
        </select>
      </div>
      <div class="actions">
        <button id="registerBtn" class="btn primary">יצירת חשבון</button>
        <a class="btn link-btn" href="#/login">יש לי חשבון</a>
      </div>
      <pre id="output"></pre>
    </section>`,
    false,
    true,
    false,
  );

  byId<HTMLButtonElement>('registerBtn')?.addEventListener('click', async () => {
    const name = byId<HTMLInputElement>('name');
    const email = byId<HTMLInputElement>('email');
    const password = byId<HTMLInputElement>('password');
    const role = byId<HTMLSelectElement>('role');
    const output = byId<HTMLPreElement>('output');
    if (!name || !email || !password || !role || !output) return;
    toast('יוצר חשבון...', 'info');
    try {
      const result = await api<{ accessToken: string; user: { email: string; role: string } }>('/auth/register', {
        name: name.value,
        email: email.value,
        password: password.value,
        role: role.value,
      });
      setSession(result.accessToken, result.user.email, result.user.role);
      toast('נרשמת בהצלחה', 'success');
      location.hash = '#/onboarding';
    } catch (error) {
      output.textContent = `הרשמה נכשלה: ${String(error)}`;
      toast('הרשמה נכשלה', 'error');
    }
  });
};

const renderLogin = () => {
  app.innerHTML = shellTemplate(
    `<section class="panel glass page">
      <h2 class="page-title">התחברות</h2>
      <p class="helper-text page-lead">אימייל וסיסמה. אם עוד לא הגדרתם את השלושה שלבים — תופנו אליהם לפני הדאשבורד.</p>
      <div class="form-grid">
        <input id="email" placeholder="אימייל" />
        <input id="password" placeholder="סיסמה" type="password" />
      </div>
      <div class="actions">
        <button id="loginBtn" class="btn primary">התחברות</button>
        <a class="btn link-btn" href="#/register">אין לי חשבון</a>
      </div>
      <pre id="output"></pre>
    </section>`,
    false,
    true,
    false,
  );

  byId<HTMLButtonElement>('loginBtn')?.addEventListener('click', async () => {
    const email = byId<HTMLInputElement>('email');
    const password = byId<HTMLInputElement>('password');
    const output = byId<HTMLPreElement>('output');
    if (!email || !password || !output) return;
    toast('מתחבר...', 'info');
    try {
      const result = await api<{ accessToken: string; user: { email: string; role: string } }>('/auth/login', {
        email: email.value,
        password: password.value,
      });
      setSession(result.accessToken, result.user.email, result.user.role);
      toast('התחברת בהצלחה', 'success');
      location.hash = localStorage.getItem(LS_ONBOARDING_DONE) ? '#/dashboard' : '#/onboarding';
    } catch (error) {
      output.textContent = `התחברות נכשלה: ${String(error)}`;
      toast('התחברות נכשלה', 'error');
    }
  });
};

const renderOnboarding = () => {
  const roleLabels: Record<string, string> = {
    male: 'גבר במערכת',
    female: 'אישה במערכת',
    other: 'תפקיד כללי',
  };
  const roleLine = roleLabels[userRole] ?? 'משתמש';
  app.innerHTML = shellTemplate(
    `<section class="panel glass page auth-page onboarding-page">
      <h2>ברוכים הבאים — שלוש הצעדים</h2>
      <p class="helper-text">
        עוזר להתאים את הטקסטים בשבילכם (במיוחד בעמוד העצות לבן זוג ובדאשבורד). אפשר לעדכן בכל רגע אחרי ההגדרות.
      </p>
      <div class="onboarding-steps">
        <article class="platform-card page-card-stagger">
          <h3>שלב 1 · מי בתמונה אצלך</h3>
          <p class="helper-text subtle">כרגע נרשמת כ־<strong>${escapeHtml(roleLine)}</strong>.</p>
        </article>
        <article class="platform-card page-card-stagger">
          <h3>שלב 2 · איך לכתוב לבת או לבן הזוג בהמלצות?</h3>
          <label class="sr-only" for="onboardPartnerName">כינוי או שם של בן או בת הזוג לטקסטים מותאמים</label>
          <input id="onboardPartnerName" placeholder="לדוגמה: מיכל או כינוי חם (יופיע בהמלצות)" />
        </article>
        <article class="platform-card page-card-stagger">
          <h3>שלב 3 · מה חשוב לך השבוע?</h3>
          <textarea id="onboardWeeklyFocus" rows="2" placeholder="משפט אחד, למשל: פחות ריב בארוחות"></textarea>
        </article>
      </div>
      <div class="actions">
        <button id="finishOnboardingBtn" class="btn primary">סיום והמשך לדאשבורד</button>
      </div>
      <p class="helper-text subtle">
        <a href="#/dashboard" id="skipToDashboardBtn" class="onboarding-skip-link">דלגו לדאשבורד (מדלגים על ההמלצה לשלבים)</a>
      </p>
    </section>`,
    false,
    true,
    false,
  );

  const nameInput = byId<HTMLInputElement>('onboardPartnerName');
  const focusTa = byId<HTMLTextAreaElement>('onboardWeeklyFocus');
  if (nameInput && localStorage.getItem(LS_PARTNER_DISPLAY_NAME))
    nameInput.value = localStorage.getItem(LS_PARTNER_DISPLAY_NAME) ?? '';
  if (focusTa && localStorage.getItem(LS_WEEKLY_FOCUS)) focusTa.value = localStorage.getItem(LS_WEEKLY_FOCUS) ?? '';

  byId<HTMLAnchorElement>('skipToDashboardBtn')?.addEventListener('click', () => {
    localStorage.setItem(LS_ONBOARDING_DONE, '1');
  });

  byId<HTMLButtonElement>('finishOnboardingBtn')?.addEventListener('click', () => {
    const n = nameInput?.value.trim() ?? '';
    const focus = focusTa?.value.trim() ?? '';
    if (n) localStorage.setItem(LS_PARTNER_DISPLAY_NAME, n);
    else localStorage.removeItem(LS_PARTNER_DISPLAY_NAME);
    if (focus) localStorage.setItem(LS_WEEKLY_FOCUS, focus);
    else localStorage.removeItem(LS_WEEKLY_FOCUS);
    localStorage.setItem(LS_ONBOARDING_DONE, '1');
    toast('ההגדרות נשמרו', 'success');
    location.hash = '#/dashboard';
  });
};

const renderDashboard = () => {
  const platformLabel =
    userRole === 'male'
      ? 'פלטפורמת גבר'
      : userRole === 'female'
        ? 'פלטפורמת אישה'
        : 'פלטפורמה כללית';
  const weeklyFocusNote = localStorage.getItem(LS_WEEKLY_FOCUS)?.trim();
  const focusStrip = weeklyFocusNote
    ? `<div class="entry-note onboarding-focus-reminder"><strong>המיקוד שהגדרתם השבוע</strong><span>${escapeHtml(weeklyFocusNote)}</span></div>`
    : '';
  const maleBlock =
    userRole === 'male'
      ? `<div class="entry-note">
        <strong>עצות לפי החיבור ובת זוג</strong>
        <span>להלן המלצות פרקטיות לפי חיבור זוגי פעיל ולפי מעקב המחזור והתסמינים שבת הזוג מזינה (לא אבחון רפואי).</span>
      </div>
      <div id="maleDashboardMount" class="platform-grid dashboard-male-grid"></div>`
      : '';
  app.innerHTML = shellTemplate(
    `<section class="panel glass page">
      <h2>דאשבורד</h2>
      <p>זהו דף הניהול הראשי שלך.</p>
      <p class="helper-text">
        מתחילים מהתפריט: כלים לשיחה (תרגום רגשי, חירום), מצב רוח ומחזור, ובסוף — טיימליין עם כל מה שקרה לאחרונה באמת.
      </p>
      ${focusStrip}
      <div class="entry-note">
        <strong>${platformLabel}</strong>
        <span>${
          userRole === 'male'
            ? 'ממשק ממוקד להבנת מצבים רגשיים, זיהוי סיכון לריב והמלצות תקשורת — כולל תמונה מעודכנת לפי נתוני בת הזוג כשהחיבור פעיל.'
            : userRole === 'female'
              ? 'ממשק ממוקד לשיקוף מצב רגשי, שיתוף צרכים אישיים והגדרת גבולות תקשורת.'
              : 'ניתן לבחור תפקיד בהרשמה כדי לקבל חוויה מותאמת לגבר או לאישה.'
        }</span>
      </div>
      ${maleBlock}
      <pre id="output"></pre>
    </section>`,
    true,
  );
  bindLogout();
  if (userRole === 'male') {
    void loadMaleDashboardInsights();
  }
};

const renderPlatformPage = () => {
  const isMale = userRole === 'male';
  const isFemale = userRole === 'female';
  app.innerHTML = shellTemplate(
    `<section class="panel glass page">
      <h2>${isMale ? 'פלטפורמת הגבר' : isFemale ? 'פלטפורמת האישה' : 'פלטפורמה מותאמת אישית'}</h2>
      <p class="helper-text">
        ${isMale
          ? 'כאן תקבלו עזרה להבין את הקונטקסט הרגשי ולפעול נכון בזמן רגיש.'
          : isFemale
            ? 'כאן תנהלי את השיתוף הרגשי, תעדכני תחושות ותגדירי מה לשתף עם בן הזוג.'
            : 'בחרו תפקיד בהרשמה לקבלת פלטפורמה ייעודית לגבר או לאישה.'}
      </p>
      <div class="platform-grid">
        ${
          isMale
            ? `
          <article class="platform-card"><h3>AI Survival Assistant</h3><p>המלצות קצרות מה לעשות ומה לא לומר.</p></article>
          <article class="platform-card"><h3>Risk Meter</h3><p>זיהוי רמת סיכון לויכוח: ירוק, צהוב, אדום.</p></article>
          <article class="platform-card"><h3>Emotional Translator</h3><p>פירוש טקסטים והכוונה לתגובה אמפתית.</p></article>
        `
            : isFemale
              ? `
          <article class="platform-card"><h3>מעקב רגשי</h3><p>עדכון תחושות, אנרגיה ותסמינים רלוונטיים.</p></article>
          <article class="platform-card"><h3>העדפות אישיות</h3><p>הגדרת צרכים וגבולות ברורים לתקשורת טובה יותר.</p></article>
          <article class="platform-card"><h3>פרטיות ושיתוף</h3><p>שליטה מלאה על מה משותף ומה נשאר פרטי.</p></article>
        `
              : `
          <article class="platform-card"><h3>בחירת תפקיד</h3><p>כדי להפעיל פלטפורמה ייעודית, הירשמו מחדש ובחרו גבר/אישה.</p></article>
        `
        }
      </div>
    </section>`,
    true,
  );
  bindLogout();
};

const renderConnectPage = () => {
  app.innerHTML = shellTemplate(
    `<section class="panel glass page">
      <h2>חיבור זוגי</h2>
      <p class="helper-text">יצירת בקשת חיבור לזוגיות ואישור/דחייה מהצד השני.</p>
      <div id="connectFormWrap">
        <div class="form-grid">
          <input id="partnerEmail" placeholder="אימייל בן/בת הזוג" />
          <input id="inviteCode" placeholder="קוד הזמנה לחיבור" />
        </div>
        <div class="actions">
          <button id="inviteBtn" class="btn primary">שליחת בקשת חיבור</button>
          <button id="connectBtn" class="btn">אישור לפי קוד</button>
          <button id="loadRequestsBtn" class="btn ghost">טעינת בקשות שממתינות לי</button>
        </div>
      </div>
      <div id="partnerCard" class="platform-grid"></div>
      <div id="requestsList" class="platform-grid"></div>
      <pre id="output"></pre>
    </section>`,
    true,
  );
  bindLogout();

  const loadPartnerDetails = async () => {
    const output = byId<HTMLPreElement>('output');
    const partnerCard = byId<HTMLDivElement>('partnerCard');
    const formWrap = byId<HTMLDivElement>('connectFormWrap');
    if (!output || !partnerCard || !formWrap) return;
    try {
      const data = await api<{
        connected: boolean;
        partner: null | { name: string; email: string; role: string };
      }>('/couples/partner/me');

      if (data.connected && data.partner) {
        const partnerLabel = data.partner.role === 'male' ? 'בן זוג' : 'בת זוג';
        formWrap.style.display = 'none';
        partnerCard.innerHTML = `<article class="platform-card">
            <h3>${partnerLabel} מחובר/ת</h3>
            <p>שם: ${escapeHtml(data.partner.name)}</p>
            <p>אימייל: ${escapeHtml(data.partner.email)}</p>
            <p>מגדר: ${escapeHtml(data.partner.role)}</p>
            <div class="actions">
              <button id="disconnectBtn" class="btn warning">מחיקת חיבור זוגי</button>
            </div>
          </article>`;
        byId<HTMLButtonElement>('disconnectBtn')?.addEventListener('click', async () => {
          const ok = window.confirm(
            'האם למחוק את החיבור הזוגי? פעולה זו תנתק אתכם ותדרוש חיבור מחדש.',
          );
          if (!ok) return;
          try {
            await api('/couples/disconnect', {});
            toast('החיבור הזוגי נמחק', 'success');
            formWrap.style.display = '';
            partnerCard.innerHTML = '';
          } catch (error) {
            output.textContent = String(error);
            toast('מחיקת חיבור נכשלה', 'error');
          }
        });
      } else {
        formWrap.style.display = '';
        partnerCard.innerHTML = '';
      }
      output.textContent = 'loaded';
    } catch (error) {
      output.textContent = String(error);
    }
  };

  void loadPartnerDetails();

  byId<HTMLButtonElement>('inviteBtn')?.addEventListener('click', async () => {
    const output = byId<HTMLPreElement>('output');
    const partnerEmail = byId<HTMLInputElement>('partnerEmail')?.value;
    if (!output || !partnerEmail) return;
    try {
      output.textContent = JSON.stringify(await api('/couples/invite', { partnerEmail }), null, 2);
      toast('הזמנה נוצרה ונשלחה', 'success');
      await loadPartnerDetails();
    } catch (error) {
      output.textContent = String(error);
      toast('יצירת הזמנה נכשלה', 'error');
    }
  });
  byId<HTMLButtonElement>('connectBtn')?.addEventListener('click', async () => {
    const output = byId<HTMLPreElement>('output');
    const inviteCode = byId<HTMLInputElement>('inviteCode')?.value;
    if (!output || !inviteCode) return;
    try {
      output.textContent = JSON.stringify(await api('/couples/connect', { inviteCode }), null, 2);
      toast('החיבור הזוגי הושלם', 'success');
      await loadPartnerDetails();
    } catch (error) {
      output.textContent = String(error);
      toast('חיבור לפי קוד נכשל', 'error');
    }
  });
  byId<HTMLButtonElement>('loadRequestsBtn')?.addEventListener('click', async () => {
    const output = byId<HTMLPreElement>('output');
    const requestsList = byId<HTMLDivElement>('requestsList');
    if (!output || !requestsList) return;
    try {
      const data = await api<{
        requests: Array<{
          _id: string;
          inviteCode: string;
          requestedByUserId?: { name?: string; email?: string };
          expiresAt?: string;
        }>;
      }>('/couples/requests/me');
      requestsList.innerHTML = data.requests.length
        ? data.requests
            .map(
              (req) => `
            <article class="platform-card">
              <h3>בקשת חיבור</h3>
              <p>מאת: ${escapeHtml(req.requestedByUserId?.name || req.requestedByUserId?.email || 'לא ידוע')}</p>
              <p>קוד: ${escapeHtml(req.inviteCode)}</p>
              <p>תוקף עד: ${escapeHtml(req.expiresAt || '-')}</p>
              <div class="actions">
                <button class="btn primary approve-request-btn" data-id="${escapeHtml(req._id)}">אישור</button>
                <button class="btn warning reject-request-btn" data-id="${escapeHtml(req._id)}">דחייה</button>
              </div>
            </article>`,
            )
            .join('')
        : '<article class="platform-card"><p>אין כרגע בקשות ממתינות לאישור.</p></article>';
      output.textContent = 'loaded';
      toast('בקשות נטענו', 'success');
    } catch (error) {
      output.textContent = String(error);
      toast('טעינת בקשות נכשלה', 'error');
    }
  });

  byId<HTMLDivElement>('requestsList')?.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    const output = byId<HTMLPreElement>('output');
    if (!output) return;
    const approveId = target.getAttribute('data-id');
    if (target.classList.contains('approve-request-btn') && approveId) {
      try {
        await api(`/couples/requests/${approveId}/approve`, {});
        toast('בקשה אושרה', 'success');
        await loadPartnerDetails();
      } catch (error) {
        output.textContent = String(error);
        toast('אישור בקשה נכשל', 'error');
      }
    }
    const rejectId = target.getAttribute('data-id');
    if (target.classList.contains('reject-request-btn') && rejectId) {
      try {
        await api(`/couples/requests/${rejectId}/reject`, {});
        toast('בקשה נדחתה', 'success');
        await loadPartnerDetails();
      } catch (error) {
        output.textContent = String(error);
        toast('דחיית בקשה נכשלה', 'error');
      }
    }
  });
};

const renderCyclePage = () => {
  const isFemale = userRole === 'female';
  const isMale = userRole === 'male';
  app.innerHTML = shellTemplate(
    `<section class="panel glass page">
      <h2>מעקב מחזור ותסמינים</h2>
      <p class="helper-text">
        ${isMale
          ? 'עמוד צפייה בלבד: כאן ניתן לראות את נתוני המעקב של בת הזוג, ללא אפשרות עריכה.'
          : 'עמוד ייעודי לרישום תקופת מחזור, אנרגיה ותסמינים לצורך תובנות רגישות.'}
      </p>
      ${
        isMale
          ? ''
          : `<div class="form-grid">
        <label for="cycleStart">תאריך תחילת מחזור</label>
        <input id="cycleStart" type="date" ${isFemale ? '' : 'disabled'} />
        <label for="cycleEnd">תאריך סיום מחזור (אופציונלי)</label>
        <input id="cycleEnd" type="date" ${isFemale ? '' : 'disabled'} />
        <label for="energyLevel">רמת אנרגיה (1-10)</label>
        <input id="energyLevel" type="number" min="1" max="10" placeholder="לדוגמה: 6" ${
          isFemale ? '' : 'disabled'
        } />
        <label for="symptoms">תסמינים</label>
        <input id="symptoms" placeholder="לדוגמה: כאבים, עייפות" ${isFemale ? '' : 'disabled'} />
      </div>`
      }
      <div class="actions">
        ${
          isFemale
            ? '<button id="saveCycleBtn" class="btn primary">שמירת מחזור</button>'
            : ''
        }
      </div>
      <div id="cycleList" class="platform-grid"></div>
      <pre id="output"></pre>
    </section>`,
    true,
  );
  bindLogout();
  const loadCycles = async (showToast = true) => {
    const output = byId<HTMLPreElement>('output');
    const list = byId<HTMLDivElement>('cycleList');
    if (!output) return;
    try {
      const data = await api<{
        entries: Array<{
          startDate: string;
          endDate?: string;
          energyLevel?: number;
          symptoms?: string[];
          createdAt?: string;
        }>;
      }>('/tracking/cycle/view');
      if (list) {
        list.innerHTML = data.entries.length
          ? data.entries
              .map(
                (item) => `
              <article class="platform-card">
                <h3>מחזור מ-${escapeHtml(item.startDate)}</h3>
                <p>סיום: ${escapeHtml(item.endDate || 'לא הוזן')}</p>
                <p>אנרגיה: ${item.energyLevel ?? 'לא הוזן'}</p>
                <p>תסמינים: ${escapeHtml((item.symptoms || []).join(', ') || 'אין')}</p>
              </article>`,
              )
              .join('')
          : `<article class="platform-card"><p>${
              isMale ? 'אין כרגע נתוני מחזור זמינים לצפייה.' : 'אין עדיין נתוני מחזור שמורים.'
            }</p></article>`;
      }
      output.textContent = 'loaded';
      if (showToast) {
        toast('היסטוריית מחזור נטענה אוטומטית', 'success');
      }
    } catch (error) {
      output.textContent = String(error);
      toast('טעינת מחזור נכשלה', 'error');
    }
  };
  if (isFemale) {
    byId<HTMLButtonElement>('saveCycleBtn')?.addEventListener('click', async () => {
      const output = byId<HTMLPreElement>('output');
      const startDate = byId<HTMLInputElement>('cycleStart')?.value;
      const endDate = byId<HTMLInputElement>('cycleEnd')?.value;
      const symptomsRaw = byId<HTMLInputElement>('symptoms')?.value ?? '';
      const energyLevel = Number(byId<HTMLInputElement>('energyLevel')?.value || 0);
      if (!output || !startDate) return;
      try {
        output.textContent = JSON.stringify(
          await api('/tracking/cycle', {
            startDate,
            endDate: endDate || undefined,
            symptoms: symptomsRaw
              .split(',')
              .map((x) => x.trim())
              .filter(Boolean),
            energyLevel: energyLevel || undefined,
          }),
          null,
          2,
        );
        toast('נתוני מחזור נשמרו', 'success');
        await loadCycles(false);
      } catch (error) {
        output.textContent = String(error);
        toast('שמירת מחזור נכשלה', 'error');
      }
    });
  }
  void loadCycles();
};

const renderPreferencesPage = () => {
  app.innerHTML = shellTemplate(
    `<section class="panel glass page">
      <h2>העדפות אישיות ופרטיות</h2>
      <p class="helper-text">הגדרת גבולות תקשורת ומה מותר לשתף עם בן/בת הזוג.</p>
      <div class="form-grid">
        <input id="helpfulActions" placeholder="מה עוזר לי (למשל: שיחה רגועה, חיבוק)" />
        <input id="avoidActions" placeholder="מה לא מתאים לי (למשל: ויכוח בזמן רגיש)" />
        <input id="importantTiming" placeholder="מתי זה חשוב במיוחד (למשל: בערב, לפני שינה, בזמן לחץ)" />
      </div>
      <div class="actions">
        <label><input id="shareMood" type="checkbox" checked /> שיתוף מצב רוח</label>
        <label><input id="shareCycle" type="checkbox" /> שיתוף מחזור</label>
      </div>
      <div class="actions">
        <button id="savePrefsBtn" class="btn primary">שמירת העדפות</button>
        <button id="deletePrefsBtn" class="btn warning">מחיקת העדפות</button>
      </div>
      <div id="prefsView" class="platform-grid"></div>
      <pre id="output"></pre>
    </section>`,
    true,
  );
  bindLogout();
  const loadPreferences = async (showToast = true) => {
    const output = byId<HTMLPreElement>('output');
    const prefsView = byId<HTMLDivElement>('prefsView');
    if (!output) return;
    try {
      const data = await api<{
        preferences?: {
          helpfulActions?: string;
          avoidActions?: string;
          shareMood?: boolean;
          shareCycle?: boolean;
          importantTiming?: string;
        };
      }>('/tracking/preferences/me');
      const p = data.preferences;
      if (p) {
        const helpfulActionsInput = byId<HTMLInputElement>('helpfulActions');
        const avoidActionsInput = byId<HTMLInputElement>('avoidActions');
        const importantTimingInput = byId<HTMLInputElement>('importantTiming');
        const shareMoodInput = byId<HTMLInputElement>('shareMood');
        const shareCycleInput = byId<HTMLInputElement>('shareCycle');
        if (helpfulActionsInput) helpfulActionsInput.value = p.helpfulActions || '';
        if (avoidActionsInput) avoidActionsInput.value = p.avoidActions || '';
        if (importantTimingInput) importantTimingInput.value = p.importantTiming || '';
        if (shareMoodInput) shareMoodInput.checked = Boolean(p.shareMood);
        if (shareCycleInput) shareCycleInput.checked = Boolean(p.shareCycle);
      }
      if (prefsView) {
        prefsView.innerHTML = p
          ? `<article class="platform-card">
              <h3>העדפות שמורות</h3>
              <p>מה עוזר לי: ${escapeHtml(p.helpfulActions || '-')}</p>
              <p>מה להימנע: ${escapeHtml(p.avoidActions || '-')}</p>
              <p>מתי זה חשוב: ${escapeHtml(p.importantTiming || '-')}</p>
              <div class="actions">
                <button id="editPrefsBtn" class="btn ghost">עריכת העדפות</button>
              </div>
            </article>`
          : '<article class="platform-card"><p>אין עדיין העדפות שמורות.</p></article>';
        byId<HTMLButtonElement>('editPrefsBtn')?.addEventListener('click', () => {
          const helpfulActionsInput = byId<HTMLInputElement>('helpfulActions');
          helpfulActionsInput?.focus();
          helpfulActionsInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          toast('מצב עריכה פעיל - עדכנו את השדות ושמרו', 'info');
        });
      }
      output.textContent = 'loaded';
      if (showToast) {
        toast('העדפות נטענו אוטומטית', 'success');
      }
    } catch (error) {
      output.textContent = String(error);
      toast('טעינת העדפות נכשלה', 'error');
    }
  };

  byId<HTMLButtonElement>('savePrefsBtn')?.addEventListener('click', async () => {
    const output = byId<HTMLPreElement>('output');
    if (!output) return;
    try {
      output.textContent = JSON.stringify(
        await api('/tracking/preferences', {
          helpfulActions: byId<HTMLInputElement>('helpfulActions')?.value ?? '',
          avoidActions: byId<HTMLInputElement>('avoidActions')?.value ?? '',
          importantTiming: byId<HTMLInputElement>('importantTiming')?.value ?? '',
          shareMood: byId<HTMLInputElement>('shareMood')?.checked ?? true,
          shareCycle: byId<HTMLInputElement>('shareCycle')?.checked ?? false,
        }),
        null,
        2,
      );
      toast('העדפות נשמרו', 'success');
      await loadPreferences(false);
    } catch (error) {
      output.textContent = String(error);
      toast('שמירת העדפות נכשלה', 'error');
    }
  });

  byId<HTMLButtonElement>('deletePrefsBtn')?.addEventListener('click', async () => {
    const output = byId<HTMLPreElement>('output');
    if (!output) return;
    const ok = window.confirm('למחוק את כל ההעדפות האישיות והפרטיות השמורות?');
    if (!ok) return;
    try {
      await api('/tracking/preferences/delete', {});
      const helpfulActionsInput = byId<HTMLInputElement>('helpfulActions');
      const avoidActionsInput = byId<HTMLInputElement>('avoidActions');
      const importantTimingInput = byId<HTMLInputElement>('importantTiming');
      const shareMoodInput = byId<HTMLInputElement>('shareMood');
      const shareCycleInput = byId<HTMLInputElement>('shareCycle');
      if (helpfulActionsInput) helpfulActionsInput.value = '';
      if (avoidActionsInput) avoidActionsInput.value = '';
      if (importantTimingInput) importantTimingInput.value = '';
      if (shareMoodInput) shareMoodInput.checked = true;
      if (shareCycleInput) shareCycleInput.checked = false;
      toast('העדפות נמחקו', 'success');
      await loadPreferences(false);
    } catch (error) {
      output.textContent = String(error);
      toast('מחיקת העדפות נכשלה', 'error');
    }
  });

  void loadPreferences();
};

const renderAiPage = () => {
  app.innerHTML = shellTemplate(
    `<section class="panel glass page">
      <h2>תרגום רגשי</h2>
      <p class="helper-text">
        הדביקו משפט או קטע מתוך שיחת צ'ט — וננסה להסביר בחום ובבהירות מה כנראה מרגיש הצד השני, ובאיזה כיוון תגובה נכון להתחיל בה.
      </p>
      <textarea id="textInput" rows="4" placeholder="לדוגמה: היא כתבה לי 'סבבה' אחרי ויכוח"></textarea>
      <div class="actions">
        <button id="translateBtn" class="btn primary">נתח הודעה</button>
      </div>
      <div class="qa-grid">
        <article class="qa-card">
          <h3>השאלה שלך</h3>
          <p id="questionBox">עדיין לא הוזנה שאלה.</p>
        </article>
        <article class="qa-card">
          <h3>תשובת ה-AI</h3>
          <p id="answerBox">כאן תופיע התשובה אחרי הניתוח.</p>
        </article>
      </div>
      <pre id="output"></pre>
    </section>`,
    true,
  );
  bindLogout();
  byId<HTMLButtonElement>('translateBtn')?.addEventListener('click', async () => {
    const textInput = byId<HTMLTextAreaElement>('textInput');
    const output = byId<HTMLPreElement>('output');
    const questionBox = byId<HTMLParagraphElement>('questionBox');
    const answerBox = byId<HTMLParagraphElement>('answerBox');
    if (!output || !textInput) return;
    toast('מנתח הודעה...', 'info');
    try {
      const userInput = textInput.value || 'היא כתבה לי סבבה אחרי ויכוח';
      if (questionBox) questionBox.textContent = userInput;
      const response = await api<{ mode: string; result: string }>('/ai/translate', {
        input: userInput,
      });
      if (answerBox) answerBox.textContent = response.result || 'לא התקבלה תשובה.';
      output.textContent = JSON.stringify(response, null, 2);
      toast('ניתוח הושלם', 'success');
    } catch (error) {
      output.textContent = String(error);
      if (answerBox) answerBox.textContent = 'אירעה שגיאה בקבלת תשובה.';
      toast('ניתוח הודעה נכשל', 'error');
    }
  });
};

const renderEmergencyPage = () => {
  app.innerHTML = shellTemplate(
    `<section class="panel glass page">
      <h2>מצב חירום</h2>
      <p class="helper-text">
        כשנשאבתם לריב: כמה מילים על מה שנאמר כרגע — וקבלו ניסוח רגוע וקצר שיעזור לכבות את השריפה במקום להגדיל אותה.
      </p>
      <textarea id="textInput" rows="4" placeholder="תיאור קצר של הוויכוח הנוכחי"></textarea>
      <div class="actions">
        <button id="emergencyBtn" class="btn warning">קבל הנחיית חירום</button>
      </div>
      <div id="emergencyCards" class="qa-grid">
        <article class="qa-card">
          <h3>המצב שתיארת</h3>
          <p id="emergencyQuestion">עדיין לא הוזן תיאור.</p>
        </article>
        <article class="qa-card">
          <h3>תשובת מצב חירום</h3>
          <p id="emergencyAnswer">כאן תופיע הנחיה בזמן אמת.</p>
        </article>
      </div>
      <pre id="output"></pre>
    </section>`,
    true,
  );
  bindLogout();
  byId<HTMLButtonElement>('emergencyBtn')?.addEventListener('click', async () => {
    const textInput = byId<HTMLTextAreaElement>('textInput');
    const output = byId<HTMLPreElement>('output');
    const question = byId<HTMLParagraphElement>('emergencyQuestion');
    const answer = byId<HTMLParagraphElement>('emergencyAnswer');
    if (!output || !textInput) return;
    toast('מכין תגובת הרגעה...', 'info');
    try {
      const userInput = textInput.value || 'אנחנו רבים עכשיו';
      if (question) question.textContent = userInput;
      const response = await api<{ mode: string; result: string }>('/ai/emergency', {
        input: userInput,
      });
      if (answer) answer.textContent = response.result || 'לא התקבלה תשובה.';
      output.textContent = 'loaded';
      toast('התקבלה הנחיית חירום', 'success');
    } catch (error) {
      output.textContent = String(error);
      if (answer) answer.textContent = 'אירעה שגיאה בקבלת הנחיית חירום.';
      toast('מצב חירום נכשל', 'error');
    }
  });
};

const renderAssistantPage = () => {
  app.innerHTML = shellTemplate(
    `<section class="panel glass page">
      <h2>עוזר יומי</h2>
      <p class="helper-text">ארבע שניות לקרוא לפני שמגיבים — כל מה שמתחת נכתב בטון תומך ומציאותי, בלי הפחדה ובלי מהומה.</p>
      <div class="platform-grid">
        <article class="platform-card"><h3>מה כן לעשות היום</h3><p>להתחיל באמפתיה, לשאול איך לעזור, ולהגיב בקצרה וברוגע.</p></article>
        <article class="platform-card"><h3>מה לא לומר היום</h3><p>"את מגזימה", "זה רק הורמונים", "לא עשיתי כלום".</p></article>
        <article class="platform-card"><h3>טיפ הישרדות הומוריסטי</h3><p>אם יש ספק - תה, שוקולד, וחיבוק לפני דיון.</p></article>
      </div>
    </section>`,
    true,
  );
  bindLogout();
};

const renderMoodPage = () => {
  app.innerHTML = shellTemplate(
    `<section class="panel glass page">
      <h2>מעקב מצב רוח</h2>
      <p class="helper-text">
        דירוג מהיר כשאתם מרגישים שהאוויר מתחמם — מאפשר לכם אחר כך לראות אם יש ימים חוזרים שכדאי לדבר עליהם בזוג לאט.
      </p>
      <div class="form-grid">
        <input id="irritabilityInput" type="number" min="1" max="10" value="6" placeholder="רמת עצבנות (1-10)" />
        <input id="fatigueInput" type="number" min="1" max="10" value="5" placeholder="רמת עייפות (1-10)" />
      </div>
      <div class="actions">
        <button id="moodBtn" class="btn primary">שליחת מדד מצב רוח</button>
        <button id="moodHistoryBtn" class="btn ghost">טעינת היסטוריית מצב רוח</button>
      </div>
      <div id="moodList" class="platform-grid"></div>
      <pre id="output"></pre>
    </section>`,
    true,
  );
  bindLogout();
  const loadMoodHistory = async (showToast = true) => {
    const output = byId<HTMLPreElement>('output');
    const moodList = byId<HTMLDivElement>('moodList');
    if (!output) return;
    try {
      const data = await api<{
        entries: Array<{ irritability: number; fatigue: number; note?: string; createdAt?: string }>;
      }>('/tracking/mood/me');
      if (moodList) {
        moodList.innerHTML = data.entries.length
          ? data.entries
              .map(
                (m) => `
                <article class="platform-card">
                  <h3>מדד מצב רוח</h3>
                  <p>עצבנות: ${m.irritability}/10</p>
                  <p>עייפות: ${m.fatigue}/10</p>
                  <p>הערה: ${escapeHtml(m.note || '-')}</p>
                </article>`,
              )
              .join('')
          : '<article class="platform-card"><p>אין עדיין מדדי מצב רוח.</p></article>';
      }
      output.textContent = 'loaded';
      if (showToast) {
        toast('היסטוריית מצב רוח נטענה', 'success');
      }
    } catch (error) {
      output.textContent = String(error);
      toast('טעינת היסטוריה נכשלה', 'error');
    }
  };
  byId<HTMLButtonElement>('moodBtn')?.addEventListener('click', async () => {
    const irritability = Number(byId<HTMLInputElement>('irritabilityInput')?.value ?? 6);
    const fatigue = Number(byId<HTMLInputElement>('fatigueInput')?.value ?? 5);
    const output = byId<HTMLPreElement>('output');
    if (!output) return;
    try {
      output.textContent = JSON.stringify(
        await api('/tracking/mood', { irritability, fatigue, note: 'mood page submit' }),
        null,
        2,
      );
      toast('מדד מצב רוח נשמר', 'success');
      await loadMoodHistory(false);
    } catch (error) {
      output.textContent = String(error);
      toast('שמירת מצב רוח נכשלה', 'error');
    }
  });
  byId<HTMLButtonElement>('moodHistoryBtn')?.addEventListener('click', async () => {
    await loadMoodHistory();
  });
};

const mergeTimelineItems = async (): Promise<TimelineMergedItem[]> => {
  const cyclePath = userRole === 'female' ? '/tracking/cycle/me' : '/tracking/cycle/view';
  const [moodRes, aiRes, cycleRes, goalsRes] = await Promise.all([
    api<{
      entries: Array<{ irritability: number; fatigue: number; note?: string; createdAt?: string }>;
    }>('/tracking/mood/me').catch(() => ({ entries: [] })),
    api<{
      logs: Array<{ mode: string; prompt: string; response: string; createdAt?: string }>;
    }>('/ai/logs/me').catch(() => ({ logs: [] })),
    api<{
      entries: Array<{
        startDate: string;
        endDate?: string;
        symptoms?: string[];
        energyLevel?: number;
        createdAt?: string;
      }>;
    }>(cyclePath).catch(() => ({ entries: [] })),
    api<{ goals: Array<{ title: string; status: string; createdAt?: string }> }>('/tracking/goals/me').catch(
      () => ({ goals: [] }),
    ),
  ]);

  const rows: TimelineMergedItem[] = [];

  for (const m of moodRes.entries) {
    const at = tsFromMaybeDate(m.createdAt);
    rows.push({
      at: at || Date.now(),
      kind: 'mood',
      title: 'מדד מצב רוח',
      body: `עצבנות ${m.irritability}/10 · עייפות ${m.fatigue}/10${m.note ? ` · ${m.note}` : ''}`,
    });
  }

  for (const log of aiRes.logs) {
    const at = tsFromMaybeDate(log.createdAt);
    const isEmerg = log.mode === 'emergency';
    rows.push({
      at: at || Date.now(),
      kind: isEmerg ? 'ai_emergency' : 'ai_translate',
      title: isEmerg ? 'מצב חירום — AI' : 'תרגום רגשי — AI',
      body: `"${log.prompt.slice(0, 140)}${log.prompt.length > 140 ? '…' : ''}" → ${log.response.slice(0, 160)}${log.response.length > 160 ? '…' : ''}`,
    });
  }

  for (const c of cycleRes.entries) {
    const at =
      tsFromMaybeDate(c.createdAt) ||
      tsFromMaybeDate(`${c.startDate}T12:00:00`) ||
      Date.now();
    const sym = (c.symptoms || []).join(', ') || 'לא צוינו';
    rows.push({
      at,
      kind: 'cycle',
      title: 'מעקב מחזור',
      body: `התחלה ${c.startDate}${c.endDate ? ` · סיום ${c.endDate}` : ''} · אנרגיה ${c.energyLevel ?? '—'} · ${sym}`,
    });
  }

  for (const g of goalsRes.goals) {
    const at = tsFromMaybeDate(g.createdAt);
    rows.push({
      at: at || Date.now(),
      kind: 'goal',
      title: g.status === 'completed' ? `יעד הושלם · ${g.title}` : `יעד זוגי · ${g.title}`,
      body: `סטטוס במערכת: ${g.status}`,
    });
  }

  const wk = isoWeekKey();
  const ritualKey = ritualWeekStorageKey(wk);
  const ritualDoneRaw = localStorage.getItem(ritualKey);
  if (ritualDoneRaw) {
    const at = Number(ritualDoneRaw) || 0;
    rows.push({
      at,
      kind: 'ritual',
      title: 'משימת זוגיות שבועית',
      body: `${pickWeeklyRitualText()} (סומן כבוצע)`,
    });
  }

  rows.sort((a, b) => b.at - a.at);
  return rows;
};

const kindIcon = (k: TimelineMergedItem['kind']) => {
  switch (k) {
    case 'mood':
      return 'מצב רוח';
    case 'ai_translate':
      return 'תרגום';
    case 'ai_emergency':
      return 'חירום';
    case 'cycle':
      return 'מחזור';
    case 'goal':
      return 'יעד';
    case 'ritual':
      return 'ריטואל';
    default:
      return 'אירוע';
  }
};

const renderTimelineRows = (items: TimelineMergedItem[]) => {
  if (!items.length) {
    return '<p class="helper-text timeline-empty">אין עדיין אירועים שמופיעים כאן. נסו למדוד מצב רוח, להריץ תרגום רגשי, או להזין מחזור — והכול יתאסף אוטומטית.</p>';
  }
  return `<ol class="timeline-list" role="list">
    ${items
      .map(
        (it) => `
      <li class="timeline-item page-card-stagger" data-kind="${escapeHtml(it.kind)}">
        <div class="timeline-dot" aria-hidden="true"></div>
        <div class="timeline-body">
          <div class="timeline-meta">
            <span class="timeline-badge">${escapeHtml(kindIcon(it.kind))}</span>
            <time datetime="${Number.isFinite(it.at) ? new Date(it.at).toISOString() : ''}">${escapeHtml(formatHebrewTimelineDate(it.at))}</time>
          </div>
          <h3 class="timeline-title">${escapeHtml(it.title)}</h3>
          <p class="timeline-text">${escapeHtml(it.body)}</p>
        </div>
      </li>`,
      )
      .join('')}
  </ol>`;
};

const wireWeeklyRitualControls = () => {
  const txt = byId<HTMLParagraphElement>('ritualSuggestionText');
  const status = byId<HTMLParagraphElement>('ritualStatusLine');
  const btn = byId<HTMLButtonElement>('ritualDoneBtn');
  const update = () => {
    const wk = isoWeekKey();
    const suggestion = pickWeeklyRitualText();
    if (txt) txt.textContent = suggestion;
    const key = ritualWeekStorageKey(wk);
    const done = localStorage.getItem(key);
    if (done && status) {
      status.textContent = `סומן השבוע (${formatHebrewTimelineDate(Number(done) || Date.now())}).`;
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'כבר סומן · תודה!';
      }
    } else {
      if (status) status.textContent = 'עוד לא סומן — אם ביצעתם, לחצו כדי לראות את זה בטיימליין.';
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'סימון: עשינו את זה השבוע';
      }
    }
  };
  update();
  btn?.addEventListener('click', () => {
    const wk = isoWeekKey();
    const key = ritualWeekStorageKey(wk);
    localStorage.setItem(key, String(Date.now()));
    toast('הריטואל נרשם בטיימליין', 'success');
    update();
    void (async () => {
      const mount = byId<HTMLDivElement>('timelineMount');
      if (!mount) return;
      mount.innerHTML = '<p class="helper-text">מרענן…</p>';
      try {
        const items = await mergeTimelineItems();
        mount.innerHTML = renderTimelineRows(items);
        scheduleShellStagger();
      } catch {
        mount.innerHTML = '<p class="helper-text">טעינת טיימליין נכשלה</p>';
      }
    })();
  });
};

const renderTimelinePage = () => {
  app.innerHTML = shellTemplate(
    `<section class="panel glass page timeline-page">
      <h2>טיימליין זוגי</h2>
      <p class="helper-text">
        כל מה שמתרחש אצלכם באפליקציה — מצב רוח, ריצות של AI, יעדים, מחזור והריטואל השבועי — באותו מקום ובסדר כרונולוגי.
      </p>
      <article class="platform-card ritual-card page-card-stagger">
        <h3>משימת זוגיות השבוע</h3>
        <p id="ritualSuggestionText" class="ritual-suggestion"></p>
        <p id="ritualStatusLine" class="helper-text subtle"></p>
        <div class="actions">
          <button id="ritualDoneBtn" type="button" class="btn primary">סימון: עשינו את זה השבוע</button>
        </div>
      </article>
      <div id="timelineMount" class="timeline-mount">
        <p class="helper-text">טוען אירועים…</p>
      </div>
    </section>`,
    true,
  );
  bindLogout();
  wireWeeklyRitualControls();
  void (async () => {
    const mount = byId<HTMLDivElement>('timelineMount');
    if (!mount) return;
    try {
      const items = await mergeTimelineItems();
      mount.innerHTML = renderTimelineRows(items);
      scheduleShellStagger();
    } catch {
      mount.innerHTML =
        '<p class="helper-text">לא הצלחנו למשוך נתונים. בדקו חיבור והתחברות.</p>';
      toast('טעינת טיימליין נכשלה', 'error');
    }
  })();
};

const renderInsightsPage = () => {
  app.innerHTML = shellTemplate(
    `<section class="panel glass page">
      <h2>אינסייטים זוגיים</h2>
      <p class="helper-text">ניתוח דפוסים: טריגרים חוזרים, חלונות רגישות ותגובות שהצליחו.</p>
      <div class="actions">
        <button id="loadAiLogsBtn" class="btn ghost">טעינת היסטוריית AI</button>
      </div>
      <div class="platform-grid">
        <article class="platform-card"><h3>דפוס זוהה</h3><p>מתח עולה בערבים כשיש תגובה מאוחרת להודעות.</p></article>
        <article class="platform-card"><h3>חלון רגיש</h3><p>יומיים עם רגישות גבוהה צפויים בתחילת השבוע הבא.</p></article>
        <article class="platform-card"><h3>תגובה שעבדה</h3><p>הכרה ברגש + הצעת פתרון קצרה הורידה מתח.</p></article>
      </div>
      <div id="aiLogsList" class="platform-grid"></div>
      <pre id="output"></pre>
    </section>`,
    true,
  );
  bindLogout();
  byId<HTMLButtonElement>('loadAiLogsBtn')?.addEventListener('click', async () => {
    const output = byId<HTMLPreElement>('output');
    const aiLogsList = byId<HTMLDivElement>('aiLogsList');
    if (!output) return;
    try {
      const data = await api<{
        logs: Array<{ mode: string; prompt: string; response: string; createdAt?: string }>;
      }>('/ai/logs/me');
      if (aiLogsList) {
        aiLogsList.innerHTML = data.logs.length
          ? data.logs
              .map(
                (log) => `
                <article class="platform-card">
                  <h3>${log.mode === 'emergency' ? 'מצב חירום' : 'תרגום רגשי'}</h3>
                  <p><strong>שאלה:</strong> ${escapeHtml(log.prompt)}</p>
                  <p><strong>תשובה:</strong> ${escapeHtml(log.response)}</p>
                </article>`,
              )
              .join('')
          : '<article class="platform-card"><p>אין עדיין היסטוריית AI.</p></article>';
      }
      output.textContent = 'loaded';
      toast('לוגים של AI נטענו', 'success');
    } catch (error) {
      output.textContent = String(error);
      toast('טעינת לוגים נכשלה', 'error');
    }
  });
};

const renderNotificationsPage = () => {
  app.innerHTML = shellTemplate(
    `<section class="panel glass page">
      <h2>התראות חכמות</h2>
      <p class="helper-text">התראות מצב, חיזוי מתחים וטיפים הומוריסטיים בזמן אמת.</p>
      <div class="actions">
        <label><input id="smartAlerts" type="checkbox" checked /> התראות חכמות</label>
        <label><input id="predictionAlerts" type="checkbox" checked /> התראות חיזוי</label>
        <label><input id="humorAlerts" type="checkbox" checked /> התראות הומור</label>
      </div>
      <div class="actions">
        <button id="saveNotifBtn" class="btn primary">שמירת הגדרות התראות</button>
        <button id="loadNotifBtn" class="btn ghost">טעינת הגדרות</button>
      </div>
      <div id="notifView" class="platform-grid"></div>
      <div class="platform-grid">
        <article class="platform-card"><h3>התראת רגישות</h3><p>זוהתה רגישות גבוהה - עדיף להימנע מדיון מתיש.</p></article>
        <article class="platform-card"><h3>התראת חיזוי</h3><p>סיכוי גבוה למתח בערב. מומלץ זמן איכות קצר.</p></article>
        <article class="platform-card"><h3>התראת הומור</h3><p>זה לא הזמן להוכיח מי צודק. תבחר שלום.</p></article>
      </div>
      <pre id="output"></pre>
    </section>`,
    true,
  );
  bindLogout();
  const loadNotifications = async (showToast = true) => {
    const output = byId<HTMLPreElement>('output');
    const notifView = byId<HTMLDivElement>('notifView');
    if (!output) return;
    try {
      const data = await api<{
        settings?: { smartAlerts?: boolean; predictionAlerts?: boolean; humorAlerts?: boolean };
      }>('/tracking/notifications/me');
      const s = data.settings;
      if (notifView) {
        notifView.innerHTML = s
          ? `<article class="platform-card">
              <h3>הגדרות שמורות</h3>
              <p>התראות חכמות: ${s.smartAlerts ? 'פעיל' : 'כבוי'}</p>
              <p>התראות חיזוי: ${s.predictionAlerts ? 'פעיל' : 'כבוי'}</p>
              <p>התראות הומור: ${s.humorAlerts ? 'פעיל' : 'כבוי'}</p>
            </article>`
          : '<article class="platform-card"><p>אין עדיין הגדרות התראות שמורות.</p></article>';
      }
      output.textContent = 'loaded';
      if (showToast) {
        toast('הגדרות התראות נטענו', 'success');
      }
    } catch (error) {
      output.textContent = String(error);
      toast('טעינת התראות נכשלה', 'error');
    }
  };
  byId<HTMLButtonElement>('saveNotifBtn')?.addEventListener('click', async () => {
    const output = byId<HTMLPreElement>('output');
    if (!output) return;
    try {
      output.textContent = JSON.stringify(
        await api('/tracking/notifications', {
          smartAlerts: byId<HTMLInputElement>('smartAlerts')?.checked ?? true,
          predictionAlerts: byId<HTMLInputElement>('predictionAlerts')?.checked ?? true,
          humorAlerts: byId<HTMLInputElement>('humorAlerts')?.checked ?? true,
        }),
        null,
        2,
      );
      toast('הגדרות התראות נשמרו', 'success');
      await loadNotifications(false);
    } catch (error) {
      output.textContent = String(error);
      toast('שמירת התראות נכשלה', 'error');
    }
  });
  byId<HTMLButtonElement>('loadNotifBtn')?.addEventListener('click', async () => {
    await loadNotifications();
  });
};

const renderGoalsPage = () => {
  app.innerHTML = shellTemplate(
    `<section class="panel glass page">
      <h2>יעדים משותפים</h2>
      <p class="helper-text">הגדרת יעדי זוגיות ומעקב התקדמות שבועי.</p>
      <div class="form-grid">
        <input id="goalTitle" placeholder="כתבו יעד חדש (למשל: שיחה רגועה פעמיים בשבוע)" />
      </div>
      <div class="actions">
        <button id="saveGoalBtn" class="btn primary">שמירת יעד</button>
        <button id="loadGoalsBtn" class="btn ghost">טעינת יעדים</button>
      </div>
      <div id="goalsList" class="platform-grid"></div>
      <div class="platform-grid">
        <article class="platform-card"><h3>יעד 1</h3><p>לנהל שתי שיחות פתוחות בשבוע ללא האשמות.</p></article>
        <article class="platform-card"><h3>יעד 2</h3><p>לשלב פעולה תומכת אחת ביום (מחווה/עזרה).</p></article>
        <article class="platform-card"><h3>Peace Score</h3><p>74/100 - שיפור של 8 נקודות מהשבוע שעבר.</p></article>
      </div>
      <pre id="output"></pre>
    </section>`,
    true,
  );
  bindLogout();
  const loadGoals = async (showToast = true) => {
    const output = byId<HTMLPreElement>('output');
    const goalsList = byId<HTMLDivElement>('goalsList');
    if (!output) return;
    try {
      const data = await api<{ goals: Array<{ title: string; status: string }> }>('/tracking/goals/me');
      if (goalsList) {
        goalsList.innerHTML = data.goals.length
          ? data.goals
              .map(
                (g) => `
                <article class="platform-card">
                  <h3>${escapeHtml(g.title)}</h3>
                  <p>סטטוס: ${escapeHtml(g.status)}</p>
                </article>`,
              )
              .join('')
          : '<article class="platform-card"><p>אין עדיין יעדים שמורים.</p></article>';
      }
      output.textContent = 'loaded';
      if (showToast) {
        toast('יעדים נטענו', 'success');
      }
    } catch (error) {
      output.textContent = String(error);
      toast('טעינת יעדים נכשלה', 'error');
    }
  };
  byId<HTMLButtonElement>('saveGoalBtn')?.addEventListener('click', async () => {
    const output = byId<HTMLPreElement>('output');
    const title = byId<HTMLInputElement>('goalTitle')?.value;
    if (!output || !title) return;
    try {
      output.textContent = JSON.stringify(await api('/tracking/goals', { title }), null, 2);
      toast('יעד נשמר', 'success');
      await loadGoals(false);
    } catch (error) {
      output.textContent = String(error);
      toast('שמירת יעד נכשלה', 'error');
    }
  });
  byId<HTMLButtonElement>('loadGoalsBtn')?.addEventListener('click', async () => {
    await loadGoals();
  });
};

const bindLogout = () => {
  byId<HTMLButtonElement>('menuToggle')?.addEventListener('click', () => {
    byId<HTMLDivElement>('navLinks')?.classList.toggle('open');
  });
  byId<HTMLButtonElement>('logoutBtn')?.addEventListener('click', () => {
    clearSession();
    toast('התנתקת בהצלחה', 'success');
    location.hash = '#/';
  });
};

const protectedRoutes = new Set([
  '#/onboarding',
  '#/dashboard',
  '#/platform',
  '#/connect',
  '#/cycle',
  '#/preferences',
  '#/ai',
  '#/assistant',
  '#/emergency',
  '#/mood',
  '#/timeline',
  '#/insights',
  '#/notifications',
  '#/goals',
]);
const router = () => {
  const route = location.hash || '#/';
  if (protectedRoutes.has(route) && !accessToken) {
    location.hash = '#/login';
    return;
  }
  const maybeStaggerNav = (): void => {
    if (ROUTES_WITH_STAGGER.has(route)) scheduleShellStagger();
  };

  if (route === '#/' || route === '') {
    renderLanding();
    return;
  }
  if (route === '#/register') {
    renderRegister();
    return;
  }
  if (route === '#/login') {
    renderLogin();
    return;
  }
  if (route === '#/onboarding') {
    renderOnboarding();
    return;
  }
  if (route === '#/dashboard') {
    renderDashboard();
    maybeStaggerNav();
    return;
  }
  if (route === '#/platform') {
    renderPlatformPage();
    maybeStaggerNav();
    return;
  }
  if (route === '#/connect') {
    renderConnectPage();
    maybeStaggerNav();
    return;
  }
  if (route === '#/cycle') {
    renderCyclePage();
    maybeStaggerNav();
    return;
  }
  if (route === '#/preferences') {
    renderPreferencesPage();
    maybeStaggerNav();
    return;
  }
  if (route === '#/ai') {
    renderAiPage();
    maybeStaggerNav();
    return;
  }
  if (route === '#/assistant') {
    renderAssistantPage();
    maybeStaggerNav();
    return;
  }
  if (route === '#/emergency') {
    renderEmergencyPage();
    maybeStaggerNav();
    return;
  }
  if (route === '#/mood') {
    renderMoodPage();
    maybeStaggerNav();
    return;
  }
  if (route === '#/timeline') {
    renderTimelinePage();
    maybeStaggerNav();
    return;
  }
  if (route === '#/insights') {
    renderInsightsPage();
    maybeStaggerNav();
    return;
  }
  if (route === '#/notifications') {
    renderNotificationsPage();
    maybeStaggerNav();
    return;
  }
  if (route === '#/goals') {
    renderGoalsPage();
    maybeStaggerNav();
    return;
  }
  app.innerHTML = shellTemplate(`<section class="panel glass page"><h2>העמוד לא נמצא</h2></section>`);
};

window.addEventListener('hashchange', router);
router();

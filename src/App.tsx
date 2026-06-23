import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './index.css';

// ═══════════════════════════════════════════════════════════
// TELEGRAM WEB APP INTEGRATION
// ═══════════════════════════════════════════════════════════
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          button_color?: string;
          button_text_color?: string;
        };
        colorScheme: 'light' | 'dark';
        MainButton: {
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
          setParams: (params: { color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
        HapticFeedback: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        CloudStorage: {
          setItem: (key: string, value: string, callback?: (error: Error | null, stored: boolean) => void) => void;
          getItem: (key: string, callback: (error: Error | null, value: string) => void) => void;
          getItems: (keys: string[], callback: (error: Error | null, values: Record<string, string>) => void) => void;
          removeItem: (key: string, callback?: (error: Error | null, removed: boolean) => void) => void;
          getKeys: (callback: (error: Error | null, keys: string[]) => void) => void;
        };
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        platform: string;
      };
    };
  }
}

const tg = window.Telegram?.WebApp;
const isTelegram = !!tg?.initDataUnsafe?.user;

// ═══════════════════════════════════════════════════════════
// ТИПЫ
// ═══════════════════════════════════════════════════════════
interface CalendarTask {
  id: string;
  name: string;
  attribute: 'strength' | 'intellect' | 'wisdom' | 'charisma';
  checks: Record<string, boolean>;
  xpGranted: Record<string, boolean>;
}

interface RpgTaskStep {
  id: string;
  text: string;
  done: boolean;
}

interface RpgTask {
  id: string;
  name: string;
  description: string;
  attribute: 'strength' | 'intellect' | 'wisdom' | 'charisma';
  difficulty: number;
  steps: RpgTaskStep[];
  completed: boolean;
  createdAt: string;
}

interface CharacterStats {
  strength: number;
  intellect: number;
  wisdom: number;
  charisma: number;
}

interface CharacterData {
  name: string;
  visibleName: string;
  level: number;
  totalXp: number;
  stats: CharacterStats;
}

interface JournalEntry {
  id: string;
  date: string;
  gratitude: string;
  reflection: string;
  lesson: string;
  mood: number;
}

interface FinanceEntry {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  note: string;
}

interface IdeaEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface RoutineItem {
  id: string;
  time: string;
  activity: string;
  days: number[];
}

interface ToastData {
  id: string;
  message: string;
  type: 'xp' | 'levelup' | 'info' | 'negative' | 'error';
  leaving?: boolean;
}

interface Quote {
  text: string;
  author: string;
}

// ═══════════════════════════════════════════════════════════
// КОМПОНЕНТ ЗВЕЗДЫ
// ═══════════════════════════════════════════════════════════
const StarIcon = ({ filled, size = 20 }: { filled: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#e8b020' : '#3a3028'} style={filled ? { filter: 'drop-shadow(0 0 4px rgba(232,176,32,0.6))' } : {}}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

// ═══════════════════════════════════════════════════════════
// КОНСТАНТЫ
// ═══════════════════════════════════════════════════════════
const LATIN_MONTHS = [
  'Ianuarius', 'Februarius', 'Martius', 'Aprilis',
  'Maius', 'Iunius', 'Iulius', 'Augustus',
  'September', 'October', 'November', 'December'
];

const RUS_MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель',
  'Май', 'Июнь', 'Июль', 'Август',
  'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const ATTR_LABELS: Record<string, string> = {
  strength: 'Сила',
  intellect: 'Интеллект',
  wisdom: 'Мудрость',
  charisma: 'Харизма',
};

// Английские названия для отображения
const ATTR_ENGLISH: Record<string, string> = {
  strength: 'STRENGTH',
  intellect: 'INTELLECT',
  wisdom: 'WISDOM',
  charisma: 'CHARISMA',
};

const ATTR_SHORT: Record<string, string> = {
  strength: 'Сил',
  intellect: 'Инт',
  wisdom: 'Муд',
  charisma: 'Хар',
};

const ATTR_ICONS: Record<string, string> = {
  strength: '†',
  intellect: 'Ψ',
  wisdom: 'Ω',
  charisma: '♕',
};

// Тёмные оттенки цветов для диаграммы
const ATTR_COLORS: Record<string, string> = {
  strength: '#8b2020',
  intellect: '#1a5276',
  wisdom: '#1a6b3d',
  charisma: '#9a7b16',
};

// Светлые цвета для текста
const ATTR_COLORS_LIGHT: Record<string, string> = {
  strength: '#c0392b',
  intellect: '#2980b9',
  wisdom: '#27ae60',
  charisma: '#e8b020',
};

const MOOD_LABELS = ['Тьма', 'Тревога', 'Покой', 'Подъём', 'Триумф'];

const DIFFICULTY_XP = [0, 1, 2, 3, 5, 8];
const XP_PER_LEVEL = 20;

const INCOME_CATEGORIES = ['Жалованье', 'Торговля', 'Дары', 'Инвестиции', 'Иное'];
const EXPENSE_CATEGORIES = [
  'Пропитание', 'Жилище', 'Одеяние', 'Обучение', 'Развлечения',
  'Здоровье', 'Транспорт', 'Сбережения', 'Подати', 'Иное'
];

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const toRoman = (n: number): string => {
  if (n <= 0) return '0';
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let result = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i]; }
  }
  return result;
};

const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const isWeekend = (year: number, month: number, day: number) => {
  const d = new Date(year, month, day).getDay();
  return d === 0 || d === 6;
};
const dateKey = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const getLevelImage = (level: number): string => {
  if (level >= 60) return './images/level8.png';
  if (level >= 50) return './images/level7.png';
  if (level >= 35) return './images/level6.png';
  if (level >= 25) return './images/level5.png';
  if (level >= 16) return './images/level4.png';
  if (level >= 9) return './images/level3.png';
  if (level >= 4) return './images/level2.png';
  return './images/level1.png';
};

const getLevelTitle = (level: number): string => {
  if (level >= 60) return 'Divus';
  if (level >= 50) return 'Augustus';
  if (level >= 35) return 'Caesar';
  if (level >= 25) return 'Imperator';
  if (level >= 16) return 'Tribunus';
  if (level >= 9) return 'Centurio';
  if (level >= 4) return 'Legionarius';
  return 'Tiro';
};

const haptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection') => {
  if (!tg?.HapticFeedback) return;
  if (type === 'selection') {
    tg.HapticFeedback.selectionChanged();
  } else if (['success', 'error', 'warning'].includes(type)) {
    tg.HapticFeedback.notificationOccurred(type as 'success' | 'error' | 'warning');
  } else {
    tg.HapticFeedback.impactOccurred(type as 'light' | 'medium' | 'heavy');
  }
};

const storage = {
  set: (key: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      if (tg?.CloudStorage && isTelegram) {
        tg.CloudStorage.setItem(key, value, () => resolve());
      } else {
        localStorage.setItem(key, value);
        resolve();
      }
    });
  },
  get: (key: string): Promise<string | null> => {
    return new Promise((resolve) => {
      if (tg?.CloudStorage && isTelegram) {
        tg.CloudStorage.getItem(key, (err, value) => {
          resolve(err ? null : value || null);
        });
      } else {
        resolve(localStorage.getItem(key));
      }
    });
  }
};

// ═══════════════════════════════════════════════════════════
// DONUT CHART COMPONENT
// ═══════════════════════════════════════════════════════════
const DonutChart = ({ stats }: { stats: CharacterStats }) => {
  const attrs: (keyof CharacterStats)[] = ['strength', 'intellect', 'wisdom', 'charisma'];
  const values = attrs.map(k => stats[k]);
  const total = values.reduce((a, b) => a + b, 0);
  
  // Если все по нулям - не рисуем сегменты
  if (total === 0) {
    return (
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 200 200" className="w-40 h-40 flex-shrink-0">
          <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(232,176,32,0.1)" strokeWidth="30" />
          <circle cx="100" cy="100" r="45" fill="var(--stone)" stroke="var(--gold-dark)" strokeWidth="2" />
          <text x="100" y="95" textAnchor="middle" fill="var(--gold)" fontSize="10" fontFamily="Cormorant SC, serif">
            VIRTUS
          </text>
          <text x="100" y="112" textAnchor="middle" fill="var(--parchment)" fontSize="14" fontWeight="bold" fontFamily="Cormorant SC, serif">
            0
          </text>
        </svg>
        <div className="flex flex-col gap-2">
          {attrs.map(attr => (
            <div key={attr} className="flex items-center gap-2">
              <div className="w-3 h-3" style={{ background: ATTR_COLORS[attr] }} />
              <span className="text-xs font-cinzel-dec" style={{ color: ATTR_COLORS_LIGHT[attr], letterSpacing: '1px' }}>
                {ATTR_ENGLISH[attr]}
              </span>
              <span className="text-xs text-gold ml-1">0</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Вычисляем проценты только для ненулевых значений
  const colors = attrs.map(k => ATTR_COLORS[k]);
  
  // Создаём сегменты
  let cumulativePercent = 0;
  const segments: { path: string; color: string; attr: keyof CharacterStats; value: number }[] = [];
  
  attrs.forEach((attr, i) => {
    const value = stats[attr];
    if (value === 0) return; // Пропускаем нулевые
    
    const percent = (value / total) * 100;
    const startAngle = (cumulativePercent / 100) * 360 - 90;
    cumulativePercent += percent;
    const endAngle = (cumulativePercent / 100) * 360 - 90;
    
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const outerRadius = 80;
    const innerRadius = 50;
    
    const x1Outer = 100 + outerRadius * Math.cos(startRad);
    const y1Outer = 100 + outerRadius * Math.sin(startRad);
    const x2Outer = 100 + outerRadius * Math.cos(endRad);
    const y2Outer = 100 + outerRadius * Math.sin(endRad);
    const x1Inner = 100 + innerRadius * Math.cos(endRad);
    const y1Inner = 100 + innerRadius * Math.sin(endRad);
    const x2Inner = 100 + innerRadius * Math.cos(startRad);
    const y2Inner = 100 + innerRadius * Math.sin(startRad);
    
    const largeArc = percent > 50 ? 1 : 0;
    
    const path = `
      M ${x1Outer} ${y1Outer}
      A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}
      L ${x1Inner} ${y1Inner}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}
      Z
    `;
    
    segments.push({ path, color: colors[i], attr, value });
  });
  
  return (
    <div className="flex items-center gap-4 justify-center">
      <svg viewBox="0 0 200 200" className="w-40 h-40 flex-shrink-0">
        {/* Фоновый круг */}
        <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(232,176,32,0.08)" strokeWidth="30" />
        
        {/* Сегменты */}
        {segments.map((seg, i) => (
          <path
            key={i}
            d={seg.path}
            fill={seg.color}
            stroke="var(--stone)"
            strokeWidth="2"
            style={{ filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.5))' }}
          />
        ))}
        
        {/* Центральный круг */}
        <circle cx="100" cy="100" r="45" fill="var(--stone)" stroke="var(--gold-dark)" strokeWidth="2" />
        
        {/* Текст в центре */}
        <text x="100" y="95" textAnchor="middle" fill="var(--gold)" fontSize="10" fontFamily="Cormorant SC, serif">
          VIRTUS
        </text>
        <text x="100" y="112" textAnchor="middle" fill="var(--parchment)" fontSize="14" fontWeight="bold" fontFamily="Cormorant SC, serif">
          {total}
        </text>
      </svg>
      
      {/* Легенда сбоку */}
      <div className="flex flex-col gap-2">
        {attrs.map(attr => (
          <div key={attr} className="flex items-center gap-2">
            <div className="w-3 h-3" style={{ background: stats[attr] > 0 ? ATTR_COLORS[attr] : '#2a2018' }} />
            <span 
              className="text-xs font-cinzel-dec" 
              style={{ 
                color: stats[attr] > 0 ? ATTR_COLORS_LIGHT[attr] : '#4a4030', 
                letterSpacing: '1px',
                fontWeight: 600
              }}
            >
              {ATTR_ENGLISH[attr]}
            </span>
            <span className="text-xs ml-1" style={{ color: stats[attr] > 0 ? '#e8b020' : '#4a4030' }}>
              {stats[attr]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// ГЛАВНЫЙ КОМПОНЕНТ
// ═══════════════════════════════════════════════════════════
export default function App() {
  const telegramUser = tg?.initDataUnsafe?.user;
  const userId = telegramUser?.id?.toString() || 'local_user';
  const userName = telegramUser?.first_name || 'Воин';

  const [character, setCharacter] = useState<CharacterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'calendar' | 'rpg' | 'journal' | 'finance' | 'ideas'>('calendar');

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calTasks, setCalTasks] = useState<CalendarTask[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const [rpgTasks, setRpgTasks] = useState<RpgTask[]>([]);
  const [showRpgModal, setShowRpgModal] = useState(false);
  const [rpgFilter, setRpgFilter] = useState<string>('all');
  const [rpgStatusFilter, setRpgStatusFilter] = useState<string>('active');

  const [rpgFormName, setRpgFormName] = useState('');
  const [rpgFormDesc, setRpgFormDesc] = useState('');
  const [rpgFormAttr, setRpgFormAttr] = useState<'strength' | 'intellect' | 'wisdom' | 'charisma'>('strength');
  const [rpgFormDiff, setRpgFormDiff] = useState(1);
  const [rpgFormSteps, setRpgFormSteps] = useState<string[]>(['']);

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [journalDate, setJournalDate] = useState(dateKey(now.getFullYear(), now.getMonth(), now.getDate()));
  const [journalGratitude, setJournalGratitude] = useState('');
  const [journalReflection, setJournalReflection] = useState('');
  const [journalLesson, setJournalLesson] = useState('');
  const [journalMood, setJournalMood] = useState(3);
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);

  const [ideas, setIdeas] = useState<IdeaEntry[]>([]);
  const [showIdeaModal, setShowIdeaModal] = useState(false);
  const [editingIdea, setEditingIdea] = useState<IdeaEntry | null>(null);
  const [ideaFormTitle, setIdeaFormTitle] = useState('');
  const [ideaFormContent, setIdeaFormContent] = useState('');

  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [routineFormTime, setRoutineFormTime] = useState('08:00');
  const [routineFormActivity, setRoutineFormActivity] = useState('');
  const [routineFormDays, setRoutineFormDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [showRoutineSection, setShowRoutineSection] = useState(false);

  const [finEntries, setFinEntries] = useState<FinanceEntry[]>([]);
  const [finMonth, setFinMonth] = useState(now.getMonth());
  const [finYear, setFinYear] = useState(now.getFullYear());
  const [showFinModal, setShowFinModal] = useState(false);
  const [finFormType, setFinFormType] = useState<'income' | 'expense'>('expense');
  const [finFormCategory, setFinFormCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [finFormAmount, setFinFormAmount] = useState('');
  const [finFormNote, setFinFormNote] = useState('');
  const [finFormDate, setFinFormDate] = useState(dateKey(now.getFullYear(), now.getMonth(), now.getDate()));

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const [toasts, setToasts] = useState<ToastData[]>([]);
  const toastTimeoutsRef = useRef<Map<string, number>>(new Map());

  const [showLevelUp, setShowLevelUp] = useState(false);
  const prevLevelRef = useRef<number>(0);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  // Загрузка цитат - исправленный путь
  useEffect(() => {
    fetch('./quotes.txt')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load quotes');
        return res.text();
      })
      .then(text => {
        const lines = text.split('\n').filter(line => line.trim());
        const parsed = lines.map(line => {
          const [text, author] = line.split('|');
          return { text: text?.trim() || '', author: author?.trim() || 'Неизвестный' };
        }).filter(q => q.text);
        if (parsed.length > 0) {
          setQuotes(parsed);
          setQuoteIndex(Math.floor(Math.random() * parsed.length));
        }
      })
      .catch(() => {
        // Fallback quotes
        setQuotes([
          { text: 'Делай что должен — и будь что будет.', author: 'Марк Аврелий' },
          { text: 'Тот непобедим, кто победил самого себя.', author: 'Сенека' },
          { text: 'Разделяй и властвуй.', author: 'Гай Юлий Цезарь' },
        ]);
      });
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const charData = await storage.get(`acta_char_${userId}`);
        if (charData) {
          const parsed = JSON.parse(charData);
          setCharacter(parsed);
          prevLevelRef.current = parsed.level;
        } else {
          const newChar: CharacterData = {
            name: userId,
            visibleName: userName,
            level: 1,
            totalXp: 4,
            stats: { strength: 1, intellect: 1, wisdom: 1, charisma: 1 },
          };
          setCharacter(newChar);
          prevLevelRef.current = 1;
          await storage.set(`acta_char_${userId}`, JSON.stringify(newChar));
        }

        const calData = await storage.get(`acta_cal_${userId}`);
        if (calData) setCalTasks(JSON.parse(calData));

        const rpgData = await storage.get(`acta_rpg_${userId}`);
        if (rpgData) setRpgTasks(JSON.parse(rpgData));

        const jData = await storage.get(`acta_journal_${userId}`);
        if (jData) setJournalEntries(JSON.parse(jData));

        const fData = await storage.get(`acta_finance_${userId}`);
        if (fData) setFinEntries(JSON.parse(fData));

        const iData = await storage.get(`acta_ideas_${userId}`);
        if (iData) setIdeas(JSON.parse(iData));

        const rData = await storage.get(`acta_routines_${userId}`);
        if (rData) setRoutines(JSON.parse(rData));
      } catch (e) {
        console.error('Load error:', e);
      }
      setIsLoading(false);
    };
    loadData();
  }, [userId, userName]);

  const saveCharacter = useCallback(async (ch: CharacterData) => {
    setCharacter(ch);
    await storage.set(`acta_char_${userId}`, JSON.stringify(ch));
  }, [userId]);

  useEffect(() => {
    if (!character || isLoading) return;
    storage.set(`acta_cal_${userId}`, JSON.stringify(calTasks));
  }, [calTasks, userId, character, isLoading]);

  useEffect(() => {
    if (!character || isLoading) return;
    storage.set(`acta_rpg_${userId}`, JSON.stringify(rpgTasks));
  }, [rpgTasks, userId, character, isLoading]);

  useEffect(() => {
    if (!character || isLoading) return;
    storage.set(`acta_journal_${userId}`, JSON.stringify(journalEntries));
  }, [journalEntries, userId, character, isLoading]);

  useEffect(() => {
    if (!character || isLoading) return;
    storage.set(`acta_finance_${userId}`, JSON.stringify(finEntries));
  }, [finEntries, userId, character, isLoading]);

  useEffect(() => {
    if (!character || isLoading) return;
    storage.set(`acta_ideas_${userId}`, JSON.stringify(ideas));
  }, [ideas, userId, character, isLoading]);

  useEffect(() => {
    if (!character || isLoading) return;
    storage.set(`acta_routines_${userId}`, JSON.stringify(routines));
  }, [routines, userId, character, isLoading]);

  useEffect(() => {
    if (quotes.length === 0) return;
    const iv = setInterval(() => {
      setQuoteIndex(i => (i + 1) % quotes.length);
    }, 30000);
    return () => clearInterval(iv);
  }, [quotes.length]);

  const addToast = useCallback((message: string, type: ToastData['type'] = 'info') => {
    const id = uid();
    setToasts(prev => [...prev, { id, message, type }]);
    const timeout = window.setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
      const timeout2 = window.setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
        toastTimeoutsRef.current.delete(id);
      }, 400);
      toastTimeoutsRef.current.set(id + '_leave', timeout2);
    }, 2500);
    toastTimeoutsRef.current.set(id, timeout);
  }, []);

  const grantXp = useCallback((attr: keyof CharacterStats, amount: number) => {
    if (!character) return;

    const newStats = { ...character.stats };
    newStats[attr] = Math.max(0, newStats[attr] + amount);
    const newTotalXp = Math.max(0, character.totalXp + amount);
    const newLevel = Math.floor(newTotalXp / XP_PER_LEVEL) + 1;
    const updated: CharacterData = {
      ...character,
      stats: newStats,
      totalXp: newTotalXp,
      level: newLevel,
    };
    saveCharacter(updated);

    if (amount > 0) {
      haptic('light');
      addToast(`+${amount} ${ATTR_LABELS[attr]}`, 'xp');
    } else {
      addToast(`${amount} ${ATTR_LABELS[attr]}`, 'negative');
    }

    if (newLevel > prevLevelRef.current && prevLevelRef.current > 0) {
      haptic('success');
      setShowLevelUp(true);
      addToast(`LEVEL UP! Уровень ${toRoman(newLevel)}`, 'levelup');
      setTimeout(() => setShowLevelUp(false), 3000);
    }
    prevLevelRef.current = newLevel;
  }, [character, saveCharacter, addToast]);

  const isFutureDate = (year: number, month: number, day: number): boolean => {
    const checkDate = new Date(year, month, day);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return checkDate > today;
  };

  const prevMonth = () => {
    haptic('selection');
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    haptic('selection');
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const toggleCheck = (taskId: string, day: number) => {
    if (isFutureDate(calYear, calMonth, day)) {
      addToast('Нельзя отмечать будущее', 'error');
      return;
    }

    haptic('light');
    const key = dateKey(calYear, calMonth, day);
    const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate());

    setCalTasks(prev => {
      const task = prev.find(t => t.id === taskId);
      if (!task) return prev;
      
      const wasChecked = task.checks[key];
      const newChecks = { ...task.checks };
      const newXpGranted = { ...task.xpGranted };

      if (wasChecked) {
        delete newChecks[key];
        if (key === todayKey && newXpGranted[key]) {
          delete newXpGranted[key];
          setTimeout(() => grantXp(task.attribute, -1), 50);
        }
      } else {
        newChecks[key] = true;
        if (key === todayKey && !newXpGranted[key]) {
          newXpGranted[key] = true;
          setTimeout(() => grantXp(task.attribute, 1), 50);
        }
      }

      return prev.map(t => t.id === taskId ? { ...t, checks: newChecks, xpGranted: newXpGranted } : t);
    });
  };

  const addCalTask = () => {
    haptic('medium');
    const task: CalendarTask = {
      id: uid(),
      name: 'Новая задача',
      attribute: 'strength',
      checks: {},
      xpGranted: {},
    };
    setCalTasks(prev => [...prev, task]);
  };

  const removeCalTask = (id: string) => {
    haptic('light');
    setCalTasks(prev => prev.filter(t => t.id !== id));
  };

  const startEditTask = (id: string, currentName: string) => {
    setEditingTaskId(id);
    setEditingName(currentName);
  };

  const saveEditTask = () => {
    if (!editingTaskId) return;
    setCalTasks(prev => prev.map(t =>
      t.id === editingTaskId ? { ...t, name: editingName || t.name } : t
    ));
    setEditingTaskId(null);
  };

  const changeTaskAttr = (taskId: string, attr: CalendarTask['attribute']) => {
    haptic('selection');
    setCalTasks(prev => prev.map(t => t.id === taskId ? { ...t, attribute: attr } : t));
  };

  const calStats = useMemo(() => {
    let totalChecks = 0;
    const daysCount = daysInMonth(calYear, calMonth);
    const totalPossible = calTasks.length * daysCount;

    calTasks.forEach(t => {
      for (let d = 1; d <= daysCount; d++) {
        const k = dateKey(calYear, calMonth, d);
        if (t.checks[k]) totalChecks++;
      }
    });

    let streak = 0;
    const checkDate = new Date(now);
    while (true) {
      const k = dateKey(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
      const anyChecked = calTasks.some(t => t.checks[k]);
      if (anyChecked) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
      else break;
    }

    const pct = totalPossible > 0 ? Math.round((totalChecks / totalPossible) * 100) : 0;
    return { totalChecks, streak, pct };
  }, [calTasks, calYear, calMonth, now]);

  const createRpgTask = () => {
    if (!rpgFormName.trim()) return;
    haptic('medium');
    const task: RpgTask = {
      id: uid(),
      name: rpgFormName.trim(),
      description: rpgFormDesc.trim(),
      attribute: rpgFormAttr,
      difficulty: rpgFormDiff,
      steps: rpgFormSteps
        .filter(s => s.trim())
        .map(s => ({ id: uid(), text: s.trim(), done: false })),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setRpgTasks(prev => [...prev, task]);
    setRpgFormName('');
    setRpgFormDesc('');
    setRpgFormAttr('strength');
    setRpgFormDiff(1);
    setRpgFormSteps(['']);
    setShowRpgModal(false);
  };

  const toggleRpgStep = (taskId: string, stepId: string) => {
    haptic('light');
    setRpgTasks(prev => prev.map(t => {
      if (t.id !== taskId || t.completed) return t;
      const newSteps = t.steps.map(s =>
        s.id === stepId ? { ...s, done: !s.done } : s
      );
      return { ...t, steps: newSteps };
    }));
  };

  const completeRpgTask = (taskId: string) => {
    haptic('success');
    setRpgTasks(prev => prev.map(t => {
      if (t.id !== taskId || t.completed) return t;
      const xpAmount = DIFFICULTY_XP[t.difficulty] || 1;
      setTimeout(() => grantXp(t.attribute, xpAmount), 50);
      return { ...t, completed: true, steps: t.steps.map(s => ({ ...s, done: true })) };
    }));
  };

  const filteredRpgTasks = useMemo(() => {
    let tasks = [...rpgTasks];
    if (rpgFilter !== 'all') tasks = tasks.filter(t => t.attribute === rpgFilter);
    if (rpgStatusFilter === 'active') tasks = tasks.filter(t => !t.completed);
    else if (rpgStatusFilter === 'completed') tasks = tasks.filter(t => t.completed);
    tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return tasks;
  }, [rpgTasks, rpgFilter, rpgStatusFilter]);

  const currentEntry = useMemo(() =>
    journalEntries.find(e => e.date === journalDate),
    [journalEntries, journalDate]
  );

  useEffect(() => {
    if (currentEntry) {
      setJournalGratitude(currentEntry.gratitude);
      setJournalReflection(currentEntry.reflection);
      setJournalLesson(currentEntry.lesson);
      setJournalMood(currentEntry.mood);
    } else {
      setJournalGratitude('');
      setJournalReflection('');
      setJournalLesson('');
      setJournalMood(3);
    }
  }, [currentEntry, journalDate]);

  const saveJournalEntry = () => {
    haptic('medium');
    const entry: JournalEntry = {
      id: currentEntry?.id || uid(),
      date: journalDate,
      gratitude: journalGratitude,
      reflection: journalReflection,
      lesson: journalLesson,
      mood: journalMood,
    };
    const isNew = !currentEntry;
    setJournalEntries(prev => {
      const filtered = prev.filter(e => e.date !== journalDate);
      return [...filtered, entry].sort((a, b) => b.date.localeCompare(a.date));
    });
    addToast('Запись сохранена', 'info');

    if (isNew && journalGratitude.trim() && journalReflection.trim() && journalLesson.trim()) {
      setTimeout(() => {
        const attrs: (keyof CharacterStats)[] = ['strength', 'intellect', 'wisdom', 'charisma'];
        attrs.forEach((attr, i) => {
          setTimeout(() => grantXp(attr, 1), i * 100);
        });
      }, 200);
    }
  };

  const saveIdea = () => {
    if (!ideaFormTitle.trim()) return;
    haptic('medium');
    
    if (editingIdea) {
      setIdeas(prev => prev.map(idea => 
        idea.id === editingIdea.id 
          ? { ...idea, title: ideaFormTitle, content: ideaFormContent, updatedAt: new Date().toISOString() }
          : idea
      ));
    } else {
      const newIdea: IdeaEntry = {
        id: uid(),
        title: ideaFormTitle.trim(),
        content: ideaFormContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setIdeas(prev => [newIdea, ...prev]);
    }
    
    setIdeaFormTitle('');
    setIdeaFormContent('');
    setEditingIdea(null);
    setShowIdeaModal(false);
    addToast('Идея сохранена', 'info');
  };

  const openEditIdea = (idea: IdeaEntry) => {
    setEditingIdea(idea);
    setIdeaFormTitle(idea.title);
    setIdeaFormContent(idea.content);
    setShowIdeaModal(true);
  };

  const deleteIdea = (id: string) => {
    haptic('light');
    setIdeas(prev => prev.filter(i => i.id !== id));
  };

  const addRoutine = () => {
    if (!routineFormActivity.trim()) return;
    haptic('medium');
    const routine: RoutineItem = {
      id: uid(),
      time: routineFormTime,
      activity: routineFormActivity.trim(),
      days: routineFormDays,
    };
    setRoutines(prev => [...prev, routine].sort((a, b) => a.time.localeCompare(b.time)));
    setRoutineFormTime('08:00');
    setRoutineFormActivity('');
    setRoutineFormDays([0, 1, 2, 3, 4]);
    setShowRoutineModal(false);
  };

  const toggleRoutineDay = (day: number) => {
    setRoutineFormDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const deleteRoutine = (id: string) => {
    haptic('light');
    setRoutines(prev => prev.filter(r => r.id !== id));
  };

  const todayDayIndex = (now.getDay() + 6) % 7;
  const todayRoutines = useMemo(() => 
    routines.filter(r => r.days.includes(todayDayIndex)).sort((a, b) => a.time.localeCompare(b.time)),
    [routines, todayDayIndex]
  );

  const addFinEntry = () => {
    if (!finFormAmount || parseFloat(finFormAmount) <= 0) return;
    haptic('medium');
    const entry: FinanceEntry = {
      id: uid(),
      date: finFormDate,
      type: finFormType,
      category: finFormCategory,
      amount: parseFloat(finFormAmount),
      note: finFormNote,
    };
    setFinEntries(prev => [...prev, entry]);
    setFinFormAmount('');
    setFinFormNote('');
    setShowFinModal(false);
  };

  const removeFinEntry = (id: string) => {
    haptic('light');
    setFinEntries(prev => prev.filter(e => e.id !== id));
  };

  const finMonthEntries = useMemo(() => {
    return finEntries.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === finMonth && d.getFullYear() === finYear;
    });
  }, [finEntries, finMonth, finYear]);

  const finStats = useMemo(() => {
    let income = 0, expense = 0;
    const byCat: Record<string, number> = {};
    finMonthEntries.forEach(e => {
      if (e.type === 'income') income += e.amount;
      else {
        expense += e.amount;
        byCat[e.category] = (byCat[e.category] || 0) + e.amount;
      }
    });
    return { income, expense, balance: income - expense, byCat };
  }, [finMonthEntries]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center stone-texture">
        <div className="text-center fade-in">
          <img src="./images/eagle.png" alt="ACTA" className="w-20 h-20 mx-auto mb-4 object-cover pulse-gold" style={{ borderRadius: 4 }} />
          <h1 className="font-cinzel-dec text-3xl text-gold tracking-widest">ACTA.</h1>
          <p className="text-sm mt-2" style={{ color: '#8a7540' }}>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!character) return null;

  const daysCount = daysInMonth(calYear, calMonth);
  const todayD = now.getDate();
  const isCurrentMonth = calYear === now.getFullYear() && calMonth === now.getMonth();
  const xpForNextLevel = XP_PER_LEVEL;
  const currentLevelXp = character.totalXp % XP_PER_LEVEL;
  const xpPct = Math.round((currentLevelXp / xpForNextLevel) * 100);
  const PIE_COLORS = ['#8b2020', '#1a5276', '#1a6b3d', '#9a7b16', '#5a2d82', '#8b4513', '#0e524a', '#8b3030', '#8b6914', '#0e6b5a'];

  return (
    <div className="min-h-screen stone-texture flex flex-col">
      {/* ШАПКА */}
      <header className="border-b-2 border-blood bg-gradient-to-b from-blood-dark to-stone">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="./images/eagle.png" alt="ACTA" className="w-10 h-10 object-cover" style={{ borderRadius: 2 }} />
            <div>
              <h1 className="font-cinzel-dec text-gold text-lg tracking-widest" style={{ fontWeight: 700 }}>ACTA.</h1>
              <p className="text-xs font-cinzel" style={{ color: '#b8860b' }}>
                {getLevelTitle(character.level)} · {toRoman(character.level)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-gold font-cinzel text-sm">{character.visibleName}</p>
              <p className="text-xs" style={{ color: '#8a7540' }}>XP: {character.totalXp}</p>
            </div>
            <img
              src={getLevelImage(character.level)}
              alt="Avatar"
              className="w-10 h-10 avatar-ring object-cover"
              style={{ borderRadius: 4 }}
            />
          </div>
        </div>
      </header>

      <main className="px-3 py-4 flex-1">
        {/* КАЛЕНДАРЬ */}
        {activeTab === 'calendar' && (
          <div className="fade-in">
            <div className="flex items-center justify-between mb-4">
              <button className="roman-btn-primary text-lg px-4 py-2" onClick={prevMonth}>◂</button>
              <div className="text-center">
                <h2 className="font-cinzel-dec text-gold text-xl tracking-wider">
                  {LATIN_MONTHS[calMonth]}
                </h2>
                <p className="font-cinzel text-xs" style={{ color: '#b8860b' }}>
                  {RUS_MONTHS[calMonth]} {calYear}
                </p>
              </div>
              <button className="roman-btn-primary text-lg px-4 py-2" onClick={nextMonth}>▸</button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="stat-card py-2">
                <p className="font-cinzel-dec text-gold text-lg">{calStats.totalChecks}</p>
                <p className="text-xs" style={{ color: '#8a7540' }}>Выполнено</p>
              </div>
              <div className="stat-card py-2">
                <p className="font-cinzel-dec text-gold text-lg">{calStats.streak}</p>
                <p className="text-xs" style={{ color: '#8a7540' }}>Серия</p>
              </div>
              <div className="stat-card py-2">
                <p className="font-cinzel-dec text-gold text-lg">{calStats.pct}%</p>
                <p className="text-xs" style={{ color: '#8a7540' }}>Прогресс</p>
              </div>
            </div>

            <div className="roman-border-heavy overflow-x-auto mb-4">
              <table className="calendar-table">
                <thead>
                  <tr>
                    <th className="task-name-cell font-cinzel text-left" style={{ minWidth: 150 }}>Задача</th>
                    {Array.from({ length: daysCount }, (_, i) => i + 1).map(d => (
                      <th
                        key={d}
                        className={`${isWeekend(calYear, calMonth, d) ? 'weekend-header' : ''} ${isCurrentMonth && d === todayD ? 'today-col' : ''}`}
                      >
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calTasks.map(task => (
                    <tr key={task.id}>
                      <td className="task-name-cell">
                        <div className="flex items-center gap-1">
                          <select
                            className="attr-select-text"
                            value={task.attribute}
                            onChange={e => changeTaskAttr(task.id, e.target.value as CalendarTask['attribute'])}
                            style={{ color: ATTR_COLORS_LIGHT[task.attribute] }}
                          >
                            <option value="strength">{ATTR_SHORT.strength}</option>
                            <option value="intellect">{ATTR_SHORT.intellect}</option>
                            <option value="wisdom">{ATTR_SHORT.wisdom}</option>
                            <option value="charisma">{ATTR_SHORT.charisma}</option>
                          </select>

                          {editingTaskId === task.id ? (
                            <input
                              className="roman-input text-xs py-0 px-1 flex-1"
                              value={editingName}
                              onChange={e => setEditingName(e.target.value)}
                              onBlur={saveEditTask}
                              onKeyDown={e => e.key === 'Enter' && saveEditTask()}
                              autoFocus
                            />
                          ) : (
                            <span
                              className="cursor-pointer hover:text-gold flex-1 truncate text-xs"
                              onClick={() => startEditTask(task.id, task.name)}
                            >
                              {task.name}
                            </span>
                          )}

                          <button className="delete-btn text-xs" onClick={() => removeCalTask(task.id)}>✕</button>
                        </div>
                      </td>
                      {Array.from({ length: daysCount }, (_, i) => i + 1).map(d => {
                        const k = dateKey(calYear, calMonth, d);
                        const checked = !!task.checks[k];
                        const isFuture = isFutureDate(calYear, calMonth, d);
                        return (
                          <td key={d} className={isCurrentMonth && d === todayD ? 'today-col' : ''}>
                            <div
                              className={`check-cell ${checked ? 'checked' : ''} ${isFuture ? 'disabled' : ''}`}
                              onClick={() => !isFuture && toggleCheck(task.id, d)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button className="roman-btn-primary w-full py-3 mb-4" onClick={addCalTask}>
              + Добавить задачу
            </button>

            {/* Распорядок дня - под календарём */}
            <div className="mb-4">
              <button
                className="w-full flex items-center justify-between roman-border p-3"
                onClick={() => setShowRoutineSection(!showRoutineSection)}
              >
                <span className="font-cinzel text-gold text-sm">Распорядок дня</span>
                <span className="text-gold">{showRoutineSection ? '▴' : '▾'}</span>
              </button>
              
              {showRoutineSection && (
                <div className="mt-2 roman-border-heavy p-3">
                  {todayRoutines.length > 0 ? (
                    <>
                      <p className="text-xs mb-2" style={{ color: '#8a7540' }}>Сегодня ({DAY_NAMES[todayDayIndex]}):</p>
                      {todayRoutines.map(r => (
                        <div key={r.id} className="routine-item flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-cinzel text-gold text-sm">{r.time}</span>
                            <span className="text-parchment text-sm">{r.activity}</span>
                          </div>
                          <button className="delete-btn text-xs" onClick={() => deleteRoutine(r.id)}>✕</button>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-xs text-center py-2" style={{ color: '#6a5a40' }}>Нет дел на сегодня</p>
                  )}
                  
                  <button
                    className="roman-btn w-full mt-3 py-2 text-sm"
                    onClick={() => setShowRoutineModal(true)}
                  >
                    + Добавить в распорядок
                  </button>
                </div>
              )}
            </div>

            {showRoutineModal && (
              <div className="modal-overlay" onClick={() => setShowRoutineModal(false)}>
                <div className="modal-content-large" onClick={e => e.stopPropagation()}>
                  <h3 className="font-cinzel-dec text-gold text-lg mb-4 text-center">РАСПОРЯДОК ДНЯ</h3>

                  <input
                    type="time"
                    className="roman-input w-full mb-3 py-2"
                    value={routineFormTime}
                    onChange={e => setRoutineFormTime(e.target.value)}
                  />
                  
                  <input
                    className="roman-input w-full mb-3 py-2"
                    placeholder="Занятие..."
                    value={routineFormActivity}
                    onChange={e => setRoutineFormActivity(e.target.value)}
                  />

                  <p className="text-xs mb-2" style={{ color: '#8a7540' }}>Дни недели:</p>
                  <div className="flex gap-1 mb-4">
                    {DAY_NAMES.map((name, idx) => (
                      <button
                        key={idx}
                        className={`day-chip ${routineFormDays.includes(idx) ? 'active' : ''}`}
                        onClick={() => toggleRoutineDay(idx)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 mb-3 flex-wrap">
                    <button
                      className="roman-btn text-xs flex-1 py-1"
                      onClick={() => setRoutineFormDays([0, 1, 2, 3, 4])}
                    >
                      Будни
                    </button>
                    <button
                      className="roman-btn text-xs flex-1 py-1"
                      onClick={() => setRoutineFormDays([5, 6])}
                    >
                      Выходные
                    </button>
                    <button
                      className="roman-btn text-xs flex-1 py-1"
                      onClick={() => setRoutineFormDays([0, 1, 2, 3, 4, 5, 6])}
                    >
                      Вся неделя
                    </button>
                    <button
                      className="roman-btn text-xs flex-1 py-1"
                      onClick={() => setRoutineFormDays([0, 2, 4])}
                    >
                      Через день
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button className="roman-btn-primary flex-1 py-2" onClick={addRoutine}>Добавить</button>
                    <button className="roman-btn flex-1 py-2" onClick={() => setShowRoutineModal(false)}>Отмена</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RPG / ГЕРОЙ */}
        {activeTab === 'rpg' && (
          <div className="fade-in">
            <div className="roman-border-heavy p-4 mb-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <img
                    src={getLevelImage(character.level)}
                    alt="Hero"
                    className="w-20 h-20 avatar-ring object-cover"
                    style={{ borderRadius: 6 }}
                  />
                  {showLevelUp && (
                    <div className="absolute inset-0 flex items-center justify-center level-up-anim">
                      <span className="font-cinzel-dec text-gold text-sm font-bold">UP!</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-cinzel-dec text-gold text-base">{character.visibleName}</p>
                  <p className="font-cinzel text-sm" style={{ color: '#b8860b' }}>
                    {getLevelTitle(character.level)} · Lvl {toRoman(character.level)}
                  </p>
                  <div className="progress-bar-container mt-2">
                    <div className="progress-bar-fill" style={{ width: `${xpPct}%` }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#8a7540' }}>{currentLevelXp}/{xpForNextLevel} XP</p>
                </div>
              </div>

              {/* Характеристики с латинскими названиями */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {(Object.keys(ATTR_LABELS) as (keyof CharacterStats)[]).map(attr => (
                  <div key={attr} className="text-center p-2" style={{ borderLeft: `2px solid ${ATTR_COLORS[attr]}` }}>
                    <span className="text-lg font-bold" style={{ color: ATTR_COLORS_LIGHT[attr] }}>{ATTR_ICONS[attr]}</span>
                    <p className="font-cinzel text-gold text-sm">{character.stats[attr]}</p>
                    <p className="text-xs font-cinzel-dec" style={{ color: ATTR_COLORS_LIGHT[attr], letterSpacing: '0.5px', fontSize: '0.6rem' }}>
                      {ATTR_ENGLISH[attr]}
                    </p>
                  </div>
                ))}
              </div>

              {/* Donut Chart с легендой сбоку */}
              <DonutChart stats={character.stats} />
            </div>

            <div className="flex gap-2 mb-4">
              <select className="roman-select flex-1 text-sm py-2" value={rpgFilter} onChange={e => setRpgFilter(e.target.value)}>
                <option value="all">Все</option>
                <option value="strength">{ATTR_LABELS.strength}</option>
                <option value="intellect">{ATTR_LABELS.intellect}</option>
                <option value="wisdom">{ATTR_LABELS.wisdom}</option>
                <option value="charisma">{ATTR_LABELS.charisma}</option>
              </select>
              <select className="roman-select flex-1 text-sm py-2" value={rpgStatusFilter} onChange={e => setRpgStatusFilter(e.target.value)}>
                <option value="active">Активные</option>
                <option value="completed">Готовые</option>
                <option value="all">Все</option>
              </select>
            </div>

            {filteredRpgTasks.length === 0 && (
              <div className="text-center py-8" style={{ color: '#6a5a40' }}>
                <p className="font-cinzel text-base mb-2">Задач нет</p>
                <p className="text-sm">Создай первую задачу</p>
              </div>
            )}

            {filteredRpgTasks.map(task => {
              const allStepsDone = task.steps.length === 0 || task.steps.every(s => s.done);
              const canComplete = !task.completed && allStepsDone;
              
              return (
                <div key={task.id} className={`rpg-task-card ${task.completed ? 'completed' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold" style={{ color: ATTR_COLORS_LIGHT[task.attribute] }}>
                          {ATTR_ICONS[task.attribute]}
                        </span>
                        <span className="font-cinzel text-gold text-sm">{task.name}</span>
                      </div>
                      <div className="flex gap-1 mb-2 items-center">
                        {[1, 2, 3, 4, 5].map(s => (
                          <span key={s} className="task-star">
                            <StarIcon filled={s <= task.difficulty} size={14} />
                          </span>
                        ))}
                        <span className="text-xs ml-2" style={{ color: '#8a7540' }}>+{DIFFICULTY_XP[task.difficulty]} XP</span>
                      </div>

                      {task.steps.length > 0 && (
                        <div>
                          {task.steps.map(step => (
                            <div
                              key={step.id}
                              className={`step-item ${step.done ? 'done' : ''}`}
                              onClick={() => !task.completed && toggleRpgStep(task.id, step.id)}
                            >
                              <span className="step-checkbox">{step.done ? '✓' : ''}</span>
                              <span className="step-text text-sm">{step.text}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {canComplete && (
                        <button
                          className="roman-btn-complete mt-3 py-2 text-sm"
                          onClick={() => completeRpgTask(task.id)}
                        >
                          Завершить задачу
                        </button>
                      )}
                    </div>
                    <button
                      className="delete-btn"
                      onClick={() => setRpgTasks(prev => prev.filter(t => t.id !== task.id))}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}

            <button className="roman-btn-primary w-full py-3 mt-4" onClick={() => setShowRpgModal(true)}>
              + Nova Missio
            </button>

            {showRpgModal && (
              <div className="modal-overlay" onClick={() => setShowRpgModal(false)}>
                <div className="modal-content-large" onClick={e => e.stopPropagation()}>
                  <h3 className="font-cinzel-dec text-gold text-lg mb-4 text-center">NOVA MISSIO</h3>

                  <input
                    className="roman-input w-full mb-3 py-2"
                    placeholder="Название..."
                    value={rpgFormName}
                    onChange={e => setRpgFormName(e.target.value)}
                  />
                  
                  <div className="flex gap-2 mb-3">
                    <select className="roman-select flex-1 py-2" value={rpgFormAttr} onChange={e => setRpgFormAttr(e.target.value as typeof rpgFormAttr)}>
                      <option value="strength">{ATTR_LABELS.strength}</option>
                      <option value="intellect">{ATTR_LABELS.intellect}</option>
                      <option value="wisdom">{ATTR_LABELS.wisdom}</option>
                      <option value="charisma">{ATTR_LABELS.charisma}</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs mb-2" style={{ color: '#8a7540' }}>Сложность задачи (больше звёзд = больше XP):</p>
                    <div className="flex gap-3 items-center justify-center">
                      {[1, 2, 3, 4, 5].map(s => (
                        <span
                          key={s}
                          className="difficulty-star cursor-pointer"
                          onClick={() => setRpgFormDiff(s)}
                        >
                          <StarIcon filled={s <= rpgFormDiff} size={32} />
                        </span>
                      ))}
                      <span className="text-sm ml-3 text-gold font-cinzel">+{DIFFICULTY_XP[rpgFormDiff]} XP</span>
                    </div>
                  </div>

                  <p className="text-xs mb-2" style={{ color: '#8a7540' }}>Этапы (необязательно):</p>
                  {rpgFormSteps.map((step, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input
                        className="roman-input flex-1 text-sm py-1"
                        placeholder={`Этап ${idx + 1}...`}
                        value={step}
                        onChange={e => {
                          const newSteps = [...rpgFormSteps];
                          newSteps[idx] = e.target.value;
                          setRpgFormSteps(newSteps);
                        }}
                      />
                      {rpgFormSteps.length > 1 && (
                        <button className="delete-btn" onClick={() => setRpgFormSteps(prev => prev.filter((_, i) => i !== idx))}>✕</button>
                      )}
                    </div>
                  ))}
                  <button className="roman-btn w-full mb-4 py-2 text-sm" onClick={() => setRpgFormSteps(prev => [...prev, ''])}>
                    + Этап
                  </button>

                  <div className="flex gap-2">
                    <button className="roman-btn-primary flex-1 py-2" onClick={createRpgTask}>Создать</button>
                    <button className="roman-btn flex-1 py-2" onClick={() => setShowRpgModal(false)}>Отмена</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ДНЕВНИК */}
        {activeTab === 'journal' && (
          <div className="fade-in">
            <div className="text-center mb-4">
              <h2 className="font-cinzel-dec text-gold text-xl">REFLEXIO</h2>
            </div>

            <input
              type="date"
              className="roman-input w-full text-center mb-4 py-2"
              value={journalDate}
              onChange={e => setJournalDate(e.target.value)}
            />

            <div className="roman-border-heavy p-4 mb-4">
              <p className="text-center text-xs mb-3 font-cinzel" style={{ color: '#8a7540' }}>Состояние духа</p>
              <div className="flex justify-around mb-4">
                {[1, 2, 3, 4, 5].map(m => (
                  <button
                    key={m}
                    className={`mood-btn ${journalMood === m ? 'active' : ''}`}
                    onClick={() => { haptic('selection'); setJournalMood(m); }}
                  >
                    <span className="mood-icon font-cinzel-dec">{toRoman(m)}</span>
                    <span className="mood-label">{MOOD_LABELS[m - 1]}</span>
                  </button>
                ))}
              </div>

              <textarea
                className="journal-textarea mb-3"
                style={{ minHeight: 70 }}
                placeholder="Благодарность..."
                value={journalGratitude}
                onChange={e => setJournalGratitude(e.target.value)}
              />
              <textarea
                className="journal-textarea mb-3"
                style={{ minHeight: 80 }}
                placeholder="Размышления дня..."
                value={journalReflection}
                onChange={e => setJournalReflection(e.target.value)}
              />
              <textarea
                className="journal-textarea mb-4"
                style={{ minHeight: 70 }}
                placeholder="Урок дня..."
                value={journalLesson}
                onChange={e => setJournalLesson(e.target.value)}
              />

              <button className="roman-btn-primary w-full py-3" onClick={saveJournalEntry}>
                Сохранить
              </button>
            </div>

            <p className="text-xs mb-2 font-cinzel" style={{ color: '#8a7540' }}>Прошлые записи:</p>
            {journalEntries.slice(0, 10).map(entry => (
              <div
                key={entry.id}
                className="journal-entry"
                onClick={() => setViewingEntry(entry)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-cinzel text-gold text-sm">{entry.date}</span>
                  <span className="text-sm font-cinzel" style={{ color: '#b8860b' }}>{toRoman(entry.mood)}</span>
                </div>
                {entry.gratitude && (
                  <p className="text-xs mt-1 truncate" style={{ color: '#8a7540' }}>{entry.gratitude}</p>
                )}
              </div>
            ))}

            {viewingEntry && (
              <div className="modal-overlay" onClick={() => setViewingEntry(null)}>
                <div className="modal-content-large" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-cinzel-dec text-gold text-lg">{viewingEntry.date}</h3>
                    <span className="font-cinzel text-gold">{toRoman(viewingEntry.mood)} — {MOOD_LABELS[viewingEntry.mood - 1]}</span>
                  </div>

                  {viewingEntry.gratitude && (
                    <div className="mb-4">
                      <p className="text-xs font-cinzel mb-1" style={{ color: '#8a7540' }}>Благодарность:</p>
                      <p className="text-parchment text-sm">{viewingEntry.gratitude}</p>
                    </div>
                  )}

                  {viewingEntry.reflection && (
                    <div className="mb-4">
                      <p className="text-xs font-cinzel mb-1" style={{ color: '#8a7540' }}>Размышления:</p>
                      <p className="text-parchment text-sm">{viewingEntry.reflection}</p>
                    </div>
                  )}

                  {viewingEntry.lesson && (
                    <div className="mb-4">
                      <p className="text-xs font-cinzel mb-1" style={{ color: '#8a7540' }}>Урок дня:</p>
                      <p className="text-parchment text-sm">{viewingEntry.lesson}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button 
                      className="roman-btn flex-1 py-2" 
                      onClick={() => {
                        setJournalDate(viewingEntry.date);
                        setViewingEntry(null);
                      }}
                    >
                      Редактировать
                    </button>
                    <button className="roman-btn-primary flex-1 py-2" onClick={() => setViewingEntry(null)}>
                      Закрыть
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ИДЕИ */}
        {activeTab === 'ideas' && (
          <div className="fade-in">
            <div className="text-center mb-4">
              <h2 className="font-cinzel-dec text-gold text-xl">COGITATIO</h2>
              <p className="text-xs" style={{ color: '#8a7540' }}>Идеи и замыслы</p>
            </div>

            {ideas.length === 0 && (
              <div className="text-center py-8" style={{ color: '#6a5a40' }}>
                <p className="font-cinzel text-base mb-2">Идей пока нет</p>
                <p className="text-sm">Запиши свои мысли и планы</p>
              </div>
            )}

            {ideas.map(idea => (
              <div
                key={idea.id}
                className="idea-card"
                onClick={() => openEditIdea(idea)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-cinzel text-gold text-sm mb-1">{idea.title}</h4>
                    {idea.content && (
                      <p className="text-xs truncate" style={{ color: '#8a7540' }}>{idea.content}</p>
                    )}
                    <p className="text-xs mt-2" style={{ color: '#5a4a30' }}>
                      {new Date(idea.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    className="delete-btn text-xs"
                    onClick={(e) => { e.stopPropagation(); deleteIdea(idea.id); }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            <button 
              className="roman-btn-primary w-full py-3 mt-4" 
              onClick={() => {
                setEditingIdea(null);
                setIdeaFormTitle('');
                setIdeaFormContent('');
                setShowIdeaModal(true);
              }}
            >
              + Новая идея
            </button>

            {showIdeaModal && (
              <div className="modal-overlay" onClick={() => setShowIdeaModal(false)}>
                <div className="modal-content-large" onClick={e => e.stopPropagation()}>
                  <h3 className="font-cinzel-dec text-gold text-lg mb-4 text-center">
                    {editingIdea ? 'РЕДАКТИРОВАТЬ ИДЕЮ' : 'НОВАЯ ИДЕЯ'}
                  </h3>

                  <input
                    className="roman-input w-full mb-3 py-2"
                    placeholder="Заголовок..."
                    value={ideaFormTitle}
                    onChange={e => setIdeaFormTitle(e.target.value)}
                  />

                  <textarea
                    className="journal-textarea mb-4"
                    style={{ minHeight: 200 }}
                    placeholder="Опиши свою идею подробно..."
                    value={ideaFormContent}
                    onChange={e => setIdeaFormContent(e.target.value)}
                  />

                  <div className="flex gap-2">
                    <button className="roman-btn-primary flex-1 py-2" onClick={saveIdea}>
                      {editingIdea ? 'Сохранить' : 'Создать'}
                    </button>
                    <button className="roman-btn flex-1 py-2" onClick={() => setShowIdeaModal(false)}>Отмена</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ФИНАНСЫ */}
        {activeTab === 'finance' && (
          <div className="fade-in">
            <div className="flex items-center justify-between mb-4">
              <button className="roman-btn-primary px-3 py-2" onClick={() => {
                haptic('selection');
                if (finMonth === 0) { setFinMonth(11); setFinYear(y => y - 1); }
                else setFinMonth(m => m - 1);
              }}>◂</button>
              <div className="text-center">
                <h3 className="font-cinzel text-gold">{RUS_MONTHS[finMonth]}</h3>
                <p className="text-xs" style={{ color: '#8a7540' }}>{finYear}</p>
              </div>
              <button className="roman-btn-primary px-3 py-2" onClick={() => {
                haptic('selection');
                if (finMonth === 11) { setFinMonth(0); setFinYear(y => y + 1); }
                else setFinMonth(m => m + 1);
              }}>▸</button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="stat-card py-2">
                <p className="text-xs" style={{ color: '#8a7540' }}>Доход</p>
                <p className="font-cinzel text-sm finance-positive">{finStats.income.toLocaleString()}</p>
              </div>
              <div className="stat-card py-2">
                <p className="text-xs" style={{ color: '#8a7540' }}>Расход</p>
                <p className="font-cinzel text-sm finance-negative">{finStats.expense.toLocaleString()}</p>
              </div>
              <div className="stat-card py-2">
                <p className="text-xs" style={{ color: '#8a7540' }}>Баланс</p>
                <p className={`font-cinzel text-sm ${finStats.balance >= 0 ? 'finance-positive' : 'finance-negative'}`}>
                  {finStats.balance >= 0 ? '+' : ''}{finStats.balance.toLocaleString()}
                </p>
              </div>
            </div>

            {Object.keys(finStats.byCat).length > 0 && (
              <div className="roman-border p-3 mb-4">
                <div className="flex flex-wrap gap-2">
                  {Object.entries(finStats.byCat).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([cat, val], idx) => (
                    <div key={cat} className="flex items-center gap-1 text-xs">
                      <div className="w-2 h-2" style={{ background: PIE_COLORS[idx] }} />
                      <span>{cat}: {val.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mb-4">
              <button
                className="roman-btn flex-1 py-2"
                onClick={() => { haptic('light'); setFinFormType('income'); setFinFormCategory(INCOME_CATEGORIES[0]); setShowFinModal(true); }}
              >
                + Доход
              </button>
              <button
                className="roman-btn-primary flex-1 py-2"
                onClick={() => { haptic('light'); setFinFormType('expense'); setFinFormCategory(EXPENSE_CATEGORIES[0]); setShowFinModal(true); }}
              >
                + Расход
              </button>
            </div>

            {finMonthEntries.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(entry => (
              <div key={entry.id} className="finance-entry">
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`font-cinzel ${entry.type === 'income' ? 'finance-positive' : 'finance-negative'}`}>
                      {entry.type === 'income' ? '+' : '−'}{entry.amount.toLocaleString()}
                    </span>
                    <span className="text-xs ml-2" style={{ color: '#8a7540' }}>{entry.category}</span>
                  </div>
                  <button className="delete-btn text-xs" onClick={() => removeFinEntry(entry.id)}>✕</button>
                </div>
              </div>
            ))}

            {showFinModal && (
              <div className="modal-overlay" onClick={() => setShowFinModal(false)}>
                <div className="modal-content-large" onClick={e => e.stopPropagation()}>
                  <h3 className="font-cinzel-dec text-gold text-lg mb-4 text-center">
                    {finFormType === 'income' ? 'ДОХОД' : 'РАСХОД'}
                  </h3>

                  <input type="date" className="roman-input w-full mb-3 py-2" value={finFormDate} onChange={e => setFinFormDate(e.target.value)} />
                  <select className="roman-select w-full mb-3 py-2" value={finFormCategory} onChange={e => setFinFormCategory(e.target.value)}>
                    {(finFormType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input type="number" className="roman-input w-full mb-3 py-2" placeholder="Сумма..." value={finFormAmount} onChange={e => setFinFormAmount(e.target.value)} />
                  <input className="roman-input w-full mb-4 py-2" placeholder="Заметка..." value={finFormNote} onChange={e => setFinFormNote(e.target.value)} />

                  <div className="flex gap-2">
                    <button className="roman-btn-primary flex-1 py-2" onClick={addFinEntry}>Добавить</button>
                    <button className="roman-btn flex-1 py-2" onClick={() => setShowFinModal(false)}>Отмена</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ЦИТАТА */}
      {quotes.length > 0 && (
        <div className="px-3 py-4">
          <div className="roman-border px-4 py-4 text-center">
            <p className="italic text-sm" style={{ color: '#c8b888', lineHeight: 1.5 }}>
              «{quotes[quoteIndex]?.text}»
            </p>
            <p className="font-cinzel text-xs mt-2" style={{ color: '#8a7540' }}>
              — {quotes[quoteIndex]?.author}
            </p>
            <button
              className="mt-2 text-xs font-cinzel"
              style={{ color: '#5a4a30', background: 'none', border: 'none', cursor: 'pointer' }}
              onClick={() => setQuoteIndex(i => (i + 1) % quotes.length)}
            >
              ›› Следующая
            </button>
          </div>
        </div>
      )}

      {/* НИЖНЯЯ НАВИГАЦИЯ */}
      <nav className="bottom-nav">
        <div className="flex">
          {([
            ['calendar', 'I', 'Дела'],
            ['rpg', 'II', 'Герой'],
            ['journal', 'III', 'Дневник'],
            ['ideas', 'IV', 'Идеи'],
            ['finance', 'V', 'Казна'],
          ] as const).map(([key, num, label]) => (
            <button
              key={key}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-all ${activeTab === key ? 'text-gold' : ''}`}
              onClick={() => { haptic('selection'); setActiveTab(key); }}
              style={{
                background: activeTab === key ? 'rgba(139,26,26,0.4)' : 'var(--stone)',
                color: activeTab === key ? undefined : '#6a5a40',
              }}
            >
              <span className="text-sm font-cinzel-dec font-bold">{num}</span>
              <span className="text-xs font-cinzel">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ТОСТЫ */}
      <div className="fixed top-16 right-2 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.leaving ? 'toast-out' : 'toast-in'} ${toast.type}`}>
            <p className="font-cinzel text-sm">{toast.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import type { AxisGoal, AxisHabit, AxisProject, AxisState, AxisTask, JournalEntry, MoneyEntry, ProjectStatus, StudySession, TaskCategory, GoalArea, HabitFrequency } from './types';

const STORAGE_KEY = 'axis.personal-data.v1';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TASK_CATEGORIES: TaskCategory[] = ['Pessoal', 'Estudos', 'Projetos', 'Casa', 'Outros'];
const GOAL_AREAS: GoalArea[] = ['Desenvolvimento pessoal', 'Estudos', 'Carreira', 'Finanças', 'Rotina'];
const PROJECT_STATUSES: ProjectStatus[] = ['Ideia', 'Em andamento', 'Pausado', 'Concluído'];
const HABIT_FREQUENCIES: HabitFrequency[] = ['Todos os dias', 'Dias úteis', 'Semanal', 'Quando possível'];

type UnknownRecord = Record<string, unknown>;

export const EMPTY_STATE: AxisState = {
  tasks: [],
  goals: [],
  projects: [],
  studySessions: [],
  habits: [],
  moneyEntries: [],
  journalEntries: [],
  futureVision: { threeMonths: '', oneYear: '', threeYears: '', values: '' },
  notificationsEnabled: false,
};

function record(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function text(value: unknown, max = 2000): value is string {
  return typeof value === 'string' && value.length <= max;
}
function dateText(value: unknown, optional = false): value is string {
  if (optional && value === '') return true;
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}
function validTask(value: unknown): value is AxisTask {
  return record(value) && text(value.id, 180) && !!value.id && text(value.title, 120) && !!value.title.trim()
    && TASK_CATEGORIES.includes(value.category as TaskCategory) && dateText(value.dueDate, true)
    && text(value.reminderAt, 40) && typeof value.completed === 'boolean' && text(value.createdAt, 40);
}
function validGoal(value: unknown): value is AxisGoal {
  return record(value) && text(value.id, 180) && !!value.id && text(value.name, 120) && !!value.name.trim()
    && GOAL_AREAS.includes(value.area as GoalArea) && dateText(value.dueDate, true)
    && typeof value.progress === 'number' && Number.isFinite(value.progress) && value.progress >= 0 && value.progress <= 100
    && text(value.createdAt, 40);
}
function validProject(value: unknown): value is AxisProject {
  return record(value) && text(value.id, 180) && !!value.id && text(value.name, 120) && !!value.name.trim()
    && text(value.description, 1500) && PROJECT_STATUSES.includes(value.status as ProjectStatus)
    && typeof value.progress === 'number' && Number.isFinite(value.progress) && value.progress >= 0 && value.progress <= 100
    && text(value.createdAt, 40);
}
function validStudy(value: unknown): value is StudySession {
  return record(value) && text(value.id, 180) && !!value.id && text(value.subject, 120) && !!value.subject.trim()
    && typeof value.durationMinutes === 'number' && Number.isInteger(value.durationMinutes) && value.durationMinutes >= 1 && value.durationMinutes <= 1440
    && dateText(value.date) && text(value.notes, 1500) && text(value.createdAt, 40);
}
function validHabit(value: unknown): value is AxisHabit {
  return record(value) && text(value.id, 180) && !!value.id && text(value.name, 120) && !!value.name.trim()
    && HABIT_FREQUENCIES.includes(value.frequency as HabitFrequency) && Array.isArray(value.completedDates)
    && value.completedDates.every((date) => dateText(date)) && text(value.createdAt, 40);
}
function validMoney(value: unknown): value is MoneyEntry {
  return record(value) && text(value.id, 180) && !!value.id && (value.type === 'Entrada' || value.type === 'Saída')
    && typeof value.amount === 'number' && Number.isFinite(value.amount) && value.amount > 0
    && text(value.description, 120) && !!value.description.trim() && dateText(value.date) && text(value.createdAt, 40);
}
function validJournal(value: unknown): value is JournalEntry {
  return record(value) && text(value.id, 180) && !!value.id && text(value.title, 120) && !!value.title.trim()
    && text(value.body, 1500) && !!value.body.trim() && dateText(value.date) && text(value.createdAt, 40);
}

export function isValidAxisState(value: unknown): value is AxisState {
  if (!record(value)) return false;
  const arrays = [value.tasks, value.goals, value.projects, value.studySessions, value.habits, value.moneyEntries, value.journalEntries];
  if (!arrays.every(Array.isArray) || typeof value.notificationsEnabled !== 'boolean' || !record(value.futureVision)) return false;
  const vision = value.futureVision;
  return arrays[0].every(validTask) && arrays[1].every(validGoal) && arrays[2].every(validProject)
    && arrays[3].every(validStudy) && arrays[4].every(validHabit) && arrays[5].every(validMoney)
    && arrays[6].every(validJournal)
    && ['threeMonths', 'oneYear', 'threeYears', 'values'].every((key) => text(vision[key], 2000));
}

export function createId(prefix: string): string {
  const value = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${value}`;
}

export function loadAxisState(): { state: AxisState; issue: 'corrupt' | 'unavailable' | null } {
  let stored: string | null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error('Não foi possível acessar o armazenamento local do AXIS.', error);
    return { state: EMPTY_STATE, issue: 'unavailable' };
  }
  if (!stored) return { state: EMPTY_STATE, issue: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch (error) {
    console.error('O conteúdo local do AXIS não é um JSON válido.', error);
    return { state: EMPTY_STATE, issue: 'corrupt' };
  }
  if (!isValidAxisState(parsed)) return { state: EMPTY_STATE, issue: 'corrupt' };
  return { state: parsed, issue: null };
}

export function saveAxisState(state: AxisState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error('Não foi possível salvar os dados locais do AXIS.', error);
    return false;
  }
}

export function clearAxisState(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Não foi possível liberar os dados locais do AXIS.', error);
    return false;
  }
}

export function serializeAxisBackup(state: AxisState): string {
  return JSON.stringify({ format: 'axis-local-backup', version: 1, exportedAt: new Date().toISOString(), data: state }, null, 2);
}

export function parseAxisBackup(raw: string): { state: AxisState; counts: Record<string, number> } | null {
  if (raw.length > 10_000_000) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!record(parsed) || parsed.format !== 'axis-local-backup' || parsed.version !== 1 || !isValidAxisState(parsed.data)) return null;
    const state = parsed.data;
    return {
      state,
      counts: {
        tarefas: state.tasks.length,
        objetivos: state.goals.length,
        projetos: state.projects.length,
        estudos: state.studySessions.length,
        hábitos: state.habits.length,
        lançamentos: state.moneyEntries.length,
        diário: state.journalEntries.length,
      },
    };
  } catch {
    return null;
  }
}

export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function localDateTimeKey(date: Date = new Date()): string {
  return `${localDateKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return 'Sem prazo';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', options ?? { day: 'numeric', month: 'short' }).format(date);
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
}

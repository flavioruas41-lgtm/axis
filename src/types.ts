export type TaskCategory = 'Pessoal' | 'Estudos' | 'Projetos' | 'Casa' | 'Outros';
export type GoalArea = 'Desenvolvimento pessoal' | 'Estudos' | 'Carreira' | 'Finanças' | 'Rotina';
export type ProjectStatus = 'Ideia' | 'Em andamento' | 'Pausado' | 'Concluído';
export type HabitFrequency = 'Todos os dias' | 'Dias úteis' | 'Semanal' | 'Quando possível';

export interface AxisTask {
  id: string;
  title: string;
  category: TaskCategory;
  dueDate: string;
  reminderAt: string;
  completed: boolean;
  createdAt: string;
}

export interface AxisGoal {
  id: string;
  name: string;
  area: GoalArea;
  dueDate: string;
  progress: number;
  createdAt: string;
}

export interface AxisProject {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  createdAt: string;
}

export interface StudySession {
  id: string;
  subject: string;
  durationMinutes: number;
  date: string;
  notes: string;
  createdAt: string;
}

export interface AxisHabit {
  id: string;
  name: string;
  frequency: HabitFrequency;
  completedDates: string[];
  createdAt: string;
}

export interface MoneyEntry {
  id: string;
  type: 'Entrada' | 'Saída';
  amount: number;
  description: string;
  date: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  body: string;
  date: string;
  createdAt: string;
}

export interface FutureVision {
  threeMonths: string;
  oneYear: string;
  threeYears: string;
  values: string;
}

export interface AxisState {
  tasks: AxisTask[];
  goals: AxisGoal[];
  projects: AxisProject[];
  studySessions: StudySession[];
  habits: AxisHabit[];
  moneyEntries: MoneyEntry[];
  journalEntries: JournalEntry[];
  futureVision: FutureVision;
  notificationsEnabled: boolean;
}

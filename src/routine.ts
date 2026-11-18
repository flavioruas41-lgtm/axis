import type { AxisHabit, AxisState } from './types';
import { localDateKey } from './storage';

export type AxisView = 'home' | 'tasks' | 'goals' | 'projects' | 'studies' | 'habits' | 'finance' | 'journal' | 'vision' | 'routine';

export interface RoutineInsight {
  kind: 'alert' | 'focus' | 'good' | 'guide';
  title: string;
  body: string;
  target: AxisView;
  action: string;
}

export function isHabitDoneToday(completedDates: string[], today = localDateKey()): boolean {
  return completedDates.includes(today);
}

export function isHabitDueToday(habit: AxisHabit, date = new Date()): boolean {
  if (habit.frequency === 'Todos os dias') return true;
  if (habit.frequency === 'Dias úteis') return date.getDay() >= 1 && date.getDay() <= 5;
  if (habit.frequency === 'Quando possível') return false;
  const today = localDateKey(date);
  const weekStart = new Date(`${today}T12:00:00`);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const firstDay = localDateKey(weekStart);
  return !habit.completedDates.some((completed) => completed >= firstDay && completed <= today);
}

export function analyzeRoutine(state: AxisState, now = new Date()): RoutineInsight[] {
  const today = localDateKey(now);
  const pending = state.tasks.filter((task) => !task.completed);
  const overdue = pending.filter((task) => task.dueDate && task.dueDate < today);
  const dueToday = pending.filter((task) => task.dueDate === today);
  const nextSevenDays = pending.filter((task) => {
    if (!task.dueDate) return false;
    const due = new Date(`${task.dueDate}T12:00:00`);
    const current = new Date(`${today}T12:00:00`);
    const delta = Math.round((due.getTime() - current.getTime()) / 86_400_000);
    return delta >= 0 && delta < 7;
  });
  const activeGoals = state.goals.filter((goal) => goal.progress < 100);
  const urgentGoals = activeGoals.filter((goal) => {
    if (!goal.dueDate) return false;
    const due = new Date(`${goal.dueDate}T12:00:00`);
    const current = new Date(`${today}T12:00:00`);
    const days = Math.round((due.getTime() - current.getTime()) / 86_400_000);
    return days >= 0 && days <= 14 && goal.progress < 80;
  });
  const overdueGoals = activeGoals.filter((goal) => goal.dueDate && goal.dueDate < today);
  const habitsDue = state.habits.filter((habit) => isHabitDueToday(habit, now));
  const habitsDoneToday = state.habits.filter((habit) => isHabitDoneToday(habit.completedDates, today)).length;
  const weekStart = new Date(`${today}T12:00:00`);
  weekStart.setDate(weekStart.getDate() - 6);
  const firstStudyDate = localDateKey(weekStart);
  const recentStudy = state.studySessions.filter((session) => session.date >= firstStudyDate && session.date <= today);
  const studyMinutes = recentStudy.reduce((total, session) => total + session.durationMinutes, 0);
  const pausedProjects = state.projects.filter((project) => project.status === 'Pausado');
  const insights: RoutineInsight[] = [];

  if (overdue.length > 0) {
    insights.push({
      kind: 'alert',
      title: `${overdue.length} ${overdue.length === 1 ? 'tarefa passou' : 'tarefas passaram'} do prazo`,
      body: 'Revise o que ainda faz sentido e ajuste seu plano. O AXIS não altera prazos por conta própria.',
      target: 'tasks',
      action: 'Revisar tarefas',
    });
  }

  if (dueToday.length >= 3) {
    insights.push({
      kind: 'focus',
      title: 'Seu dia concentra vários prazos',
      body: `${dueToday.length} tarefas pendentes vencem hoje. Escolha a próxima ação antes de acrescentar mais compromissos.`,
      target: 'tasks',
      action: 'Escolher próxima tarefa',
    });
  } else if (dueToday.length > 0) {
    insights.push({
      kind: 'focus',
      title: `${dueToday.length} ${dueToday.length === 1 ? 'prazo é hoje' : 'prazos são hoje'}`,
      body: 'Comece pelo que vence primeiro e marque o andamento quando concluir.',
      target: 'tasks',
      action: 'Ver tarefas de hoje',
    });
  }

  if (overdueGoals.length > 0) {
    const goal = [...overdueGoals].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))[0];
    insights.push({
      kind: 'alert',
      title: `${overdueGoals.length === 1 ? 'Um objetivo' : `${overdueGoals.length} objetivos`} ${overdueGoals.length === 1 ? 'passou' : 'passaram'} do prazo`,
      body: `“${goal.name}” está em ${goal.progress}%. Revise a data ou o próximo passo se suas prioridades mudaram.`,
      target: 'goals',
      action: 'Revisar objetivos',
    });
  }

  if (urgentGoals.length > 0) {
    const goal = [...urgentGoals].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))[0];
    const due = new Date(`${goal.dueDate}T12:00:00`);
    const days = Math.round((due.getTime() - new Date(`${today}T12:00:00`).getTime()) / 86_400_000);
    insights.push({
      kind: 'focus',
      title: 'Um objetivo está perto do prazo',
      body: `“${goal.name}” está em ${goal.progress}% e vence ${days === 0 ? 'hoje' : `em ${days} ${days === 1 ? 'dia' : 'dias'}`}. Talvez valha definir um próximo passo pequeno.`,
      target: 'goals',
      action: 'Rever objetivo',
    });
  }

  const habitsPendingToday = habitsDue.filter((habit) => !isHabitDoneToday(habit.completedDates, today));
  if (habitsPendingToday.length > 0) {
    insights.push({
      kind: 'guide',
      title: `${habitsPendingToday.length} ${habitsPendingToday.length === 1 ? 'hábito continua' : 'hábitos continuam'} sem registro na frequência definida`,
      body: 'Quando fizer sentido no seu dia, marque o que você realizou. O AXIS acompanha sem cobrar perfeição.',
      target: 'habits',
      action: 'Ver hábitos',
    });
  } else if (habitsDoneToday > 0) {
    insights.push({
      kind: 'good',
      title: 'Consistência registrada',
      body: `${habitsDoneToday} ${habitsDoneToday === 1 ? 'hábito concluído' : 'hábitos concluídos'} hoje. Pequenos registros ajudam você a enxergar seu ritmo.`,
      target: 'habits',
      action: 'Acompanhar hábitos',
    });
  }

  if (recentStudy.length > 0) {
    insights.push({
      kind: 'good',
      title: `${recentStudy.length} ${recentStudy.length === 1 ? 'sessão de estudo' : 'sessões de estudo'} nos últimos 7 dias`,
      body: `Você registrou ${studyMinutes} ${studyMinutes === 1 ? 'minuto' : 'minutos'} de estudo.`,
      target: 'studies',
      action: 'Ver estudos',
    });
  } else if (state.studySessions.length > 0) {
    insights.push({
      kind: 'guide',
      title: 'Não há estudo registrado nesta semana',
      body: 'Se estudou, registre uma sessão para acompanhar seu ritmo com base nos seus próprios dados.',
      target: 'studies',
      action: 'Registrar estudo',
    });
  }

  if (pausedProjects.length > 0) {
    insights.push({
      kind: 'guide',
      title: `${pausedProjects.length} ${pausedProjects.length === 1 ? 'projeto está pausado' : 'projetos estão pausados'}`,
      body: 'Reavalie se algum merece ser retomado, ajustado ou mantido em pausa.',
      target: 'projects',
      action: 'Rever projetos',
    });
  }

  if (insights.length === 0 && (pending.length > 0 || nextSevenDays.length > 0)) {
    insights.push({
      kind: 'good',
      title: 'Sua rotina não mostra alertas imediatos',
      body: `${nextSevenDays.length} tarefas têm prazo nos próximos 7 dias. Mantenha seu plano atualizado conforme as prioridades mudarem.`,
      target: 'tasks',
      action: 'Ver próximos prazos',
    });
  }

  if (insights.length === 0) {
    insights.push({
      kind: 'guide',
      title: 'A rotina começa pelos seus registros',
      body: 'Adicione algumas tarefas, hábitos ou sessões. O AXIS usará apenas o que você salvar neste aparelho para encontrar padrões úteis.',
      target: 'tasks',
      action: 'Adicionar uma tarefa',
    });
  }

  return insights.slice(0, 5);
}

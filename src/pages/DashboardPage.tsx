import {
  ArrowRight, Bell, BookOpen, Check, CircleDollarSign, Clock3, FolderKanban,
  Plus, ShieldCheck, Sparkles, Target, CalendarDays, CheckCircle2,
} from 'lucide-react';
import type { AxisState, AxisTask } from '../types';
import type { AxisView, RoutineInsight } from '../routine';
import { isHabitDoneToday } from '../routine';
import { formatDate, localDateKey } from '../storage';
import { Chip, EmptyState, PageHeading, Panel, ProgressBar, StatTile } from '../components/UI';
import type { EntryKind } from '../components/EntryModal';

function dueLabel(task: AxisTask, today: string) {
  if (!task.dueDate) return 'Sem prazo';
  if (task.dueDate < today) return 'Atrasada';
  if (task.dueDate === today) return 'Hoje';
  return formatDate(task.dueDate);
}

export default function DashboardPage({
  state, insights, onNavigate, onAdd, onToggleTask, onToggleHabit, notificationsSupported, onToggleNotifications,
}: {
  state: AxisState;
  insights: RoutineInsight[];
  onNavigate: (view: AxisView) => void;
  onAdd: (kind: EntryKind) => void;
  onToggleTask: (id: string) => void;
  onToggleHabit: (id: string) => void;
  notificationsSupported: boolean;
  onToggleNotifications: () => void;
}) {
  const today = localDateKey();
  const pending = state.tasks.filter((task) => !task.completed);
  const upcoming = [...pending].sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')).slice(0, 4);
  const activeGoals = state.goals.filter((goal) => goal.progress < 100).slice(0, 3);
  const projects = state.projects.filter((project) => project.status === 'Em andamento');
  const habitsDone = state.habits.filter((habit) => isHabitDoneToday(habit.completedDates, today)).length;
  const currentDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  const primaryInsight = insights[0];
  const insightIcon = primaryInsight.kind === 'alert' ? Clock3 : primaryInsight.kind === 'good' ? CheckCircle2 : Sparkles;
  const InsightIcon = insightIcon;

  return (
    <>
      <PageHeading eyebrow={currentDate} title="Olhe para sua direção." description="Um passo claro já é progresso." actions={<button className="button button-primary" onClick={() => onAdd('task')}><Plus size={17} /> Nova tarefa</button>} />

      <section className="welcome-banner">
        <img className="welcome-brand-art" src="/images/axis-brand-symbol.webp" alt="" aria-hidden="true" />
        <div className="welcome-copy"><span className="welcome-kicker"><span className="pulse-dot" /> SEU ESPAÇO, SEU RITMO</span><h2>Comece pelo que<br /><span>importa hoje.</span></h2><p>Escolha o que merece sua atenção. O restante pode esperar.</p><button className="text-link" onClick={() => onNavigate('routine')}>Ver leitura da rotina <ArrowRight size={16} /></button></div>
        <div className="welcome-count"><span>TAREFAS EM ABERTO</span><strong>{pending.length.toString().padStart(2, '0')}</strong><small>{state.tasks.filter((task) => !task.completed && task.dueDate === today).length} com prazo hoje</small></div>
      </section>

      <div className="stat-grid">
        <StatTile icon={CalendarDays} label="Tarefas com prazo hoje" value={state.tasks.filter((task) => task.dueDate === today && !task.completed).length} detail={`${pending.length} tarefas em aberto`} accent />
        <StatTile icon={Target} label="Objetivos ativos" value={state.goals.filter((goal) => goal.progress < 100).length} detail="Em construção" />
        <StatTile icon={FolderKanban} label="Projetos em andamento" value={projects.length} detail="Ideias ganhando forma" />
        <StatTile icon={Check} label="Hábitos de hoje" value={`${habitsDone}/${state.habits.length}`} detail={state.habits.length ? 'Consistência registrada' : 'Comece no seu ritmo'} />
      </div>

      <div className="dashboard-columns">
        <Panel className="today-panel">
          <div className="panel-heading"><div><p className="eyebrow">PARA SEU PRÓXIMO PASSO</p><h2>O que vem agora</h2></div><button className="icon-link" onClick={() => onNavigate('tasks')}>Todas as tarefas <ArrowRight size={15} /></button></div>
          {upcoming.length > 0 ? <div className="task-preview-list">{upcoming.map((task) => {
            const label = dueLabel(task, today);
            return <div className="task-preview" key={task.id}><button className={`task-check${task.completed ? ' checked' : ''}`} onClick={() => onToggleTask(task.id)} aria-label={`Concluir tarefa: ${task.title}`}><span /></button><div className="task-preview-copy"><strong>{task.title}</strong><span>{task.category}</span></div><Chip tone={label === 'Atrasada' ? 'red' : label === 'Hoje' ? 'lime' : 'neutral'}>{label}</Chip></div>;
          })}</div> : <EmptyState icon={CheckCircle2} title="Sem tarefas pendentes" body="Um bom espaço para começar algo novo ou aproveitar uma pausa." action={<button className="button button-soft" onClick={() => onAdd('task')}><Plus size={15} /> Adicionar tarefa</button>} />}
        </Panel>

        <Panel className={`insight-panel insight-${primaryInsight.kind}`}>
          <div className="panel-heading"><div><p className="eyebrow">LEITURA DO AXIS</p><h2>Um sinal para hoje</h2></div><span className="insight-icon"><InsightIcon size={19} /></span></div>
          <div className="insight-content"><p className="insight-title">{primaryInsight.title}</p><p className="insight-body">{primaryInsight.body}</p><button className="text-link" onClick={() => onNavigate(primaryInsight.target)}>{primaryInsight.action} <ArrowRight size={15} /></button></div>
          <div className="local-analysis-note"><ShieldCheck size={14} /><span>Leitura feita neste navegador, com seus registros.</span></div>
        </Panel>
      </div>

      <div className="dashboard-columns dashboard-columns-lower">
        <Panel>
          <div className="panel-heading"><div><p className="eyebrow">CONSTÂNCIA SEM PRESSA</p><h2>Hábitos de hoje</h2></div><button className="icon-link" onClick={() => onNavigate('habits')}>Ver hábitos <ArrowRight size={15} /></button></div>
          {state.habits.length > 0 ? <div className="habit-mini-list">{state.habits.slice(0, 4).map((habit) => {
            const done = isHabitDoneToday(habit.completedDates, today);
            return <button className={`habit-mini${done ? ' done' : ''}`} key={habit.id} onClick={() => onToggleHabit(habit.id)} aria-pressed={done} aria-label={`${done ? 'Desmarcar' : 'Marcar'} hábito ${habit.name} de hoje`}><span className="habit-mini-check">{done && <Check size={13} />}</span><span className="habit-mini-copy"><strong>{habit.name}</strong><small>{habit.frequency}</small></span><span className="habit-mini-action">{done ? 'Feito' : 'Marcar'}</span></button>;
          })}</div> : <EmptyState icon={Sparkles} title="Crie seu primeiro hábito" body="Escolha algo pequeno que gostaria de repetir." action={<button className="button button-soft" onClick={() => onAdd('habit')}><Plus size={15} /> Novo hábito</button>} />}
        </Panel>

        <Panel className="focus-panel">
          <div className="panel-heading"><div><p className="eyebrow">OLHAR ADIANTE</p><h2>Objetivos em foco</h2></div><button className="icon-button" onClick={() => onAdd('goal')} aria-label="Adicionar objetivo"><Plus size={17} /></button></div>
          {activeGoals.length > 0 ? <div className="goal-mini-list">{activeGoals.map((goal) => <button className="goal-mini" key={goal.id} onClick={() => onNavigate('goals')}><div className="goal-mini-top"><span>{goal.name}</span><strong>{goal.progress}%</strong></div><ProgressBar value={goal.progress} ariaLabel={`Progresso do objetivo ${goal.name}: ${goal.progress}%`} /><small>{goal.area}{goal.dueDate ? ` · ${formatDate(goal.dueDate)}` : ''}</small></button>)}</div> : <EmptyState icon={Target} title="O que você quer construir?" body="Transforme uma intenção em um objetivo acompanhável." action={<button className="button button-soft" onClick={() => onAdd('goal')}><Plus size={15} /> Definir objetivo</button>} />}
        </Panel>
      </div>

      <div className="dashboard-footer-grid">
        <button className="quick-action-card" onClick={() => onAdd('study')}><span className="quick-icon quick-blue"><BookOpen size={18} /></span><span><strong>Registrar estudo</strong><small>Anote uma sessão e acompanhe seu tempo.</small></span><ArrowRight size={16} /></button>
        <button className="quick-action-card" onClick={() => onAdd('money')}><span className="quick-icon quick-lime"><CircleDollarSign size={18} /></span><span><strong>Novo lançamento</strong><small>Tenha clareza sobre entradas e saídas.</small></span><ArrowRight size={16} /></button>
        <div className="notification-card"><span className="quick-icon quick-amber"><Bell size={18} /></span><span className="notification-copy"><strong>Lembretes no navegador</strong><small>{state.notificationsEnabled ? 'Ativos com o AXIS aberto.' : 'Funcionam com o AXIS aberto; em segundo plano não há garantia.'}</small></span>{notificationsSupported ? <button className="button button-quiet button-small" onClick={onToggleNotifications}>{state.notificationsEnabled ? 'Desativar' : 'Ativar'}</button> : <span className="notification-unavailable">Indisponível</span>}</div>
      </div>
      <p className="dashboard-timestamp"><Clock3 size={13} /> Análise dos registros deste navegador · {currentDate}</p>
    </>
  );
}

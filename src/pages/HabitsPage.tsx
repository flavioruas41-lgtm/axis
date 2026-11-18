import { useState } from 'react';
import { Check, ChevronDown, Flame, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { AxisHabit } from '../types';
import { isHabitDoneToday } from '../routine';
import { localDateKey } from '../storage';
import { EmptyState, IconButton, PageHeading, Panel } from '../components/UI';
import type { EntryKind } from '../components/EntryModal';

function getLastSevenLocalDates(): { iso: string; shortLabel: string; fullLabel: string }[] {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return {
      iso: `${year}-${month}-${day}`,
      shortLabel: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''),
      fullLabel: new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date),
    };
  });
}

export default function HabitsPage({ habits, onAdd, onEdit, onToggle, onDelete }: {
  habits: AxisHabit[];
  onAdd: (kind: EntryKind) => void;
  onEdit: (habit: AxisHabit) => void;
  onToggle: (id: string, dateISO: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<Set<string>>(() => new Set());
  const today = localDateKey();
  const lastSevenDays = getLastSevenLocalDates();
  const done = habits.filter((habit) => isHabitDoneToday(habit.completedDates, today)).length;
  const pending = habits.length - done;

  function toggleHistory(habitId: string) {
    setExpandedHistoryIds((current) => {
      const next = new Set(current);
      if (next.has(habitId)) next.delete(habitId);
      else next.add(habitId);
      return next;
    });
  }

  return <>
    <PageHeading eyebrow="CONSTÂNCIA DO SEU JEITO" title="Hábitos" description="Não precisa ser perfeito. Só precisa ser seu próximo passo." actions={<button className="button button-primary" onClick={() => onAdd('habit')}><Plus size={17} /> Novo hábito</button>} />
    <div className="habit-progress-banner"><div className="habit-banner-mark"><Flame size={21} /></div><div><span>HOJE, ATÉ AQUI</span><strong>{done} de {habits.length} hábitos registrados</strong><p>{done === habits.length && habits.length ? 'Você marcou tudo por hoje. Reconheça esse momento.' : `${pending} ${pending === 1 ? 'ainda pode ser feito' : 'ainda podem ser feitos'} no seu tempo.`}</p></div><div className="habit-banner-count">{habits.length ? Math.round(done / habits.length * 100) : 0}<small>%</small></div></div>
    <Panel className="habits-panel"><div className="panel-heading"><div><p className="eyebrow">SEU RITMO, SUAS ESCOLHAS</p><h2>Hoje</h2></div><span className="habits-date">{new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date())}</span></div>
      {habits.length ? <div className="habit-list">{habits.map((habit) => {
        const checked = isHabitDoneToday(habit.completedDates, today);
        const historyExpanded = expandedHistoryIds.has(habit.id);
        const historyId = `habit-history-${habit.id}`;
        return <article className={`habit-row${checked ? ' habit-row-done' : ''}`} key={habit.id}>
          <button className={`habit-toggle${checked ? ' checked' : ''}`} aria-label={checked ? `Desmarcar ${habit.name} de hoje` : `Marcar ${habit.name} como feito hoje`} aria-pressed={checked} onClick={() => onToggle(habit.id, today)}>{checked && <Check size={17} />}</button>
          <span className="habit-row-symbol"><Sparkles size={17} /></span>
          <div className="habit-row-content"><strong>{habit.name}</strong><span>{habit.frequency}</span></div>
          <span className={`habit-row-status${checked ? ' complete' : ''}`}>{checked ? 'Feito hoje' : 'No seu tempo'}</span>
          <IconButton icon={Pencil} label={`Editar hábito ${habit.name}`} onClick={() => onEdit(habit)} />
          <IconButton icon={Trash2} label={`Excluir hábito ${habit.name}`} danger onClick={() => onDelete(habit.id)} />
          <section className={`habit-history${historyExpanded ? ' expanded' : ''}`} aria-label={`Últimos sete dias de ${habit.name}`}>
            <div className="habit-history-heading"><strong>Últimos 7 dias</strong><button className="text-link habit-history-expand" aria-expanded={historyExpanded} aria-controls={historyId} onClick={() => toggleHistory(habit.id)}>{historyExpanded ? 'Recolher' : 'Ver detalhes'}<ChevronDown size={15} /></button></div>
            <div className={`habit-history-days${historyExpanded ? ' detailed' : ''}`} id={historyId}>
              {lastSevenDays.map((date) => {
                const dateChecked = habit.completedDates.includes(date.iso);
                const stateLabel = dateChecked ? 'feito' : 'não feito';
                return <button key={date.iso} type="button" className={`habit-history-day${dateChecked ? ' completed' : ''}`} aria-label={`${dateChecked ? 'Desmarcar' : 'Marcar'} ${habit.name} em ${date.fullLabel} como ${dateChecked ? 'não feito' : 'feito'}`} aria-pressed={dateChecked} onClick={() => onToggle(habit.id, date.iso)}><span className="habit-history-day-label">{date.shortLabel}</span><span className="habit-history-day-mark">{dateChecked ? <Check size={13} aria-hidden="true" /> : '·'}</span>{historyExpanded && <span className="habit-history-detail">{date.fullLabel} — {stateLabel}</span>}</button>;
              })}
            </div>
          </section>
        </article>;
      })}</div> : <EmptyState icon={Sparkles} title="Comece por algo que cabe no seu dia" body="Um hábito pode ser pequeno. A ideia é acompanhar, não cobrar." action={<button className="button button-primary" onClick={() => onAdd('habit')}><Plus size={15} /> Criar hábito</button>} />}
    </Panel>
  </>;
}

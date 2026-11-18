import { useMemo, useState } from 'react';
import { Bell, CalendarDays, Check, CheckCircle2, Circle, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { AxisTask, TaskCategory } from '../types';
import { formatDate, localDateKey } from '../storage';
import { Chip, EmptyState, IconButton, PageHeading, Panel } from '../components/UI';
import type { EntryKind } from '../components/EntryModal';

type Filter = 'Todas' | 'Pendentes' | 'Concluídas';

export default function TasksPage({ tasks, onAdd, onToggle, onEdit, onDelete }: {
  tasks: AxisTask[];
  onAdd: (kind: EntryKind) => void;
  onToggle: (id: string) => void;
  onEdit: (task: AxisTask) => void;
  onDelete: (id: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>('Pendentes');
  const [category, setCategory] = useState('Todas');
  const [query, setQuery] = useState('');
  const today = localDateKey();
  const visible = useMemo(() => tasks.filter((task) => {
    if (filter === 'Pendentes' && task.completed) return false;
    if (filter === 'Concluídas' && !task.completed) return false;
    if (category !== 'Todas' && task.category !== category) return false;
    return task.title.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'));
  }).sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
  }), [tasks, filter, category, query]);
  const categories: TaskCategory[] = ['Pessoal', 'Estudos', 'Projetos', 'Casa', 'Outros'];

  return (
    <>
      <PageHeading eyebrow="SEU DIA, EM ORDEM" title="Tarefas" description="Tire da cabeça, coloque no papel e siga um passo por vez." actions={<button className="button button-primary" onClick={() => onAdd('task')}><Plus size={17} /> Nova tarefa</button>} />
      <div className="task-summary-row"><div className="task-summary"><span className="task-summary-icon"><Circle size={18} /></span><span><strong>{tasks.filter((task) => !task.completed).length}</strong><small>pendentes</small></span></div><div className="task-summary"><span className="task-summary-icon task-summary-lime"><CheckCircle2 size={18} /></span><span><strong>{tasks.filter((task) => task.completed).length}</strong><small>concluídas</small></span></div><div className="task-summary-note">O que precisa da sua atenção agora?</div></div>
      <Panel className="task-workspace">
        <div className="task-toolbar">
          <div className="segmented-control" role="tablist" aria-label="Filtrar tarefas">{(['Todas', 'Pendentes', 'Concluídas'] as Filter[]).map((item) => <button key={item} className={filter === item ? 'selected' : ''} role="tab" aria-selected={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div>
          <div className="task-search"><Search size={16} /><input aria-label="Pesquisar tarefas" placeholder="Buscar tarefas" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        </div>
        <div className="category-pills"><button className={category === 'Todas' ? 'selected' : ''} onClick={() => setCategory('Todas')}>Todas as áreas</button>{categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(category === item ? 'Todas' : item)}>{item}</button>)}</div>
        {visible.length ? <div className="task-list">{visible.map((task) => {
          const overdue = !task.completed && task.dueDate && task.dueDate < today;
          const dueToday = task.dueDate === today;
          return <article className={`task-row${task.completed ? ' task-completed' : ''}`} key={task.id}>
            <button className={`task-check${task.completed ? ' checked' : ''}`} onClick={() => onToggle(task.id)} aria-pressed={task.completed} aria-label={`${task.completed ? 'Reabrir' : 'Concluir'} tarefa ${task.title}`}>{task.completed && <Check size={14} />}</button>
            <div className="task-row-copy"><strong>{task.title}</strong><div className="task-row-meta"><Chip>{task.category}</Chip><span className={overdue ? 'task-overdue' : ''}><CalendarDays size={13} />{task.dueDate ? `${overdue ? 'Atrasada · ' : ''}${formatDate(task.dueDate, { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Sem prazo'}</span>{task.reminderAt && <span className="task-reminder"><Bell size={13} /> Lembrete</span>}</div></div>
            {dueToday && !task.completed && <Chip tone="lime">Hoje</Chip>}
            <IconButton icon={Pencil} label={`Editar tarefa ${task.title}`} onClick={() => onEdit(task)} />
            <IconButton icon={Trash2} label={`Excluir tarefa ${task.title}`} danger onClick={() => onDelete(task.id)} />
          </article>;
        })}</div> : <EmptyState icon={filter === 'Concluídas' ? CheckCircle2 : CalendarDays} title={query ? 'Nenhuma tarefa encontrada' : filter === 'Concluídas' ? 'Ainda sem tarefas concluídas' : 'Tudo em dia por aqui'} body={query ? 'Tente buscar por outro termo ou limpar os filtros.' : 'Adicione uma tarefa para dar forma ao próximo passo.'} action={!query && <button className="button button-soft" onClick={() => onAdd('task')}><Plus size={15} /> Nova tarefa</button>} />}
      </Panel>
      <p className="privacy-inline">Seus registros permanecem salvos neste navegador. Eles não são sincronizados com outros dispositivos.</p>
    </>
  );
}

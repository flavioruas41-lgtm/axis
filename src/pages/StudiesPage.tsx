import { useState } from 'react';
import { BookOpen, Clock3, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { StudySession } from '../types';
import { formatDate } from '../storage';
import { EmptyState, IconButton, PageHeading, Panel, StatTile } from '../components/UI';
import type { EntryKind } from '../components/EntryModal';

type StudyPeriod = 'all' | '7' | '30';

function isWithinLastDays(date: string, days: number) {
  const dateKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days + 1);
  return date >= dateKey(cutoff) && date <= dateKey(today);
}

export default function StudiesPage({ sessions, onAdd, onDelete, onEdit }: {
  sessions: StudySession[];
  onAdd: (kind: EntryKind) => void;
  onDelete: (id: string) => void;
  onEdit: (record: StudySession) => void;
}) {
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<StudyPeriod>('all');
  const minutes = sessions.reduce((total, session) => total + session.durationMinutes, 0);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  const timeLabel = hours ? `${hours}h${remainder ? ` ${remainder}min` : ''}` : `${remainder} min`;
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const recent = [...sessions]
    .filter((session) => !normalizedQuery || `${session.subject} ${session.notes}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
    .filter((session) => period === 'all' || isWithinLastDays(session.date, Number(period)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const hasFilters = Boolean(normalizedQuery) || period !== 'all';

  return <>
    <PageHeading eyebrow="APRENDER TAMBÉM É AVANÇAR" title="Estudos" description="Registre o tempo dedicado e reconheça o que você está aprendendo." actions={<button className="button button-primary" onClick={() => onAdd('study')}><Plus size={17} /> Registrar estudo</button>} />
    <div className="stat-grid stat-grid-three"><StatTile icon={BookOpen} label="Sessões registradas" value={sessions.length} detail="Cada bloco conta" accent /><StatTile icon={Clock3} label="Tempo total" value={timeLabel} detail="Somado às suas sessões" /><StatTile icon={BookOpen} label="Assuntos diferentes" value={new Set(sessions.map((item) => item.subject.trim().toLocaleLowerCase('pt-BR'))).size} detail="Exploração em andamento" /></div>
    <Panel className="study-history">
      <div className="panel-heading"><div><p className="eyebrow">SEU HISTÓRICO</p><h2>Sessões recentes</h2></div></div>
      <div className="task-toolbar">
        <label className="task-search"><Search size={15} aria-hidden="true" /><input type="search" aria-label="Pesquisar sessões por assunto ou observação" placeholder="Pesquisar assunto ou observação" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label className="project-status-select"><span>Período</span><select aria-label="Filtrar sessões por período" value={period} onChange={(event) => setPeriod(event.target.value as StudyPeriod)}><option value="all">Todos</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option></select></label>
      </div>
      {recent.length ? <div className="study-list">{recent.map((session) => <article className="study-row" key={session.id}><span className="study-mark"><BookOpen size={17} /></span><div className="study-main"><strong>{session.subject}</strong>{session.notes && <p>{session.notes}</p>}</div><span className="study-duration">{session.durationMinutes} min</span><span className="study-date">{formatDate(session.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span><IconButton icon={Pencil} label={`Editar sessão de ${session.subject}`} onClick={() => onEdit(session)} /><IconButton icon={Trash2} label={`Excluir sessão de ${session.subject}`} danger onClick={() => onDelete(session.id)} /></article>)}</div> : <EmptyState icon={BookOpen} title={hasFilters ? 'Nenhuma sessão encontrada' : 'Seu histórico começa com uma sessão'} body={hasFilters ? 'Ajuste a pesquisa ou o período para ver outras sessões.' : 'Anote o assunto, o tempo e uma observação para acompanhar seu progresso.'} action={!hasFilters ? <button className="button button-soft" onClick={() => onAdd('study')}><Plus size={15} /> Registrar sessão</button> : undefined} />}
    </Panel>
  </>;
}

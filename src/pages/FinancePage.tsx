import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Pencil, Plus, Search, Trash2, Wallet } from 'lucide-react';
import type { MoneyEntry } from '../types';
import { formatDate, formatMoney } from '../storage';
import { EmptyState, IconButton, PageHeading, Panel, StatTile } from '../components/UI';
import type { EntryKind } from '../components/EntryModal';

type FinanceTypeFilter = 'all' | 'Entrada' | 'Saída';
type FinancePeriod = 'all' | '30' | '90';

function isWithinLastDays(date: string, days: number) {
  const dateKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days + 1);
  return date >= dateKey(cutoff) && date <= dateKey(today);
}

export default function FinancePage({ entries, onAdd, onDelete, onEdit }: {
  entries: MoneyEntry[];
  onAdd: (kind: EntryKind) => void;
  onDelete: (id: string) => void;
  onEdit: (record: MoneyEntry) => void;
}) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FinanceTypeFilter>('all');
  const [period, setPeriod] = useState<FinancePeriod>('all');
  const income = entries.filter((entry) => entry.type === 'Entrada').reduce((total, entry) => total + entry.amount, 0);
  const expenses = entries.filter((entry) => entry.type === 'Saída').reduce((total, entry) => total + entry.amount, 0);
  const balance = income - expenses;
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  const sorted = [...entries]
    .filter((entry) => !normalizedQuery || entry.description.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
    .filter((entry) => typeFilter === 'all' || entry.type === typeFilter)
    .filter((entry) => period === 'all' || isWithinLastDays(entry.date, Number(period)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const hasFilters = Boolean(normalizedQuery) || typeFilter !== 'all' || period !== 'all';

  return <>
    <PageHeading eyebrow="CLAREZA PARA DECIDIR" title="Financeiro" description="Acompanhe entradas e saídas com tranquilidade e sem complicação." actions={<button className="button button-primary" onClick={() => onAdd('money')}><Plus size={17} /> Novo lançamento</button>} />
    <div className="stat-grid stat-grid-three finance-stats"><StatTile icon={Wallet} label="Saldo registrado" value={formatMoney(balance)} detail={balance >= 0 ? 'Entradas menos despesas' : 'Despesas acima das entradas'} accent /><StatTile icon={ArrowDownLeft} label="Entradas" value={formatMoney(income)} detail={`${entries.filter((entry) => entry.type === 'Entrada').length} registros`} /><StatTile icon={ArrowUpRight} label="Despesas" value={formatMoney(expenses)} detail={`${entries.filter((entry) => entry.type === 'Saída').length} registros`} /></div>
    <Panel className="finance-history">
      <div className="panel-heading"><div><p className="eyebrow">SEUS REGISTROS</p><h2>Movimentações recentes</h2></div><IconButton icon={Plus} label="Adicionar lançamento" onClick={() => onAdd('money')} /></div>
      <div className="task-toolbar">
        <label className="task-search"><Search size={15} aria-hidden="true" /><input type="search" aria-label="Pesquisar lançamentos pela descrição" placeholder="Pesquisar descrição" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <label className="project-status-select"><span>Tipo</span><select aria-label="Filtrar lançamentos por tipo" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as FinanceTypeFilter)}><option value="all">Todos</option><option value="Entrada">Entradas</option><option value="Saída">Saídas</option></select></label>
        <label className="project-status-select"><span>Período</span><select aria-label="Filtrar lançamentos por período" value={period} onChange={(event) => setPeriod(event.target.value as FinancePeriod)}><option value="all">Todos</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></label>
      </div>
      {sorted.length ? <div className="money-list">{sorted.map((entry) => { const incoming = entry.type === 'Entrada'; const Icon = incoming ? ArrowDownLeft : ArrowUpRight; return <article className="money-row" key={entry.id}><span className={`money-icon${incoming ? ' money-in' : ' money-out'}`}><Icon size={17} /></span><div className="money-copy"><strong>{entry.description}</strong><span>{formatDate(entry.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div><span className={`money-value${incoming ? ' positive' : ' negative'}`}>{incoming ? '+' : '−'} {formatMoney(entry.amount)}</span><IconButton icon={Pencil} label={`Editar lançamento ${entry.description}`} onClick={() => onEdit(entry)} /><IconButton icon={Trash2} label={`Excluir lançamento ${entry.description}`} danger onClick={() => onDelete(entry.id)} /></article>; })}</div> : <EmptyState icon={CircleDollarSign} title={hasFilters ? 'Nenhum lançamento encontrado' : 'Seu panorama começa aqui'} body={hasFilters ? 'Ajuste a pesquisa ou os filtros para ver outros lançamentos.' : 'Registre uma entrada ou saída para acompanhar o saldo e ganhar clareza sobre o que foi movimentado.'} action={!hasFilters ? <button className="button button-primary" onClick={() => onAdd('money')}><Plus size={15} /> Registrar lançamento</button> : undefined} />}
    </Panel>
    <p className="privacy-inline">Este é um acompanhamento pessoal básico, salvo apenas neste navegador. Ele não substitui orientação financeira.</p>
  </>;
}

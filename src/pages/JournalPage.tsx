import { useMemo, useState } from 'react';
import { BookHeart, CalendarDays, LockKeyhole, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { JournalEntry } from '../types';
import { formatDate, localDateKey } from '../storage';
import { EmptyState, IconButton, PageHeading, Panel } from '../components/UI';
import type { EntryKind } from '../components/EntryModal';

type JournalPeriod = 'all' | '7' | '30';

function dateKeyDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function JournalPage({ entries, onAdd, onEdit, onDelete }: {
  entries: JournalEntry[];
  onAdd: (kind: EntryKind) => void;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (id: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<JournalPeriod>('all');
  const sorted = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    const today = localDateKey();
    const earliestDate = period === 'all' ? null : dateKeyDaysAgo(Number(period) - 1);
    return [...entries]
      .filter((entry) => {
        const matchesQuery = !normalizedQuery || `${entry.title} ${entry.body}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery);
        const entryDate = entry.date.slice(0, 10);
        const matchesPeriod = !earliestDate || (entryDate >= earliestDate && entryDate <= today);
        return matchesQuery && matchesPeriod;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [entries, period, query]);

  return <>
    <PageHeading eyebrow="UM ESPAÇO SÓ SEU" title="Diário" description="Guarde pensamentos, acontecimentos e aprendizados para revisitar depois." actions={<button className="button button-primary" onClick={() => onAdd('journal')}><Plus size={17} /> Novo registro</button>} />
    <div className="journal-privacy"><span className="journal-privacy-icon"><LockKeyhole size={17} /></span><span><strong>Seu espaço é local.</strong><small>Os registros ficam neste navegador, sem sincronização. Não têm senha própria e podem ser vistos por quem usa este perfil ou apagados se os dados do navegador forem limpos.</small></span></div>
    {entries.length > 0 && <div className="journal-filters" role="search" aria-label="Pesquisar e filtrar registros do diário">
      <label className="journal-search"><Search size={17} /><span className="sr-only">Pesquisar por título ou conteúdo</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nos registros..." /></label>
      <label className="journal-period-label"><span>Período</span><select value={period} onChange={(event) => setPeriod(event.target.value as JournalPeriod)} aria-label="Filtrar registros por período"><option value="all">Todo o período</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option></select></label>
    </div>}
    {sorted.length ? <div className="journal-grid">{sorted.map((entry, index) => { const expanded = openId === entry.id; return <Panel className={`journal-card journal-card-${index % 3}`} key={entry.id}><div className="journal-card-top"><span className="journal-date"><CalendarDays size={13} />{formatDate(entry.date, { day: 'numeric', month: 'long', year: 'numeric' })}</span><span className="journal-card-actions"><IconButton icon={Pencil} label={`Editar registro ${entry.title}`} onClick={() => onEdit(entry)} /><IconButton icon={Trash2} label={`Excluir registro ${entry.title}`} danger onClick={() => onDelete(entry.id)} /></span></div><h2>{entry.title}</h2><p className={`journal-body${expanded ? ' expanded' : ''}`}>{entry.body}</p>{entry.body.length > 170 && <button className="text-link journal-read" onClick={() => setOpenId(expanded ? null : entry.id)}>{expanded ? 'Mostrar menos' : 'Ler registro completo'}</button>}<div className="journal-card-end"><BookHeart size={14} /><span>Registro pessoal</span></div></Panel>; })}</div> : entries.length === 0 ? <Panel className="journal-welcome"><div className="journal-welcome-photo"><img src="/images/axis-journal-photo.webp" alt="Um caderno aberto à luz suave, pronto para receber seus pensamentos" /></div><div className="journal-welcome-copy"><span className="eyebrow">UM LUGAR PARA VOLTAR A SI</span><h2>Seu primeiro registro pode começar com uma frase.</h2><p>Conte o que ficou com você hoje — uma conversa, uma pequena conquista ou algo que ainda está tentando entender. Não precisa estar pronto nem fazer sentido para mais ninguém.</p><button className="button button-primary" onClick={() => onAdd('journal')}><Plus size={15} /> Escrever meu primeiro registro</button></div></Panel> : <Panel className="journal-no-results"><EmptyState icon={BookHeart} title="Nenhum registro encontrado" body="Tente outra palavra ou amplie o período para encontrar o que escreveu." action={<button className="button button-quiet" onClick={() => { setQuery(''); setPeriod('all'); }}>Limpar pesquisa e filtros</button>} /></Panel>}
  </>;
}

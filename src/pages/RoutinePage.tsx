import { useMemo } from 'react';
import { Activity, AlertCircle, ArrowRight, BookOpen, CalendarClock, CheckCircle2, CircleDollarSign, Clock3, Download, FileCheck2, FolderKanban, Plus, RotateCcw, ShieldCheck, Sparkles, Target, Upload } from 'lucide-react';
import type { AxisState } from '../types';
import { analyzeRoutine, type AxisView, type RoutineInsight } from '../routine';
import { formatMoney, localDateKey } from '../storage';
import { PageHeading, Panel, StatTile } from '../components/UI';
import type { EntryKind } from '../components/EntryModal';

const icons = { alert: AlertCircle, focus: Target, good: CheckCircle2, guide: Sparkles } as const;

interface BackupPreview { fileName: string; state: AxisState; counts: Record<string, number> }

function InsightCard({ insight, onNavigate }: { insight: RoutineInsight; onNavigate: (view: AxisView) => void }) {
  const Icon = icons[insight.kind];
  return <article className={`routine-insight routine-${insight.kind}`}><span className="routine-insight-icon"><Icon size={19} /></span><div className="routine-insight-copy"><span className="routine-insight-type">{insight.kind === 'alert' ? 'ATENÇÃO' : insight.kind === 'focus' ? 'FOCO' : insight.kind === 'good' ? 'PONTO POSITIVO' : 'SUGESTÃO'}</span><h3>{insight.title}</h3><p>{insight.body}</p><button className="text-link" onClick={() => onNavigate(insight.target)}>{insight.action} <ArrowRight size={15} /></button></div></article>;
}

function BackupPanel({ onExport, onImport, preview, onRestore, onCancel, error }: {
  onExport: () => void;
  onImport: () => void;
  preview: BackupPreview | null;
  onRestore: () => void;
  onCancel: () => void;
  error: string;
}) {
  return <Panel className="routine-backup"><div className="panel-heading"><div><p className="eyebrow">SEU ARQUIVO, SOB SEU CONTROLE</p><h2>Cópia de segurança</h2></div><span className="routine-spark"><ShieldCheck size={17} /></span></div>
    <p className="backup-description">Baixe seus registros em um arquivo JSON para guardar onde preferir. Esse arquivo é legível e não tem senha: mantenha-o em um local privado.</p>
    <div className="backup-actions"><button className="button button-soft" onClick={onExport}><Download size={15} /> Baixar meus dados</button><button className="button button-quiet" onClick={onImport}><Upload size={15} /> Importar backup</button></div>
    {error && <p className="backup-error" role="alert">{error}</p>}
    {preview && <div className="backup-preview" aria-live="polite"><div className="backup-preview-heading"><FileCheck2 size={18} /><div><strong>Prévia pronta</strong><span>{preview.fileName}</span></div></div><p>Este arquivo contém {Object.entries(preview.counts).filter(([, count]) => count > 0).map(([name, count]) => `${count} ${name}`).join(', ') || 'nenhum registro pessoal'}, além da sua visão de futuro e preferências.</p><div className="backup-warning"><AlertCircle size={15} /><span>Restaurar substituirá todos os registros atuais neste navegador. Só continue se este for o arquivo desejado.</span></div><div className="backup-actions"><button className="button button-primary" onClick={onRestore}><RotateCcw size={15} /> Restaurar este backup</button><button className="button button-quiet" onClick={onCancel}>Cancelar</button></div></div>}
  </Panel>;
}

export default function RoutinePage({ state, onNavigate, onAdd, onExport, onImport, backupPreview, onRestore, onCancelRestore, backupError }: {
  state: AxisState;
  onNavigate: (view: AxisView) => void;
  onAdd: (kind: EntryKind) => void;
  onExport: () => void;
  onImport: () => void;
  backupPreview: BackupPreview | null;
  onRestore: () => void;
  onCancelRestore: () => void;
  backupError: string;
}) {
  const insights = useMemo(() => analyzeRoutine(state), [state]);
  const today = localDateKey();
  const overdue = state.tasks.filter((task) => !task.completed && task.dueDate && task.dueDate < today).length;
  const weekEnd = new Date(`${today}T12:00:00`);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekStart = new Date(`${today}T12:00:00`);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekEndKey = localDateKey(weekEnd);
  const weekStartKey = localDateKey(weekStart);
  const dueThisWeek = state.tasks.filter((task) => !task.completed && task.dueDate && task.dueDate >= today && task.dueDate <= weekEndKey).length;
  const studyMinutes = state.studySessions.filter((session) => session.date >= weekStartKey && session.date <= today).reduce((sum, session) => sum + session.durationMinutes, 0);
  const net = state.moneyEntries.reduce((sum, entry) => sum + (entry.type === 'Entrada' ? entry.amount : -entry.amount), 0);
  const nothingLogged = state.tasks.length + state.goals.length + state.projects.length + state.studySessions.length + state.habits.length === 0;

  return <>
    <PageHeading eyebrow="INSIGHTS FEITOS NO APARELHO" title="Sua rotina, em perspectiva" description="Uma leitura leve e sem julgamentos, feita a partir dos registros deste navegador." actions={<button className="button button-soft" onClick={() => onAdd('task')}><Plus size={16} /> Registrar algo</button>} />
    <div className="routine-privacy-banner"><span><ShieldCheck size={18} /></span><div><strong>Seus registros ficam neste navegador.</strong><p>A análise usa os dados guardados aqui. O chat é separado: quando você envia uma mensagem, o texto é processado por um serviço externo.</p></div></div>
    <div className="stat-grid stat-grid-four routine-stats"><StatTile icon={CalendarClock} label="Prazos nos próximos 7 dias" value={dueThisWeek} detail="Tarefas pendentes" accent /><StatTile icon={AlertCircle} label="Prazos vencidos" value={overdue} detail={overdue ? 'Revise o que mudou' : 'Sem pendências vencidas'} /><StatTile icon={Activity} label="Hábitos registrados hoje" value={state.habits.filter((habit) => habit.completedDates.includes(today)).length} detail={`de ${state.habits.length} hábitos`} /><StatTile icon={BookOpen} label="Estudo nesta semana" value={studyMinutes >= 60 ? `${Math.floor(studyMinutes / 60)}h ${studyMinutes % 60}m` : `${studyMinutes} min`} detail="Somado às sessões" /></div>
    <div className="routine-main-grid"><Panel className="routine-reading"><div className="panel-heading"><div><p className="eyebrow">OBSERVAÇÕES DO AXIS</p><h2>O que seus registros mostram</h2></div><span className="routine-spark"><Sparkles size={17} /></span></div>
      {nothingLogged && <div className="routine-empty-note"><p>Não há dados suficientes para reconhecer padrões ainda. Registre algumas atividades para receber observações relevantes, sem inventar informações.</p><button className="button button-primary" onClick={() => onAdd('task')}><Plus size={15} /> Criar primeira tarefa</button></div>}
      <div className="routine-insight-list">{insights.map((insight, index) => <InsightCard key={`${insight.kind}-${index}`} insight={insight} onNavigate={onNavigate} />)}</div>
    </Panel>
    <div className="routine-side-stack"><Panel className="routine-quick-panel"><div className="panel-heading"><div><p className="eyebrow">VISÃO DO MOMENTO</p><h2>Seu panorama</h2></div></div><div className="panorama-row"><span><CalendarClock size={16} />Tarefas em aberto</span><strong>{state.tasks.filter((task) => !task.completed).length}</strong></div><div className="panorama-row"><span><Target size={16} />Objetivos ativos</span><strong>{state.goals.filter((goal) => goal.progress < 100).length}</strong></div><div className="panorama-row"><span><FolderKanban size={16} />Projetos em movimento</span><strong>{state.projects.filter((project) => project.status === 'Em andamento').length}</strong></div><div className="panorama-row"><span><CircleDollarSign size={16} />Saldo registrado</span><strong className={net >= 0 ? 'positive' : 'negative'}>{formatMoney(net)}</strong></div></Panel>
      <Panel className="routine-method"><span className="method-icon"><Clock3 size={17} /></span><h3>Um apoio, não uma cobrança.</h3><p>A leitura muda conforme seus registros. Você decide o que fazer com cada sugestão.</p><button className="icon-link" onClick={() => onNavigate('home')}>Voltar à visão geral <ArrowRight size={15} /></button></Panel></div></div>
    <BackupPanel onExport={onExport} onImport={onImport} preview={backupPreview} onRestore={onRestore} onCancel={onCancelRestore} error={backupError} />
  </>;
}

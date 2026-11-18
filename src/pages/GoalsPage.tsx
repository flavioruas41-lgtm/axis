import { ArrowUpRight, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import type { AxisGoal } from '../types';
import { formatDate } from '../storage';
import { EmptyState, IconButton, PageHeading, Panel, ProgressBar } from '../components/UI';
import type { EntryKind } from '../components/EntryModal';

export default function GoalsPage({ goals, onAdd, onProgress, onEdit, onDelete }: {
  goals: AxisGoal[];
  onAdd: (kind: EntryKind) => void;
  onProgress: (id: string, progress: number) => void;
  onEdit: (goal: AxisGoal) => void;
  onDelete: (id: string) => void;
}) {
  const active = goals.filter((goal) => goal.progress < 100).length;
  const complete = goals.length - active;
  return <>
    <PageHeading eyebrow="TRANSFORME INTENÇÃO EM CAMINHO" title="Objetivos" description="Acompanhe o que você quer construir, no seu próprio ritmo." actions={<button className="button button-primary" onClick={() => onAdd('goal')}><Plus size={17} /> Novo objetivo</button>} />
    <div className="stat-line"><span><strong>{active}</strong> ativos</span><span><strong>{complete}</strong> concluídos</span><span><strong>{goals.length}</strong> no total</span></div>
    {goals.length ? <div className="entity-grid">{goals.map((goal, index) => <Panel className={`entity-card goal-card goal-card-${index % 3}`} key={goal.id}>
      <div className="entity-card-top"><span className="entity-icon"><Target size={18} /></span><span className="project-card-actions"><IconButton icon={Pencil} label={`Editar objetivo ${goal.name}`} onClick={() => onEdit(goal)} /><IconButton icon={Trash2} label={`Excluir objetivo ${goal.name}`} danger onClick={() => onDelete(goal.id)} /></span></div>
      <span className="entity-kicker">{goal.area}</span><h2>{goal.name}</h2>
      <div className="goal-progress-head"><span>Progresso</span><strong>{goal.progress}%</strong></div><ProgressBar value={goal.progress} ariaLabel={`Progresso do objetivo ${goal.name}: ${goal.progress}%`} />
      <label className="range-control"><span className="sr-only">Atualizar progresso de {goal.name}</span><input type="range" min="0" max="100" step="5" value={goal.progress} onChange={(event) => onProgress(goal.id, Number(event.target.value))} /></label>
      <div className="entity-card-footer"><span>{goal.progress === 100 ? 'Objetivo alcançado' : goal.dueDate ? `Prazo ${formatDate(goal.dueDate)}` : 'Sem prazo definido'}</span>{goal.progress < 100 && <ArrowUpRight size={16} />}</div>
    </Panel>)}</div> : <Panel><EmptyState icon={Target} title="Ainda não há objetivos" body="Comece com uma intenção clara. Você pode ajustar o caminho conforme evoluir." action={<button className="button button-primary" onClick={() => onAdd('goal')}><Plus size={15} /> Definir primeiro objetivo</button>} /></Panel>}
  </>;
}

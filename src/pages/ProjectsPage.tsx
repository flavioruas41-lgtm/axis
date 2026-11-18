import { FolderKanban, Pencil, Plus, Trash2 } from 'lucide-react';
import type { AxisProject, ProjectStatus } from '../types';
import { Chip, EmptyState, IconButton, PageHeading, Panel, ProgressBar } from '../components/UI';
import type { EntryKind } from '../components/EntryModal';

const STATUSES: ProjectStatus[] = ['Ideia', 'Em andamento', 'Pausado', 'Concluído'];

export default function ProjectsPage({ projects, onAdd, onProgress, onStatus, onEdit, onDelete }: {
  projects: AxisProject[];
  onAdd: (kind: EntryKind) => void;
  onProgress: (id: string, progress: number) => void;
  onStatus: (id: string, status: ProjectStatus) => void;
  onEdit: (project: AxisProject) => void;
  onDelete: (id: string) => void;
}) {
  return <>
    <PageHeading eyebrow="IDEIAS GANHANDO FORMA" title="Projetos" description="Dê estrutura ao que você quer criar e acompanhe o andamento." actions={<button className="button button-primary" onClick={() => onAdd('project')}><Plus size={17} /> Novo projeto</button>} />
    <div className="stat-line"><span><strong>{projects.filter((project) => project.status === 'Em andamento').length}</strong> em andamento</span><span><strong>{projects.filter((project) => project.status === 'Pausado').length}</strong> pausados</span><span><strong>{projects.filter((project) => project.status === 'Concluído').length}</strong> concluídos</span></div>
    {projects.length ? <div className="entity-grid">{projects.map((project) => <Panel className="entity-card project-card" key={project.id}>
      <div className="entity-card-top"><span className="entity-icon entity-icon-lime"><FolderKanban size={18} /></span><span className="project-card-actions"><IconButton icon={Pencil} label={`Editar projeto ${project.name}`} onClick={() => onEdit(project)} /><IconButton icon={Trash2} label={`Excluir projeto ${project.name}`} danger onClick={() => onDelete(project.id)} /></span></div>
      <div className="project-title-row"><h2>{project.name}</h2><Chip tone={project.status === 'Em andamento' ? 'lime' : project.status === 'Pausado' ? 'amber' : project.status === 'Concluído' ? 'blue' : 'neutral'}>{project.status}</Chip></div>
      <p className="entity-description">{project.description || 'Sem descrição adicionada.'}</p>
      <div className="goal-progress-head"><span>Andamento</span><strong>{project.progress}%</strong></div><ProgressBar value={project.progress} />
      <label className="range-control"><span className="sr-only">Atualizar progresso de {project.name}</span><input type="range" min="0" max="100" step="5" value={project.progress} onChange={(event) => onProgress(project.id, Number(event.target.value))} /></label>
      <label className="project-status-select"><span>Status</span><select value={project.status} onChange={(event) => onStatus(project.id, event.target.value as ProjectStatus)}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
    </Panel>)}</div> : <Panel><EmptyState icon={FolderKanban} title="Ideias prontas para ganhar forma" body="Crie seu primeiro projeto e acompanhe cada etapa até a conclusão." action={<button className="button button-primary" onClick={() => onAdd('project')}><Plus size={15} /> Criar projeto</button>} /></Panel>}
  </>;
}

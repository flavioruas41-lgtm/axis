import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AlertCircle, Bell, Plus, ShieldCheck } from 'lucide-react';
import type { AxisGoal, AxisHabit, AxisProject, AxisTask, FutureVision, GoalArea, HabitFrequency, JournalEntry, MoneyEntry, ProjectStatus, StudySession, TaskCategory } from './types';
import { clearAxisState, createId, EMPTY_STATE, loadAxisState, localDateKey, parseAxisBackup, saveAxisState, serializeAxisBackup } from './storage';
import { analyzeRoutine, type AxisView } from './routine';
import type { EntryKind, EntryValues } from './components/EntryModal';
import { EntryModal } from './components/EntryModal';
import { Brand, MobileNavigation, Sidebar } from './components/Navigation';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import GoalsPage from './pages/GoalsPage';
import ProjectsPage from './pages/ProjectsPage';
import StudiesPage from './pages/StudiesPage';
import HabitsPage from './pages/HabitsPage';
import FinancePage from './pages/FinancePage';
import JournalPage from './pages/JournalPage';
import FuturePage from './pages/FuturePage';
import RoutinePage from './pages/RoutinePage';
import ChatAssistant from './components/ChatAssistant';
import type { AxisState } from './types';

const LABELS: Record<AxisView, string> = {
  home: 'Visão geral', tasks: 'Tarefas', goals: 'Objetivos', projects: 'Projetos', studies: 'Estudos',
  habits: 'Hábitos', finance: 'Financeiro', journal: 'Diário', vision: 'Visão de futuro', routine: 'Minha rotina',
};
const EDIT_TITLES: Record<EntryKind, string> = {
  task: 'Editar tarefa', goal: 'Editar objetivo', project: 'Editar projeto', study: 'Editar sessão de estudo',
  habit: 'Editar hábito', money: 'Editar lançamento', journal: 'Editar registro',
};

interface EditingEntry { kind: EntryKind; id: string; values: EntryValues }
interface BackupPreview { fileName: string; state: AxisState; counts: Record<string, number> }

function downloadBackup(state: AxisState) {
  const blob = new Blob([serializeAxisBackup(state)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `axis-backup-${localDateKey()}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const [initialLoad] = useState(loadAxisState);
  const [state, setState] = useState<AxisState>(initialLoad.state);
  const [activeView, setActiveView] = useState<AxisView>('home');
  const [entryKind, setEntryKind] = useState<EntryKind | null>(null);
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null);
  const [loadIssue, setLoadIssue] = useState(initialLoad.issue);
  const [storageWarning, setStorageWarning] = useState(false);
  const [backupError, setBackupError] = useState('');
  const [backupPreview, setBackupPreview] = useState<BackupPreview | null>(null);
  const [toast, setToast] = useState('');
  const firedReminders = useRef(new Set<string>());
  const backupInput = useRef<HTMLInputElement>(null);
  const storageBlocked = useRef(Boolean(initialLoad.issue));

  useEffect(() => {
    if (storageBlocked.current) return;
    setStorageWarning(!saveAxisState(state));
  }, [state]);
  useEffect(() => { document.title = `AXIS — ${LABELS[activeView]}`; }, [activeView]);
  useEffect(() => {
    if (!state.notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return;
    const checkReminders = () => {
      const due = state.tasks.filter((task) => task.reminderAt && new Date(task.reminderAt).getTime() <= Date.now() && !firedReminders.current.has(task.id));
      if (!due.length) return;
      for (const task of due) {
        firedReminders.current.add(task.id);
        void navigator.serviceWorker.ready.then((registration) => registration.showNotification('AXIS · Lembrete', {
          body: task.title,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: `axis-task-${task.id}`,
          data: { url: '/' },
        })).catch(() => new Notification('AXIS · Lembrete', { body: task.title, icon: '/icons/icon-192.png' }));
      }
      const ids = new Set(due.map((task) => task.id));
      setState((current) => ({ ...current, tasks: current.tasks.map((task) => ids.has(task.id) ? { ...task, reminderAt: '' } : task) }));
      setToast('Lembrete exibido. Seus registros permanecem no aparelho.');
    };
    checkReminders();
    const timer = window.setInterval(checkReminders, 15_000);
    return () => window.clearInterval(timer);
  }, [state.notificationsEnabled, state.tasks]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3800);
  }, []);

  const navigate = useCallback((view: AxisView) => {
    setActiveView(view);
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    window.scrollTo({ top: 0, behavior });
  }, []);

  const addEntry = useCallback((kind: EntryKind, values: EntryValues) => {
    const createdAt = new Date().toISOString();
    const id = createId(kind);
    setState((current) => {
      switch (kind) {
        case 'task': {
          const task: AxisTask = { id, title: values.title.trim(), category: values.category as TaskCategory, dueDate: values.dueDate, reminderAt: values.reminderAt, completed: false, createdAt };
          return { ...current, tasks: [task, ...current.tasks] };
        }
        case 'goal': {
          const goal: AxisGoal = { id, name: values.name.trim(), area: values.area as GoalArea, dueDate: values.dueDate, progress: Math.max(0, Math.min(100, Number(values.progress) || 0)), createdAt };
          return { ...current, goals: [goal, ...current.goals] };
        }
        case 'project': {
          const requestedProgress = Math.max(0, Math.min(100, Number(values.progress) || 0));
          const progress = values.status === 'Concluído' || requestedProgress === 100 ? 100 : requestedProgress;
          const status = progress === 100 ? 'Concluído' : values.status as ProjectStatus;
          const project: AxisProject = { id, name: values.name.trim(), description: values.description.trim(), status, progress, createdAt };
          return { ...current, projects: [project, ...current.projects] };
        }
        case 'study': {
          const session: StudySession = { id, subject: values.subject.trim(), durationMinutes: Math.max(1, Number(values.duration) || 1), date: values.date, notes: values.notes.trim(), createdAt };
          return { ...current, studySessions: [session, ...current.studySessions] };
        }
        case 'habit': {
          const habit: AxisHabit = { id, name: values.name.trim(), frequency: values.frequency as HabitFrequency, completedDates: [], createdAt };
          return { ...current, habits: [habit, ...current.habits] };
        }
        case 'money': {
          const entry: MoneyEntry = { id, type: values.type as MoneyEntry['type'], amount: Math.max(0, Number(values.amount) || 0), description: values.description.trim(), date: values.date, createdAt };
          return { ...current, moneyEntries: [entry, ...current.moneyEntries] };
        }
        case 'journal': {
          const entry: JournalEntry = { id, title: values.title.trim(), body: values.body.trim(), date: values.date, createdAt };
          return { ...current, journalEntries: [entry, ...current.journalEntries] };
        }
      }
    });
    setEntryKind(null);
    notify(kind === 'money' ? 'Lançamento adicionado à sua visão financeira.' : 'Registro adicionado à sua rotina.');
  }, [notify]);

  const editEntry = useCallback((kind: EntryKind, id: string, values: EntryValues) => {
    setEntryKind(null);
    setEditingEntry({ kind, id, values });
  }, []);

  const updateEntry = useCallback((kind: EntryKind, id: string, values: EntryValues) => {
    setState((current) => {
      switch (kind) {
        case 'task': return { ...current, tasks: current.tasks.map((item) => item.id === id ? { ...item, title: values.title.trim(), category: values.category as TaskCategory, dueDate: values.dueDate, reminderAt: values.reminderAt } : item) };
        case 'goal': return { ...current, goals: current.goals.map((item) => item.id === id ? { ...item, name: values.name.trim(), area: values.area as GoalArea, dueDate: values.dueDate, progress: Math.max(0, Math.min(100, Number(values.progress) || 0)) } : item) };
        case 'project': return { ...current, projects: current.projects.map((item) => {
          if (item.id !== id) return item;
          const requestedProgress = Math.max(0, Math.min(100, Number(values.progress) || 0));
          const progress = values.status === 'Concluído' || requestedProgress === 100 ? 100 : requestedProgress;
          return { ...item, name: values.name.trim(), description: values.description.trim(), status: progress === 100 ? 'Concluído' : values.status as ProjectStatus, progress };
        }) };
        case 'study': return { ...current, studySessions: current.studySessions.map((item) => item.id === id ? { ...item, subject: values.subject.trim(), durationMinutes: Math.max(1, Number(values.duration) || 1), date: values.date, notes: values.notes.trim() } : item) };
        case 'habit': return { ...current, habits: current.habits.map((item) => item.id === id ? { ...item, name: values.name.trim(), frequency: values.frequency as HabitFrequency } : item) };
        case 'money': return { ...current, moneyEntries: current.moneyEntries.map((item) => item.id === id ? { ...item, type: values.type as MoneyEntry['type'], amount: Math.max(0.01, Number(values.amount) || 0.01), description: values.description.trim(), date: values.date } : item) };
        case 'journal': return { ...current, journalEntries: current.journalEntries.map((item) => item.id === id ? { ...item, title: values.title.trim(), body: values.body.trim(), date: values.date } : item) };
      }
    });
    setEditingEntry(null);
    setEntryKind(null);
    notify('Alterações salvas neste dispositivo.');
  }, [notify]);

  const saveEntry = useCallback((kind: EntryKind, values: EntryValues) => {
    if (editingEntry && editingEntry.kind === kind) updateEntry(kind, editingEntry.id, values);
    else addEntry(kind, values);
  }, [addEntry, editingEntry, updateEntry]);
  const closeEntry = useCallback(() => { setEntryKind(null); setEditingEntry(null); }, []);

  const toggleTask = useCallback((id: string) => setState((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, completed: !task.completed, reminderAt: task.completed ? task.reminderAt : '' } : task) })), []);
  const toggleHabit = useCallback((id: string, dateISO = localDateKey()) => {
    setState((current) => ({ ...current, habits: current.habits.map((habit) => habit.id === id ? { ...habit, completedDates: habit.completedDates.includes(dateISO) ? habit.completedDates.filter((date) => date !== dateISO) : [...habit.completedDates, dateISO].sort() } : habit) }));
  }, []);
  const deleteItem = useCallback((collection: 'tasks' | 'goals' | 'projects' | 'studySessions' | 'habits' | 'moneyEntries' | 'journalEntries', id: string, label: string) => {
    if (!window.confirm(`Excluir ${label}? Esta ação não pode ser desfeita.`)) return;
    setState((current) => ({ ...current, [collection]: current[collection].filter((item) => item.id !== id) }));
    notify(`${label.charAt(0).toLocaleUpperCase('pt-BR')}${label.slice(1)} excluído.`);
  }, [notify]);
  const updateGoalProgress = useCallback((id: string, progress: number) => setState((current) => ({ ...current, goals: current.goals.map((goal) => goal.id === id ? { ...goal, progress } : goal) })), []);
  const updateProjectProgress = useCallback((id: string, progress: number) => setState((current) => ({ ...current, projects: current.projects.map((project) => {
    if (project.id !== id) return project;
    const normalized = Math.max(0, Math.min(100, progress));
    return { ...project, progress: normalized, status: normalized === 100 ? 'Concluído' : project.status === 'Concluído' ? 'Em andamento' : project.status };
  }) })), []);
  const updateProjectStatus = useCallback((id: string, status: ProjectStatus) => setState((current) => ({ ...current, projects: current.projects.map((project) => {
    if (project.id !== id) return project;
    if (status === 'Concluído') return { ...project, status, progress: 100 };
    const progress = project.status === 'Concluído' && project.progress === 100 ? status === 'Ideia' ? 0 : 99 : project.progress;
    return { ...project, status, progress };
  }) })), []);
  const updateVision = useCallback((key: keyof FutureVision, value: string) => setState((current) => ({ ...current, futureVision: { ...current.futureVision, [key]: value } })), []);

  const openBackupPicker = useCallback(() => { setBackupError(''); backupInput.current?.click(); }, []);
  const readBackupFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setBackupPreview(null);
    setBackupError('');
    if (!file) return;
    setActiveView('routine');
    if (file.size > 10_000_000) { setBackupError('Este arquivo ultrapassa 10 MB. Escolha um backup menor.'); return; }
    try {
      const parsed = parseAxisBackup(await file.text());
      if (!parsed) { setBackupError('O arquivo não é um backup AXIS válido ou sua versão não é compatível. Seus registros atuais não foram alterados.'); return; }
      setBackupPreview({ fileName: file.name, state: parsed.state, counts: parsed.counts });
      notify('Confira a prévia do backup antes de substituir seus registros.');
    } catch {
      setBackupError('Não foi possível ler o arquivo. Seus registros atuais não foram alterados.');
    }
  }, [notify]);
  const restoreBackup = useCallback(() => {
    if (!backupPreview) return;
    if (!saveAxisState(backupPreview.state)) { setStorageWarning(true); setBackupError('O navegador não conseguiu gravar o backup. Libere espaço e tente novamente.'); return; }
    storageBlocked.current = false;
    setLoadIssue(null);
    setStorageWarning(false);
    setState(backupPreview.state);
    setBackupPreview(null);
    setBackupError('');
    notify('Backup restaurado. Seus registros agora estão neste dispositivo.');
  }, [backupPreview, notify]);
  const cancelRestore = useCallback(() => { setBackupPreview(null); setBackupError(''); }, []);
  const discardUnreadableData = useCallback(() => {
    if (loadIssue !== 'corrupt') return;
    const confirmed = window.confirm('Os dados locais existentes não puderam ser lidos. Apagá-los não pode ser desfeito. Só continue se você já tentou importar um backup e aceita começar do zero.');
    if (!confirmed) return;
    if (!clearAxisState()) { setStorageWarning(true); setBackupError('O navegador não permitiu apagar o arquivo local ilegível. Seus dados não foram alterados.'); return; }
    storageBlocked.current = false;
    setLoadIssue(null);
    setStorageWarning(false);
    setBackupPreview(null);
    setBackupError('');
    setState(EMPTY_STATE);
    notify('Novo espaço local iniciado.');
  }, [loadIssue, notify]);

  const enableNotifications = useCallback(async () => {
    if (!('Notification' in window)) { notify('Este navegador não oferece notificações para o AXIS.'); return; }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setState((current) => ({ ...current, notificationsEnabled: true }));
      notify('Lembretes ativados neste navegador. Deixe o AXIS aberto para verificar os horários.');
    } else {
      setState((current) => ({ ...current, notificationsEnabled: false }));
      notify('A permissão não foi concedida. Você pode alterar isso nas configurações do navegador.');
    }
  }, [notify]);
  const toggleNotifications = useCallback(() => {
    if (!state.notificationsEnabled) { void enableNotifications(); return; }
    setState((current) => ({ ...current, notificationsEnabled: false }));
    notify('Lembretes desativados neste navegador.');
  }, [enableNotifications, notify, state.notificationsEnabled]);

  const insights = analyzeRoutine(state);
  const notificationsSupported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
  const renderPage = () => {
    switch (activeView) {
      case 'home': return <DashboardPage state={state} insights={insights} onNavigate={navigate} onAdd={setEntryKind} onToggleTask={toggleTask} onToggleHabit={(id) => toggleHabit(id)} notificationsSupported={notificationsSupported} onToggleNotifications={toggleNotifications} />;
      case 'tasks': return <TasksPage tasks={state.tasks} onAdd={setEntryKind} onToggle={toggleTask} onEdit={(item) => editEntry('task', item.id, { title: item.title, category: item.category, dueDate: item.dueDate, reminderAt: item.reminderAt })} onDelete={(id) => deleteItem('tasks', id, 'a tarefa')} />;
      case 'goals': return <GoalsPage goals={state.goals} onAdd={setEntryKind} onProgress={updateGoalProgress} onEdit={(item) => editEntry('goal', item.id, { name: item.name, area: item.area, dueDate: item.dueDate, progress: String(item.progress) })} onDelete={(id) => deleteItem('goals', id, 'o objetivo')} />;
      case 'projects': return <ProjectsPage projects={state.projects} onAdd={setEntryKind} onProgress={updateProjectProgress} onStatus={updateProjectStatus} onEdit={(item) => editEntry('project', item.id, { name: item.name, description: item.description, progress: String(item.progress), status: item.status })} onDelete={(id) => deleteItem('projects', id, 'o projeto')} />;
      case 'studies': return <StudiesPage sessions={state.studySessions} onAdd={setEntryKind} onEdit={(item) => editEntry('study', item.id, { subject: item.subject, duration: String(item.durationMinutes), date: item.date, notes: item.notes })} onDelete={(id) => deleteItem('studySessions', id, 'a sessão de estudo')} />;
      case 'habits': return <HabitsPage habits={state.habits} onAdd={setEntryKind} onEdit={(item) => editEntry('habit', item.id, { name: item.name, frequency: item.frequency })} onToggle={toggleHabit} onDelete={(id) => deleteItem('habits', id, 'o hábito')} />;
      case 'finance': return <FinancePage entries={state.moneyEntries} onAdd={setEntryKind} onEdit={(item) => editEntry('money', item.id, { type: item.type, amount: String(item.amount), description: item.description, date: item.date })} onDelete={(id) => deleteItem('moneyEntries', id, 'o lançamento')} />;
      case 'journal': return <JournalPage entries={state.journalEntries} onAdd={setEntryKind} onEdit={(item) => editEntry('journal', item.id, { title: item.title, body: item.body, date: item.date })} onDelete={(id) => deleteItem('journalEntries', id, 'o registro')} />;
      case 'vision': return <FuturePage vision={state.futureVision} onChange={updateVision} />;
      case 'routine': return <RoutinePage state={state} onNavigate={navigate} onAdd={setEntryKind} onExport={() => downloadBackup(state)} onImport={openBackupPicker} backupPreview={backupPreview} onRestore={restoreBackup} onCancelRestore={cancelRestore} backupError={backupError} />;
    }
  };

  return <div className="app-shell">
    <Sidebar active={activeView} onNavigate={navigate} />
    <div className="main-column">
      <header className="mobile-topbar"><Brand compact /><div className="mobile-topbar-actions"><span className="mobile-view-label">{LABELS[activeView]}</span><button className="topbar-add" aria-label="Adicionar tarefa" onClick={() => setEntryKind('task')}><Plus size={18} /></button></div></header>
      <main key={activeView} className="main-content page-transition"><div className="content-container">
        {loadIssue && !backupPreview ? <section className="storage-recovery" role="alert"><AlertCircle size={23} /><div><strong>{loadIssue === 'corrupt' ? 'Seus dados locais precisam de recuperação.' : 'O navegador não permitiu acessar os dados locais.'}</strong><p>{loadIssue === 'corrupt' ? 'O AXIS preservou o conteúdo que encontrou e não o substituirá por uma cópia vazia. Importe um backup para recuperar seus registros. Se não tiver um backup, você pode remover os dados ilegíveis e começar novamente.' : 'Sem acesso ao armazenamento local, suas alterações não podem ser salvas. Verifique permissões e espaço disponível no navegador.'}</p>{backupError && <p className="backup-error" role="status">{backupError}</p>}<div className="backup-actions"><button className="button button-primary" onClick={openBackupPicker}>Importar backup</button>{loadIssue === 'corrupt' && <button className="button button-quiet" onClick={discardUnreadableData}>Apagar dados ilegíveis e começar do zero</button>}</div></div></section> : renderPage()}
        {storageWarning && <div className="storage-warning" role="alert"><AlertCircle size={18} /><span><strong>Não foi possível salvar alterações no navegador.</strong> O conteúdo editado pode não sobreviver se você recarregar. Verifique as permissões ou o espaço disponível antes de continuar.</span></div>}
        <footer className="app-footer"><Brand compact /><span className="footer-privacy"><ShieldCheck size={13} /> Dados locais</span></footer>
      </div></main>
    </div>
    <MobileNavigation active={activeView} onNavigate={navigate} />
    <ChatAssistant />
    <input ref={backupInput} type="file" accept="application/json,.json" className="sr-only" aria-label="Selecionar arquivo de backup AXIS" onChange={readBackupFile} />
    <EntryModal
      key={editingEntry ? `edit-${editingEntry.kind}-${editingEntry.id}` : 'new-entry'}
      kind={editingEntry?.kind ?? entryKind}
      initialValues={editingEntry?.values}
      titleOverride={editingEntry ? EDIT_TITLES[editingEntry.kind] : undefined}
      submitLabel={editingEntry ? 'Salvar alterações' : undefined}
      onClose={closeEntry}
      onSave={saveEntry}
    />
    {toast && <div className="toast" role="status" aria-live="polite"><Bell size={15} />{toast}</div>}
  </div>;
}

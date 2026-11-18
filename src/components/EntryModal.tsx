import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { localDateKey, localDateTimeKey } from '../storage';

export type EntryKind = 'task' | 'goal' | 'project' | 'study' | 'habit' | 'money' | 'journal';
export type EntryValues = Record<string, string>;

const TITLE: Record<EntryKind, string> = {
  task: 'Nova tarefa', goal: 'Novo objetivo', project: 'Novo projeto', study: 'Registrar estudo',
  habit: 'Novo hábito', money: 'Novo lançamento', journal: 'Novo registro',
};

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>;
}

export function EntryModal({ kind, onClose, onSave, initialValues, titleOverride, submitLabel }: {
  kind: EntryKind | null;
  onClose: () => void;
  onSave: (kind: EntryKind, values: EntryValues) => void;
  initialValues?: EntryValues;
  titleOverride?: string;
  submitLabel?: string;
}) {
  const [values, setValues] = useState<EntryValues>({});
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!kind) return;
    const base: EntryValues = { date: localDateKey(), dueDate: '', reminderAt: '', progress: '0', duration: '30', frequency: 'Todos os dias', status: 'Ideia', category: 'Pessoal', area: 'Desenvolvimento pessoal', type: 'Saída' };
    if (kind === 'task') base.category = 'Pessoal';
    if (kind === 'study' || kind === 'money' || kind === 'journal') base.date = localDateKey();
    if (kind === 'money') base.amount = '';
    if (kind === 'task') base.reminderAt = '';
    setValues({ ...base, ...initialValues });
  }, [kind]);

  useEffect(() => {
    if (!kind) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusFrame = window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea, button:not([disabled])')?.focus();
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') ?? []);
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const outside = !dialogRef.current?.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [kind, onClose]);

  if (!kind) return null;
  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const textInput = (key: string, label: string, placeholder: string, required = false) => (
    <Field label={label}><input className="input" value={values[key] ?? ''} onChange={(event) => set(key, event.target.value)} placeholder={placeholder} required={required} maxLength={120} /></Field>
  );
  const select = (key: string, label: string, options: string[]) => (
    <Field label={label}><select className="input select-input" value={values[key] ?? options[0]} onChange={(event) => set(key, event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></Field>
  );
  const dateInput = (key: string, label: string, required = false) => (
    <Field label={label}><input className="input" type="date" value={values[key] ?? ''} onChange={(event) => set(key, event.target.value)} required={required} /></Field>
  );
  const areaInput = (key: string, label: string, placeholder: string, rows = 3, required = false) => (
    <Field label={label}><textarea className="input textarea" rows={rows} value={values[key] ?? ''} onChange={(event) => set(key, event.target.value)} placeholder={placeholder} maxLength={1500} required={required} /></Field>
  );
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(kind, values);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="entry-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}>
        <div className="modal-heading"><div><p className="eyebrow">{titleOverride ? 'AXIS · EDITAR PROJETO' : 'AXIS · NOVO REGISTRO'}</p><h2 id="modal-title">{titleOverride ?? TITLE[kind]}</h2></div><button className="icon-button" type="button" aria-label="Fechar" onClick={onClose}><X size={18} /></button></div>
        <form className="entry-form" onSubmit={onSubmit}>
          {kind === 'task' && <>
            {textInput('title', 'Nome da tarefa', 'Ex.: revisar capítulo 4', true)}
            <div className="form-row">{select('category', 'Categoria', ['Pessoal', 'Estudos', 'Projetos', 'Casa', 'Outros'])}{dateInput('dueDate', 'Prazo')}</div>
            <Field label="Lembrete"><input className="input" type="datetime-local" min={localDateTimeKey()} value={values.reminderAt ?? ''} onChange={(event) => set('reminderAt', event.target.value)} /><span className="field-hint">O aviso pode depender de o AXIS estar aberto no navegador.</span></Field>
          </>}
          {kind === 'goal' && <>
            {textInput('name', 'Nome do objetivo', 'Ex.: concluir curso de inglês', true)}
            <div className="form-row">{select('area', 'Área', ['Desenvolvimento pessoal', 'Estudos', 'Carreira', 'Finanças', 'Rotina'])}{dateInput('dueDate', 'Prazo')}</div>
            <Field label="Progresso atual"><input className="input" type="number" min="0" max="100" value={values.progress ?? '0'} onChange={(event) => set('progress', event.target.value)} /><span className="field-hint">De 0 a 100%.</span></Field>
          </>}
          {kind === 'project' && <>
            {textInput('name', 'Nome do projeto', 'Ex.: portfólio pessoal', true)}
            {areaInput('description', 'Descrição', 'O que você quer construir?', 3)}
            <div className="form-row">{select('status', 'Status', ['Ideia', 'Em andamento', 'Pausado', 'Concluído'])}<Field label="Progresso"><input className="input" type="number" min="0" max="100" value={values.progress ?? '0'} onChange={(event) => set('progress', event.target.value)} /></Field></div>
          </>}
          {kind === 'study' && <>
            {textInput('subject', 'Matéria ou assunto', 'Ex.: álgebra linear', true)}
            <div className="form-row">{Field({ label: 'Tempo dedicado (min)', children: <input className="input" type="number" min="1" max="1440" value={values.duration ?? '30'} onChange={(event) => set('duration', event.target.value)} required /> })}{dateInput('date', 'Data', true)}</div>
            {areaInput('notes', 'Observações', 'O que você aprendeu ou quer revisar?', 3)}
          </>}
          {kind === 'habit' && <>
            {textInput('name', 'Nome do hábito', 'Ex.: caminhar 20 minutos', true)}
            {select('frequency', 'Frequência', ['Todos os dias', 'Dias úteis', 'Semanal', 'Quando possível'])}
          </>}
          {kind === 'money' && <>
            {select('type', 'Tipo', ['Entrada', 'Saída'])}
            {textInput('description', 'Descrição', 'Ex.: mercado, salário', true)}
            <div className="form-row"><Field label="Valor (R$)"><input className="input" type="number" min="0.01" step="0.01" value={values.amount ?? ''} onChange={(event) => set('amount', event.target.value)} placeholder="0,00" required /></Field>{dateInput('date', 'Data', true)}</div>
          </>}
          {kind === 'journal' && <>
            {textInput('title', 'Título', 'Um nome para este registro', true)}
            {dateInput('date', 'Data', true)}
            {areaInput('body', 'Seu registro', 'Escreva o que está pensando, vivendo ou aprendendo…', 7, true)}
          </>}
          <div className="modal-actions"><button className="button button-quiet" type="button" onClick={onClose}>Cancelar</button><button className="button button-primary" type="submit">{submitLabel ?? 'Salvar no AXIS'}</button></div>
        </form>
      </section>
    </div>
  );
}

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function PageHeading({ eyebrow, title, description, actions }: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-heading-actions">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`.trim()}>{children}</section>;
}

export function StatTile({ icon: Icon, label, value, detail, accent = false }: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className={`stat-tile${accent ? ' stat-tile-accent' : ''}`}>
      <span className="stat-icon"><Icon size={17} strokeWidth={1.8} /></span>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-detail">{detail}</span>
    </div>
  );
}

export function ProgressBar({ value, label, ariaLabel }: { value: number; label?: string; ariaLabel?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-wrap">
      {label && <span className="progress-label">{label}</span>}
      <div className="progress-track" role="progressbar" aria-label={ariaLabel ?? label ?? `Progresso: ${safe}%`} aria-valuenow={safe} aria-valuemin={0} aria-valuemax={100}>
        <span className="progress-fill" style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={21} strokeWidth={1.6} /></span>
      <strong>{title}</strong>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function IconButton({ icon: Icon, label, onClick, danger = false }: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button className={`icon-button${danger ? ' icon-button-danger' : ''}`} type="button" aria-label={label} title={label} onClick={onClick}>
      <Icon size={16} strokeWidth={1.8} />
    </button>
  );
}

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'lime' | 'amber' | 'red' | 'blue' }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

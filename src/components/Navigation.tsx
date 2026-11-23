import { useEffect, useId, useRef, useState } from 'react';
import {
  Activity, ArrowUpRight, BookOpen, CalendarCheck2, ChevronRight, CircleDollarSign,
  Compass, FolderKanban, House, Menu, NotebookPen, ShieldCheck, Sparkles, Target, X,
} from 'lucide-react';
import type { AxisView } from '../routine';

export const NAV_ITEMS: { id: AxisView; label: string; icon: typeof House; group: 'overview' | 'life' }[] = [
  { id: 'home', label: 'Visão geral', icon: House, group: 'overview' },
  { id: 'tasks', label: 'Tarefas', icon: CalendarCheck2, group: 'life' },
  { id: 'goals', label: 'Objetivos', icon: Target, group: 'life' },
  { id: 'projects', label: 'Projetos', icon: FolderKanban, group: 'life' },
  { id: 'studies', label: 'Estudos', icon: BookOpen, group: 'life' },
  { id: 'habits', label: 'Hábitos', icon: Activity, group: 'life' },
  { id: 'finance', label: 'Financeiro', icon: CircleDollarSign, group: 'life' },
  { id: 'journal', label: 'Diário', icon: NotebookPen, group: 'life' },
  { id: 'vision', label: 'Visão de futuro', icon: Compass, group: 'life' },
  { id: 'routine', label: 'Minha rotina', icon: Sparkles, group: 'overview' },
];

export function Brand({ compact = false }: { compact?: boolean }) {
  const brandImage = '/images/axis-brand-symbol.webp';
  return (
    <div className={`brand${compact ? ' brand-compact' : ''}`}>
      <img className="brand-symbol" src={brandImage} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/icons/axis-icon.svg'; }} />
      <span className="brand-word">AXIS</span>
      {!compact && <span className="brand-divider" />}
      {!compact && <span className="brand-tagline">Sua vida.<br />Sua direção.</span>}
    </div>
  );
}

function NavLinks({ active, onNavigate }: { active: AxisView; onNavigate: (view: AxisView) => void }) {
  return (
    <nav className="nav-links" aria-label="Navegação principal">
      <p className="nav-label">SEU ESPAÇO</p>
      {NAV_ITEMS.filter((item) => item.group === 'overview').map((item) => {
        const Icon = item.icon;
        return <button key={item.id} className={`nav-item${active === item.id ? ' active' : ''}`} onClick={() => onNavigate(item.id)} aria-current={active === item.id ? 'page' : undefined}><Icon size={18} />{item.label}{active === item.id && <ChevronRight className="nav-active-mark" size={15} />}</button>;
      })}
      <p className="nav-label nav-label-spaced">ORGANIZAÇÃO</p>
      {NAV_ITEMS.filter((item) => item.group === 'life').map((item) => {
        const Icon = item.icon;
        return <button key={item.id} className={`nav-item${active === item.id ? ' active' : ''}`} onClick={() => onNavigate(item.id)} aria-current={active === item.id ? 'page' : undefined}><Icon size={18} />{item.label}{active === item.id && <ChevronRight className="nav-active-mark" size={15} />}</button>;
      })}
    </nav>
  );
}

export function Sidebar({ active, onNavigate }: { active: AxisView; onNavigate: (view: AxisView) => void }) {
  return (
    <aside className="sidebar">
      <Brand />
      <NavLinks active={active} onNavigate={onNavigate} />
      <div className="sidebar-bottom">
        <div className="privacy-note"><ShieldCheck size={16} /><span>Seus registros ficam<br />neste navegador.</span></div>
        <div className="sidebar-motto">Pequenos passos.<br /><span>Direção constante.</span></div>
        <a className="sidebar-version" href="#privacy" onClick={(event) => event.preventDefault()}>AXIS Pessoal <ArrowUpRight size={13} /></a>
      </div>
    </aside>
  );
}

export function MobileNavigation({ active, onNavigate }: { active: AxisView; onNavigate: (view: AxisView) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuTitleId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const quick: AxisView[] = ['home', 'tasks', 'habits', 'routine'];
  const change = (view: AxisView) => {
    onNavigate(view);
    setMenuOpen(false);
  };
  const moreActive = !quick.includes(active);

  useEffect(() => {
    if (!menuOpen) return;

    const panel = menuPanelRef.current;
    const body = document.body;
    const originalOverflow = {
      value: body.style.getPropertyValue('overflow'),
      priority: body.style.getPropertyPriority('overflow'),
    };
    const originalPaddingRight = {
      value: body.style.getPropertyValue('padding-right'),
      priority: body.style.getPropertyPriority('padding-right'),
    };
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);

    body.style.setProperty('overflow', 'hidden');
    if (scrollbarWidth > 0) {
      const currentPadding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
      body.style.setProperty('padding-right', `${currentPadding + scrollbarWidth}px`);
    }

    const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusable = () => Array.from(panel?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])
      .filter((element) => element.getClientRects().length > 0);

    getFocusable()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !panel) return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const focused = document.activeElement;
      if (event.shiftKey && (focused === first || !panel.contains(focused))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (focused === last || !panel.contains(focused))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (originalOverflow.value) body.style.setProperty('overflow', originalOverflow.value, originalOverflow.priority);
      else body.style.removeProperty('overflow');
      if (originalPaddingRight.value) body.style.setProperty('padding-right', originalPaddingRight.value, originalPaddingRight.priority);
      else body.style.removeProperty('padding-right');
      menuButtonRef.current?.focus();
    };
  }, [menuOpen]);

  return (
    <>
      {menuOpen && <div className="mobile-menu-scrim" onClick={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}>
        <div id={menuId} ref={menuPanelRef} className="mobile-menu-sheet" role="dialog" aria-modal="true" aria-labelledby={menuTitleId} tabIndex={-1}>
          <div className="mobile-menu-heading"><div><p className="eyebrow">NAVEGAR</p><h2 id={menuTitleId}>Seu espaço</h2></div><button className="icon-button" type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar menu"><X size={18} /></button></div>
          <NavLinks active={active} onNavigate={change} />
          <div className="mobile-privacy"><ShieldCheck size={15} /> Seus registros ficam neste navegador.</div>
        </div>
      </div>}
      <nav className="mobile-bottom-nav" aria-label="Navegação mobile">
        {quick.map((id) => {
          const item = NAV_ITEMS.find((entry) => entry.id === id)!;
          const Icon = item.icon;
          return <button key={id} type="button" className={`mobile-tab${active === id ? ' active' : ''}`} onClick={() => change(id)} aria-current={active === id ? 'page' : undefined}><Icon size={19} strokeWidth={active === id ? 2.1 : 1.7} /><span>{id === 'home' ? 'Hoje' : id === 'routine' ? 'Análise' : item.label}</span></button>;
        })}
        <button ref={menuButtonRef} type="button" className={`mobile-tab${moreActive ? ' active' : ''}`} onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-controls={menuId} aria-current={moreActive ? 'page' : undefined}><Menu size={19} /><span>Mais</span></button>
      </nav>
    </>
  );
}

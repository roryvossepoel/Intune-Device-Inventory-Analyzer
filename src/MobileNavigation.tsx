import { useEffect, useId, useRef, useState } from 'react';
import ShareMenu from './ShareMenu';

type Destination = 'overview' | 'devices' | 'reports' | 'faq';
type Props = {
  activeView: Destination | 'home';
  onNavigate: (view: Destination) => void;
};

const items: { id: Destination; label: string }[] = [
  { id: 'overview', label: 'Dashboard' },
  { id: 'devices', label: 'Device Explorer' },
  { id: 'reports', label: 'Reports' },
  { id: 'faq', label: 'FAQ' },
];

/** Mobile disclosure navigation. Uses the same view callbacks as the desktop header. */
export default function MobileNavigation({ activeView, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => { setOpen(false); }, [activeView]);

  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 820px)');
    const onResize = () => {
      if (mobile.matches) return;
      const hadFocus = root.current?.contains(document.activeElement);
      setOpen(false);
      if (hadFocus) {
        const desktopTarget = document.querySelector<HTMLElement>(
          '.topbar .mainNav button.active, .topbar .brand',
        );
        desktopTarget?.focus({ preventScroll: true });
      }
    };
    mobile.addEventListener('change', onResize);
    return () => mobile.removeEventListener('change', onResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Let the existing Share menu close first; a second Escape closes navigation.
      if (root.current?.querySelector('.idaShare.open')) {
        root.current.querySelector<HTMLButtonElement>('.idaShareToggle')?.focus();
        return;
      }
      event.preventDefault();
      setOpen(false);
      toggle.current?.focus({ preventScroll: true });
    };
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onOutside);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  function choose(view: Destination) {
    setOpen(false);
    toggle.current?.focus({ preventScroll: true });
    onNavigate(view);
    // The app switches views without a page load. Put keyboard focus on the new heading.
    requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('main h1');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    });
  }

  return <div className="idaMobileNavigation" ref={root}>
    <button
      type="button"
      ref={toggle}
      className="idaMobileMenuToggle"
      aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
      aria-expanded={open}
      aria-controls={panelId}
      onClick={() => setOpen(value => !value)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path className="idaMenuLineTop" d="M4 6h16" />
        <path className="idaMenuLineMiddle" d="M4 12h16" />
        <path className="idaMenuLineBottom" d="M4 18h16" />
      </svg>
    </button>
    <div id={panelId} className="idaMobileMenuPanel" hidden={!open}>
      {open && <>
        <nav aria-label="Mobile navigation">
          <ul className="idaMobileMenuLinks">
            <li><a href="/" className="idaMobileMenuLink" aria-current={activeView === 'home' ? 'page' : undefined}>
              <NavIcon name="home" /><span>Home</span><NavChevron />
            </a></li>
            {items.map(item => <li key={item.id}>
              <button
                type="button"
                className="idaMobileMenuLink"
                aria-current={activeView === item.id ? 'page' : undefined}
                onClick={() => choose(item.id)}
              >
                <NavIcon name={item.id} /><span>{item.label}</span><NavChevron />
              </button>
            </li>)}
          </ul>
        </nav>
        <div className="idaMobileMenuUtilities">
          <ShareMenu />
          <a className="idaMobileProjectLink" href="https://github.com/roryvossepoel/Intune-Device-Inventory-Analyzer" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository (opens in a new tab)">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 19c-4.3 1.3-4.3-2.5-6-3m12 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 19 4.77 5.07 5.07 0 0 0 18.91 1S17.73.65 15 2.48a13.38 13.38 0 0 0-7 0C5.27.65 4.09 1 4.09 1A5.07 5.07 0 0 0 4 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 8 18.13V22" /></svg>
            <span>GitHub</span>
            <svg className="idaMobileExternalIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10" /></svg>
          </a>
        </div>
      </>}
    </div>
  </div>;
}

function NavChevron() {
  return <svg className="idaMobileNavChevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6" /></svg>;
}

function NavIcon({ name }: { name: Destination | 'home' }) {
  return <svg className="idaMobileNavIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {name === 'home' && <><path d="m3 10 9-7 9 7M5 9v11h14V9" /><path d="M9 20v-7h6v7" /></>}
    {name === 'overview' && <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>}
    {name === 'devices' && <><rect x="3" y="4" width="14" height="10" rx="2" /><path d="M7 19h6m-3-5v5" /><rect x="16" y="9" width="5" height="11" rx="1.4" /></>}
    {name === 'reports' && <><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 17v-3m4 3v-6m3 6v-4" /></>}
    {name === 'faq' && <><circle cx="12" cy="12" r="9" /><path d="M9.4 9a2.6 2.6 0 0 1 5.1.8c0 1.9-2.5 2.1-2.5 3.7M12 17h.01" /></>}
  </svg>;
}

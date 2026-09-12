import { useEffect, useId, useRef, useState } from 'react';
import ShareMenu from './ShareMenu';

type Destination = 'overview' | 'devices' | 'reports' | 'faq';
type Props = {
  activeView: Destination | 'home';
  onNavigate: (view: Destination) => void;
};

/** Mobile utility menu. Primary navigation stays visible; only FAQ, Share and GitHub move here. */
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
        document.querySelector<HTMLElement>('.topbar .brand')?.focus({ preventScroll: true });
      }
    };
    mobile.addEventListener('change', onResize);
    return () => mobile.removeEventListener('change', onResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (root.current?.querySelector('.idaShare.open')) return;
      event.preventDefault();
      setOpen(false);
      toggle.current?.focus({ preventScroll: true });
    };
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  function openFaq() {
    setOpen(false);
    onNavigate('faq');
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
      aria-label={open ? 'Close more menu' : 'Open more menu'}
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
      {open && <div className="idaMobileMenuUtilitiesOnly" aria-label="More options">
        <button
          type="button"
          className="idaMobileMenuLink"
          aria-current={activeView === 'faq' ? 'page' : undefined}
          onClick={openFaq}
        >
          <UtilityIcon name="faq" /><span>FAQ</span><NavChevron />
        </button>

        <ShareMenu />

        <a
          className="idaMobileProjectLink"
          href="https://github.com/roryvossepoel/Intune-Device-Inventory-Analyzer"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub repository (opens in a new tab)"
        >
          <UtilityIcon name="github" />
          <span>GitHub</span>
          <svg className="idaMobileExternalIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10" /></svg>
        </a>
      </div>}
    </div>
  </div>;
}

function NavChevron() {
  return <svg className="idaMobileNavChevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6" /></svg>;
}

function UtilityIcon({ name }: { name: 'faq' | 'github' }) {
  return <svg className="idaMobileNavIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {name === 'faq'
      ? <><circle cx="12" cy="12" r="9" /><path d="M9.4 9a2.6 2.6 0 0 1 5.1.8c0 1.9-2.5 2.1-2.5 3.7M12 17h.01" /></>
      : <path d="M9 19c-4.3 1.3-4.3-2.5-6-3m12 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 19 4.77 5.07 5.07 0 0 0 18.91 1S17.73.65 15 2.48a13.38 13.38 0 0 0-7 0C5.27.65 4.09 1 4.09 1A5.07 5.07 0 0 0 4 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 8 18.13V22" />}
  </svg>;
}

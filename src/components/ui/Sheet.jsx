import { useEffect } from 'react';
import { X } from 'lucide-react';

// Panel que sube desde abajo en el celular y se muestra centrado en pantallas grandes.
// z-[1100] para quedar por encima de los controles de Leaflet en el mapa.
const Sheet = ({ open, onClose, title, subtitle, children, footer, size = 'md' }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const width = size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg';

  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${width} bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] flex flex-col sheet-up`}
      >
        {/* Manija para que se entienda que es un panel deslizable */}
        <div className="sm:hidden flex justify-center pt-2.5">
          <span className="w-10 h-1.5 rounded-full bg-line" />
        </div>
        {(title || subtitle) && (
          <div className="flex items-start justify-between gap-3 px-5 pt-3 sm:pt-5 pb-3">
            <div className="min-w-0">
              {title && <h3 className="text-lg font-semibold leading-tight">{title}</h3>}
              {subtitle && <div className="text-sm text-muted mt-0.5">{subtitle}</div>}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 w-9 h-9 -mr-1 flex items-center justify-center rounded-full bg-surface text-muted hover:text-ink"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto overscroll-contain px-5 pb-5 flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-line pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
};

export default Sheet;

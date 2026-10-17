import { useRef, useState } from 'react';
import { Send, Check, Loader2, RotateCw } from 'lucide-react';

const ACTION_W = 104; // ancho del botón que aparece al deslizar

// Envuelve una tarjeta: al deslizarla hacia la izquierda aparece "Enviar".
// El estado del envío (idle | sending | done | error) lo maneja useQuickSend.
const SwipeToSend = ({ enabled, isOpen, onOpenChange, state, onPress, color, resend, children }) => {
  const [drag, setDrag] = useState(null); // desplazamiento mientras se arrastra
  const gesture = useRef(null);
  const suppressClick = useRef(false);

  const base = isOpen ? -ACTION_W : 0;
  const offset = drag ?? base;

  const onPointerDown = (e) => {
    if (!enabled || state === 'sending' || e.pointerType === 'mouse') return;
    gesture.current = { x: e.clientX, y: e.clientY, dir: null, id: e.pointerId };
  };

  const onPointerMove = (e) => {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.dir) {
      // Recién decide la dirección después de unos píxeles: así el scroll vertical sigue igual
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      g.dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      if (g.dir === 'h') {
        try {
          e.currentTarget.setPointerCapture(g.id);
        } catch {
          // algunos navegadores no dejan capturar; el gesto sigue funcionando igual
        }
      }
    }
    if (g.dir !== 'h') return;
    setDrag(Math.max(-ACTION_W * 1.25, Math.min(0, base + dx)));
  };

  const onPointerUp = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.dir !== 'h') return;
    // El "click" que algunos navegadores disparan al soltar no tiene que abrir la ficha.
    // Se limpia solo, por si el navegador no lo dispara.
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 400);
    const open = (drag ?? base) < -ACTION_W / 2;
    setDrag(null);
    onOpenChange(open);
  };

  const onClickCapture = (e) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    // Con el botón visible, tocar la tarjeta solo la cierra
    if (isOpen) {
      e.stopPropagation();
      e.preventDefault();
      onOpenChange(false);
    }
  };

  const label = { idle: resend ? 'Reenviar' : 'Enviar', sending: 'Enviando', done: 'Enviado', error: 'Reintentar' }[state];
  const Icon = { idle: Send, sending: Loader2, done: Check, error: RotateCw }[state];
  const showAction = enabled && (offset < 0 || state !== 'idle');

  return (
    <div className="relative">
      {showAction && (
        <button
          onClick={onPress}
          disabled={state === 'sending' || state === 'done'}
          aria-label={label}
          className={`absolute inset-y-0 right-0 rounded-2xl flex flex-col items-center justify-center gap-1 text-white text-xs font-semibold transition-colors ${
            state === 'done' ? 'bg-green-600' : state === 'error' ? 'bg-red-600' : color
          }`}
          style={{ width: ACTION_W }}
        >
          <Icon size={22} className={state === 'sending' ? 'animate-spin' : state === 'done' ? 'animate-bounce' : ''} />
          {label}
        </button>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        className="relative touch-pan-y"
        style={{
          transform: `translateX(${offset}px)`,
          transition: drag === null ? 'transform 0.25s ease' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeToSend;

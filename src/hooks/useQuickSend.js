import { useCallback, useEffect, useRef, useState } from 'react';
import { quickSendEmail } from '../services/quickSend';
import { useData } from './useFirebaseData';

// Envío rápido de una empresa: spinner -> tilde -> recién ahí marca "Sent".
// La demora antes de actualizar el estado evita que la tarjeta desaparezca a mitad
// de la animación cuando la lista está filtrada por "Pendiente".
export const useQuickSend = (company, sector, { onDone, onError } = {}) => {
  const { update } = useData();
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const send = useCallback(async () => {
    if (state === 'sending' || state === 'done') return;
    setState('sending');
    try {
      await quickSendEmail(company, sector);
      setState('done');
      timers.current.push(
        setTimeout(async () => {
          onDone?.();
          try {
            await update(sector, company.id, { status: 'Sent' });
          } catch (err) {
            // El email ya salió: solo queda el estado sin actualizar
            console.error('Error marcando como enviada:', err);
          }
          setState('idle');
        }, 1100)
      );
    } catch (err) {
      console.error('Error en envío rápido:', err);
      setState('error');
      onError?.(err);
    }
  }, [state, company, sector, update, onDone, onError]);

  return { state, send };
};

import { useCallback, useEffect, useRef, useState } from 'react';
import { composeEmail } from '../services/quickSend';
import { sendAs } from '../services/mailer';
import { useData } from './useFirebaseData';
import { useAuth } from './useAuth';
import { useResources } from './useResources';

// Envío rápido de una empresa: spinner -> tilde -> recién ahí marca "Sent".
// La demora antes de actualizar el estado evita que la tarjeta desaparezca a mitad
// de la animación cuando la lista está filtrada por "Pendiente".
export const useQuickSend = (company, sector, { onDone, onError } = {}) => {
  const { update } = useData();
  const { isAdmin, getGmailToken } = useAuth();
  const resources = useResources();
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const send = useCallback(async () => {
    if (state === 'sending' || state === 'done') return;
    setState('sending');
    try {
      if (!company?.email) throw new Error('La empresa no tiene email');
      const mail = composeEmail(company, sector, resources, { isAdmin });
      if (!mail.body.trim()) throw new Error('Todavía no cargaste el email para este rubro (Recursos)');
      const attachments = await resources.attachmentsFor(sector);
      await sendAs({ isAdmin, getGmailToken }, { ...mail, attachments: attachments.length ? attachments : undefined });
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
  }, [state, company, sector, resources, isAdmin, getGmailToken, update, onDone, onError]);

  return { state, send };
};

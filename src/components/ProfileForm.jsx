import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { useResources } from '../hooks/useResources';

const inputClass = 'w-full px-4 py-3 bg-surface border border-line rounded-xl text-sm outline-none focus:border-primary focus:bg-card';

// Nombre (para el saludo de la app), firma y teléfono que van en los emails
const ProfileForm = ({ onSaved, submitLabel = 'Guardar' }) => {
  const { profile, saveProfile } = useResources();
  const [form, setForm] = useState({
    displayName: profile?.displayName || '',
    signature: profile?.signature || '',
    phone: profile?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k) => (e) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.displayName.trim()) return;
    try {
      setSaving(true);
      await saveProfile({ displayName: form.displayName.trim(), signature: form.signature.trim(), phone: form.phone.trim() });
      setSaved(true);
      onSaved?.();
    } catch (err) {
      console.error('Error guardando perfil:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="block text-xs font-medium text-muted mb-1.5">¿Cómo te llamamos?</span>
        <input value={form.displayName} onChange={set('displayName')} maxLength={80} placeholder="Ej. Martín" className={inputClass} required />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-muted mb-1.5">Firma de tus emails</span>
        <textarea value={form.signature} onChange={set('signature')} maxLength={500} rows={3} placeholder={'Ej.\nMartín García\nHousekeeping & Barista'} className={`${inputClass} resize-none`} />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-muted mb-1.5">Teléfono (opcional)</span>
        <input value={form.phone} onChange={set('phone')} maxLength={60} placeholder="+61 ..." className={inputClass} />
      </label>
      <button type="submit" disabled={saving || !form.displayName.trim()} className="w-full py-3 rounded-2xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
        {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null}
        {saved ? 'Guardado' : submitLabel}
      </button>
    </form>
  );
};

export default ProfileForm;

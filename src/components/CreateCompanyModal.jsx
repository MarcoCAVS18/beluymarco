import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Sheet from './ui/Sheet';
import CountrySelect from './CountrySelect';
import SectorToggle from './SectorToggle';
import { useData } from '../hooks/useFirebaseData';
import { SECTORS, STATUS_META, statusMeta } from '../data/sectors';

const EMPTY = { name: '', email: '', location: '', country: '', season: '', applyUrl: '', status: 'Pending', notes: '' };

const inputClass =
  'w-full px-4 py-2.5 bg-surface border border-line rounded-xl text-sm outline-none focus:border-primary focus:bg-card transition-colors';

const Field = ({ label, required, children }) => (
  <label className="block">
    <span className="block text-xs font-medium text-muted mb-1.5">
      {label} {required && <span className="text-red-600">*</span>}
    </span>
    {children}
  </label>
);

const CreateCompanyModal = ({ isOpen, onClose, sector: initialSector, onCreated }) => {
  const { create, statusOptions } = useData();
  const [sector, setSector] = useState(initialSector);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Al abrir, arranca en el rubro que se está mirando
  const [lastOpen, setLastOpen] = useState(false);
  if (isOpen !== lastOpen) {
    setLastOpen(isOpen);
    if (isOpen) setSector(initialSector);
  }

  const meta = SECTORS[sector];
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e?.target ? e.target.value : e }));

  const handleClose = () => {
    setForm(EMPTY);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Falta el nombre');
    if (!form.country) return setError('Falta el país');

    setLoading(true);
    setError(null);
    try {
      const email = form.email.trim();
      const data = {
        name: form.name.trim(),
        email,
        emailVerified: email ? false : null,
        location: form.location.trim(),
        country: form.country,
        status: form.status,
        notes: form.notes.trim(),
        hidden: false,
        [meta.seasonField]: form.season.trim(),
      };
      if (sector === 'kyc') data.applyUrl = form.applyUrl.trim();

      const created = await create(sector, data);
      onCreated?.(sector, created);
      handleClose();
    } catch (err) {
      console.error('Error creando empresa:', err);
      setError('No se pudo crear. Probá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const statuses = statusOptions.length ? statusOptions.map((s) => s.label) : Object.keys(STATUS_META);

  return (
    <Sheet
      open={isOpen}
      onClose={handleClose}
      title="Nueva empresa"
      footer={
        <button
          type="submit"
          form="create-company"
          disabled={loading}
          className="w-full py-3 rounded-2xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Crear empresa
        </button>
      }
    >
      <form id="create-company" onSubmit={handleSubmit} className="space-y-4">
        <SectorToggle sector={sector} onSectorChange={setSector} />

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

        <Field label={meta.nameLabel} required>
          <input type="text" value={form.name} onChange={set('name')} className={inputClass} autoFocus />
        </Field>
        <Field label="Email">
          <input type="email" value={form.email} onChange={set('email')} placeholder="contacto@empresa.com" className={inputClass} />
        </Field>
        {sector === 'kyc' && (
          <Field label="Link de aplicación (si no hay email)">
            <input type="url" value={form.applyUrl} onChange={set('applyUrl')} placeholder="https://..." className={inputClass} />
          </Field>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Ubicación">
            <input type="text" value={form.location} onChange={set('location')} placeholder="Ciudad, región" className={inputClass} />
          </Field>
          <Field label="País" required>
            <CountrySelect value={form.country} onChange={set('country')} />
          </Field>
        </div>
        <Field label={meta.seasonLabel}>
          <input type="text" value={form.season} onChange={set('season')} placeholder={meta.seasonPlaceholder} className={inputClass} />
        </Field>
        <div>
          <span className="block text-xs font-medium text-muted mb-1.5">Estado</span>
          <div className="flex flex-wrap gap-2">
            {statuses.map((label) => {
              const m = statusMeta(label);
              const active = form.status === label;
              return (
                <button
                  type="button"
                  key={label}
                  onClick={() => setForm((f) => ({ ...f, status: label }))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border ${
                    active ? `${m.pill} border-transparent ring-2 ring-offset-1 ring-current` : 'border-line text-muted'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${m.dot}`} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
        <Field label="Notas">
          <textarea value={form.notes} onChange={set('notes')} rows={3} className={`${inputClass} resize-none`} />
        </Field>
      </form>
    </Sheet>
  );
};

export default CreateCompanyModal;

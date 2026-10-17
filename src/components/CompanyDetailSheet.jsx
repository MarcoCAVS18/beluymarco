import { useEffect, useMemo, useState } from 'react';
import { Copy, Check, Send, MapPin, ShieldCheck, ShieldAlert, ExternalLink, EyeOff, Eye, Loader2, Navigation } from 'lucide-react';
import Sheet from './ui/Sheet';
import CountryFlag from './CountryFlag';
import CountrySelect from './CountrySelect';
import { useData } from '../hooks/useFirebaseData';
import { SECTORS, STATUS_META, countryName, statusMeta, displayPlace } from '../data/sectors';
import { isRecentlyAdded } from '../data/constants';

const inputClass =
  'w-full px-4 py-2.5 bg-surface border border-line rounded-xl text-sm outline-none focus:border-primary focus:bg-card transition-colors';

const Field = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-medium text-muted mb-1.5">{label}</span>
    {children}
  </label>
);

// Campos editables de una empresa, según el rubro
const formFrom = (c, sector) => ({
  name: c?.name || '',
  email: c?.email || '',
  emailVerified: c?.emailVerified ?? null,
  location: c?.location || '',
  country: c?.country || '',
  season: c?.[SECTORS[sector].seasonField] || '',
  applyUrl: c?.applyUrl || '',
  notes: c?.notes || '',
});

// "Oslo · Noruega", sin repetir el país si ya está en la ubicación
const placeWithCountry = (c) => {
  const place = displayPlace(c);
  const country = countryName(c.country);
  return place.toLowerCase().includes(country.toLowerCase()) ? place : `${place} · ${country}`;
};

const CompanyDetailSheet = ({ company, sector, onClose, onSendEmail }) => {
  const { update, statusOptions, isAdmin } = useData();
  const meta = SECTORS[sector];
  const [form, setForm] = useState(() => formFrom(company, sector));
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState(company?.status);
  const [hidden, setHidden] = useState(!!company?.hidden);

  useEffect(() => {
    setForm(formFrom(company, sector));
    setStatus(company?.status);
    setHidden(!!company?.hidden);
  }, [company, sector]);

  const original = useMemo(() => formFrom(company, sector), [company, sector]);
  const dirty = JSON.stringify(form) !== JSON.stringify(original);

  if (!company) return null;

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => {
      const next = { ...f, [key]: value };
      // Si cambia el email, vuelve a quedar sin verificar
      if (key === 'email') next.emailVerified = value ? false : null;
      return next;
    });
  };

  const save = async () => {
    const updates = {};
    if (!isAdmin) {
      if (form.notes !== original.notes) updates.notes = form.notes;
      if (!Object.keys(updates).length) return;
      try {
        setSaving(true);
        await update(sector, company.id, updates);
      } catch (error) {
        console.error('Error guardando notas:', error);
      } finally {
        setSaving(false);
      }
      return;
    }
    if (form.name !== original.name) updates.name = form.name;
    if (form.email !== original.email) updates.email = form.email;
    if (form.emailVerified !== original.emailVerified) updates.emailVerified = form.emailVerified;
    if (form.location !== original.location) updates.location = form.location;
    if (form.country !== original.country) updates.country = form.country;
    if (form.season !== original.season) updates[meta.seasonField] = form.season;
    if (sector === 'kyc' && form.applyUrl !== original.applyUrl) updates.applyUrl = form.applyUrl;
    if (form.notes !== original.notes) updates.notes = form.notes;
    if (!Object.keys(updates).length) return;
    try {
      setSaving(true);
      await update(sector, company.id, updates);
    } catch (error) {
      console.error('Error guardando cambios:', error);
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (dirty && !window.confirm('Tenés cambios sin guardar. ¿Descartarlos?')) return;
    onClose();
  };

  const changeStatus = async (label) => {
    const prev = status;
    setStatus(label);
    try {
      await update(sector, company.id, { status: label });
    } catch (error) {
      console.error('Error cambiando estado:', error);
      setStatus(prev);
    }
  };

  const toggleHidden = async () => {
    const next = !hidden;
    setHidden(next);
    try {
      await update(sector, company.id, { hidden: next });
    } catch (error) {
      console.error('Error ocultando empresa:', error);
      setHidden(!next);
    }
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(company.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [company.name, company.location, countryName(company.country)].filter(Boolean).join(', ')
  )}`;

  // Estados de la config de Firestore, en el orden que vienen; si no hay, los conocidos
  const statuses = statusOptions.length ? statusOptions.map((s) => s.label) : Object.keys(STATUS_META);

  return (
    <Sheet
      open
      onClose={close}
      title={
        <span className="flex items-center gap-2">
          <span className="truncate">{company.name}</span>
          {isRecentlyAdded(company.createdAt) && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-50 text-green-700">
              Nueva
            </span>
          )}
        </span>
      }
      subtitle={
        <span className="flex items-center gap-1.5">
          <CountryFlag code={company.country} size="sm" />
          <span className="truncate">{placeWithCountry(company)}</span>
        </span>
      }
      footer={
        dirty ? (
          <div className="flex gap-2">
            <button onClick={() => setForm(original)} className="flex-1 py-3 rounded-2xl bg-surface text-sm font-medium">
              Descartar
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-[2] py-3 rounded-2xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Guardar cambios
            </button>
          </div>
        ) : null
      }
    >
      <div className="space-y-5">
        {/* Acciones rápidas */}
        <div className="grid grid-cols-4 gap-2">
          <QuickAction
            icon={Send}
            label="Enviar"
            onClick={() => onSendEmail?.(company)}
            disabled={!company.email}
            accent={meta.text}
          />
          <QuickAction icon={copied ? Check : Copy} label={copied ? 'Copiado' : 'Copiar'} onClick={copyEmail} disabled={!company.email} />
          <QuickAction icon={Navigation} label="Maps" href={mapsUrl} />
          <QuickAction icon={hidden ? Eye : EyeOff} label={hidden ? 'Mostrar' : 'Ocultar'} onClick={toggleHidden} />
        </div>

        {/* Estado */}
        <div>
          <span className="block text-xs font-medium text-muted mb-2">Estado</span>
          <div className="flex flex-wrap gap-2">
            {statuses.map((label) => {
              const m = statusMeta(label);
              const active = status === label;
              return (
                <button
                  key={label}
                  onClick={() => changeStatus(label)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    active ? `${m.pill} border-transparent ring-2 ring-offset-1 ring-current` : 'border-line text-muted hover:text-ink'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${m.dot}`} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {isAdmin ? (
          <>
            {/* Contacto */}
            <div className="space-y-3">
              <Field label="Email">
                <input type="email" value={form.email} onChange={set('email')} placeholder="contacto@empresa.com" className={inputClass} />
              </Field>
              {form.email && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, emailVerified: !f.emailVerified }))}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${
                    form.emailVerified ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {form.emailVerified ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                    {form.emailVerified ? 'Email verificado' : 'Email sin verificar'}
                  </span>
                  <span className="text-xs underline underline-offset-2">{form.emailVerified ? 'Marcar sin verificar' : 'Confirmar'}</span>
                </button>
              )}
              {sector === 'kyc' && (
                <Field label="Link de aplicación (si no hay email)">
                  <div className="flex gap-2">
                    <input type="url" value={form.applyUrl} onChange={set('applyUrl')} placeholder="https://..." className={inputClass} />
                    {form.applyUrl && (
                      <a href={form.applyUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 w-11 flex items-center justify-center rounded-xl bg-surface text-kyc" aria-label="Abrir link">
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>
                </Field>
              )}
            </div>

            {/* Datos */}
            <div className="space-y-3">
              <Field label={meta.nameLabel}>
                <input type="text" value={form.name} onChange={set('name')} className={inputClass} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Ubicación">
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input type="text" value={form.location} onChange={set('location')} placeholder="Ciudad, región" className={`${inputClass} pl-9`} />
                  </div>
                </Field>
                <Field label="País">
                  <CountrySelect value={form.country} onChange={set('country')} />
                </Field>
              </div>
              <Field label={meta.seasonLabel}>
                <input type="text" value={form.season} onChange={set('season')} placeholder={meta.seasonPlaceholder} className={inputClass} />
              </Field>
              <Field label="Notas">
                <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="¿Respondieron? ¿Qué dijeron?" className={`${inputClass} resize-none`} />
              </Field>
            </div>
          </>
        ) : (
          <>
            {/* Datos de la empresa: solo lectura para los invitados (el catálogo lo mantiene el admin) */}
            <div className="bg-surface rounded-2xl divide-y divide-line">
              <InfoRow label="Email" value={company.email || 'Sin email'} mono={!!company.email} />
              {sector === 'kyc' && company.applyUrl && (
                <InfoRow
                  label="Link de aplicación"
                  value={
                    <a href={company.applyUrl} target="_blank" rel="noopener noreferrer" className="text-kyc inline-flex items-center gap-1">
                      Abrir <ExternalLink size={13} />
                    </a>
                  }
                />
              )}
              <InfoRow label="Ubicación" value={placeWithCountry(company)} />
              {company[meta.seasonField] && <InfoRow label={meta.seasonLabel} value={company[meta.seasonField]} />}
            </div>
            <Field label="Tus notas (solo las ves vos)">
              <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="¿Respondieron? ¿Qué dijeron?" className={`${inputClass} resize-none`} />
            </Field>
          </>
        )}
      </div>
    </Sheet>
  );
};

const InfoRow = ({ label, value, mono }) => (
  <div className="flex items-start justify-between gap-3 px-4 py-3">
    <span className="text-xs font-medium text-muted pt-0.5 shrink-0">{label}</span>
    <span className={`text-sm text-right break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);

const QuickAction = ({ icon, label, onClick, href, disabled, accent = 'text-ink' }) => {
  const Icon = icon;
  const cls = `flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl bg-surface text-xs font-medium transition-colors ${
    disabled ? 'opacity-40 pointer-events-none' : 'hover:bg-line'
  }`;
  const content = (
    <>
      <Icon size={20} className={accent} />
      <span className="text-muted">{label}</span>
    </>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {content}
    </button>
  );
};

export default CompanyDetailSheet;

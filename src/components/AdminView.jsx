import { useCallback, useEffect, useState } from 'react';
import { Loader2, UserPlus, ShieldCheck, ShieldOff, Trash2, Copy, Check, Send, Gauge, RefreshCw, CircleCheck, TriangleAlert, OctagonAlert, MessageCircle, Pencil } from 'lucide-react';
import Sheet from './ui/Sheet';
import { useAuth } from '../hooks/useAuth';
import { listMembers, saveMember, setMemberStatus, deleteMember, getUsage, FREE_LIMITS } from '../firebase/adminServices';
import { MONITORING_SCOPE, ADMIN_EMAIL } from '../contexts/authContext';
import { sendAs } from '../services/mailer';
import { SECTORS, SECTOR_IDS } from '../data/sectors';

const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inviteText = (m) =>
  `¡Hola${m.name ? ` ${m.name}` : ''}! Te invité a la app para organizar la búsqueda de trabajo. ` +
  `Entrá con tu cuenta de Google (${m.email}) acá: ${window.location.origin}`;

// Panel del admin: invitados (con sus rubros) y uso de la cuota gratis de Firestore
const AdminView = () => {
  return (
    <div className="space-y-8 fade-in">
      <h1 className="text-2xl font-bold">Admin</h1>
      <UsagePanel />
      <MembersPanel />
    </div>
  );
};

// ==================== USO ====================
const level = (pct) =>
  pct >= 80
    ? { label: 'Cerca del límite', icon: OctagonAlert, text: 'text-red-700', bar: 'bg-red-600', tint: 'bg-red-50' }
    : pct >= 50
      ? { label: 'Atención', icon: TriangleAlert, text: 'text-amber-700', bar: 'bg-amber-500', tint: 'bg-amber-50' }
      : { label: 'Bien', icon: CircleCheck, text: 'text-green-700', bar: 'bg-green-600', tint: 'bg-green-50' };

const resetTime = (since) =>
  new Date(since.getTime() + 86400000).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

const UsagePanel = () => {
  const { getGoogleToken } = useAuth();
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async (force = false) => {
    try {
      setLoading(true);
      setError(null);
      const token = await getGoogleToken(MONITORING_SCOPE, { force });
      setUsage(await getUsage(token, PROJECT_ID));
    } catch (err) {
      console.error('Error leyendo uso:', err);
      setError(err.status === 403 ? 'Google no dejó leer las métricas. Revisá que el permiso de monitoreo esté habilitado (ver guía).' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const meters = usage
    ? [
        { key: 'reads', label: 'Lecturas', used: usage.today.reads, limit: FREE_LIMITS.reads },
        { key: 'writes', label: 'Escrituras', used: usage.today.writes, limit: FREE_LIMITS.writes },
        { key: 'deletes', label: 'Borrados', used: usage.today.deletes, limit: FREE_LIMITS.deletes },
      ]
    : [];
  const maxDay = usage ? Math.max(FREE_LIMITS.reads, ...usage.days.map((d) => d.reads)) : 1;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Gauge size={20} className="text-primary" /> Uso de hoy
        </h2>
        {usage && (
          <button onClick={() => load()} disabled={loading} className="text-sm text-primary font-medium flex items-center gap-1.5 disabled:opacity-60">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        )}
      </div>
      <p className="text-sm text-muted mb-4">
        Plan gratis (Spark): si se llega al 100%, la app deja de leer hasta que se reinicia la cuota. Nunca se cobra nada.
      </p>

      {!usage ? (
        <div className="bg-card rounded-3xl p-5 shadow-sm text-center">
          <p className="text-sm text-muted mb-4">Para ver el uso real, Google te pide un permiso de solo lectura de métricas (una vez por hora).</p>
          <button onClick={() => load()} disabled={loading} className="px-5 py-3 rounded-2xl bg-primary text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Gauge size={16} />}
            Ver uso
          </button>
          {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3 mt-4 text-left">{error}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {meters.map((m) => {
              const pct = Math.min(100, (m.used / m.limit) * 100);
              const lv = level(pct);
              const Icon = lv.icon;
              return (
                <div key={m.key} className="bg-card rounded-3xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">{m.label}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${lv.tint} ${lv.text}`}>
                      <Icon size={12} /> {lv.label}
                    </span>
                  </div>
                  <div className="text-2xl font-bold tabular-nums mt-1">
                    {m.used.toLocaleString('es')}
                    <span className="text-sm font-normal text-muted"> / {m.limit.toLocaleString('es')}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface mt-3 overflow-hidden" role="meter" aria-valuemin={0} aria-valuemax={m.limit} aria-valuenow={m.used} aria-label={m.label}>
                    <div className={`h-full rounded-full ${lv.bar}`} style={{ width: `${Math.max(pct, 1)}%` }} />
                  </div>
                  <div className="text-xs text-muted mt-1.5 tabular-nums">{pct.toLocaleString('es', { maximumFractionDigits: pct < 10 ? 1 : 0 })}% de la cuota gratis</div>
                </div>
              );
            })}
          </div>

          {usage.days.length > 1 && (
            <div className="bg-card rounded-3xl p-4 shadow-sm">
              <div className="text-sm font-medium">Lecturas por día (últimos 7)</div>
              <div className="text-xs text-muted mb-3">La línea punteada es el límite gratis ({FREE_LIMITS.reads.toLocaleString('es')}).</div>
              <div className="relative h-28 flex items-end gap-2">
                <div className="absolute inset-x-0 border-t border-dashed border-muted/50" style={{ bottom: `${(FREE_LIMITS.reads / maxDay) * 100}%` }} />
                {usage.days.map((d) => (
                  <div key={d.day} className="flex-1 h-full flex items-end group relative" title={`${new Date(d.day).toLocaleDateString('es', { weekday: 'short', day: 'numeric' })}: ${d.reads.toLocaleString('es')} lecturas`}>
                    <div className="w-full rounded-t bg-primary/80 group-hover:bg-primary" style={{ height: `${Math.max(2, (d.reads / maxDay) * 100)}%` }} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-1.5">
                {usage.days.map((d) => (
                  <span key={d.day} className="flex-1 text-center text-[10px] text-muted">
                    {new Date(d.day).toLocaleDateString('es', { weekday: 'narrow' })}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted">
            Se reinicia todos los días a las {resetTime(usage.since)} (tu hora). Datos de Google Cloud, con unos minutos de atraso.
          </p>
        </div>
      )}
    </section>
  );
};

// ==================== INVITADOS ====================
const MembersPanel = () => {
  const [members, setMembers] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | miembro
  const [shareFor, setShareFor] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setMembers(await listMembers());
    } catch (err) {
      console.error('Error leyendo invitados:', err);
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    // Primera lectura de la lista (después se recarga con load() tras cada cambio)
    listMembers()
      .then(setMembers)
      .catch((err) => {
        console.error('Error leyendo invitados:', err);
        setError(err.message);
      });
  }, []);

  const toggleStatus = async (m) => {
    const next = m.status === 'active' ? 'revoked' : 'active';
    if (next === 'revoked' && !window.confirm(`¿Quitarle el acceso a ${m.name || m.email}? Deja de ver la app en el momento.`)) return;
    await setMemberStatus(m.email, next);
    load();
  };

  const remove = async (m) => {
    if (!window.confirm(`¿Borrar la invitación de ${m.email}? Sus datos guardados no se borran, pero ya no puede entrar.`)) return;
    await deleteMember(m.email);
    load();
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold">Invitados</h2>
        <button onClick={() => setEditing('new')} className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2">
          <UserPlus size={16} /> Invitar
        </button>
      </div>
      <p className="text-sm text-muted mb-4">Solo entran los emails de Google que invites acá, y cada uno ve únicamente los rubros que le elijas.</p>

      {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3 mb-3">{error}</p>}
      {!members ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : members.filter((m) => m.email !== ADMIN_EMAIL).length === 0 ? (
        <div className="bg-card rounded-3xl p-6 shadow-sm text-center text-sm text-muted">Todavía no invitaste a nadie.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {members
            .filter((m) => m.email !== ADMIN_EMAIL)
            .map((m) => (
              <div key={m.email} className="bg-card rounded-3xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{m.name || m.email}</div>
                    {m.name && <div className="text-xs text-muted truncate">{m.email}</div>}
                  </div>
                  <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${m.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {m.status === 'active' ? <ShieldCheck size={12} /> : <ShieldOff size={12} />}
                    {m.status === 'active' ? 'Activo' : 'Sin acceso'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(m.sectors || []).map((s) => (
                    <span key={s} className={`text-xs font-medium px-2 py-1 rounded-lg ${SECTORS[s]?.tint} ${SECTORS[s]?.text}`}>{SECTORS[s]?.label || s}</span>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <MemberAction onClick={() => setShareFor(m)} icon={Send}>Compartir</MemberAction>
                  <MemberAction onClick={() => setEditing(m)} icon={Pencil}>Rubros</MemberAction>
                  <MemberAction onClick={() => toggleStatus(m)} icon={m.status === 'active' ? ShieldOff : ShieldCheck}>{m.status === 'active' ? 'Quitar' : 'Activar'}</MemberAction>
                  <button onClick={() => remove(m)} className="w-10 shrink-0 rounded-xl bg-surface text-muted hover:text-red-600 flex items-center justify-center" aria-label="Borrar invitación">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      <InviteSheet
        member={editing}
        onClose={() => setEditing(null)}
        onSaved={(m, isNew) => {
          setEditing(null);
          load();
          if (isNew) setShareFor(m);
        }}
        existing={members || []}
      />
      <ShareSheet member={shareFor} onClose={() => setShareFor(null)} />
    </section>
  );
};

const MemberAction = ({ onClick, icon, children }) => {
  const Icon = icon;
  return (
    <button onClick={onClick} className="flex-1 py-2 rounded-xl bg-surface text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-line">
      <Icon size={14} /> {children}
    </button>
  );
};

const InviteSheet = ({ member, onClose, onSaved, existing }) => {
  const isNew = member === 'new';
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [sectors, setSectors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Al abrir, carga los datos del invitado (o vacío si es nuevo)
  const [prev, setPrev] = useState(null);
  if (member !== prev) {
    setPrev(member);
    setError(null);
    setEmail(isNew || !member ? '' : member.email);
    setName(isNew || !member ? '' : member.name || '');
    setSectors(isNew || !member ? [] : member.sectors || []);
  }

  const toggle = (s) => setSectors((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const save = async () => {
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) return setError('Ese email no parece válido.');
    if (clean === ADMIN_EMAIL) return setError('Esa es tu cuenta de admin.');
    if (isNew && existing.some((m) => m.email === clean)) return setError('Ese email ya tiene una invitación. Editala desde la lista.');
    if (!sectors.length) return setError('Elegí al menos un rubro.');
    try {
      setSaving(true);
      await saveMember(clean, { name, sectors, status: isNew ? 'active' : member.status, isNew });
      onSaved({ email: clean, name: name.trim(), sectors }, isNew);
    } catch (err) {
      console.error('Error guardando invitación:', err);
      setError('No se pudo guardar. Probá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={!!member}
      onClose={onClose}
      title={isNew ? 'Nueva invitación' : `Rubros de ${member?.name || member?.email || ''}`}
      subtitle={isNew ? 'Tiene que ser el email con el que entra a Google (Gmail).' : 'Los cambios se aplican en el momento.'}
      footer={
        <button onClick={save} disabled={saving} className="w-full py-3 rounded-2xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {saving && <Loader2 size={16} className="animate-spin" />}
          {isNew ? 'Crear invitación' : 'Guardar'}
        </button>
      }
    >
      <div className="space-y-4">
        {isNew && (
          <>
            <label className="block">
              <span className="block text-xs font-medium text-muted mb-1.5">Email de Google</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="martin@gmail.com" autoFocus className="w-full px-4 py-3 bg-surface border border-line rounded-xl text-sm outline-none focus:border-primary" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-muted mb-1.5">Nombre (solo para vos)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Martín" maxLength={80} className="w-full px-4 py-3 bg-surface border border-line rounded-xl text-sm outline-none focus:border-primary" />
            </label>
          </>
        )}
        <div>
          <span className="block text-xs font-medium text-muted mb-2">¿Qué empresas puede ver?</span>
          <div className="space-y-2">
            {SECTOR_IDS.map((s) => {
              const meta = SECTORS[s];
              const Icon = meta.icon;
              const on = sectors.includes(s);
              return (
                <button key={s} type="button" onClick={() => toggle(s)} className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left ${on ? `${meta.tint} border-transparent ring-2 ring-current ${meta.text}` : 'border-line'}`}>
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${on ? `${meta.bg} text-white` : 'bg-surface text-muted'}`}>
                    <Icon size={18} />
                  </span>
                  <span className="flex-1 font-medium text-ink">{meta.label}</span>
                  {on && <Check size={18} />}
                </button>
              );
            })}
          </div>
        </div>
        {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{error}</p>}
      </div>
    </Sheet>
  );
};

const ShareSheet = ({ member, onClose }) => {
  const { isAdmin, getGmailToken } = useAuth();
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const [prev, setPrev] = useState(null);
  if (member !== prev) {
    setPrev(member);
    setCopied(false);
    setSent(false);
    setError(null);
  }

  if (!member) return null;
  const text = inviteText(member);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
  };

  const email = async () => {
    try {
      setSending(true);
      setError(null);
      await sendAs({ isAdmin, getGmailToken }, { to: member.email, subject: 'Te invité a la app de búsqueda de trabajo', body: text });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet open onClose={onClose} title="Compartir invitación" subtitle={member.name || member.email}>
      <div className="space-y-3">
        <p className="text-sm bg-surface rounded-2xl p-4">{text}</p>
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="w-full py-3 rounded-2xl bg-green-600 text-white text-sm font-semibold flex items-center justify-center gap-2">
          <MessageCircle size={16} /> Mandar por WhatsApp
        </a>
        <button onClick={email} disabled={sending || sent} className="w-full py-3 rounded-2xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-70">
          {sending ? <Loader2 size={16} className="animate-spin" /> : sent ? <Check size={16} /> : <Send size={16} />}
          {sent ? 'Email enviado' : 'Mandar por email (desde tu Gmail)'}
        </button>
        <button onClick={copy} className="w-full py-3 rounded-2xl bg-surface text-sm font-medium flex items-center justify-center gap-2">
          {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
          {copied ? 'Copiado' : 'Copiar mensaje'}
        </button>
        {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{error}</p>}
      </div>
    </Sheet>
  );
};

export default AdminView;

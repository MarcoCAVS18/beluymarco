import { useState } from 'react';
import { Loader2, Check, Mail, ArrowRight, ArrowLeft, Sparkles, LogOut } from 'lucide-react';
import ProfileForm from './ProfileForm';
import DocumentsManager from './DocumentsManager';
import { useResources } from '../hooks/useResources';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useFirebaseData';
import { SECTORS } from '../data/sectors';

// Modelos para arrancar (en inglés porque van a empresas de afuera); cada uno lo edita
const STARTERS = {
  housekeeping: {
    subject: 'Housekeeping position - {nombre}',
    body: "Hi {company} Team,\n\nI hope you are doing well.\n\nMy name is {nombre} and I'm writing to ask if you have any housekeeping positions available for the upcoming season.\n\nI'm reliable, hardworking and available to start soon. Please find my CV attached.\n\nThank you for your time!\n\n{firma}",
  },
  winery: {
    subject: 'Vintage / Cellar Hand position - {nombre}',
    body: "Hi {company} Team,\n\nI hope you are doing well.\n\nMy name is {nombre} and I'm writing to see if you have any vintage or cellar hand positions available.\n\nI'm reliable, hardworking and ready to start. Please find my CV attached.\n\nThank you for your time!\n\n{firma}",
  },
  kyc: {
    subject: 'KYC Analyst application - {nombre}',
    body: "Hi {company} Team,\n\nMy name is {nombre} and I'm interested in remote KYC / compliance analyst roles at your company.\n\nPlease find my CV attached. I'd be happy to talk about how I can help your team.\n\nKind regards,\n\n{firma}",
  },
};

const STEPS = ['Perfil', 'Documentos', 'Tu email', 'Gmail'];

const Onboarding = () => {
  const { signOut } = useAuth();
  const { profile, saveProfile } = useResources();
  const { sectors } = useData();
  const [step, setStep] = useState(profile?.displayName ? 1 : 0);
  const [finishing, setFinishing] = useState(false);

  const finish = async () => {
    try {
      setFinishing(true);
      await saveProfile({ onboarded: true });
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <div className="max-w-lg mx-auto px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-10">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">
            Paso {step + 1} de {STEPS.length}
          </span>
          <button onClick={signOut} className="text-sm text-muted flex items-center gap-1.5">
            <LogOut size={14} /> Salir
          </button>
        </div>
        <div className="flex gap-1.5 mt-3 mb-8">
          {STEPS.map((s, i) => (
            <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-line'}`} />
          ))}
        </div>

        {step === 0 && (
          <>
            <h1 className="text-3xl font-bold leading-tight">¡Hola! Te damos la bienvenida</h1>
            <p className="text-muted mt-2 mb-6">Antes de empezar, armemos tu perfil. Tus datos y tus envíos son solo tuyos.</p>
            <ProfileForm submitLabel="Seguir" onSaved={() => setStep(1)} />
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-3xl font-bold leading-tight">Tus documentos</h1>
            <p className="text-muted mt-2 mb-6">Subí tu CV en PDF. Se adjunta solo cada vez que le escribas a una empresa.</p>
            <DocumentsManager sectors={sectors} compact />
            <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} nextLabel="Seguir" />
          </>
        )}

        {step === 2 && <TemplatesStep sectors={sectors} onBack={() => setStep(1)} onNext={() => setStep(3)} />}

        {step === 3 && <GmailStep onBack={() => setStep(2)} onFinish={finish} finishing={finishing} />}
      </div>
    </div>
  );
};

const Nav = ({ onBack, onNext, nextLabel, nextDisabled, busy }) => (
  <div className="flex gap-2 mt-8">
    {onBack && (
      <button onClick={onBack} className="flex-1 py-3 rounded-2xl bg-card border border-line text-sm font-medium flex items-center justify-center gap-1.5">
        <ArrowLeft size={16} /> Atrás
      </button>
    )}
    <button onClick={onNext} disabled={nextDisabled || busy} className="flex-[2] py-3 rounded-2xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60">
      {busy ? <Loader2 size={16} className="animate-spin" /> : null}
      {nextLabel} {!busy && <ArrowRight size={16} />}
    </button>
  </div>
);

const TemplatesStep = ({ sectors, onBack, onNext }) => {
  const { templates, saveTemplate, subjects, addSubject } = useResources();
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(
      sectors.map((s) => [
        s,
        {
          body: templates[s]?.email || STARTERS[s].body,
          subject: subjects.find((x) => x.sector === s)?.text || STARTERS[s].subject,
        },
      ])
    )
  );
  const [active, setActive] = useState(sectors[0]);
  const [saving, setSaving] = useState(false);
  if (!sectors.length) return <Nav onBack={onBack} onNext={onNext} nextLabel="Seguir" />;

  const set = (k) => (e) => setDrafts((d) => ({ ...d, [active]: { ...d[active], [k]: e.target.value } }));

  const save = async () => {
    try {
      setSaving(true);
      for (const s of sectors) {
        if (drafts[s].body !== (templates[s]?.email || '')) await saveTemplate(s, 'email', drafts[s].body);
        if (!subjects.some((x) => x.sector === s) && drafts[s].subject.trim()) await addSubject(s, drafts[s].subject.trim());
      }
      onNext();
    } catch (err) {
      console.error('Error guardando templates:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold leading-tight">Tu email</h1>
      <p className="text-muted mt-2 mb-2">Es el mensaje que va a cada empresa. Te dejamos un modelo: cambialo como quieras.</p>
      <p className="text-xs text-muted mb-5">
        <Sparkles size={12} className="inline -mt-0.5" /> {'{company}'} se cambia por el nombre de la empresa, y {'{nombre}'} y {'{firma}'} por los de tu perfil.
      </p>
      {sectors.length > 1 && (
        <div className="flex gap-1 bg-card border border-line rounded-2xl p-1 mb-4">
          {sectors.map((s) => (
            <button key={s} onClick={() => setActive(s)} className={`flex-1 py-2 rounded-xl text-sm font-medium ${active === s ? `${SECTORS[s].bg} text-white` : 'text-muted'}`}>
              {SECTORS[s].short}
            </button>
          ))}
        </div>
      )}
      <label className="block mb-3">
        <span className="block text-xs font-medium text-muted mb-1.5">Asunto</span>
        <input value={drafts[active].subject} onChange={set('subject')} maxLength={300} className="w-full px-4 py-3 bg-card border border-line rounded-xl text-sm outline-none focus:border-primary" />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-muted mb-1.5">Mensaje</span>
        <textarea value={drafts[active].body} onChange={set('body')} rows={12} maxLength={20000} className="w-full px-4 py-3 bg-card border border-line rounded-xl text-sm outline-none focus:border-primary font-mono resize-y" />
      </label>
      <Nav onBack={onBack} onNext={save} nextLabel="Guardar y seguir" busy={saving} />
    </>
  );
};

const GmailStep = ({ onBack, onFinish, finishing }) => {
  const { getGmailToken, user } = useAuth();
  const [state, setState] = useState('idle'); // idle | asking | ok | error
  const [error, setError] = useState(null);

  const connect = async () => {
    try {
      setState('asking');
      setError(null);
      await getGmailToken({ force: true });
      setState('ok');
    } catch (err) {
      console.error('Error conectando Gmail:', err);
      setState('error');
      setError(err.code === 'auth/popup-closed-by-user' ? 'Se cerró la ventana de Google antes de terminar.' : 'Google no dio el permiso. Probá de nuevo.');
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold leading-tight">Conectá tu Gmail</h1>
      <p className="text-muted mt-2 mb-6">
        Los emails salen desde tu cuenta ({user?.email}), como si los mandaras vos. La app solo puede <b>enviar</b>: no lee tus correos.
      </p>
      <div className="bg-card rounded-3xl p-5 shadow-sm space-y-4">
        <button onClick={connect} disabled={state === 'asking' || state === 'ok'} className={`w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 ${state === 'ok' ? 'bg-green-600 text-white' : 'bg-primary text-white'} disabled:opacity-90`}>
          {state === 'asking' ? <Loader2 size={18} className="animate-spin" /> : state === 'ok' ? <Check size={18} /> : <Mail size={18} />}
          {state === 'ok' ? 'Gmail conectado' : 'Conectar Gmail'}
        </button>
        {error && <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3">{error}</p>}
        <p className="text-xs text-muted">
          Si Google muestra "Google no verificó esta app", tocá <b>Configuración avanzada</b> y después <b>Ir a la app</b>. Es normal en apps privadas como esta. El permiso dura una hora: después la app te lo vuelve a pedir con un toque.
        </p>
      </div>
      <Nav onBack={onBack} onNext={onFinish} nextLabel={state === 'ok' ? 'Empezar' : 'Lo hago después'} busy={finishing} />
    </>
  );
};

export default Onboarding;

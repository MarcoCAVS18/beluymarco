import { LogIn, LogOut, ShieldAlert, Wine, Hotel, Fingerprint } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// Pantalla que se muestra cuando el usuario no está logueado, o cuando
// está logueado pero con un email distinto al autorizado.
const LoginScreen = () => {
  const { user, member, isAuthorized, signInWithGoogle, signOut } = useAuth();
  const revoked = member?.status === 'revoked';

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error iniciando sesión:', error);
    }
  };

  return (
    <div className="min-h-dvh bg-bg text-ink flex flex-col justify-center px-6 py-10">
      <div className="max-w-sm w-full mx-auto">
        <div className="flex gap-2 mb-8">
          <span className="w-12 h-12 rounded-2xl bg-winery text-white flex items-center justify-center"><Wine size={22} /></span>
          <span className="w-12 h-12 rounded-2xl bg-housekeeping text-white flex items-center justify-center"><Hotel size={22} /></span>
          <span className="w-12 h-12 rounded-2xl bg-kyc text-white flex items-center justify-center"><Fingerprint size={22} /></span>
        </div>

        {user && !isAuthorized ? (
          <>
            <ShieldAlert className="w-9 h-9 text-red-600 mb-4" />
            <h1 className="text-3xl font-bold leading-tight">{revoked ? 'Tu acceso fue pausado' : 'No tenés invitación'}</h1>
            <p className="text-muted mt-2 mb-8">
              {revoked
                ? `La cuenta ${user.email} ya no tiene acceso a la app. Si creés que es un error, hablá con quien te invitó.`
                : `La cuenta ${user.email} no está invitada. Pedile a quien te pasó la app que te invite con este email, o entrá con otra cuenta de Google.`}
            </p>
            <button
              onClick={signOut}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-card border border-line rounded-2xl text-sm font-medium"
            >
              <LogOut size={16} />
              Entrar con otra cuenta
            </button>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold leading-tight">
              ¡Hola!
              <br />
              Organicemos tu búsqueda de trabajo
            </h1>
            <p className="text-muted mt-2 mb-8">Solo con invitación. Entrá con la cuenta de Google que te invitaron.</p>
            <button
              onClick={handleSignIn}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-white font-semibold rounded-2xl hover:bg-primary-strong shadow-lg shadow-primary/25"
            >
              <LogIn size={18} />
              Entrar con Google
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;

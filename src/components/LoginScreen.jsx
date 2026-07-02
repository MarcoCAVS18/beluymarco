import { LogIn, LogOut, ShieldAlert, Briefcase } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// Pantalla que se muestra cuando el usuario no está logueado, o cuando
// está logueado pero con un email distinto al autorizado.
const LoginScreen = () => {
  const { user, isAuthorized, signInWithGoogle, signOut } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-dark-bg text-dark-text px-4">
      <div className="flex items-center gap-2 mb-8">
        <Briefcase className="text-accent w-6 h-6" />
        <h1 className="text-xl font-medium tracking-tight">Job Application Assistant</h1>
      </div>

      <div className="bg-dark-sidebar border border-dark-hover rounded-2xl p-8 max-w-sm w-full text-center">
        {user && !isAuthorized ? (
          <>
            <ShieldAlert className="w-10 h-10 text-red-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Acceso no autorizado</h2>
            <p className="text-dark-subtext text-sm mb-6">
              La cuenta {user.email} no tiene permiso para entrar a esta aplicación.
            </p>
            <button
              onClick={signOut}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-dark-surface border border-dark-hover rounded-full text-sm font-medium hover:border-accent transition-all"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <LogIn className="w-10 h-10 text-accent mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Iniciar sesión</h2>
            <p className="text-dark-subtext text-sm mb-6">
              Acceso restringido. Iniciá sesión con Google para continuar.
            </p>
            <button
              onClick={handleSignIn}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-accent text-black font-semibold rounded-full hover:bg-accent/90 transition-all"
            >
              <LogIn size={16} />
              Iniciar sesión con Google
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;

import { useContext } from 'react';
import { ResourcesContext } from '../contexts/resourcesContext';

// Perfil, templates, asuntos y documentos de la cuenta actual (ver ResourcesContext.jsx)
export const useResources = () => {
  const ctx = useContext(ResourcesContext);
  if (!ctx) throw new Error('useResources tiene que usarse dentro de <ResourcesProvider>');
  return ctx;
};

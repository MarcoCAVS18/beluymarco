import { useContext } from 'react';
import { DataContext } from '../contexts/dataContext';

// Templates, asuntos y documentos: ver useResources (cambian según la cuenta).

// Config de la app (estados, CVs, documentos, cover letters): viene del DataProvider,
// que la lee una sola vez junto con las empresas.
export const useConfig = () => {
  const { statusOptions, flags, resumes, otherDocuments, coverLetters, loading, error } = useData();
  return { flags, statusOptions, resumes, otherDocuments, coverLetters, loading, error };
};

// Empresas de todos los rubros + funciones para modificarlas (ver DataContext.jsx)
export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData tiene que usarse dentro de <DataProvider>');
  return ctx;
};

// Arma el email de una empresa con los valores por defecto de la cuenta, igual que el
// modal de envío: template del rubro con el saludo personalizado, el primer asunto
// guardado (o el default) y los CVs del rubro adjuntos.
// Además de {company}, el template acepta {nombre}, {firma} y {telefono} del perfil.
import { personalizeGreeting, getDefaultSubject } from '../utils/emailUtils';

const fillProfile = (text, profile) =>
  (text || '')
    .replace(/\{\{?\s*nombre\s*\}\}?/gi, profile?.displayName || '')
    .replace(/\{\{?\s*firma\s*\}\}?/gi, profile?.signature || '')
    .replace(/\{\{?\s*tel[eé]fono\s*\}\}?/gi, profile?.phone || '');

export const composeEmail = (company, sector, { templates, subjects, profile }, { isAdmin = true } = {}) => {
  const template = templates[sector]?.email || '';
  const saved = subjects.find((s) => s.sector === sector);
  return {
    to: company.email,
    subject: fillProfile(saved ? personalizeGreeting(saved.text, company.name) : getDefaultSubject(sector, company.name, { isAdmin }), profile),
    body: fillProfile(personalizeGreeting(template, company.name), profile),
  };
};

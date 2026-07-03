// src/utils/emailUtils.js
// Utilidades para personalizar el cuerpo y asunto del email antes de enviarlo.

// Asuntos por defecto por rubro (el usuario puede editarlos en el modal antes de enviar).
const DEFAULT_SUBJECTS = {
  winery: 'Experienced Cellar Hand Couple (5 Vintages) - Belu & Marco',
  housekeeping: 'Hospitality Couple Team (Housekeeping & Barista) - Belu & Marco',
  kyc: 'KYC Analyst Application - Belu & Marco',
};

// Inserta el nombre de la empresa destinataria en el template. Soporta dos
// mecanismos: el placeholder {company} (o {{company}}) en cualquier parte del
// texto, o —si no hay placeholder— reemplaza el saludo genérico inicial
// ("Dear/Hi/Hello Team,") conservando la palabra de saludo original.
export function personalizeGreeting(content, companyName) {
  if (!content) return '';
  if (!companyName) return content;

  const withPlaceholders = content.replace(/\{\{?\s*company\s*\}\}?/gi, companyName);
  if (withPlaceholders !== content) return withPlaceholders;

  return content.replace(/^(Dear|Hi|Hello)\s+Team(,?)/i, `$1 ${companyName} Team$2`);
}

// Asunto por defecto según el rubro. Para rubros sin asunto predefinido
// arma uno genérico con el nombre de la empresa.
export function getDefaultSubject(sector, companyName) {
  return DEFAULT_SUBJECTS[sector] || `Job Application - ${companyName || ''}`.trim();
}

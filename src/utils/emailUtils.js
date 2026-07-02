// src/utils/emailUtils.js
// Utilidades para personalizar el cuerpo y asunto del email antes de enviarlo.

// Asuntos por defecto por rubro (el usuario puede editarlos en el modal antes de enviar).
const DEFAULT_SUBJECTS = {
  winery: 'Experienced Cellar Hand Couple (5 Vintages) - Belu & Marco',
  housekeeping: 'Hospitality Couple Team (Housekeeping & Barista) - Belu & Marco',
  kyc: 'KYC Analyst Application - Belu & Marco',
};

// Reemplaza el saludo genérico ("Hi Team," / "Hello Team,") del template
// por uno con el nombre de la empresa destinataria.
export function personalizeGreeting(content, companyName) {
  if (!content) return '';
  if (!companyName) return content;
  return content.replace(/^(Hi|Hello)\s+Team,?/i, `Hello ${companyName} Team,`);
}

// Asunto por defecto según el rubro. Para rubros sin asunto predefinido
// arma uno genérico con el nombre de la empresa.
export function getDefaultSubject(sector, companyName) {
  return DEFAULT_SUBJECTS[sector] || `Job Application - ${companyName || ''}`.trim();
}

// src/data/constants.js
// NOTA: los datos (wineries / housekeeping) viven en Firestore y se leen vía
// useFirebaseData. Los JSON crudos (csvjson.json / housekeeping.json) están en
// .gitignore y NO deben importarse acá, o el build de Netlify falla al no existir.

export const RESUMES = [
  { id: 1, type: 'Winery', person: 'Belu', file: 'Resume W - July 2026 - Maria Belen Corzo.pdf', path: '/resumes/Resume W - July 2026 - Maria Belen Corzo.pdf' },
  { id: 2, type: 'Winery', person: 'Marco', file: 'Resume W - July 2026 - Marco Piermatei.pdf', path: '/resumes/Resume W - July 2026 - Marco Piermatei.pdf' },
  { id: 3, type: 'Housekeeping', person: 'Belu', file: 'Resume HK - July 2026 - Maria Belen Corzo.pdf', path: '/resumes/Resume HK - July 2026 - Maria Belen Corzo.pdf' },
  { id: 4, type: 'Housekeeping', person: 'Marco', file: 'Resume HK - July 2026 - Marco Piermatei.pdf', path: '/resumes/Resume HK - July 2026 - Marco Piermatei.pdf' },
];

export const OTHER_DOCUMENTS = [
  { id: 1, name: 'E-Visa', file: 'e-visa.pdf', path: '/documents/e-visa.pdf', description: 'Electronic Visa Documentation' },
];

export const EMAIL_TEMPLATES = {
  winery: {
    subject: "Experienced Cellar Hand Couple (5 Vintages) - Belu & Marco",
    body: `Hi Team,\n\nHope you are doing well.\n\nWe are Belu and Marco, an experienced Cellar Hand couple currently based in Blenheim. We are writing to see if you have any vintage positions available.\n\nWe have completed 5 vintages combined across Australia and New Zealand (Treasury Wines, Dee Vine, etc). We are reliable, experienced in cellar ops/logistics, and ready to start immediately.\n\nPlease find our Resumes and Cover Letters attached.\n\nThanks for your time!\n\nBelu & Marco\n+64 [BELU_NUMBER] / +64 [MARCO_NUMBER]`
  },
  housekeeping: {
    subject: "Hospitality Couple Team (Housekeeping & Barista) - Belu & Marco",
    body: `Hi Team,\n\nHope you are having a good week.\n\nWe are Belu and Marco, a hardworking couple team currently in New Zealand and looking for work.\n\nWe are versatile "All-rounders": we have strong experience in Housekeeping, Maintenance, and we can also help as Baristas/Bartenders. We work well together and require minimal supervision.\n\nWe have attached our Resumes and Cover Letters for you to have a look.\n\nLooking forward to hearing from you!\n\nBelu & Marco\n+64 [BELU_NUMBER] / +64 [MARCO_NUMBER]`
  }
};

export const COVER_LETTERS = {
  wineryCouple: `Subject: Experienced Cellar Hand Couple Team (5+ Combined Vintages) - Belu & Marco\n\nHello Team,\n\nWe are Belu and Marco... [PEGAR AQUÍ LA VERSIÓN COMPLETA QUE HICIMOS]`,
  hkCouple: `Subject: Professional Housekeeping Couple Team - Belu & Marco\n\nHello Team,\n\nWe are Belu and Marco... [PEGAR AQUÍ LA VERSIÓN COMPLETA QUE HICIMOS]`
};

export const STATUS_OPTIONS = [
  { label: 'Pending', color: 'bg-gray-600' },
  { label: 'Sent', color: 'bg-blue-600' },
  { label: 'Replied', color: 'bg-yellow-600' },
  { label: 'Interview', color: 'bg-purple-600' },
  { label: 'Offer', color: 'bg-green-600' },
  { label: 'Rejected', color: 'bg-red-600' },
];

// Cuántos días se muestra el tag "NEW" desde que se agregó una empresa.
// El badge se basa en `createdAt`, así que aplica solo a las nuevas y se
// auto-expira sin necesidad de des-marcar nada manualmente.
export const NEW_BADGE_DAYS = 30;

// Devuelve true si la empresa se creó hace menos de `days` días.
// Soporta los formatos de `createdAt`: Firestore Timestamp, { seconds }, número (ms) o fecha.
export function isRecentlyAdded(createdAt, days = NEW_BADGE_DAYS) {
  if (!createdAt) return false;
  let ms;
  if (typeof createdAt.toDate === 'function') ms = createdAt.toDate().getTime();
  else if (typeof createdAt.seconds === 'number') ms = createdAt.seconds * 1000;
  else if (typeof createdAt === 'number') ms = createdAt;
  else ms = new Date(createdAt).getTime();
  if (Number.isNaN(ms)) return false;
  return Date.now() - ms < days * 24 * 60 * 60 * 1000;
}

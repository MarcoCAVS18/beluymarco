// src/data/constants.js
import wineriesData from '../../csvjson.json';
import housekeepingData from '../../housekeeping.json';

export const RESUMES = [
  { id: 1, type: 'Winery', person: 'Belu', file: 'Resume W - January 2026 - Maria Belen Corzo.pdf', path: '/resumes/Resume W - January 2026 - Maria Belen Corzo.pdf' },
  { id: 2, type: 'Winery', person: 'Marco', file: 'Resume W - January 2026 - Marco Piermatei.pdf', path: '/resumes/Resume W - January 2026 - Marco Piermatei.pdf' },
  { id: 3, type: 'Housekeeping', person: 'Belu', file: 'Resume HK - January 2026 - Maria Belen Corzo copia.pdf', path: '/resumes/Resume HK - January 2026 - Maria Belen Corzo copia.pdf' },
  { id: 4, type: 'Housekeeping', person: 'Marco', file: 'Resume HK - January 2026 - Marco Piermatei.pdf', path: '/resumes/Resume HK - January 2026 - Marco Piermatei.pdf' },
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

// Helper function to extract country code from location
function getCountryCode(location) {
  if (!location || location === '...') return 'XX';

  const locationLower = location.toLowerCase();

  // Alemania/Germany
  if (locationLower.includes('alemania') || locationLower.includes('germany') ||
      locationLower.includes('palatinado') || locationLower.includes('franconia') ||
      locationLower.includes('bayern') || locationLower.includes('rheingau') ||
      locationLower.includes('mosela') || locationLower.includes('saar') ||
      locationLower.includes('württemberg') || locationLower.includes('hesse')) {
    return 'DE';
  }

  // Nueva Zelanda
  if (locationLower.includes('canterbury') || locationLower.includes('waipara') ||
      locationLower.includes('christchurch') || locationLower.includes('kumeu') ||
      locationLower.includes('auckland') || locationLower.includes('marlborough') ||
      locationLower.includes('blenheim') || locationLower.includes('renwick') ||
      locationLower.includes('waiheke') || locationLower.includes('hawke') ||
      locationLower.includes('napier') || locationLower.includes('hastings') ||
      locationLower.includes('martinborough') || locationLower.includes('wairarapa') ||
      locationLower.includes('otago') || locationLower.includes('queenstown') ||
      locationLower.includes('nelson') || locationLower.includes('wanaka')) {
    return 'NZ';
  }

  // Francia
  if (locationLower.includes('burdeos') || locationLower.includes('bordeaux') ||
      locationLower.includes('aquitania') || locationLower.includes('saboia') ||
      locationLower.includes('ródano') || locationLower.includes('rhone') ||
      locationLower.includes('borgoña') || locationLower.includes('burgundy') ||
      locationLower.includes('beaune') || locationLower.includes('jura') ||
      locationLower.includes('hérault') || locationLower.includes('occitania') ||
      locationLower.includes('provenza') || locationLower.includes('provence') ||
      locationLower.includes('vaucluse') || locationLower.includes('var')) {
    return 'FR';
  }

  // Estados Unidos
  if (locationLower.includes('california') || locationLower.includes('washington') ||
      locationLower.includes('oregon') || locationLower.includes('oregón') ||
      locationLower.includes('virginia') || locationLower.includes('missouri') ||
      locationLower.includes('wisconsin')) {
    return 'US';
  }

  // Italia
  if (locationLower.includes('italia') || locationLower.includes('italy') ||
      locationLower.includes('toscana') || locationLower.includes('piemonte') ||
      locationLower.includes('veneto') || locationLower.includes('sicilia')) {
    return 'IT';
  }

  // España
  if (locationLower.includes('españa') || locationLower.includes('spain') ||
      locationLower.includes('rioja') || locationLower.includes('ribera') ||
      locationLower.includes('priorat') || locationLower.includes('cataluña')) {
    return 'ES';
  }

  // Portugal
  if (locationLower.includes('portugal') || locationLower.includes('douro') ||
      locationLower.includes('alentejo') || locationLower.includes('dão')) {
    return 'PT';
  }

  // Austria
  if (locationLower.includes('austria') || locationLower.includes('österreich') ||
      locationLower.includes('viena') || locationLower.includes('wachau') ||
      locationLower.includes('burgenland')) {
    return 'AT';
  }

  // Suiza
  if (locationLower.includes('suiza') || locationLower.includes('switzerland') ||
      locationLower.includes('schweiz') || locationLower.includes('valais') ||
      locationLower.includes('vaud') || locationLower.includes('genève')) {
    return 'CH';
  }

  // Grecia
  if (locationLower.includes('grecia') || locationLower.includes('greece') ||
      locationLower.includes('santorini') || locationLower.includes('creta') ||
      locationLower.includes('peloponeso')) {
    return 'GR';
  }

  // Hungría
  if (locationLower.includes('hungría') || locationLower.includes('hungary') ||
      locationLower.includes('tokaj') || locationLower.includes('eger')) {
    return 'HU';
  }

  // República Checa
  if (locationLower.includes('checa') || locationLower.includes('czech') ||
      locationLower.includes('moravia') || locationLower.includes('bohemia')) {
    return 'CZ';
  }

  return 'XX'; // Unknown
}

// Helper function for housekeeping locations
function getCountryCodeFromHousekeeping(location) {
  if (!location) return 'XX';

  const locationLower = location.toLowerCase();

  // Switzerland / Suiza
  if (locationLower.includes('suiza') || locationLower.includes('switzerland') ||
      locationLower.includes('zermatt') || locationLower.includes('verbier') ||
      locationLower.includes('st. moritz')) return 'CH';

  // France / Francia
  if (locationLower.includes('francia') || locationLower.includes('france') ||
      locationLower.includes('courchevel') || locationLower.includes('chamonix') ||
      locationLower.includes('val thorens')) return 'FR';

  // Austria
  if (locationLower.includes('austria') || locationLower.includes('st. anton') ||
      locationLower.includes('lech') || locationLower.includes('zürs') ||
      locationLower.includes('ischgl') || locationLower.includes('kitzbühel') ||
      locationLower.includes('saalbach') || locationLower.includes('warth')) return 'AT';

  // Italy / Italia
  if (locationLower.includes('italia') || locationLower.includes('italy') ||
      locationLower.includes('cortina') || locationLower.includes('val gardena') ||
      locationLower.includes('cerdeña') || locationLower.includes('sardinia')) return 'IT';

  // Spain / España
  if (locationLower.includes('españa') || locationLower.includes('spain') ||
      locationLower.includes('mallorca') || locationLower.includes('ibiza') ||
      locationLower.includes('lanzarote') || locationLower.includes('costa del sol')) return 'ES';

  // Greece / Grecia
  if (locationLower.includes('grecia') || locationLower.includes('greece') ||
      locationLower.includes('santorini') || locationLower.includes('mykonos')) return 'GR';

  // Portugal
  if (locationLower.includes('portugal') || locationLower.includes('algarve') ||
      locationLower.includes('lisboa') || locationLower.includes('lisbon')) return 'PT';

  // Sweden / Suecia
  if (locationLower.includes('suecia') || locationLower.includes('sweden') ||
      locationLower.includes('åre') || locationLower.includes('sälen') ||
      locationLower.includes('jukkasjärvi') || locationLower.includes('halmstad') ||
      locationLower.includes('strömstad') || locationLower.includes('visby') ||
      locationLower.includes('gotland')) return 'SE';

  // Finland / Finlandia
  if (locationLower.includes('finlandia') || locationLower.includes('finland') ||
      locationLower.includes('rovaniemi') || locationLower.includes('saariselkä') ||
      locationLower.includes('levi')) return 'FI';

  // Norway / Noruega
  if (locationLower.includes('noruega') || locationLower.includes('norway') ||
      locationLower.includes('trysil') || locationLower.includes('hemsedal') ||
      locationLower.includes('lofoten') || locationLower.includes('larvik') ||
      locationLower.includes('geiranger') || locationLower.includes('lofthus')) return 'NO';

  // Iceland / Islandia
  if (locationLower.includes('islandia') || locationLower.includes('iceland') ||
      locationLower.includes('höfn')) return 'IS';

  // Denmark / Dinamarca
  if (locationLower.includes('dinamarca') || locationLower.includes('denmark') ||
      locationLower.includes('skagen') || locationLower.includes('copenhague') ||
      locationLower.includes('copenhagen')) return 'DK';

  // UK / Reino Unido
  if (locationLower.includes('reino unido') || locationLower.includes('uk') ||
      locationLower.includes('europa (varios)')) return 'GB';

  return 'XX';
}

// Transform imported data to match our schema
export const INITIAL_WINERIES = wineriesData
  .filter(item => item["Bodega (Weingut)"] && item["Bodega (Weingut)"] !== '...' && item["Bodega (Weingut)"].trim() !== '')
  .map((item, index) => {
    // Some USA wineries have email in "Inicio de vendimia" field
    let email = item["Email de contacto"] || '';
    let harvestStart = item["Inicio de vendimia"] || '';

    // Fix data inconsistency for USA wineries
    if (email === '' && harvestStart && harvestStart.includes('@')) {
      email = harvestStart;
      harvestStart = 'TBD';
    }

    return {
      id: index + 1,
      name: item["Bodega (Weingut)"],
      email: email,
      location: item["Ubicación"] || '',
      harvestStart: harvestStart,
      country: getCountryCode(item["Ubicación"]),
      status: "Pending",
      notes: ""
    };
  });

export const STATUS_OPTIONS = [
  { label: 'Pending', color: 'bg-gray-600' },
  { label: 'Sent', color: 'bg-blue-600' },
  { label: 'Replied', color: 'bg-yellow-600' },
  { label: 'Interview', color: 'bg-purple-600' },
  { label: 'Offer', color: 'bg-green-600' },
  { label: 'Rejected', color: 'bg-red-600' },
];

// Transform housekeeping data
export const INITIAL_HOUSEKEEPING = housekeepingData.map((item, index) => ({
  id: index + 1,
  name: item["Nombre de la Empresa"] || '',
  email: item["Email de Contacto"] || '',
  location: item["Ubicación"] || '',
  season: item["Temporada"] || '',
  country: getCountryCodeFromHousekeeping(item["Ubicación"]),
  status: "Pending",
  notes: ""
}));

export const FLAGS = {
  AR: "🇦🇷", NZ: "🇳🇿", AU: "🇦🇺", IT: "🇮🇹", FR: "🇫🇷",
  US: "🇺🇸", ES: "🇪🇸", ZA: "🇿🇦", PT: "🇵🇹", DE: "🇩🇪",
  AT: "🇦🇹", CH: "🇨🇭", GR: "🇬🇷", HU: "🇭🇺", CZ: "🇨🇿",
  GB: "🇬🇧", RO: "🇷🇴", BG: "🇧🇬", HR: "🇭🇷", SI: "🇸🇮",
  NL: "🇳🇱", CA: "🇨🇦", MX: "🇲🇽", JP: "🇯🇵", ID: "🇮🇩",
  VN: "🇻🇳", PF: "🇵🇫", SE: "🇸🇪", FI: "🇫🇮", NO: "🇳🇴",
  IS: "🇮🇸", DK: "🇩🇰",
  XX: "🏳️"
};
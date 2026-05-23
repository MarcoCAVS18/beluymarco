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

// Helper para detectar país desde ubicación
function getCountryCode(location) {
  if (!location || location === '...') return 'XX';
  const l = location.toLowerCase();

  if (l.includes('australia') || l.includes('barossa') || l.includes('mclaren vale') ||
      l.includes('margaret river') || l.includes('hunter valley') || l.includes('yarra valley') ||
      l.includes('south australia') || l.includes('western australia') || l.includes('victoria') ||
      l.includes('new south wales') || l.includes('clare valley') || l.includes('coonawarra') ||
      l.includes('eden valley') || l.includes('nuriootpa') || l.includes('tanunda') ||
      l.includes('krondorf') || l.includes('angaston') || l.includes('keyneton') ||
      l.includes('pokolbin') || l.includes('dixons creek') || l.includes('healesville') ||
      l.includes('gembrook') || l.includes('wilyabrup') || l.includes('marananga')) {
    return 'AU';
  }
  if (l.includes('nueva zelanda') || l.includes('new zealand') ||
      l.includes('canterbury') || l.includes('waipara') || l.includes('christchurch') ||
      l.includes('kumeu') || l.includes('auckland') || l.includes('marlborough') ||
      l.includes('blenheim') || l.includes('renwick') || l.includes('waiheke') ||
      l.includes('hawke') || l.includes('napier') || l.includes('hastings') ||
      l.includes('martinborough') || l.includes('wairarapa') || l.includes('otago') ||
      l.includes('queenstown') || l.includes('nelson') || l.includes('wanaka')) {
    return 'NZ';
  }
  if (l.includes('sudáfrica') || l.includes('south africa') || l.includes('stellenbosch') ||
      l.includes('franschhoek') || l.includes('western cape') || l.includes('constantia') ||
      l.includes('helderberg') || l.includes('simonsberg') || l.includes('koelenhof') ||
      l.includes('somerset west') || l.includes('paarl')) {
    return 'ZA';
  }
  if (l.includes('argentina') || l.includes('mendoza') || l.includes('luján de cuyo') ||
      l.includes('valle de uco') || l.includes('maipú') || l.includes('agrelo')) {
    return 'AR';
  }
  if (l.includes('chile') || l.includes('maipo') || l.includes('colchagua') ||
      l.includes('casablanca') || l.includes('aconcagua') || l.includes('pirque') ||
      l.includes('melipilla') || l.includes('panquehue') || l.includes('apalta')) {
    return 'CL';
  }
  if (l.includes('canadá') || l.includes('canada') || l.includes('okanagan') ||
      l.includes('british columbia') || l.includes('ontario') || l.includes('niagara') ||
      l.includes('kelowna')) {
    return 'CA';
  }
  if (l.includes('alemania') || l.includes('germany') || l.includes('palatinado') ||
      l.includes('franconia') || l.includes('bayern') || l.includes('rheingau') ||
      l.includes('mosela') || l.includes('saar') || l.includes('württemberg') ||
      l.includes('hesse') || l.includes('rheinhessen') || l.includes('pfalz') ||
      l.includes('mosel')) {
    return 'DE';
  }
  if (l.includes('francia') || l.includes('france') || l.includes('burdeos') ||
      l.includes('bordeaux') || l.includes('aquitania') || l.includes('ródano') ||
      l.includes('rhone') || l.includes('borgoña') || l.includes('burgundy') ||
      l.includes('beaune') || l.includes('jura') || l.includes('hérault') ||
      l.includes('occitania') || l.includes('provenza') || l.includes('provence') ||
      l.includes('vaucluse') || l.includes('var') || l.includes('languedoc') ||
      l.includes('champagne') || l.includes('saboia') || l.includes('alsacia')) {
    return 'FR';
  }
  if (l.includes('italia') || l.includes('italy') || l.includes('toscana') ||
      l.includes('piamonte') || l.includes('piemonte') || l.includes('veneto') ||
      l.includes('sicilia') || l.includes('montalcino') || l.includes('bolgheri') ||
      l.includes('chianti') || l.includes('barbaresco') || l.includes('barolo') ||
      l.includes('alba') || l.includes('firenze') || l.includes('valpolicella') ||
      l.includes('san casciano') || l.includes('trentino')) {
    return 'IT';
  }
  if (l.includes('españa') || l.includes('spain') || l.includes('rioja') ||
      l.includes('ribera') || l.includes('priorat') || l.includes('cataluña') ||
      l.includes('penedès') || l.includes('galicia') || l.includes('navarra') ||
      l.includes('jerez') || l.includes('valladolid') || l.includes('burgos') ||
      l.includes('haro') || l.includes('elciego') || l.includes('ollauri') ||
      l.includes('peñafiel') || l.includes('pesquera de duero')) {
    return 'ES';
  }
  if (l.includes('portugal') || l.includes('douro') || l.includes('alentejo') ||
      l.includes('dão') || l.includes('vinho verde') || l.includes('lisboa') ||
      l.includes('algarve')) {
    return 'PT';
  }
  if (l.includes('austria') || l.includes('österreich') || l.includes('wachau') ||
      l.includes('burgenland') || l.includes('kamptal') || l.includes('kremstal')) {
    return 'AT';
  }
  if (l.includes('suiza') || l.includes('switzerland') || l.includes('schweiz') ||
      l.includes('valais') || l.includes('vaud') || l.includes('genève')) {
    return 'CH';
  }
  if (l.includes('grecia') || l.includes('greece') || l.includes('santorini') ||
      l.includes('creta') || l.includes('peloponeso') || l.includes('macedonia')) {
    return 'GR';
  }
  if (l.includes('hungría') || l.includes('hungary') || l.includes('tokaj')) return 'HU';
  if (l.includes('croacia') || l.includes('croatia') || l.includes('istria') ||
      l.includes('dalmacia')) return 'HR';
  if (l.includes('eslovenia') || l.includes('slovenia')) return 'SI';
  if (l.includes('checa') || l.includes('czech') || l.includes('moravia')) return 'CZ';
  if (l.includes('bulgaria')) return 'BG';
  if (l.includes('rumanía') || l.includes('romania')) return 'RO';
  if (l.includes('georgia') || l.includes('kakheti')) return 'GE';
  if (l.includes('chipre') || l.includes('cyprus')) return 'CY';
  if (l.includes('luxemburgo') || l.includes('luxembourg')) return 'LU';
  if (l.includes('usa') || l.includes('california') || l.includes('washington') ||
      l.includes('oregon') || l.includes('oregón') || l.includes('virginia') ||
      l.includes('missouri') || l.includes('wisconsin') || l.includes('napa') ||
      l.includes('sonoma') || l.includes('estados unidos')) {
    return 'US';
  }
  return 'XX';
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

// FLAGS object removed - now using country-flag-icons library via CountryFlag component
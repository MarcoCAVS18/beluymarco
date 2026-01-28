import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Loader2 } from 'lucide-react';
import { useWineries, useHousekeeping, useConfig } from '../hooks/useFirebaseData';
import SectorToggle from './SectorToggle';
import CountryFlag from './CountryFlag';
import 'leaflet/dist/leaflet.css';

// Status colors matching the app theme
const STATUS_COLORS = {
  'Pending': '#4B5563',    // gray-600
  'Sent': '#2563EB',       // blue-600
  'Replied': '#D97706',    // yellow-600
  'Interview': '#9333EA',  // purple-600
  'Offer': '#16A34A',      // green-600
  'Rejected': '#DC2626',   // red-600
};

// Predefined coordinates for locations
const LOCATION_COORDS = {
  // ============ GERMANY ============
  'hainfeld': [49.2667, 8.1167],
  'würzburg': [49.7944, 9.9294],
  'walsheim': [49.2833, 8.1500],
  'eltville': [50.0286, 8.1172],
  'trier': [49.7567, 6.6417],
  'wiltingen': [49.6667, 6.6000],
  'bernkastel': [49.9167, 7.0667],
  'wehlen': [49.9333, 7.0333],
  'westhofen': [49.7000, 8.2500],
  'fellbach': [48.8089, 9.2761],
  'zeltingen': [49.9500, 7.0167],
  'leiwen': [49.8167, 6.8833],
  'oestrich': [50.0000, 8.0333],
  'winkel': [50.0000, 8.0000],
  'hochheim': [50.0167, 8.3500],
  'hattenheim': [50.0167, 8.0667],
  'deidesheim': [49.4083, 8.1833],
  'pfalz': [49.3500, 8.1500],
  'gimmeldingen': [49.3667, 8.1500],
  'freinsheim': [49.5000, 8.2000],
  'saulheim': [49.8667, 8.1333],
  'bechtheim': [49.7167, 8.2833],
  'rheinhessen': [49.7500, 8.1500],
  'rheingau': [50.0000, 8.0500],
  'mosela': [49.9667, 7.1167],
  'mosel': [49.9667, 7.1167],
  'franconia': [49.7500, 10.0000],
  'palatinado': [49.3500, 8.1500],
  'bayern': [48.7904, 11.4979],
  'hesse': [50.6521, 9.1624],
  'württemberg': [48.7758, 9.1829],
  'garmisch': [47.5000, 11.1000],
  'grainau': [47.4833, 11.0167],
  'hamburg': [53.5511, 9.9937],
  // ============ AUSTRIA ============
  'langenlois': [48.4667, 15.6667],
  'kamptal': [48.4500, 15.7000],
  'wachau': [48.3667, 15.5167],
  'dürnstein': [48.3944, 15.5194],
  'senftenberg': [48.4500, 15.5333],
  'kremstal': [48.4000, 15.6000],
  'illmitz': [47.7667, 16.8000],
  'burgenland': [47.5000, 16.5000],
  'pamhagen': [47.7000, 16.9000],
  'andau': [47.7667, 17.0333],
  'st. anton': [47.1297, 10.2683],
  'kitzbühel': [47.4492, 12.3922],
  'lech': [47.2069, 10.1417],
  'zürs': [47.1667, 10.1500],
  'arlberg': [47.1333, 10.2167],
  'landeck': [47.1397, 10.5656],
  'ischgl': [47.0167, 10.2833],
  'sölden': [46.9667, 10.8667],
  'obergurgl': [46.8667, 11.0167],
  'stuben': [47.1333, 10.1667],
  'seefeld': [47.3333, 11.1833],
  'innsbruck': [47.2692, 11.4041],
  'mayrhofen': [47.1667, 11.8667],
  'hintertux': [47.0667, 11.6500],
  'obertauern': [47.2500, 13.5500],
  'schladming': [47.3833, 13.6833],
  'bad gastein': [47.1167, 13.1333],
  'zell am see': [47.3167, 12.8000],
  'kaprun': [47.2667, 12.7667],
  'saalbach': [47.3833, 12.6333],
  'hinterglemm': [47.3833, 12.5833],
  'filzmoos': [47.4333, 13.5167],
  'ellmau': [47.5167, 12.3000],
  'söll': [47.5000, 12.2000],
  'alpbach': [47.3833, 11.9333],
  'westendorf': [47.4333, 12.2167],
  'kirchberg': [47.4500, 12.3167],
  'tirol': [47.2500, 11.3500],
  'tyrol': [47.2500, 11.3500],
  'salzburg': [47.8095, 13.0550],
  'vorarlberg': [47.2500, 9.9000],
  'bregenz': [47.5031, 9.7471],
  // ============ SWITZERLAND ============
  'zermatt': [46.0207, 7.7491],
  'verbier': [46.0967, 7.2286],
  'st. moritz': [46.4908, 9.8355],
  'sierre': [46.2919, 7.5356],
  'valais': [46.2333, 7.3667],
  'visperterminen': [46.2667, 7.9000],
  'vétroz': [46.2167, 7.2833],
  'veyras': [46.3000, 7.5333],
  'ginebra': [46.2044, 6.1432],
  'geneva': [46.2044, 6.1432],
  'basel': [47.5596, 7.5886],
  'davos': [46.8027, 9.8360],
  'klosters': [46.8708, 9.8783],
  'grindelwald': [46.6242, 8.0414],
  'wengen': [46.6058, 7.9222],
  'mürren': [46.5594, 7.8928],
  'interlaken': [46.6863, 7.8532],
  'lauterbrunnen': [46.5939, 7.9092],
  'jungfrau': [46.5375, 7.9625],
  'gstaad': [46.4750, 7.2875],
  'saas-fee': [46.1069, 7.9269],
  'crans-montana': [46.3075, 7.4797],
  'leukerbad': [46.3792, 7.6278],
  'andermatt': [46.6347, 8.5939],
  'engelberg': [46.8192, 8.4017],
  'arosa': [46.7833, 9.6833],
  'laax': [46.8108, 9.2589],
  'flims': [46.8333, 9.2833],
  'lenzerheide': [46.7333, 9.5500],
  'samnaun': [46.9500, 10.4167],
  'pontresina': [46.4958, 9.9044],
  'champéry': [46.1750, 6.8711],
  'nendaz': [46.1861, 7.3025],
  'les diablerets': [46.3500, 7.2000],
  'leysin': [46.3447, 7.0131],
  'villars': [46.2992, 7.0589],
  'anzère': [46.3000, 7.4000],
  'bern': [46.9480, 7.4474],
  'zürich': [47.3769, 8.5417],
  'zurich': [47.3769, 8.5417],
  'lucerna': [47.0502, 8.3093],
  'lucerne': [47.0502, 8.3093],
  // ============ FRANCE - Bordeaux ============
  'burdeos': [44.8378, -0.5792],
  'bordeaux': [44.8378, -0.5792],
  'pauillac': [45.1978, -0.7500],
  'martillac': [44.7167, -0.5333],
  'pessac': [44.8067, -0.6311],
  'saint-julien': [45.1500, -0.7333],
  'saint-estèphe': [45.2667, -0.7667],
  'saint-cibard': [44.8833, -0.0833],
  'ludon': [44.9833, -0.6000],
  'moulis': [45.0500, -0.7667],
  'pomerol': [44.9333, -0.2000],
  'margaux': [45.0500, -0.6667],
  'léognan': [44.7333, -0.6000],
  'médoc': [45.2000, -0.8500],
  // ============ FRANCE - Burgundy ============
  'borgoña': [47.0500, 4.8333],
  'burgundy': [47.0500, 4.8333],
  'beaune': [47.0258, 4.8400],
  'nuits-saint-georges': [47.1333, 4.9500],
  'romanèche': [46.1833, 4.7333],
  'mercurey': [46.8333, 4.7167],
  'pommard': [47.0000, 4.7833],
  'meursault': [46.9833, 4.7667],
  // ============ FRANCE - Other regions ============
  'champagne': [49.0500, 4.0333],
  'champaña': [49.0500, 4.0333],
  'épernay': [49.0439, 3.9536],
  'alsacia': [48.3181, 7.4416],
  'alsace': [48.3181, 7.4416],
  'colmar': [48.0778, 7.3558],
  'bergheim': [48.2083, 7.3667],
  'eguisheim': [48.0417, 7.3083],
  'bernardvillé': [48.3167, 7.4333],
  'saboya': [45.5000, 6.0000],
  'savoie': [45.5000, 6.0000],
  'chignin': [45.5333, 6.0167],
  'ródano': [44.9333, 4.8833],
  'rhone': [44.9333, 4.8833],
  'ampuis': [45.4833, 4.8000],
  'hermitage': [45.0833, 4.8333],
  'jura': [46.7500, 5.8333],
  'arlay': [46.7667, 5.5333],
  'châteauneuf-du-pape': [44.0569, 4.8319],
  'provenza': [43.7500, 5.8333],
  'provence': [43.7500, 5.8333],
  'saint-rémy': [43.7886, 4.8314],
  'gigondas': [44.1667, 5.0000],
  'courthézon': [44.0833, 4.8833],
  'séguret': [44.2000, 5.0000],
  'la croix-valmer': [43.2000, 6.5667],
  'la motte': [43.4833, 6.5333],
  'correns': [43.4833, 6.0833],
  'languedoc': [43.5000, 3.0000],
  'saint-saturnin': [43.7000, 3.4500],
  'rivesaltes': [42.7667, 2.8667],
  'aniane': [43.6833, 3.5833],
  'perpiñán': [42.6986, 2.8956],
  'narbonne': [43.1833, 3.0000],
  'limoux': [43.0500, 2.2167],
  'beaujolais': [46.0500, 4.6000],
  'charentay': [46.0833, 4.6333],
  'courchevel': [45.4154, 6.6347],
  'chamonix': [45.9237, 6.8694],
  'val thorens': [45.2980, 6.5800],
  "val d'isère": [45.4481, 6.9769],
  'méribel': [45.3967, 6.5656],
  'morzine': [46.1797, 6.7094],
  'tignes': [45.4692, 6.9056],
  'avoriaz': [46.1917, 6.7750],
  'la plagne': [45.5000, 6.6667],
  'les gets': [46.1583, 6.6667],
  'marne-la-vallée': [48.8500, 2.6333],
  'les arcs': [45.5703, 6.8283],
  'les deux alpes': [45.0167, 6.1167],
  "l'alpe d'huez": [45.0917, 6.0683],
  'alpe d huez': [45.0917, 6.0683],
  'serre chevalier': [44.9500, 6.5500],
  'les menuires': [45.3264, 6.5314],
  'saint-martin-de-belleville': [45.3833, 6.5000],
  'la rosière': [45.6283, 6.8450],
  'sainte-foy': [45.5833, 6.9000],
  'megève': [45.8567, 6.6175],
  'les contamines': [45.8167, 6.7333],
  'flaine': [46.0058, 6.6906],
  'argentière': [45.9833, 6.9333],
  'brides-les-bains': [45.4500, 6.5667],
  'pralognan': [45.3833, 6.7167],
  'la clusaz': [45.9033, 6.4239],
  'le grand-bornand': [45.9417, 6.4292],
  'manigod': [45.8500, 6.3833],
  'montgenevre': [44.9333, 6.7167],
  'risoul': [44.6333, 6.6167],
  'vars': [44.5667, 6.7000],
  'isola 2000': [44.1833, 7.1500],
  'auron': [44.2333, 6.9500],
  'paradiski': [45.5500, 6.8000],
  'trois vallées': [45.3500, 6.5500],
  '3 vallées': [45.3500, 6.5500],
  'portes du soleil': [46.2000, 6.7500],
  'paris': [48.8566, 2.3522],
  'lyon': [45.7640, 4.8357],
  'marseille': [43.2965, 5.3698],
  'nice': [43.7102, 7.2620],
  'monaco': [43.7384, 7.4246],
  'annecy': [45.8992, 6.1294],
  'grenoble': [45.1885, 5.7245],
  // ============ SPAIN ============
  'rioja': [42.4500, -2.4500],
  'la rioja': [42.4500, -2.4500],
  'rioja alavesa': [42.5500, -2.6000],
  'villabuena': [42.5500, -2.6333],
  'villabuena de álava': [42.5500, -2.6333],
  'villabuena de alava': [42.5500, -2.6333],
  'laguardia': [42.5500, -2.5833],
  'elciego': [42.5167, -2.6167],
  'labastida': [42.5833, -2.8000],
  'samaniego': [42.5667, -2.6500],
  'cenicero': [42.4833, -2.6333],
  'logroño': [42.4650, -2.4456],
  'logrono': [42.4650, -2.4456],
  'españa': [40.4637, -3.7492],
  'espana': [40.4637, -3.7492],
  'calahorra': [42.3000, -1.9667],
  'aldeanueva': [42.2333, -1.9000],
  'navarrete': [42.4333, -2.5667],
  'ribera': [41.6667, -3.7000],
  'valbuena': [41.6333, -4.2833],
  'peñafiel': [41.6000, -4.1167],
  'pesquera': [41.6333, -4.1500],
  'quintanilla': [41.6500, -4.2333],
  'berlangas': [41.6667, -3.9333],
  'curiel': [41.6167, -4.1000],
  'penedès': [41.3500, 1.7000],
  'vilafranca': [41.3500, 1.6833],
  'torrelavit': [41.4333, 1.7167],
  'vallbona': [41.5333, 1.0833],
  'priorat': [41.1833, 0.8500],
  'gratallops': [41.1833, 0.7833],
  'la morera': [41.2333, 0.8500],
  'montsant': [41.2500, 0.8333],
  'escaladei': [41.2833, 0.8500],
  'galicia': [42.5667, -8.1000],
  'rías baixas': [42.4167, -8.6500],
  'cambados': [42.5167, -8.8167],
  'salnés': [42.4500, -8.8000],
  'vilanova': [42.5667, -8.7667],
  'o rosal': [41.9333, -8.8333],
  'jerez': [36.6817, -6.1378],
  'navarra': [42.8167, -1.6500],
  'olite': [42.4833, -1.6500],
  'villamayor': [42.6333, -2.0667],
  'mallorca': [39.6953, 3.0176],
  'ibiza': [38.9067, 1.4206],
  'costa del sol': [36.5101, -4.8824],
  'baleares': [39.5000, 2.8833],
  'canarias': [28.2916, -16.6291],
  'barcelona': [41.3851, 2.1734],
  'madrid': [40.4168, -3.7038],
  'valencia': [39.4699, -0.3763],
  'sevilla': [37.3891, -5.9845],
  'bilbao': [43.2630, -2.9350],
  'san sebastian': [43.3183, -1.9812],
  'donostia': [43.3183, -1.9812],
  'baqueira': [42.7000, 0.9333],
  'baqueira beret': [42.7000, 0.9333],
  'formigal': [42.7667, -0.3833],
  'sierra nevada': [37.0958, -3.3961],
  'grandvalira': [42.5500, 1.7333],
  'andorra': [42.5063, 1.5218],
  // ============ PORTUGAL ============
  'douro': [41.1667, -7.8000],
  'peso da régua': [41.1667, -7.7833],
  'lamego': [41.1000, -7.8167],
  'sabrosa': [41.2667, -7.5833],
  'covas': [41.1833, -7.5833],
  'folgosa': [41.1667, -7.8667],
  'pinhão': [41.1833, -7.5500],
  'alentejo': [38.5667, -7.9000],
  'reguengos': [38.4167, -7.5333],
  'estremoz': [38.8500, -7.5833],
  'campo maior': [39.0167, -7.0667],
  'vinho verde': [41.5000, -8.3000],
  'penafiel': [41.2000, -8.2833],
  'melgaço': [42.1167, -8.2667],
  'dão': [40.5333, -7.9000],
  'carregal': [40.5667, -7.9000],
  'santar': [40.5667, -7.9333],
  'algarve': [37.0179, -7.9304],
  'lisboa': [38.7223, -9.1393],
  'lisbon': [38.7223, -9.1393],
  'madeira': [32.6669, -16.9241],
  // ============ ITALY ============
  'piamonte': [45.0522, 7.5156],
  'piedmont': [45.0522, 7.5156],
  'alba': [44.7000, 8.0333],
  'castiglione falletto': [44.6167, 7.9833],
  'barolo': [44.6167, 7.9333],
  'barbaresco': [44.7167, 8.0833],
  'toscana': [43.3500, 11.0167],
  'tuscany': [43.3500, 11.0167],
  'barberino': [43.5500, 11.1833],
  'tavarnelle': [43.5500, 11.1833],
  'montalcino': [43.0500, 11.4833],
  'veneto': [45.4333, 11.0000],
  'valdobbiadene': [45.9000, 11.9333],
  'verona': [45.4384, 10.9916],
  'santo stefano': [45.9000, 11.9500],
  'godega': [45.9500, 12.3833],
  'conegliano': [45.8833, 12.2833],
  'alto adige': [46.5000, 11.3500],
  'magrè': [46.2833, 11.2167],
  'margreid': [46.2833, 11.2167],
  'trento': [46.0667, 11.1167],
  'trentino': [46.0667, 11.1167],
  'termeno': [46.3333, 11.2333],
  'terlano': [46.5333, 11.2500],
  'nalles': [46.5500, 11.2167],
  'sicilia': [37.5000, 14.0000],
  'sicily': [37.5000, 14.0000],
  'castiglione di sicilia': [37.8833, 15.1167],
  'santa venerina': [37.6833, 15.1333],
  'umbría': [42.9333, 12.5667],
  'umbria': [42.9333, 12.5667],
  'montefalco': [42.8833, 12.6500],
  'lombardía': [45.4791, 9.8452],
  'lombardy': [45.4791, 9.8452],
  'erbusco': [45.6000, 10.0000],
  'cerdeña': [40.1209, 9.0129],
  'sardinia': [40.1209, 9.0129],
  'dolomitas': [46.4102, 11.8440],
  'dolomites': [46.4102, 11.8440],
  'val gardena': [46.5583, 11.7356],
  'selva': [46.5583, 11.7356],
  'cortina': [46.5369, 12.1356],
  'cortina d\'ampezzo': [46.5369, 12.1356],
  'livigno': [46.5333, 10.1333],
  'bormio': [46.4667, 10.3667],
  'madonna di campiglio': [46.2333, 10.8167],
  'canazei': [46.4667, 11.7667],
  'ortisei': [46.5750, 11.6750],
  'moena': [46.3833, 11.6500],
  'pozza di fassa': [46.4333, 11.7000],
  'arabba': [46.5000, 11.8667],
  'kronplatz': [46.7333, 11.9500],
  'plan de corones': [46.7333, 11.9500],
  'alta badia': [46.5500, 11.8500],
  'corvara': [46.5500, 11.8667],
  'san cassiano': [46.5667, 11.9000],
  'la villa': [46.5833, 11.9167],
  'seiser alm': [46.5417, 11.6333],
  'alpe di siusi': [46.5417, 11.6333],
  'merano': [46.6711, 11.1594],
  'meran': [46.6711, 11.1594],
  'bolzano': [46.4983, 11.3548],
  'bozen': [46.4983, 11.3548],
  'courmayeur': [45.7917, 6.9667],
  'cervinia': [45.9333, 7.6333],
  'la thuile': [45.7167, 6.9500],
  'champoluc': [45.8333, 7.7167],
  'gressoney': [45.7833, 7.8167],
  'sestriere': [44.9500, 6.8667],
  'bardonecchia': [45.0833, 6.7000],
  'sauze d\'oulx': [45.0333, 6.8500],
  'roma': [41.9028, 12.4964],
  'rome': [41.9028, 12.4964],
  'milano': [45.4642, 9.1900],
  'milan': [45.4642, 9.1900],
  'venezia': [45.4408, 12.3155],
  'venice': [45.4408, 12.3155],
  'firenze': [43.7696, 11.2558],
  'florence': [43.7696, 11.2558],
  'génova': [44.4056, 8.9463],
  'genova': [44.4056, 8.9463],
  // ============ GREECE ============
  'santorini': [36.3932, 25.4615],
  'pyrgos': [36.3833, 25.4333],
  'oia': [36.4617, 25.3750],
  'mykonos': [37.4467, 25.3289],
  'naoussa': [40.6333, 22.0667],
  'nemea': [37.8167, 22.6667],
  'halkidiki': [40.2000, 23.5000],
  'corfú': [39.6243, 19.9217],
  'corfu': [39.6243, 19.9217],
  // ============ OTHER EUROPE ============
  // Hungary
  'tokaj': [48.1167, 21.4000],
  'mád': [48.1833, 21.2833],
  'tarcal': [48.1333, 21.3500],
  // Croatia
  'istria': [45.2000, 13.9000],
  'bale': [45.0333, 13.8000],
  'komarna': [43.0333, 17.4333],
  'baranja': [45.8333, 18.6667],
  'buje': [45.4167, 13.6667],
  'hvar': [43.1728, 16.4411],
  'poreč': [45.2269, 13.5944],
  'dubrovnik': [42.6507, 18.0944],
  // Slovenia
  'brda': [45.9667, 13.5333],
  'vipava': [45.8500, 13.9667],
  // Georgia
  'kakheti': [41.9500, 45.5500],
  'kisiskhevi': [41.9167, 45.4833],
  'sighnaghi': [41.6167, 45.9333],
  // Czech Republic
  'moravia': [49.2000, 16.6000],
  'znojmo': [48.8556, 16.0489],
  'dobšice': [48.8500, 16.0833],
  // Cyprus
  'paphos': [34.7667, 32.4167],
  'limassol': [34.6833, 33.0333],
  'mesoyi': [34.8333, 32.4167],
  'chipre': [35.1264, 33.4299],
  'cyprus': [35.1264, 33.4299],
  // Luxembourg
  'remich': [49.5450, 6.3672],
  'wormeldange': [49.6167, 6.4000],
  // Bulgaria
  'struma': [41.7333, 23.1167],
  'thracian': [42.1333, 24.7500],
  // Romania
  'dealu mare': [45.0500, 26.1500],
  'banat': [45.7500, 21.2333],
  'transilvania': [46.7667, 23.6000],
  // ============ USA ============
  'napa': [38.2975, -122.2869],
  'napa valley': [38.2975, -122.2869],
  'st. helena': [38.5050, -122.4697],
  'oakville': [38.4283, -122.4097],
  'calistoga': [38.5786, -122.5797],
  'rutherford': [38.4556, -122.4192],
  'yountville': [38.4014, -122.3614],
  'sonoma': [38.2919, -122.4580],
  'glen ellen': [38.3572, -122.5253],
  'kenwood': [38.4131, -122.5456],
  'paso robles': [35.6264, -120.6910],
  'santa barbara': [34.4208, -119.6982],
  'livermore': [37.6819, -121.7680],
  'temecula': [33.4936, -117.1484],
  'ceres': [37.5949, -120.9577],
  'parlier': [36.6119, -119.5293],
  'manteca': [37.7975, -121.2161],
  'san diego': [32.7157, -117.1611],
  'willamette': [45.0000, -123.0000],
  'sherwood': [45.3567, -122.8406],
  'dayton': [45.2206, -123.0775],
  'eugene': [44.0521, -123.0868],
  'mcminnville': [45.2100, -123.1986],
  'turner': [44.8437, -122.9526],
  'newberg': [45.3007, -122.9733],
  'oregon': [43.8041, -120.5542],
  'oregón': [43.8041, -120.5542],
  'walla walla': [46.0646, -118.3430],
  'chelan': [47.8410, -119.9978],
  'washington': [47.7511, -120.7401],
  'virginia': [37.4316, -78.6569],
  'amissville': [38.6751, -78.0017],
  'missouri': [38.5767, -92.1736],
  'hermann': [38.7042, -91.4374],
  'wisconsin': [43.7844, -88.7879],
  'kohler': [43.7394, -87.7812],
  'california': [36.7783, -119.4179],
  'florida': [27.6648, -81.5158],
  'miami': [25.7617, -80.1918],
  'alaska': [64.2008, -152.4937],
  'wyoming': [43.0760, -107.2903],
  'arizona': [34.0489, -111.0937],
  'montana': [46.8797, -110.3626],
  'colorado': [39.5501, -105.7821],
  'yellowstone': [44.4280, -110.5885],
  'grand canyon': [36.0544, -112.1401],
  'yosemite': [37.8651, -119.5383],
  'glacier': [48.7596, -113.7870],
  // ============ NORDIC ============
  // Sweden
  'åre': [63.3986, 13.0806],
  'sälen': [61.1583, 13.2667],
  'jukkasjärvi': [67.8500, 20.5833],
  'halmstad': [56.6745, 12.8570],
  'strömstad': [58.9394, 11.1711],
  'visby': [57.6348, 18.2948],
  'gotland': [57.5000, 18.5500],
  'riksgränsen': [68.4258, 18.1250],
  // Finland
  'rovaniemi': [66.5039, 25.7294],
  'levi': [67.7994, 24.8092],
  'saariselkä': [68.4167, 27.4167],
  'ylläs': [67.5500, 24.2333],
  'ruka': [66.1667, 29.1500],
  'köngäs': [67.8167, 24.5500],
  // Norway
  'trysil': [61.3167, 12.2667],
  'hemsedal': [60.8600, 8.5600],
  'voss': [60.6292, 6.4208],
  'flåm': [60.8631, 7.1136],
  'sognefjord': [61.1000, 7.0000],
  'lyngen': [69.5667, 20.2167],
  'troms': [69.6496, 18.9560],
  'lofoten': [68.2000, 14.0000],
  'larvik': [59.0500, 10.0333],
  'geiranger': [62.1008, 7.2058],
  'lofthus': [60.3167, 6.6500],
  'alta': [69.9689, 23.2717],
  'kirkenes': [69.7271, 30.0459],
  // Iceland
  'höfn': [64.2539, -15.2083],
  'islandia': [64.9631, -19.0208],
  'iceland': [64.9631, -19.0208],
  // Denmark
  'skagen': [57.7250, 10.5833],
  'copenhague': [55.6761, 12.5683],
  'copenhagen': [55.6761, 12.5683],
  'zealand': [55.5000, 11.9000],
  // ============ UK & IRELAND ============
  'scottish': [56.4907, -4.2026],
  'highlands': [57.1200, -4.7100],
  'longford': [53.7275, -7.7932],
  'reino unido': [55.3781, -3.4360],
  'uk': [55.3781, -3.4360],
  'irlanda': [53.1424, -7.6921],
  'ireland': [53.1424, -7.6921],
  // ============ NEW ZEALAND ============
  // Marlborough
  'marlborough': [-41.5138, 173.9614],
  'blenheim': [-41.5138, 173.9614],
  'renwick': [-41.5000, 173.8333],
  'rapaura': [-41.4667, 173.8833],
  'seddon': [-41.7333, 174.0667],
  'awatere': [-41.7500, 174.0333],
  'wairau': [-41.5000, 173.8667],
  // Hawkes Bay
  "hawke's bay": [-39.4928, 176.9120],
  'hawkes bay': [-39.4928, 176.9120],
  'napier': [-39.4928, 176.9120],
  'hastings': [-39.6394, 176.8494],
  'havelock north': [-39.6667, 176.8833],
  'gimblett gravels': [-39.5833, 176.8333],
  'bridge pa': [-39.5667, 176.7833],
  'te awanga': [-39.6167, 177.0167],
  'esk valley': [-39.4500, 176.8500],
  // Central Otago
  'central otago': [-45.0312, 169.2006],
  'cromwell': [-45.0333, 169.2000],
  'bannockburn': [-45.0500, 169.1667],
  'alexandra': [-45.2500, 169.3833],
  'gibbston': [-45.0167, 168.8667],
  'queenstown': [-45.0312, 168.6626],
  'wanaka': [-44.7000, 169.1500],
  'arrowtown': [-44.9333, 168.8333],
  'bendigo': [-45.0333, 169.3000],
  'lowburn': [-44.9833, 169.1833],
  // Martinborough / Wairarapa
  'martinborough': [-41.2183, 175.4583],
  'wairarapa': [-41.2167, 175.4500],
  'gladstone': [-41.1000, 175.5333],
  // Nelson / Tasman
  'nelson': [-41.2706, 173.2840],
  'tasman': [-41.3000, 172.8000],
  'upper moutere': [-41.2167, 172.9167],
  'motueka': [-41.1167, 172.9833],
  'brightwater': [-41.3833, 173.1000],
  'hope': [-41.3500, 173.0833],
  'richmond': [-41.3333, 173.1833],
  'mapua': [-41.2500, 173.1000],
  // Gisborne
  'gisborne': [-38.6623, 178.0176],
  'manutuke': [-38.6667, 177.8833],
  'ormond': [-38.5500, 177.9833],
  // Canterbury
  'canterbury': [-43.5320, 172.6306],
  'waipara': [-43.0333, 172.7500],
  'christchurch': [-43.5320, 172.6306],
  'cheviot': [-42.8167, 173.2667],
  // Auckland
  'auckland': [-36.8485, 174.7633],
  'kumeu': [-36.7667, 174.5500],
  'matakana': [-36.3833, 174.7167],
  'waiheke': [-36.8000, 175.0833],
  'waiheke island': [-36.8000, 175.0833],
  'clevedon': [-37.0167, 175.0333],
  // Northland
  'northland': [-35.4500, 173.8500],
  'kerikeri': [-35.2333, 173.9500],
  // Wellington
  'wellington': [-41.2866, 174.7756],
  'te horo': [-40.7333, 175.1333],
  // Other NZ locations
  'new zealand': [-40.9006, 174.8860],
  'north island': [-39.0000, 176.0000],
  'south island': [-44.0000, 170.0000],

  // ============ AUSTRALIA ============
  // Barossa Valley
  'barossa': [-34.5167, 138.9667],
  'barossa valley': [-34.5167, 138.9667],
  'nuriootpa': [-34.4667, 139.0000],
  'tanunda': [-34.5167, 138.9500],
  'angaston': [-34.5000, 139.0500],
  'seppeltsfield': [-34.4667, 138.9167],
  'marananga': [-34.5000, 138.9333],
  // Adelaide Hills
  'adelaide hills': [-34.9500, 138.7000],
  'stirling': [-35.0000, 138.7167],
  'hahndorf': [-35.0333, 138.8000],
  'lobethal': [-34.9000, 138.8667],
  // McLaren Vale
  'mclaren vale': [-35.2167, 138.5500],
  'willunga': [-35.2667, 138.5500],
  // Clare Valley
  'clare valley': [-33.8333, 138.6000],
  'clare': [-33.8333, 138.6000],
  'sevenhill': [-33.8667, 138.5833],
  // Coonawarra
  'coonawarra': [-37.3000, 140.8333],
  'penola': [-37.3833, 140.8333],
  // Yarra Valley
  'yarra valley': [-37.7167, 145.5833],
  'healesville': [-37.6500, 145.5167],
  'coldstream': [-37.7167, 145.3833],
  'yarra glen': [-37.6500, 145.3667],
  // Margaret River
  'margaret river': [-33.9500, 115.0833],
  'wilyabrup': [-33.7833, 115.0167],
  'cowaramup': [-33.8500, 115.0833],
  // Hunter Valley
  'hunter valley': [-32.8333, 151.2833],
  'pokolbin': [-32.8000, 151.2833],
  'singleton': [-32.5667, 151.1667],
  // Tasmania
  'tasmania': [-42.0409, 146.8087],
  'launceston': [-41.4332, 147.1441],
  'tamar valley': [-41.2500, 146.9500],
  // Other Australia
  'adelaide': [-34.9285, 138.6007],
  'sydney': [-33.8688, 151.2093],
  'melbourne': [-37.8136, 144.9631],
  'perth': [-31.9505, 115.8605],

  // ============ SOUTH AFRICA ============
  'stellenbosch': [-33.9346, 18.8602],
  'franschhoek': [-33.9104, 19.1178],
  'paarl': [-33.7333, 18.9667],
  'constantia': [-34.0333, 18.4167],
  'robertson': [-33.8000, 19.8833],
  'cape town': [-33.9249, 18.4241],
  'elgin': [-34.1500, 19.0333],
  'walker bay': [-34.3833, 19.2333],
  'hermanus': [-34.4167, 19.2333],
  'swartland': [-33.4500, 18.7500],

  // ============ ARGENTINA ============
  'mendoza': [-32.8908, -68.8272],
  'luján de cuyo': [-33.0333, -68.8667],
  'maipú': [-32.9667, -68.7833],
  'uco valley': [-33.8000, -69.2000],
  'valle de uco': [-33.8000, -69.2000],
  'tupungato': [-33.3667, -69.1500],
  'tunuyán': [-33.5667, -69.0167],
  'san rafael': [-34.6167, -68.3333],
  'salta': [-24.7821, -65.4232],
  'cafayate': [-26.0667, -65.9833],
  // 'la rioja': [-29.4133, -66.8500],
  'patagonia': [-42.0000, -71.0000],
  'neuquén': [-38.9516, -68.0591],

  // ============ CHILE ============
  'valle de maipo': [-33.5000, -70.6000],
  'maipo': [-33.5000, -70.6000],
  'colchagua': [-34.5000, -71.2000],
  'casablanca': [-33.3167, -71.4000],
  'aconcagua': [-32.8333, -70.5000],
  'rapel': [-34.1667, -71.5000],
  'curicó': [-34.9833, -71.2333],
  'maule': [-35.5167, -71.6667],
  'bío bío': [-37.0833, -72.4667],
  'itata': [-36.6833, -72.5000],
  'limarí': [-30.7500, -71.3333],
  'elqui': [-29.9000, -70.5000],
  'santiago': [-33.4489, -70.6693],

  // ============ CANADIAN & MORE LOCATIONS ============
  // Canada
  'okanagan': [49.5000, -119.5833],
  'kelowna': [49.8880, -119.4960],
  'naramata': [49.5833, -119.6000],
  'penticton': [49.4911, -119.5891],
  'oliver': [49.1833, -119.5500],
  'niagara': [43.1000, -79.0667],
  'niagara-on-the-lake': [43.2500, -79.0667],
  'whistler': [50.1163, -122.9574],
  'banff': [51.1784, -115.5708],
  'lake louise': [51.4254, -116.1773],

  // ============ COUNTRY DEFAULTS ============
  'DEFAULT_AU': [-25.2744, 133.7751],
  'DEFAULT_ZA': [-30.5595, 22.9375],
  'DEFAULT_AR': [-38.4161, -63.6167],
  'DEFAULT_CL': [-35.6751, -71.5430],
  'DEFAULT_CA': [56.1304, -106.3468],
  'DEFAULT_CH': [46.8182, 8.2275],
  'DEFAULT_FR': [46.2276, 2.2137],
  'DEFAULT_AT': [47.5162, 14.5501],
  'DEFAULT_IT': [41.8719, 12.5674],
  'DEFAULT_DE': [51.1657, 10.4515],
  'DEFAULT_NZ': [-40.9006, 174.8860],
  'DEFAULT_US': [37.0902, -95.7129],
  'DEFAULT_ES': [40.4637, -3.7492],
  'DEFAULT_PT': [39.3999, -8.2245],
  'DEFAULT_GR': [39.0742, 21.8243],
  'DEFAULT_SE': [60.1282, 18.6435],
  'DEFAULT_NO': [60.4720, 8.4689],
  'DEFAULT_FI': [61.9241, 25.7482],
  'DEFAULT_DK': [56.2639, 9.5018],
  'DEFAULT_IS': [64.9631, -19.0208],
  'DEFAULT_GB': [55.3781, -3.4360],
  'DEFAULT_HR': [45.1000, 15.2000],
  'DEFAULT_NL': [52.1326, 5.2913],
  'DEFAULT_BE': [50.5039, 4.4699],
  'DEFAULT_IE': [53.1424, -7.6921],
  'DEFAULT_HU': [47.1625, 19.5033],
  'DEFAULT_CZ': [49.8175, 15.4730],
  'DEFAULT_SI': [46.1512, 14.9955],
  'DEFAULT_GE': [42.3154, 43.3569],
  'DEFAULT_CY': [35.1264, 33.4299],
  'DEFAULT_LU': [49.8153, 6.1296],
  'DEFAULT_BG': [42.7339, 25.4858],
  'DEFAULT_RO': [45.9432, 24.9668],
};

// Normalize string removing diacritics for better matching
const normalizeString = (str) => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

// Get coordinates for a location
const getCoordinates = (location, country) => {
  if (!location) return LOCATION_COORDS[`DEFAULT_${country}`] || null;

  const locationNormalized = normalizeString(location);

  // Check for known locations - try longer matches first for accuracy
  const keys = Object.keys(LOCATION_COORDS)
    .filter(k => !k.startsWith('DEFAULT_'))
    .sort((a, b) => b.length - a.length);

  for (const key of keys) {
    const keyNormalized = normalizeString(key);
    if (locationNormalized.includes(keyNormalized)) {
      return LOCATION_COORDS[key];
    }
  }

  // Fall back to country default
  return LOCATION_COORDS[`DEFAULT_${country}`] || null;
};

const MapView = () => {
  const [sector, setSector] = useState('winery');
  const { wineries, loading: wineriesLoading } = useWineries();
  const { housekeeping, loading: housekeepingLoading } = useHousekeeping();
  const { statusOptions = [], loading: configLoading } = useConfig();

  const loading = wineriesLoading || housekeepingLoading || configLoading;
  const currentData = sector === 'winery' ? wineries : housekeeping;

  // Filter out hidden and get coordinates
  const markers = useMemo(() => {
    return currentData
      .filter(item => !item.hidden)
      .map(item => ({
        ...item,
        coords: getCoordinates(item.location, item.country),
      }))
      .filter(item => item.coords !== null);
  }, [currentData]);

  // Count by status for legend
  const statusCounts = useMemo(() => {
    return statusOptions.reduce((acc, status) => {
      acc[status.label] = markers.filter(m => m.status === status.label).length;
      return acc;
    }, {});
  }, [markers, statusOptions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sector Toggle */}
      <SectorToggle
        sector={sector}
        onSectorChange={setSector}
        showAddButton={false}
      />

      {/* Map Container */}
      <div className="bg-dark-sidebar rounded-2xl overflow-hidden border border-dark-hover shadow-lg">
        <div className="h-[60vh] min-h-[400px]">
          <MapContainer
            center={sector === 'winery' ? [-41.5, 174.0] : [47.0, 8.0]}
            zoom={sector === 'winery' ? 5 : 4}
            className="h-full w-full"
            style={{ background: '#1a1a2e' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {markers.map((item) => (
              <CircleMarker
                key={item.id}
                center={item.coords}
                radius={8}
                fillColor={STATUS_COLORS[item.status] || '#4B5563'}
                fillOpacity={0.8}
                color="#fff"
                weight={1}
              >
                <Popup>
                  <div className="text-dark-bg min-w-[200px]">
                    <div className="flex items-center gap-2 font-bold text-sm mb-1">
                      <CountryFlag code={item.country} size="sm" />
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-600 mb-2">{item.location}</div>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs text-white"
                        style={{ backgroundColor: STATUS_COLORS[item.status] }}
                      >
                        {item.status}
                      </span>
                    </div>
                    {item.email && (
                      <div className="mt-2 text-xs text-gray-500 truncate">
                        {item.email}
                      </div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        {/* Legend */}
        <div className="px-4 py-3 border-t border-dark-hover bg-dark-bg/30">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {statusOptions.map((status) => (
              <div key={status.label} className="flex items-center gap-1.5 text-dark-subtext">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[status.label] }}
                />
                <span>{statusCounts[status.label] || 0} {status.label.toLowerCase()}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-dark-subtext">
            Showing {markers.length} of {currentData.filter(i => !i.hidden).length} companies with known locations
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;

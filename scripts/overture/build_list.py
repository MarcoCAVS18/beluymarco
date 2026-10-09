"""
build_list.py — filtra el parquet de fetch_places.py y arma la lista de empresas
en el formato de src/data/empresas-nuevas-housekeeping.json:
  { nombre, email, ubicacion, pais, fuente: 'overture' }

Filtros: países pedidos, no cerrados, confianza >= 0.7, email válido y no personal,
sin duplicados (email o nombre normalizado) contra el JSON local ni entre sí.
El dedupe contra Firestore real lo hace después el loader en el dry-run.

Los JSON generados NO se commitean (repo público): quedan en .gitignore.

Uso:
  python build_list.py <entrada.parquet> <PAISES> <json_existente> <salida.json>
  python build_list.py nordicos.parquet SE,NO,FI,DK \\
      src/data/empresas-nuevas-housekeeping.json \\
      src/data/empresas-nuevas-housekeeping-nordicos.json
"""
import json
import os
import re
import sys
import unicodedata

import pyarrow.parquet as pq

CONFIANZA_MIN = 0.7

# Dominios de email personales/ISP: se descartan, queremos contactos de la empresa
PERSONALES = {
    'gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.se', 'hotmail.no', 'hotmail.dk', 'hotmail.fi',
    'outlook.com', 'live.com', 'live.se', 'live.no', 'live.dk', 'msn.com', 'yahoo.com', 'yahoo.se', 'yahoo.no',
    'yahoo.dk', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'gmx.de', 'gmx.net', 'gmx.at', 'gmx.ch', 'web.de',
    't-online.de', 'online.no', 'telia.com', 'telia.se', 'spray.se', 'bredband.net', 'comhem.se', 'tele2.se',
    'home.se', 'passagen.se', 'jubii.dk', 'mail.dk', 'get2net.dk', 'post.tele.dk', 'stofanet.dk', 'youmail.dk',
    'suomi24.fi', 'luukku.com', 'kolumbus.fi', 'pp.inet.fi', 'welho.com', 'saunalahti.fi', 'mail.ru', 'yandex.ru',
    'yandex.com', 'proton.me', 'protonmail.com', 'libero.it', 'virgilio.it', 'tiscali.it', 'alice.it', 'orange.fr',
    'wanadoo.fr', 'free.fr', 'laposte.net', 'sfr.fr', 'yahoo.fr', 'yahoo.it', 'yahoo.es', 'hotmail.it',
    'hotmail.fr', 'hotmail.es', 'hotmail.co.uk', 'yahoo.co.uk', 'btinternet.com', 'wp.pl', 'o2.pl', 'onet.pl',
    'interia.pl', 'seznam.cz', 'centrum.cz', 'freemail.hu', 'abv.bg', 'inbox.lv', 'mail.ee', 'hot.ee', 'terra.es',
    'telefonica.net', 'sapo.pt', 'bluewin.ch', 'hispeed.ch', 'chello.at', 'aon.at', 'a1.net', 'skynet.be',
    'telenet.be', 'ziggo.nl', 'kpnmail.nl', 'planet.nl', 'home.nl', 'hetnet.nl', 'eircom.net', 'otenet.gr',
    'yahoo.gr', 'windowslive.com', 'mail.com', 'email.com',
}
EMAIL = re.compile(r'^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$')

# Webs de plataformas de alquiler / portales / clasificados: casi siempre son alquileres
# particulares sin personal propio, no sirven para buscar trabajo de housekeeping
WEB_NO_SIRVE = re.compile(
    r'(^|\.)(airbnb\.[a-z.]+|abnb\.me|booking\.com|vrbo\.com|homeaway\.[a-z.]+|expedia\.[a-z.]+|'
    r'hotels\.com|tripadvisor\.[a-z.]+|agoda\.com|holidu\.[a-z.]+|fewo-direkt\.de|novasol\.[a-z.]+|'
    r'interhome\.[a-z.]+|e-domizil\.[a-z.]+|traum-ferienwohnungen\.de|ferienwohnungen\.de|'
    r'e-chalupy\.cz|nocowanie\.pl|olx\.[a-z.]+|turistinfo\.ro|sommerhus\.dk|dancenter\.[a-z.]+|'
    r'sologstrand\.[a-z.]+|feriepartner\.[a-z.]+|inatur\.no|finn\.no|blocket\.se|tori\.fi|lomarengas\.fi|'
    r'nettimokki\.com|stugsommar\.se|bestil-sommerhus\.dk|campsy\.[a-z.]+|pitchup\.com|hometogo\.[a-z.]+)$')
EMAIL_NO_SIRVE = re.compile(r'@([a-z0-9.-]+\.)?(airbnb\.com|booking\.com|guest\.booking\.com|vrbo\.com|expedia\.com)$')
# Nombres típicos de alquiler particular (departamento, cabaña, casa de vacaciones, habitaciones)
NOMBRE_ALQUILER = re.compile(
    r'\b(apartment|apartments|apartamento|apartamentos|apartamenty|apartament|apartman|apartmani|apartmany|'
    r'apartmanok|appartement|appartements|appartamento|appartamenti|studio|studios|flat|flats|'
    r'ferienwohnung|ferienwohnungen|fewo|ferienhaus|ferienhauser|holiday home|holiday house|holiday homes|'
    r'holiday let|vacation rental|casa vacanze|casa vacanza|sommerhus|feriehus|feriebolig|fritidshus|'
    r'hytte|hytta|hytter|stuga|stugor|mokki|mokit|chalupa|chalupy|chata|chaty|domek|domki|pokoje|'
    r'noclegi|kwatery|rooms|room|zimmer|privatzimmer|camere|habitaciones|airbnb)\b')
# Si el nombre dice que es un establecimiento con personal, se queda aunque matchee lo de arriba
NOMBRE_ESTABLECIMIENTO = re.compile(
    r'\b(hotel|hotell|hotelli|hôtel|hotels|aparthotel|resort|hostel|lodge|inn|motel|spa|gasthof|'
    r'gasthaus|pension|pensjonat|penzion|albergo|turisthotell|fjellstue|gjestgiveri|kro|wardshus|'
    r'lagenhetshotell|best western|scandic|radisson|thon|clarion|comfort|quality|sokos|holiday club)\b')


def norm(s):
    s = unicodedata.normalize('NFD', (s or '').strip().lower())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')


def dominio(url):
    m = re.match(r'(?:https?://)?(?:www\.)?([^/:?#]+)', (url or '').strip().lower())
    return m.group(1) if m else ''


def no_sirve(r, email, nombre_norm):
    # Alquileres particulares / fichas de plataformas: no tienen personal de housekeeping
    if EMAIL_NO_SIRVE.search(email):
        return True
    # Si el nombre dice que es hotel/resort/lodge, se queda aunque su web sea una ficha de plataforma
    if NOMBRE_ESTABLECIMIENTO.search(nombre_norm):
        return False
    webs = [dominio(w) for w in r['websites'] or [] if w]
    if webs and all(WEB_NO_SIRVE.search(w) for w in webs):
        return True
    return bool(NOMBRE_ALQUILER.search(nombre_norm))


def nombres_paises():
    # Código ISO -> nombre en inglés, desde src/data/countries.js
    src = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'data', 'countries.js')
    texto = open(src, encoding='utf8').read()
    return dict(re.findall(r"code: '([A-Z]{2})', name: '([^']+)'", texto))


def main():
    entrada, paises, existente, salida = sys.argv[1], set(sys.argv[2].split(',')), sys.argv[3], sys.argv[4]
    nombres = nombres_paises()

    local = json.load(open(existente, encoding='utf8'))
    ya_email = {e['email'].strip().lower() for e in local}
    ya_nombre = {norm(e['nombre']) for e in local}

    cont = dict.fromkeys(['total', 'otro_pais', 'cerrado', 'confianza', 'sin_email_o_nombre',
                          'personal', 'no_sirve', 'ya_local', 'duplicado'], 0)
    res, vistos_e, vistos_n = [], set(), set()
    filas = pq.read_table(entrada).to_pylist()
    filas.sort(key=lambda r: -(r['confidence'] or 0))  # ante duplicados queda el de mayor confianza

    for r in filas:
        cont['total'] += 1
        ad = (r['addresses'] or [{}])[0] or {}
        cc = (ad.get('country') or '').upper()
        if cc not in paises:
            cont['otro_pais'] += 1; continue
        if r['operating_status'] and r['operating_status'] != 'open':
            cont['cerrado'] += 1; continue
        if (r['confidence'] or 0) < CONFIANZA_MIN:
            cont['confianza'] += 1; continue
        email = None
        for e in r['emails'] or []:
            e = (e or '').strip().lower().removeprefix('mailto:')
            if EMAIL.match(e):
                email = e; break
        nombre = ((r['names'] or {}).get('primary') or '').strip()
        if not email or not nombre:
            cont['sin_email_o_nombre'] += 1; continue
        if email.split('@')[1] in PERSONALES:
            cont['personal'] += 1; continue
        nn = norm(nombre)
        if no_sirve(r, email, nn):
            cont['no_sirve'] += 1; continue
        if email in ya_email or nn in ya_nombre:
            cont['ya_local'] += 1; continue
        if email in vistos_e or nn in vistos_n:
            cont['duplicado'] += 1; continue
        vistos_e.add(email); vistos_n.add(nn)

        pais = nombres.get(cc, cc)
        # Ciudad; si Overture no la trae, la región
        lugar = (ad.get('locality') or ad.get('region') or '').strip()
        res.append({'nombre': nombre, 'email': email, 'ubicacion': f'{lugar}, {pais}' if lugar else pais,
                    'pais': pais, 'fuente': 'overture'})

    res.sort(key=lambda e: (e['pais'], e['ubicacion'], e['nombre']))
    json.dump(res, open(salida, 'w', encoding='utf8'), ensure_ascii=False, indent=2)
    por_pais = {}
    for e in res:
        por_pais[e['pais']] = por_pais.get(e['pais'], 0) + 1
    print(json.dumps(cont))
    print(f'{len(res)} empresas -> {salida}')
    print(json.dumps(por_pais, ensure_ascii=False))


if __name__ == '__main__':
    main()

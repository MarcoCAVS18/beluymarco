"""
build_city_coords.py — arma src/data/cityCoords.json, la tabla que usa el mapa para
ubicar cada empresa a partir de su campo `location` (+ país).

Fuente: Overture Maps, tema divisions (localidades, condados y regiones). Primero bajar:
  python fetch_divisions.py divisions.parquet

Entrada de ubicaciones: uno o más JSON con una lista de pares [location, codigoPais].
Solo se guardan las ubicaciones pedidas, para que el archivo quede chico.

Formato de salida:
  { "c": { "<token>|<CC>": [lat, lng] },   # ciudades/regiones encontradas
    "m": { "<token>": [lat, lng] },        # tabla manual (regiones de vino, etc.)
    "d": { "<CC>": [lat, lng] } }          # centro aproximado de cada país

La tokenización tiene que ser IGUAL a la de src/utils/geo.js (locationTokens y tokenVariants / prefijos).

Uso:
  python build_city_coords.py <divisions.parquet> manual_coords.json <salida.json> <pares1.json> [pares2.json ...]
"""
import json
import re
import statistics
import sys
import unicodedata

import pyarrow.parquet as pq

RANGO_SUBTIPO = {'locality': 0, 'localadmin': 1, 'county': 2, 'macrocounty': 3, 'region': 4, 'macroregion': 5}


def norm(s):
    s = unicodedata.normalize('NFD', (s or '').strip().lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', s)


def tokens(location):
    # "Hainfeld (Palatinado, Alemania)" -> ["hainfeld", "palatinado", "alemania"]
    partes = re.split(r'[,()/;]| - ', location or '')
    return [t for t in (norm(p) for p in partes) if len(t) > 1]


def prefijos(token):
    # "lech am arlberg" -> ["lech am arlberg", "lech am", "lech"]: si el nombre completo
    # no está, se prueba con las primeras palabras (igual que src/utils/geo.js)
    palabras = token.split(' ')
    return [' '.join(palabras[:n]) for n in range(len(palabras), 0, -1) if len(' '.join(palabras[:n])) > 2]


def main():
    div_path, manual_path, salida = sys.argv[1], sys.argv[2], sys.argv[3]
    pares = []
    for p in sys.argv[4:]:
        pares += json.load(open(p, encoding='utf8'))

    buscados = set()
    for loc, cc in pares:
        for t in tokens(loc):
            for v in prefijos(t):
                buscados.add(f'{v}|{(cc or "").upper()}')
    nombres_buscados = {k.split('|')[0] for k in buscados}

    # Mejor candidato por clave: más población, y ante empate el subtipo más chico
    mejor = {}
    tabla = pq.read_table(div_path, columns=['names', 'country', 'subtype', 'population', 'bbox'])
    for r in tabla.to_pylist():
        cc = (r['country'] or '').upper()
        nombres = r['names'] or {}
        variantes = {norm(nombres.get('primary'))}
        for _, v in (nombres.get('common') or []):
            variantes.add(norm(v))
        variantes &= nombres_buscados
        if not variantes:
            continue
        b = r['bbox']
        punto = [round((b['ymin'] + b['ymax']) / 2, 3), round((b['xmin'] + b['xmax']) / 2, 3)]
        puntaje = (-(r['population'] or 0), RANGO_SUBTIPO.get(r['subtype'], 9))
        for v in variantes:
            k = f'{v}|{cc}'
            if k in buscados and (k not in mejor or puntaje < mejor[k][0]):
                mejor[k] = (puntaje, punto)

    ciudades = {k: v[1] for k, v in sorted(mejor.items())}
    manual = json.load(open(manual_path, encoding='utf8'))

    # Centro de cada país: el de la tabla manual si existe, si no la mediana de sus ciudades
    por_pais = {}
    for k, (lat, lng) in ciudades.items():
        por_pais.setdefault(k.split('|')[1], []).append((lat, lng))
    defaults = dict(manual.get('d', {}))
    for cc, pts in por_pais.items():
        if cc not in defaults:
            defaults[cc] = [round(statistics.median(p[0] for p in pts), 3), round(statistics.median(p[1] for p in pts), 3)]

    out = {'c': ciudades, 'm': manual.get('m', {}), 'd': dict(sorted(defaults.items()))}
    json.dump(out, open(salida, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    print(f'{len(buscados)} buscadas, {len(ciudades)} encontradas, {len(out["m"])} manuales, {len(defaults)} países -> {salida}')


if __name__ == '__main__':
    main()

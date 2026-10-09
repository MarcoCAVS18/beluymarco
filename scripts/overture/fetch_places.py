"""
fetch_places.py — baja hoteles con email de Overture Maps (Places) dentro de un bbox
y los guarda en un parquet local. No toca Firestore.

Requiere pyarrow (pip install pyarrow). Lee el bucket público de S3 en forma anónima;
si hay HTTPS_PROXY lo usa (con el CA bundle de CCR_CA_BUNDLE, si está definido).

Uso:
  python fetch_places.py <xmin,ymin,xmax,ymax> <salida.parquet> [release]
  python fetch_places.py 4,54,32,72 nordicos.parquet           # nórdicos
  python fetch_places.py -25,34,45,72 europa.parquet           # Europa

Releases disponibles:
  https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com/?prefix=release/&delimiter=/
"""
import os
import sys
import time

import pyarrow as pa
import pyarrow.compute as pc
import pyarrow.dataset as ds
import pyarrow.fs as pafs
import pyarrow.parquet as pq

RELEASE_DEFAULT = '2026-09-23.1'
COLS = ['id', 'names', 'emails', 'websites', 'addresses', 'confidence', 'operating_status']


def main():
    xmin, ymin, xmax, ymax = map(float, sys.argv[1].split(','))
    out = sys.argv[2]
    release = sys.argv[3] if len(sys.argv) > 3 else RELEASE_DEFAULT

    opts = dict(anonymous=True, region='us-west-2', force_virtual_addressing=True)
    proxy = os.environ.get('HTTPS_PROXY')
    if proxy:
        opts['proxy_options'] = proxy
    ca = os.environ.get('CCR_CA_BUNDLE') or ('/root/.ccr/ca-bundle.crt' if os.path.exists('/root/.ccr/ca-bundle.crt') else None)
    if ca:
        opts['tls_ca_file_path'] = ca
    fs = pafs.S3FileSystem(**opts)

    base = f'overturemaps-us-west-2/release/{release}/theme=places/type=place/'
    dataset = ds.dataset(base, filesystem=fs, format='parquet')
    filtro = ((pc.field('bbox', 'xmin') >= xmin) & (pc.field('bbox', 'xmax') <= xmax) &
              (pc.field('bbox', 'ymin') >= ymin) & (pc.field('bbox', 'ymax') <= ymax) &
              (pc.field('basic_category') == 'hotel') & pc.field('emails').is_valid())

    # Archivo por archivo con reintentos: S3 (sobre todo vía proxy) a veces da 404 transitorios
    partes = []
    for frag in dataset.get_fragments():
        for intento in range(8):
            try:
                partes.append(frag.to_table(columns=COLS, filter=filtro, use_threads=False))
                break
            except OSError:
                time.sleep(min(2 ** intento, 20))
        else:
            raise SystemExit(f'No se pudo leer {frag.path}')

    tabla = pa.concat_tables(partes)
    pq.write_table(tabla, out)
    print(f'{tabla.num_rows} hoteles con email -> {out}')


if __name__ == '__main__':
    main()

"""
fetch_divisions.py — baja localidades, condados y regiones de Overture Maps (tema
divisions) a un parquet local. Lo usa build_city_coords.py. Requiere pyarrow.

Uso: python fetch_divisions.py <salida.parquet> [release]
"""
import os, sys, time
import pyarrow.fs as pafs, pyarrow.dataset as ds, pyarrow.compute as pc, pyarrow.parquet as pq, pyarrow as pa
release = sys.argv[2] if len(sys.argv) > 2 else '2026-09-23.1'
opts = dict(anonymous=True, region='us-west-2', force_virtual_addressing=True)
if os.environ.get('HTTPS_PROXY'):
    opts['proxy_options'] = os.environ['HTTPS_PROXY']
if os.path.exists('/root/.ccr/ca-bundle.crt'):
    opts['tls_ca_file_path'] = '/root/.ccr/ca-bundle.crt'
fs = pafs.S3FileSystem(**opts)
d = ds.dataset(f'overturemaps-us-west-2/release/{release}/theme=divisions/type=division/', filesystem=fs, format='parquet')
f = pc.field('subtype').isin(['locality', 'localadmin', 'county', 'region', 'macroregion', 'macrocounty'])
partes = []
for frag in d.get_fragments():
    for i in range(8):
        try:
            partes.append(frag.to_table(columns=['names', 'country', 'subtype', 'population', 'bbox'], filter=f, use_threads=False)); break
        except OSError:
            time.sleep(min(2 ** i, 20))
    else:
        raise SystemExit('fallo ' + frag.path)
t = pa.concat_tables(partes)
pq.write_table(t, sys.argv[1])
print('filas', t.num_rows)

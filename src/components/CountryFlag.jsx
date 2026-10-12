// Banderas como archivos SVG sueltos (el navegador baja solo las que se ven y las cachea).
// Antes se importaban todas como componentes React y sumaban cientos de KB al bundle.
const FLAG_URLS = import.meta.glob('/node_modules/country-flag-icons/3x2/*.svg', {
  query: '?url&no-inline',
  import: 'default',
  eager: true,
});

const urlFor = (code) => FLAG_URLS[`/node_modules/country-flag-icons/3x2/${code}.svg`];

const SIZES = {
  sm: { width: 16, height: 11 },
  md: { width: 24, height: 16 },
  lg: { width: 32, height: 21 },
};

const CountryFlag = ({ code, size = 'md', className = '' }) => {
  const { width, height } = SIZES[size] || SIZES.md;
  const url = code ? urlFor(code.toUpperCase()) : null;

  if (!url) {
    // Sin bandera: se muestra el código
    return (
      <span
        className={`inline-flex items-center justify-center bg-surface text-muted font-mono rounded ${className}`}
        style={{ width, height, fontSize: size === 'sm' ? '8px' : '10px' }}
      >
        {code || '??'}
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={code}
      title={code}
      width={width}
      height={height}
      loading="lazy"
      className={`inline-block rounded-[3px] shadow-[0_0_0_1px_rgb(0_0_0/0.06)] ${className}`}
      style={{ width, height }}
    />
  );
};

export default CountryFlag;

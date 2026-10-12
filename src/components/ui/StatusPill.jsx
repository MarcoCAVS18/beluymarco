import { statusMeta } from '../../data/sectors';

const StatusPill = ({ status, className = '' }) => {
  const meta = statusMeta(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${meta.pill} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
};

export default StatusPill;

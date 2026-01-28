import React from 'react';
import * as Flags from 'country-flag-icons/react/3x2';

const SIZES = {
  sm: { width: 16, height: 11 },
  md: { width: 24, height: 16 },
  lg: { width: 32, height: 21 },
};

const CountryFlag = ({ code, size = 'md', className = '' }) => {
  const { width, height } = SIZES[size] || SIZES.md;

  // Get the flag component for the country code
  const FlagComponent = Flags[code];

  if (!FlagComponent) {
    // Fallback: show country code if flag doesn't exist
    return (
      <span
        className={`inline-flex items-center justify-center bg-dark-surface text-dark-subtext text-xs font-mono rounded ${className}`}
        style={{ width, height, fontSize: size === 'sm' ? '8px' : '10px' }}
      >
        {code || '??'}
      </span>
    );
  }

  return (
    <FlagComponent
      title={code}
      className={`inline-block rounded-sm ${className}`}
      style={{ width, height }}
    />
  );
};

export default CountryFlag;

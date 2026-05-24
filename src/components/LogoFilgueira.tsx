import React from 'react';

interface LogoFilgueiraProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Proporção espelha a marca d'água: "Imobiliária" ≈ 1/3 de "Filgueira"
const sizes = {
  sm: { main: '22px', sub: '8px', gap: '-2px' },
  md: { main: '32px', sub: '11px', gap: '-3px' },
  lg: { main: '46px', sub: '15px', gap: '-4px' },
};

// Paleta oficial dos contratos Filgueira (dourado/sépia)
const GOLD_GRADIENT = 'linear-gradient(180deg, #EAD9AC 0%, #C5A45E 55%, #9C7E4E 100%)';

const LogoFilgueira: React.FC<LogoFilgueiraProps> = ({ className, size = 'md' }) => {
  const s = sizes[size];
  return (
    <div className={`flex flex-col items-center justify-center select-none ${className || ''}`}>
      {/* "Filgueira" — mesma fonte sans bold da marca d'água, em dourado */}
      <span
        style={{
          display: 'inline-block',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Roboto", "Helvetica Neue", sans-serif',
          fontSize: s.main,
          fontWeight: 900,
          letterSpacing: '-0.5px',
          lineHeight: 1.15,
          paddingBottom: '0.04em',
          backgroundImage: GOLD_GRADIENT,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
        }}
      >
        Filgueira
      </span>
      {/* "Imobiliária" — mesma serif da marca d'água, em dourado */}
      <span
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: s.sub,
          fontWeight: 700,
          letterSpacing: '0.5px',
          marginTop: s.gap,
          color: '#C5A45E',
        }}
      >
        Imobiliária
      </span>
    </div>
  );
};

export default LogoFilgueira;

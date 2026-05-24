import React from 'react';

interface LogoFilgueiraProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { main: '20px', sub: '7.5px', gap: '2px', track: '3.2px' },
  md: { main: '30px', sub: '10px', gap: '3px', track: '4.5px' },
  lg: { main: '44px', sub: '13px', gap: '4px', track: '6px' },
};

// Paleta oficial dos contratos Filgueira (dourado/sépia), tratada em gradiente sutil
const GOLD_GRADIENT = 'linear-gradient(180deg, #EAD9AC 0%, #C5A45E 55%, #9C7E4E 100%)';

const LogoFilgueira: React.FC<LogoFilgueiraProps> = ({ className, size = 'md' }) => {
  const s = sizes[size];
  return (
    <div className={`flex flex-col items-center justify-center select-none ${className || ''}`}>
      <span
        className="leading-none"
        style={{
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: s.main,
          fontWeight: 600,
          letterSpacing: '-0.045em',
          lineHeight: 1,
          backgroundImage: GOLD_GRADIENT,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
        }}
      >
        Filgueira
      </span>
      <span
        style={{
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: s.sub,
          fontWeight: 500,
          letterSpacing: s.track,
          marginTop: s.gap,
          textTransform: 'uppercase',
          color: '#9C8C6E',
        }}
      >
        Imobiliária
      </span>
    </div>
  );
};

export default LogoFilgueira;

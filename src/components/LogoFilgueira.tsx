import React from 'react';

interface LogoFilgueiraProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { main: '19px', sub: '7px', gap: '1px', track: '2.4px' },
  md: { main: '28px', sub: '10px', gap: '2px', track: '3.4px' },
  lg: { main: '42px', sub: '14px', gap: '3px', track: '5px' },
};

// Paleta oficial dos contratos Filgueira (dourado/sépia)
const GOLD_GRADIENT = 'linear-gradient(180deg, #E4D3A6 0%, #B8A97A 52%, #8B7355 100%)';

const LogoFilgueira: React.FC<LogoFilgueiraProps> = ({ className, size = 'md' }) => {
  const s = sizes[size];
  return (
    <div className={`flex flex-col items-center justify-center select-none ${className || ''}`}>
      <span
        className="leading-none"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Roboto", "Helvetica Neue", sans-serif',
          fontSize: s.main,
          fontWeight: 900,
          letterSpacing: '-1.5px',
          lineHeight: 0.9,
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
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: s.sub,
          fontWeight: 600,
          letterSpacing: s.track,
          marginTop: s.gap,
          textTransform: 'uppercase',
          color: '#A89F8C',
        }}
      >
        Imobiliária
      </span>
    </div>
  );
};

export default LogoFilgueira;

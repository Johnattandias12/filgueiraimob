import React from 'react';

interface LogoFilgueiraProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { main: '18px', sub: '7px', gap: '0px' },
  md: { main: '28px', sub: '10px', gap: '1px' },
  lg: { main: '42px', sub: '14px', gap: '2px' },
};

const LogoFilgueira: React.FC<LogoFilgueiraProps> = ({ className, size = 'md' }) => {
  const s = sizes[size];
  return (
    <div className={`flex flex-col items-center justify-center select-none ${className || ''}`}>
      <span
        className="text-foreground leading-none"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Roboto", "Helvetica Neue", sans-serif',
          fontSize: s.main,
          fontWeight: 900,
          letterSpacing: '-1.5px',
          lineHeight: 0.9,
        }}
      >
        Filgueira
      </span>
      <span
        className="text-foreground/70"
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: s.sub,
          fontWeight: 700,
          letterSpacing: '0.5px',
          marginTop: s.gap,
        }}
      >
        Imobiliária
      </span>
    </div>
  );
};

export default LogoFilgueira;

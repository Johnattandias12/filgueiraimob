import React from 'react';

const LogoFilgueira: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex flex-col items-center justify-center select-none ${className || ''}`}>
    <span
      className="text-foreground leading-none"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Roboto", "Helvetica Neue", sans-serif',
        fontSize: '28px',
        fontWeight: 900,
        letterSpacing: '-1px',
        lineHeight: 0.95,
      }}
    >
      Filgueira
    </span>
    <span
      className="text-foreground"
      style={{
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '10px',
        fontWeight: 700,
        letterSpacing: '0.5px',
        marginTop: '1px',
      }}
    >
      Imobiliária
    </span>
  </div>
);

export default LogoFilgueira;

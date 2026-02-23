import React from 'react';

const LogoFilgueira: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`flex items-center gap-2.5 select-none ${className || ''}`}>
    <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
      <span
        className="text-primary font-black text-lg leading-none"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}
      >
        F
      </span>
    </div>
    <div className="flex flex-col">
      <span
        className="text-foreground leading-none tracking-tight"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", "Roboto", "Helvetica Neue", sans-serif',
          fontSize: '20px',
          fontWeight: 800,
          letterSpacing: '-0.5px',
        }}
      >
        Filgueira
      </span>
      <span
        className="text-muted-foreground"
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          marginTop: '1px',
        }}
      >
        Imobiliária
      </span>
    </div>
  </div>
);

export default LogoFilgueira;

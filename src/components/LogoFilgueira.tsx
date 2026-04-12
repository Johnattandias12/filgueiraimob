import React from 'react';

interface LogoFilgueiraProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { icon: 28, main: 15, sub: 8,  gap: 6  },
  md: { icon: 40, main: 20, sub: 10, gap: 8  },
  lg: { icon: 56, main: 28, sub: 13, gap: 10 },
};

// Ícone geométrico "F" — estilo moderno, inspirado em fontes como Roboto/Futura
const FIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Fundo quadrado com cantos arredondados */}
    <rect width="36" height="36" rx="8" fill="currentColor" className="text-primary" />
    {/* Barra vertical do F */}
    <rect x="10" y="9" width="3.5" height="18" rx="1" fill="white" />
    {/* Barra superior do F */}
    <rect x="10" y="9" width="16" height="3.5" rx="1" fill="white" />
    {/* Barra do meio do F */}
    <rect x="10" y="16.2" width="12" height="3" rx="1" fill="white" />
  </svg>
);

const LogoFilgueira: React.FC<LogoFilgueiraProps> = ({ className, size = 'md' }) => {
  const s = sizes[size];
  return (
    <div className={`flex items-center gap-2 select-none ${className || ''}`}>
      <FIcon size={s.icon} />
      <div className="flex flex-col leading-none" style={{ gap: s.gap * 0.12 }}>
        <span
          style={{
            fontFamily: '"Roboto", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: s.main,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: 'var(--foreground)',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}
        >
          Filgueira
        </span>
        <span
          style={{
            fontFamily: '"Roboto", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
            fontSize: s.sub,
            fontWeight: 400,
            letterSpacing: '0.22em',
            color: 'var(--muted-foreground)',
            textTransform: 'uppercase',
            lineHeight: 1,
            marginTop: 3,
          }}
        >
          Imobiliária
        </span>
      </div>
    </div>
  );
};

export default LogoFilgueira;

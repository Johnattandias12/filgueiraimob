import React, { useRef, useState, useCallback } from 'react';

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
}

const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({ beforeSrc, afterSrc }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    updatePosition(e.clientX);
    containerRef.current?.setPointerCapture(e.pointerId);
  }, [updatePosition]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (isDragging) updatePosition(e.clientX);
  }, [isDragging, updatePosition]);

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden cursor-col-resize select-none touch-none bg-card"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* After (full background) */}
      <img src={afterSrc} alt="Editada" className="absolute inset-0 w-full h-full object-contain" draggable={false} />

      {/* Before (clipped via clip-path for pixel-perfect alignment) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={beforeSrc}
          alt="Original"
          className="absolute inset-0 w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-foreground/80 z-10 pointer-events-none"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-foreground/90 flex items-center justify-center shadow-lg">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-background">
            <path d="M7 4L3 10L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 4L17 10L13 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-2 left-2 glass-panel-sm px-2 py-0.5 text-[10px] font-medium text-foreground z-20 pointer-events-none">
        Original
      </span>
      <span className="absolute top-2 right-2 glass-panel-sm px-2 py-0.5 text-[10px] font-medium text-primary z-20 pointer-events-none">
        Editada
      </span>
    </div>
  );
};

export default BeforeAfterSlider;

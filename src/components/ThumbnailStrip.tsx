import React from 'react';
import { X } from 'lucide-react';

interface ImageThumbnail {
  id: string;
  src: string;
  name: string;
  processed?: boolean;
}

interface ThumbnailStripProps {
  images: ImageThumbnail[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

const ThumbnailStrip: React.FC<ThumbnailStripProps> = ({ images, selectedId, onSelect, onRemove }) => {
  if (images.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto py-1 px-0.5 scrollbar-none scroll-smooth touch-pan-x">
      {images.map((img) => (
        <div
          key={img.id}
          onClick={() => onSelect(img.id)}
          className={`
            relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden cursor-pointer
            transition-all duration-200 group touch-manipulation
            ${selectedId === img.id
              ? 'ring-2 ring-primary ring-offset-1 ring-offset-background scale-105'
              : 'opacity-60 hover:opacity-100 active:scale-95'
            }
          `}
        >
          <img src={img.src} alt={img.name} className="w-full h-full object-cover" draggable={false} />
          {img.processed && (
            <div className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-primary border border-background" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(img.id); }}
            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-background/80 backdrop-blur-sm
              flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
          >
            <X size={10} className="text-foreground" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ThumbnailStrip;

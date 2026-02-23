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
    <div className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-none">
      {images.map((img) => (
        <div
          key={img.id}
          onClick={() => onSelect(img.id)}
          className={`
            relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden cursor-pointer
            transition-all duration-200 group
            ${selectedId === img.id
              ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105'
              : 'opacity-70 hover:opacity-100'
            }
          `}
        >
          <img src={img.src} alt={img.name} className="w-full h-full object-cover" />
          {img.processed && (
            <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-primary" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(img.id); }}
            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-background/80 
              flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={10} className="text-foreground" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ThumbnailStrip;

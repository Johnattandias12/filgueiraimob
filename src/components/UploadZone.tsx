import React, { useCallback, useRef, useState } from 'react';
import { Upload, ImagePlus } from 'lucide-react';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onFilesSelected, maxFiles = 15 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, maxFiles);
    if (files.length > 0) onFilesSelected(files);
  }, [onFilesSelected, maxFiles]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center gap-4 p-8 md:p-12
        rounded-2xl border-2 border-dashed cursor-pointer
        transition-all duration-300 min-h-[200px]
        ${isDragging
          ? 'border-primary bg-primary/5 glow-ring scale-[1.01]'
          : 'border-border hover:border-muted-foreground hover:bg-secondary/30'
        }
      `}
    >
      <div className={`
        w-16 h-16 rounded-2xl flex items-center justify-center
        transition-all duration-300
        ${isDragging ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}
      `}>
        {isDragging ? <ImagePlus size={32} /> : <Upload size={32} />}
      </div>

      <div className="text-center">
        <p className="text-foreground font-medium text-lg">
          {isDragging ? 'Solte as fotos aqui' : 'Arraste fotos ou toque para selecionar'}
        </p>
        <p className="text-muted-foreground text-sm mt-1">
          Até {maxFiles} imagens • JPG, PNG, WebP
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
};

export default UploadZone;

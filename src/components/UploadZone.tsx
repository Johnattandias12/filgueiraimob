import React, { useCallback, useRef, useState } from 'react';
import { Upload, ImagePlus } from 'lucide-react';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onFilesSelected, maxFiles = 40 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, maxFiles);
    if (files.length > 0) onFilesSelected(files);
  }, [onFilesSelected, maxFiles]);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`
        relative flex flex-col items-center justify-center gap-3 p-6
        rounded-2xl border-2 border-dashed cursor-pointer
        transition-all duration-300 min-h-[180px]
        ${isDragging
          ? 'border-primary bg-primary/5 glow-ring scale-[1.02]'
          : 'border-border hover:border-muted-foreground hover:bg-secondary/30'
        }
      `}
    >
      <div className={`
        w-14 h-14 rounded-2xl flex items-center justify-center
        transition-all duration-300
        ${isDragging ? 'bg-primary/20 text-primary scale-110' : 'bg-secondary text-muted-foreground'}
      `}>
        {isDragging ? <ImagePlus size={28} /> : <Upload size={28} />}
      </div>

      <div className="text-center">
        <p className="text-foreground font-medium text-base">
          {isDragging ? 'Solte as fotos aqui' : 'Arraste ou toque para selecionar'}
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          Até {maxFiles} imagens • JPG, PNG, WebP
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); if (e.target) e.target.value = ''; }}
      />
    </div>
  );
};

export default UploadZone;

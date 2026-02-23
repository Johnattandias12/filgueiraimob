import React from 'react';
import { Slider } from '@/components/ui/slider';
import { WatermarkSettings } from '@/lib/imageEngine';
import {
  ArrowUpLeft, ArrowUpRight, ArrowDownLeft, ArrowDownRight,
  Crosshair, Eye, Maximize2
} from 'lucide-react';

interface WatermarkControlsProps {
  settings: WatermarkSettings;
  onChange: (settings: WatermarkSettings) => void;
}

const positions: { value: WatermarkSettings['position']; icon: React.ReactNode; label: string }[] = [
  { value: 'top-left', icon: <ArrowUpLeft size={16} />, label: 'Sup. Esq.' },
  { value: 'top-right', icon: <ArrowUpRight size={16} />, label: 'Sup. Dir.' },
  { value: 'center', icon: <Crosshair size={16} />, label: 'Centro' },
  { value: 'bottom-left', icon: <ArrowDownLeft size={16} />, label: 'Inf. Esq.' },
  { value: 'bottom-right', icon: <ArrowDownRight size={16} />, label: 'Inf. Dir.' },
];

const WatermarkControls: React.FC<WatermarkControlsProps> = ({ settings, onChange }) => {
  const update = (partial: Partial<WatermarkSettings>) =>
    onChange({ ...settings, ...partial });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Marca d'água</h3>
        <button
          onClick={() => update({ enabled: !settings.enabled })}
          className={`
            w-11 h-6 rounded-full relative transition-colors duration-200
            ${settings.enabled ? 'bg-primary' : 'bg-muted'}
          `}
        >
          <span className={`
            absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition-transform duration-200
            ${settings.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'}
          `} />
        </button>
      </div>

      {settings.enabled && (
        <>
          {/* Position grid */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Posição</label>
            <div className="grid grid-cols-5 gap-1.5">
              {positions.map(p => (
                <button
                  key={p.value}
                  onClick={() => update({ position: p.value })}
                  className={`
                    flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition-all
                    ${settings.position === p.value
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'bg-secondary text-muted-foreground hover:bg-surface-hover'
                    }
                  `}
                >
                  {p.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Size slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Maximize2 size={12} /> Tamanho
              </label>
              <span className="text-xs text-foreground font-medium">{settings.size}%</span>
            </div>
            <Slider
              value={[settings.size]}
              onValueChange={([v]) => update({ size: v })}
              min={5}
              max={50}
              step={1}
              className="w-full"
            />
          </div>

          {/* Opacity slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Eye size={12} /> Opacidade
              </label>
              <span className="text-xs text-foreground font-medium">{settings.opacity}%</span>
            </div>
            <Slider
              value={[settings.opacity]}
              onValueChange={([v]) => update({ opacity: v })}
              min={10}
              max={100}
              step={1}
              className="w-full"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default WatermarkControls;

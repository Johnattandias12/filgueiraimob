import React from 'react';
import { Slider } from '@/components/ui/slider';
import { EnhanceSettings } from '@/lib/imageEngine';
import { Sun, Contrast, Palette, Thermometer } from 'lucide-react';

interface EnhanceControlsProps {
  settings: EnhanceSettings;
  onChange: (settings: EnhanceSettings) => void;
}

const controls = [
  { key: 'exposure' as const, label: 'Exposição', icon: Sun },
  { key: 'contrast' as const, label: 'Contraste', icon: Contrast },
  { key: 'saturation' as const, label: 'Saturação', icon: Palette },
  { key: 'warmth' as const, label: 'Temperatura', icon: Thermometer },
];

const EnhanceControls: React.FC<EnhanceControlsProps> = ({ settings, onChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-foreground">Ajustes</h3>
      {controls.map(({ key, label, icon: Icon }) => (
        <div key={key}>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Icon size={12} /> {label}
            </label>
            <span className="text-xs text-foreground font-medium tabular-nums w-8 text-right">
              {settings[key] > 0 ? '+' : ''}{settings[key]}
            </span>
          </div>
          <Slider
            value={[settings[key]]}
            onValueChange={([v]) => onChange({ ...settings, [key]: v })}
            min={-100}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
      ))}
    </div>
  );
};

export default EnhanceControls;

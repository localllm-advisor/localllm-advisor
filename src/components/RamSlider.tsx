'use client';

interface RamSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const RAM_OPTIONS = [8, 16, 32, 64, 128];

export default function RamSlider({ value, onChange }: RamSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">
          System RAM
        </label>
        <span className="text-sm font-semibold text-white">{value} GB</span>
      </div>
      <div className="flex gap-2">
        {RAM_OPTIONS.map((ram) => (
          <button
            key={ram}
            type="button"
            onClick={() => onChange(ram)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              value === ram
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'
            }`}
          >
            {ram}GB
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">
        RAM is used for model offloading when VRAM is insufficient
      </p>
    </div>
  );
}

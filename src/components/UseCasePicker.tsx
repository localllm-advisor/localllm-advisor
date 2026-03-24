'use client';

import { UseCase } from '@/lib/types';
import { useTheme } from '@/components/ThemeProvider';

interface UseCasePickerProps {
  selected: UseCase;
  onChange: (useCase: UseCase) => void;
}

const useCases: { value: UseCase; label: string; icon: string }[] = [
  { value: 'chat', label: 'Chat', icon: '💬' },
  { value: 'coding', label: 'Coding', icon: '💻' },
  { value: 'reasoning', label: 'Reasoning', icon: '🧠' },
  { value: 'creative', label: 'Creative', icon: '✨' },
  { value: 'vision', label: 'Vision', icon: '👁️' },
  { value: 'roleplay', label: 'Roleplay', icon: '🎭' },
  { value: 'embedding', label: 'Embedding', icon: '🔢' },
];

export default function UseCasePicker({
  selected,
  onChange,
}: UseCasePickerProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-3">
      <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        What will you use it for?
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {useCases.map(({ value, label, icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
              selected === value
                ? isDark
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/20'
                  : 'border-blue-500 bg-blue-50 text-blue-600 ring-2 ring-blue-400/30 shadow-md shadow-blue-400/20'
                : isDark
                  ? 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500 hover:bg-gray-750'
                  : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400 hover:bg-gray-100'
            }`}
          >
            <span className="text-2xl">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

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
    <div className="flex flex-wrap gap-2">
      {useCases.map(({ value, label, icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
            selected === value
              ? isDark
                ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-sm'
                : 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
              : isDark
                ? 'border-gray-700 bg-transparent text-gray-400 hover:border-gray-500 hover:text-gray-300'
                : 'border-gray-200 bg-transparent text-gray-600 hover:border-gray-400 hover:text-gray-800'
          }`}
        >
          <span className="text-base">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

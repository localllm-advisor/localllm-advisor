'use client';

import { UseCase } from '@/lib/types';

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
];

export default function UseCasePicker({
  selected,
  onChange,
}: UseCasePickerProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-300">
        What will you use it for?
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {useCases.map(({ value, label, icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
              selected === value
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500 hover:bg-gray-750'
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

import { ScoredModel } from '@/lib/types';
import ModelCard from './ModelCard';

interface ResultsListProps {
  results: ScoredModel[];
  gpuName: string | null;
  vramMb: number;
  useCase: string;
}

export default function ResultsList({
  results,
  gpuName,
  vramMb,
  useCase,
}: ResultsListProps) {
  const vramGb = Math.round(vramMb / 1024);
  const gpuLabel = gpuName || `${vramGb}GB VRAM`;

  if (results.length === 0) {
    return (
      <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-8 text-center">
        <p className="text-lg text-gray-300">
          No compatible models found.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Try lowering the context length or selecting a different use case.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-800/50 border border-gray-700 px-4 py-3">
        <p className="text-sm text-gray-300">
          Found{' '}
          <span className="font-semibold text-white">{results.length}</span>{' '}
          compatible models for{' '}
          <span className="font-semibold text-white">{gpuLabel}</span>
          {gpuName && (
            <span className="text-gray-400"> ({vramGb}GB VRAM)</span>
          )}{' '}
          —{' '}
          <span className="font-semibold text-blue-400 capitalize">
            {useCase}
          </span>
        </p>
      </div>
      <div className="space-y-3">
        {results.map((result, i) => (
          <ModelCard
            key={result.model.id}
            result={result}
            rank={i + 1}
          />
        ))}
      </div>
    </div>
  );
}

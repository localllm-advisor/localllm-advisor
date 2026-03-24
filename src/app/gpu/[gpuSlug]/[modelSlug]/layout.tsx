import type { Metadata } from 'next';

function fromSlug(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gpuSlug: string; modelSlug: string }>;
}): Promise<Metadata> {
  const { gpuSlug, modelSlug } = await params;
  const gpuName = fromSlug(gpuSlug);
  const modelName = fromSlug(modelSlug);

  const title = `Can ${gpuName} Run ${modelName}?`;
  const description = `Check if the ${gpuName} has enough VRAM to run ${modelName} locally. See quantization options, estimated speed, and VRAM usage.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/gpu/${gpuSlug}/${modelSlug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default function GpuModelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

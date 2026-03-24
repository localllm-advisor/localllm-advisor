// External links helper for GPU discussions

export function getRedditSearchUrl(gpuName: string): string {
  const query = encodeURIComponent(`${gpuName} local llm`);
  return `https://www.reddit.com/r/LocalLLaMA/search/?q=${query}&restrict_sr=1&sort=relevance`;
}

export function getRedditGpuUrl(gpuName: string): string {
  const query = encodeURIComponent(gpuName);
  return `https://www.reddit.com/r/LocalLLaMA/search/?q=${query}&restrict_sr=1&sort=top`;
}

export function getRedditBuyingAdviceUrl(): string {
  return 'https://www.reddit.com/r/LocalLLaMA/search/?q=buying%20advice%20OR%20which%20gpu&restrict_sr=1&sort=new';
}

export function getGitHubDiscussionsUrl(gpuName: string): string {
  const query = encodeURIComponent(`${gpuName} llm`);
  return `https://github.com/search?q=${query}&type=discussions`;
}

export function getOllamaGitHubUrl(gpuName: string): string {
  const query = encodeURIComponent(gpuName);
  return `https://github.com/ollama/ollama/issues?q=${query}`;
}

export function getLlamaCppGitHubUrl(gpuName: string): string {
  const query = encodeURIComponent(gpuName);
  return `https://github.com/ggerganov/llama.cpp/issues?q=${query}`;
}

// GPU-specific resources
export function getGpuResources(gpuName: string, vendor: string): Array<{ name: string; url: string; description: string }> {
  const resources = [
    {
      name: 'Reddit r/LocalLLaMA',
      url: getRedditSearchUrl(gpuName),
      description: 'Community discussions about this GPU for local LLMs',
    },
    {
      name: 'Reddit Top Posts',
      url: getRedditGpuUrl(gpuName),
      description: 'Top-rated posts mentioning this GPU',
    },
    {
      name: 'Ollama Issues',
      url: getOllamaGitHubUrl(gpuName),
      description: 'Ollama GitHub issues related to this GPU',
    },
    {
      name: 'llama.cpp Issues',
      url: getLlamaCppGitHubUrl(gpuName),
      description: 'llama.cpp GitHub issues related to this GPU',
    },
  ];

  // Add vendor-specific resources
  if (vendor === 'nvidia') {
    resources.push({
      name: 'NVIDIA Forums',
      url: `https://forums.developer.nvidia.com/search?q=${encodeURIComponent(gpuName)}`,
      description: 'Official NVIDIA developer forums',
    });
  } else if (vendor === 'amd') {
    resources.push({
      name: 'ROCm Issues',
      url: `https://github.com/ROCm/ROCm/issues?q=${encodeURIComponent(gpuName)}`,
      description: 'AMD ROCm GitHub issues',
    });
  }

  return resources;
}

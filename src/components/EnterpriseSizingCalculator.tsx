'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '@/components/ThemeProvider';
import EnterprisePaywall from '@/components/EnterprisePaywall';
import CollapsibleSection from '@/components/CollapsibleSection';
import { SIZING_TIERS, type PricingTier } from '@/lib/stripe';
import type { Model, GPU, FleetSizingInput } from '@/lib/types';
import { estimateModelSizeMb, estimateKvCacheMb } from '@/lib/vram';

// ── Types ───────────────────────────────────────────────
interface GpuFleetPlan {
  gpu: GPU;
  // Parallelism
  tpDegree: number; // tensor-parallelism GPUs to fit model
  tpOverhead: number; // 0-1 efficiency loss from TP communication
  hasNvLink: boolean;
  // Per-replica performance
  tokPerSecPerReplica: number;
  requestsPerSecPerReplica: number;
  concurrentPerReplica: number;
  // Fleet sizing
  replicasNeeded: number;
  redundancyReplicas: number;
  totalReplicas: number;
  totalGpus: number;
  nodesNeeded: number;
  maxGpusPerNode: number;
  // Costs
  gpuHardwareCost: number;
  serverOverheadCost: number; // chassis, networking, storage per node
  totalHardwareCost: number;
  totalPowerWatts: number;
  annualElectricityCost: number;
  annualMaintenanceCost: number;
  totalFirstYearCost: number;
  // Efficiency
  costPerConcurrentUser: number;
  costPerTokPerSec: number;
  // Scaling curve: what happens as you add replicas (1…totalReplicas+2)
  scalingCurve: { replicas: number; gpus: number; nodes: number; concurrent: number; cost: number }[];
  // Classification
  tier: 'budget' | 'recommended' | 'premium';
  isOptimal: boolean; // best cost/concurrent ratio
  notes: string[];
}

interface SizingResult {
  model: Model;
  quantLevel: string;
  vramPerInstance: number;
  modelSizeGb: number;
  peakConcurrent: number;
  gpuPlans: GpuFleetPlan[];
  optimalGpuIndex: number;
}

// ── Enterprise GPU database ─────────────────────────────
const ENTERPRISE_GPUS: (GPU & { hasNvLink?: boolean; nvlinkBandwidth?: number })[] = [
  // Consumer high-end (prosumer / workstation crossover)
  { name: 'NVIDIA RTX 4090', vendor: 'nvidia', aliases: [], vram_mb: 24576, bandwidth_gbps: 1008, memory_type: 'GDDR6X', architecture: 'Ada Lovelace', tdp_watts: 450, price_usd: 1799, cuda_cores: 16384, fp16_tflops: 165, pcie_gen: 4, pcie_lanes: 16 },
  { name: 'NVIDIA RTX 5090', vendor: 'nvidia', aliases: [], vram_mb: 32768, bandwidth_gbps: 1792, memory_type: 'GDDR7', architecture: 'Blackwell', tdp_watts: 575, price_usd: 3699, cuda_cores: 21760, fp16_tflops: 209, pcie_gen: 5, pcie_lanes: 16 },
  // NVIDIA inference / edge
  { name: 'NVIDIA L4 24GB', vendor: 'nvidia', aliases: [], vram_mb: 24576, bandwidth_gbps: 300, memory_type: 'GDDR6', architecture: 'Ada Lovelace', tdp_watts: 72, price_usd: 2500, cuda_cores: 7424, fp16_tflops: 120, tensor_cores: 232, pcie_gen: 4, pcie_lanes: 16 },
  { name: 'NVIDIA T4 16GB', vendor: 'nvidia', aliases: [], vram_mb: 16384, bandwidth_gbps: 320, memory_type: 'GDDR6', architecture: 'Turing', tdp_watts: 70, price_usd: 2500, cuda_cores: 2560, fp16_tflops: 65, tensor_cores: 320, pcie_gen: 3, pcie_lanes: 16 },
  // NVIDIA workstation
  { name: 'NVIDIA RTX A5000 24GB', vendor: 'nvidia', aliases: [], vram_mb: 24576, bandwidth_gbps: 768, memory_type: 'GDDR6', architecture: 'Ampere', tdp_watts: 230, price_usd: 2500, cuda_cores: 8192, fp16_tflops: 56, tensor_cores: 256, pcie_gen: 4, pcie_lanes: 16 },
  { name: 'NVIDIA RTX 6000 Ada 48GB', vendor: 'nvidia', aliases: [], vram_mb: 49152, bandwidth_gbps: 960, memory_type: 'GDDR6', architecture: 'Ada Lovelace', tdp_watts: 300, price_usd: 7000, cuda_cores: 18176, fp16_tflops: 183, tensor_cores: 568, pcie_gen: 4, pcie_lanes: 16 },
  // NVIDIA datacenter — Ampere
  { name: 'NVIDIA A30 24GB', vendor: 'nvidia', aliases: [], vram_mb: 24576, bandwidth_gbps: 933, memory_type: 'HBM2e', architecture: 'Ampere', tdp_watts: 165, price_usd: 4500, cuda_cores: 3584, fp16_tflops: 165, tensor_cores: 224, pcie_gen: 4, pcie_lanes: 16 },
  { name: 'NVIDIA A40 48GB', vendor: 'nvidia', aliases: [], vram_mb: 49152, bandwidth_gbps: 696, memory_type: 'GDDR6', architecture: 'Ampere', tdp_watts: 300, price_usd: 5000, cuda_cores: 10752, fp16_tflops: 75, tensor_cores: 336, pcie_gen: 4, pcie_lanes: 16 },
  { name: 'NVIDIA A100 80GB', vendor: 'nvidia', aliases: [], vram_mb: 81920, bandwidth_gbps: 2039, memory_type: 'HBM2e', architecture: 'Ampere', tdp_watts: 300, price_usd: 15000, cuda_cores: 6912, fp16_tflops: 78, tensor_cores: 432, pcie_gen: 4, pcie_lanes: 16, hasNvLink: true, nvlinkBandwidth: 600 },
  // NVIDIA datacenter — Ada Lovelace
  { name: 'NVIDIA L40S 48GB', vendor: 'nvidia', aliases: [], vram_mb: 49152, bandwidth_gbps: 864, memory_type: 'GDDR6', architecture: 'Ada Lovelace', tdp_watts: 350, price_usd: 8500, cuda_cores: 18176, fp16_tflops: 183, tensor_cores: 568, pcie_gen: 4, pcie_lanes: 16 },
  { name: 'NVIDIA L20 48GB', vendor: 'nvidia', aliases: [], vram_mb: 49152, bandwidth_gbps: 864, memory_type: 'GDDR6', architecture: 'Ada Lovelace', tdp_watts: 275, price_usd: 7000, cuda_cores: 14080, fp16_tflops: 120, tensor_cores: 440, pcie_gen: 4, pcie_lanes: 16 },
  // NVIDIA datacenter — Hopper
  { name: 'NVIDIA H100 80GB', vendor: 'nvidia', aliases: [], vram_mb: 81920, bandwidth_gbps: 3350, memory_type: 'HBM3', architecture: 'Hopper', tdp_watts: 350, price_usd: 30000, cuda_cores: 16896, fp16_tflops: 267, tensor_cores: 528, pcie_gen: 5, pcie_lanes: 16, hasNvLink: true, nvlinkBandwidth: 900 },
  { name: 'NVIDIA H100 NVL 94GB', vendor: 'nvidia', aliases: [], vram_mb: 96256, bandwidth_gbps: 3350, memory_type: 'HBM3', architecture: 'Hopper', tdp_watts: 400, price_usd: 35000, cuda_cores: 16896, fp16_tflops: 267, tensor_cores: 528, pcie_gen: 5, pcie_lanes: 16, hasNvLink: true, nvlinkBandwidth: 900 },
  { name: 'NVIDIA H200 141GB', vendor: 'nvidia', aliases: [], vram_mb: 143360, bandwidth_gbps: 4800, memory_type: 'HBM3e', architecture: 'Hopper', tdp_watts: 700, price_usd: 40000, cuda_cores: 16896, fp16_tflops: 267, tensor_cores: 528, pcie_gen: 5, pcie_lanes: 16, hasNvLink: true, nvlinkBandwidth: 900 },
  // NVIDIA datacenter — Blackwell
  { name: 'NVIDIA B100', vendor: 'nvidia', aliases: [], vram_mb: 196608, bandwidth_gbps: 8000, memory_type: 'HBM3e', architecture: 'Blackwell', tdp_watts: 700, price_usd: 30000, cuda_cores: 18432, fp16_tflops: 1750, tensor_cores: 576, pcie_gen: 5, pcie_lanes: 16, hasNvLink: true, nvlinkBandwidth: 1800 },
  { name: 'NVIDIA B200', vendor: 'nvidia', aliases: [], vram_mb: 196608, bandwidth_gbps: 19200, memory_type: 'HBM3e', architecture: 'Blackwell', tdp_watts: 1000, price_usd: 40000, cuda_cores: 21120, fp16_tflops: 2914, tensor_cores: 660, pcie_gen: 5, pcie_lanes: 16, hasNvLink: true, nvlinkBandwidth: 1800 },
  { name: 'NVIDIA GB200', vendor: 'nvidia', aliases: [], vram_mb: 393216, bandwidth_gbps: 38400, memory_type: 'HBM3e', architecture: 'Blackwell', tdp_watts: 2000, price_usd: 80000, cuda_cores: 42240, fp16_tflops: 5828, tensor_cores: 1320, pcie_gen: 5, pcie_lanes: 16, hasNvLink: true, nvlinkBandwidth: 1800 },
  // AMD datacenter
  { name: 'AMD MI210 64GB', vendor: 'amd', aliases: [], vram_mb: 65536, bandwidth_gbps: 1638, memory_type: 'HBM2e', architecture: 'CDNA2', tdp_watts: 300, price_usd: 8000, stream_processors: 6656, fp16_tflops: 181, pcie_gen: 4, pcie_lanes: 16, hasNvLink: false },
  { name: 'AMD MI250X 128GB', vendor: 'amd', aliases: [], vram_mb: 131072, bandwidth_gbps: 3277, memory_type: 'HBM2e', architecture: 'CDNA2', tdp_watts: 560, price_usd: 15000, stream_processors: 14080, fp16_tflops: 383, pcie_gen: 4, pcie_lanes: 16, hasNvLink: false },
  { name: 'AMD MI300X 192GB', vendor: 'amd', aliases: [], vram_mb: 196608, bandwidth_gbps: 5300, memory_type: 'HBM3', architecture: 'CDNA3', tdp_watts: 750, price_usd: 15000, stream_processors: 19456, fp16_tflops: 383, pcie_gen: 5, pcie_lanes: 16, hasNvLink: false },
  { name: 'AMD MI325X 256GB', vendor: 'amd', aliases: [], vram_mb: 262144, bandwidth_gbps: 6000, memory_type: 'HBM3e', architecture: 'CDNA3', tdp_watts: 750, price_usd: 25000, stream_processors: 19456, fp16_tflops: 1300, pcie_gen: 5, pcie_lanes: 16, hasNvLink: false },
  // Intel datacenter
  { name: 'Intel Gaudi 2 96GB', vendor: 'intel', aliases: [], vram_mb: 98304, bandwidth_gbps: 2460, memory_type: 'HBM2e', architecture: 'Gaudi 2', tdp_watts: 600, price_usd: 13000, fp16_tflops: 432, pcie_gen: 4, pcie_lanes: 16, hasNvLink: false },
  { name: 'Intel Gaudi 3 128GB', vendor: 'intel', aliases: [], vram_mb: 131072, bandwidth_gbps: 3700, memory_type: 'HBM2e', architecture: 'Gaudi 3', tdp_watts: 900, price_usd: 18000, fp16_tflops: 1835, pcie_gen: 5, pcie_lanes: 16, hasNvLink: false },
];

const ELECTRICITY_COST_KWH = 0.12;
const PUE = 1.3; // Power Usage Effectiveness (datacenter overhead)
const SERVER_OVERHEAD_PER_NODE = 3000; // chassis, networking, NVMe, etc.
const MAINTENANCE_RATE = 0.05; // 5% of hardware cost annually

export default function EnterpriseSizingCalculator() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);

  const [input, setInput] = useState<FleetSizingInput>({
    modelId: '',
    quantLevel: 'Q4_K_M',
    concurrentUsers: 50,
    targetLatencyMs: 200,
    avgPromptTokens: 500,
    avgResponseTokens: 300,
    peakMultiplier: 1.5,
    redundancy: true,
    contextLength: 4096,
  });

  const [showResults, setShowResults] = useState(false);
  const [activeTier, setActiveTier] = useState<PricingTier>('free');

  // Load models
  useEffect(() => {
    fetch('/data/models.json')
      .then(r => r.json())
      .then((data: Model[]) => {
        setModels(data);
        if (data.length > 0) {
          const defaultModel = data.find(m => m.id.includes('llama-3.1-70b')) || data[0];
          setInput(prev => ({ ...prev, modelId: defaultModel.id }));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const selectedModel = useMemo(() => models.find(m => m.id === input.modelId), [models, input.modelId]);
  const availableQuants = useMemo(() => selectedModel?.quantizations || [], [selectedModel]);

  // ── Core Algorithm ──────────────────────────────────────
  const calculateSizing = useCallback((): SizingResult | null => {
    if (!selectedModel) return null;

    const quant = selectedModel.quantizations.find(q => q.level === input.quantLevel);
    if (!quant) return null;

    // Model memory footprint
    const modelSizeMb = quant.vram_mb || estimateModelSizeMb(selectedModel.params_b, quant.bpw);
    const kvCacheMb = estimateKvCacheMb(selectedModel.params_b, input.contextLength);
    const vramPerInstance = Math.ceil((modelSizeMb + kvCacheMb) / 0.85); // 15% headroom
    const modelSizeGb = (selectedModel.params_b * quant.bpw) / 8;

    const peakConcurrent = Math.ceil(input.concurrentUsers * input.peakMultiplier);

    // Target: user's acceptable response time
    // If avg response is 300 tokens and target TTFT is 200ms, we budget total request
    // time = TTFT + decode time. For user-perceived quality: max ~10s total.
    const maxRequestTimeSec = Math.max(3, input.avgResponseTokens / 10); // ~10 tok/s minimum UX

    const gpuPlans: GpuFleetPlan[] = [];

    for (const gpu of ENTERPRISE_GPUS) {
      const gpuVramMb = gpu.vram_mb;
      const notes: string[] = [];

      // ── Step 1: Tensor Parallelism degree ─────────────
      // How many GPUs to fit one model instance?
      const tpDegree = Math.ceil(vramPerInstance / (gpuVramMb * 0.9));

      // TP communication overhead
      const hasNvLink = !!(gpu as { hasNvLink?: boolean }).hasNvLink;
      let tpOverhead = 0;
      if (tpDegree > 1) {
        // NVLink: ~5-10% overhead per TP split; PCIe: ~15-25%
        const overheadPerSplit = hasNvLink ? 0.07 : 0.20;
        tpOverhead = Math.min(1 - (1 / (1 + overheadPerSplit * (tpDegree - 1))), 0.5);
        if (tpDegree > 1) {
          notes.push(`Tensor parallelism across ${tpDegree} GPUs${hasNvLink ? ' (NVLink)' : ' (PCIe — consider NVLink GPUs)'}`);
        }
      }

      // ── Step 2: Per-replica throughput ──────────────────
      // Decode tok/s = aggregate bandwidth / model_size
      // With TP, bandwidth scales but communication overhead reduces efficiency
      const aggregateBandwidth = gpu.bandwidth_gbps * tpDegree;
      const effectiveBandwidth = aggregateBandwidth * (1 - tpOverhead);
      const tokPerSecPerReplica = modelSizeGb > 0 ? effectiveBandwidth / modelSizeGb : 0;

      // Requests per second per replica (with continuous batching)
      // One "request" = avgResponseTokens decode tokens
      // With batching, multiple requests share compute; effective batch size ~4-8 for decode
      const batchEfficiency = Math.min(1 + Math.log2(Math.max(1, peakConcurrent / 10)) * 0.15, 1.8);
      const effectiveTokPerSec = tokPerSecPerReplica * batchEfficiency;
      const requestsPerSecPerReplica = effectiveTokPerSec / Math.max(1, input.avgResponseTokens);

      // Concurrent users per replica: how many users can be "in flight" simultaneously
      // = requests/sec × avg_request_duration
      const avgRequestDuration = input.avgResponseTokens / Math.max(1, tokPerSecPerReplica);
      const concurrentPerReplica = Math.max(1, Math.floor(requestsPerSecPerReplica * avgRequestDuration * batchEfficiency));

      // ── Step 3: Fleet scaling ──────────────────────────
      // How many replicas to serve peak concurrent users?
      const replicasNeeded = Math.max(1, Math.ceil(peakConcurrent / Math.max(1, concurrentPerReplica)));
      const redundancyReplicas = input.redundancy ? Math.max(1, Math.ceil(replicasNeeded * 0.2)) : 0; // ~20% spare capacity, min 1
      const totalReplicas = replicasNeeded + redundancyReplicas;
      const totalGpus = totalReplicas * tpDegree;

      if (input.redundancy && redundancyReplicas > 0) {
        notes.push(`+${redundancyReplicas} redundancy replica${redundancyReplicas > 1 ? 's' : ''} (N+${redundancyReplicas})`);
      }

      // Nodes: datacenter GPUs typically 8/node; consumer GPUs 2-4/node
      const maxGpusPerNode = (gpu.price_usd || 0) > 5000 ? 8 : (tpDegree > 1 ? tpDegree : 2);
      const nodesNeeded = Math.ceil(totalGpus / maxGpusPerNode);

      // ── Step 4: Cost modeling ──────────────────────────
      const gpuPrice = gpu.price_usd || 0;
      const gpuHardwareCost = totalGpus * gpuPrice;
      const serverOverheadCost = nodesNeeded * SERVER_OVERHEAD_PER_NODE;
      const totalHardwareCost = gpuHardwareCost + serverOverheadCost;

      const totalPowerWatts = totalGpus * (gpu.tdp_watts || 300);
      const annualElectricityCost = Math.round((totalPowerWatts / 1000) * 8760 * PUE * ELECTRICITY_COST_KWH);
      const annualMaintenanceCost = Math.round(totalHardwareCost * MAINTENANCE_RATE);
      const totalFirstYearCost = totalHardwareCost + annualElectricityCost + annualMaintenanceCost;

      // ── Step 5: Efficiency metrics ─────────────────────
      const costPerConcurrentUser = peakConcurrent > 0 ? Math.round(totalFirstYearCost / peakConcurrent) : Infinity;
      const fleetTokPerSec = tokPerSecPerReplica * totalReplicas;
      const costPerTokPerSec = fleetTokPerSec > 0 ? Math.round(totalFirstYearCost / fleetTokPerSec) : Infinity;

      // ── Step 6: Scaling curve ──────────────────────────
      // Model realistic sub-linear scaling: as replicas grow, coordination
      // overhead (load balancing, network contention, scheduling) reduces
      // effective throughput per replica. Classic Amdahl's-law-inspired curve.
      const maxScale = Math.max(Math.min(totalReplicas * 2, 20), 6);
      const scalingCurve: GpuFleetPlan['scalingCurve'] = [];
      for (let r = 1; r <= maxScale; r++) {
        const gTotal = r * tpDegree;
        const nNodes = Math.ceil(gTotal / maxGpusPerNode);
        // Efficiency degrades with scale: 100% at 1 replica → ~70-85% at 20 replicas
        // Cross-node overhead is worse than intra-node
        const crossNodePenalty = nNodes > 1 ? 0.03 * (nNodes - 1) : 0;
        const coordinationOverhead = 1 - (0.015 * Math.log2(r)) - crossNodePenalty;
        const efficiency = Math.max(0.5, Math.min(1.0, coordinationOverhead));
        const concurrent = Math.round(r * concurrentPerReplica * efficiency);
        const cost = gTotal * gpuPrice + nNodes * SERVER_OVERHEAD_PER_NODE;
        scalingCurve.push({ replicas: r, gpus: gTotal, nodes: nNodes, concurrent, cost });
      }

      // ── Step 7: Classification ────────────────────────
      let tier: 'budget' | 'recommended' | 'premium' = 'recommended';
      if (gpuPrice < 5000) tier = 'budget';
      else if (gpuPrice > 20000) tier = 'premium';

      // Performance warnings
      if (tokPerSecPerReplica < 10) notes.push('Low decode speed — users may experience noticeable latency');
      if (tpDegree > 4) notes.push('High TP degree — consider a GPU with more VRAM');
      if (avgRequestDuration > maxRequestTimeSec) notes.push(`Avg request time ${avgRequestDuration.toFixed(1)}s may feel slow`);

      gpuPlans.push({
        gpu,
        tpDegree,
        tpOverhead,
        hasNvLink,
        tokPerSecPerReplica: Math.round(tokPerSecPerReplica * 10) / 10,
        requestsPerSecPerReplica: Math.round(requestsPerSecPerReplica * 100) / 100,
        concurrentPerReplica,
        replicasNeeded,
        redundancyReplicas,
        totalReplicas,
        totalGpus,
        nodesNeeded,
        maxGpusPerNode,
        gpuHardwareCost,
        serverOverheadCost,
        totalHardwareCost,
        totalPowerWatts,
        annualElectricityCost,
        annualMaintenanceCost,
        totalFirstYearCost,
        costPerConcurrentUser,
        costPerTokPerSec,
        scalingCurve,
        tier,
        isOptimal: false,
        notes,
      });
    }

    // Sort by cost-efficiency (cost per concurrent user)
    gpuPlans.sort((a, b) => a.costPerConcurrentUser - b.costPerConcurrentUser);

    // Mark the optimal choice
    const optimalIdx = gpuPlans.findIndex(p => p.costPerConcurrentUser < Infinity);
    if (optimalIdx >= 0) gpuPlans[optimalIdx].isOptimal = true;

    return {
      model: selectedModel,
      quantLevel: input.quantLevel,
      vramPerInstance,
      modelSizeGb: Math.round(modelSizeGb * 10) / 10,
      peakConcurrent,
      gpuPlans,
      optimalGpuIndex: optimalIdx,
    };
  }, [selectedModel, input]);

  const result = showResults ? calculateSizing() : null;

  // ── Styling ─────────────────────────────────────────────
  const inputCls = `w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
    isDark
      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-blue-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500'
  }`;
  const labelCls = `block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`;

  const tierColors = {
    budget: isDark ? 'border-green-700 bg-green-900/20' : 'border-green-300 bg-green-50',
    recommended: isDark ? 'border-blue-700 bg-blue-900/20' : 'border-blue-300 bg-blue-50',
    premium: isDark ? 'border-purple-700 bg-purple-900/20' : 'border-purple-300 bg-purple-50',
  };
  const tierLabels = {
    budget: { label: 'Budget', color: isDark ? 'text-green-400' : 'text-green-700' },
    recommended: { label: 'Recommended', color: isDark ? 'text-blue-400' : 'text-blue-700' },
    premium: { label: 'Premium', color: isDark ? 'text-purple-400' : 'text-purple-700' },
  };

  // ── Scaling chart bar component ─────────────────────────
  const CHART_H = 120; // px — fixed bar area height
  const ScalingChart = ({ plan }: { plan: GpuFleetPlan }) => {
    const maxConcurrent = Math.max(...plan.scalingCurve.map(s => s.concurrent), 1);
    const perReplica = plan.scalingCurve.length > 0 ? plan.scalingCurve[0].concurrent : 1;
    const targetLine = result?.peakConcurrent || 0;
    const targetPct = targetLine > 0 && maxConcurrent > 0
      ? Math.min((targetLine / maxConcurrent) * 100, 100) : 0;

    return (
      <div className="mt-4">
        <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Scaling Curve — Concurrent Capacity vs Replica Count
        </p>
        {/* chart area: fixed pixel height so bars render reliably */}
        <div className="relative" style={{ height: CHART_H + 32 }}>
          {/* target line — absolute across chart */}
          {targetPct > 0 && (
            <div
              className="absolute left-0 right-0 flex items-center z-10 pointer-events-none"
              style={{ bottom: 20 + (CHART_H * targetPct) / 100 }}
            >
              <div className={`h-px flex-1 border-t border-dashed ${isDark ? 'border-red-700' : 'border-red-400'}`} />
              <span className={`text-[9px] px-1.5 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                target: {targetLine}
              </span>
              <div className={`h-px flex-1 border-t border-dashed ${isDark ? 'border-red-700' : 'border-red-400'}`} />
            </div>
          )}
          {/* bars */}
          <div className="absolute inset-0 flex items-end gap-px px-0.5" style={{ paddingBottom: 20 }}>
            {plan.scalingCurve.map((s, i) => {
              const barH = Math.max((s.concurrent / maxConcurrent) * CHART_H, 3);
              const idealH = Math.max(((s.replicas * perReplica) / maxConcurrent) * CHART_H, 3);
              const meetsTarget = s.concurrent >= targetLine;
              const isExact = s.replicas === plan.replicasNeeded;
              const eff = s.replicas * perReplica > 0
                ? Math.round((s.concurrent / (s.replicas * perReplica)) * 100) : 100;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end min-w-0"
                  title={`${s.replicas} replicas → ${s.gpus} GPUs, ${s.nodes} nodes\n${s.concurrent} concurrent users (${eff}% eff.)\n$${s.cost.toLocaleString()}`}
                >
                  {/* value label */}
                  <span className={`text-[8px] leading-tight mb-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {s.concurrent}
                  </span>
                  {/* ghost bar (ideal linear) */}
                  <div className="w-full relative">
                    <div
                      className={`w-full rounded-t ${isDark ? 'bg-indigo-900/25' : 'bg-indigo-100/70'}`}
                      style={{ height: idealH }}
                    />
                    {/* actual bar overlaid */}
                    <div
                      className={`w-full rounded-t absolute bottom-0 left-0 ${
                        isExact
                          ? 'bg-gradient-to-t from-blue-600 to-cyan-400'
                          : meetsTarget
                            ? isDark ? 'bg-emerald-500' : 'bg-emerald-500'
                            : isDark ? 'bg-indigo-500/70' : 'bg-indigo-400'
                      }`}
                      style={{ height: barH }}
                    />
                  </div>
                  {/* replica label */}
                  <span className={`text-[8px] leading-tight mt-0.5 ${
                    isExact ? 'font-bold text-blue-400' : isDark ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {s.replicas}R
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {/* efficiency annotation */}
        {plan.scalingCurve.length > 1 && (
          <div className={`text-[9px] text-right mt-0.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            {(() => {
              const last = plan.scalingCurve[plan.scalingCurve.length - 1];
              const idealLast = last.replicas * perReplica;
              const eff = idealLast > 0 ? Math.round((last.concurrent / idealLast) * 100) : 100;
              return `${eff}% scaling efficiency at ${last.replicas} replicas`;
            })()}
          </div>
        )}
      </div>
    );
  };

  // ── GPU Plan Card ───────────────────────────────────────
  const GpuPlanCard = ({ plan, isPreview, hideCosts }: { plan: GpuFleetPlan; index?: number; isPreview?: boolean; hideCosts?: boolean }) => {
    const lockedCost = (
      <span className={`inline-flex items-center gap-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
        Plus
      </span>
    );

    return (
    <div className={`rounded-xl p-5 border-2 transition-all ${tierColors[plan.tier]} ${plan.isOptimal ? 'ring-2 ring-blue-500/50' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h5 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {plan.gpu.name}
            </h5>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tierLabels[plan.tier].color} ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
              {tierLabels[plan.tier].label}
            </span>
            {plan.isOptimal && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-900/50 text-blue-300 border border-blue-700' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                Best Value
              </span>
            )}
            {isPreview && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                Preview
              </span>
            )}
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {plan.gpu.vram_mb / 1024} GB {plan.gpu.memory_type} — {plan.gpu.bandwidth_gbps} GB/s — {plan.gpu.tdp_watts}W TDP
          </p>
        </div>
        <div className="text-right">
          {hideCosts ? (
            <>
              <p className={`text-lg font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{lockedCost}</p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Upgrade for costs</p>
            </>
          ) : (
            <>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                ${plan.totalFirstYearCost.toLocaleString()}
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>first year total</p>
            </>
          )}
        </div>
      </div>

      {/* Architecture summary */}
      <div className={`rounded-lg p-3 mb-3 text-sm ${isDark ? 'bg-gray-900/60' : 'bg-white/80'}`}>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
            <b>{plan.totalReplicas}</b> replica{plan.totalReplicas > 1 ? 's' : ''}
            {plan.tpDegree > 1 && <> × <b>{plan.tpDegree}</b> GPU TP</>}
            {' = '}<b>{plan.totalGpus}</b> GPU{plan.totalGpus > 1 ? 's' : ''}
            {' → '}<b>{plan.nodesNeeded}</b> node{plan.nodesNeeded > 1 ? 's' : ''}
          </span>
          {plan.tpDegree > 1 && (
            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              TP efficiency: {((1 - plan.tpOverhead) * 100).toFixed(0)}% {plan.hasNvLink ? '(NVLink)' : '(PCIe)'}
            </span>
          )}
        </div>
      </div>

      {/* Performance grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-900/50' : 'bg-white/80'}`}>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Decode / Replica</p>
          <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{plan.tokPerSecPerReplica} tok/s</p>
        </div>
        <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-900/50' : 'bg-white/80'}`}>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Concurrent / Replica</p>
          <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{plan.concurrentPerReplica} users</p>
        </div>
        <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-900/50' : 'bg-white/80'}`}>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Fleet Throughput</p>
          <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{Math.round(plan.tokPerSecPerReplica * plan.totalReplicas)} tok/s</p>
        </div>
        <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-900/50' : 'bg-white/80'}`}>
          <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Total Power</p>
          <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{(plan.totalPowerWatts / 1000).toFixed(1)} kW</p>
        </div>
      </div>

      {/* Cost breakdown — hidden on free tier */}
      {hideCosts ? (
        <div className={`mt-3 rounded-lg p-4 text-center border border-dashed ${isDark ? 'border-gray-700 bg-gray-900/30' : 'border-gray-300 bg-gray-50'}`}>
          <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Cost breakdown available with Plus or Ultra
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            GPU hardware, server overhead, electricity, and per-user costs
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-sm">
          <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-900/50' : 'bg-white/80'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>GPU Hardware</p>
            <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>${plan.gpuHardwareCost.toLocaleString()}</p>
          </div>
          <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-900/50' : 'bg-white/80'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Server Overhead</p>
            <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>${plan.serverOverheadCost.toLocaleString()}</p>
          </div>
          <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-900/50' : 'bg-white/80'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Annual Electricity</p>
            <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>${plan.annualElectricityCost.toLocaleString()}/yr</p>
          </div>
          <div className={`rounded-lg p-3 ${isDark ? 'bg-gray-900/50' : 'bg-white/80'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>$/Concurrent User</p>
            <p className={`font-bold ${plan.isOptimal ? 'text-blue-500' : isDark ? 'text-white' : 'text-gray-900'}`}>
              ${plan.costPerConcurrentUser.toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Scaling chart */}
      <ScalingChart plan={plan} />

      {/* Notes */}
      {plan.notes.length > 0 && (
        <div className={`mt-3 text-xs space-y-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          {plan.notes.map((n, ni) => <p key={ni}>• {n}</p>)}
        </div>
      )}
    </div>
    );
  };

  if (loading) {
    return <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Loading models...</div>;
  }

  return (
    <div>
      {/* Input Form — Essential fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2">
          <label className={labelCls}>Model</label>
          <select
            value={input.modelId}
            onChange={e => {
              const m = models.find(mm => mm.id === e.target.value);
              setInput(prev => ({
                ...prev,
                modelId: e.target.value,
                quantLevel: m?.quantizations[0]?.level || 'Q4_K_M',
              }));
              setShowResults(false);
            }}
            className={inputCls}
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.params_b}B params — {m.architecture})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Quantization</label>
          <select
            value={input.quantLevel}
            onChange={e => { setInput(prev => ({ ...prev, quantLevel: e.target.value })); setShowResults(false); }}
            className={inputCls}
          >
            {availableQuants.map(q => (
              <option key={q.level} value={q.level}>
                {q.level} ({q.bpw} bpw — {(q.vram_mb / 1024).toFixed(1)} GB)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Concurrent Users</label>
          <input
            type="number" min={1} max={10000}
            value={input.concurrentUsers}
            onChange={e => { setInput(prev => ({ ...prev, concurrentUsers: Number(e.target.value) })); setShowResults(false); }}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Context Length</label>
          <select
            value={input.contextLength}
            onChange={e => { setInput(prev => ({ ...prev, contextLength: Number(e.target.value) })); setShowResults(false); }}
            className={inputCls}
          >
            <option value={2048}>2K tokens</option>
            <option value={4096}>4K tokens</option>
            <option value={8192}>8K tokens</option>
            <option value={16384}>16K tokens</option>
            <option value={32768}>32K tokens</option>
            <option value={65536}>64K tokens</option>
            <option value={131072}>128K tokens</option>
          </select>
        </div>

        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={input.redundancy}
              onChange={e => { setInput(prev => ({ ...prev, redundancy: e.target.checked })); setShowResults(false); }}
              className="w-4 h-4 rounded border-gray-500 text-blue-600 focus:ring-blue-500"
            />
            <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              N+1 Redundancy
            </span>
          </label>
        </div>
      </div>

      {/* Advanced Parameters — collapsible */}
      <div className="mb-6">
        <CollapsibleSection title="Advanced Parameters" subtitle="latency, traffic patterns, token lengths">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Target TTFT (ms)</label>
              <select
                value={input.targetLatencyMs}
                onChange={e => { setInput(prev => ({ ...prev, targetLatencyMs: Number(e.target.value) })); setShowResults(false); }}
                className={inputCls}
              >
                <option value={100}>100ms (Real-time)</option>
                <option value={200}>200ms (Interactive)</option>
                <option value={500}>500ms (Standard)</option>
                <option value={1000}>1000ms (Batch)</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Avg Prompt Length (tokens)</label>
              <input
                type="number" min={10} max={100000}
                value={input.avgPromptTokens}
                onChange={e => { setInput(prev => ({ ...prev, avgPromptTokens: Number(e.target.value) })); setShowResults(false); }}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Avg Response Length (tokens)</label>
              <input
                type="number" min={10} max={10000}
                value={input.avgResponseTokens}
                onChange={e => { setInput(prev => ({ ...prev, avgResponseTokens: Number(e.target.value) })); setShowResults(false); }}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Peak Traffic Multiplier</label>
              <select
                value={input.peakMultiplier}
                onChange={e => { setInput(prev => ({ ...prev, peakMultiplier: Number(e.target.value) })); setShowResults(false); }}
                className={inputCls}
              >
                <option value={1.0}>1.0x (Steady traffic)</option>
                <option value={1.5}>1.5x (Moderate peaks)</option>
                <option value={2.0}>2.0x (High peaks)</option>
                <option value={3.0}>3.0x (Burst traffic)</option>
              </select>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      <button
        onClick={() => setShowResults(true)}
        disabled={!selectedModel}
        className="group relative w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-white font-semibold rounded-lg transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-sm shadow-blue-600/20 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Calculate Fleet Requirements
      </button>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-6">
          {/* Summary Banner */}
          <div className={`rounded-xl p-6 border ${isDark ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Model</p>
                <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{result.model.name}</p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Model Size</p>
                <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{result.modelSizeGb} GB</p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>VRAM / Instance</p>
                <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{(result.vramPerInstance / 1024).toFixed(1)} GB</p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Peak Concurrent</p>
                <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{result.peakConcurrent} users</p>
              </div>
              <div>
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Quantization</p>
                <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{result.quantLevel}</p>
              </div>
            </div>
          </div>

          {/* GPU Plans */}
          <div className="space-y-4">
            <h4 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Fleet Configurations
              <span className={`text-xs font-normal ml-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {result.gpuPlans.length} options — sorted by cost efficiency
              </span>
            </h4>

            {/* FREE TIER: Best-value GPU — full performance data, NO cost data */}
            {result.gpuPlans.slice(0, 1).map((plan, i) => (
              <GpuPlanCard key={i} plan={plan} index={i} isPreview={activeTier === 'free'} hideCosts={activeTier === 'free'} />
            ))}

            {/* PLUS TIER: All GPU plans with full data */}
            {activeTier !== 'free' && result.gpuPlans.slice(1).map((plan, i) => (
              <GpuPlanCard key={i + 1} plan={plan} index={i + 1} />
            ))}

            {/* ULTRA TIER: Extra sections */}
            {activeTier === 'ultra' && (
              <div className={`rounded-xl p-5 border-2 ${isDark ? 'border-purple-700 bg-purple-900/20' : 'border-purple-300 bg-purple-50'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>ULTRA</span>
                  <h5 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Extended Analysis
                  </h5>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-900/60' : 'bg-white/80'}`}>
                    <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>GDPR Infrastructure Assessment</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Data residency requirements met: all processing on-premise. Encryption at rest via LUKS/dm-crypt. Network isolation via VLAN segmentation. Audit logging recommendations included.</p>
                  </div>
                  <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-900/60' : 'bg-white/80'}`}>
                    <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>12-Month Scaling Roadmap</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Q1: Deploy {result.gpuPlans[0]?.totalReplicas || 2} replicas. Q2: Add monitoring & auto-scaling. Q3: Evaluate model upgrades. Q4: Expand to {Math.ceil((result.gpuPlans[0]?.totalReplicas || 2) * 1.5)} replicas for projected growth.</p>
                  </div>
                  <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-900/60' : 'bg-white/80'}`}>
                    <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>Power & Cooling Specs</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total rack power: {((result.gpuPlans[0]?.totalPowerWatts || 1000) * 1.3 / 1000).toFixed(1)} kW (incl. PUE 1.3). Recommended cooling: {(result.gpuPlans[0]?.totalPowerWatts || 1000) > 5000 ? 'Rear-door heat exchangers' : 'In-row precision cooling'}. UPS sizing: {((result.gpuPlans[0]?.totalPowerWatts || 1000) * 1.5 / 1000).toFixed(1)} kVA minimum.</p>
                  </div>
                  <div className={`rounded-lg p-4 ${isDark ? 'bg-gray-900/60' : 'bg-white/80'}`}>
                    <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-purple-400' : 'text-purple-700'}`}>Multi-Model Fleet Optimization</p>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Run a secondary lightweight model (7B-13B) on spare GPU capacity for low-latency tasks while the primary model handles complex requests. Shared inference server via vLLM multi-model serving.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Paywall: show when on free tier and there are more plans */}
            {activeTier === 'free' && result.gpuPlans.length > 1 && (
              <div className="relative">
                <div className="blur-sm select-none pointer-events-none opacity-60 space-y-4">
                  {result.gpuPlans.slice(1, 3).map((plan, i) => (
                    <div key={i} className={`rounded-xl p-5 border-2 ${tierColors[plan.tier]}`}>
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <h5 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{plan.gpu.name}</h5>
                          <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {plan.totalReplicas} replicas × {plan.tpDegree} TP = {plan.totalGpus} GPUs → {plan.nodesNeeded} nodes
                          </p>
                        </div>
                        <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>${plan.totalFirstYearCost.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <EnterprisePaywall
                  tiers={SIZING_TIERS}
                  currentTier={activeTier}
                  onSelectTier={setActiveTier}
                />
              </div>
            )}
          </div>

          <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            Estimates are based on memory-bandwidth-bound decode performance with continuous batching.
            Actual throughput varies by inference engine (vLLM, llama.cpp, TGI), batching strategy, and workload mix.
            Server overhead estimated at ${SERVER_OVERHEAD_PER_NODE.toLocaleString()}/node. Electricity at ${ELECTRICITY_COST_KWH}/kWh with PUE {PUE}.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Enterprise Sizing Report Generator
 * ===================================
 * Generates a professional HTML report that opens in a new window
 * for printing/saving as PDF. No external dependencies required.
 */

interface GpuPlan {
  gpu: { name: string; price_usd?: number };
  tpDegree: number;
  totalReplicas: number;
  totalGpus: number;
  nodesNeeded: number;
  estimatedToksPerSec: number;
  estimatedConcurrent: number;
  totalPowerWatts: number;
  totalFirstYearCost: number;
  tier: string;
}

interface SizingResult {
  model: { name: string; params_b: number; architecture: string };
  quantLevel: string;
  modelSizeGb: number;
  vramPerInstance: number;
  peakConcurrent: number;
  gpuPlans: GpuPlan[];
}

interface ReportInput {
  result: SizingResult;
  concurrentUsers: number;
  contextLength: number;
  redundancy: boolean;
  targetLatencyMs: number;
}

export function generateSizingReport(input: ReportInput): void {
  const { result, concurrentUsers, contextLength, redundancy, targetLatencyMs } = input;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const bestPlan = result.gpuPlans[0];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Hardware Sizing Report — ${result.model.name} | LocalLLM Advisor</title>
  <style>
    @page { margin: 1in; size: A4; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a2e;
      line-height: 1.6;
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 24px;
      color: #1e3a5f;
      margin-bottom: 4px;
    }
    .header .subtitle {
      font-size: 14px;
      color: #6b7280;
    }
    .header .logo {
      font-size: 12px;
      color: #3b82f6;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    h2 {
      font-size: 18px;
      color: #1e3a5f;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 6px;
      margin-top: 30px;
      margin-bottom: 15px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .summary-card {
      background: #f0f4ff;
      border-radius: 8px;
      padding: 14px;
      text-align: center;
    }
    .summary-card .label {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .summary-card .value {
      font-size: 20px;
      font-weight: 700;
      color: #1e3a5f;
      margin-top: 2px;
    }
    .summary-card .note {
      font-size: 11px;
      color: #9ca3af;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 13px;
    }
    th {
      background: #1e3a5f;
      color: white;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:nth-child(even) { background: #f9fafb; }
    tr.best td { background: #eff6ff; font-weight: 600; }
    .highlight { color: #3b82f6; font-weight: 600; }
    .recommendation {
      background: linear-gradient(135deg, #eff6ff, #e0e7ff);
      border: 2px solid #3b82f6;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }
    .recommendation h3 {
      color: #1e3a5f;
      font-size: 16px;
      margin-bottom: 8px;
    }
    .recommendation p { font-size: 14px; color: #374151; }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      font-size: 11px;
      color: #9ca3af;
      text-align: center;
    }
    .params {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      font-size: 13px;
      margin-bottom: 20px;
    }
    .params .item {
      display: flex;
      justify-content: space-between;
      padding: 6px 12px;
      background: #f9fafb;
      border-radius: 6px;
    }
    .params .item .k { color: #6b7280; }
    .params .item .v { font-weight: 600; color: #1e3a5f; }
    .no-print { text-align: center; margin-bottom: 30px; }
    .no-print button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }
    .no-print button:hover { background: #2563eb; }
    @media print {
      .no-print { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()">Save as PDF / Print</button>
    <p style="font-size: 13px; color: #6b7280; margin-top: 8px;">
      Use your browser's "Save as PDF" option for best results
    </p>
  </div>

  <div class="header">
    <div class="logo">LOCALLLM ADVISOR</div>
    <h1>Hardware Sizing Report</h1>
    <div class="subtitle">${result.model.name} — Generated ${dateStr}</div>
  </div>

  <h2>Configuration Summary</h2>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">Model</div>
      <div class="value" style="font-size: 16px;">${result.model.name}</div>
      <div class="note">${result.model.params_b}B params · ${result.model.architecture}</div>
    </div>
    <div class="summary-card">
      <div class="label">Quantization</div>
      <div class="value">${result.quantLevel}</div>
      <div class="note">Model size: ${result.modelSizeGb} GB</div>
    </div>
    <div class="summary-card">
      <div class="label">Peak Concurrent</div>
      <div class="value">${result.peakConcurrent}</div>
      <div class="note">users simultaneously</div>
    </div>
  </div>

  <h2>Input Parameters</h2>
  <div class="params">
    <div class="item"><span class="k">Concurrent Users</span><span class="v">${concurrentUsers}</span></div>
    <div class="item"><span class="k">Context Length</span><span class="v">${contextLength.toLocaleString()} tokens</span></div>
    <div class="item"><span class="k">Target TTFT</span><span class="v">${targetLatencyMs}ms</span></div>
    <div class="item"><span class="k">Redundancy</span><span class="v">${redundancy ? 'N+1 (enabled)' : 'None'}</span></div>
    <div class="item"><span class="k">VRAM per Instance</span><span class="v">${(result.vramPerInstance / 1024).toFixed(1)} GB</span></div>
    <div class="item"><span class="k">Model Size on Disk</span><span class="v">${result.modelSizeGb} GB</span></div>
  </div>

  ${bestPlan ? `
  <div class="recommendation">
    <h3>Recommended Configuration</h3>
    <p>
      <span class="highlight">${bestPlan.gpu.name}</span> —
      ${bestPlan.totalReplicas} replicas × ${bestPlan.tpDegree} TP = ${bestPlan.totalGpus} GPUs across ${bestPlan.nodesNeeded} node${bestPlan.nodesNeeded > 1 ? 's' : ''}.
      Estimated throughput: ~${Math.round(bestPlan.estimatedToksPerSec)} tok/s supporting ${bestPlan.estimatedConcurrent} concurrent users.
      ${bestPlan.gpu.price_usd ? `First-year total cost: $${bestPlan.totalFirstYearCost.toLocaleString()}.` : ''}
    </p>
  </div>
  ` : ''}

  <h2>GPU Fleet Configurations</h2>
  <table>
    <thead>
      <tr>
        <th>GPU</th>
        <th>GPUs</th>
        <th>Nodes</th>
        <th>Topology</th>
        <th>tok/s</th>
        <th>Concurrent</th>
        <th>Power</th>
        <th>Year 1 Cost</th>
      </tr>
    </thead>
    <tbody>
      ${result.gpuPlans.map((plan, i) => `
        <tr${i === 0 ? ' class="best"' : ''}>
          <td>${plan.gpu.name}${i === 0 ? ' ★' : ''}</td>
          <td>${plan.totalGpus}</td>
          <td>${plan.nodesNeeded}</td>
          <td>${plan.totalReplicas}×${plan.tpDegree}TP</td>
          <td>~${Math.round(plan.estimatedToksPerSec)}</td>
          <td>${plan.estimatedConcurrent}</td>
          <td>${(plan.totalPowerWatts / 1000).toFixed(1)} kW</td>
          <td>${plan.gpu.price_usd ? '$' + plan.totalFirstYearCost.toLocaleString() : 'N/A'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${bestPlan ? `
  <h2>Infrastructure Notes</h2>
  <div class="params">
    <div class="item"><span class="k">Total Power Draw</span><span class="v">${(bestPlan.totalPowerWatts * 1.3 / 1000).toFixed(1)} kW (PUE 1.3)</span></div>
    <div class="item"><span class="k">Cooling</span><span class="v">${bestPlan.totalPowerWatts > 5000 ? 'Rear-door heat exchangers' : 'In-row precision cooling'}</span></div>
    <div class="item"><span class="k">UPS Sizing</span><span class="v">${(bestPlan.totalPowerWatts * 1.5 / 1000).toFixed(1)} kVA minimum</span></div>
    <div class="item"><span class="k">Rack Units</span><span class="v">${bestPlan.nodesNeeded * 4}U (est. 4U/node)</span></div>
  </div>
  ` : ''}

  <div class="footer">
    <p>Generated by LocalLLM Advisor · localllm-advisor.com · ${dateStr}</p>
    <p>Estimates based on memory-bandwidth-bound decode performance with continuous batching. Actual results vary by inference engine and workload.</p>
  </div>
</body>
</html>`;

  const reportWindow = window.open('', '_blank');
  if (reportWindow) {
    reportWindow.document.write(html);
    reportWindow.document.close();
  }
}

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTheme } from './ThemeProvider';

type AccentColor = 'blue' | 'orange' | 'green' | 'purple' | 'indigo' | 'red';

interface MeshGradientProps {
  /** Accent tint for blobs. Defaults to 'blue'. */
  accent?: AccentColor;
  /** Strength of the mouse-reactive grid warp (0 = off). Defaults to 1. */
  warpStrength?: number;
}

// RGB values per accent
const ACCENT_COLORS: Record<AccentColor, [number, number, number][]> = {
  blue:   [[59,130,246], [139,92,246], [6,182,212], [99,102,241]],
  orange: [[249,115,22], [245,158,11], [234,88,12],  [251,146,60]],
  green:  [[34,197,94],  [16,185,129], [5,150,105],  [52,211,153]],
  purple: [[168,85,247], [139,92,246], [192,38,211], [124,58,237]],
  indigo: [[99,102,241], [129,140,248],[79,70,229],  [139,92,246]],
  red:    [[239,68,68],  [244,63,94],  [220,38,38],  [248,113,113]],
};

/**
 * MeshGradient — animated gradient mesh with mouse-reactive grid.
 * Renders morphing gradient blobs + a subtle grid overlay whose
 * intersection points bend gently toward the cursor.
 *
 * Performance budget: 4 blobs + grid, <2ms per frame.
 */
export default function MeshGradient({ accent = 'blue', warpStrength = 1 }: MeshGradientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -1, y: -1, active: false });
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { ...mouseRef.current, active: false };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Listen on the parent for mouse (canvas is pointer-events-none)
    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener('mousemove', handleMouseMove);
      parent.addEventListener('mouseleave', handleMouseLeave);
    }

    let animId: number;
    let time = 0;

    const blobs = [
      { cx: 0.25, cy: 0.3,  rx: 0.08, ry: 0.06, phase: 0,    speed: 0.0004 },
      { cx: 0.75, cy: 0.25, rx: 0.06, ry: 0.08, phase: 1.5,   speed: 0.0003 },
      { cx: 0.5,  cy: 0.7,  rx: 0.07, ry: 0.07, phase: 3.0,   speed: 0.00035 },
      { cx: 0.3,  cy: 0.8,  rx: 0.05, ry: 0.06, phase: 4.5,   speed: 0.00025 },
    ];

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    function draw() {
      if (!canvas || !ctx) return;
      time += 1;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Blob colours
      const rgb = ACCENT_COLORS[accent];
      const darkAlphas = [0.08, 0.06, 0.05, 0.06];
      const lightAlphas = [0.12, 0.08, 0.10, 0.09];

      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i];
        const cx = (b.cx + Math.sin(time * b.speed + b.phase) * b.rx) * w;
        const cy = (b.cy + Math.cos(time * b.speed * 0.7 + b.phase) * b.ry) * h;
        const radius = Math.max(w, h) * (isDark ? 0.35 : 0.4);
        const [r, g, bl] = rgb[i];
        const alpha = isDark ? darkAlphas[i] : lightAlphas[i];

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${bl}, ${alpha})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }

      // --- Grid with mouse warp ---
      const gridSpacing = 60;
      const gridOpacity = isDark ? 0.03 : 0.05;
      const gridColor = isDark ? '148, 163, 184' : '100, 116, 139';
      ctx.lineWidth = 0.5;

      const mouse = mouseRef.current;
      const warpRadius = 200;          // px radius of influence
      const maxWarp = 6 * warpStrength; // max px displacement

      // Helper: compute warped position
      function warp(px: number, py: number): [number, number] {
        if (!mouse.active || warpStrength === 0) return [px, py];
        const dx = px - mouse.x;
        const dy = py - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > warpRadius || dist < 1) return [px, py];
        const factor = (1 - dist / warpRadius) * (1 - dist / warpRadius); // quadratic falloff
        return [
          px + dx / dist * factor * maxWarp,
          py + dy / dist * factor * maxWarp,
        ];
      }

      // Draw warped vertical lines
      ctx.strokeStyle = `rgba(${gridColor}, ${gridOpacity})`;
      for (let x = 0; x < w; x += gridSpacing) {
        ctx.beginPath();
        for (let y = 0; y <= h; y += 10) {
          const [wx, wy] = warp(x, y);
          if (y === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
      }

      // Draw warped horizontal lines
      for (let y = 0; y < h; y += gridSpacing) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 10) {
          const [wx, wy] = warp(x, y);
          if (x === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
      }

      // Intersection dots (warped)
      const dotOpacity = isDark ? 0.06 : 0.1;
      ctx.fillStyle = `rgba(${gridColor}, ${dotOpacity})`;
      for (let x = 0; x < w; x += gridSpacing) {
        for (let y = 0; y < h; y += gridSpacing) {
          const [wx, wy] = warp(x, y);
          ctx.beginPath();
          ctx.arc(wx, wy, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();

    const handleResize = () => resize();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (parent) {
        parent.removeEventListener('mousemove', handleMouseMove);
        parent.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [isDark, accent, warpStrength, handleMouseMove, handleMouseLeave]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}

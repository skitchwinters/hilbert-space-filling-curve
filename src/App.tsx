import React, { useState, useEffect, useRef, useMemo } from 'react';
import { generateHilbertCurve, Point } from './hilbert';
import { Download, Play, Pause, Settings, Info, Square, Grid, MousePointer2 } from 'lucide-react';

type ColorScheme = 'monochrome' | 'spectrum' | 'quadrant';

function App() {
  const [n, setN] = useState<number>(3);
  const [animated, setAnimated] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showQuadrants, setShowQuadrants] = useState<boolean>(false);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(false);
  const [colorScheme, setColorScheme] = useState<ColorScheme>('spectrum');
  
  const [hoverPos, setHoverPos] = useState<{t: number, x: number, y: number} | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const points = useMemo(() => generateHilbertCurve(n), [n]);
  
  // Animation loop
  useEffect(() => {
    let animationFrame: number;
    let lastTime = performance.now();
    
    const animate = (time: number) => {
      if (isPlaying) {
        const dt = time - lastTime;
        // Total animation time = 5 seconds
        const speed = 1000 / 5000;
        setProgress((p) => {
          const next = p + (dt * speed) / points.length;
          if (next >= 1) {
            setIsPlaying(false);
            return 1;
          }
          return next;
        });
      }
      lastTime = time;
      animationFrame = requestAnimationFrame(animate);
    };
    
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, points.length]);

  // Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);
    
    // Grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const cells = 1 << n;
      for (let i = 0; i <= cells; i++) {
        const pos = (i / cells) * size;
        ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(size, pos); ctx.stroke();
      }
    }
    
    if (showQuadrants) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(size/2, 0); ctx.lineTo(size/2, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, size/2); ctx.lineTo(size, size/2); ctx.stroke();
    }
    
    if (showAnnotations) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('90° CW', size/4, size * 3/4);
      ctx.fillText('Identity', size/4, size/4);
      ctx.fillText('Identity', size * 3/4, size/4);
      ctx.fillText('90° CCW', size * 3/4, size * 3/4);
    }
    
    // Draw path
    const drawPts = Math.max(1, Math.floor(progress * points.length));
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, 4 - n * 0.4);
    
    for (let i = 0; i < drawPts - 1; i++) {
      const p1 = points[i];
      const p2 = points[i+1];
      
      const x1 = p1.x * size;
      const y1 = (1 - p1.y) * size;
      const x2 = p2.x * size;
      const y2 = (1 - p2.y) * size;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      
      if (colorScheme === 'monochrome') {
        ctx.strokeStyle = '#94a3b8'; // slate-400
      } else if (colorScheme === 'spectrum') {
        const hue = (i / points.length) * 300;
        ctx.strokeStyle = `hsl(${hue}, 80%, 60%)`;
      } else if (colorScheme === 'quadrant') {
        const q = Math.floor((i / points.length) * 4);
        const colors = ['#f87171', '#60a5fa', '#34d399', '#fbbf24'];
        ctx.strokeStyle = colors[q];
      }
      ctx.stroke();
    }
    
    // Draw current hover point
    if (hoverPos) {
      const px = hoverPos.x * size;
      const py = (1 - hoverPos.y) * size;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
  }, [n, points, progress, showGrid, showQuadrants, showAnnotations, colorScheme, hoverPos]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - ((e.clientY - rect.top) / rect.height);
    
    // Find closest point
    let minDist = Infinity;
    let closestIdx = 0;
    points.forEach((p, i) => {
      if (i > progress * points.length) return;
      const dist = (p.x - x)**2 + (p.y - y)**2;
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    });
    
    if (minDist < 0.05) {
      setHoverPos({
        t: closestIdx / (points.length - 1 || 1),
        x: points[closestIdx].x,
        y: points[closestIdx].y
      });
    } else {
      setHoverPos(null);
    }
  };

  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `hilbert-curve-n${n}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleExportSVG = () => {
    const size = 800;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">\n`;
    svg += `<rect width="${size}" height="${size}" fill="#0f172a" />\n`;
    
    const drawPts = Math.floor(progress * points.length);
    let currentPath = '';
    
    for (let i = 0; i < drawPts - 1; i++) {
      const p1 = points[i];
      const p2 = points[i+1];
      const x1 = p1.x * size;
      const y1 = (1 - p1.y) * size;
      const x2 = p2.x * size;
      const y2 = (1 - p2.y) * size;
      
      let stroke = '#94a3b8';
      if (colorScheme === 'spectrum') {
        const hue = (i / points.length) * 300;
        stroke = `hsl(${hue}, 80%, 60%)`;
      } else if (colorScheme === 'quadrant') {
        const q = Math.floor((i / points.length) * 4);
        const colors = ['#f87171', '#60a5fa', '#34d399', '#fbbf24'];
        stroke = colors[q];
      }
      
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${Math.max(1, 4 - n * 0.4)}" stroke-linecap="round" />\n`;
    }
    
    svg += `</svg>`;
    const blob = new Blob([svg], {type: 'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hilbert-curve-n${n}.svg`;
    link.click();
  };

  const metrics = {
    cells: Math.pow(4, n),
    segments: Math.pow(4, n) - 1,
    length: (Math.pow(4, n) - 1) / Math.pow(2, n),
  };

  return (
    <div className="min-h-screen p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
      <div className="lg:col-span-2 flex flex-col gap-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Hilbert Curve</h1>
          <p className="text-slate-400">Continuous Surjection from [0,1] to [0,1]²</p>
        </header>
        
        <div className="bg-slate-800 rounded-xl p-4 shadow-xl border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden group">
          <canvas
            ref={canvasRef}
            width={800}
            height={800}
            className="w-full max-w-[600px] aspect-square bg-slate-900 rounded-lg shadow-inner cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverPos(null)}
          />
          
          {hoverPos && (
            <div className="absolute top-6 left-6 bg-slate-900/90 text-xs px-3 py-2 rounded-md border border-slate-700 backdrop-blur-sm shadow-lg pointer-events-none flex flex-col gap-1">
              <span className="text-indigo-400 font-mono">t = {hoverPos.t.toFixed(4)}</span>
              <span className="text-slate-300 font-mono">x = {hoverPos.x.toFixed(4)}</span>
              <span className="text-slate-300 font-mono">y = {hoverPos.y.toFixed(4)}</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-4">
          <button onClick={handleExportPNG} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors border border-slate-700">
            <Download size={18} /> Export PNG
          </button>
          <button onClick={handleExportSVG} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors border border-slate-700">
            <Download size={18} /> Export SVG
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-6">
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700/50">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Settings size={20} className="text-indigo-400" /> Controls
          </h2>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">Stage (n = {n})</label>
              </div>
              <input 
                type="range" 
                min="1" max="7" 
                value={n} 
                onChange={(e) => {
                  setN(parseInt(e.target.value));
                  if (!animated) setProgress(1);
                }}
                className="w-full accent-indigo-500"
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">Animation Progress</label>
                <span className="text-xs text-slate-500 font-mono">{(progress * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setIsPlaying(!isPlaying);
                    if (progress >= 1) setProgress(0);
                  }}
                  className="p-2 rounded-full bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <input 
                  type="range" 
                  min="0" max="1" step="0.001"
                  value={progress} 
                  onChange={(e) => {
                    setProgress(parseFloat(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-slate-700/50">
              <label className="text-sm font-medium text-slate-300">Overlays</label>
              <label className="flex items-center gap-3 text-sm text-slate-400 hover:text-slate-200 cursor-pointer">
                <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-indigo-500" />
                Grid (2^n x 2^n)
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-400 hover:text-slate-200 cursor-pointer">
                <input type="checkbox" checked={showQuadrants} onChange={e => setShowQuadrants(e.target.checked)} className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-indigo-500" />
                Primary Quadrants
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-400 hover:text-slate-200 cursor-pointer">
                <input type="checkbox" checked={showAnnotations} onChange={e => setShowAnnotations(e.target.checked)} className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-indigo-500" />
                Transform Annotations
              </label>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-slate-700/50">
              <label className="text-sm font-medium text-slate-300">Color Scheme</label>
              <select 
                value={colorScheme} 
                onChange={e => setColorScheme(e.target.value as ColorScheme)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="spectrum">Arc-length Spectrum</option>
                <option value="quadrant">Quadrant Groups</option>
                <option value="monochrome">Academic Slate</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700/50 flex flex-col gap-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Info size={20} className="text-indigo-400" /> Mathematical Details
          </h2>
          <div className="text-sm text-slate-400 space-y-3 leading-relaxed">
            <p>
              This construction of David Hilbert's space-filling curve (1891) famously demonstrates a continuous surjection from the unit interval <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300">[0,1]</code> onto the unit square <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300">[0,1]²</code>.
            </p>
            <p className="italic text-slate-500 border-l-2 border-slate-700 pl-3 py-1">
              As presented in "Mathematics Through the Eyes of Faith" (James Bradley and Russell Howell, pp. 67–68) exploring infinity and dimension.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
              <div className="text-xs text-slate-500 mb-1">Cells / Quadrants</div>
              <div className="text-lg font-mono text-slate-200">{metrics.cells.toLocaleString()}</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
              <div className="text-xs text-slate-500 mb-1">Path Segments</div>
              <div className="text-lg font-mono text-slate-200">{metrics.segments.toLocaleString()}</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
              <div className="text-xs text-slate-500 mb-1">Total Path Length</div>
              <div className="text-lg font-mono text-slate-200">{metrics.length.toFixed(4)}</div>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
              <div className="text-xs text-slate-500 mb-1">Hausdorff Dim</div>
              <div className="text-lg font-mono text-slate-200">D = 2</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App;

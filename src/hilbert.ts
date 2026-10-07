export type Point = { x: number; y: number };

// Maps the linear index (0 to 4^n - 1) to a coordinate on the [0, 1]x[0, 1] square.
// Standard orientation: 
// d=0: (0,0) [BL]
// d=1: (0,1) [TL]
// d=2: (1,1) [TR]
// d=3: (1,0) [BR]
export function d2xy(n: number, d: number): Point {
  let x = 0;
  let y = 0;
  let t = d;
  
  for (let s = 1; s < (1 << n); s *= 2) {
    const rx = 1 & (t / 2);
    const ry = 1 & (t ^ rx);
    
    // Rotate/Flip
    if (ry === 0) {
      if (rx === 1) {
        x = s - 1 - x;
        y = s - 1 - y;
      }
      // Swap x and y
      const temp = x;
      x = y;
      y = temp;
    }
    
    x += s * rx;
    y += s * ry;
    t = Math.floor(t / 4);
  }
  
  const size = (1 << n);
  // We want the coordinates to be centered in each cell, so we add 0.5 and divide by size
  return {
    x: (x + 0.5) / size,
    y: (y + 0.5) / size
  };
}

export function generateHilbertCurve(n: number): Point[] {
  const points: Point[] = [];
  const numPoints = 1 << (2 * n);
  for (let d = 0; d < numPoints; d++) {
    points.push(d2xy(n, d));
  }
  return points;
}

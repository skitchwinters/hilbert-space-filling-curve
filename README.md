# Hilbert Space-Filling Curve Visualizer

An interactive mathematical visualization of the Hilbert Curve construction featured in ***Mathematics Through the Eyes of Faith*** (by James Bradley & Russell Howell, pp. 67–68).

Designed for mathematics pedagogy and research demonstrations at Jessup University.

---

## Mathematical Background

In 1890, Giuseppe Peano stunned the mathematical community by demonstrating the existence of a continuous surjective map from the unit interval $[0, 1]$ onto the unit square $[0, 1]^2$. In 1891, David Hilbert gave a geometric, recursive construction based on quadrant subdivision.

### Construction Steps (MTEF pp. 67–68)
1. **Base Case ($n = 1$)**: Divide the unit square into 4 quadrants (Bottom-Left, Top-Left, Top-Right, Bottom-Right). Connect the centers of the quadrants with three line segments forming an upside-down 'U' ($\sqcap$):
   $$\left(\frac{1}{4}, \frac{1}{4}\right) \longrightarrow \left(\frac{1}{4}, \frac{3}{4}\right) \longrightarrow \left(\frac{3}{4}, \frac{3}{4}\right) \longrightarrow \left(\frac{3}{4}, \frac{1}{4}\right)$$
2. **Inductive Step ($n \to n+1$)**:
   - Scale down the motif from stage $n$ by a factor of 2 in each coordinate (area reduced to $\frac{1}{4}$).
   - **Bottom-Left (BL)**: Rotated $90^\circ$ clockwise.
   - **Top-Left (TL)**: Unaltered orientation (Identity).
   - **Top-Right (TR)**: Unaltered orientation (Identity).
   - **Bottom-Right (BR)**: Rotated $90^\circ$ counter-clockwise.
   - Connect the terminating endpoints across adjacent quadrants with bridging line segments to form a single continuous, non-self-intersecting path starting in the BL quadrant and terminating in the BR quadrant.

### Limiting Properties
- **Total Points / Subdivisions**: $4^n$
- **Total Line Segments**: $4^n - 1$
- **Total Path Length**: $L_n = \frac{4^n - 1}{2^n} \xrightarrow{n \to \infty} \infty$
- **Hausdorff Dimension**: $\dim_H = 2$
- **Uniform Convergence**: The sequence of continuous functions $f_n: [0, 1] \to [0, 1]^2$ converges uniformly to a continuous space-filling limit curve $f \in C([0, 1], [0, 1]^2)$.

---

## Features
- **Interactive Stage Slider & Stepper**: Visualize stages $n = 1$ through $7$ ($4$ to $16,384$ vertices).
- **Continuous Parameter Tracer**: Scrub or animate parameter $t \in [0, 1]$ along the curve.
- **Overlay Options**: Toggle $2^n \times 2^n$ subgrids, quadrant division axes, start/end nodes, and quadrant orientation labels ($90^\circ\text{ CW}$, $\text{Identity}$, $90^\circ\text{ CCW}$).
- **Color Modes**: Continuous arc spectrum (rainbow), 4-quadrant partition colors, and academic slate monochrome.
- **Coordinate Inspector**: Real-time cursor readout of parameter $t$, coordinate $(x, y)$, and discrete vertex index.
- **High-Res Export**: Download high-resolution PNG ($2000 \times 2000$) or scalable SVG files for lecture slides and publications.

---

## Quick Start (Zero-Setup Preview)
Open `standalone.html` directly in any web browser (Chrome, Edge, Safari, Firefox). No Node.js or installation required!

```powershell
Start-Process "c:\Users\skitc\Antigravity\projects\Jessup\hilbert-curve-app\standalone.html"
```

---

## Local Development (React + Vite)
```bash
cd hilbert-curve-app
npm install
npm run dev
```

---

## Deploy to Vercel

### Option A: 1-Click via GitHub (Recommended)
1. Create a remote GitHub repository using the GitHub CLI:
   ```powershell
   gh repo create hilbert-space-filling-curve --public --source=. --remote=origin --push
   ```
2. In [Vercel](https://vercel.com/new), select **Import Git Repository**, choose `hilbert-space-filling-curve`, and click **Deploy**. Vercel will automatically detect the Vite preset and deploy immediately.

### Option B: Vercel CLI
```bash
npx vercel
```
Follow the interactive prompts to link and deploy. For production:
```bash
npx vercel --prod
```

---

## References
1. Bradley, James, and Russell Howell. *Mathematics Through the Eyes of Faith*. HarperOne, 2012.
2. Hilbert, David. "Über die stetige Abbildung einer Linie auf ein Flächenstück." *Mathematische Annalen*, vol. 38, no. 3, 1891, pp. 459–460.
3. Sagan, Hans. *Space-Filling Curves*. Springer-Verlag New York, Universitext, 1994.

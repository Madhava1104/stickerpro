# StickerPro Studio 🎨📐

> **Industrial-Grade Sticker Sheet Layout Simulator, Nesting Optimizer & Commercial Print Shop Estimator.**

[![Live Web App](https://img.shields.io/badge/Live%20Website-stickerpro.yashikaprints.store-2563EB?style=for-the-badge&logo=google-chrome&logoColor=white)](https://stickerpro.yashikaprints.store)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

StickerPro Studio is a high-precision, browser-based digital press sheet imposing and yield optimization application designed for commercial print shops, digital label converters, sign-makers, and vinyl sticker producers. It maximizes paper stock utilization using advanced combinatorial nesting algorithms, simulates realistic vinyl material finishes, renders dual cut contour lines (kiss-cut & die-cut), calculates exact plotter blade path distances, and estimates net commercial job profitability in real time.

---

## 🚀 Key Features

### 1. High-Precision Combinatorial Nesting Algorithms
- **Auto Best-Yield Engine**: Evaluates all layout permutations simultaneously and selects the highest-density layout.
- **Standard Natural Grid**: Conventional unrotated row-and-column packing.
- **Rotated 90° Grid**: Complete 90° orientation inversion.
- **2-Split Hybrid / Mixed Packing**: Splits the printable zone vertically or horizontally, packing primary orientation stickers in block 1 and filling residual margin strips with rotated stickers.
- **3-Zone Multi-Block Guillotine L-Packing**: Advanced combinatorial algorithm that tests primary standard blocks combined with **both** residual margin zones (right-hand column strip AND bottom-row strip) to eliminate wasted sheet trim.
- **Dual-Axis Hexagonal Honeycomb**: Row-staggered and column-staggered triangular packing for round and hexagonal stickers.
- **True Interlocked Hexagonal Tesselation**: Edge-to-edge geometric interlocking nesting with exact triangular pitch ($P_x = \sqrt{3} \cdot s + g_x, P_y = 1.5 \cdot s + g_y$). Nests vertices directly into crevice rows, delivering **+13% to +25% higher sticker yield** compared to traditional rectangular bounding-box grids.

### 2. Dual Cut Contours (Kiss-Cut & Backing Die-Cut)
- **Vinyl Kiss-Cut (Peel Line)**: Rendered in `#EC4899` Magenta with solid or dashed line options.
- **Backing Die-Cut / PerfCut (Through-Cut)**: Rendered in `#EF4444` Vivid Red with customizable white/clear peel border offset (mm).
- **Multi-Layer Vector SVG Export**: Exports clean vector layers labeled `<g id="CutContour">` and `<g id="KissCut">`, natively compatible with **Roland VersaWorks, Graphtec Cutting Master, Silhouette Studio, Cricut Design Space, and Adobe Illustrator**.

### 3. Live Canvas Material Surface Shaders
Interactive visual simulation of material finishes directly on the HTML5 2D canvas:
- **✨ Gloss White Vinyl**: Specular gradient sheen overlay.
- **🌫️ Matte Vinyl**: Smooth, diffuse, non-reflective face.
- **🌈 Holographic / Rainbow Chrome**: Iridescent rainbow refraction sheen.
- **🏁 Clear / Transparent Vinyl**: Subtle semi-transparency with backing contrast.
- **📦 Natural Kraft Paper**: Earthy, organic cardboard tone.
- **🥇 Brushed Gold Metallic**: Multi-stop metallic golden gradient.

### 4. Plotter Cut Distance & Machine Runtime Calculator
- Computes mathematical perimeter per sticker:
  - **Circle**: $\pi \cdot d$
  - **Oval**: Ramanujan elliptic approximation
  - **Rounded Rectangle**: $2(w+h) - 8r + 2\pi r$
  - **Hexagon**: $6 \cdot s$
- Calculates total linear cut meters per sheet and total job batch meters.
- Estimates plotter cutting run time based on cutter head speed (mm/s) and pen-up transit speed.
- Feeds machine runtime directly into print shop labor costing.

### 5. Commercial Print Shop Profit Estimator
- Configurable unit production costs per sheet:
  - Base stock / vinyl substrate
  - Digital toner / UV ink wear
  - Cold/thermal over-lamination film
  - Plotter blade cut labor
- Multi-currency support: **₹ INR (Indian Rupee)**, **$ USD**, **€ EUR**, **£ GBP**, **AED**.
- Real-time job calculations:
  - Required physical sheets & surplus yield
  - Unit production cost per sticker
  - Total production cost
  - Quoted customer revenue
  - Estimated net profit & margin percentage

### 6. Interactive Inspection HUD & Production Job Ticket
- **Interactive Canvas Hover Badge**: Hovering over any sticker displays an instant HUD tooltip showing sticker index, row/column index, coordinates `(X, Y)` in mm, dimensions, and cut perimeter.
- **Sheet Production Job Slug**: Automatic machine slug printed in sheet margin outside the printable area (`Job ID`, `Client Name`, `Sheet Dimensions`, `Yield Count`, `Cut Runtime`, `Date`).
- **Production Work Order Modal**: 1-click print-ready job ticket dialog detailing complete paper specifications, cut lengths, and cost breakdowns for machine operators.

### 7. Browser LocalStorage Auto-Persistence & 1-Click Factory Reset
- All user adjustments (custom dimensions, spacing gutters, bleeds, paper presets, material finishes, cutter speeds, and pricing rates) are automatically saved to `localStorage`.
- Automatically restores exact application state on page refresh or browser restart.
- An **Auto-Saved** indicator confirms data persistence in real time.
- **Reset Defaults** button in the header bar allows reverting to clean factory defaults with one click.

---

## 📁 Project Structure

```text
sticker_counter/
├── index.html          # Main application structure, control sidebar & canvas viewport
├── css/
│   └── style.css       # Complete dark/light/slate/blueprint themes & layout styles
├── js/
│   ├── app.js          # Master controller, two-way data-binding & storage persistence
│   ├── calculator.js   # Precision layout nesting algorithms & geometry calculation engine
│   ├── canvas.js       # High-DPI 2D canvas renderer, material shaders & hover hit-testing
│   ├── export.js       # Multi-layer SVG cut file, 300 DPI PNG & 1:1 print generator
│   └── presets.js      # Paper sheets, printable area definitions & sticker shape presets
├── server.js           # Lightweight zero-dependency Node.js HTTP web server
├── package.json        # Project metadata & npm scripts
└── README.md           # Project documentation
```

---

## ⚡ Quickstart & Running Locally

### 🌐 Live Production Application
You can use the app instantly in your browser without any installation:  
👉 **[https://stickerpro.yashikaprints.store](https://stickerpro.yashikaprints.store)**

### Prerequisites
- [Node.js](https://nodejs.org/) (version 16 or higher recommended).

### 1. Install & Start
Clone or navigate into the project directory and run:

```bash
# Start with Node.js
node server.js

# Or using npm
npm start
```

### 2. Access the Application
Open your web browser and navigate to:
```
http://localhost:1234
```

### 3. Custom Port Configuration
You can specify a custom port in two ways:

```bash
# Via command-line argument:
node server.js 3000

# Via environment variable:
PORT=8080 node server.js
```

If the requested port is already in use by another service, `server.js` automatically increments the port number and binds to the next available port.

---

## 🖨️ Production Export Workflow

1. **Vector Cut Files (SVG)**:
   - Click **SVG Cuts** in the top bar to download a millimeter-scale vector SVG.
   - SVG layers are cleanly separated into `KissCut` and `CutContour` for automatic tool mapping in vinyl cutter RIP software (e.g. Roland VersaWorks, Graphtec Cutting Master, Summa WinPlot).
2. **High-Res Proof (300 DPI PNG)**:
   - Click **300 DPI PNG** to export a print-resolution raster image of the sheet layout including bleed boundaries and material finish effects.
3. **1:1 Scale Millimeter Direct Print**:
   - Click **1:1 Print Sheet** to launch browser direct print matching exact millimeter sheet dimensions without scaling or distortion.

---

## 🛠️ Supported Presets

### Paper Sheet Presets
- **13" × 19" Super A3 / Plus** (Digital Production Press)
- **SRA3** (320 × 450 mm)
- **A3** (297 × 420 mm)
- **A4** (210 × 297 mm)
- **A5** (148 × 210 mm)
- **Tabloid / Ledger** (11" × 17")
- **Letter** (8.5" × 11")
- **Legal** (8.5" × 14")
- **Custom Dimensions** (User-defined Width × Height)

### Sticker Shapes
- **Circle** (Diameter)
- **Square** (Equal width & height)
- **Rectangle** (Independent width & height)
- **Round Rect** (Custom corner radius in mm)
- **Oval** (Horizontal/vertical ellipse)
- **Hexagon** (Interlocking regular hexagon)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

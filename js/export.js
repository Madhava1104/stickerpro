class ExportManager {
  
  static downloadPNG(renderer, filename = 'sticker_sheet_layout.png', dpi = 300) {
    const dataUrl = renderer.exportHighResPNG(dpi);
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static downloadSVG(layoutData, settings, filename = 'sticker_sheet_cutlines.svg') {
    if (!layoutData) return;

    const pw = layoutData.paper.width;
    const ph = layoutData.paper.height;
    const pa = layoutData.printableArea;
    const bleed = layoutData.stickerConfig.bleed || 0;
    const dieCutOffset = layoutData.stickerConfig.dieCutOffset || settings.dieCutOffset || 0;

    const kissColor = settings.kissCutColor || '#ec4899';
    const dieColor = settings.dieCutColor || '#ef4444';
    const bleedColor = settings.bleedLineColor || '#10b981';
    const bracketColor = settings.bracketColor || '#2563eb';

    let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${pw}mm" height="${ph}mm" viewBox="0 0 ${pw} ${ph}">\n`;
    svg += `  <style>\n`;
    svg += `    .paper-border { fill: #ffffff; stroke: #94a3b8; stroke-width: 0.25; }\n`;
    svg += `    .printable-bracket { stroke: ${bracketColor}; stroke-width: 0.5; fill: none; }\n`;
    svg += `    .kiss-cut { stroke: ${kissColor}; stroke-width: 0.3; stroke-dasharray: 1.5,1; fill: none; }\n`;
    svg += `    .die-cut { stroke: ${dieColor}; stroke-width: 0.35; fill: none; }\n`;
    svg += `    .cut-line { stroke: ${settings.cutLineColor || '#ef4444'}; stroke-width: 0.35; fill: none; }\n`;
    svg += `    .bleed-line { stroke: ${bleedColor}; stroke-width: 0.2; stroke-dasharray: 1,1; fill: none; }\n`;
    svg += `    .plotter-mark { fill: #000000; stroke: #000000; stroke-width: 0.2; }\n`;
    svg += `    .sticker-num { font-family: sans-serif; font-size: 2.8px; fill: #475569; text-anchor: middle; dominant-baseline: central; }\n`;
    svg += `    .slug-text { font-family: monospace; font-size: 2.2px; fill: #64748b; }\n`;
    svg += `  </style>\n\n`;

    svg += `  <!-- Sheet Layer -->\n`;
    svg += `  <g id="layer-paper" inkscape:label="Paper Sheet">\n`;
    svg += `    <rect class="paper-border" x="0" y="0" width="${pw}" height="${ph}" />\n`;
    svg += `  </g>\n\n`;

    if (settings.showPrintableArea) {
      svg += `  <!-- Printable Zone & Angle Brackets -->\n`;
      svg += `  <g id="layer-printable-zone" inkscape:label="Printable Area">\n`;
      const bLen = Math.min(settings.bracketLength || 10, pa.width / 4, pa.height / 4);
      const px = pa.x;
      const py = pa.y;
      const pw_a = pa.width;
      const ph_a = pa.height;

      svg += `    <rect x="${px}" y="${py}" width="${pw_a}" height="${ph_a}" fill="none" stroke="${bracketColor}" stroke-width="0.25" stroke-dasharray="2,2" opacity="0.5" />\n`;
      svg += `    <path class="printable-bracket" d="M ${px},${py + bLen} L ${px},${py} L ${px + bLen},${py}" />\n`;
      svg += `    <path class="printable-bracket" d="M ${px + pw_a - bLen},${py} L ${px + pw_a},${py} L ${px + pw_a},${py + bLen}" />\n`;
      svg += `    <path class="printable-bracket" d="M ${px},${py + ph_a - bLen} L ${px},${py + ph_a} L ${px + bLen},${py + ph_a}" />\n`;
      svg += `    <path class="printable-bracket" d="M ${px + pw_a - bLen},${py + ph_a} L ${px + pw_a},${py + ph_a} L ${px + pw_a},${py + ph_a - bLen}" />\n`;
      svg += `  </g>\n\n`;
    }

    if (settings.showBleed && bleed > 0) {
      svg += `  <!-- Bleed Layer -->\n`;
      svg += `  <g id="layer-bleed" inkscape:label="Bleed Guides">\n`;
      layoutData.stickers.forEach(s => {
        const cr = s.cornerRadius || 0;
        svg += `    ${this._getSvgShapeElement(s.shape, s.x - bleed, s.y - bleed, s.width + bleed * 2, s.height + bleed * 2, cr + bleed, 'bleed-line')}\n`;
      });
      svg += `  </g>\n\n`;
    }

    if (settings.showDieCut && dieCutOffset > 0) {
      svg += `  <!-- Die-Cut Contour Layer (PerfCut / Through-Cut) -->\n`;
      svg += `  <g id="CutContour" inkscape:label="Die-Cut (PerfCut)" stroke="${dieColor}">\n`;
      layoutData.stickers.forEach(s => {
        const off = dieCutOffset;
        const cr = (s.cornerRadius || 0) > 0 ? (s.cornerRadius + off) : 0;
        svg += `    ${this._getSvgShapeElement(s.shape, s.x - off, s.y - off, s.width + off * 2, s.height + off * 2, cr, 'die-cut')}\n`;
      });
      svg += `  </g>\n\n`;

      if (settings.showKissCut) {
        svg += `  <!-- Kiss-Cut Contour Layer (Peel Line) -->\n`;
        svg += `  <g id="KissCut" inkscape:label="Kiss-Cut (Peel)" stroke="${kissColor}">\n`;
        layoutData.stickers.forEach(s => {
          svg += `    ${this._getSvgShapeElement(s.shape, s.x, s.y, s.width, s.height, s.cornerRadius || 0, 'kiss-cut')}\n`;
          if (settings.showStickerNumbers) {
            svg += `    <text class="sticker-num" x="${(s.x + s.width / 2).toFixed(2)}" y="${(s.y + s.height / 2).toFixed(2)}">${s.index}</text>\n`;
          }
        });
        svg += `  </g>\n\n`;
      }
    } else {
      svg += `  <!-- Primary Cut Contour Layer -->\n`;
      svg += `  <g id="CutContour" inkscape:label="CutContour" stroke="${settings.cutLineColor || '#ef4444'}">\n`;
      layoutData.stickers.forEach(s => {
        svg += `    ${this._getSvgShapeElement(s.shape, s.x, s.y, s.width, s.height, s.cornerRadius || 0, 'cut-line')}\n`;
        if (settings.showStickerNumbers) {
          svg += `    <text class="sticker-num" x="${(s.x + s.width / 2).toFixed(2)}" y="${(s.y + s.height / 2).toFixed(2)}">${s.index}</text>\n`;
        }
      });
      svg += `  </g>\n\n`;
    }

    if (settings.showPlotterMarks) {
      svg += `  <!-- Vinyl Cutter Registration Marks -->\n`;
      svg += `  <g id="layer-plotter-marks" inkscape:label="Registration Marks">\n`;
      const off = 10;
      const r = 3.5;
      const pts = [
        { x: off, y: off },
        { x: pw - off, y: off },
        { x: off, y: ph - off },
        { x: pw - off, y: ph - off }
      ];
      pts.forEach(p => {
        svg += `    <circle class="plotter-mark" cx="${p.x}" cy="${p.y}" r="${r}" />\n`;
        svg += `    <line x1="${p.x - r * 1.8}" y1="${p.y}" x2="${p.x + r * 1.8}" y2="${p.y}" stroke="#000" stroke-width="0.3" />\n`;
        svg += `    <line x1="${p.x}" y1="${p.y - r * 1.8}" x2="${p.x}" y2="${p.y + r * 1.8}" stroke="#000" stroke-width="0.3" />\n`;
      });
      svg += `  </g>\n\n`;
    }

    if (settings.showJobSlug !== false) {
      svg += `  <!-- Production Job Slug Header -->\n`;
      const dateStr = new Date().toISOString().split('T')[0];
      const slugText = `JOB: ${settings.jobName || 'Sticker Run'} | CLIENT: ${settings.customerName || 'Standard'} | ${pw.toFixed(1)}x${ph.toFixed(1)} mm | YIELD: ${layoutData.stats.count} PCS | ${dateStr}`;
      svg += `  <g id="layer-job-slug" inkscape:label="Job Header">\n`;
      svg += `    <text class="slug-text" x="5" y="${(ph - 4).toFixed(2)}">${slugText}</text>\n`;
      svg += `  </g>\n\n`;
    }

    svg += `</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static _getSvgShapeElement(shape, x, y, w, h, cr, className) {
    if (shape === 'circle') {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = Math.min(w, h) / 2;
      return `<circle class="${className}" cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" />`;
    } else if (shape === 'oval') {
      const cx = x + w / 2;
      const cy = y + h / 2;
      return `<ellipse class="${className}" cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" rx="${(w / 2).toFixed(2)}" ry="${(h / 2).toFixed(2)}" />`;
    } else if (shape === 'hexagon') {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = Math.min(w, h) / 2;
      let points = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        points.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`);
      }
      return `<polygon class="${className}" points="${points.join(' ')}" />`;
    } else if (shape === 'round_rect' && cr > 0) {
      return `<rect class="${className}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="${cr.toFixed(2)}" ry="${cr.toFixed(2)}" />`;
    } else {
      return `<rect class="${className}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" />`;
    }
  }

  static printSheet(layoutData, settings, artworkImage = null) {
    if (!layoutData) return;

    const pw = layoutData.paper.width;
    const ph = layoutData.paper.height;
    const orientation = pw > ph ? 'landscape' : 'portrait';

    const dpmm = 11.811; 
    const offscreen = document.createElement('canvas');
    offscreen.width = Math.round(pw * dpmm);
    offscreen.height = Math.round(ph * dpmm);

    const tempRenderer = new SheetCanvasRenderer(offscreen, {
      ...settings,
      isInteractive: false,
      showRulers: false,
      showGrid: false,
      paperShadow: false,
      paperColor: '#ffffff'
    });
    tempRenderer.layoutData = layoutData;
    tempRenderer.scale = dpmm;
    tempRenderer.panX = 0;
    tempRenderer.panY = 0;
    tempRenderer.artworkImage = artworkImage;
    tempRenderer.artworkLoaded = !!artworkImage;
    tempRenderer.render();

    const dataUrl = offscreen.toDataURL('image/png', 1.0);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to use the direct print feature.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print Sticker Sheet (${pw.toFixed(1)} × ${ph.toFixed(1)} mm)</title>
        <style>
          @page {
            size: ${pw}mm ${ph}mm ${orientation};
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            width: ${pw}mm;
            height: ${ph}mm;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #ffffff;
          }
          img.print-sheet {
            width: ${pw}mm;
            height: ${ph}mm;
            display: block;
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
          }
        </style>
      </head>
      <body>
        <img class="print-sheet" src="${dataUrl}" onload="window.focus(); window.print(); window.close();" />
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}

if (typeof window !== 'undefined') {
  window.ExportManager = ExportManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ExportManager };
}

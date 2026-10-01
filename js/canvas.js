class SheetCanvasRenderer {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    this.scale = 1; 
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.dpr = window.devicePixelRatio || 1;

    this.artworkImage = null;
    this.artworkLoaded = false;

    this.hoveredSticker = null;
    this.onHoverSticker = null;

    this.settings = {
      
      canvasTheme: 'dark', 
      customCanvasBg: '#12141a',
      paperColor: '#ffffff',
      paperShadow: true,

      materialFinish: 'gloss',

      showPrintableArea: true,
      printableBorderColor: 'rgba(59, 130, 246, 0.45)', 
      printableFillColor: 'rgba(59, 130, 246, 0.03)',
      showAngleBrackets: true,
      bracketLength: 12, 
      bracketThickness: 2, 
      bracketColor: '#2563eb', 
      bracketStyle: 'corner', 

      showKissCut: true,
      kissCutColor: '#ec4899', 
      kissCutLineWidth: 1.2,
      kissCutStyle: 'dashed', 

      showDieCut: true,
      dieCutColor: '#ef4444', 
      dieCutLineWidth: 1.5,
      dieCutStyle: 'solid',
      dieCutOffset: 2.5, 

      artworkFit: 'contain',
      artworkScale: 1.0,
      artworkOffsetX: 0,
      artworkOffsetY: 0, 

      stickerFillColor: '#ffffff',
      stickerFillOpacity: 0.95,
      cutLineColor: '#ef4444', 
      cutLineWidth: 1.5,
      cutLineStyle: 'solid',

      showBleed: true,
      bleedLineColor: '#10b981', 
      bleedLineWidth: 1, 
      bleedLineStyle: 'dashed',

      showStickerNumbers: true,
      numberColor: '#334155',
      numberFontSize: 10, 
      showDimensions: true,
      dimensionColor: '#64748b',
      dimensionFontSize: 9, 
      showRulers: true,
      showCenterCrosshair: false,
      showGrid: false,
      showPlotterMarks: false, 
      plotterMarkType: 'quad_circles', 

      showJobSlug: true,
      jobName: 'Sticker Batch #1',
      customerName: 'Standard Print Client',

      ...options
    };

    this.layoutData = null;
    this._initEvents();
  }

  _initEvents() {
    const el = this.canvas;

    el.addEventListener('mousedown', (e) => {
      if (e.button === 0 || e.button === 1) {
        this.isPanning = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        el.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        const dx = (e.clientX - this.lastMouseX) * this.dpr;
        const dy = (e.clientY - this.lastMouseY) * this.dpr;
        this.panX += dx;
        this.panY += dy;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.render();
      } else {
        
        const rect = el.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const mouseCanvasX = (e.clientX - rect.left) * this.dpr;
          const mouseCanvasY = (e.clientY - rect.top) * this.dpr;

          const mouseMmX = (mouseCanvasX - this.panX) / this.scale;
          const mouseMmY = (mouseCanvasY - this.panY) / this.scale;

          const prev = this.hoveredSticker;
          this.hoveredSticker = this._findStickerAt(mouseMmX, mouseMmY);

          if (this.hoveredSticker !== prev) {
            this.render();
            if (this.onHoverSticker) {
              this.onHoverSticker(this.hoveredSticker, e.clientX, e.clientY);
            }
          }
        }
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        el.style.cursor = 'crosshair';
      }
    });

    el.addEventListener('mouseleave', () => {
      if (this.hoveredSticker) {
        this.hoveredSticker = null;
        this.render();
        if (this.onHoverSticker) {
          this.onHoverSticker(null);
        }
      }
    });

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseCanvasX = (e.clientX - rect.left) * this.dpr;
      const mouseCanvasY = (e.clientY - rect.top) * this.dpr;

      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const newScale = Math.min(Math.max(this.scale * zoomFactor, 0.15), 15);

      this.panX = mouseCanvasX - (mouseCanvasX - this.panX) * (newScale / this.scale);
      this.panY = mouseCanvasY - (mouseCanvasY - this.panY) * (newScale / this.scale);
      this.scale = newScale;

      this.render();
    }, { passive: false });

    let touchStartDist = 0;
    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isPanning = true;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        this.isPanning = false;
        touchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });

    el.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && this.isPanning) {
        const dx = (e.touches[0].clientX - this.lastMouseX) * this.dpr;
        const dy = (e.touches[0].clientY - this.lastMouseY) * this.dpr;
        this.panX += dx;
        this.panY += dy;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
        this.render();
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const zoom = dist / touchStartDist;
        touchStartDist = dist;
        this.scale = Math.min(Math.max(this.scale * zoom, 0.15), 15);
        this.render();
      }
    }, { passive: false });

    el.addEventListener('touchend', () => {
      this.isPanning = false;
    });

    const resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
      this.render();
    });
    resizeObserver.observe(el.parentElement || el);
  }

  _findStickerAt(xMm, yMm) {
    if (!this.layoutData || !this.layoutData.stickers) return null;
    return this.layoutData.stickers.find(s => {
      if (s.shape === 'circle') {
        const cx = s.x + s.width / 2;
        const cy = s.y + s.height / 2;
        const r = Math.min(s.width, s.height) / 2;
        return Math.hypot(xMm - cx, yMm - cy) <= r;
      } else if (s.shape === 'oval') {
        const cx = s.x + s.width / 2;
        const cy = s.y + s.height / 2;
        const rx = s.width / 2;
        const ry = s.height / 2;
        if (rx <= 0 || ry <= 0) return false;
        return (((xMm - cx) ** 2) / (rx ** 2) + ((yMm - cy) ** 2) / (ry ** 2)) <= 1;
      }
      return xMm >= s.x && xMm <= (s.x + s.width) && yMm >= s.y && yMm <= (s.y + s.height);
    }) || null;
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    const width = parent ? parent.clientWidth : 800;
    const height = parent ? parent.clientHeight : 600;

    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  setLayoutData(data) {
    this.layoutData = data;
    this.render();
  }

  updateSettings(newSettings) {
    Object.assign(this.settings, newSettings);
    this.render();
  }

  setArtwork(imgElementOrUrl) {
    if (!imgElementOrUrl) {
      this.artworkImage = null;
      this.artworkLoaded = false;
      this.render();
      return;
    }

    if (typeof imgElementOrUrl === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.artworkImage = img;
        this.artworkLoaded = true;
        this.render();
      };
      img.src = imgElementOrUrl;
    } else {
      this.artworkImage = imgElementOrUrl;
      this.artworkLoaded = true;
      this.render();
    }
  }

  fitToScreen(padding = 50) {
    if (!this.layoutData) return;
    this.resizeCanvas();

    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    const paperW_mm = this.layoutData.paper.width;
    const paperH_mm = this.layoutData.paper.height;

    const availableW = canvasW - (padding * 2 * this.dpr);
    const availableH = canvasH - (padding * 2 * this.dpr);

    const scaleX = availableW / paperW_mm;
    const scaleY = availableH / paperH_mm;
    this.scale = Math.min(scaleX, scaleY);

    const paperPixelW = paperW_mm * this.scale;
    const paperPixelH = paperH_mm * this.scale;

    this.panX = (canvasW - paperPixelW) / 2;
    this.panY = (canvasH - paperPixelH) / 2;

    this.render();
  }

  setActualScale() {
    if (!this.layoutData) return;
    this.scale = 3.7795 * this.dpr; 
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    const paperPixelW = this.layoutData.paper.width * this.scale;
    const paperPixelH = this.layoutData.paper.height * this.scale;

    this.panX = (canvasW - paperPixelW) / 2;
    this.panY = (canvasH - paperPixelH) / 2;
    this.render();
  }

  zoomIn() {
    this.scale = Math.min(this.scale * 1.25, 15);
    this.render();
  }

  zoomOut() {
    this.scale = Math.max(this.scale * 0.8, 0.15);
    this.render();
  }

  resetView() {
    this.fitToScreen();
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this._drawBackground(ctx, w, h);

    if (!this.layoutData) return;

    ctx.save();
    ctx.translate(this.panX, this.panY);

    this._drawPaperSheet(ctx);

    if (this.settings.showPrintableArea) {
      this._drawPrintableZone(ctx);
    }

    if (this.settings.showPlotterMarks) {
      this._drawPlotterMarks(ctx);
    }

    this._drawStickers(ctx);

    if (this.settings.showDimensions) {
      this._drawDimensions(ctx);
    }

    if (this.settings.showJobSlug) {
      this._drawJobSlug(ctx);
    }

    ctx.restore();

    if (this.settings.showRulers) {
      this._drawRulers(ctx, w, h);
    }
  }

  _drawBackground(ctx, w, h) {
    let bg = this.settings.customCanvasBg;
    if (this.settings.canvasTheme === 'dark') bg = '#0f172a';
    else if (this.settings.canvasTheme === 'light') bg = '#e2e8f0';
    else if (this.settings.canvasTheme === 'slate') bg = '#1e293b';
    else if (this.settings.canvasTheme === 'blueprint') bg = '#0c4a6e';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    if (this.settings.showGrid) {
      ctx.save();
      ctx.strokeStyle = this.settings.canvasTheme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      const gridSize = 25 * this.dpr;
      ctx.beginPath();
      for (let x = 0; x < w; x += gridSize) {
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.moveTo(0, y); ctx.lineTo(w, y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  _drawPaperSheet(ctx) {
    const pw = this.layoutData.paper.width * this.scale;
    const ph = this.layoutData.paper.height * this.scale;

    if (this.settings.paperShadow) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 24 * this.dpr;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10 * this.dpr;
      ctx.fillStyle = this.settings.paperColor;
      ctx.fillRect(0, 0, pw, ph);
      ctx.restore();
    } else {
      ctx.fillStyle = this.settings.paperColor;
      ctx.fillRect(0, 0, pw, ph);
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, pw, ph);
    ctx.restore();
  }

  _drawPrintableZone(ctx) {
    const pa = this.layoutData.printableArea;
    const px = pa.x * this.scale;
    const py = pa.y * this.scale;
    const pw = pa.width * this.scale;
    const ph = pa.height * this.scale;

    if (this.settings.printableFillColor) {
      ctx.save();
      ctx.fillStyle = this.settings.printableFillColor;
      ctx.fillRect(px, py, pw, ph);
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = this.settings.printableBorderColor;
    ctx.lineWidth = 1.2 * this.dpr;
    ctx.setLineDash([6 * this.dpr, 4 * this.dpr]);
    ctx.strokeRect(px, py, pw, ph);
    ctx.restore();

    if (this.settings.showAngleBrackets) {
      this._drawAngleBrackets(ctx, px, py, pw, ph);
    }
  }

  _drawAngleBrackets(ctx, x, y, w, h) {
    const len = this.settings.bracketLength * this.scale;
    const actualLen = Math.min(len, w / 3, h / 3);
    const color = this.settings.bracketColor;
    const thick = this.settings.bracketThickness * this.dpr;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = thick;
    ctx.lineCap = 'square';
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(x, y + actualLen);
    ctx.lineTo(x, y);
    ctx.lineTo(x + actualLen, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + w - actualLen, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + actualLen);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y + h - actualLen);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + actualLen, y + h);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + w - actualLen, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - actualLen);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = `600 ${Math.max(9, 10 * this.dpr)}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillText(`Print Area: ${this.layoutData.printableArea.width.toFixed(1)} × ${this.layoutData.printableArea.height.toFixed(1)} mm`, x + 4, y - 6);
    ctx.restore();
  }

  _drawPlotterMarks(ctx) {
    const pw = this.layoutData.paper.width * this.scale;
    const ph = this.layoutData.paper.height * this.scale;
    const offset = 10 * this.scale;
    const r = 3.5 * this.scale;

    const points = [
      { x: offset, y: offset },
      { x: pw - offset, y: offset },
      { x: offset, y: ph - offset },
      { x: pw - offset, y: ph - offset }
    ];

    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5 * this.dpr;

    points.forEach(pt => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(pt.x - r * 1.8, pt.y);
      ctx.lineTo(pt.x + r * 1.8, pt.y);
      ctx.moveTo(pt.x, pt.y - r * 1.8);
      ctx.lineTo(pt.x, pt.y + r * 1.8);
      ctx.stroke();
    });
    ctx.restore();
  }

  _drawStickers(ctx) {
    const stickers = this.layoutData.stickers;
    const bleed_mm = this.layoutData.stickerConfig.bleed || 0;
    const bleed_px = bleed_mm * this.scale;
    const material = this.settings.materialFinish || 'gloss';

    stickers.forEach((sticker) => {
      const sx = sticker.x * this.scale;
      const sy = sticker.y * this.scale;
      const sw = sticker.width * this.scale;
      const sh = sticker.height * this.scale;
      const shape = sticker.shape;
      const cr = (sticker.cornerRadius || 0) * this.scale;
      const isHovered = this.hoveredSticker && this.hoveredSticker.index === sticker.index;

      const dieOffsetMm = sticker.dieCutOffset || this.settings.dieCutOffset || 0;
      const dieOffsetPx = dieOffsetMm * this.scale;

      if (this.settings.showBleed && bleed_mm > 0) {
        ctx.save();
        ctx.strokeStyle = this.settings.bleedLineColor;
        ctx.lineWidth = this.settings.bleedLineWidth * this.dpr;
        if (this.settings.bleedLineStyle === 'dashed') {
          ctx.setLineDash([4 * this.dpr, 3 * this.dpr]);
        }
        this._createStickerPath(ctx, sx - bleed_px, sy - bleed_px, sw + bleed_px * 2, sh + bleed_px * 2, shape, cr + bleed_px);
        ctx.stroke();
        ctx.restore();
      }

      if (this.settings.showDieCut && dieOffsetPx > 0) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.12)';
        ctx.shadowBlur = 4 * this.dpr;
        this._createStickerPath(ctx, sx - dieOffsetPx, sy - dieOffsetPx, sw + dieOffsetPx * 2, sh + dieOffsetPx * 2, shape, cr + dieOffsetPx);
        ctx.fill();
        ctx.restore();
      }

      this._renderMaterialFace(ctx, sx, sy, sw, sh, shape, cr, material);

      if (this.artworkLoaded && this.artworkImage) {
        this._drawArtwork(ctx, sx, sy, sw, sh, shape, cr, sticker.rotated);
      }

      this._renderMaterialOverlays(ctx, sx, sy, sw, sh, shape, cr, material);

      if (this.settings.showKissCut) {
        ctx.save();
        ctx.strokeStyle = this.settings.kissCutColor || '#ec4899';
        ctx.lineWidth = (this.settings.kissCutLineWidth || 1.2) * this.dpr;
        if (this.settings.kissCutStyle === 'dashed') {
          ctx.setLineDash([3 * this.dpr, 2.5 * this.dpr]);
        }
        this._createStickerPath(ctx, sx, sy, sw, sh, shape, cr);
        ctx.stroke();
        ctx.restore();
      }

      if (this.settings.showDieCut) {
        ctx.save();
        ctx.strokeStyle = this.settings.dieCutColor || '#ef4444';
        ctx.lineWidth = (this.settings.dieCutLineWidth || 1.5) * this.dpr;
        if (this.settings.dieCutStyle === 'dashed') {
          ctx.setLineDash([4 * this.dpr, 3 * this.dpr]);
        }
        const drawX = sx - dieOffsetPx;
        const drawY = sy - dieOffsetPx;
        const drawW = sw + dieOffsetPx * 2;
        const drawH = sh + dieOffsetPx * 2;
        const drawCr = cr > 0 ? (cr + dieOffsetPx) : 0;
        this._createStickerPath(ctx, drawX, drawY, drawW, drawH, shape, drawCr);
        ctx.stroke();
        ctx.restore();
      }

      if (isHovered) {
        ctx.save();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5 * this.dpr;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10 * this.dpr;
        this._createStickerPath(ctx, sx - 2 * this.dpr, sy - 2 * this.dpr, sw + 4 * this.dpr, sh + 4 * this.dpr, shape, cr + 2 * this.dpr);
        ctx.stroke();
        ctx.restore();
      }

      if (this.settings.showStickerNumbers && !this.artworkLoaded) {
        ctx.save();
        ctx.fillStyle = this.settings.numberColor;
        const fontSize = Math.max(8, this.settings.numberFontSize * (this.scale / 3.78) * this.dpr);
        ctx.font = `600 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${sticker.index}`, sx + sw / 2, sy + sh / 2);

        if (sw > 30 * this.dpr && sh > 30 * this.dpr) {
          ctx.font = `400 ${fontSize * 0.65}px 'Plus Jakarta Sans', sans-serif`;
          ctx.fillStyle = this.settings.dimensionColor;
          ctx.fillText(`R${sticker.row}:C${sticker.col}`, sx + sw / 2, sy + sh / 2 + fontSize * 0.85);
        }
        ctx.restore();
      }
    });
  }

  _renderMaterialFace(ctx, x, y, w, h, shape, cr, material) {
    ctx.save();
    this._createStickerPath(ctx, x, y, w, h, shape, cr);

    if (material === 'clear') {
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fill();
    } else if (material === 'kraft') {
      
      ctx.fillStyle = '#d4a373';
      ctx.fill();
    } else if (material === 'gold_foil') {
      
      const grad = ctx.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.3, '#eab308');
      grad.addColorStop(0.7, '#ca8a04');
      grad.addColorStop(1, '#a16207');
      ctx.fillStyle = grad;
      ctx.fill();
    } else if (material === 'matte') {
      
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
    } else {
      
      ctx.fillStyle = this.settings.stickerFillColor || '#ffffff';
      ctx.globalAlpha = this.settings.stickerFillOpacity || 0.95;
      ctx.fill();
    }
    ctx.restore();
  }

  _renderMaterialOverlays(ctx, x, y, w, h, shape, cr, material) {
    if (material === 'holographic') {
      
      ctx.save();
      this._createStickerPath(ctx, x, y, w, h, shape, cr);
      ctx.clip();

      const holoGrad = ctx.createLinearGradient(x, y, x + w, y + h);
      holoGrad.addColorStop(0.0, 'rgba(255, 0, 128, 0.25)');
      holoGrad.addColorStop(0.25, 'rgba(0, 240, 255, 0.3)');
      holoGrad.addColorStop(0.5, 'rgba(255, 230, 0, 0.25)');
      holoGrad.addColorStop(0.75, 'rgba(50, 255, 100, 0.3)');
      holoGrad.addColorStop(1.0, 'rgba(180, 0, 255, 0.25)');

      ctx.fillStyle = holoGrad;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    } else if (material === 'gloss') {
      
      ctx.save();
      this._createStickerPath(ctx, x, y, w, h, shape, cr);
      ctx.clip();

      const alpha1 = this.artworkLoaded ? 0.12 : 0.35;
      const alpha2 = this.artworkLoaded ? 0.03 : 0.08;
      const glossGrad = ctx.createLinearGradient(x, y, x + w * 0.6, y + h * 0.6);
      glossGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha1})`);
      glossGrad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha2})`);
      glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = glossGrad;
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }
  }

  _drawArtwork(ctx, sx, sy, sw, sh, shape, cr, isRotated) {
    if (!this.artworkLoaded || !this.artworkImage) return;

    ctx.save();
    this._createStickerPath(ctx, sx, sy, sw, sh, shape, cr);
    ctx.clip();

    const img = this.artworkImage;
    const imgW = img.naturalWidth || img.width || 1;
    const imgH = img.naturalHeight || img.height || 1;
    const imgAspect = imgW / imgH;

    const fit = this.settings.artworkFit || 'contain';
    const userScale = typeof this.settings.artworkScale === 'number' ? this.settings.artworkScale : 1.0;
    const userOffX = (this.settings.artworkOffsetX || 0) * this.scale;
    const userOffY = (this.settings.artworkOffsetY || 0) * this.scale;

    const boxW = isRotated ? sh : sw;
    const boxH = isRotated ? sw : sh;
    const boxAspect = boxW / boxH;

    let targetW, targetH;

    if (fit === 'contain') {
      if (shape === 'circle') {
        const maxDim = Math.min(boxW, boxH);
        const maxH = maxDim / Math.sqrt(imgAspect * imgAspect + 1);
        targetH = maxH;
        targetW = maxH * imgAspect;
      } else {
        if (imgAspect > boxAspect) {
          targetW = boxW;
          targetH = boxW / imgAspect;
        } else {
          targetH = boxH;
          targetW = boxH * imgAspect;
        }
      }
    } else if (fit === 'cover') {
      if (imgAspect > boxAspect) {
        targetH = boxH;
        targetW = boxH * imgAspect;
      } else {
        targetW = boxW;
        targetH = boxW / imgAspect;
      }
    } else {
      targetW = boxW;
      targetH = boxH;
    }

    targetW *= userScale;
    targetH *= userScale;

    if (isRotated) {
      ctx.translate(sx + sw / 2, sy + sh / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -targetW / 2 + userOffX, -targetH / 2 + userOffY, targetW, targetH);
    } else {
      const drawX = sx + (sw - targetW) / 2 + userOffX;
      const drawY = sy + (sh - targetH) / 2 + userOffY;
      ctx.drawImage(img, drawX, drawY, targetW, targetH);
    }

    ctx.restore();
  }

  _createStickerPath(ctx, x, y, w, h, shape, cornerRadius = 0) {
    ctx.beginPath();
    if (shape === 'circle') {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = Math.min(w, h) / 2;
      ctx.arc(cx, cy, Math.max(0.1, r), 0, Math.PI * 2);
    } else if (shape === 'oval') {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const rx = Math.max(0.1, w / 2);
      const ry = Math.max(0.1, h / 2);
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    } else if (shape === 'hexagon') {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = Math.min(w, h) / 2;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (shape === 'round_rect' && cornerRadius > 0) {
      const r = Math.min(cornerRadius, w / 2, h / 2);
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  _drawDimensions(ctx) {
    const pw = this.layoutData.paper.width * this.scale;
    const ph = this.layoutData.paper.height * this.scale;
    const fontSize = Math.max(9, 10 * this.dpr);

    ctx.save();
    ctx.font = `600 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = this.settings.dimensionColor;
    ctx.textAlign = 'center';

    ctx.fillText(`${this.layoutData.paper.width.toFixed(1)} mm`, pw / 2, -8 * this.dpr);

    ctx.save();
    ctx.translate(-12 * this.dpr, ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`${this.layoutData.paper.height.toFixed(1)} mm`, 0, 0);
    ctx.restore();

    ctx.restore();
  }

  _drawJobSlug(ctx) {
    const ph = this.layoutData.paper.height * this.scale;
    const stats = this.layoutData.stats;
    const dateStr = new Date().toISOString().split('T')[0];
    const text = `JOB: ${this.settings.jobName || 'Sticker Run #1'} | CLIENT: ${this.settings.customerName || 'Standard'} | ${this.layoutData.paper.width.toFixed(1)}×${this.layoutData.paper.height.toFixed(1)} mm | YIELD: ${stats.count} PCS | CUT EST: ${stats.estimatedCutTimeString || 'N/A'} | ${dateStr}`;

    ctx.save();
    ctx.fillStyle = this.settings.dimensionColor || '#64748b';
    ctx.font = `600 ${Math.max(8, 8.5 * this.dpr)}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(text, 6 * this.dpr, ph + 16 * this.dpr);
    ctx.restore();
  }

  _drawRulers(ctx, w, h) {
    const rulerThickness = 20 * this.dpr;
    const tickColor = this.settings.canvasTheme === 'light' ? '#94a3b8' : '#475569';
    const textColor = this.settings.canvasTheme === 'light' ? '#475569' : '#94a3b8';
    const bgColor = this.settings.canvasTheme === 'light' ? 'rgba(241, 245, 249, 0.95)' : 'rgba(15, 23, 42, 0.95)';

    ctx.save();
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, rulerThickness);
    ctx.fillRect(0, 0, rulerThickness, h);

    ctx.strokeStyle = tickColor;
    ctx.fillStyle = textColor;
    ctx.font = `500 ${8 * this.dpr}px 'Plus Jakarta Sans', sans-serif`;
    ctx.lineWidth = 1;

    const startX_mm = -this.panX / this.scale;
    const endX_mm = (w - this.panX) / this.scale;
    const firstTickX = Math.floor(startX_mm / 10) * 10;

    for (let mm = firstTickX; mm <= endX_mm; mm += 10) {
      const screenX = this.panX + mm * this.scale;
      if (screenX < rulerThickness) continue;
      const isMajor = mm % 50 === 0;
      const tickH = isMajor ? rulerThickness * 0.7 : rulerThickness * 0.4;

      ctx.beginPath();
      ctx.moveTo(screenX, rulerThickness - tickH);
      ctx.lineTo(screenX, rulerThickness);
      ctx.stroke();

      if (isMajor) {
        ctx.textAlign = 'center';
        ctx.fillText(`${mm}`, screenX, rulerThickness - tickH - 2);
      }
    }

    const startY_mm = -this.panY / this.scale;
    const endY_mm = (h - this.panY) / this.scale;
    const firstTickY = Math.floor(startY_mm / 10) * 10;

    for (let mm = firstTickY; mm <= endY_mm; mm += 10) {
      const screenY = this.panY + mm * this.scale;
      if (screenY < rulerThickness) continue;
      const isMajor = mm % 50 === 0;
      const tickW = isMajor ? rulerThickness * 0.7 : rulerThickness * 0.4;

      ctx.beginPath();
      ctx.moveTo(rulerThickness - tickW, screenY);
      ctx.lineTo(rulerThickness, screenY);
      ctx.stroke();

      if (isMajor) {
        ctx.save();
        ctx.translate(rulerThickness - tickW - 2, screenY);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText(`${mm}`, 0, 0);
        ctx.restore();
      }
    }

    ctx.fillStyle = this.settings.bracketColor;
    ctx.fillRect(0, 0, rulerThickness, rulerThickness);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${8 * this.dpr}px sans-serif`;
    ctx.fillText('mm', rulerThickness / 2, rulerThickness / 2);

    ctx.restore();
  }

  exportHighResPNG(dpi = 300) {
    if (!this.layoutData) return null;

    const dpmm = dpi / 25.4;
    const exportW = Math.round(this.layoutData.paper.width * dpmm);
    const exportH = Math.round(this.layoutData.paper.height * dpmm);

    const offscreen = document.createElement('canvas');
    offscreen.width = exportW;
    offscreen.height = exportH;

    const tempRenderer = new SheetCanvasRenderer(offscreen, {
      ...this.settings,
      showRulers: false,
      showGrid: false,
      paperShadow: false
    });
    tempRenderer.layoutData = this.layoutData;
    tempRenderer.scale = dpmm;
    tempRenderer.panX = 0;
    tempRenderer.panY = 0;
    tempRenderer.artworkImage = this.artworkImage;
    tempRenderer.artworkLoaded = this.artworkLoaded;

    tempRenderer.render();
    return offscreen.toDataURL('image/png', 1.0);
  }
}

if (typeof window !== 'undefined') {
  window.SheetCanvasRenderer = SheetCanvasRenderer;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SheetCanvasRenderer };
}

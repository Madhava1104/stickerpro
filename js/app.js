class StickerApp {
  constructor() {
    this.unit = 'mm'; 
    this.currency = '₹'; 

    this.config = {
      paperPreset: 'super_a3',
      paperWidth: 330.2, 
      paperHeight: 482.6, 
      paperOrientation: 'portrait',

      printableWidth: 317.5, 
      printableHeight: 469.9, 
      printableMarginTop: 6.35,
      printableMarginLeft: 6.35,

      innerMarginTop: 0,
      innerMarginBottom: 0,
      innerMarginLeft: 0,
      innerMarginRight: 0,

      stickerPreset: 'circle_2in',
      stickerShape: 'circle',
      stickerWidth: 50.8, 
      stickerHeight: 50.8,
      cornerRadius: 0,
      gapX: 2.5,
      gapY: 2.5,
      bleed: 1.5,
      dieCutOffset: 2.5,
      plotterSpeed: 300,

      layoutMode: 'auto',
      alignment: 'center'
    };

    this.pricing = {
      targetQuantity: 500,
      paperCostPerSheet: 12.00,
      printCostPerSheet: 18.00,
      laminationCostPerSheet: 6.00,
      cuttingCostPerSheet: 8.00,
      markupPercent: 150,
      pricePerSticker: 3.50
    };

    this.renderer = null;
    this.layoutResult = null;
  }

  init() {
    
    const canvasEl = document.getElementById('sheetCanvas');
    this.renderer = new SheetCanvasRenderer(canvasEl);

    this._populatePresets();

    const hasSaved = this._loadFromStorage();

    this._bindEvents();

    if (hasSaved) {
      this._syncAllInputsFromLoadedState();
    } else {
      this._syncInputsFromConfig();
    }
    this._updateUnitLabels();
    this._updateCurrencyLabels();

    this._initHoverInspection();

    this.recalculate();
    setTimeout(() => {
      this.renderer.fitToScreen();
    }, 100);
  }

  toCurrentUnit(mmValue) {
    if (this.unit === 'in') return Number((mmValue / 25.4).toFixed(3));
    if (this.unit === 'cm') return Number((mmValue / 10).toFixed(2));
    return Number(Number(mmValue).toFixed(2));
  }

  fromCurrentUnit(val) {
    const num = parseFloat(val) || 0;
    if (this.unit === 'in') return num * 25.4;
    if (this.unit === 'cm') return num * 10;
    return num;
  }

  setUnit(newUnit) {
    if (this.unit === newUnit) return;
    this.unit = newUnit;
    this._updateUnitLabels();
    this._syncInputsFromConfig();
    this._saveToStorage();
  }

  _updateUnitLabels() {
    document.querySelectorAll('.unit-tag').forEach(el => {
      el.textContent = this.unit;
    });
  }

  setCurrency(newCurrency) {
    this.currency = newCurrency;
    this._updateCurrencyLabels();
    this._calculateJobPricing();
    this._saveToStorage();
  }

  _updateCurrencyLabels() {
    document.querySelectorAll('.curr-tag').forEach(el => {
      el.textContent = this.currency;
    });
  }

  _populatePresets() {
    const paperSelect = document.getElementById('paperPresetSelect');
    if (paperSelect && window.PAPER_PRESETS) {
      paperSelect.innerHTML = '';
      window.PAPER_PRESETS.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.category})`;
        paperSelect.appendChild(opt);
      });
      paperSelect.value = this.config.paperPreset;
    }

    const stickerSelect = document.getElementById('stickerPresetSelect');
    if (stickerSelect && window.STICKER_PRESETS) {
      stickerSelect.innerHTML = '';
      window.STICKER_PRESETS.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        stickerSelect.appendChild(opt);
      });
      stickerSelect.value = this.config.stickerPreset;
    }
  }

  _bindEvents() {
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.target);
        if (target) target.classList.add('active');
      });
    });

    const themeSelect = document.getElementById('themeToggle');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        document.documentElement.setAttribute('data-theme', e.target.value);
        this.renderer.updateSettings({ canvasTheme: e.target.value });
        this._saveToStorage();
      });
    }

    document.getElementById('resetDefaultsBtn')?.addEventListener('click', () => {
      this.resetDefaults();
    });

    const currencySelect = document.getElementById('currencySelect');
    if (currencySelect) {
      currencySelect.addEventListener('change', (e) => {
        this.setCurrency(e.target.value);
      });
    }

    document.querySelectorAll('input[name="unitRadio"]').forEach(r => {
      r.addEventListener('change', (e) => {
        this.setUnit(e.target.value);
      });
    });

    const paperPreset = document.getElementById('paperPresetSelect');
    if (paperPreset) {
      paperPreset.addEventListener('change', (e) => {
        this._applyPaperPreset(e.target.value);
        document.querySelectorAll('.preset-chip').forEach(c => {
          c.classList.toggle('active', c.dataset.preset === e.target.value);
        });
      });
    }

    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const presetId = chip.dataset.preset;
        if (presetId) {
          const pSelect = document.getElementById('paperPresetSelect');
          if (pSelect) pSelect.value = presetId;
          this._applyPaperPreset(presetId);
        }
      });
    });

    document.querySelectorAll('input[name="paperOrientation"]').forEach(r => {
      r.addEventListener('change', (e) => {
        this.config.paperOrientation = e.target.value;
        this._syncInputsFromConfig();
        this.recalculate();
        this.renderer.fitToScreen();
      });
    });

    const bindDimInput = (id, key, isPrintable = false) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        const mm = this.fromCurrentUnit(el.value);
        this.config[key] = mm;
        if (!isPrintable) {
          if (paperPreset) paperPreset.value = 'custom';
          document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
          if (key === 'paperWidth' || key === 'paperHeight') {
            const w = key === 'paperWidth' ? mm : this.config.paperWidth;
            const h = key === 'paperHeight' ? mm : this.config.paperHeight;
            if (w > h) {
              this.config.paperOrientation = 'landscape';
            } else if (h > w) {
              this.config.paperOrientation = 'portrait';
            }
            document.querySelectorAll('input[name="paperOrientation"]').forEach(r => {
              r.checked = (r.value === this.config.paperOrientation);
            });
          }
        }
        this.recalculate();
      });
    };

    bindDimInput('paperWidthInput', 'paperWidth');
    bindDimInput('paperHeightInput', 'paperHeight');
    bindDimInput('printableWidthInput', 'printableWidth', true);
    bindDimInput('printableHeightInput', 'printableHeight', true);

    ['innerMarginTop', 'innerMarginBottom', 'innerMarginLeft', 'innerMarginRight'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          this.config[id] = this.fromCurrentUnit(el.value);
          this.recalculate();
        });
      }
    });

    const stickerPreset = document.getElementById('stickerPresetSelect');
    if (stickerPreset) {
      stickerPreset.addEventListener('change', (e) => {
        this._applyStickerPreset(e.target.value);
      });
    }

    document.querySelectorAll('.shape-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.shape-option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.config.stickerShape = btn.dataset.shape;
        if (stickerPreset) stickerPreset.value = 'custom_sticker';
        this._toggleShapeControls(btn.dataset.shape);
        this.recalculate();
      });
    });

    bindDimInput('stickerWidthInput', 'stickerWidth');
    bindDimInput('stickerHeightInput', 'stickerHeight');
    bindDimInput('cornerRadiusInput', 'cornerRadius');
    bindDimInput('gapXInput', 'gapX');
    bindDimInput('gapYInput', 'gapY');
    bindDimInput('bleedInput', 'bleed');

    const linkGaps = document.getElementById('linkGapsCheck');
    const gapXEl = document.getElementById('gapXInput');
    const gapYEl = document.getElementById('gapYInput');
    if (linkGaps && gapXEl && gapYEl) {
      gapXEl.addEventListener('input', () => {
        if (linkGaps.checked) {
          gapYEl.value = gapXEl.value;
          this.config.gapY = this.config.gapX;
          this.recalculate();
        }
      });
      gapYEl.addEventListener('input', () => {
        if (linkGaps.checked) {
          gapXEl.value = gapYEl.value;
          this.config.gapX = this.config.gapY;
          this.recalculate();
        }
      });
    }

    document.querySelectorAll('.strategy-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.strategy-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.config.layoutMode = card.dataset.mode;
        this.recalculate();
      });
    });

    const alignSelect = document.getElementById('alignmentSelect');
    if (alignSelect) {
      alignSelect.addEventListener('change', (e) => {
        this.config.alignment = e.target.value;
        this.recalculate();
      });
    }

    const bindSettingToggle = (id, settingKey) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        this.renderer.updateSettings({ [settingKey]: el.checked });
        this._saveToStorage();
      });
    };

    const bindSettingVal = (id, settingKey, isNumber = false) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        const val = isNumber ? parseFloat(el.value) : el.value;
        this.renderer.updateSettings({ [settingKey]: val });
        this._saveToStorage();
      });
    };

    bindSettingToggle('showPrintableAreaToggle', 'showPrintableArea');
    bindSettingToggle('showAngleBracketsToggle', 'showAngleBrackets');
    bindSettingVal('bracketColorInput', 'bracketColor');
    bindSettingVal('bracketLengthInput', 'bracketLength', true);
    bindSettingVal('bracketThicknessInput', 'bracketThickness', true);

    bindSettingToggle('showStickerNumbersToggle', 'showStickerNumbers');
    bindSettingToggle('showBleedToggle', 'showBleed');
    bindSettingToggle('showDimensionsToggle', 'showDimensions');
    bindSettingToggle('showRulersToggle', 'showRulers');
    bindSettingToggle('showGridToggle', 'showGrid');
    bindSettingToggle('showPlotterMarksToggle', 'showPlotterMarks');

    bindSettingVal('stickerFillColorInput', 'stickerFillColor');
    bindSettingVal('cutLineColorInput', 'cutLineColor');
    bindSettingVal('bleedLineColorInput', 'bleedLineColor');
    bindSettingVal('numberColorInput', 'numberColor');

    const matSelect = document.getElementById('materialFinishSelect');
    if (matSelect) {
      matSelect.addEventListener('change', (e) => {
        this.renderer.updateSettings({ materialFinish: e.target.value });
        this._saveToStorage();
      });
    }

    bindSettingToggle('showDieCutToggle', 'showDieCut');
    bindSettingVal('dieCutColorInput', 'dieCutColor');
    const dieOffEl = document.getElementById('dieCutOffsetInput');
    if (dieOffEl) {
      dieOffEl.addEventListener('input', () => {
        const val = parseFloat(dieOffEl.value) || 0;
        this.config.dieCutOffset = val;
        this.renderer.updateSettings({ dieCutOffset: val });
        this.recalculate();
      });
    }

    bindSettingToggle('showKissCutToggle', 'showKissCut');
    bindSettingVal('kissCutStyleSelect', 'kissCutStyle');
    bindSettingVal('kissCutColorInput', 'kissCutColor');

    bindSettingToggle('showJobSlugToggle', 'showJobSlug');
    bindSettingVal('jobNameInput', 'jobName');
    bindSettingVal('customerNameInput', 'customerName');

    const plotterSpeedEl = document.getElementById('plotterSpeedInput');
    if (plotterSpeedEl) {
      plotterSpeedEl.addEventListener('input', () => {
        const val = Math.max(50, parseFloat(plotterSpeedEl.value) || 300);
        this.config.plotterSpeed = val;
        this.recalculate();
      });
    }

    document.getElementById('zoomInBtn')?.addEventListener('click', () => this.renderer.zoomIn());
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => this.renderer.zoomOut());
    document.getElementById('fitScreenBtn')?.addEventListener('click', () => this.renderer.fitToScreen());
    document.getElementById('actualScaleBtn')?.addEventListener('click', () => this.renderer.setActualScale());
    document.getElementById('resetViewBtn')?.addEventListener('click', () => this.renderer.resetView());

    const artworkInput = document.getElementById('artworkFileInput');
    const dropzone = document.getElementById('artworkDropzone');
    const removeArtworkBtn = document.getElementById('removeArtworkBtn');

    if (dropzone && artworkInput) {
      dropzone.addEventListener('click', () => artworkInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--primary)';
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--border-color)';
      });
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--border-color)';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this._loadArtworkFile(e.dataTransfer.files[0]);
        }
      });

      artworkInput.addEventListener('change', () => {
        if (artworkInput.files && artworkInput.files[0]) {
          this._loadArtworkFile(artworkInput.files[0]);
        }
      });
    }

    if (removeArtworkBtn) {
      removeArtworkBtn.addEventListener('click', () => {
        this.renderer.setArtwork(null);
        if (artworkInput) artworkInput.value = '';
        removeArtworkBtn.style.display = 'none';
        if (dropzone) dropzone.querySelector('span').textContent = 'Click or drag sticker artwork (PNG, JPG, SVG)';
      });
    }

    ['targetQuantityInput', 'paperCostInput', 'printCostInput', 'laminationCostInput', 'cuttingCostInput', 'pricePerStickerInput'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          this._calculateJobPricing();
        });
      }
    });

    document.getElementById('exportPngBtn')?.addEventListener('click', () => {
      ExportManager.downloadPNG(this.renderer, `stickers_${this.config.stickerShape}_${this.config.paperPreset}.png`, 300);
    });

    document.getElementById('exportSvgBtn')?.addEventListener('click', () => {
      ExportManager.downloadSVG(this.layoutResult, this.renderer.settings, `stickers_${this.config.stickerShape}_cutlines.svg`);
    });

    document.getElementById('printSheetBtn')?.addEventListener('click', () => {
      ExportManager.printSheet(this.layoutResult, this.renderer.settings, this.renderer.artworkImage);
    });

    const modal = document.getElementById('jobTicketModal');
    const openModalBtn = document.getElementById('openJobTicketBtn');
    const closeModalBtn = document.getElementById('closeJobTicketBtn');
    const dismissModalBtn = document.getElementById('dismissJobTicketBtn');
    const printTicketBtn = document.getElementById('printJobTicketBtn');

    if (openModalBtn && modal) {
      openModalBtn.addEventListener('click', () => {
        this._renderJobTicket();
        modal.style.display = 'flex';
      });
    }

    if (closeModalBtn && modal) {
      closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }

    if (dismissModalBtn && modal) {
      dismissModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    }

    if (printTicketBtn) {
      printTicketBtn.addEventListener('click', () => {
        const ticketContent = document.getElementById('jobTicketContent')?.innerHTML || '';
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          alert('Please allow popups to print the work order ticket.');
          return;
        }
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Production Job Ticket — StickerPro Studio</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 25px; color: #1e293b; }
              h1 { font-size: 20px; margin-bottom: 5px; color: #0f172a; }
              .job-ticket-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 15px 0; }
              .job-ticket-field { border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 6px; }
              .lbl { font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; }
              .val { font-size: 13px; font-weight: bold; margin-top: 2px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
              th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; }
            </style>
          </head>
          <body>
            ${ticketContent}
            <script>window.onload = function() { window.print(); window.close(); };<\/script>
          </body>
          </html>
        `);
        printWindow.document.close();
      });
    }
  }

  _loadArtworkFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, SVG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.renderer.setArtwork(e.target.result);
      const removeBtn = document.getElementById('removeArtworkBtn');
      if (removeBtn) removeBtn.style.display = 'inline-flex';
      const dropzone = document.getElementById('artworkDropzone');
      if (dropzone) dropzone.querySelector('span').textContent = `Loaded: ${file.name}`;
    };
    reader.readAsDataURL(file);
  }

  _applyPaperPreset(presetId) {
    const preset = window.PAPER_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    this.config.paperPreset = presetId;
    this.config.paperWidth = preset.width;
    this.config.paperHeight = preset.height;
    this.config.printableWidth = preset.printableWidth;
    this.config.printableHeight = preset.printableHeight;
    this.config.printableMarginLeft = (preset.width - preset.printableWidth) / 2;
    this.config.printableMarginTop = (preset.height - preset.printableHeight) / 2;

    this._syncInputsFromConfig();
    this.recalculate();
    this.renderer.fitToScreen();
  }

  _applyStickerPreset(presetId) {
    const preset = window.STICKER_PRESETS.find(s => s.id === presetId);
    if (!preset) return;

    this.config.stickerPreset = presetId;
    this.config.stickerShape = preset.shape;
    this.config.stickerWidth = preset.width;
    this.config.stickerHeight = preset.height;
    this.config.cornerRadius = preset.cornerRadius || 0;

    document.querySelectorAll('.shape-option-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.shape === preset.shape);
    });

    this._toggleShapeControls(preset.shape);
    this._syncInputsFromConfig();
    this.recalculate();
  }

  _toggleShapeControls(shape) {
    const heightGroup = document.getElementById('stickerHeightGroup');
    const cornerRadiusGroup = document.getElementById('cornerRadiusGroup');

    if (shape === 'circle' || shape === 'square' || shape === 'hexagon') {
      if (heightGroup) heightGroup.style.display = 'none';
    } else {
      if (heightGroup) heightGroup.style.display = 'flex';
    }

    if (shape === 'round_rect') {
      if (cornerRadiusGroup) cornerRadiusGroup.style.display = 'flex';
    } else {
      if (cornerRadiusGroup) cornerRadiusGroup.style.display = 'none';
    }
  }

  _syncInputsFromConfig() {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = this.toCurrentUnit(val);
    };

    let pw = this.config.paperWidth;
    let ph = this.config.paperHeight;
    let prw = this.config.printableWidth;
    let prh = this.config.printableHeight;

    if (this.config.paperOrientation === 'landscape') {
      if (pw < ph) [pw, ph] = [ph, pw];
      if (prw < prh) [prw, prh] = [prh, prw];
    } else {
      if (pw > ph) [pw, ph] = [ph, pw];
      if (prw > prh) [prw, prh] = [prh, prw];
    }

    setVal('paperWidthInput', pw);
    setVal('paperHeightInput', ph);
    setVal('printableWidthInput', prw);
    setVal('printableHeightInput', prh);
    setVal('stickerWidthInput', this.config.stickerWidth);
    setVal('stickerHeightInput', this.config.stickerHeight);
    setVal('cornerRadiusInput', this.config.cornerRadius);
    setVal('gapXInput', this.config.gapX);
    setVal('gapYInput', this.config.gapY);
    setVal('bleedInput', this.config.bleed);
    setVal('dieCutOffsetInput', this.config.dieCutOffset);
    const speedEl = document.getElementById('plotterSpeedInput');
    if (speedEl) speedEl.value = this.config.plotterSpeed;

    document.querySelectorAll('input[name="paperOrientation"]').forEach(r => {
      r.checked = (r.value === this.config.paperOrientation);
    });
  }

  recalculate() {
    
    this.layoutResult = LayoutCalculator.calculate(this.config);

    this.renderer.setLayoutData(this.layoutResult);

    this._updateMetricsUI();

    this._calculateJobPricing();

    this._saveToStorage();
  }

  _updateMetricsUI() {
    const stats = this.layoutResult.stats;

    const totalCountEl = document.getElementById('totalYieldCount');
    if (totalCountEl) totalCountEl.textContent = stats.count;

    const paperUtilEl = document.getElementById('paperUtilPercent');
    if (paperUtilEl) paperUtilEl.textContent = `${stats.paperUtilization}%`;

    const printUtilEl = document.getElementById('printUtilPercent');
    if (printUtilEl) printUtilEl.textContent = `${stats.printableUtilization}%`;

    const gridDimEl = document.getElementById('gridDimensionsLabel');
    if (gridDimEl) gridDimEl.textContent = `${stats.cols} cols × ${stats.rows} rows`;

    const stdBadge = document.getElementById('standardCountBadge');
    if (stdBadge) stdBadge.textContent = `${stats.standardCount} pcs`;

    const rotBadge = document.getElementById('rotatedCountBadge');
    if (rotBadge) rotBadge.textContent = `${stats.rotatedCount} pcs`;

    const hybBadge = document.getElementById('hybridCountBadge');
    if (hybBadge) hybBadge.textContent = `${stats.hybridCount} pcs`;

    const lshBadge = document.getElementById('lshapedCountBadge');
    if (lshBadge) lshBadge.textContent = `${stats.lShapedCount || 0} pcs`;

    const hnyBadge = document.getElementById('honeycombCountBadge');
    if (hnyBadge) {
      if (this.config.stickerShape === 'circle' || this.config.stickerShape === 'hexagon') {
        hnyBadge.textContent = `${stats.honeycombCount || 0} pcs`;
        hnyBadge.style.opacity = '1';
      } else {
        hnyBadge.textContent = 'N/A';
        hnyBadge.style.opacity = '0.5';
      }
    }

    const cutPerimStickerEl = document.getElementById('cutPerimStickerVal');
    if (cutPerimStickerEl) cutPerimStickerEl.textContent = `${stats.cutPerimeterPerSticker} mm`;

    const cutDistSheetEl = document.getElementById('cutDistSheetVal');
    if (cutDistSheetEl) cutDistSheetEl.textContent = `${stats.cutPerimeterPerSheetMeters} m`;

    const plotterTimeEl = document.getElementById('plotterTimeVal');
    if (plotterTimeEl) plotterTimeEl.textContent = stats.estimatedCutTimeString;

    const bottomPlotterEl = document.getElementById('bottomPlotterTimeLabel');
    if (bottomPlotterEl) bottomPlotterEl.textContent = stats.estimatedCutTimeString;

    if (this.config.layoutMode === 'auto') {
      document.querySelectorAll('.strategy-card').forEach(card => {
        card.classList.toggle('active', card.dataset.mode === stats.activeMode);
      });
    }
  }

  _calculateJobPricing() {
    if (!this.layoutResult) return;

    const stats = this.layoutResult.stats;
    const stickersPerSheet = stats.count || 1;
    const targetQuantity = parseInt(document.getElementById('targetQuantityInput')?.value) || 500;

    const sheetsNeeded = Math.ceil(targetQuantity / stickersPerSheet);
    const totalProduced = sheetsNeeded * stickersPerSheet;
    const surplusStickers = Math.max(0, totalProduced - targetQuantity);

    const paperCostSheet = parseFloat(document.getElementById('paperCostInput')?.value) || 0;
    const printCostSheet = parseFloat(document.getElementById('printCostInput')?.value) || 0;
    const lamCostSheet = parseFloat(document.getElementById('laminationCostInput')?.value) || 0;
    const cutCostSheet = parseFloat(document.getElementById('cuttingCostInput')?.value) || 0;

    const totalCostPerSheet = paperCostSheet + printCostSheet + lamCostSheet + cutCostSheet;
    const totalProductionCost = sheetsNeeded * totalCostPerSheet;
    const unitProductionCost = totalProduced > 0 ? (totalProductionCost / totalProduced) : 0;

    const pricePerSticker = parseFloat(document.getElementById('pricePerStickerInput')?.value) || 0;
    const totalJobRevenue = targetQuantity * pricePerSticker;
    const netProfit = totalJobRevenue - totalProductionCost;
    const profitMargin = totalJobRevenue > 0 ? (netProfit / totalJobRevenue) * 100 : 0;

    const curr = this.currency || '₹';

    const setHtml = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setHtml('sheetsNeededVal', `${sheetsNeeded} sheets`);
    setHtml('totalProducedVal', `${totalProduced} pcs (${surplusStickers} extra)`);
    setHtml('cutDistBatchVal', `${(stats.cutPerimeterPerSheetMeters * sheetsNeeded).toFixed(2)} m`);
    setHtml('costPerSheetVal', `${curr}${totalCostPerSheet.toFixed(2)}`);
    setHtml('unitCostVal', `${curr}${unitProductionCost.toFixed(2)} / pc`);
    setHtml('totalJobCostVal', `${curr}${totalProductionCost.toFixed(2)}`);
    setHtml('totalRevenueVal', `${curr}${totalJobRevenue.toFixed(2)}`);
    setHtml('netProfitVal', `${curr}${netProfit.toFixed(2)} (${profitMargin.toFixed(1)}%)`);

    const profitEl = document.getElementById('netProfitVal');
    if (profitEl) {
      profitEl.style.color = netProfit >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
    }

    this._saveToStorage();
  }

  _initHoverInspection() {
    const tooltip = document.getElementById('hoverInspectionTooltip');
    if (!tooltip) return;

    this.renderer.onHoverSticker = (sticker, clientX, clientY) => {
      if (!sticker) {
        tooltip.style.display = 'none';
        return;
      }
      tooltip.style.display = 'block';
      tooltip.style.left = `${clientX + 16}px`;
      tooltip.style.top = `${clientY + 16}px`;
      tooltip.innerHTML = `
        <div class="badge-title"><i class="fa-solid fa-stamp"></i> Sticker #${sticker.index}</div>
        <div><strong>Pos:</strong> X: ${sticker.x.toFixed(1)} mm, Y: ${sticker.y.toFixed(1)} mm</div>
        <div><strong>Grid:</strong> Row ${sticker.row}, Col ${sticker.col}</div>
        <div><strong>Dimensions:</strong> ${sticker.width.toFixed(1)} × ${sticker.height.toFixed(1)} mm</div>
        <div><strong>Cut Perimeter:</strong> ${sticker.perimeterMm || 0} mm</div>
        <div><strong>Orientation:</strong> ${sticker.rotated ? 'Rotated 90°' : 'Natural'}</div>
      `;
    };
  }

  _renderJobTicket() {
    if (!this.layoutResult) return;
    const stats = this.layoutResult.stats;
    const paper = this.layoutResult.paper;
    const pa = this.layoutResult.printableArea;
    const targetQuantity = parseInt(document.getElementById('targetQuantityInput')?.value) || 500;
    const sheetsNeeded = Math.ceil(targetQuantity / (stats.count || 1));
    const totalProduced = sheetsNeeded * (stats.count || 1);
    const curr = this.currency || '₹';

    const paperCostSheet = parseFloat(document.getElementById('paperCostInput')?.value) || 0;
    const printCostSheet = parseFloat(document.getElementById('printCostInput')?.value) || 0;
    const lamCostSheet = parseFloat(document.getElementById('laminationCostInput')?.value) || 0;
    const cutCostSheet = parseFloat(document.getElementById('cuttingCostInput')?.value) || 0;
    const totalCostPerSheet = paperCostSheet + printCostSheet + lamCostSheet + cutCostSheet;
    const totalProductionCost = sheetsNeeded * totalCostPerSheet;
    const pricePerSticker = parseFloat(document.getElementById('pricePerStickerInput')?.value) || 0;
    const totalRevenue = targetQuantity * pricePerSticker;
    const netProfit = totalRevenue - totalProductionCost;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const jobName = this.renderer.settings.jobName || 'Sticker Run #1';
    const clientName = this.renderer.settings.customerName || 'Standard Client';
    const material = this.renderer.settings.materialFinish || 'gloss';
    const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const materialLabels = {
      gloss: 'Gloss White Vinyl',
      matte: 'Matte Vinyl',
      holographic: 'Holographic Chrome',
      clear: 'Clear / Transparent Vinyl',
      kraft: 'Natural Kraft Paper',
      gold_foil: 'Brushed Gold Foil'
    };

    const contentEl = document.getElementById('jobTicketContent');
    if (!contentEl) return;

    contentEl.innerHTML = `
      <div style="border-bottom: 2px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h1 style="font-size: 1.25rem; font-weight: 800; margin: 0; color: var(--text-main);">${jobName}</h1>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">Client: <strong style="color: var(--text-main);">${clientName}</strong> | Date: ${dateStr}</div>
          </div>
          <span class="badge-pill" style="background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); border-color: rgba(16, 185, 129, 0.3);">
            READY FOR PRODUCTION
          </span>
        </div>
      </div>

      <div class="job-ticket-grid">
        <div class="job-ticket-field">
          <span class="lbl">Paper Sheet Specs</span>
          <span class="val">${paper.width.toFixed(1)} × ${paper.height.toFixed(1)} mm (${paper.orientation.toUpperCase()})</span>
        </div>
        <div class="job-ticket-field">
          <span class="lbl">Machine Printable Area</span>
          <span class="val">${pa.width.toFixed(1)} × ${pa.height.toFixed(1)} mm</span>
        </div>
        <div class="job-ticket-field">
          <span class="lbl">Sticker Geometry & Shape</span>
          <span class="val">${this.config.stickerShape.toUpperCase()} (${this.config.stickerWidth.toFixed(1)} × ${this.config.stickerHeight.toFixed(1)} mm)</span>
        </div>
        <div class="job-ticket-field">
          <span class="lbl">Material Surface Finish</span>
          <span class="val">${materialLabels[material] || material}</span>
        </div>
        <div class="job-ticket-field">
          <span class="lbl">Yield Per Sheet</span>
          <span class="val" style="color: var(--accent-cyan); font-size: 1.1rem;">${stats.count} stickers / sheet</span>
        </div>
        <div class="job-ticket-field">
          <span class="lbl">Sheets Required</span>
          <span class="val" style="color: var(--accent-emerald); font-size: 1.1rem;">${sheetsNeeded} sheets (Output: ${totalProduced} pcs)</span>
        </div>
        <div class="job-ticket-field">
          <span class="lbl">Sheet Utilization & Waste</span>
          <span class="val">${stats.paperUtilization}% util (${stats.wasteAreaPercent}% trim waste)</span>
        </div>
        <div class="job-ticket-field">
          <span class="lbl">Plotter Cutting Time</span>
          <span class="val" style="color: var(--accent-amber);">${stats.estimatedCutTimeString} / sheet (Total: ${(stats.estimatedCutTimeSeconds * sheetsNeeded / 60).toFixed(1)} min)</span>
        </div>
      </div>

      <table class="job-ticket-table">
        <thead>
          <tr>
            <th>Cost Element</th>
            <th>Rate / Sheet</th>
            <th>Total Batch Cost</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Stock Substrate (Paper / Vinyl)</td>
            <td>${curr}${paperCostSheet.toFixed(2)}</td>
            <td>${curr}${(paperCostSheet * sheetsNeeded).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Toner / UV Inks / Machine Wear</td>
            <td>${curr}${printCostSheet.toFixed(2)}</td>
            <td>${curr}${(printCostSheet * sheetsNeeded).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Over-Laminate Film</td>
            <td>${curr}${lamCostSheet.toFixed(2)}</td>
            <td>${curr}${(lamCostSheet * sheetsNeeded).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Plotter Kiss-Cut / Die-Cut Labor</td>
            <td>${curr}${cutCostSheet.toFixed(2)}</td>
            <td>${curr}${(cutCostSheet * sheetsNeeded).toFixed(2)}</td>
          </tr>
          <tr style="font-weight: 800; background: rgba(59, 130, 246, 0.08);">
            <td>Total Production Cost</td>
            <td>${curr}${totalCostPerSheet.toFixed(2)}</td>
            <td>${curr}${totalProductionCost.toFixed(2)}</td>
          </tr>
          <tr style="font-weight: 800; background: rgba(16, 185, 129, 0.1); color: var(--accent-emerald);">
            <td>Total Quoted Revenue (Net Profit)</td>
            <td>Unit: ${curr}${(totalProductionCost / totalProduced).toFixed(2)}</td>
            <td>${curr}${totalRevenue.toFixed(2)} (Profit: ${curr}${netProfit.toFixed(2)} [${profitMargin.toFixed(1)}%])</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  _saveToStorage() {
    try {
      const dataToSave = {
        unit: this.unit,
        currency: this.currency,
        config: { ...this.config },
        pricing: {
          targetQuantity: parseInt(document.getElementById('targetQuantityInput')?.value) || this.pricing.targetQuantity,
          paperCostPerSheet: parseFloat(document.getElementById('paperCostInput')?.value) || this.pricing.paperCostPerSheet,
          printCostPerSheet: parseFloat(document.getElementById('printCostInput')?.value) || this.pricing.printCostPerSheet,
          laminationCostPerSheet: parseFloat(document.getElementById('laminationCostInput')?.value) || this.pricing.laminationCostPerSheet,
          cuttingCostPerSheet: parseFloat(document.getElementById('cuttingCostInput')?.value) || this.pricing.cuttingCostPerSheet,
          pricePerSticker: parseFloat(document.getElementById('pricePerStickerInput')?.value) || this.pricing.pricePerSticker
        },
        visuals: {
          canvasTheme: this.renderer.settings.canvasTheme,
          materialFinish: this.renderer.settings.materialFinish,
          showPrintableArea: this.renderer.settings.showPrintableArea,
          showAngleBrackets: this.renderer.settings.showAngleBrackets,
          bracketLength: this.renderer.settings.bracketLength,
          bracketThickness: this.renderer.settings.bracketThickness,
          bracketColor: this.renderer.settings.bracketColor,
          showDieCut: this.renderer.settings.showDieCut,
          dieCutOffset: this.renderer.settings.dieCutOffset,
          dieCutColor: this.renderer.settings.dieCutColor,
          showKissCut: this.renderer.settings.showKissCut,
          kissCutStyle: this.renderer.settings.kissCutStyle,
          kissCutColor: this.renderer.settings.kissCutColor,
          showBleed: this.renderer.settings.showBleed,
          bleedLineColor: this.renderer.settings.bleedLineColor,
          showStickerNumbers: this.renderer.settings.showStickerNumbers,
          numberColor: this.renderer.settings.numberColor,
          showDimensions: this.renderer.settings.showDimensions,
          showRulers: this.renderer.settings.showRulers,
          showGrid: this.renderer.settings.showGrid,
          showPlotterMarks: this.renderer.settings.showPlotterMarks,
          showJobSlug: this.renderer.settings.showJobSlug,
          jobName: this.renderer.settings.jobName,
          customerName: this.renderer.settings.customerName,
          stickerFillColor: this.renderer.settings.stickerFillColor,
          cutLineColor: this.renderer.settings.cutLineColor
        }
      };

      localStorage.setItem('stickerpro_user_settings_v1', JSON.stringify(dataToSave));
      this._showSavedBadge();
    } catch (err) {
      console.warn('LocalStorage save failed:', err);
    }
  }

  _loadFromStorage() {
    try {
      const raw = localStorage.getItem('stickerpro_user_settings_v1');
      if (!raw) return false;
      const parsed = JSON.parse(raw);

      if (parsed.unit) this.unit = parsed.unit;
      if (parsed.currency) this.currency = parsed.currency;
      if (parsed.config && typeof parsed.config === 'object') {
        Object.assign(this.config, parsed.config);
      }
      if (parsed.pricing && typeof parsed.pricing === 'object') {
        Object.assign(this.pricing, parsed.pricing);
      }
      if (parsed.visuals && typeof parsed.visuals === 'object') {
        this.renderer.updateSettings(parsed.visuals);
      }
      return true;
    } catch (err) {
      console.warn('LocalStorage load failed:', err);
      return false;
    }
  }

  _syncAllInputsFromLoadedState() {
    
    document.querySelectorAll('input[name="unitRadio"]').forEach(r => {
      r.checked = (r.value === this.unit);
    });

    const curSelect = document.getElementById('currencySelect');
    if (curSelect) curSelect.value = this.currency;

    const themeSelect = document.getElementById('themeToggle');
    if (themeSelect) themeSelect.value = this.renderer.settings.canvasTheme;
    document.documentElement.setAttribute('data-theme', this.renderer.settings.canvasTheme);

    const pSelect = document.getElementById('paperPresetSelect');
    if (pSelect) pSelect.value = this.config.paperPreset;
    document.querySelectorAll('.preset-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.preset === this.config.paperPreset);
    });

    const sSelect = document.getElementById('stickerPresetSelect');
    if (sSelect) sSelect.value = this.config.stickerPreset;

    document.querySelectorAll('.shape-option-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.shape === this.config.stickerShape);
    });
    this._toggleShapeControls(this.config.stickerShape);

    document.querySelectorAll('.strategy-card').forEach(c => {
      c.classList.toggle('active', c.dataset.mode === this.config.layoutMode);
    });

    const alignSelect = document.getElementById('alignmentSelect');
    if (alignSelect) alignSelect.value = this.config.alignment;

    this._syncInputsFromConfig();

    const matSelect = document.getElementById('materialFinishSelect');
    if (matSelect) matSelect.value = this.renderer.settings.materialFinish;

    const setChecked = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = !!val;
    };
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== undefined) el.value = val;
    };

    setChecked('showDieCutToggle', this.renderer.settings.showDieCut);
    setVal('dieCutColorInput', this.renderer.settings.dieCutColor);

    setChecked('showKissCutToggle', this.renderer.settings.showKissCut);
    setVal('kissCutStyleSelect', this.renderer.settings.kissCutStyle);
    setVal('kissCutColorInput', this.renderer.settings.kissCutColor);

    setChecked('showJobSlugToggle', this.renderer.settings.showJobSlug);
    setVal('jobNameInput', this.renderer.settings.jobName);
    setVal('customerNameInput', this.renderer.settings.customerName);

    setChecked('showPrintableAreaToggle', this.renderer.settings.showPrintableArea);
    setChecked('showAngleBracketsToggle', this.renderer.settings.showAngleBrackets);
    setVal('bracketColorInput', this.renderer.settings.bracketColor);
    setVal('bracketLengthInput', this.renderer.settings.bracketLength);
    setVal('bracketThicknessInput', this.renderer.settings.bracketThickness);

    setChecked('showStickerNumbersToggle', this.renderer.settings.showStickerNumbers);
    setChecked('showBleedToggle', this.renderer.settings.showBleed);
    setChecked('showDimensionsToggle', this.renderer.settings.showDimensions);
    setChecked('showRulersToggle', this.renderer.settings.showRulers);
    setChecked('showGridToggle', this.renderer.settings.showGrid);
    setChecked('showPlotterMarksToggle', this.renderer.settings.showPlotterMarks);

    setVal('stickerFillColorInput', this.renderer.settings.stickerFillColor);
    setVal('cutLineColorInput', this.renderer.settings.cutLineColor);
    setVal('bleedLineColorInput', this.renderer.settings.bleedLineColor);
    setVal('numberColorInput', this.renderer.settings.numberColor);

    setVal('targetQuantityInput', this.pricing.targetQuantity);
    setVal('paperCostInput', this.pricing.paperCostPerSheet);
    setVal('printCostInput', this.pricing.printCostPerSheet);
    setVal('laminationCostInput', this.pricing.laminationCostPerSheet);
    setVal('cuttingCostInput', this.pricing.cuttingCostPerSheet);
    setVal('pricePerStickerInput', this.pricing.pricePerSticker);
  }

  _showSavedBadge() {
    const badge = document.getElementById('storageSavedBadge');
    if (!badge) return;
    badge.style.opacity = '1';
    clearTimeout(this._saveBadgeTimer);
    this._saveBadgeTimer = setTimeout(() => {
      badge.style.opacity = '0.5';
    }, 1800);
  }

  resetDefaults() {
    if (confirm('Reset all dimensions, layout configurations, and settings to factory defaults?')) {
      localStorage.removeItem('stickerpro_user_settings_v1');
      window.location.reload();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new StickerApp();
  window.app.init();
});

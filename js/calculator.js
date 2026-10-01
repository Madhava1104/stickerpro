class LayoutCalculator {
  
  static calculate(config) {
    const {
      paperWidth,
      paperHeight,
      paperOrientation = 'portrait', 
      printableWidth,
      printableHeight,
      printableMarginTop = 0,
      printableMarginLeft = 0,
      innerMarginTop = 0,
      innerMarginBottom = 0,
      innerMarginLeft = 0,
      innerMarginRight = 0,
      stickerShape = 'rectangle', 
      stickerWidth = 50,
      stickerHeight = 50,
      cornerRadius = 0,
      gapX = 2,
      gapY = 2,
      bleed = 0,
      dieCutOffset = 2.5, 
      plotterSpeed = 300, 
      layoutMode = 'auto', 
      alignment = 'center' 
    } = config;

    const gx = Math.max(0, Number(gapX) >= 0 ? Number(gapX) : 0);
    const gy = Math.max(0, Number(gapY) >= 0 ? Number(gapY) : 0);
    const bld = Math.max(0, Number(bleed) >= 0 ? Number(bleed) : 0);
    const cr = Math.max(0, Number(cornerRadius) >= 0 ? Number(cornerRadius) : 0);
    const offsetVal = Math.max(0, Number(dieCutOffset) >= 0 ? Number(dieCutOffset) : 0);
    const imLeft = Math.max(0, Number(innerMarginLeft) || 0);
    const imRight = Math.max(0, Number(innerMarginRight) || 0);
    const imTop = Math.max(0, Number(innerMarginTop) || 0);
    const imBottom = Math.max(0, Number(innerMarginBottom) || 0);

    let pw = Number(paperWidth) || 330.2;
    let ph = Number(paperHeight) || 482.6;
    if (paperOrientation === 'landscape' && pw < ph) {
      [pw, ph] = [ph, pw];
    } else if (paperOrientation === 'portrait' && pw > ph) {
      [pw, ph] = [ph, pw];
    }

    let rawPrintW = Number(printableWidth) || pw;
    let rawPrintH = Number(printableHeight) || ph;
    if (paperOrientation === 'landscape' && rawPrintW < rawPrintH) {
      [rawPrintW, rawPrintH] = [rawPrintH, rawPrintW];
    } else if (paperOrientation === 'portrait' && rawPrintW > rawPrintH) {
      [rawPrintW, rawPrintH] = [rawPrintH, rawPrintW];
    }

    const printW = Math.min(rawPrintW, pw);
    const printH = Math.min(rawPrintH, ph);

    let printOffsetX = (pw - printW) / 2;
    let printOffsetY = (ph - printH) / 2;
    if (printableMarginLeft > 0 && printableMarginLeft + printW <= pw) {
      printOffsetX = printableMarginLeft;
    }
    if (printableMarginTop > 0 && printableMarginTop + printH <= ph) {
      printOffsetY = printableMarginTop;
    }

    const packAreaW = Math.max(0, printW - (imLeft + imRight));
    const packAreaH = Math.max(0, printH - (imTop + imBottom));
    const packOriginX = printOffsetX + imLeft;
    const packOriginY = printOffsetY + imTop;

    let sw = Math.max(1, Number(stickerWidth) || 50);
    let sh = Math.max(1, Number(stickerHeight) || 50);
    if (stickerShape === 'circle' || stickerShape === 'square') {
      sh = sw;
    }

    const standardRes = this._calcStandard(packAreaW, packAreaH, sw, sh, gx, gy, stickerShape, cr);
    const rotatedRes = this._calcRotated(packAreaW, packAreaH, sw, sh, gx, gy, stickerShape, cr);
    const hybridRes = this._calcHybrid(packAreaW, packAreaH, sw, sh, gx, gy, stickerShape, cr);
    const lShapedRes = this._calcLShapedPacking(packAreaW, packAreaH, sw, sh, gx, gy, stickerShape, cr);

    let honeycombRes = null;
    if (stickerShape === 'circle' || stickerShape === 'hexagon') {
      honeycombRes = this._calcHoneycomb(packAreaW, packAreaH, sw, sh, gx, gy, stickerShape, cr);
    }

    let interlockedHexRes = null;
    if (stickerShape === 'hexagon') {
      interlockedHexRes = this._calcInterlockedHexagon(packAreaW, packAreaH, sw, sh, gx, gy, cr);
    }

    let selectedResult;
    let selectedMode = layoutMode;

    if (layoutMode === 'auto') {
      const candidates = [
        { mode: 'standard', res: standardRes },
        { mode: 'rotated', res: rotatedRes },
        { mode: 'hybrid', res: hybridRes },
        { mode: 'lshaped', res: lShapedRes }
      ];
      if (honeycombRes) {
        candidates.push({ mode: 'honeycomb', res: honeycombRes });
      }
      if (interlockedHexRes) {
        candidates.push({ mode: 'interlockedHex', res: interlockedHexRes });
      }

      candidates.sort((a, b) => b.res.count - a.res.count);
      selectedResult = candidates[0].res;
      selectedMode = candidates[0].mode;
    } else if (layoutMode === 'standard') {
      selectedResult = standardRes;
    } else if (layoutMode === 'rotated') {
      selectedResult = rotatedRes;
    } else if (layoutMode === 'hybrid') {
      selectedResult = (hybridRes && hybridRes.count > 0) ? hybridRes : (standardRes.count >= rotatedRes.count ? standardRes : rotatedRes);
    } else if (layoutMode === 'lshaped') {
      selectedResult = (lShapedRes && lShapedRes.count > 0) ? lShapedRes : hybridRes;
    } else if (layoutMode === 'honeycomb') {
      selectedResult = honeycombRes || standardRes;
    } else if (layoutMode === 'interlockedHex') {
      selectedResult = interlockedHexRes || honeycombRes || standardRes;
    } else {
      selectedResult = standardRes;
    }

    const rawStickers = this._applyAlignment(
      selectedResult.stickers,
      selectedResult.boundWidth,
      selectedResult.boundHeight,
      packAreaW,
      packAreaH,
      packOriginX,
      packOriginY,
      alignment
    );

    const singleStickerArea = this._getStickerArea(stickerShape, sw, sh, cr);
    const totalStickersArea = singleStickerArea * selectedResult.count;
    const paperArea = pw * ph;
    const printableArea = printW * printH;
    const paperUtilization = paperArea > 0 ? (totalStickersArea / paperArea) * 100 : 0;
    const printableUtilization = printableArea > 0 ? (totalStickersArea / printableArea) * 100 : 0;

    const cutPerimeterPerSticker = this._getCutPerimeter(stickerShape, sw, sh, cornerRadius);
    const cutPerimeterPerSheetMeters = (cutPerimeterPerSticker * selectedResult.count) / 1000;
    const safePlotterSpeed = Math.max(50, Number(plotterSpeed) || 300);
    
    const estimatedCutTimeSeconds = selectedResult.count > 0
      ? Math.round((cutPerimeterPerSticker * selectedResult.count) / safePlotterSpeed + (selectedResult.count * 0.18))
      : 0;

    const formatTime = (sec) => {
      if (sec < 60) return `${sec}s`;
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return s > 0 ? `${m}m ${s}s` : `${m}m`;
    };

    const enrichedStickers = rawStickers.map(s => {
      const isRot = !!s.rotated;
      const curW = isRot ? (s.width || sh) : (s.width || sw);
      const curH = isRot ? (s.height || sw) : (s.height || sh);
      const cr = s.cornerRadius || 0;

      return {
        ...s,
        width: curW,
        height: curH,
        originalWidth: sw,
        originalHeight: sh,
        dieCutOffset: offsetVal,
        dieCutWidth: curW + 2 * offsetVal,
        dieCutHeight: curH + 2 * offsetVal,
        dieCutRadius: cr > 0 ? (cr + offsetVal) : 0,
        perimeterMm: Number(cutPerimeterPerSticker.toFixed(1))
      };
    });

    return {
      paper: {
        width: pw,
        height: ph,
        orientation: paperOrientation,
        area: paperArea
      },
      printableArea: {
        x: printOffsetX,
        y: printOffsetY,
        width: printW,
        height: printH,
        area: printableArea
      },
      packingArea: {
        x: packOriginX,
        y: packOriginY,
        width: packAreaW,
        height: packAreaH
      },
      stickerConfig: {
        width: sw,
        height: sh,
        shape: stickerShape,
        cornerRadius: cornerRadius,
        gapX: gapX,
        gapY: gapY,
        bleed: bleed,
        dieCutOffset: offsetVal,
        plotterSpeed: safePlotterSpeed,
        singleArea: singleStickerArea
      },
      stats: {
        count: selectedResult.count,
        standardCount: standardRes.count,
        rotatedCount: rotatedRes.count,
        hybridCount: hybridRes.count,
        lShapedCount: lShapedRes.count,
        honeycombCount: honeycombRes ? honeycombRes.count : 0,
        interlockedHexCount: interlockedHexRes ? interlockedHexRes.count : 0,
        activeMode: selectedMode,
        cols: selectedResult.cols || 0,
        rows: selectedResult.rows || 0,
        paperUtilization: Number(paperUtilization.toFixed(1)),
        printableUtilization: Number(printableUtilization.toFixed(1)),
        wasteAreaPercent: Number(Math.max(0, 100 - paperUtilization).toFixed(1)),
        cutPerimeterPerSticker: Number(cutPerimeterPerSticker.toFixed(1)),
        cutPerimeterPerSheetMeters: Number(cutPerimeterPerSheetMeters.toFixed(2)),
        estimatedCutTimeSeconds,
        estimatedCutTimeString: formatTime(estimatedCutTimeSeconds)
      },
      stickers: enrichedStickers
    };
  }

  static _calcStandard(pw, ph, sw, sh, gx, gy, shape, cornerRadius) {
    if (sw <= 0 || sh <= 0 || pw < sw || ph < sh) {
      return { count: 0, cols: 0, rows: 0, boundWidth: 0, boundHeight: 0, stickers: [] };
    }

    const cols = Math.floor((pw + gx) / (sw + gx));
    const rows = Math.floor((ph + gy) / (sh + gy));
    const count = cols * rows;

    const boundWidth = cols > 0 ? cols * sw + (cols - 1) * gx : 0;
    const boundHeight = rows > 0 ? rows * sh + (rows - 1) * gy : 0;

    const stickers = [];
    let idx = 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * (sw + gx);
        const y = r * (sh + gy);
        stickers.push({
          index: idx++,
          x,
          y,
          width: sw,
          height: sh,
          shape,
          cornerRadius,
          rotated: false,
          row: r + 1,
          col: c + 1
        });
      }
    }

    return { count, cols, rows, boundWidth, boundHeight, stickers };
  }

  static _calcRotated(pw, ph, sw, sh, gx, gy, shape, cornerRadius) {
    const rotW = sh;
    const rotH = sw;

    if (rotW <= 0 || rotH <= 0 || pw < rotW || ph < rotH) {
      return { count: 0, cols: 0, rows: 0, boundWidth: 0, boundHeight: 0, stickers: [] };
    }

    const cols = Math.floor((pw + gx) / (rotW + gx));
    const rows = Math.floor((ph + gy) / (rotH + gy));
    const count = cols * rows;

    const boundWidth = cols > 0 ? cols * rotW + (cols - 1) * gx : 0;
    const boundHeight = rows > 0 ? rows * rotH + (rows - 1) * gy : 0;

    const stickers = [];
    let idx = 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * (rotW + gx);
        const y = r * (rotH + gy);
        stickers.push({
          index: idx++,
          x,
          y,
          width: rotW,
          height: rotH,
          originalWidth: sw,
          originalHeight: sh,
          shape,
          cornerRadius,
          rotated: true,
          row: r + 1,
          col: c + 1
        });
      }
    }

    return { count, cols, rows, boundWidth, boundHeight, stickers };
  }

  static _calcHybrid(pw, ph, sw, sh, gx, gy, shape, cornerRadius) {
    if (Math.abs(sw - sh) < 0.1) {
      return this._calcStandard(pw, ph, sw, sh, gx, gy, shape, cornerRadius);
    }

    let bestResult = { count: 0, stickers: [], boundWidth: 0, boundHeight: 0, cols: 0, rows: 0 };

    const maxStdCols = Math.floor((pw + gx) / (sw + gx));
    const stdRows = Math.floor((ph + gy) / (sh + gy));
    const rotRows = Math.floor((ph + gy) / (sw + gy));

    for (let cStd = 1; cStd <= maxStdCols; cStd++) {
      const usedW = cStd * sw + (cStd - 1) * gx;
      const remW = pw - usedW - gx;
      const rotCols = remW > 0 ? Math.floor((remW + gx) / (sh + gx)) : 0;

      const totalCount = (cStd * stdRows) + (rotCols * rotRows);
      if (totalCount > bestResult.count) {
        const stickers = [];
        let idx = 1;

        for (let r = 0; r < stdRows; r++) {
          for (let c = 0; c < cStd; c++) {
            stickers.push({
              index: idx++,
              x: c * (sw + gx),
              y: r * (sh + gy),
              width: sw,
              height: sh,
              shape,
              cornerRadius,
              rotated: false,
              row: r + 1,
              col: c + 1
            });
          }
        }

        const startX = usedW + gx;
        for (let r = 0; r < rotRows; r++) {
          for (let c = 0; c < rotCols; c++) {
            stickers.push({
              index: idx++,
              x: startX + c * (sh + gx),
              y: r * (sw + gy),
              width: sh,
              height: sw,
              originalWidth: sw,
              originalHeight: sh,
              shape,
              cornerRadius,
              rotated: true,
              row: r + 1,
              col: cStd + c + 1
            });
          }
        }

        const boundWidth = rotCols > 0 ? startX + rotCols * sh + (rotCols - 1) * gx : usedW;
        const boundHeight = Math.max(
          stdRows > 0 ? stdRows * sh + (stdRows - 1) * gy : 0,
          rotRows > 0 && rotCols > 0 ? rotRows * sw + (rotRows - 1) * gy : 0
        );

        bestResult = { count: totalCount, stickers, boundWidth, boundHeight, cols: cStd + rotCols, rows: Math.max(stdRows, rotRows) };
      }
    }

    const maxStdRows = Math.floor((ph + gy) / (sh + gy));
    const stdCols = Math.floor((pw + gx) / (sw + gx));
    const rotCols = Math.floor((pw + gx) / (sh + gx));

    for (let rStd = 1; rStd <= maxStdRows; rStd++) {
      const usedH = rStd * sh + (rStd - 1) * gy;
      const remH = ph - usedH - gy;
      const rotRows = remH > 0 ? Math.floor((remH + gy) / (sw + gy)) : 0;

      const totalCount = (stdCols * rStd) + (rotCols * rotRows);
      if (totalCount > bestResult.count) {
        const stickers = [];
        let idx = 1;

        for (let r = 0; r < rStd; r++) {
          for (let c = 0; c < stdCols; c++) {
            stickers.push({
              index: idx++,
              x: c * (sw + gx),
              y: r * (sh + gy),
              width: sw,
              height: sh,
              shape,
              cornerRadius,
              rotated: false,
              row: r + 1,
              col: c + 1
            });
          }
        }

        const startY = usedH + gy;
        for (let r = 0; r < rotRows; r++) {
          for (let c = 0; c < rotCols; c++) {
            stickers.push({
              index: idx++,
              x: c * (sh + gx),
              y: startY + r * (sw + gy),
              width: sh,
              height: sw,
              originalWidth: sw,
              originalHeight: sh,
              shape,
              cornerRadius,
              rotated: true,
              row: rStd + r + 1,
              col: c + 1
            });
          }
        }

        const boundWidth = Math.max(
          stdCols > 0 ? stdCols * sw + (stdCols - 1) * gx : 0,
          rotCols > 0 && rotRows > 0 ? rotCols * sh + (rotCols - 1) * gx : 0
        );
        const boundHeight = rotRows > 0 ? startY + rotRows * sw + (rotRows - 1) * gy : usedH;

        bestResult = { count: totalCount, stickers, boundWidth, boundHeight, cols: Math.max(stdCols, rotCols), rows: rStd + rotRows };
      }
    }

    return bestResult;
  }

  static _calcLShapedPacking(pw, ph, sw, sh, gx, gy, shape, cornerRadius) {
    if (Math.abs(sw - sh) < 0.1) {
      return this._calcStandard(pw, ph, sw, sh, gx, gy, shape, cornerRadius);
    }

    let bestResult = { count: 0, stickers: [], boundWidth: 0, boundHeight: 0, cols: 0, rows: 0 };
    const maxC1 = Math.floor((pw + gx) / (sw + gx));
    const maxR1 = Math.floor((ph + gy) / (sh + gy));

    for (let c1 = 1; c1 <= maxC1; c1++) {
      for (let r1 = 1; r1 <= maxR1; r1++) {
        const w1 = c1 * sw + (c1 - 1) * gx;
        const h1 = r1 * sh + (r1 - 1) * gy;

        // --- Configuration A: Tall right strip (height ph) + Short bottom strip (width w1) ---
        const remW_A = pw - w1 - gx;
        const cR_std_A = remW_A > 0 ? Math.floor((remW_A + gx) / (sw + gx)) : 0;
        const rR_std_A = remW_A > 0 ? Math.floor((ph + gy) / (sh + gy)) : 0;
        const cR_rot_A = remW_A > 0 ? Math.floor((remW_A + gx) / (sh + gx)) : 0;
        const rR_rot_A = remW_A > 0 ? Math.floor((ph + gy) / (sw + gy)) : 0;
        const useRotR_A = (cR_rot_A * rR_rot_A) >= (cR_std_A * rR_std_A);
        const cR_A = useRotR_A ? cR_rot_A : cR_std_A;
        const rR_A = useRotR_A ? rR_rot_A : rR_std_A;

        const remH_A = ph - h1 - gy;
        const cB_std_A = remH_A > 0 ? Math.floor((w1 + gx) / (sw + gx)) : 0;
        const rB_std_A = remH_A > 0 ? Math.floor((remH_A + gy) / (sh + gy)) : 0;
        const cB_rot_A = remH_A > 0 ? Math.floor((w1 + gx) / (sh + gx)) : 0;
        const rB_rot_A = remH_A > 0 ? Math.floor((remH_A + gy) / (sw + gy)) : 0;
        const useRotB_A = (cB_rot_A * rB_rot_A) > (cB_std_A * rB_std_A);
        const cB_A = useRotB_A ? cB_rot_A : cB_std_A;
        const rB_A = useRotB_A ? rB_rot_A : rB_std_A;

        const totalA = (c1 * r1) + (cR_A * rR_A) + (cB_A * rB_A);
        if (totalA > bestResult.count) {
          const stickers = [];
          let idx = 1;

          for (let r = 0; r < r1; r++) {
            for (let c = 0; c < c1; c++) {
              stickers.push({
                index: idx++,
                x: c * (sw + gx),
                y: r * (sh + gy),
                width: sw,
                height: sh,
                shape,
                cornerRadius,
                rotated: false,
                row: r + 1,
                col: c + 1
              });
            }
          }

          const rW_A = useRotR_A ? sh : sw;
          const rH_A = useRotR_A ? sw : sh;
          const startX_R_A = w1 + gx;
          for (let r = 0; r < rR_A; r++) {
            for (let c = 0; c < cR_A; c++) {
              stickers.push({
                index: idx++,
                x: startX_R_A + c * (rW_A + gx),
                y: r * (rH_A + gy),
                width: rW_A,
                height: rH_A,
                originalWidth: sw,
                originalHeight: sh,
                shape,
                cornerRadius,
                rotated: useRotR_A,
                row: r + 1,
                col: c1 + c + 1
              });
            }
          }

          const bW_A = useRotB_A ? sh : sw;
          const bH_A = useRotB_A ? sw : sh;
          const startY_B_A = h1 + gy;
          for (let r = 0; r < rB_A; r++) {
            for (let c = 0; c < cB_A; c++) {
              stickers.push({
                index: idx++,
                x: c * (bW_A + gx),
                y: startY_B_A + r * (bH_A + gy),
                width: bW_A,
                height: bH_A,
                originalWidth: sw,
                originalHeight: sh,
                shape,
                cornerRadius,
                rotated: useRotB_A,
                row: r1 + r + 1,
                col: c + 1
              });
            }
          }

          let boundW = w1;
          if (cR_A > 0) boundW = Math.max(boundW, startX_R_A + cR_A * rW_A + (cR_A - 1) * gx);
          if (cB_A > 0) boundW = Math.max(boundW, cB_A * bW_A + (cB_A - 1) * gx);

          let boundH = h1;
          if (rR_A > 0) boundH = Math.max(boundH, rR_A * rH_A + (rR_A - 1) * gy);
          if (rB_A > 0) boundH = Math.max(boundH, startY_B_A + rB_A * bH_A + (rB_A - 1) * gy);

          bestResult = {
            count: totalA,
            stickers,
            boundWidth: boundW,
            boundHeight: boundH,
            cols: Math.max(c1 + cR_A, cB_A),
            rows: Math.max(r1 + rB_A, rR_A)
          };
        }

        // --- Configuration B: Short right strip (height h1) + Wide bottom strip (width pw) ---
        const remW_B = pw - w1 - gx;
        const cR_std_B = remW_B > 0 ? Math.floor((remW_B + gx) / (sw + gx)) : 0;
        const rR_std_B = remW_B > 0 ? Math.floor((h1 + gy) / (sh + gy)) : 0;
        const cR_rot_B = remW_B > 0 ? Math.floor((remW_B + gx) / (sh + gx)) : 0;
        const rR_rot_B = remW_B > 0 ? Math.floor((h1 + gy) / (sw + gy)) : 0;
        const useRotR_B = (cR_rot_B * rR_rot_B) >= (cR_std_B * rR_std_B);
        const cR_B = useRotR_B ? cR_rot_B : cR_std_B;
        const rR_B = useRotR_B ? rR_rot_B : rR_std_B;

        const remH_B2 = ph - h1 - gy;
        const cB_std_B = remH_B2 > 0 ? Math.floor((pw + gx) / (sw + gx)) : 0;
        const rB_std_B = remH_B2 > 0 ? Math.floor((remH_B2 + gy) / (sh + gy)) : 0;
        const cB_rot_B = remH_B2 > 0 ? Math.floor((pw + gx) / (sh + gx)) : 0;
        const rB_rot_B = remH_B2 > 0 ? Math.floor((remH_B2 + gy) / (sw + gy)) : 0;
        const useRotB_B = (cB_rot_B * rB_rot_B) > (cB_std_B * rB_std_B);
        const cB_B = useRotB_B ? cB_rot_B : cB_std_B;
        const rB_B = useRotB_B ? rB_rot_B : rB_std_B;

        const totalB = (c1 * r1) + (cR_B * rR_B) + (cB_B * rB_B);
        if (totalB > bestResult.count) {
          const stickers = [];
          let idx = 1;

          for (let r = 0; r < r1; r++) {
            for (let c = 0; c < c1; c++) {
              stickers.push({
                index: idx++,
                x: c * (sw + gx),
                y: r * (sh + gy),
                width: sw,
                height: sh,
                shape,
                cornerRadius,
                rotated: false,
                row: r + 1,
                col: c + 1
              });
            }
          }

          const rW_B = useRotR_B ? sh : sw;
          const rH_B = useRotR_B ? sw : sh;
          const startX_R_B = w1 + gx;
          for (let r = 0; r < rR_B; r++) {
            for (let c = 0; c < cR_B; c++) {
              stickers.push({
                index: idx++,
                x: startX_R_B + c * (rW_B + gx),
                y: r * (rH_B + gy),
                width: rW_B,
                height: rH_B,
                originalWidth: sw,
                originalHeight: sh,
                shape,
                cornerRadius,
                rotated: useRotR_B,
                row: r + 1,
                col: c1 + c + 1
              });
            }
          }

          const bW_B = useRotB_B ? sh : sw;
          const bH_B = useRotB_B ? sw : sh;
          const startY_B_B = h1 + gy;
          for (let r = 0; r < rB_B; r++) {
            for (let c = 0; c < cB_B; c++) {
              stickers.push({
                index: idx++,
                x: c * (bW_B + gx),
                y: startY_B_B + r * (bH_B + gy),
                width: bW_B,
                height: bH_B,
                originalWidth: sw,
                originalHeight: sh,
                shape,
                cornerRadius,
                rotated: useRotB_B,
                row: r1 + r + 1,
                col: c + 1
              });
            }
          }

          let boundW = w1;
          if (cR_B > 0) boundW = Math.max(boundW, startX_R_B + cR_B * rW_B + (cR_B - 1) * gx);
          if (cB_B > 0) boundW = Math.max(boundW, cB_B * bW_B + (cB_B - 1) * gx);

          let boundH = h1;
          if (rR_B > 0) boundH = Math.max(boundH, rR_B * rH_B + (rR_B - 1) * gy);
          if (rB_B > 0) boundH = Math.max(boundH, startY_B_B + rB_B * bH_B + (rB_B - 1) * gy);

          bestResult = {
            count: totalB,
            stickers,
            boundWidth: boundW,
            boundHeight: boundH,
            cols: Math.max(c1 + cR_B, cB_B),
            rows: r1 + rB_B
          };
        }
      }
    }

    return bestResult;
  }

  static _calcHoneycomb(pw, ph, sw, sh, gx, gy, shape, cornerRadius) {
    if (sw <= 0 || sh <= 0 || pw < sw || ph < sh) {
      return { count: 0, cols: 0, rows: 0, boundWidth: 0, boundHeight: 0, stickers: [] };
    }

    const effectiveRowHeight = (sh + gy) * 0.8660254; 
    const rowsA = Math.floor((ph - sh) / effectiveRowHeight) + 1;
    let resultA = { count: 0, cols: 0, rows: 0, boundWidth: 0, boundHeight: 0, stickers: [] };

    if (rowsA > 0) {
      const stickers = [];
      let idx = 1;
      let maxUsedW = 0;

      for (let r = 0; r < rowsA; r++) {
        const isOdd = r % 2 === 1;
        const xOffset = isOdd ? (sw + gx) / 2 : 0;
        const y = r * effectiveRowHeight;

        const availableW = pw - xOffset;
        const colsInRow = Math.floor((availableW + gx) / (sw + gx));

        for (let c = 0; c < colsInRow; c++) {
          const x = xOffset + c * (sw + gx);
          maxUsedW = Math.max(maxUsedW, x + sw);
          stickers.push({
            index: idx++,
            x,
            y,
            width: sw,
            height: sh,
            shape,
            cornerRadius,
            rotated: false,
            row: r + 1,
            col: c + 1
          });
        }
      }

      const boundHeight = (rowsA - 1) * effectiveRowHeight + sh;
      resultA = {
        count: stickers.length,
        cols: Math.floor((pw + gx) / (sw + gx)),
        rows: rowsA,
        boundWidth: maxUsedW,
        boundHeight,
        stickers
      };
    }

    const effectiveColWidth = (sw + gx) * 0.8660254;
    const colsB = Math.floor((pw - sw) / effectiveColWidth) + 1;
    let resultB = { count: 0, cols: 0, rows: 0, boundWidth: 0, boundHeight: 0, stickers: [] };

    if (colsB > 0) {
      const stickers = [];
      let idx = 1;
      let maxUsedH = 0;

      for (let c = 0; c < colsB; c++) {
        const isOdd = c % 2 === 1;
        const yOffset = isOdd ? (sh + gy) / 2 : 0;
        const x = c * effectiveColWidth;

        const availableH = ph - yOffset;
        const rowsInCol = Math.floor((availableH + gy) / (sh + gy));

        for (let r = 0; r < rowsInCol; r++) {
          const y = yOffset + r * (sh + gy);
          maxUsedH = Math.max(maxUsedH, y + sh);
          stickers.push({
            index: idx++,
            x,
            y,
            width: sw,
            height: sh,
            shape,
            cornerRadius,
            rotated: false,
            row: r + 1,
            col: c + 1
          });
        }
      }

      const boundWidth = (colsB - 1) * effectiveColWidth + sw;
      resultB = {
        count: stickers.length,
        cols: colsB,
        rows: Math.floor((ph + gy) / (sh + gy)),
        boundWidth,
        boundHeight: maxUsedH,
        stickers
      };
    }

    return resultA.count >= resultB.count ? resultA : resultB;
  }

  static _calcInterlockedHexagon(pw, ph, sw, sh, gx, gy, cornerRadius) {
    if (sw <= 0 || sh <= 0 || pw < sw || ph < sh) {
      return { count: 0, cols: 0, rows: 0, boundWidth: 0, boundHeight: 0, stickers: [] };
    }

    const colPitch = sw + gx;
    const s = Math.min(sw, sh) / 2;
    const vPitch = 1.5 * s + gy;

    const rows = Math.floor((ph - sh) / vPitch) + 1;
    if (rows <= 0) return { count: 0, cols: 0, rows: 0, boundWidth: 0, boundHeight: 0, stickers: [] };

    const stickers = [];
    let idx = 1;
    let maxUsedW = 0;

    for (let r = 0; r < rows; r++) {
      const isOdd = r % 2 === 1;
      const xOffset = isOdd ? colPitch / 2 : 0;
      const y = r * vPitch;

      const availW = pw - xOffset;
      const cols = Math.floor((availW + gx) / colPitch);

      for (let c = 0; c < cols; c++) {
        const x = xOffset + c * colPitch;
        maxUsedW = Math.max(maxUsedW, x + sw);
        stickers.push({
          index: idx++,
          x,
          y,
          width: sw,
          height: sh,
          shape: 'hexagon',
          cornerRadius,
          rotated: false,
          row: r + 1,
          col: c + 1
        });
      }
    }

    const boundH = (rows - 1) * vPitch + sh;
    return {
      count: stickers.length,
      cols: Math.floor((pw + gx) / colPitch),
      rows,
      boundWidth: maxUsedW,
      boundHeight: boundH,
      stickers
    };
  }

  static _applyAlignment(stickers, boundW, boundH, packW, packH, originX, originY, alignment) {
    let offsetX = 0;
    let offsetY = 0;

    if (alignment === 'center') {
      offsetX = Math.max(0, (packW - boundW) / 2);
      offsetY = Math.max(0, (packH - boundH) / 2);
    }

    return stickers.map(s => ({
      ...s,
      x: originX + s.x + offsetX,
      y: originY + s.y + offsetY
    }));
  }

  static _getStickerArea(shape, w, h, cornerRadius = 0) {
    if (shape === 'circle') {
      const r = w / 2;
      return Math.PI * r * r;
    }
    if (shape === 'oval') {
      return Math.PI * (w / 2) * (h / 2);
    }
    if (shape === 'hexagon') {
      const s = Math.min(w, h) / 2;
      return (3 * Math.sqrt(3) / 2) * s * s;
    }
    if (shape === 'round_rect' && cornerRadius > 0) {
      const r = Math.min(cornerRadius, w / 2, h / 2);
      return (w * h) - (4 - Math.PI) * r * r;
    }
    return w * h;
  }

  static _getCutPerimeter(shape, w, h, cornerRadius = 0) {
    if (shape === 'circle') {
      return Math.PI * w;
    }
    if (shape === 'oval') {
      const a = w / 2;
      const b = h / 2;
      
      return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
    }
    if (shape === 'hexagon') {
      
      return 6 * (w / 2);
    }
    if (shape === 'round_rect' && cornerRadius > 0) {
      const r = Math.min(cornerRadius, w / 2, h / 2);
      return 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r;
    }
    return 2 * (w + h);
  }
}

if (typeof window !== 'undefined') {
  window.LayoutCalculator = LayoutCalculator;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LayoutCalculator };
}

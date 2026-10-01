const UNIT_CONVERSIONS = {
  mm: 1,
  cm: 10,
  in: 25.4
};

const PAPER_PRESETS = [
  {
    id: 'super_a3',
    name: '13" × 19" (Super A3 / Plus)',
    category: 'Digital Production',
    width: 330.2, 
    height: 482.6, 
    
    printableWidth: 317.5, 
    printableHeight: 469.9, 
    margin: 6.35 
  },
  {
    id: 'sra3',
    name: 'SRA3 (320 × 450 mm)',
    category: 'Digital Production',
    width: 320,
    height: 450,
    printableWidth: 310,
    printableHeight: 440,
    margin: 5
  },
  {
    id: 'a3',
    name: 'A3 (297 × 420 mm)',
    category: 'Standard ISO',
    width: 297,
    height: 420,
    printableWidth: 287,
    printableHeight: 410,
    margin: 5
  },
  {
    id: 'a4',
    name: 'A4 (210 × 297 mm)',
    category: 'Standard ISO',
    width: 210,
    height: 297,
    printableWidth: 200,
    printableHeight: 287,
    margin: 5
  },
  {
    id: 'a5',
    name: 'A5 (148 × 210 mm)',
    category: 'Standard ISO',
    width: 148,
    height: 210,
    printableWidth: 140,
    printableHeight: 202,
    margin: 4
  },
  {
    id: 'tabloid',
    name: 'Tabloid / Ledger (11" × 17")',
    category: 'North American',
    width: 279.4,
    height: 431.8,
    printableWidth: 269.4,
    printableHeight: 421.8,
    margin: 5
  },
  {
    id: 'letter',
    name: 'Letter (8.5" × 11")',
    category: 'North American',
    width: 215.9,
    height: 279.4,
    printableWidth: 205.9,
    printableHeight: 269.4,
    margin: 5
  },
  {
    id: 'legal',
    name: 'Legal (8.5" × 14")',
    category: 'North American',
    width: 215.9,
    height: 355.6,
    printableWidth: 205.9,
    printableHeight: 345.6,
    margin: 5
  },
  {
    id: 'custom',
    name: 'Custom Paper...',
    category: 'Custom',
    width: 330.2,
    height: 482.6,
    printableWidth: 317.5,
    printableHeight: 469.9,
    margin: 6.35
  }
];

const STICKER_PRESETS = [
  { id: 'circle_2in', name: '2.0" Circle (50.8 mm)', shape: 'circle', width: 50.8, height: 50.8, cornerRadius: 0 },
  { id: 'circle_1_5in', name: '1.5" Circle (38.1 mm)', shape: 'circle', width: 38.1, height: 38.1, cornerRadius: 0 },
  { id: 'circle_2_5in', name: '2.5" Circle (63.5 mm)', shape: 'circle', width: 63.5, height: 63.5, cornerRadius: 0 },
  { id: 'circle_3in', name: '3.0" Circle (76.2 mm)', shape: 'circle', width: 76.2, height: 76.2, cornerRadius: 0 },
  { id: 'circle_50mm', name: '50 mm Circle (5 cm)', shape: 'circle', width: 50, height: 50, cornerRadius: 0 },
  { id: 'circle_35mm', name: '35 mm Circle', shape: 'circle', width: 35, height: 35, cornerRadius: 0 },
  { id: 'square_2in', name: '2" × 2" Square (50.8 mm)', shape: 'square', width: 50.8, height: 50.8, cornerRadius: 0 },
  { id: 'square_50mm', name: '50 × 50 mm Square', shape: 'square', width: 50, height: 50, cornerRadius: 0 },
  { id: 'round_rect_2x3', name: '2" × 3" Rounded Card', shape: 'round_rect', width: 50.8, height: 76.2, cornerRadius: 5 },
  { id: 'rect_2x3_5', name: '2" × 3.5" Business Card', shape: 'round_rect', width: 50.8, height: 88.9, cornerRadius: 3 },
  { id: 'rect_50x30', name: '50 × 30 mm Barcode/Label', shape: 'rectangle', width: 50, height: 30, cornerRadius: 0 },
  { id: 'rect_70x50', name: '70 × 50 mm Product Label', shape: 'round_rect', width: 70, height: 50, cornerRadius: 4 },
  { id: 'oval_2x3', name: '2" × 3" Oval', shape: 'oval', width: 50.8, height: 76.2, cornerRadius: 0 },
  { id: 'hexagon_2in', name: '2" Hexagon (50.8 mm)', shape: 'hexagon', width: 50.8, height: 50.8, cornerRadius: 0 },
  { id: 'custom_sticker', name: 'Custom Dimensions...', shape: 'rectangle', width: 50, height: 50, cornerRadius: 0 }
];

if (typeof window !== 'undefined') {
  window.PAPER_PRESETS = PAPER_PRESETS;
  window.STICKER_PRESETS = STICKER_PRESETS;
  window.UNIT_CONVERSIONS = UNIT_CONVERSIONS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PAPER_PRESETS, STICKER_PRESETS, UNIT_CONVERSIONS };
}

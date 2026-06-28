export type PaletteType = 'true-color' | 'gameboy' | 'nes' | 'cga' | 'monochrome';

// Pre-defined color palettes in RGB format
const PALETTES: Record<Exclude<PaletteType, 'true-color'>, [number, number, number][]> = {
    'gameboy': [
        [15, 56, 15],
        [48, 98, 48],
        [139, 172, 15],
        [155, 188, 15]
    ],
    'nes': [
        // simplified classic NES palette
        [124, 124, 124], [0, 0, 252], [0, 0, 188], [68, 40, 188], [148, 0, 132], [168, 0, 32], 
        [168, 16, 0], [136, 20, 0], [80, 48, 0], [0, 120, 0], [0, 104, 0], [0, 88, 0], 
        [0, 64, 88], [0, 0, 0], [188, 188, 188], [0, 120, 248], [0, 88, 248], [104, 68, 252],
        [216, 0, 204], [228, 0, 88], [248, 56, 0], [228, 92, 16], [172, 124, 0], [0, 184, 0],
        [0, 168, 0], [0, 168, 68], [0, 136, 136], [248, 248, 248], [60, 188, 252], [104, 136, 252],
        [152, 120, 248], [248, 120, 248], [248, 88, 152], [248, 120, 88], [252, 160, 68], [248, 184, 0],
        [184, 248, 24], [88, 216, 84], [88, 248, 152], [0, 232, 216], [120, 120, 120], [164, 228, 252],
        [184, 184, 248], [216, 184, 248], [248, 184, 248], [248, 164, 192], [240, 208, 176], [252, 224, 168],
        [248, 216, 120], [216, 248, 120], [184, 248, 184], [184, 248, 216], [0, 252, 252], [248, 216, 248],
        [0, 0, 0], [255, 255, 255]
    ],
    'cga': [
        [0, 0, 0], [85, 255, 255], [255, 85, 255], [255, 255, 255], // Palette 1 High Intensity
        [0, 0, 0], [0, 170, 170], [170, 0, 170], [170, 170, 170]  // Palette 1 Low Intensity
    ],
    'monochrome': [
        [0, 0, 0],
        [255, 255, 255]
    ]
};

// Find closest color in palette using Euclidean distance
function getClosestColor(r: number, g: number, b: number, palette: [number, number, number][]): [number, number, number] {
    let closest = palette[0];
    let minDistance = Infinity;

    for (const color of palette) {
        const dist = Math.sqrt(
            Math.pow(r - color[0], 2) +
            Math.pow(g - color[1], 2) +
            Math.pow(b - color[2], 2)
        );
        if (dist < minDistance) {
            minDistance = dist;
            closest = color;
        }
    }
    return closest;
}

export function generatePixelArt(
    sourceCanvas: HTMLCanvasElement, 
    displayCanvas: HTMLCanvasElement, 
    pixelSize: number, 
    paletteType: PaletteType,
    contrast: number,
    saturation: number
) {
    const ctx = displayCanvas.getContext('2d', { willReadFrequently: true });
    const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx || !sourceCtx) return;

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    // Set dimensions to match source precisely
    displayCanvas.width = width;
    displayCanvas.height = height;

    // Optimization: if true-color and no image adjustment, use fast standard block sampling
    if (paletteType === 'true-color' && contrast === 100 && saturation === 100) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        const scaledW = Math.max(1, Math.floor(width / pixelSize));
        const scaledH = Math.max(1, Math.floor(height / pixelSize));
        
        tempCanvas.width = scaledW;
        tempCanvas.height = scaledH;

        // Draw small
        tempCtx.drawImage(sourceCanvas, 0, 0, scaledW, scaledH);
        
        // Draw large (Nearest neighbor)
        ctx.imageSmoothingEnabled = false;
        (ctx as any).mozImageSmoothingEnabled = false;
        (ctx as any).webkitImageSmoothingEnabled = false;
        
        ctx.drawImage(tempCanvas, 0, 0, width, height);
        return;
    }

    // Advanced Grid Averaging & Palettes
    // 1. Draw source to display first to get base image
    ctx.drawImage(sourceCanvas, 0, 0, width, height);
    
    // 2. Get ImageData
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Apply Contrast/Saturation to the whole dataset first if needed
    if (contrast !== 100 || saturation !== 100) {
        const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const satRatio = saturation / 100;
        
        for (let i = 0; i < data.length; i += 4) {
            // Contrast
            if (contrast !== 100) {
                data[i] = Math.max(0, Math.min(255, contrastFactor * (data[i] - 128) + 128));
                data[i + 1] = Math.max(0, Math.min(255, contrastFactor * (data[i + 1] - 128) + 128));
                data[i + 2] = Math.max(0, Math.min(255, contrastFactor * (data[i + 2] - 128) + 128));
            }
            
            // Saturation
            if (saturation !== 100) {
                let r = data[i], g = data[i+1], b = data[i+2];
                // Gray value (luminance)
                let gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
                
                data[i] = Math.max(0, Math.min(255, gray + (r - gray) * satRatio));
                data[i+1] = Math.max(0, Math.min(255, gray + (g - gray) * satRatio));
                data[i+2] = Math.max(0, Math.min(255, gray + (b - gray) * satRatio));
            }
        }
    }

    // We process block by block
    for (let y = 0; y < height; y += pixelSize) {
        for (let x = 0; x < width; x += pixelSize) {
            let rTotal = 0, gTotal = 0, bTotal = 0, aTotal = 0;
            let count = 0;

            // Calculate average color for the block
            for (let by = 0; by < pixelSize && y + by < height; by++) {
                for (let bx = 0; bx < pixelSize && x + bx < width; bx++) {
                    const offset = ((y + by) * width + (x + bx)) * 4;
                    rTotal += data[offset];
                    gTotal += data[offset + 1];
                    bTotal += data[offset + 2];
                    aTotal += data[offset + 3];
                    count++;
                }
            }

            let avgR = Math.round(rTotal / count);
            let avgG = Math.round(gTotal / count);
            let avgB = Math.round(bTotal / count);
            const avgA = Math.round(aTotal / count);

            if (paletteType !== 'true-color') {
                const closest = getClosestColor(avgR, avgG, avgB, PALETTES[paletteType]);
                avgR = closest[0];
                avgG = closest[1];
                avgB = closest[2];
            }

            // Fill block
            ctx.fillStyle = `rgba(${avgR}, ${avgG}, ${avgB}, ${avgA / 255})`;
            ctx.fillRect(x, y, pixelSize, pixelSize);
        }
    }
}

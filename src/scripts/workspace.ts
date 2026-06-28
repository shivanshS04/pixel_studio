import { generatePixelArt, type PaletteType } from './pixelation';

export function initWorkspace() {
    if (typeof window === 'undefined') return;
    
    // UI Elements
    const dropZone = document.getElementById('drop-zone') as HTMLDivElement;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const container = document.getElementById('workspace-container') as HTMLDivElement;
    const originalCanvas = document.getElementById('original-canvas') as HTMLCanvasElement;
    const displayCanvas = document.getElementById('display-canvas') as HTMLCanvasElement;
    
    // Scrubber
    const slider = document.getElementById('comparison-slider') as HTMLInputElement;
    const handle = document.getElementById('comparison-handle') as HTMLDivElement;
    const clipWrapper = document.getElementById('original-clip-wrapper') as HTMLDivElement;
    
    // Inputs
    const sizeInput = document.getElementById('input-pixel-size') as HTMLInputElement;
    const sizeLabel = document.getElementById('label-pixel-size') as HTMLSpanElement;
    const paletteInput = document.getElementById('input-palette') as HTMLSelectElement;
    const contrastInput = document.getElementById('input-contrast') as HTMLInputElement;
    const contrastLabel = document.getElementById('label-contrast') as HTMLSpanElement;
    const satInput = document.getElementById('input-saturation') as HTMLInputElement;
    const satLabel = document.getElementById('label-saturation') as HTMLSpanElement;
    const btnDownload = document.getElementById('btn-download') as HTMLButtonElement;
    const btnCopy = document.getElementById('btn-copy') as HTMLButtonElement;
    
    // Theme Toggle
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            const isDark = document.documentElement.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

    let currentImage: HTMLImageElement | null = null;
    
    // File processing
    function handleFile(file: File) {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (PNG, JPEG, WebP).');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            alert('File is too large! Please select an image under 10MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                currentImage = img;
                dropZone.dataset.hasImage = 'true';
                document.getElementById('canvas-container')!.dataset.hasImage = 'true';
                
                // Draw original to source canvas
                originalCanvas.width = img.naturalWidth;
                originalCanvas.height = img.naturalHeight;
                const ctx = originalCanvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                }
                
                // Reset slider
                slider.value = '50';
                updateScrubber();

                render();
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    }

    // Event listeners for file
    fileInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) handleFile(file);
    });
    
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-primary', 'bg-card-hover/80');
    });
    container.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-primary', 'bg-card-hover/80');
    });
    container.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary', 'bg-card-hover/80');
        const file = e.dataTransfer?.files[0];
        if (file) handleFile(file);
    });

    // Render loop
    function render() {
        if (!currentImage) return;
        
        const size = parseInt(sizeInput.value);
        const palette = paletteInput.value as PaletteType;
        const contrast = parseInt(contrastInput.value) - 100 + 100;
        const saturation = parseInt(satInput.value);
        
        generatePixelArt(originalCanvas, displayCanvas, size, palette, contrast, saturation);
    }
    
    // Debounce render for sliders
    let renderTimeout: number;
    function debouncedRender() {
        cancelAnimationFrame(renderTimeout);
        renderTimeout = requestAnimationFrame(() => {
            render();
        });
    }

    // Inputs bindings
    sizeInput.addEventListener('input', () => {
        sizeLabel.textContent = `${sizeInput.value}px`;
        debouncedRender();
    });
    
    paletteInput.addEventListener('change', () => {
        debouncedRender();
    });
    
    contrastInput.addEventListener('input', () => {
        contrastLabel.textContent = `${contrastInput.value}%`;
        debouncedRender();
    });
    
    satInput.addEventListener('input', () => {
        satLabel.textContent = `${satInput.value}%`;
        debouncedRender();
    });
    
    // Scrubber functionality
    function updateScrubber() {
        const val = slider.value;
        clipWrapper.style.clipPath = `inset(0 ${100 - parseInt(val)}% 0 0)`;
        handle.style.left = `${val}%`;
    }
    
    if (slider) {
        slider.addEventListener('input', updateScrubber);
    }
    
    // Export
    btnDownload.addEventListener('click', () => {
        if (!currentImage) return;
        const link = document.createElement('a');
        link.download = `pixelated-${Date.now()}.png`;
        link.href = displayCanvas.toDataURL('image/png');
        link.click();
    });
    
    btnCopy.addEventListener('click', async () => {
        if (!currentImage) return;
        try {
            displayCanvas.toBlob(async (blob) => {
                if (!blob) return;
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                
                const originalText = btnCopy.innerHTML;
                btnCopy.innerHTML = `<svg class="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>`;
                setTimeout(() => {
                    btnCopy.innerHTML = originalText;
                }, 2000);
            });
        } catch (e) {
            alert('Failed to copy image to clipboard.');
        }
    });
}

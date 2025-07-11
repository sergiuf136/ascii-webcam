import './style.css';

const video = document.getElementById('video') as HTMLVideoElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const asciiEl = document.getElementById('ascii') as HTMLPreElement;
const saturationInput = document.getElementById('saturationRange') as HTMLInputElement;
const bitDepthInput = document.getElementById('bitDepthRange') as HTMLInputElement;
const ctx = canvas.getContext('2d')!;
const word = 'PLANT';
let plantIndex = 0;
let plantMap: boolean[][] = [];
const toggleBtn = document.getElementById('toggleBtn') as HTMLButtonElement;
let isRunning = false;
let animationFrame: number;

// const saturation = parseFloat(saturationInput.value); // e.g. 0.5, 1.0
// const bitDepth = parseInt(bitDepthInput.value);

// 1. Define settings
const settings = {
    cols: 120,
    brightness: 1.2,
    contrast: 1.5,
    charSet: "@%#*+=-:. ",
    invert: true,
    spacing: 0.3, // in px
    lineSpacing: 8, // line-height in px
    fontSize: 8, // <-- new
    saturation: 1,
    bitDepth: 32
};

// 2. Load saved settings
const saved = localStorage.getItem('asciiSettings');
if (saved) {
    Object.assign(settings, JSON.parse(saved));
}

// 3. Save function
function saveSettings() {
    localStorage.setItem('asciiSettings', JSON.stringify(settings));
}

function setupCustomControls() {
    const get = (id: string) => document.getElementById(id) as HTMLInputElement;

    get('colsRange').value = settings.cols.toString();
    get('brightnessRange').value = settings.brightness.toString();
    get('contrastRange').value = settings.contrast.toString();
    get('invertCheckbox').checked = settings.invert;
    get('spacingRange').value = settings.spacing.toString();
    get('lineHeightRange').value = settings.lineSpacing.toString();

    get('brightnessRange').oninput = () => { settings.brightness = +get('brightnessRange').value; saveSettings(); };
    get('contrastRange').oninput = () => { settings.contrast = +get('contrastRange').value; saveSettings(); };
    get('invertCheckbox').onchange = () => { settings.invert = get('invertCheckbox').checked; saveSettings(); };
    get('spacingRange').oninput = () => {
        settings.spacing = +get('spacingRange').value;
        updateSpacing();
        saveSettings();
    };
    get('lineHeightRange').oninput = () => {
        settings.lineSpacing = +get('lineHeightRange').value;
        updateSpacing();
        saveSettings();
    };
    const fontSizeRange = document.getElementById('fontSizeRange') as HTMLInputElement;
    fontSizeRange.value = settings.fontSize?.toString() || "8";

    fontSizeRange.addEventListener('input', () => {
        const val = parseInt(fontSizeRange.value, 10);
        settings.fontSize = val;
        asciiEl.style.fontSize = `${val}px`;
        saveSettings();
    });
    const colsRange = document.getElementById('colsRange') as HTMLInputElement;
    colsRange.value = settings.cols?.toString() || "60";
    colsRange.addEventListener('input', () => {
        settings.cols = parseInt(colsRange.value);
        saveSettings();
        updateFontSize();
    });

    saturationInput.addEventListener('input', () => {
        settings.saturation = parseFloat(saturationInput.value);
    });
    bitDepthInput.addEventListener('input', () => {
        settings.bitDepth = parseInt(bitDepthInput.value);
    });
}

function updateFontSize() {
    const vw = window.innerWidth;
    const charWidthFactor = 0.6; // Monospace typical width
    const lineHeightFactor = 1.1;

    const fontSize = Math.min(vw / (settings.cols * charWidthFactor), 32); // optional max
    const lineHeight = fontSize * lineHeightFactor;

    asciiEl.style.fontSize = `${fontSize}px`;
    asciiEl.style.lineHeight = `${lineHeight}px`;
}
function brightnessToChar(bright: number, x: number, y: number): string {
    const value = settings.invert ? 255 - bright : bright;
    const enterThreshold = 38; // below this = enter PLANT
    const exitThreshold = 50; // above this = exit PLANT

    const isPlant = plantMap[y][x];

    if (!isPlant && value < enterThreshold) {
        plantMap[y][x] = true;
    } else if (isPlant && value > exitThreshold) {
        plantMap[y][x] = false;
    }

    if (plantMap[y][x]) {
        const char = word[plantIndex % word.length];
        plantIndex++;
        return char;
    }

    const index = Math.floor((value / 255) * (settings.charSet.length - 1));
    return settings.charSet[index] ?? ' ';
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        h = (
            max === r ? (g - b) / d + (g < b ? 6 : 0) :
                max === g ? (b - r) / d + 2 :
                    (r - g) / d + 4
        ) / 6;
    }

    return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        return t < 1 / 6 ? p + (q - p) * 6 * t :
            t < 1 / 2 ? q :
                t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 :
                    p;
    };

    let r, g, b;

    if (s === 0) r = g = b = l; // achromatic
    else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function quantizeColor(r: number, g: number, b: number, levels: number): [number, number, number] {
    const step = 255 / (levels - 1);
    return [
        Math.round(r / step) * step,
        Math.round(g / step) * step,
        Math.round(b / step) * step,
    ];
}

function adjustSaturation(r: number, g: number, b: number, factor: number): [number, number, number] {
    // Convert to HSL
    const [h, s, l] = rgbToHsl(r, g, b);
    const newS = Math.min(1, Math.max(0, s * factor)); // clamp 0–1
    return hslToRgb(h, newS, l);
}

function updateSpacing() {
    asciiEl.style.letterSpacing = `${settings.spacing}px`;
    asciiEl.style.lineHeight = `${settings.lineSpacing}px`;
}

function adjust(v: number): number {
    return Math.min(255, Math.max(0, ((v - 128) * settings.contrast + 128) * settings.brightness));
}



async function startWebcam() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await video.play();
    isRunning = true;
    toggleBtn.textContent = 'Stop';
    renderLoop();
}

function stopWebcam() {
    const stream = video.srcObject as MediaStream;
    stream.getTracks().forEach(track => track.stop());
    isRunning = false;
    cancelAnimationFrame(animationFrame);
    toggleBtn.textContent = 'Start';
}

toggleBtn.addEventListener('click', () => {
    if (isRunning) stopWebcam();
    else startWebcam();
});

function renderLoop() {
    if (!isRunning) return;

    plantIndex = 0;
    const cols = settings.cols;
    const cellW = video.videoWidth / cols;
    const cellH = cellW * 2;
    const rows = Math.floor(video.videoHeight / cellH);

    canvas.width = cols;
    canvas.height = rows;
    ctx.drawImage(video, 0, 0, cols, rows);
    const pixels = ctx.getImageData(0, 0, cols, rows).data;

    if (plantMap.length !== rows) {
        plantMap = Array.from({ length: rows }, () => Array(cols).fill(false));
    }

    let ascii = '';
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const i = (y * cols + x) * 4;
            const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
            let brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            brightness = adjust(brightness);

            let [r1, g1, b1] = adjustSaturation(r, g, b, settings.saturation);
            [r1, g1, b1] = quantizeColor(r1, g1, b1, settings.bitDepth);          // e.g. 8 or 16 or 32

            const char = brightnessToChar(brightness, x, y);
            ascii += `<span style="color: rgb(${r1}, ${g1}, ${b1})">${char}</span>`;


        }
        ascii += '\n';
    }


    asciiEl.innerHTML = ascii;
    animationFrame = requestAnimationFrame(renderLoop);
}

//setupGUI();
// asciiEl.style.position = 'absolute'; // <-- make sure this is correct
// asciiEl.style.top = '50%';
// asciiEl.style.left = '50%';
// asciiEl.style.transform = 'translate(-50%, -50%)';
setupCustomControls();
updateSpacing();
startWebcam();
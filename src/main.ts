import './style.css';

const video = document.getElementById('video') as HTMLVideoElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const asciiEl = document.getElementById('ascii') as HTMLPreElement;
const ctx = canvas.getContext('2d')!;
const word = 'PLANT';
let plantIndex = 0;
let plantMap: boolean[][] = [];
const toggleBtn = document.getElementById('toggleBtn') as HTMLButtonElement;
let isRunning = false;
let animationFrame: number;

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
            ascii += brightnessToChar(brightness, x, y);
        }
        ascii += '\n';
    }


    asciiEl.textContent = ascii;
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
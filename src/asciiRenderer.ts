export function imageToAscii(imageData: ImageData, width: number): string {
    const chars = '@%#*+=-:. ';
    const scale = imageData.width / width;
    const height = Math.floor(imageData.height / scale / 2);

    let ascii = '';

    for (let y = 0; y < height; y++) {
        let row = '';
        for (let x = 0; x < width; x++) {
            const pxX = Math.floor(x * scale);
            const pxY = Math.floor(y * scale * 2);
            const i = (pxY * imageData.width + pxX) * 4;
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const brightness = (r + g + b) / 3;
            const index = Math.floor((brightness / 255) * (chars.length - 1));
            row += chars[index];
        }
        ascii += row + '\n';
    }

    return ascii;
}

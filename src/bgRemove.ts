import * as bodyPix from '@tensorflow-models/body-pix';

let net: bodyPix.BodyPix | null = null;

export async function loadBodyPixModel() {
    if (!net) {
        net = await bodyPix.load();
    }
}

export async function removeBackground(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    if (!net) return;

    const segmentation = await net.segmentPerson(video);
    const foregroundColor = { r: 255, g: 255, b: 255, a: 255 };
    const backgroundColor = { r: 0, g: 0, b: 0, a: 0 };

    const mask = bodyPix.toMask(segmentation, foregroundColor, backgroundColor);
    bodyPix.drawMask(canvas, video, mask, 1, 0, false);
}

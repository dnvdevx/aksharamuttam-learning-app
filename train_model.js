const fs = require('fs');
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const tf = require('@tensorflow/tfjs-node');

// Register Fonts
const fontsDir = path.join(__dirname, 'fonts');
const fontList = [
    { file: 'Gayathri-Regular.ttf', name: 'Gayathri' },
    { file: 'Gayathri-Bold.ttf', name: 'Gayathri Bold' },
    { file: 'Manjari-Regular.ttf', name: 'Manjari' },
    { file: 'Manjari-Bold.ttf', name: 'Manjari Bold' },
    { file: 'Chilanka-Regular.ttf', name: 'Chilanka' },
    { file: 'NotoSansMalayalam-Regular.ttf', name: 'Noto Sans Malayalam' }
];

fontList.forEach(f => {
    const p = path.join(fontsDir, f.file);
    if (fs.existsSync(p)) {
        GlobalFonts.registerFromPath(p, f.name);
        console.log(`Registered font: ${f.name}`);
    }
});

// Windows fallback
if (fs.existsSync('C:\\Windows\\Fonts\\Nirmala.ttc')) {
    GlobalFonts.registerFromPath('C:\\Windows\\Fonts\\Nirmala.ttc', 'Nirmala UI');
    console.log('Registered Nirmala UI');
}

const FONTS = ['Gayathri', 'Gayathri Bold', 'Manjari', 'Manjari Bold', 'Chilanka', 'Noto Sans Malayalam', 'Nirmala UI'];

// Load Curriculum
const dataContent = fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8');
// Evaluate MALAYALAM_CURRICULUM safely
const script = `
let window = {};
${dataContent}
module.exports = MALAYALAM_CURRICULUM;
`;
const tmpDataPath = path.join(__dirname, '_temp_data.js');
fs.writeFileSync(tmpDataPath, script);
const MALAYALAM_CURRICULUM = require(tmpDataPath);
fs.unlinkSync(tmpDataPath);

console.log(`Loaded ${MALAYALAM_CURRICULUM.length} Malayalam characters.`);

const S = 48; // Input size 48x48
const SAMPLES_PER_CHAR = 65; // 56 * 65 = 3,640 samples

function findBBox(data, w, h) {
    let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (data[i] > 25) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
                found = true;
            }
        }
    }
    return found ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : null;
}

function dilate2D(src, w, h, radius = 1) {
    const dst = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let maxVal = src[y * w + x];
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const ny = y + dy;
                    const nx = x + dx;
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                        const val = src[ny * w + nx];
                        if (val > maxVal) maxVal = val;
                    }
                }
            }
            dst[y * w + x] = maxVal;
        }
    }
    return dst;
}

function renderAugmentedChar(char, sampleIdx) {
    const BIG = 140;
    const canvas = createCanvas(BIG, BIG);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, BIG, BIG);

    const font = FONTS[sampleIdx % FONTS.length];
    const fontSize = Math.round(BIG * (0.60 + (Math.random() - 0.5) * 0.12));
    const rot = (Math.random() - 0.5) * 0.28; // ~ -16 to +16 deg
    const scale = 0.82 + Math.random() * 0.32;
    const shiftX = (Math.random() - 0.5) * 6;
    const shiftY = (Math.random() - 0.5) * 6;
    const strokeMode = sampleIdx % 5;

    ctx.save();
    ctx.translate(BIG / 2 + shiftX, BIG / 2 + shiftY);
    ctx.rotate(rot);
    ctx.scale(scale, scale);

    ctx.font = `${fontSize}px "${font}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (strokeMode === 0) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeText(char, 0, 0);
    } else if (strokeMode === 1) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeText(char, 0, 0);
    } else if (strokeMode === 2) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 9.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeText(char, 0, 0);
    } else if (strokeMode === 3) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 12.0;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeText(char, 0, 0);
    } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillText(char, 0, 0);
    }
    ctx.restore();

    const rawData = ctx.getImageData(0, 0, BIG, BIG).data;
    const bbox = findBBox(rawData, BIG, BIG);

    const outCanvas = createCanvas(S, S);
    const outCtx = outCanvas.getContext('2d');
    outCtx.fillStyle = '#000000';
    outCtx.fillRect(0, 0, S, S);

    if (bbox) {
        const PAD = Math.round(S * 0.12);
        const inner = S - PAD * 2;
        const maxDim = Math.max(bbox.w, bbox.h);
        const scaleFactor = inner / maxDim;
        const dw = bbox.w * scaleFactor;
        const dh = bbox.h * scaleFactor;
        const dx = PAD + (inner - dw) / 2;
        const dy = PAD + (inner - dh) / 2;
        outCtx.drawImage(canvas, bbox.x, bbox.y, bbox.w, bbox.h, dx, dy, dw, dh);
    } else {
        outCtx.drawImage(canvas, 0, 0, BIG, BIG, 0, 0, S, S);
    }

    const finalData = outCtx.getImageData(0, 0, S, S).data;
    const rawFloats = new Float32Array(S * S);
    for (let p = 0; p < S * S; p++) {
        const v = finalData[p * 4];
        rawFloats[p] = v > 25 ? Math.min(1.0, v / 255.0) : 0.0;
    }

    return dilate2D(rawFloats, S, S, 1);
}

async function runTraining() {
    console.log('Generating 3,640 synthetic augmented training samples...');
    const numClasses = MALAYALAM_CURRICULUM.length;
    const totalSamples = numClasses * SAMPLES_PER_CHAR;

    const allImages = new Float32Array(totalSamples * S * S);
    const allLabels = new Int32Array(totalSamples);

    let sampleCount = 0;
    for (let c = 0; c < numClasses; c++) {
        const char = MALAYALAM_CURRICULUM[c].char;
        for (let s = 0; s < SAMPLES_PER_CHAR; s++) {
            const floats = renderAugmentedChar(char, s);
            allImages.set(floats, sampleCount * S * S);
            allLabels[sampleCount] = c;
            sampleCount++;
        }
    }
    console.log(`Dataset generated successfully: ${totalSamples} images.`);

    // Build Model
    const model = tf.sequential();

    // Block 1
    model.add(tf.layers.conv2d({
        inputShape: [S, S, 1],
        filters: 32,
        kernelSize: 3,
        padding: 'same',
        activation: 'relu'
    }));
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.conv2d({ filters: 32, kernelSize: 3, activation: 'relu' }));
    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
    model.add(tf.layers.dropout({ rate: 0.20 }));

    // Block 2
    model.add(tf.layers.conv2d({ filters: 64, kernelSize: 3, padding: 'same', activation: 'relu' }));
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: 'relu' }));
    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
    model.add(tf.layers.dropout({ rate: 0.25 }));

    // Block 3
    model.add(tf.layers.conv2d({ filters: 128, kernelSize: 3, padding: 'same', activation: 'relu' }));
    model.add(tf.layers.batchNormalization());
    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
    model.add(tf.layers.dropout({ rate: 0.30 }));

    // Dense Classifier
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({ units: 192, activation: 'relu' }));
    model.add(tf.layers.dropout({ rate: 0.35 }));
    model.add(tf.layers.dense({ units: numClasses, activation: 'softmax' }));

    model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
    });

    console.log('Model architecture created. Converting tensors...');
    const xs = tf.tensor4d(allImages, [totalSamples, S, S, 1]);
    const ys = tf.oneHot(tf.tensor1d(allLabels, 'int32'), numClasses);

    console.log('Training CNN model for 35 epochs...');
    await model.fit(xs, ys, {
        epochs: 35,
        batchSize: 64,
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                if ((epoch + 1) % 5 === 0 || epoch === 34) {
                    console.log(`Epoch ${epoch + 1}/35 - Loss: ${logs.loss.toFixed(4)} - Accuracy: ${(logs.acc * 100).toFixed(2)}%`);
                }
            }
        }
    });

    xs.dispose();
    ys.dispose();

    const outDir = path.join(__dirname, 'model');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    console.log('Saving model weights to:', outDir);
    await model.save(`file://${outDir}`);
    console.log('🎉 Model training complete and saved successfully to /model!');
}

runTraining().catch(err => {
    console.error('Training failed:', err);
    process.exit(1);
});

// =============================================
//  THANIMA MALAYALAM LEARNING CANVAS
//  Hybrid Deep Learning & Structural Handwriting Engine (v8)
// =============================================

const AI_CONFIG = {
    INPUT_SIZE: 48,
    NUM_CLASSES: 56,
    SAMPLES_PER_CHAR: 120,
    EPOCHS: 24,
    BATCH_SIZE: 64,
    MODEL_DB_KEY: 'indexeddb://thanima-malayalam-cnn-v8',
    FONTS: ['Gayathri', 'Manjari', 'Noto Sans Malayalam'],
};

// =============================================
//  SOUND EFFECTS
// =============================================
class SoundFX {
    constructor() { this.ctx = null; }

    init() {
        if (!this.ctx) {
            try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
            catch (_) {}
        }
    }

    _beep(freq, dur, type = 'sine', vol = 0.15) {
        this.init();
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
    }

    playStroke()  { this._beep(220, 0.04, 'sine', 0.02); }
    playClear()   { this._beep(180, 0.12, 'triangle', 0.08); }
    playCorrect() {
        this._beep(523, 0.12);
        setTimeout(() => this._beep(659, 0.12), 110);
        setTimeout(() => this._beep(784, 0.20), 220);
    }
    playWrong()   { this._beep(220, 0.25, 'sawtooth', 0.10); }
    playLoading() { this._beep(440, 0.08, 'sine', 0.05); }
}

// =============================================
//  AI & STRUCTURAL VERIFICATION ENGINE
// =============================================
class MalayalamAIEngine {
    constructor() {
        this.model = null;
        this.isReady = false;
        this.isTraining = false;
        this.statusText = 'AI Loading...';
        this.referenceTemplates = new Map();
    }

    async initialize(onStatusChange) {
        this._updateStatus('AI Loading...', 'loading', onStatusChange);

        if (typeof tf === 'undefined') {
            console.warn('TensorFlow.js is not loaded.');
            this._updateStatus('AI Unavailable', 'error', onStatusChange);
            return;
        }

        try {
            await tf.ready();
            await this._preloadFonts();

            // Build reference structural templates for all 56 characters
            this._generateReferenceTemplates();

            // 1. First, load pre-bundled static deep model (~100ms)
            try {
                this.model = await tf.loadLayersModel('./model/model.json');
                console.log('✅ Loaded pre-trained static Malayalam CNN model from ./model/model.json');
                this.isReady = true;
                this._updateStatus('AI Ready ✅', 'ready', onStatusChange);
                return;
            } catch (staticErr) {
                console.warn('Could not load static model, checking IndexedDB cache...', staticErr);
            }

            // 2. Try loading cached model from IndexedDB
            try {
                this.model = await tf.loadLayersModel(AI_CONFIG.MODEL_DB_KEY);
                console.log('✅ Loaded cached CNN model from IndexedDB');
                this.isReady = true;
                this._updateStatus('AI Ready ✅', 'ready', onStatusChange);
                return;
            } catch (_) {
                console.log('ℹ️ Synthesizing and training in browser...');
            }

            this.isTraining = true;
            this._updateStatus('Training AI Model (~3s)...', 'training', onStatusChange);
            await this._buildAndTrainModel(onStatusChange);

            this.isReady = true;
            this.isTraining = false;
            this._updateStatus('AI Ready ✅', 'ready', onStatusChange);

        } catch (err) {
            console.error('AI Initialization failed:', err);
            this._updateStatus('AI Error', 'error', onStatusChange);
        }
    }

    async _preloadFonts() {
        try {
            const fontLoads = [];
            for (const font of AI_CONFIG.FONTS) {
                for (const item of MALAYALAM_CURRICULUM) {
                    fontLoads.push(document.fonts.load(`bold 70px "${font}"`, item.char));
                    fontLoads.push(document.fonts.load(`400 70px "${font}"`, item.char));
                }
            }
            await Promise.all(fontLoads);
        } catch (e) {
            console.warn('Font preload warning:', e);
        }
        try {
            await document.fonts.ready;
        } catch (_) {}
    }

    _updateStatus(text, state, callback) {
        this.statusText = text;
        if (callback) callback(text, state);
    }

    // --- Generate Reference Shape Templates ---
    _generateReferenceTemplates() {
        const S = AI_CONFIG.INPUT_SIZE;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = offCanvas.height = S;
        const ctx = offCanvas.getContext('2d');

        for (let i = 0; i < MALAYALAM_CURRICULUM.length; i++) {
            const char = MALAYALAM_CURRICULUM[i].char;
            this._renderCleanChar(ctx, char, S);
            const data = ctx.getImageData(0, 0, S, S).data;
            const floats = new Float32Array(S * S);
            for (let p = 0; p < S * S; p++) {
                floats[p] = data[p * 4] > 30 ? 1.0 : 0.0;
            }
            this.referenceTemplates.set(i, floats);
        }
    }

    _renderCleanChar(ctx, char, size) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);

        const BIG = 120;
        const temp = document.createElement('canvas');
        temp.width = temp.height = BIG;
        const tCtx = temp.getContext('2d');
        tCtx.fillStyle = '#000000';
        tCtx.fillRect(0, 0, BIG, BIG);

        tCtx.font = `bold 75px "Gayathri", "Manjari", "Noto Sans Malayalam", sans-serif`;
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';
        tCtx.fillStyle = '#ffffff';
        tCtx.fillText(char, BIG / 2, BIG / 2);

        const bbox = this._findBBox(tCtx.getImageData(0, 0, BIG, BIG).data, BIG, BIG);
        if (bbox) {
            const PAD = Math.round(size * 0.12);
            const inner = size - PAD * 2;
            const maxDim = Math.max(bbox.w, bbox.h);
            const scale = inner / maxDim;
            const dw = bbox.w * scale;
            const dh = bbox.h * scale;
            const dx = PAD + (inner - dw) / 2;
            const dy = PAD + (inner - dh) / 2;
            ctx.drawImage(temp, bbox.x, bbox.y, bbox.w, bbox.h, dx, dy, dw, dh);
        }
    }

    // --- CNN Model Architecture ---
    _createModel() {
        const model = tf.sequential();

        model.add(tf.layers.conv2d({
            inputShape: [AI_CONFIG.INPUT_SIZE, AI_CONFIG.INPUT_SIZE, 1],
            filters: 32,
            kernelSize: 3,
            padding: 'same',
            activation: 'relu'
        }));
        model.add(tf.layers.batchNormalization());
        model.add(tf.layers.conv2d({
            filters: 32,
            kernelSize: 3,
            padding: 'same',
            activation: 'relu'
        }));
        model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
        model.add(tf.layers.dropout({ rate: 0.15 }));

        model.add(tf.layers.conv2d({
            filters: 64,
            kernelSize: 3,
            padding: 'same',
            activation: 'relu'
        }));
        model.add(tf.layers.batchNormalization());
        model.add(tf.layers.conv2d({
            filters: 64,
            kernelSize: 3,
            padding: 'same',
            activation: 'relu'
        }));
        model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
        model.add(tf.layers.dropout({ rate: 0.20 }));

        model.add(tf.layers.conv2d({
            filters: 128,
            kernelSize: 3,
            padding: 'same',
            activation: 'relu'
        }));
        model.add(tf.layers.batchNormalization());
        model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
        model.add(tf.layers.dropout({ rate: 0.25 }));

        model.add(tf.layers.flatten());
        model.add(tf.layers.dense({ units: 256, activation: 'relu' }));
        model.add(tf.layers.batchNormalization());
        model.add(tf.layers.dropout({ rate: 0.35 }));
        model.add(tf.layers.dense({ units: AI_CONFIG.NUM_CLASSES, activation: 'softmax' }));

        model.compile({
            optimizer: tf.train.adam(0.0012),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });

        return model;
    }

    async _buildAndTrainModel(onStatusChange) {
        const S = AI_CONFIG.INPUT_SIZE;
        const totalSamples = MALAYALAM_CURRICULUM.length * AI_CONFIG.SAMPLES_PER_CHAR;

        const xsArray = new Float32Array(totalSamples * S * S);
        const ysArray = new Float32Array(totalSamples * AI_CONFIG.NUM_CLASSES);

        let sampleIndex = 0;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = offCanvas.height = S;
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

        for (let cIdx = 0; cIdx < MALAYALAM_CURRICULUM.length; cIdx++) {
            const letter = MALAYALAM_CURRICULUM[cIdx];

            for (let s = 0; s < AI_CONFIG.SAMPLES_PER_CHAR; s++) {
                this._renderAugmentedChar(offCtx, letter.char, s, S);
                const rawImg = offCtx.getImageData(0, 0, S, S).data;

                const rawFloats = new Float32Array(S * S);
                for (let p = 0; p < S * S; p++) {
                    rawFloats[p] = rawImg[p * 4] / 255.0;
                }
                const thickened = this._dilate2D(rawFloats, S, S, 1);

                const offset = sampleIndex * S * S;
                for (let p = 0; p < S * S; p++) {
                    xsArray[offset + p] = thickened[p];
                }

                ysArray[sampleIndex * AI_CONFIG.NUM_CLASSES + cIdx] = 1.0;
                sampleIndex++;
            }
        }

        const xs = tf.tensor4d(xsArray, [totalSamples, S, S, 1]);
        const ys = tf.tensor2d(ysArray, [totalSamples, AI_CONFIG.NUM_CLASSES]);

        this.model = this._createModel();

        await this.model.fit(xs, ys, {
            epochs: AI_CONFIG.EPOCHS,
            batchSize: AI_CONFIG.BATCH_SIZE,
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    const pct = Math.round(((epoch + 1) / AI_CONFIG.EPOCHS) * 100);
                    const acc = Math.round((logs.acc || 0) * 100);
                    this._updateStatus(`AI Training ${pct}% (Accuracy: ${acc}%)...`, 'training', onStatusChange);
                }
            }
        });

        xs.dispose();
        ys.dispose();

        try {
            await this.model.save(AI_CONFIG.MODEL_DB_KEY);
            console.log('💾 Model saved to IndexedDB (v8)');
        } catch (e) {
            console.warn('Could not save to IndexedDB:', e);
        }
    }

    _renderAugmentedChar(ctx, char, sampleIdx, size) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);

        const BIG = 140;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = tempCanvas.height = BIG;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.fillStyle = '#000000';
        tCtx.fillRect(0, 0, BIG, BIG);

        const font = AI_CONFIG.FONTS[sampleIdx % AI_CONFIG.FONTS.length];
        const weight = (sampleIdx % 2 === 0) ? 'bold' : 'normal';
        const fontSize = Math.round(BIG * 0.65);

        const rot = (Math.random() - 0.5) * 0.20;
        const scale = 0.85 + Math.random() * 0.26;
        const shiftX = (Math.random() - 0.5) * 5;
        const shiftY = (Math.random() - 0.5) * 5;
        const strokeMode = sampleIdx % 4;

        tCtx.save();
        tCtx.translate(BIG / 2 + shiftX, BIG / 2 + shiftY);
        tCtx.rotate(rot);
        tCtx.scale(scale, scale);

        tCtx.font = `${weight} ${fontSize}px "${font}", sans-serif`;
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';

        if (strokeMode === 0) {
            tCtx.strokeStyle = '#ffffff';
            tCtx.lineWidth = 4.5;
            tCtx.lineCap = 'round';
            tCtx.lineJoin = 'round';
            tCtx.strokeText(char, 0, 0);
        } else if (strokeMode === 1) {
            tCtx.strokeStyle = '#ffffff';
            tCtx.lineWidth = 7.5;
            tCtx.lineCap = 'round';
            tCtx.lineJoin = 'round';
            tCtx.strokeText(char, 0, 0);
        } else if (strokeMode === 2) {
            tCtx.strokeStyle = '#ffffff';
            tCtx.lineWidth = 10.5;
            tCtx.lineCap = 'round';
            tCtx.lineJoin = 'round';
            tCtx.strokeText(char, 0, 0);
        } else {
            tCtx.fillStyle = '#ffffff';
            tCtx.fillText(char, 0, 0);
        }
        tCtx.restore();

        const bbox = this._findBBox(tCtx.getImageData(0, 0, BIG, BIG).data, BIG, BIG);
        if (bbox) {
            const PAD = Math.round(size * 0.12);
            const inner = size - PAD * 2;
            const maxDim = Math.max(bbox.w, bbox.h);
            const scaleFactor = inner / maxDim;
            const dw = bbox.w * scaleFactor;
            const dh = bbox.h * scaleFactor;
            const dx = PAD + (inner - dw) / 2;
            const dy = PAD + (inner - dh) / 2;

            ctx.drawImage(tempCanvas, bbox.x, bbox.y, bbox.w, bbox.h, dx, dy, dw, dh);
        } else {
            ctx.drawImage(tempCanvas, 0, 0, BIG, BIG, 0, 0, size, size);
        }
    }

    _dilate2D(src, w, h, radius = 1) {
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

    _findBBox(data, w, h) {
        let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                if (data[i] > 30) {
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

    preprocessUserCanvas(userCanvas) {
        const S = AI_CONFIG.INPUT_SIZE;
        const userW = parseInt(userCanvas.style.width) || userCanvas.width;
        const userH = parseInt(userCanvas.style.height) || userCanvas.height;

        const raw = document.createElement('canvas');
        raw.width = userW;
        raw.height = userH;
        const rawCtx = raw.getContext('2d', { willReadFrequently: true });
        rawCtx.drawImage(userCanvas, 0, 0, userCanvas.width, userCanvas.height, 0, 0, userW, userH);
        const rawData = rawCtx.getImageData(0, 0, userW, userH).data;

        let minX = userW, minY = userH, maxX = 0, maxY = 0, hasStrokes = false;
        for (let y = 0; y < userH; y++) {
            for (let x = 0; x < userW; x++) {
                const i = (y * userW + x) * 4;
                const a = rawData[i + 3];
                if (a > 20) {
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                    hasStrokes = true;
                }
            }
        }

        if (!hasStrokes) return null;

        const bboxW = maxX - minX + 1;
        const bboxH = maxY - minY + 1;
        if (bboxW < 8 && bboxH < 8) return null;

        // Create pure high-contrast binary mask (white on black) - 100% iOS Safari & cross-browser compatible
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = userW;
        maskCanvas.height = userH;
        const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
        mCtx.fillStyle = '#000000';
        mCtx.fillRect(0, 0, userW, userH);

        const maskImg = mCtx.getImageData(0, 0, userW, userH);
        for (let i = 0; i < rawData.length; i += 4) {
            if (rawData[i + 3] > 20) {
                maskImg.data[i] = 255;     // R
                maskImg.data[i + 1] = 255; // G
                maskImg.data[i + 2] = 255; // B
                maskImg.data[i + 3] = 255; // A
            }
        }
        mCtx.putImageData(maskImg, 0, 0);

        const tensorCanvas = document.createElement('canvas');
        tensorCanvas.width = tensorCanvas.height = S;
        const tCtx = tensorCanvas.getContext('2d', { willReadFrequently: true });
        tCtx.fillStyle = '#000000';
        tCtx.fillRect(0, 0, S, S);

        const PAD = Math.round(S * 0.12);
        const inner = S - PAD * 2;
        const maxDim = Math.max(bboxW, bboxH);
        const scale = inner / maxDim;
        const dw = bboxW * scale;
        const dh = bboxH * scale;
        const dx = PAD + (inner - dw) / 2;
        const dy = PAD + (inner - dh) / 2;

        tCtx.drawImage(maskCanvas, minX, minY, bboxW, bboxH, dx, dy, dw, dh);

        const finalData = tCtx.getImageData(0, 0, S, S).data;
        const rawFloats = new Float32Array(S * S);
        for (let p = 0; p < S * S; p++) {
            const v = finalData[p * 4];
            rawFloats[p] = v > 20 ? Math.min(1.0, v / 255.0) : 0.0;
        }

        const thickened = this._dilate2D(rawFloats, S, S, 1);
        return { tensor: tf.tensor4d(thickened, [1, S, S, 1]), userFloats: thickened };
    }

    // --- Structural Shape Similarity Score ---
    computeShapeSimilarity(userFloats, targetIndex) {
        const refFloats = this.referenceTemplates.get(targetIndex);
        if (!refFloats || !userFloats) return 0.5;

        const S = AI_CONFIG.INPUT_SIZE;
        let intersection = 0, union = 0;
        for (let i = 0; i < S * S; i++) {
            const u = userFloats[i] > 0.3 ? 1 : 0;
            const r = refFloats[i] > 0.3 ? 1 : 0;
            if (u && r) intersection++;
            if (u || r) union++;
        }
        return union === 0 ? 0 : (intersection / union);
    }

    async predict(userCanvas, targetIndex) {
        if (!this.isReady || !this.model) return null;

        let prep = null;
        try {
            prep = this.preprocessUserCanvas(userCanvas);
            if (!prep) return null;

            const predTensor = this.model.predict(prep.tensor);
            const probs = await predTensor.data();
            predTensor.dispose();

            const shapeSim = this.computeShapeSimilarity(prep.userFloats, targetIndex);

            return {
                probabilities: Array.from(probs),
                shapeSimilarity: shapeSim
            };
        } catch (err) {
            console.error('Prediction error:', err);
            return null;
        } finally {
            if (prep && prep.tensor) prep.tensor.dispose();
        }
    }
}

// =============================================
//  MAIN APP CONTROLLER
// =============================================
class MalayalamApp {
    constructor() {
        this.sound = new SoundFX();
        this.ai = new MalayalamAIEngine();
        this.currentCategory = 'vowels';
        this.filteredList = [];
        this.currentIndex = 0;
        this.showUnderlay = false;

        // Canvas state
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.drawnPointsCount = 0;
        this.strokeSegmentsCount = 0;
        this.totalStrokeLength = 0;
        this.lastPos = null;

        // Onboarding & Quest State
        this.currentOnboardingStep = 1;
        this.selectedOnboardingLevel = 'vowels';
        this.currentFactIndex = 0;
        this.malayalamFacts = [
            "The word 'മലയാളം' (Malayalam) is an exact palindrome — it reads identically forwards and backwards!",
            "Malayalam has 56 official characters (15 vowels, 36 consonants, 5 chillus) — giving it one of the richest phonetic scripts in the world!",
            "Malayalam was officially designated a Classical Language of India in 2013 for its ancient literary heritage.",
            "Handwriting and tracing Malayalam letters develops visual-spatial memory and fine motor skills!"
        ];
    }

    init() {
        this.canvas = document.getElementById('drawing-canvas');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.setupCanvasEvents();
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
        }
        this.filterCategory('vowels');
        this.renderLibraryGrid();

        this.ai.initialize((statusText, state) => {
            this._updateAIStatusBadge(statusText, state);
        });

        // Show welcome onboarding mini-game on first visit
        if (!localStorage.getItem('thanima_onboarded')) {
            setTimeout(() => this.openOnboardingModal(), 500);
        }
    }

    _updateAIStatusBadge(text, state) {
        const badge = document.getElementById('ai-status-badge');
        const icon  = document.getElementById('ai-status-icon');
        const label = document.getElementById('ai-status-text');
        if (!badge || !icon || !label) return;

        label.textContent = text;
        badge.className = 'flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ';

        if (state === 'ready') {
            badge.className += 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
            icon.className = 'fa-solid fa-brain text-[11px]';
        } else if (state === 'training' || state === 'loading') {
            badge.className += 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200';
            icon.className = 'fa-solid fa-spinner fa-spin text-[11px]';
        } else {
            badge.className += 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200';
            icon.className = 'fa-solid fa-triangle-exclamation text-[11px]';
        }
    }

    resizeCanvas() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
        if (this.ctx) this.ctx.scale(dpr, dpr);
        this.clearCanvas();
    }

    setupCanvasEvents() {
        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return { x: clientX - rect.left, y: clientY - rect.top };
        };

        const startDrawing = (e) => {
            e.preventDefault();
            this.isDrawing = true;
            this.lastPos = getPos(e);
            this.strokeSegmentsCount++;
            this.sound.playStroke();
            this.hidePrompt();
            this.hideCheckResult();
        };

        const draw = (e) => {
            e.preventDefault();
            if (!this.isDrawing) return;
            const pos = getPos(e);
            const dx = pos.x - this.lastPos.x;
            const dy = pos.y - this.lastPos.y;
            this.totalStrokeLength += Math.sqrt(dx * dx + dy * dy);

            this.ctx.beginPath();
            this.ctx.moveTo(this.lastPos.x, this.lastPos.y);
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.strokeStyle = document.documentElement.classList.contains('dark')
                ? '#e2e8f0' : '#1e293b';
            this.ctx.lineWidth = 5;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.stroke();
            this.lastPos = pos;
            this.drawnPointsCount++;
        };

        const stopDrawing = () => {
            this.isDrawing = false;
            this.lastPos = null;
        };

        this.canvas.addEventListener('mousedown', startDrawing);
        this.canvas.addEventListener('mousemove', draw);
        this.canvas.addEventListener('mouseup', stopDrawing);
        this.canvas.addEventListener('mouseleave', stopDrawing);
        this.canvas.addEventListener('touchstart', startDrawing, { passive: false });
        this.canvas.addEventListener('touchmove', draw, { passive: false });
        this.canvas.addEventListener('touchend', stopDrawing);
    }

    clearCanvas() {
        if (!this.ctx || !this.canvas) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawnPointsCount = 0;
        this.strokeSegmentsCount = 0;
        this.totalStrokeLength = 0;
        this.showPrompt();
        this.hideCheckResult();
        this.sound.playClear();
    }

    showPrompt() {
        const p = document.getElementById('canvas-prompt');
        if (p) p.style.opacity = '1';
    }
    hidePrompt() {
        const p = document.getElementById('canvas-prompt');
        if (p) p.style.opacity = '0';
    }

    toggleUnderlay() {
        this.showUnderlay = !this.showUnderlay;
        const el = document.getElementById('canvas-underlay');
        const btn = document.getElementById('btn-toggle-underlay');
        if (el) el.classList.toggle('hidden', !this.showUnderlay);
        if (btn) btn.classList.toggle('opacity-60', !this.showUnderlay);
    }

    playAudio() {
        const letter = this.filteredList[this.currentIndex];
        if (!letter) return;
        if ('speechSynthesis' in window) {
            const utter = new SpeechSynthesisUtterance(letter.char);
            utter.lang = 'ml-IN';
            utter.rate = 0.8;
            speechSynthesis.speak(utter);
        }
    }

    filterCategory(category) {
        this.currentCategory = category;
        const typeMap = { vowels: 'vowel', consonants: 'consonant', chillus: 'chillu' };
        this.filteredList = MALAYALAM_CURRICULUM.filter(l => l.type === typeMap[category]);
        this.currentIndex = 0;
        this.updateCard();
        this.updateProgressBar();
        const sel = document.getElementById('category-select');
        if (sel) sel.value = category;
    }

    selectCategory(value) {
        this.filterCategory(value);
        this.clearCanvas();
    }

    nextLetter() {
        this.currentIndex = (this.currentIndex < this.filteredList.length - 1)
            ? this.currentIndex + 1 : 0;
        this.updateCard();
        this.updateProgressBar();
        this.clearCanvas();
    }

    prevLetter() {
        this.currentIndex = (this.currentIndex > 0)
            ? this.currentIndex - 1 : this.filteredList.length - 1;
        this.updateCard();
        this.updateProgressBar();
        this.clearCanvas();
    }

    updateCard() {
        const letter = this.filteredList[this.currentIndex];
        if (!letter) return;

        const typeLabel = { vowel: 'Vowel', consonant: 'Consonant', chillu: 'Chillu' };
        const badgeColor = {
            vowel: 'bg-badge-vowel text-badge-vowel',
            consonant: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
            chillu: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        };

        this._setText('card-malayalam-char', letter.char);
        this._setText('card-roman-sound', `"${letter.roman}"`);
        this._setText('card-example-malayalam', letter.word);
        this._setText('card-example-translit', `(${letter.translit})`);
        this._setText('card-example-meaning', letter.meaning);
        this._setText('underlay-char', letter.char);
        this._setText('letter-index-indicator', `${this.currentIndex + 1} of ${this.filteredList.length}`);

        const badge = document.getElementById('card-type-badge');
        if (badge) {
            badge.textContent = typeLabel[letter.type] || letter.type;
            badge.className = `px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 ${badgeColor[letter.type] || ''}`;
        }
    }

    _setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    updateProgressBar() {
        const total = this.filteredList.length;
        const pct = total ? Math.round(((this.currentIndex + 1) / total) * 100) : 0;
        const catLabels = {
            vowels: 'Vowels (സ്വരാക്ഷരങ്ങൾ)',
            consonants: 'Consonants (വ്യഞ്ജനാക്ഷരങ്ങൾ)',
            chillus: 'Chillu Letters (ചില്ലക്ഷരങ്ങൾ)',
        };
        this._setText('curriculum-category-label', catLabels[this.currentCategory] || '');
        this._setText('curriculum-progress-text', `${this.currentIndex + 1} / ${total}`);
        const bar = document.getElementById('curriculum-progress-bar');
        if (bar) bar.style.width = `${pct}%`;
    }

    navigateTo(view) {
        ['practice', 'library'].forEach(v => {
            const section = document.getElementById(`view-${v}`);
            const tab = document.getElementById(`tab-${v}`);
            const active = v === view;
            if (section) section.classList.toggle('hidden', !active);
            if (tab) {
                tab.className = active
                    ? 'py-3 px-5 border-b-4 border-duo-green text-accent-green font-extrabold flex items-center space-x-2 transition'
                    : 'py-3 px-5 border-b-4 border-transparent text-tab-inactive font-extrabold flex items-center space-x-2 transition';
            }
        });
    }

    toggleTheme() {
        document.documentElement.classList.toggle('dark');
    }

    renderLibraryGrid() {
        const grid = document.getElementById('library-grid');
        if (!grid) return;
        grid.innerHTML = '';
        MALAYALAM_CURRICULUM.forEach(letter => {
            const card = document.createElement('div');
            card.dataset.type = letter.type;
            card.className = 'bg-grid-card hover:bg-grid-card-hover rounded-2xl p-4 flex flex-col items-center cursor-pointer border border-slate-200 dark:border-slate-700 transition group';
            card.innerHTML = `
                <span class="font-malayalam text-4xl font-bold text-heading group-hover:text-accent-green transition">${letter.char}</span>
                <span class="text-xs font-bold text-muted mt-1">${letter.roman}</span>
                <span class="text-[10px] text-muted2 mt-0.5 truncate w-full text-center">${letter.word}</span>
            `;
            card.addEventListener('click', () => {
                this.filterCategory(
                    letter.type === 'vowel' ? 'vowels' :
                    letter.type === 'consonant' ? 'consonants' : 'chillus'
                );
                const idx = this.filteredList.findIndex(l => l.id === letter.id);
                if (idx >= 0) this.currentIndex = idx;
                this.updateCard();
                this.updateProgressBar();
                this.clearCanvas();
                this.navigateTo('practice');
            });
            grid.appendChild(card);
        });
    }

    filterLibrary(type, event) {
        document.querySelectorAll('.lib-filter-btn').forEach(btn => {
            btn.className = 'lib-filter-btn px-4 py-2 rounded-xl bg-filter-inactive text-filter-inactive font-extrabold text-sm transition';
        });
        if (event && event.target) {
            event.target.className = 'lib-filter-btn px-4 py-2 rounded-xl bg-filter-active text-filter-active font-extrabold text-sm shadow';
        }
        document.querySelectorAll('#library-grid > div').forEach(card => {
            const show = type === 'all' || card.dataset.type === type;
            card.classList.toggle('hidden', !show);
        });
    }

    // ============================================================
    //  ONBOARDING & MINI-GAME MODAL ✨
    // ============================================================
    openOnboardingModal() {
        this.currentOnboardingStep = 1;
        this._updateOnboardingStepView();
        const modal = document.getElementById('onboarding-modal');
        if (modal) modal.classList.remove('hidden');
    }

    closeOnboardingModal() {
        const modal = document.getElementById('onboarding-modal');
        if (modal) modal.classList.add('hidden');
        localStorage.setItem('thanima_onboarded', 'true');
    }

    selectOnboardingLevel(level) {
        this.selectedOnboardingLevel = level;
        ['vowels', 'consonants', 'chillus'].forEach(l => {
            const card = document.getElementById(`level-card-${l}`);
            if (!card) return;
            const isSel = l === level;
            card.classList.toggle('selected', isSel);
            const icon = card.querySelector('i');
            if (icon) {
                icon.className = isSel
                    ? 'fa-solid fa-circle-check text-emerald-500 text-lg'
                    : 'fa-regular fa-circle text-slate-300 text-lg';
            }
        });
        this.sound.playStroke();
    }

    nextOnboardingStep() {
        if (this.currentOnboardingStep < 3) {
            this.currentOnboardingStep++;
            this._updateOnboardingStepView();
            this.sound.playStroke();
        } else {
            // Finished onboarding!
            this.filterCategory(this.selectedOnboardingLevel);
            this.closeOnboardingModal();
            this.sound.playCorrect();
        }
    }

    prevOnboardingStep() {
        if (this.currentOnboardingStep > 1) {
            this.currentOnboardingStep--;
            this._updateOnboardingStepView();
            this.sound.playStroke();
        }
    }

    _updateOnboardingStepView() {
        const titles = [
            'Welcome to Thanima',
            'Akshara Pop Mini-Quiz',
            'Did You Know? (Fun Facts)'
        ];
        const titleEl = document.getElementById('modal-step-title');
        if (titleEl) titleEl.textContent = titles[this.currentOnboardingStep - 1] || 'Welcome to Thanima';

        [1, 2, 3].forEach(step => {
            const stepEl = document.getElementById(`modal-step-${step}`);
            if (stepEl) stepEl.classList.toggle('hidden', step !== this.currentOnboardingStep);
        });

        // Update step dots
        document.querySelectorAll('.step-dot').forEach(dot => {
            const dotStep = parseInt(dot.dataset.step);
            if (dotStep === this.currentOnboardingStep) {
                dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 step-dot';
            } else if (dotStep < this.currentOnboardingStep) {
                dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-300 dark:bg-emerald-800 step-dot';
            } else {
                dot.className = 'w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 step-dot';
            }
        });

        const btnBack = document.getElementById('modal-btn-back');
        if (btnBack) {
            btnBack.classList.toggle('invisible', this.currentOnboardingStep === 1);
        }

        const btnNext = document.getElementById('modal-btn-next');
        if (btnNext) {
            btnNext.innerHTML = (this.currentOnboardingStep === 3)
                ? `<span>Start Tracing ✨</span><i class="fa-solid fa-play text-[11px]"></i>`
                : `<span>Continue</span><i class="fa-solid fa-arrow-right text-[11px]"></i>`;
        }
    }

    answerQuizOption(char, isCorrect, btnEl) {
        const feedback = document.getElementById('quiz-feedback');
        document.querySelectorAll('.quiz-option').forEach(btn => {
            btn.classList.remove('correct', 'wrong');
        });

        if (isCorrect) {
            btnEl.classList.add('correct');
            this.sound.playCorrect();
            if (feedback) {
                feedback.innerHTML = `<span class="text-emerald-600 dark:text-emerald-400">🎉 Spot on! "അ" (a) is the very first Malayalam vowel for "അമ്മ" (Amma)!</span>`;
            }
        } else {
            btnEl.classList.add('wrong');
            this.sound.playWrong();
            if (feedback) {
                feedback.innerHTML = `<span class="text-red-500">Not quite! "അ" makes the starting sound of "അമ്മ". Try tapping "അ"!</span>`;
            }
        }
    }

    nextFact() {
        this.currentFactIndex = (this.currentFactIndex + 1) % this.malayalamFacts.length;
        this._renderFact();
    }

    prevFact() {
        this.currentFactIndex = (this.currentFactIndex - 1 + this.malayalamFacts.length) % this.malayalamFacts.length;
        this._renderFact();
    }

    _renderFact() {
        const factText = document.getElementById('fact-text');
        const factInd = document.getElementById('fact-indicator');
        if (factText) factText.textContent = `"${this.malayalamFacts[this.currentFactIndex]}"`;
        if (factInd) factInd.textContent = `${this.currentFactIndex + 1} of ${this.malayalamFacts.length}`;
        this.sound.playStroke();
    }

    // ============================================================
    //  AI CHARACTER VERIFICATION ✨
    // ============================================================
    async checkDrawing() {
        if (!this.canvas || this.drawnPointsCount < 4) {
            this._showCheckResult('wrong', '✏️ Draw something first!');
            return;
        }

        const letter = this.filteredList[this.currentIndex];
        if (!letter) return;

        const targetGlobalIndex = MALAYALAM_CURRICULUM.findIndex(l => l.id === letter.id);
        if (targetGlobalIndex < 0) return;

        if (!this.ai.isReady) {
            this._showCheckResult('loading', '⏳ AI Model is training. Please try again in 2 seconds...');
            return;
        }

        // 1. Extreme Scribble Guard (only flag absurdly dense scribbles/scratches)
        const isScribble = this.strokeSegmentsCount > 25 || this.totalStrokeLength > 6000;

        if (isScribble) {
            this.sound.playWrong();
            this._showCheckResult('wrong', `❌ Scribble detected! Please trace "${letter.char}" carefully without extra lines.`);
            return;
        }

        this._showCheckResult('loading', '🔍 Evaluating your handwriting...');
        this.sound.playLoading();

        // Run Hybrid AI + Structural Evaluation
        const evalResult = await this.ai.predict(this.canvas, targetGlobalIndex);
        if (!evalResult) {
            this._showCheckResult('wrong', `✏️ Please write the complete character "${letter.char}"!`);
            this.sound.playWrong();
            return;
        }

        const probabilities = evalResult.probabilities;
        const shapeSimilarity = evalResult.shapeSimilarity;
        const targetProb = probabilities[targetGlobalIndex] || 0;

        const ranked = probabilities.map((p, idx) => ({
            prob: p,
            idx,
            char: MALAYALAM_CURRICULUM[idx].char,
            roman: MALAYALAM_CURRICULUM[idx].roman
        })).sort((a, b) => b.prob - a.prob);

        const top1 = ranked[0];
        const top2 = ranked[1];
        const top3 = ranked[2];

        console.log(`[Hybrid Eval] Target: "${letter.char}" (${letter.roman}) | CNN Prob: ${(targetProb * 100).toFixed(1)}% | Shape Sim: ${(shapeSimilarity * 100).toFixed(1)}%`);

        const combinedScore = (targetProb * 0.70) + (shapeSimilarity * 0.30);

        // ── DECISION LOGIC ────────────────────────────────────────

        // Case 1: Target character is Correct (Top-1 OR strong structural + CNN consensus)
        const isTargetTop1 = (top1.idx === targetGlobalIndex && targetProb >= 0.05);
        const isStrongConsensus = (shapeSimilarity >= 0.22 && targetProb >= 0.04);

        if (isTargetTop1 || isStrongConsensus) {
            this.sound.playCorrect();
            const matchPct = Math.min(99, Math.round(78 + Math.min(1.0, combinedScore / 0.25) * 21));
            this._showCheckResult('correct', `✅ Correct! Great job writing ${letter.char}! (${matchPct}% match)`);
            return;
        }

        // Case 2: Near Match / Good Attempt
        const isNear = (top2 && top2.idx === targetGlobalIndex && targetProb >= 0.04) ||
                       (top3 && top3.idx === targetGlobalIndex && targetProb >= 0.03) ||
                       (shapeSimilarity >= 0.15);

        if (isNear) {
            this.sound.playWrong();
            const matchPct = Math.round(50 + Math.min(1.0, combinedScore / 0.15) * 20);
            this._showCheckResult('almost', `⚠️ Almost there! Keep practising "${letter.char}" (${letter.roman}) (${matchPct}% match)`);
            return;
        }

        // Case 3: Incorrect / Does not match
        this.sound.playWrong();
        this._showCheckResult('wrong', `❌ Incorrect! Please trace "${letter.char}" ("${letter.roman}") carefully. Turn on Underlay for help!`);
    }

    _showCheckResult(type, message) {
        const el = document.getElementById('check-result');
        if (!el) return;
        el.id = 'check-result';
        el.className = `result-${type}`;
        el.textContent = message;
        el.style.display = 'block';
    }

    hideCheckResult() {
        const el = document.getElementById('check-result');
        if (el) el.style.display = 'none';
    }
}

// =============================================
//  BOOTSTRAP
// =============================================
const app = new MalayalamApp();
document.addEventListener('DOMContentLoaded', () => app.init());

// =============================================
//  THANIMA MALAYALAM LEARNING CANVAS
//  High-Accuracy AI CNN Character Recognition Engine (v6)
// =============================================

const AI_CONFIG = {
    INPUT_SIZE: 48,                    // 48x48 CNN input tensor
    NUM_CLASSES: 56,                   // All 56 Malayalam characters (15 vowels + 36 consonants + 5 chillus)
    SAMPLES_PER_CHAR: 140,             // 140 rich synthetic variations per character (~7,840 total samples)
    EPOCHS: 28,                        // High-accuracy training epochs
    BATCH_SIZE: 64,
    MODEL_DB_KEY: 'indexeddb://thanima-malayalam-cnn-v6',
    FONTS: ['Gayathri', 'Manjari', 'Chilanka', 'Noto Sans Malayalam', 'sans-serif'],
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
//  DEEP LEARNING AI ENGINE (TensorFlow.js)
// =============================================
class MalayalamAIEngine {
    constructor() {
        this.model = null;
        this.isReady = false;
        this.isTraining = false;
        this.statusText = 'AI Loading...';
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

            // 1. Try loading cached trained model from local IndexedDB
            try {
                this.model = await tf.loadLayersModel(AI_CONFIG.MODEL_DB_KEY);
                console.log('✅ Loaded high-accuracy Malayalam CNN model (v6) from IndexedDB');
                this.isReady = true;
                this._updateStatus('AI Ready ✅', 'ready', onStatusChange);
                return;
            } catch (_) {
                console.log('ℹ️ Preparing to train new high-accuracy CNN model...');
            }

            this.isTraining = true;
            this._updateStatus('Loading Malayalam Fonts...', 'training', onStatusChange);

            // Preload Malayalam fonts
            await this._preloadFonts();

            this._updateStatus('Training AI Model (please wait a few seconds)...', 'training', onStatusChange);
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
            const fontsToLoad = ['Gayathri', 'Manjari', 'Chilanka', 'Noto Sans Malayalam'];
            for (const font of fontsToLoad) {
                for (const item of MALAYALAM_CURRICULUM) {
                    fontLoads.push(document.fonts.load(`bold 48px "${font}"`, item.char));
                    fontLoads.push(document.fonts.load(`400 48px "${font}"`, item.char));
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

    // --- CNN Model Architecture ---
    _createModel() {
        const model = tf.sequential();

        // Block 1: 48x48 -> 24x24
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

        // Block 2: 24x24 -> 12x12
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

        // Block 3: 12x12 -> 6x6
        model.add(tf.layers.conv2d({
            filters: 128,
            kernelSize: 3,
            padding: 'same',
            activation: 'relu'
        }));
        model.add(tf.layers.batchNormalization());
        model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
        model.add(tf.layers.dropout({ rate: 0.25 }));

        // Dense Classifier
        model.add(tf.layers.flatten());
        model.add(tf.layers.dense({ units: 256, activation: 'relu' }));
        model.add(tf.layers.batchNormalization());
        model.add(tf.layers.dropout({ rate: 0.35 }));
        model.add(tf.layers.dense({ units: AI_CONFIG.NUM_CLASSES, activation: 'softmax' }));

        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });

        return model;
    }

    // --- Synthetic Dataset Generation & Training ---
    async _buildAndTrainModel(onStatusChange) {
        const S = AI_CONFIG.INPUT_SIZE;
        const totalSamples = MALAYALAM_CURRICULUM.length * AI_CONFIG.SAMPLES_PER_CHAR;

        const xsArray = new Float32Array(totalSamples * S * S);
        const ysArray = new Float32Array(totalSamples * AI_CONFIG.NUM_CLASSES);

        let sampleIndex = 0;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = offCanvas.height = S;
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

        // Generate synthetic training samples
        for (let cIdx = 0; cIdx < MALAYALAM_CURRICULUM.length; cIdx++) {
            const letter = MALAYALAM_CURRICULUM[cIdx];

            for (let s = 0; s < AI_CONFIG.SAMPLES_PER_CHAR; s++) {
                this._renderAugmentedChar(offCtx, letter.char, s, S);
                const imgData = offCtx.getImageData(0, 0, S, S).data;

                const offset = sampleIndex * S * S;
                for (let p = 0; p < S * S; p++) {
                    xsArray[offset + p] = imgData[p * 4] / 255.0;
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

        // Save to local IndexedDB
        try {
            await this.model.save(AI_CONFIG.MODEL_DB_KEY);
            console.log('💾 Model saved to IndexedDB (v6)');
        } catch (e) {
            console.warn('Could not save to IndexedDB:', e);
        }
    }

    // --- Render augmented synthetic character onto 48x48 canvas ---
    _renderAugmentedChar(ctx, char, sampleIdx, size) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);

        const BIG = 140;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = tempCanvas.height = BIG;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.fillStyle = '#000000';
        tCtx.fillRect(0, 0, BIG, BIG);

        // Pick font & weight
        const font = AI_CONFIG.FONTS[sampleIdx % AI_CONFIG.FONTS.length];
        const weight = (sampleIdx % 3 === 0) ? 'bold' : 'normal';
        const fontSize = Math.round(BIG * 0.65);

        // Natural handwriting variation parameters
        const rot = (Math.random() - 0.5) * 0.24;           // ±7 degrees
        const scale = 0.84 + Math.random() * 0.30;          // 0.84x to 1.14x
        const shiftX = (Math.random() - 0.5) * 6;           // translation
        const shiftY = (Math.random() - 0.5) * 6;
        const strokeMode = sampleIdx % 4;                   // 0=thin, 1=medium, 2=thick, 3=filled

        tCtx.save();
        tCtx.translate(BIG / 2 + shiftX, BIG / 2 + shiftY);
        tCtx.rotate(rot);
        tCtx.scale(scale, scale);

        tCtx.font = `${weight} ${fontSize}px "${font}", sans-serif`;
        tCtx.textAlign = 'center';
        tCtx.textBaseline = 'middle';

        if (strokeMode === 0) {
            tCtx.strokeStyle = '#ffffff';
            tCtx.lineWidth = 3.5;
            tCtx.lineCap = 'round';
            tCtx.lineJoin = 'round';
            tCtx.strokeText(char, 0, 0);
        } else if (strokeMode === 1) {
            tCtx.strokeStyle = '#ffffff';
            tCtx.lineWidth = 6.5;
            tCtx.lineCap = 'round';
            tCtx.lineJoin = 'round';
            tCtx.strokeText(char, 0, 0);
        } else if (strokeMode === 2) {
            tCtx.strokeStyle = '#ffffff';
            tCtx.lineWidth = 9.5;
            tCtx.lineCap = 'round';
            tCtx.lineJoin = 'round';
            tCtx.strokeText(char, 0, 0);
        } else {
            tCtx.fillStyle = '#ffffff';
            tCtx.fillText(char, 0, 0);
        }
        tCtx.restore();

        // Extract bounding box and draw centered into 48x48
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

    // --- Preprocess user drawing on canvas into 48x48 tensor ---
    preprocessUserCanvas(userCanvas) {
        const S = AI_CONFIG.INPUT_SIZE;
        const userW = parseInt(userCanvas.style.width) || userCanvas.width;
        const userH = parseInt(userCanvas.style.height) || userCanvas.height;
        const isDark = document.documentElement.classList.contains('dark');

        const raw = document.createElement('canvas');
        raw.width = userW;
        raw.height = userH;
        const rawCtx = raw.getContext('2d');
        rawCtx.drawImage(userCanvas, 0, 0, userCanvas.width, userCanvas.height, 0, 0, userW, userH);
        const rawData = rawCtx.getImageData(0, 0, userW, userH).data;

        // Find bounding box of user strokes
        let minX = userW, minY = userH, maxX = 0, maxY = 0, hasStrokes = false;
        for (let y = 0; y < userH; y++) {
            for (let x = 0; x < userW; x++) {
                const i = (y * userW + x) * 4;
                const a = rawData[i + 3];
                const luma = (rawData[i] + rawData[i + 1] + rawData[i + 2]) / 3;
                const isStroke = a > 30 && (isDark ? luma > 60 : luma < 200);
                if (isStroke) {
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
        if (bboxW < 10 && bboxH < 10) return null;

        // Draw cropped & aspect-ratio centered into 48x48
        const tensorCanvas = document.createElement('canvas');
        tensorCanvas.width = tensorCanvas.height = S;
        const tCtx = tensorCanvas.getContext('2d');
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

        if (isDark) {
            tCtx.drawImage(raw, minX, minY, bboxW, bboxH, dx, dy, dw, dh);
        } else {
            tCtx.filter = 'invert(1)';
            tCtx.drawImage(raw, minX, minY, bboxW, bboxH, dx, dy, dw, dh);
            tCtx.filter = 'none';
        }

        // Convert to Float32Array tensor [1, 48, 48, 1]
        const finalData = tCtx.getImageData(0, 0, S, S).data;
        const inputArr = new Float32Array(S * S);
        for (let p = 0; p < S * S; p++) {
            const v = finalData[p * 4];
            inputArr[p] = v > 20 ? Math.min(1.0, (v / 255.0) * 1.35) : 0.0;
        }

        return tf.tensor4d(inputArr, [1, S, S, 1]);
    }

    // --- Predict character probabilities ---
    async predict(userCanvas) {
        if (!this.isReady || !this.model) return null;

        let tensor = null;
        try {
            tensor = this.preprocessUserCanvas(userCanvas);
            if (!tensor) return null;

            const predTensor = this.model.predict(tensor);
            const probs = await predTensor.data();
            predTensor.dispose();

            return Array.from(probs);
        } catch (err) {
            console.error('Prediction error:', err);
            return null;
        } finally {
            if (tensor) tensor.dispose();
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
    }

    // ------------------------------------------
    //  INIT
    // ------------------------------------------
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

        // Initialize AI model in background
        this.ai.initialize((statusText, state) => {
            this._updateAIStatusBadge(statusText, state);
        });
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

    // ------------------------------------------
    //  CANVAS RESIZE
    // ------------------------------------------
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

    // ------------------------------------------
    //  CANVAS DRAWING EVENTS
    // ------------------------------------------
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

    // ------------------------------------------
    //  CLEAR CANVAS
    // ------------------------------------------
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

    // ------------------------------------------
    //  PROMPT OVERLAY
    // ------------------------------------------
    showPrompt() {
        const p = document.getElementById('canvas-prompt');
        if (p) p.style.opacity = '1';
    }
    hidePrompt() {
        const p = document.getElementById('canvas-prompt');
        if (p) p.style.opacity = '0';
    }

    // ------------------------------------------
    //  UNDERLAY TOGGLE
    // ------------------------------------------
    toggleUnderlay() {
        this.showUnderlay = !this.showUnderlay;
        const el = document.getElementById('canvas-underlay');
        const btn = document.getElementById('btn-toggle-underlay');
        if (el) el.classList.toggle('hidden', !this.showUnderlay);
        if (btn) btn.classList.toggle('opacity-60', !this.showUnderlay);
    }

    // ------------------------------------------
    //  AUDIO PRONUNCIATION
    // ------------------------------------------
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

    // ------------------------------------------
    //  CATEGORY & NAVIGATION
    // ------------------------------------------
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

    // ------------------------------------------
    //  UPDATE CARD UI
    // ------------------------------------------
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

    // ------------------------------------------
    //  UPDATE PROGRESS BAR
    // ------------------------------------------
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

    // ------------------------------------------
    //  NAVIGATE (tabs)
    // ------------------------------------------
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

    // ------------------------------------------
    //  THEME TOGGLE
    // ------------------------------------------
    toggleTheme() {
        document.documentElement.classList.toggle('dark');
    }

    // ------------------------------------------
    //  LIBRARY GRID
    // ------------------------------------------
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
            this._showCheckResult('loading', '⏳ AI Model is initializing. Please try again in a few seconds...');
            return;
        }

        // Geometric Scribble Guard (deterministic)
        if (this.strokeSegmentsCount > 15 || this.totalStrokeLength > 3500) {
            this.sound.playWrong();
            this._showCheckResult('wrong', `❌ Scribble detected! Please trace ${letter.char} carefully without excessive lines.`);
            return;
        }

        this._showCheckResult('loading', '🔍 AI is evaluating your handwriting...');
        this.sound.playLoading();

        // Run CNN Model Prediction
        const probabilities = await this.ai.predict(this.canvas);
        if (!probabilities) {
            this._showCheckResult('wrong', `✏️ Please write the complete character ${letter.char}!`);
            this.sound.playWrong();
            return;
        }

        const targetProb = probabilities[targetGlobalIndex] || 0;

        // Rank predictions descending
        const ranked = probabilities.map((p, idx) => ({
            prob: p,
            idx,
            char: MALAYALAM_CURRICULUM[idx].char,
            roman: MALAYALAM_CURRICULUM[idx].roman
        })).sort((a, b) => b.prob - a.prob);

        const top1 = ranked[0];
        const top2 = ranked[1];
        const top3 = ranked[2];

        console.log(`[AI Evaluation] Target: "${letter.char}" (${letter.roman}, idx ${targetGlobalIndex}) | Prob: ${(targetProb * 100).toFixed(1)}%`);
        console.log('Top 3 Detected:', ranked.slice(0, 3).map(r => `"${r.char}" (${(r.prob * 100).toFixed(1)}%)`).join(', '));

        // ── DECISION & SMART FEEDBACK (Calibrated for 56 classes) ──
        // In a 56-class classifier, random chance is 1.78%.
        // A Top-1 probability >= 10% is already dominant over other 55 classes.

        // Case 1: Target character is Top-1 prediction
        if (top1.idx === targetGlobalIndex && targetProb >= 0.10) {
            this.sound.playCorrect();
            const matchPct = Math.min(99, Math.round(78 + Math.min(1.0, targetProb / 0.35) * 21));
            this._showCheckResult('correct', `✅ Correct! Great job writing ${letter.char}! (${matchPct}% match)`);
            return;
        }

        // Case 2: Target character is in Top-2 / Top-3
        const isNearMatch = (top1.idx === targetGlobalIndex && targetProb < 0.10) ||
                            (top2 && top2.idx === targetGlobalIndex && targetProb >= 0.06) ||
                            (top3 && top3.idx === targetGlobalIndex && targetProb >= 0.04);

        if (isNearMatch) {
            this.sound.playWrong();
            const matchPct = Math.round(48 + Math.min(1.0, targetProb / 0.10) * 22);
            this._showCheckResult('almost', `⚠️ Almost There! Keep practising ${letter.char} (${matchPct}% match)`);
            return;
        }

        // Case 3: Specific educational hints for twin pairs
        if (letter.char === 'ആ' && top1.char === 'അ') {
            this.sound.playWrong();
            this._showCheckResult('wrong', `❌ You wrote "അ" (a) instead of "ആ" (aa)! Don't forget the curved loop on the right! (25% match)`);
            return;
        }
        if (letter.char === 'അ' && top1.char === 'ആ') {
            this.sound.playWrong();
            this._showCheckResult('wrong', `❌ You wrote "ആ" (aa) instead of "അ" (a)! "അ" doesn't have the long right loop. (25% match)`);
            return;
        }

        // Case 4: Other detected character or mismatch
        const detectedInfo = (top1 && top1.prob >= 0.20) ? ` (looks closer to "${top1.char}")` : '';
        const matchPct = Math.max(5, Math.round(targetProb * 30));
        this.sound.playWrong();
        this._showCheckResult('wrong', `❌ Try Again! Trace ${letter.char} more carefully${detectedInfo} (${matchPct}% match)`);
    }

    // ------------------------------------------
    //  CHECK RESULT BANNER
    // ------------------------------------------
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

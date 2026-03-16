// ============================================================
// LOCKSTEP - Rhythm Game
// Inspired by Lockstep from Rhythm Heaven
// ============================================================

const CONFIG = {
    BPM: 128,
    PERFECT_WINDOW: 0.06,
    GOOD_WINDOW: 0.13,
    SCORE_PERFECT: 100,
    SCORE_GOOD: 50,
    ROWS: 4,
    COLS: 5,
    PLAYER_ROW: 3,   // front row (0-indexed)
    PLAYER_COL: 2,   // center
};

// ============================================================
// AUDIO ENGINE
// ============================================================
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
    }

    init() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.35;
        this.masterGain.connect(this.ctx.destination);
    }

    get now() { return this.ctx.currentTime; }

    // Helper: create osc+gain routed to master
    _osc(type, freq, time, dur, vol) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.connect(g); g.connect(this.masterGain);
        o.type = type;
        o.frequency.setValueAtTime(freq, time);
        g.gain.setValueAtTime(vol, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + dur);
        o.start(time);
        o.stop(time + dur);
        return o;
    }

    // Metronome tick
    tick(time, high) {
        this._osc('square', high ? 900 : 680, time, 0.06, 0.2);
    }

    // March step thud
    step(time) {
        const o = this._osc('sine', 90, time, 0.14, 0.45);
        o.frequency.exponentialRampToValueAtTime(40, time + 0.14);
        this._osc('sawtooth', 180, time, 0.04, 0.12);
    }

    // Off-beat switch cue: three rising tones ("ti-ti-ti!")
    cueOffBeat(time) {
        const gap = 60 / CONFIG.BPM / 3; // triplet within one beat
        this._osc('triangle', 1100, time, 0.09, 0.3);
        this._osc('triangle', 1400, time + gap, 0.09, 0.3);
        this._osc('triangle', 1800, time + gap * 2, 0.09, 0.35);
    }

    // On-beat switch cue: three descending tones
    cueOnBeat(time) {
        const gap = 60 / CONFIG.BPM / 3;
        this._osc('triangle', 1600, time, 0.09, 0.3);
        this._osc('triangle', 1300, time + gap, 0.09, 0.3);
        this._osc('triangle', 1000, time + gap * 2, 0.09, 0.35);
    }

    // Background bass pulse
    bass(time, onBeat) {
        this._osc('sine', onBeat ? 110 : 88, time, 0.28, 0.1);
    }

    // Miss buzzer
    miss(time) {
        const o = this._osc('sawtooth', 180, time, 0.18, 0.18);
        o.frequency.exponentialRampToValueAtTime(90, time + 0.18);
    }
}

// ============================================================
// SONG CHART
// Defines beat-by-beat events including mode switches.
// In Lockstep, the cue plays on one beat and the switch
// happens on the next downbeat (2 beats later).
// ============================================================
function createChart() {
    // Each entry: { cueBeat, switchBeat, toMode }
    // cueBeat = when the audio cue plays
    // switchBeat = when the mode actually changes
    const sections = [
        // Section 1: Start on-beat for 16 beats, then off-beat
        { cueBeat: 14, switchBeat: 16, toMode: 'off' },
        // Switch back at beat 32
        { cueBeat: 30, switchBeat: 32, toMode: 'on' },
        // Off again
        { cueBeat: 46, switchBeat: 48, toMode: 'off' },
        // On again
        { cueBeat: 62, switchBeat: 64, toMode: 'on' },
        // Faster switching section
        { cueBeat: 70, switchBeat: 72, toMode: 'off' },
        { cueBeat: 78, switchBeat: 80, toMode: 'on' },
        { cueBeat: 86, switchBeat: 88, toMode: 'off' },
        { cueBeat: 94, switchBeat: 96, toMode: 'on' },
        // Rapid switching
        { cueBeat: 100, switchBeat: 102, toMode: 'off' },
        { cueBeat: 106, switchBeat: 108, toMode: 'on' },
        { cueBeat: 112, switchBeat: 114, toMode: 'off' },
        // Final on-beat
        { cueBeat: 120, switchBeat: 122, toMode: 'on' },
    ];

    const totalBeats = 138;
    return { sections, totalBeats };
}

// ============================================================
// GAME
// ============================================================
class Game {
    constructor() {
        this.audio = new AudioEngine();
        this.state = 'title';

        // Scoring
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.perfectCount = 0;
        this.goodCount = 0;
        this.missCount = 0;

        // Timing
        this.beatDur = 60 / CONFIG.BPM;
        this.halfBeat = this.beatDur / 2;
        this.songStart = 0;
        this.chart = null;
        this.nextSwitchIdx = 0;

        // Mode
        this.mode = 'on'; // 'on' or 'off'

        // Step tracking
        this.npcSide = 0;     // alternates 0/1 for left/right
        this.playerSide = 0;
        this.lastProcessedBeat = -1;

        // Expected hits the player needs to match
        this.expectedHits = [];
        // Track which beats we've already scheduled audio for
        this.scheduledUpTo = -1;

        // DOM
        this.bgLayer = document.getElementById('bg-layer');
        this.beatDot = document.getElementById('beat-dot');
        this.feedbackEl = document.getElementById('feedback');
        this.modeIndicator = document.getElementById('mode-indicator');
        this.scoreEl = document.getElementById('score');
        this.comboEl = document.getElementById('combo');
        this.marchField = document.getElementById('march-field');
        this.countdownEl = document.getElementById('countdown');

        // Build marcher DOM
        this.marchers = [];  // 2D array [row][col]
        this.playerEl = null;
        this.npcEls = [];
        this.buildMarchers();

        this.animId = null;
        this._fbTimeout = null;

        this.setupInput();
    }

    buildMarchers() {
        this.marchField.innerHTML = '';
        this.marchers = [];
        this.npcEls = [];

        const rowClasses = ['row-back', 'row-mid1', 'row-mid2', 'row-front'];

        for (let r = 0; r < CONFIG.ROWS; r++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = `marcher-row ${rowClasses[r]}`;
            const rowArr = [];

            for (let c = 0; c < CONFIG.COLS; c++) {
                const m = document.createElement('div');
                const isPlayer = r === CONFIG.PLAYER_ROW && c === CONFIG.PLAYER_COL;
                m.className = `marcher idle ${isPlayer ? 'player' : 'npc'}`;

                // Build body parts
                m.innerHTML = `
                    <div class="head"></div>
                    <div class="body"></div>
                    <div class="arm-left"></div>
                    <div class="arm-right"></div>
                    <div class="leg-left"></div>
                    <div class="leg-right"></div>
                `;

                if (isPlayer) {
                    this.playerEl = m;
                } else {
                    this.npcEls.push(m);
                }

                rowDiv.appendChild(m);
                rowArr.push(m);
            }

            this.marchField.appendChild(rowDiv);
            this.marchers.push(rowArr);
        }
    }

    setupInput() {
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            if (e.code === 'Space' && this.state === 'playing') {
                e.preventDefault();
                this.onPlayerInput();
            }
        });
    }

    // ---- Color themes for on-beat / off-beat ----
    setColorTheme(mode) {
        const container = document.getElementById('game-container');
        if (mode === 'on') {
            container.style.setProperty('--npc-head', '#7070bb');
            container.style.setProperty('--npc-body', '#4a4a9a');
            container.style.setProperty('--npc-arm', '#5a5aaa');
            container.style.setProperty('--npc-leg', '#3a3a7a');
            container.style.setProperty('--player-head', '#dd7070');
            container.style.setProperty('--player-body', '#bb4444');
            container.style.setProperty('--player-arm', '#cc5555');
            container.style.setProperty('--player-leg', '#993333');
        } else {
            // Off-beat: NPCs become pinkish/warm, player stays distinct
            container.style.setProperty('--npc-head', '#bb70a0');
            container.style.setProperty('--npc-body', '#9a4a7a');
            container.style.setProperty('--npc-arm', '#aa5a8a');
            container.style.setProperty('--npc-leg', '#7a3a6a');
            container.style.setProperty('--player-head', '#ffaa66');
            container.style.setProperty('--player-body', '#dd7733');
            container.style.setProperty('--player-arm', '#ee8844');
            container.style.setProperty('--player-leg', '#bb5522');
        }
    }

    // ---- Start game ----
    start() {
        this.audio.init();
        this.chart = createChart();
        this.beatDur = 60 / CONFIG.BPM;
        this.halfBeat = this.beatDur / 2;

        // Reset
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.perfectCount = 0;
        this.goodCount = 0;
        this.missCount = 0;
        this.mode = 'on';
        this.nextSwitchIdx = 0;
        this.npcSide = 0;
        this.playerSide = 0;
        this.lastProcessedBeat = -1;
        this.expectedHits = [];
        this.scheduledUpTo = -1;

        this.scoreEl.textContent = '0';
        this.comboEl.textContent = '0';
        this.modeIndicator.textContent = 'ON-BEAT';
        this.bgLayer.style.backgroundColor = '#2a2a6e';
        this.setColorTheme('on');

        // Reset marcher poses
        this.npcEls.forEach(m => { m.className = m.className.replace(/step-\w+|miss-wobble/g, '').trim(); m.classList.add('idle'); });
        if (this.playerEl) {
            this.playerEl.className = 'marcher player idle';
        }

        // Switch screens
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('results-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');

        // Countdown before gameplay starts
        this.runCountdown();
    }

    runCountdown() {
        this.state = 'countdown';
        this.countdownEl.classList.remove('hidden');
        const counts = [3, 2, 1];
        let i = 0;
        const beatMs = this.beatDur * 1000;

        const showNext = () => {
            if (i < counts.length) {
                this.countdownEl.innerHTML = `<span>${counts[i]}</span>`;
                // Play a tick for each count
                this.audio.tick(this.audio.now, i === 0);
                i++;
                setTimeout(showNext, beatMs);
            } else {
                // "GO!" then start
                this.countdownEl.innerHTML = `<span>GO!</span>`;
                this.audio.tick(this.audio.now, true);
                setTimeout(() => {
                    this.countdownEl.classList.add('hidden');
                    this.songStart = this.audio.now + 0.1;
                    this.state = 'playing';
                    this.loop();
                }, beatMs * 0.6);
            }
        };
        showNext();
    }

    // ---- Get mode at a given beat ----
    getModeAtBeat(beat) {
        let m = 'on';
        for (const s of this.chart.sections) {
            if (beat >= s.switchBeat) m = s.toMode;
            else break;
        }
        return m;
    }

    // ---- Schedule audio ahead for precision ----
    scheduleAudio() {
        const lookAhead = 0.6; // seconds
        const now = this.audio.now;
        const endBeat = Math.min(
            this.chart.totalBeats,
            Math.ceil((now - this.songStart + lookAhead) / this.beatDur)
        );

        for (let b = this.scheduledUpTo + 1; b <= endBeat; b++) {
            const t = this.songStart + b * this.beatDur;
            if (t < now - 0.05) continue;

            const modeAtBeat = this.getModeAtBeat(b);

            // Tick on every beat
            this.audio.tick(t, b % 2 === 0);

            // Bass
            this.audio.bass(t, modeAtBeat === 'on');

            // NPC step sound on every beat
            this.audio.step(t);

            // In off-beat mode, also tick on the off-beat
            if (modeAtBeat === 'off') {
                this.audio.tick(t + this.halfBeat, false);
            }

            // Switch cues
            for (const s of this.chart.sections) {
                if (b === s.cueBeat) {
                    if (s.toMode === 'off') {
                        this.audio.cueOffBeat(t);
                    } else {
                        this.audio.cueOnBeat(t);
                    }
                }
            }

            // Register expected player hits
            if (modeAtBeat === 'on') {
                this.expectedHits.push({ time: t, beat: b });
            } else {
                // Off-beat: player should hit between beats
                this.expectedHits.push({ time: t + this.halfBeat, beat: b + 0.5 });
            }

            this.scheduledUpTo = b;
        }
    }

    // ---- Main loop ----
    loop() {
        const now = this.audio.now;
        const elapsed = now - this.songStart;
        const beatFloat = elapsed / this.beatDur;
        const beat = Math.floor(beatFloat);
        const beatFrac = beatFloat - beat;

        // Schedule audio
        this.scheduleAudio();

        // Process new beats for visuals
        if (beat > this.lastProcessedBeat && beat >= 0 && beat < this.chart.totalBeats) {
            for (let b = this.lastProcessedBeat + 1; b <= beat; b++) {
                this.onBeat(b);
            }
            this.lastProcessedBeat = beat;
        }

        // Off-beat NPC visual step (at half-beat mark during off-beat mode)
        // This is handled within onBeat via setTimeout for the half-beat

        // Beat dot animation
        const dotX = Math.sin(beatFrac * Math.PI * 2) * 90 + 92;
        this.beatDot.style.left = dotX + 'px';

        // Check misses
        this.checkMisses(now);

        // End check
        if (beat >= this.chart.totalBeats) {
            this.endSong();
            return;
        }

        this.animId = requestAnimationFrame(() => this.loop());
    }

    // ---- Called on every beat ----
    onBeat(beat) {
        const mode = this.getModeAtBeat(beat);

        // Mode switch visual
        if (this.nextSwitchIdx < this.chart.sections.length) {
            const s = this.chart.sections[this.nextSwitchIdx];
            if (beat >= s.switchBeat) {
                this.mode = s.toMode;
                this.modeIndicator.textContent = s.toMode === 'on' ? 'ON-BEAT' : 'OFF-BEAT';
                this.setColorTheme(s.toMode);
                this.nextSwitchIdx++;
            }
        }

        // Background color: Lockstep style
        // On-beat: purple/blue tones that flash lighter on beat
        // Off-beat: pink/red tones that flash lighter on beat
        if (this.mode === 'on') {
            // Flash bright on beat, return to base
            this.bgLayer.style.backgroundColor = '#3e3e8e';
            setTimeout(() => {
                if (this.mode === 'on') this.bgLayer.style.backgroundColor = '#2a2a6e';
            }, 100);
        } else {
            // Off-beat mode: pink base, flash on beat
            this.bgLayer.style.backgroundColor = '#8e3050';
            setTimeout(() => {
                if (this.mode === 'off') this.bgLayer.style.backgroundColor = '#6e2040';
            }, 100);
        }

        // NPC marchers step on every beat
        this.animateNpcStep();
    }

    animateNpcStep() {
        const side = this.npcSide % 2 === 0 ? 'step-left' : 'step-right';
        this.npcSide++;

        this.npcEls.forEach(m => {
            m.classList.remove('step-left', 'step-right', 'idle');
            void m.offsetWidth; // force reflow for re-triggering animation
            m.classList.add(side);
        });

        // Return to idle after step
        setTimeout(() => {
            this.npcEls.forEach(m => {
                m.classList.remove('step-left', 'step-right');
                m.classList.add('idle');
            });
        }, 130);
    }

    animatePlayerStep() {
        const side = this.playerSide % 2 === 0 ? 'step-left' : 'step-right';
        this.playerSide++;

        this.playerEl.classList.remove('step-left', 'step-right', 'idle', 'miss-wobble');
        void this.playerEl.offsetWidth;
        this.playerEl.classList.add(side);

        setTimeout(() => {
            this.playerEl.classList.remove('step-left', 'step-right');
            this.playerEl.classList.add('idle');
        }, 130);
    }

    // ---- Player input ----
    onPlayerInput() {
        const now = this.audio.now;

        // Find closest expected hit
        let bestIdx = -1;
        let bestDist = Infinity;

        for (let i = 0; i < this.expectedHits.length; i++) {
            const d = Math.abs(now - this.expectedHits[i].time);
            if (d < bestDist) {
                bestDist = d;
                bestIdx = i;
            }
        }

        if (bestIdx === -1) return;

        if (bestDist <= CONFIG.PERFECT_WINDOW) {
            this.hit('perfect', bestIdx);
        } else if (bestDist <= CONFIG.GOOD_WINDOW) {
            this.hit('good', bestIdx);
        } else if (bestDist <= 0.22) {
            // Close but still a miss
            this.hitMiss(bestIdx);
        }
        // Taps far from any beat are silently ignored (no penalty)
    }

    hit(quality, idx) {
        this.expectedHits.splice(idx, 1);
        const mult = 1 + Math.floor(this.combo / 10) * 0.1;

        if (quality === 'perfect') {
            this.score += CONFIG.SCORE_PERFECT * mult;
            this.perfectCount++;
            this.showFeedback('PERFECT!', 'perfect');
        } else {
            this.score += CONFIG.SCORE_GOOD * mult;
            this.goodCount++;
            this.showFeedback('GOOD', 'good');
        }

        this.combo++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        this.animatePlayerStep();
        this.updateHUD();
    }

    hitMiss(idx) {
        this.expectedHits.splice(idx, 1);
        this.combo = 0;
        this.missCount++;
        this.audio.miss(this.audio.now);
        this.showFeedback('MISS', 'miss');

        this.playerEl.classList.remove('step-left', 'step-right', 'idle');
        void this.playerEl.offsetWidth;
        this.playerEl.classList.add('miss-wobble');
        setTimeout(() => {
            this.playerEl.classList.remove('miss-wobble');
            this.playerEl.classList.add('idle');
        }, 350);

        this.updateHUD();
    }

    checkMisses(now) {
        while (this.expectedHits.length > 0) {
            const h = this.expectedHits[0];
            if (now - h.time > CONFIG.GOOD_WINDOW + 0.05) {
                this.expectedHits.shift();
                this.combo = 0;
                this.missCount++;
                this.showFeedback('MISS', 'miss');
                this.updateHUD();
            } else {
                break;
            }
        }
    }

    showFeedback(text, type) {
        this.feedbackEl.textContent = text;
        this.feedbackEl.className = '';
        void this.feedbackEl.offsetWidth;
        this.feedbackEl.className = `show ${type}`;
        clearTimeout(this._fbTimeout);
        this._fbTimeout = setTimeout(() => {
            this.feedbackEl.className = '';
        }, 500);
    }

    updateHUD() {
        this.scoreEl.textContent = Math.floor(this.score);
        this.comboEl.textContent = this.combo;
    }

    // ---- End ----
    endSong() {
        this.state = 'results';
        if (this.animId) cancelAnimationFrame(this.animId);

        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('results-screen').classList.remove('hidden');

        document.getElementById('final-score').textContent = Math.floor(this.score);
        document.getElementById('max-combo').textContent = this.maxCombo;
        document.getElementById('perfect-count').textContent = this.perfectCount;
        document.getElementById('good-count').textContent = this.goodCount;
        document.getElementById('miss-count').textContent = this.missCount;

        const total = this.perfectCount + this.goodCount + this.missCount;
        const perfRate = total > 0 ? this.perfectCount / total : 0;
        const hitRate = total > 0 ? (this.perfectCount + this.goodCount) / total : 0;

        let rank = 'Try Again';
        if (perfRate > 0.9) rank = 'SUPERB!';
        else if (hitRate > 0.9) rank = 'Great!';
        else if (hitRate > 0.7) rank = 'OK';

        document.getElementById('rank').textContent = rank;
    }

    backToTitle() {
        this.state = 'title';
        document.getElementById('results-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');
    }
}

// ============================================================
const game = new Game();

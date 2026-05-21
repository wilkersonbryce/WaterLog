/**
 * WaterLog - Core Application Script
 * Highly Interactive daily hydration tracker with real-time sound synthesis, 
 * canvas particle celebration, state management, and multi-theme logic.
 */

// ==========================================================================
// 1. Service Worker & PWA Initialization
// ==========================================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => console.log('[PWA] Service Worker registered:', reg.scope))
      .catch((err) => console.error('[PWA] Service Worker registration failed:', err));
  });
}

// ==========================================================================
// 2. Web Audio API Liquid Synthesizer
// ==========================================================================
class LiquidSynthesizer {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.enabled = true;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.6; // moderate master volume
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn("Web Audio API not supported in this browser:", e);
    }
  }

  playPour(fillPercentage) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    // Resume context if suspended (common browser security constraint)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    
    // Pitch rises as the bottle fills up
    // 0% full = low pitch, 100% full = high pitch
    const pitchFactor = Math.min(Math.max(fillPercentage, 0), 1);
    const baseFreq = 300 + (pitchFactor * 350); // range: 300Hz to 650Hz
    
    // --- 1. Synthesize the Pouring Rush (Bandpassed Pink Noise) ---
    const bufferSize = this.ctx.sampleRate * 0.45; // 0.45 seconds duration
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Simple filter coefficients for pink-ish/sloshy noise
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11; // gain adjustment
      b6 = white * 0.115926;
    }
    
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(baseFreq * 1.5, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, now + 0.45);
    noiseFilter.Q.setValueAtTime(4.0, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.01, now);
    noiseGain.gain.linearRampToValueAtTime(0.18, now + 0.08);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    
    noiseSource.start(now);
    noiseSource.stop(now + 0.45);

    // --- 2. Synthesize Bubble Pops / "Glugs" ---
    // Trigger 3 discrete glugs spaced slightly apart
    const glugDelays = [0.05, 0.16, 0.28];
    glugDelays.forEach((delay, index) => {
      const glugTime = now + delay;
      
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      
      osc.type = 'sine';
      // Each successive glug goes slightly higher in pitch, simulating bubbling
      const glugFreq = baseFreq + (index * 40) + (Math.random() * 20 - 10);
      
      osc.frequency.setValueAtTime(glugFreq, glugTime);
      // Fast upward frequency sweep gives the bubbly "plop" or "glug" effect
      osc.frequency.exponentialRampToValueAtTime(glugFreq * 2.2, glugTime + 0.09);
      
      oscGain.gain.setValueAtTime(0.001, glugTime);
      oscGain.gain.linearRampToValueAtTime(0.12, glugTime + 0.015);
      oscGain.gain.exponentialRampToValueAtTime(0.001, glugTime + 0.09);
      
      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      
      osc.start(glugTime);
      osc.stop(glugTime + 0.095);
    });
  }
}

// ==========================================================================
// 3. Canvas Confetti Particle Celebration
// ==========================================================================
class CelebrationConfetti {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.colors = ['#38bdf8', '#0ea5e9', '#0284c7', '#34d399', '#10b981', '#fda4af', '#f43f5e', '#facc15'];
    this.isActive = false;
  }

  resize() {
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight;
  }

  spawn() {
    this.resize();
    this.particles = [];
    this.isActive = true;
    
    // Spawn 140 particles from bottom-left and bottom-right corners
    const particleCount = 140;
    for (let i = 0; i < particleCount; i++) {
      const isLeft = Math.random() > 0.5;
      this.particles.push({
        x: isLeft ? 10 : this.canvas.width - 10,
        y: this.canvas.height - 20,
        radius: Math.random() * 4 + 4,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        vx: (isLeft ? 1 : -1) * (Math.random() * 7 + 4),
        vy: -(Math.random() * 12 + 10),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        opacity: 1,
        gravity: 0.28,
        drag: 0.97
      });
    }

    if (this.particles.length > 0) {
      this.animate();
    }
  }

  animate() {
    if (!this.isActive) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    let activeParticles = 0;

    for (let p of this.particles) {
      if (p.opacity <= 0) continue;
      activeParticles++;

      p.vx *= p.drag;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      
      // Gradually fade particles once they fall past 70% of screen height
      if (p.y > this.canvas.height * 0.6) {
        p.opacity -= 0.02;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.opacity);
      
      // Draw rectangular confetti ribbons
      this.ctx.fillRect(-p.radius, -p.radius / 2, p.radius * 2, p.radius);
      this.ctx.restore();
    }

    if (activeParticles > 0) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.isActive = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

// ==========================================================================
// 4. Core State Management & Data Controller
// ==========================================================================
const AppState = {
  // Configured default attributes
  currentIntake: 0,
  dailyGoal: 128, // Default in oz
  unit: 'oz', // 'oz' or 'ml'
  streak: 0,
  lastLoggedDate: '',
  theme: 'ocean-drift',
  soundEnabled: true,
  hapticEnabled: true,
  sipsToday: [], // List of { id, amount, unit, timestamp, timeString }
  history: {}, // Key: YYYY-MM-DD, Value: { target, actual, unit }

  // Constant Conversion Rates
  OZ_TO_ML: 29.5735,
  ML_TO_OZ: 1 / 29.5735,

  load() {
    const data = localStorage.getItem('waterlog_user_data');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        this.currentIntake = parsed.currentIntake ?? 0;
        this.dailyGoal = parsed.dailyGoal ?? 80;
        this.unit = parsed.unit ?? 'oz';
        this.streak = parsed.streak ?? 0;
        this.lastLoggedDate = parsed.lastLoggedDate ?? '';
        this.theme = parsed.theme ?? 'ocean-drift';
        this.soundEnabled = parsed.soundEnabled ?? true;
        this.hapticEnabled = parsed.hapticEnabled ?? true;
        this.sipsToday = parsed.sipsToday ?? [];
        this.history = parsed.history ?? {};
      } catch (e) {
        console.error("Error decoding localStorage state, using defaults:", e);
      }
    }
    this.checkDayRollover();
  },

  save() {
    const stateSnapshot = {
      currentIntake: this.currentIntake,
      dailyGoal: this.dailyGoal,
      unit: this.unit,
      streak: this.streak,
      lastLoggedDate: this.lastLoggedDate,
      theme: this.theme,
      soundEnabled: this.soundEnabled,
      hapticEnabled: this.hapticEnabled,
      sipsToday: this.sipsToday,
      history: this.history
    };
    localStorage.setItem('waterlog_user_data', JSON.stringify(stateSnapshot));
  },

  getTodayKey() {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  getYesterdayKey() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  checkDayRollover() {
    const today = this.getTodayKey();
    
    // If the day changed
    if (this.lastLoggedDate && this.lastLoggedDate !== today) {
      // 1. Record yesterday's total into history
      this.history[this.lastLoggedDate] = {
        target: this.dailyGoal,
        actual: this.currentIntake,
        unit: this.unit
      };

      // 2. Validate/Reset streak
      const targetMet = this.currentIntake >= this.dailyGoal;
      const yesterday = this.getYesterdayKey();
      
      if (!targetMet && this.lastLoggedDate !== yesterday) {
        // If yesterday they didn't log OR they missed target and today is even later
        this.streak = 0;
      } else if (!targetMet) {
        // Completed day was yesterday, but target wasn't met: reset streak
        this.streak = 0;
      }

      // 3. Wipe today's logs for fresh starts
      this.currentIntake = 0;
      this.sipsToday = [];
      this.lastLoggedDate = today;
      this.save();
    } else if (!this.lastLoggedDate) {
      this.lastLoggedDate = today;
      this.save();
    }
  },

  addSip(amount) {
    const now = new Date();
    const sip = {
      id: 'sip_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      amount: parseFloat(amount),
      unit: this.unit,
      timestamp: now.getTime(),
      timeString: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const previousIntake = this.currentIntake;
    this.currentIntake += sip.amount;
    this.sipsToday.push(sip);
    this.lastLoggedDate = this.getTodayKey();
    
    // Streak Validation logic
    // If target is met today AND wasn't met before this addition, update streak!
    if (this.currentIntake >= this.dailyGoal && previousIntake < this.dailyGoal) {
      // Validate streak
      const yesterday = this.getYesterdayKey();
      const yesterdayRecord = this.history[yesterday];
      
      if (this.streak === 0 || (yesterdayRecord && yesterdayRecord.actual >= yesterdayRecord.target)) {
        this.streak += 1;
      } else {
        // First completion in a while
        this.streak = 1;
      }
    }
    
    this.save();
    return sip;
  },

  deleteSip(id) {
    const index = this.sipsToday.findIndex(s => s.id === id);
    if (index !== -1) {
      const sip = this.sipsToday[index];
      const previousIntake = this.currentIntake;
      
      this.currentIntake = Math.max(0, this.currentIntake - sip.amount);
      this.sipsToday.splice(index, 1);
      
      // If we dropped below the goal, adjust streak
      if (previousIntake >= this.dailyGoal && this.currentIntake < this.dailyGoal) {
        this.streak = Math.max(0, this.streak - 1);
      }
      
      this.save();
      return true;
    }
    return false;
  },

  undoLastSip() {
    if (this.sipsToday.length > 0) {
      const last = this.sipsToday[this.sipsToday.length - 1];
      return this.deleteSip(last.id);
    }
    return false;
  },

  convertUnits(newUnit) {
    if (this.unit === newUnit) return;
    
    const factor = newUnit === 'ml' ? this.OZ_TO_ML : this.ML_TO_OZ;
    
    // Scale current daily numbers
    this.currentIntake = Math.round(this.currentIntake * factor);
    this.dailyGoal = Math.round(this.dailyGoal * factor);
    
    // Scale today's individual logs
    this.sipsToday = this.sipsToday.map(sip => ({
      ...sip,
      amount: Math.round(sip.amount * factor),
      unit: newUnit
    }));
    
    // Switch unit flag
    this.unit = newUnit;
    this.save();
  },

  resetAll() {
    this.currentIntake = 0;
    this.dailyGoal = this.unit === 'oz' ? 128 : 3800;
    this.streak = 0;
    this.lastLoggedDate = this.getTodayKey();
    this.sipsToday = [];
    this.history = {};
    this.save();
  }
};

// ==========================================================================
// 5. Interface Controller & UI Handler
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Load State
  AppState.load();

  // Instantiations
  const audio = new LiquidSynthesizer();
  audio.enabled = AppState.soundEnabled;
  
  const confetti = new CelebrationConfetti('confetti-canvas');

  // Interactive UI Selectors
  const body = document.documentElement;
  const motivationText = document.getElementById('motivation-text');
  const bottleContainer = document.getElementById('bottle-container');
  const waterGroup = document.getElementById('water-group');
  const pctOverlay = document.getElementById('water-percentage-overlay');
  const pctNum = document.getElementById('percentage-num');
  
  // Progress Info
  const currentIntakeVal = document.getElementById('current-intake-val');
  const currentIntakeUnit = document.getElementById('current-intake-unit');
  const targetIntakeVal = document.getElementById('target-intake-val');
  const targetIntakeUnit = document.getElementById('target-intake-unit');
  const compactProgressFill = document.getElementById('compact-progress-fill');
  
  // Streak
  const streakCount = document.getElementById('streak-count');
  
  // Quick-log Buttons
  const quickLogButtons = document.querySelectorAll('.quick-log');
  
  // Drawers & Modals
  const historyDrawer = document.getElementById('history-drawer');
  const historyDrawerOverlay = document.getElementById('history-drawer-overlay');
  const customModal = document.getElementById('custom-modal');
  const customModalOverlay = document.getElementById('custom-modal-overlay');
  const settingsModal = document.getElementById('settings-modal');
  const settingsModalOverlay = document.getElementById('settings-modal-overlay');
  
  // Trigger Buttons
  const openHistoryBtn = document.getElementById('open-history-btn');
  const closeHistoryBtn = document.getElementById('close-history-btn');
  const openCustomBtn = document.getElementById('open-custom-btn');
  const closeCustomModalBtn = document.getElementById('close-custom-modal-btn');
  const confirmCustomLogBtn = document.getElementById('confirm-custom-log-btn');
  const customAmountInput = document.getElementById('custom-amount-input');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const undoBtn = document.getElementById('undo-btn');
  const resetDataBtn = document.getElementById('reset-data-btn');
  
  // Custom Modal Units Label
  const customModalUnit = document.getElementById('custom-modal-unit');
  
  // Settings items
  const unitSegments = document.querySelectorAll('#unit-toggle .toggle-segment');
  const goalInput = document.getElementById('daily-goal-input');
  const settingsGoalUnit = document.getElementById('settings-goal-unit');
  const goalMinus = document.getElementById('goal-minus');
  const goalPlus = document.getElementById('goal-plus');
  const soundCheckbox = document.getElementById('sound-checkbox');
  const hapticCheckbox = document.getElementById('haptic-checkbox');
  const themeCards = document.querySelectorAll('.theme-card');
  
  // Containers
  const sipList = document.getElementById('sip-list');
  const weeklyChart = document.getElementById('weekly-chart');

  // Sound Engine Activator
  audio.enabled = AppState.soundEnabled;

  // ------------------------------------------------------------------------
  // Motivational Banner Messages
  // ------------------------------------------------------------------------
  const MOTIVATIONS = {
    dry: [
      "Ready to splash into hydration? 💧",
      "Hydration is key! Log your first glass 💦",
      "Feed your body with liquid life 🌊",
      "A sip at a time makes a happy cell! 🌱"
    ],
    progressing: [
      "Splash-tastic! You're making progress ✨",
      "Keep flowing! Your body is thanking you 🌊",
      "Over half-way there! Hydration Master! 🚀",
      "Fantastic pace, stay fluid! 💧"
    ],
    full: [
      "Hydration Crown Achieved! Goal completed! 👑",
      "You are officially 100% hydrated! Splendid! 🎉",
      "Perfect flow! You did it today! 🌊✨",
      "Fluid Champion! Supercharged health! 🐳"
    ]
  };

  function updateMotivationMessage(percentage) {
    let arr = MOTIVATIONS.dry;
    if (percentage >= 100) {
      arr = MOTIVATIONS.full;
    } else if (percentage > 0) {
      arr = MOTIVATIONS.progressing;
    }
    
    // Choose a stable index based on date so it doesn't change on every log tap
    const idx = new Date().getDate() % arr.length;
    motivationText.innerText = arr[idx];
  }

  // ------------------------------------------------------------------------
  // Haptic Feedback Engine
  // ------------------------------------------------------------------------
  function triggerHaptic(type = 'light') {
    if (!AppState.hapticEnabled || !navigator.vibrate) return;
    
    if (type === 'light') {
      navigator.vibrate(15);
    } else if (type === 'medium') {
      navigator.vibrate(30);
    } else if (type === 'success') {
      navigator.vibrate([40, 30, 40]);
    }
  }

  // ------------------------------------------------------------------------
  // Visual Updates Refresher
  // ------------------------------------------------------------------------
  function refreshVisuals() {
    // 1. Establish theme
    body.setAttribute('data-theme', AppState.theme);

    // 2. Units labels updating
    currentIntakeUnit.innerText = AppState.unit;
    targetIntakeUnit.innerText = AppState.unit;
    customModalUnit.innerText = AppState.unit;
    settingsGoalUnit.innerText = AppState.unit;

    // 3. Goal & current numbers
    currentIntakeVal.innerText = AppState.currentIntake;
    targetIntakeVal.innerText = AppState.dailyGoal;
    streakCount.innerText = AppState.streak;

    // 4. Fill Percent Calculation
    const rawPct = AppState.dailyGoal > 0 ? (AppState.currentIntake / AppState.dailyGoal) * 100 : 0;
    const roundedPct = Math.round(rawPct);
    pctNum.innerText = roundedPct;

    // Scale pop effect on current intake update
    currentIntakeVal.classList.add('scale-pop');
    setTimeout(() => currentIntakeVal.classList.remove('scale-pop'), 300);

    // 5. Water Level Wave Transform Translation
    const waveLevelRatio = Math.min(AppState.currentIntake / AppState.dailyGoal, 1);
    waterGroup.style.setProperty('--water-level-ratio', waveLevelRatio);

    // Dynamic color adjustments for text overlay inside the bottle
    if (waveLevelRatio > 0.52) {
      pctOverlay.classList.remove('dry');
      pctOverlay.classList.add('submerged');
    } else {
      pctOverlay.classList.remove('submerged');
      pctOverlay.classList.add('dry');
    }

    // 6. Compact fallback progress bar width
    compactProgressFill.style.width = `${Math.min(roundedPct, 100)}%`;

    // 7. Update motivational text banner
    updateMotivationMessage(roundedPct);

    // 8. Re-evaluate Quick-log Button text labels dynamically
    updateQuickButtonsLabels();

    // 9. Update undo button visibility
    if (AppState.sipsToday.length > 0) {
      undoBtn.classList.remove('hidden');
    } else {
      undoBtn.classList.add('hidden');
    }
  }

  // Adjust Quick Log numbers cleanly depending on Unit system (oz vs ml)
  function updateQuickButtonsLabels() {
    const quickAmounts = AppState.unit === 'oz' ? [8, 16, 24] : [250, 500, 750];
    
    quickLogButtons.forEach((btn, index) => {
      const amt = quickAmounts[index];
      btn.setAttribute('data-amount', amt);
      btn.querySelector('.btn-amount').innerText = amt;
      btn.querySelector('.btn-unit-lbl').innerText = AppState.unit;
    });
  }

  // ------------------------------------------------------------------------
  // Water Action Logging Logic
  // ------------------------------------------------------------------------
  function logWater(amount) {
    const previousPct = AppState.dailyGoal > 0 ? (AppState.currentIntake / AppState.dailyGoal) * 100 : 0;
    
    // Add drink to State
    AppState.addSip(amount);
    
    const newPct = (AppState.currentIntake / AppState.dailyGoal) * 100;

    // Visual Shake Sloshing feedback on Bottle Container
    bottleContainer.classList.remove('slosh-shake');
    void bottleContainer.offsetWidth; // Trigger reflow
    bottleContainer.classList.add('slosh-shake');

    // Synthesize pouring sound
    audio.playPour(AppState.currentIntake / AppState.dailyGoal);

    // Tactile Feedback
    if (newPct >= 100 && previousPct < 100) {
      triggerHaptic('success');
      // Trigger canvas particles
      setTimeout(() => confetti.spawn(), 350);
    } else {
      triggerHaptic('light');
    }

    // Dynamic UI Refresh
    refreshVisuals();
    renderLogsList();
    renderWeeklyChart();
  }

  // ------------------------------------------------------------------------
  // Drawer Sip Logs Renderer
  // ------------------------------------------------------------------------
  function renderLogsList() {
    sipList.innerHTML = '';
    
    if (AppState.sipsToday.length === 0) {
      sipList.innerHTML = '<div class="empty-state">No water logged yet today. Start drinking! 💦</div>';
      return;
    }

    // Render list (reversed so newest are on top)
    [...AppState.sipsToday].reverse().forEach(sip => {
      const item = document.createElement('div');
      item.className = 'sip-item';
      
      let sipEmoji = '💧';
      if (sip.amount >= (AppState.unit === 'oz' ? 24 : 700)) sipEmoji = '🐳';
      else if (sip.amount >= (AppState.unit === 'oz' ? 16 : 450)) sipEmoji = '🥤';
      
      item.innerHTML = `
        <div class="sip-info">
          <span class="sip-emoji">${sipEmoji}</span>
          <div class="sip-meta">
            <span class="sip-volume">${sip.amount} ${sip.unit}</span>
            <span class="sip-time">${sip.timeString}</span>
          </div>
        </div>
        <button class="delete-sip-btn" data-id="${sip.id}" aria-label="Delete logged intake">✕</button>
      `;
      sipList.appendChild(item);
    });

    // Wire up delete event listeners
    sipList.querySelectorAll('.delete-sip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.getAttribute('data-id');
        triggerHaptic('medium');
        AppState.deleteSip(id);
        refreshVisuals();
        renderLogsList();
        renderWeeklyChart();
      });
    });
  }

  // ------------------------------------------------------------------------
  // Drawer Weekly Chart Renderer
  // ------------------------------------------------------------------------
  function renderWeeklyChart() {
    weeklyChart.innerHTML = '';
    
    // Find the last 7 calendar days inclusive of today
    const days = [];
    const date = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(date.getDate() - i);
      
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      
      const dayLabel = d.toLocaleDateString([], { weekday: 'short' }).charAt(0);
      days.push({ key, label: dayLabel, isToday: i === 0 });
    }

    days.forEach(day => {
      let targetVal = AppState.dailyGoal;
      let actualVal = 0;
      let unitVal = AppState.unit;

      if (day.isToday) {
        actualVal = AppState.currentIntake;
      } else {
        const rec = AppState.history[day.key];
        if (rec) {
          actualVal = rec.actual;
          targetVal = rec.target;
          unitVal = rec.unit;
        }
      }

      // Convert actual log to current display unit for direct visual comparison
      let convertedActual = actualVal;
      if (unitVal !== AppState.unit) {
        const factor = AppState.unit === 'ml' ? AppState.OZ_TO_ML : AppState.ML_TO_OZ;
        convertedActual = Math.round(actualVal * factor);
      }

      const percent = targetVal > 0 ? Math.min((convertedActual / targetVal) * 100, 100) : 0;
      const targetMet = convertedActual >= targetVal;

      const column = document.createElement('div');
      column.className = 'chart-bar-col';
      
      column.innerHTML = `
        <div class="chart-bar-wrapper" title="${convertedActual}/${targetVal} ${AppState.unit}">
          <div class="chart-bar-fill ${targetMet ? 'target-met' : ''}" style="height: ${percent}%"></div>
        </div>
        <span class="chart-label ${day.isToday ? 'today' : ''}">${day.label}</span>
      `;
      weeklyChart.appendChild(column);
    });
  }

  // ------------------------------------------------------------------------
  // Event Bindings
  // ------------------------------------------------------------------------

  // 1. Quick log buttons
  quickLogButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = btn.getAttribute('data-amount');
      logWater(amount);
    });
  });

  // 2. Custom log modal dialog triggers
  openCustomBtn.addEventListener('click', () => {
    triggerHaptic('light');
    customAmountInput.value = '';
    customModalOverlay.classList.add('active');
    customModal.classList.add('active');
    customAmountInput.focus();
  });

  const closeCustomModal = () => {
    customModalOverlay.classList.remove('active');
    customModal.classList.remove('active');
  };

  closeCustomModalBtn.addEventListener('click', closeCustomModal);
  customModalOverlay.addEventListener('click', closeCustomModal);

  // Quick preset tags inside custom log dialog
  document.querySelectorAll('.preset-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      triggerHaptic('light');
      customAmountInput.value = tag.getAttribute('data-val');
    });
  });

  confirmCustomLogBtn.addEventListener('click', () => {
    const val = parseFloat(customAmountInput.value);
    if (val > 0) {
      closeCustomModal();
      logWater(val);
    }
  });

  // Tap-to-log direct on bottle!
  // It will log the smallest quick log option (typically 8oz / 250ml)
  bottleContainer.addEventListener('click', () => {
    const firstQuickVal = parseFloat(quickLogButtons[0].getAttribute('data-amount'));
    logWater(firstQuickVal);
  });

  // 3. Sliding History Drawer triggers
  openHistoryBtn.addEventListener('click', () => {
    triggerHaptic('light');
    renderLogsList();
    renderWeeklyChart();
    historyDrawerOverlay.classList.add('active');
    historyDrawer.classList.add('active');
  });

  const closeHistoryDrawer = () => {
    historyDrawerOverlay.classList.remove('active');
    historyDrawer.classList.remove('active');
  };

  closeHistoryBtn.addEventListener('click', closeHistoryDrawer);
  historyDrawerOverlay.addEventListener('click', closeHistoryDrawer);

  // Undo triggers
  undoBtn.addEventListener('click', () => {
    triggerHaptic('medium');
    AppState.undoLastSip();
    refreshVisuals();
    renderLogsList();
    renderWeeklyChart();
  });

  // 4. Modal Settings panel triggers
  openSettingsBtn.addEventListener('click', () => {
    triggerHaptic('light');
    // Sync settings parameters with current state
    goalInput.value = AppState.dailyGoal;
    soundCheckbox.checked = AppState.soundEnabled;
    hapticCheckbox.checked = AppState.hapticEnabled;
    
    // Toggle active segment classes
    unitSegments.forEach(seg => {
      seg.classList.toggle('active', seg.getAttribute('data-unit') === AppState.unit);
    });

    // Theme cards active states sync
    themeCards.forEach(card => {
      card.classList.toggle('active', card.getAttribute('data-theme-val') === AppState.theme);
    });

    settingsModalOverlay.classList.add('active');
    settingsModal.classList.add('active');
  });

  const closeSettingsModal = () => {
    settingsModalOverlay.classList.remove('active');
    settingsModal.classList.remove('active');
  };

  closeSettingsBtn.addEventListener('click', closeSettingsModal);
  settingsModalOverlay.addEventListener('click', closeSettingsModal);

  // Settings Unit Conversion Toggle Segmented
  unitSegments.forEach(seg => {
    seg.addEventListener('click', () => {
      triggerHaptic('light');
      const targetUnit = seg.getAttribute('data-unit');
      if (targetUnit !== AppState.unit) {
        AppState.convertUnits(targetUnit);
        
        // Sync UI inputs
        goalInput.value = AppState.dailyGoal;
        
        unitSegments.forEach(s => s.classList.remove('active'));
        seg.classList.add('active');
        
        refreshVisuals();
      }
    });
  });

  // Settings Goal Spinner Buttons (+ & -)
  goalMinus.addEventListener('click', () => {
    triggerHaptic('light');
    const step = AppState.unit === 'oz' ? 8 : 250;
    const currentGoal = parseFloat(goalInput.value) || 0;
    const targetVal = Math.max(step, currentGoal - step);
    goalInput.value = targetVal;
    AppState.dailyGoal = targetVal;
    AppState.save();
    refreshVisuals();
  });

  goalPlus.addEventListener('click', () => {
    triggerHaptic('light');
    const step = AppState.unit === 'oz' ? 8 : 250;
    const currentGoal = parseFloat(goalInput.value) || 0;
    const targetVal = currentGoal + step;
    goalInput.value = targetVal;
    AppState.dailyGoal = targetVal;
    AppState.save();
    refreshVisuals();
  });

  goalInput.addEventListener('change', () => {
    const val = parseFloat(goalInput.value);
    if (val > 0) {
      AppState.dailyGoal = val;
      AppState.save();
      refreshVisuals();
    }
  });

  // Feedback parameters checked
  soundCheckbox.addEventListener('change', () => {
    AppState.soundEnabled = soundCheckbox.checked;
    audio.enabled = AppState.soundEnabled;
    AppState.save();
  });

  hapticCheckbox.addEventListener('change', () => {
    AppState.hapticEnabled = hapticCheckbox.checked;
    AppState.save();
  });

  // Settings Dynamic Theme Switchers
  themeCards.forEach(card => {
    card.addEventListener('click', () => {
      const themeVal = card.getAttribute('data-theme-val');
      triggerHaptic('light');
      
      themeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      AppState.theme = themeVal;
      AppState.save();
      refreshVisuals();
    });
  });

  // Reset ALL records
  resetDataBtn.addEventListener('click', () => {
    const confirmed = confirm("Are you sure you want to completely erase all logging history? This cannot be undone.");
    if (confirmed) {
      triggerHaptic('medium');
      AppState.resetAll();
      closeSettingsModal();
      refreshVisuals();
    }
  });

  // ==========================================================================
  // First Render on Application Boot
  // ==========================================================================
  refreshVisuals();
});

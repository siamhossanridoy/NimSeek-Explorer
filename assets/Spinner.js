class NeoSpinner {
  constructor() {
    this.max = 100;
    this.history = [];
    this.totalSpins = 0;
    this.isSpinning = false;
    this.spinInterval = null;
    this.animationDuration = 1000;
    this.soundEnabled = true; // Changed to true by default
    this.vibrationEnabled = false;
    this.audioContext = null;
    this.HISTORY_EXPIRY_HOURS = 24;
    
    this.initElements();
    this.loadFromLocalStorage();
    this.attachEvents();
    this.cleanExpiredHistory();
    this.updateTotalSpins();
    this.renderHistory();
    
    // Initialize audio on first user interaction (browser policy)
    this.initAudioOnFirstClick();
    
    setInterval(() => this.cleanExpiredHistory(), 60 * 60 * 1000);
  }

  initElements() {
    this.displayEl = document.getElementById('numberDisplay');
    this.spinBtn = document.getElementById('spinBtn');
    this.maxInput = document.getElementById('maxVal');
    this.totalSpinsSpan = document.getElementById('totalSpinsSide');
    this.sidebarHistoryList = document.getElementById('sidebarHistoryList');
    this.clearHistoryBtn = document.getElementById('clearHistoryBtnSide');
    this.settingsBtn = document.getElementById('settingsBtnSide');
    this.settingsModal = document.getElementById('settingsModal');
    this.durationSlider = document.getElementById('durationSlider');
    this.durationValue = document.getElementById('durationValue');
    this.soundToggle = document.getElementById('soundToggle');
    this.vibrationToggle = document.getElementById('vibrationToggle');
  }

  initAudioOnFirstClick() {
    // Initialize audio context on first user interaction (required by browsers)
    const initAudio = () => {
      if (this.soundEnabled && !this.audioContext) {
        this.initAudio();
      }
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
    
    document.addEventListener('click', initAudio);
    document.addEventListener('touchstart', initAudio);
  }

  attachEvents() {
    this.spinBtn.addEventListener('click', () => this.startSpin());
    this.maxInput.addEventListener('change', () => this.validateRange());
    this.maxInput.addEventListener('input', () => this.validateRange());
    this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    this.settingsBtn.addEventListener('click', () => this.openModal());
    
    const closeModalBtn = document.querySelector('.modal-close');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => this.closeModal());
    }
    
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) this.closeModal();
    });
    
    this.durationSlider.addEventListener('input', (e) => {
      this.animationDuration = parseFloat(e.target.value) * 1000;
      this.durationValue.textContent = e.target.value + 's';
      this.saveToLocalStorage();
    });
    
    this.soundToggle.addEventListener('change', (e) => {
      this.soundEnabled = e.target.checked;
      this.saveToLocalStorage();
      if (this.soundEnabled) {
        this.initAudio();
        this.playTestSound();
      }
    });
    
    this.vibrationToggle.addEventListener('change', (e) => {
      this.vibrationEnabled = e.target.checked;
      this.saveToLocalStorage();
    });
    
    document.querySelectorAll('.preset-mini').forEach(btn => {
      btn.addEventListener('click', () => {
        const max = parseInt(btn.dataset.max);
        if (max && max >= 2 && max <= 1000) {
          this.maxInput.value = max;
          this.validateRange();
          this.startSpin();
        }
      });
    });
  }

  initAudio() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    } catch(e) {
      console.log('Web Audio API not supported');
      this.soundEnabled = false;
      if (this.soundToggle) this.soundToggle.checked = false;
    }
  }

  playTestSound() {
    // Play a short beep to test sound
    try {
      if (!this.audioContext) {
        this.initAudio();
      }
      
      if (this.audioContext && this.audioContext.state === 'running') {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, this.audioContext.currentTime + 0.15);
        oscillator.stop(this.audioContext.currentTime + 0.15);
      }
    } catch(e) {
      console.log('Test sound error:', e);
    }
  }

  validateRange() {
    let max = parseInt(this.maxInput.value);
    
    if (isNaN(max)) max = 100;
    if (max < 2) max = 2;
    if (max > 1000) max = 1000;
    
    this.max = max;
    this.maxInput.value = max;
    this.saveToLocalStorage();
  }

  getRandomInt(min, max) {
    const range = max - min + 1;
    const randomBytes = new Uint32Array(1);
    crypto.getRandomValues(randomBytes);
    const randomNumber = randomBytes[0] / (0xffffffff + 1);
    return min + Math.floor(randomNumber * range);
  }

  startSpin() {
    if (this.isSpinning) {
      this.stopSpin();
      return;
    }
    
    this.validateRange();
    this.isSpinning = true;
    this.spinBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg><span>STOP</span>';
    this.displayEl.classList.add('spinning');
    
    if (this.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    if (this.soundEnabled) {
      this.playSpinSound();
    }
    
    const startTime = Date.now();
    const intervalMs = 40;
    
    this.spinInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= this.animationDuration) {
        this.stopSpin();
      } else {
        this.displayEl.textContent = this.getRandomInt(1, this.max);
      }
    }, intervalMs);
  }

  stopSpin() {
    if (this.spinInterval) {
      clearInterval(this.spinInterval);
      this.spinInterval = null;
    }
    
    const finalValue = this.getRandomInt(1, this.max);
    this.displayEl.textContent = finalValue;
    this.isSpinning = false;
    this.spinBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg><span>SPIN</span>';
    this.displayEl.classList.remove('spinning');
    
    this.addToHistory(finalValue);
    this.updateTotalSpins();
    
    if (this.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
    if (this.soundEnabled) {
      this.playResultSound();
    }
  }

  playSpinSound() {
    try {
      if (!this.audioContext) {
        this.initAudio();
      }
      
      if (!this.audioContext || this.audioContext.state !== 'running') return;
      
      const now = this.audioContext.currentTime;
      
      // Quick tick sound for spin start
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.15;
      
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.00001, now + 0.1);
      oscillator.stop(now + 0.1);
      
      // Add a second tick for better feedback
      const oscillator2 = this.audioContext.createOscillator();
      const gainNode2 = this.audioContext.createGain();
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(this.audioContext.destination);
      
      oscillator2.frequency.value = 660;
      gainNode2.gain.value = 0.1;
      
      oscillator2.start(now + 0.05);
      gainNode2.gain.exponentialRampToValueAtTime(0.00001, now + 0.15);
      oscillator2.stop(now + 0.15);
      
    } catch(e) {
      console.log('Spin sound error:', e);
    }
  }

  playResultSound() {
    try {
      if (!this.audioContext) {
        this.initAudio();
      }
      
      if (!this.audioContext || this.audioContext.state !== 'running') return;
      
      const now = this.audioContext.currentTime;
      
      // Victory fanfare sound
      const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      
      frequencies.forEach((freq, index) => {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = freq;
        gainNode.gain.value = 0.12;
        
        oscillator.start(now + (index * 0.08));
        gainNode.gain.exponentialRampToValueAtTime(0.00001, now + 0.2 + (index * 0.08));
        oscillator.stop(now + 0.2 + (index * 0.08));
      });
      
      // Bass thump for impact
      const bassOsc = this.audioContext.createOscillator();
      const bassGain = this.audioContext.createGain();
      
      bassOsc.connect(bassGain);
      bassGain.connect(this.audioContext.destination);
      
      bassOsc.frequency.value = 110;
      bassGain.gain.value = 0.2;
      
      bassOsc.start();
      bassGain.gain.exponentialRampToValueAtTime(0.00001, now + 0.15);
      bassOsc.stop(now + 0.15);
      
    } catch(e) {
      console.log('Result sound error:', e);
    }
  }

  addToHistory(value) {
    const timestamp = new Date();
    const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = timestamp.toLocaleDateString();
    
    this.history.unshift({
      value: value,
      time: timeStr,
      date: dateStr,
      timestamp: timestamp.getTime()
    });
    
    if (this.history.length > 50) this.history.pop();
    
    this.cleanExpiredHistory();
    
    this.totalSpins = this.history.length;
    this.renderHistory();
    this.saveToLocalStorage();
  }

  cleanExpiredHistory() {
    const now = Date.now();
    const expiryMs = this.HISTORY_EXPIRY_HOURS * 60 * 60 * 1000;
    const originalLength = this.history.length;
    
    this.history = this.history.filter(item => {
      return (now - item.timestamp) < expiryMs;
    });
    
    if (originalLength !== this.history.length) {
      this.totalSpins = this.history.length;
      this.renderHistory();
      this.updateTotalSpins();
      this.saveToLocalStorage();
    }
  }

  renderHistory() {
    if (!this.sidebarHistoryList) return;
    
    if (this.history.length === 0) {
      this.sidebarHistoryList.innerHTML = `
        <div class="empty-history-mini">
          <div class="empty-icon">🎲</div>
          <p>No spins yet</p>
        </div>
      `;
      return;
    }
    
    this.sidebarHistoryList.innerHTML = this.history.map(item => `
      <div class="history-item-sidebar">
        <span class="history-number-sidebar">${item.value}</span>
        <span class="history-time-sidebar">
          <span>${item.time}</span>
          <span style="font-size: 0.55rem; opacity: 0.7;">${item.date}</span>
        </span>
      </div>
    `).join('');
  }

  clearHistory() {
    this.history = [];
    this.totalSpins = 0;
    this.renderHistory();
    this.updateTotalSpins();
    this.saveToLocalStorage();
    
    if (this.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate(100);
    }
  }

  updateTotalSpins() {
    if (this.totalSpinsSpan) {
      this.totalSpinsSpan.textContent = this.totalSpins;
    }
  }

  saveToLocalStorage() {
    const data = {
      max: this.max,
      history: this.history,
      totalSpins: this.totalSpins,
      settings: {
        animationDuration: this.animationDuration,
        soundEnabled: this.soundEnabled,
        vibrationEnabled: this.vibrationEnabled
      }
    };
    localStorage.setItem('neospinnerData', JSON.stringify(data));
  }

  loadFromLocalStorage() {
    const savedData = localStorage.getItem('neospinnerData');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        this.max = data.max || 100;
        if (this.max > 1000) this.max = 1000;
        if (this.max < 2) this.max = 2;
        
        this.history = data.history || [];
        this.totalSpins = data.totalSpins || 0;
        
        if (this.maxInput) this.maxInput.value = this.max;
        
        if (data.settings) {
          this.animationDuration = data.settings.animationDuration || 1000;
          // Load sound preference, default to true if not set
          this.soundEnabled = data.settings.soundEnabled !== undefined ? data.settings.soundEnabled : true;
          this.vibrationEnabled = data.settings.vibrationEnabled || false;
          
          if (this.durationSlider) {
            this.durationSlider.value = this.animationDuration / 1000;
            this.durationValue.textContent = (this.animationDuration / 1000) + 's';
          }
          if (this.soundToggle) this.soundToggle.checked = this.soundEnabled;
          if (this.vibrationToggle) this.vibrationToggle.checked = this.vibrationEnabled;
        }
      } catch(e) {
        console.error('Error loading saved data:', e);
      }
    }
    
    if (this.displayEl) {
      this.displayEl.textContent = this.getRandomInt(1, this.max);
    }
  }

  openModal() {
    if (this.settingsModal) {
      this.settingsModal.classList.add('active');
    }
  }

  closeModal() {
    if (this.settingsModal) {
      this.settingsModal.classList.remove('active');
    }
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  new NeoSpinner();
});
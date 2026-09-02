class FocusTimer {
    constructor() {
        // Core state
        this.timeLeft = 25 * 60;
        this.isRunning = false;
        this.currentMode = 'pomodoro';
        this.timer = null;
        this.lastTick = Date.now();
        this.audioContext = null;
        this.backgroundInterval = null;
        this.serviceWorker = null;
        
        // Settings
        this.settings = {
            focusTime: 25,
            shortBreakTime: 5,
            longBreakTime: 15,
            dailyGoal: 8,
            notifications: true,
            soundEnabled: true,
            volume: 70,
            backgroundTimer: true,
            autoStartBreaks: false
        };
        
        // Statistics
        this.stats = {
            todayCount: 0,
            streak: 0,
            totalFocusMinutes: 0,
            lastSessionDate: null,
            lastSessionCompleted: false
        };
        
        // Mode times
        this.modes = {
            pomodoro: this.settings.focusTime * 60,
            shortBreak: this.settings.shortBreakTime * 60,
            longBreak: this.settings.longBreakTime * 60
        };
        
        this.init();
    }

    async init() {
        await this.loadFromStorage();
        await this.registerServiceWorker();
        this.setupEventListeners();
        this.updateDisplay();
        this.updateStats();
        this.updateProgressDots();
        this.updateDateTime();
        this.checkAndResetDailyStats();
        this.restoreButtonState();
        
        // Start timer with requestAnimationFrame
        this.startTimerLoop();
        
        // Update date/time every second
        setInterval(() => this.updateDateTime(), 1000);
        
        // Save state before page close
        window.addEventListener('beforeunload', () => this.saveToStorage());
        
        // Handle visibility change
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
        
        // Initialize audio
        this.initAudio();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('sw.js');
                this.serviceWorker = registration;
                console.log('Service Worker registered');
            } catch (error) {
                console.log('Service Worker registration failed');
            }
        }
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }

    setupEventListeners() {
        // Main control button
        document.getElementById('mainControlBtn').addEventListener('click', () => {
            this.isRunning ? this.pause() : this.start();
        });

        // Quick actions
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('skipBtn').addEventListener('click', () => this.skip());

        // Mode badge
        document.getElementById('modeBadge').addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePopup('modePopup');
        });

        // Time edit
        document.getElementById('timeEdit').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openTimePicker();
        });

        // Mode options
        document.querySelectorAll('.popup-option[data-mode]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.switchMode(mode);
                this.closePopup('modePopup');
            });
        });

        // Time picker
        document.getElementById('timePickerSlider').addEventListener('input', (e) => {
            document.getElementById('timePickerMinutes').textContent = e.target.value;
            document.querySelectorAll('.preset-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.time === e.target.value);
            });
        });

        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const time = e.target.dataset.time;
                document.getElementById('timePickerSlider').value = time;
                document.getElementById('timePickerMinutes').textContent = time;
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        document.getElementById('applyTimeEdit').addEventListener('click', () => {
            const newTime = parseInt(document.getElementById('timePickerSlider').value);
            this.updateCurrentModeTime(newTime);
            this.closePopup('timeEditPopup');
        });

        document.getElementById('cancelTimeEdit').addEventListener('click', () => {
            this.closePopup('timeEditPopup');
        });

        document.getElementById('closeTimePicker').addEventListener('click', () => {
            this.closePopup('timeEditPopup');
        });

        // Settings button
        document.getElementById('settingsBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePopup('settingsPopup');
            this.updateSettingsPopup();
        });

        // Goal slider
        document.getElementById('goalSlider').addEventListener('input', (e) => {
            const value = e.target.value;
            document.getElementById('goalValue').textContent = value;
            this.settings.dailyGoal = parseInt(value);
            this.updateProgressDots();
            this.saveToStorage();
        });

        // Volume slider
        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            const value = e.target.value;
            document.getElementById('volumeValue').textContent = value + '%';
            this.settings.volume = parseInt(value);
            this.saveToStorage();
        });

        // Toggles
        document.getElementById('notificationsToggle').addEventListener('change', (e) => {
            this.settings.notifications = e.target.checked;
            if (e.target.checked) this.requestNotificationPermission();
            this.saveToStorage();
        });

        document.getElementById('soundToggle').addEventListener('change', (e) => {
            this.settings.soundEnabled = e.target.checked;
            this.saveToStorage();
        });

        document.getElementById('backgroundToggle').addEventListener('change', (e) => {
            this.settings.backgroundTimer = e.target.checked;
            if (!e.target.checked) {
                this.stopBackgroundTimer();
            } else {
                this.startBackgroundTimer();
            }
            this.saveToStorage();
        });

        document.getElementById('autoStartToggle').addEventListener('change', (e) => {
            this.settings.autoStartBreaks = e.target.checked;
            this.saveToStorage();
        });

        // Click outside to close popups
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.popup') && 
                !e.target.closest('#modeBadge') && 
                !e.target.closest('#timeEdit') &&
                !e.target.closest('#settingsBtn')) {
                this.closeAllPopups();
            }
        });

        // Stats click
        document.getElementById('todayStat').addEventListener('click', () => {
            const goalProgress = Math.round((this.stats.todayCount / this.settings.dailyGoal) * 100);
            this.showToast(`Today: ${this.stats.todayCount}/${this.settings.dailyGoal} sessions (${goalProgress}%)`);
        });

        document.getElementById('streakStat').addEventListener('click', () => {
            this.showToast(`Current streak: ${this.stats.streak} day${this.stats.streak !== 1 ? 's' : ''}`);
        });

        document.getElementById('totalStat').addEventListener('click', () => {
            const hours = Math.floor(this.stats.totalFocusMinutes / 60);
            const mins = this.stats.totalFocusMinutes % 60;
            this.showToast(`Total focus time: ${hours}h ${mins}m`);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.closest('input')) {
                e.preventDefault();
                this.isRunning ? this.pause() : this.start();
            } else if (e.code === 'KeyR') {
                this.reset();
            } else if (e.code === 'KeyS') {
                this.skip();
            } else if (e.code === 'KeyM') {
                this.togglePopup('modePopup');
            } else if (e.code === 'KeyT') {
                this.openTimePicker();
            } else if (e.code === 'Escape') {
                this.closeAllPopups();
            }
        });
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // Tab is hidden
            if (this.isRunning && this.settings.backgroundTimer) {
                this.startBackgroundTimer();
            }
        } else {
            // Tab is visible again
            this.stopBackgroundTimer();
            this.syncWithBackground();
        }
    }

    startBackgroundTimer() {
        if (this.backgroundInterval) return;
        
        this.backgroundInterval = setInterval(() => {
            if (this.isRunning) {
                const now = Date.now();
                const delta = Math.floor((now - this.lastTick) / 1000);
                
                if (delta >= 1) {
                    this.timeLeft = Math.max(0, this.timeLeft - delta);
                    this.lastTick = now;
                    
                    if (this.timeLeft <= 0) {
                        this.completeTimer();
                        this.stopBackgroundTimer();
                    }
                    
                    // Send update to service worker
                    this.updateServiceWorker();
                }
            }
        }, 1000);
    }

    stopBackgroundTimer() {
        if (this.backgroundInterval) {
            clearInterval(this.backgroundInterval);
            this.backgroundInterval = null;
        }
    }

    async updateServiceWorker() {
        if (this.serviceWorker && this.serviceWorker.active) {
            this.serviceWorker.active.postMessage({
                type: 'TIMER_UPDATE',
                timeLeft: this.timeLeft,
                isRunning: this.isRunning,
                currentMode: this.currentMode
            });
        }
    }

    syncWithBackground() {
        // When tab becomes visible, sync with latest state
        this.updateDisplay();
        this.updateStats();
    }

    startTimerLoop() {
        const loop = () => {
            if (this.isRunning && !document.hidden) {
                const now = Date.now();
                const delta = Math.floor((now - this.lastTick) / 1000);
                
                if (delta >= 1) {
                    this.timeLeft = Math.max(0, this.timeLeft - delta);
                    this.lastTick = now;
                    this.updateDisplay();
                    
                    // Update title
                    const minutes = Math.floor(this.timeLeft / 60);
                    const seconds = this.timeLeft % 60;
                    document.title = `(${minutes}:${seconds.toString().padStart(2, '0')}) focus`;
                    
                    if (this.timeLeft <= 0) {
                        this.completeTimer();
                    }
                }
            }
            requestAnimationFrame(loop);
        };
        
        requestAnimationFrame(loop);
    }

    start() {
        if (!this.isRunning && this.timeLeft > 0) {
            this.isRunning = true;
            this.lastTick = Date.now();
            
            // Start background timer if tab is hidden
            if (document.hidden && this.settings.backgroundTimer) {
                this.startBackgroundTimer();
            }
            
            this.saveToStorage();
            this.updateButtonState();
            this.updateServiceWorker();
        }
    }

    pause() {
        this.isRunning = false;
        this.stopBackgroundTimer();
        this.saveToStorage();
        this.updateButtonState();
        this.updateServiceWorker();
    }

    reset() {
        this.pause();
        this.timeLeft = this.modes[this.currentMode];
        this.updateDisplay();
        this.showToast('Timer reset');
        this.saveToStorage();
        this.updateServiceWorker();
    }

    skip() {
        this.pause();
        this.playSound('skip');
        this.timeLeft = 0;
        this.completeTimer();
    }

    switchMode(mode) {
        this.currentMode = mode;
        this.timeLeft = this.modes[mode];
        
        // Update UI
        const modeText = {
            pomodoro: 'focus',
            shortBreak: 'short break',
            longBreak: 'long break'
        };
        document.getElementById('modeText').textContent = modeText[mode];
        
        // Update display minutes
        const minutes = Math.floor(this.timeLeft / 60);
        document.getElementById('displayMinutes').textContent = minutes;
        
        // Update active state in popup
        document.querySelectorAll('.popup-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.mode === mode);
        });
        
        this.updateDisplay();
        this.pause();
        this.saveToStorage();
        this.updateServiceWorker();
    }

    updateCurrentModeTime(minutes) {
        const seconds = minutes * 60;
        
        if (this.currentMode === 'pomodoro') {
            this.settings.focusTime = minutes;
            this.modes.pomodoro = seconds;
            document.getElementById('popupFocusTime').textContent = minutes + 'm';
        } else if (this.currentMode === 'shortBreak') {
            this.settings.shortBreakTime = minutes;
            this.modes.shortBreak = seconds;
            document.getElementById('popupShortBreakTime').textContent = minutes + 'm';
        } else if (this.currentMode === 'longBreak') {
            this.settings.longBreakTime = minutes;
            this.modes.longBreak = seconds;
            document.getElementById('popupLongBreakTime').textContent = minutes + 'm';
        }
        
        this.timeLeft = seconds;
        document.getElementById('displayMinutes').textContent = minutes;
        this.updateDisplay();
        
        this.saveToStorage();
        this.updateServiceWorker();
        this.showToast(`${minutes} min ${this.currentMode === 'pomodoro' ? 'focus' : 'break'} time set`);
    }

    completeTimer() {
        this.pause();
        this.playSound('complete');
        
        // Send notification even if tab is hidden
        if (this.currentMode === 'pomodoro') {
            this.completePomodoro();
        } else {
            this.completeBreak();
        }

        this.saveToStorage();
        this.updateStats();
        this.updateProgressDots();
        this.updateServiceWorker();
    }

    completePomodoro() {
        this.stats.todayCount++;
        this.stats.totalFocusMinutes += this.settings.focusTime;
        this.updateStreak();
        
        // Always show notification, even in background
        this.showNotification('Focus Complete!', 'Time for a break');
        
        if (this.stats.todayCount === this.settings.dailyGoal) {
            this.showNotification('Daily Goal Achieved!', 'Great job!');
            this.playSound('achievement');
        }
        
        if (this.settings.autoStartBreaks) {
            setTimeout(() => {
                this.switchMode('shortBreak');
                this.start();
            }, 1000);
        } else {
            this.switchMode('shortBreak');
        }
    }

    completeBreak() {
        this.showNotification('Break Finished!', 'Ready to focus?');
        
        if (this.settings.autoStartBreaks) {
            setTimeout(() => {
                this.switchMode('pomodoro');
                this.start();
            }, 1000);
        } else {
            this.switchMode('pomodoro');
        }
    }

    updateButtonState() {
        const playIcon = document.querySelector('.play-icon');
        const pauseIcon = document.querySelector('.pause-icon');
        
        if (this.isRunning) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    }

    restoreButtonState() {
        this.updateButtonState();
    }

    updateDateTime() {
        const now = new Date();
        
        let hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12;
        hours = hours ? hours : 12;
        
        document.getElementById('currentTime').textContent = `${hours}:${minutes} ${ampm}`;
        
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        
        document.getElementById('minutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('seconds').textContent = seconds.toString().padStart(2, '0');
        document.getElementById('displayMinutes').textContent = minutes;
    }

    updateStats() {
        document.getElementById('todayCount').textContent = this.stats.todayCount;
        document.getElementById('streakCount').textContent = this.stats.streak;
        
        const totalHours = Math.floor(this.stats.totalFocusMinutes / 60);
        document.getElementById('totalHours').textContent = totalHours;
        
        this.updateProgressDots();
    }

    updateProgressDots() {
        const dotsContainer = document.getElementById('progressDots');
        dotsContainer.innerHTML = '';
        
        for (let i = 0; i < this.settings.dailyGoal; i++) {
            const dot = document.createElement('span');
            dot.className = 'dot';
            if (i < this.stats.todayCount) {
                dot.classList.add('completed');
            }
            dotsContainer.appendChild(dot);
        }
        
        document.getElementById('progressLabel').textContent = `${this.stats.todayCount}/${this.settings.dailyGoal} sessions`;
    }

    updateStreak() {
        const today = new Date().toDateString();
        
        if (this.stats.lastSessionDate) {
            const lastDate = new Date(this.stats.lastSessionDate);
            const currentDate = new Date(today);
            
            lastDate.setHours(0, 0, 0, 0);
            currentDate.setHours(0, 0, 0, 0);
            
            const diffDays = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                this.stats.streak++;
            } else if (diffDays === 0) {
                // Same day
            } else {
                this.stats.streak = 1;
            }
        } else {
            this.stats.streak = 1;
        }
        
        this.stats.lastSessionDate = today;
    }

    checkAndResetDailyStats() {
        const today = new Date().toDateString();
        
        if (this.stats.lastSessionDate && this.stats.lastSessionDate !== today) {
            const lastDate = new Date(this.stats.lastSessionDate);
            const currentDate = new Date(today);
            
            if ((currentDate - lastDate) / (1000 * 60 * 60 * 24) >= 1) {
                this.stats.todayCount = 0;
            }
        }
    }

    playSound(type) {
        if (!this.settings.soundEnabled || !this.audioContext) return;
        
        const sounds = {
            complete: { freq: 800, duration: 0.3 },
            skip: { freq: 600, duration: 0.2 },
            achievement: { freq: [600, 800, 1000], duration: 0.5 }
        };
        
        const sound = sounds[type] || sounds.complete;
        const volume = this.settings.volume / 100;
        
        try {
            if (Array.isArray(sound.freq)) {
                sound.freq.forEach((freq, index) => {
                    setTimeout(() => {
                        this.playTone(freq, sound.duration / sound.freq.length, volume);
                    }, index * 150);
                });
            } else {
                this.playTone(sound.freq, sound.duration, volume);
            }
        } catch (e) {
            console.log('Sound play failed');
        }
    }

    playTone(freq, duration, volume) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = freq;
        gainNode.gain.value = volume * 0.1;
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    openTimePicker() {
        const currentMinutes = Math.floor(this.timeLeft / 60);
        document.getElementById('timePickerSlider').value = currentMinutes;
        document.getElementById('timePickerMinutes').textContent = currentMinutes;
        
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.time) === currentMinutes);
        });
        
        this.togglePopup('timeEditPopup');
    }

    updateSettingsPopup() {
        document.getElementById('goalSlider').value = this.settings.dailyGoal;
        document.getElementById('goalValue').textContent = this.settings.dailyGoal;
        document.getElementById('volumeSlider').value = this.settings.volume;
        document.getElementById('volumeValue').textContent = this.settings.volume + '%';
        document.getElementById('notificationsToggle').checked = this.settings.notifications;
        document.getElementById('soundToggle').checked = this.settings.soundEnabled;
        document.getElementById('backgroundToggle').checked = this.settings.backgroundTimer;
        document.getElementById('autoStartToggle').checked = this.settings.autoStartBreaks;
    }

    togglePopup(popupId) {
        const popup = document.getElementById(popupId);
        this.closeAllPopups();
        popup.classList.toggle('active');
    }

    closePopup(popupId) {
        document.getElementById(popupId).classList.remove('active');
    }

    closeAllPopups() {
        document.querySelectorAll('.popup').forEach(p => p.classList.remove('active'));
    }

    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    showNotification(title, body) {
        // Show toast
        this.showToast(`✨ ${title}`);
        
        // Show desktop notification if enabled and tab is hidden
        if (this.settings.notifications) {
            if (document.hidden && Notification.permission === 'granted') {
                new Notification(title, { body });
            } else if (Notification.permission === 'default') {
                this.requestNotificationPermission();
            }
        }
    }

    async requestNotificationPermission() {
        if ('Notification' in window && Notification.permission !== 'granted') {
            await Notification.requestPermission();
        }
    }

    saveToStorage() {
        const data = {
            timeLeft: this.timeLeft,
            currentMode: this.currentMode,
            isRunning: this.isRunning,
            lastTick: this.lastTick,
            settings: this.settings,
            stats: this.stats
        };
        
        try {
            chrome.storage.local.set({ focusData: data });
            localStorage.setItem('focusData', JSON.stringify(data));
        } catch (e) {
            console.log('Storage save failed');
        }
    }

    async loadFromStorage() {
        return new Promise((resolve) => {
            try {
                chrome.storage.local.get(['focusData'], (result) => {
                    if (result.focusData) {
                        this.loadData(result.focusData);
                    } else {
                        const backup = localStorage.getItem('focusData');
                        if (backup) {
                            this.loadData(JSON.parse(backup));
                        }
                    }
                    
                    const modeText = {
                        pomodoro: 'focus',
                        shortBreak: 'short break',
                        longBreak: 'long break'
                    };
                    document.getElementById('modeText').textContent = modeText[this.currentMode];
                    document.getElementById('displayMinutes').textContent = Math.floor(this.timeLeft / 60);
                    
                    this.updateDisplay();
                    this.updateStats();
                    this.updateProgressDots();
                    resolve();
                });
            } catch (e) {
                console.log('Storage load failed');
                resolve();
            }
        });
    }

    loadData(data) {
        this.timeLeft = data.timeLeft || 25 * 60;
        this.currentMode = data.currentMode || 'pomodoro';
        this.isRunning = data.isRunning || false;
        this.lastTick = data.lastTick || Date.now();
        this.settings = data.settings || this.settings;
        this.stats = data.stats || this.stats;
        
        if (!this.stats.totalFocusMinutes) this.stats.totalFocusMinutes = 0;
        if (!this.stats.streak) this.stats.streak = 0;
        if (!this.stats.todayCount) this.stats.todayCount = 0;
        
        this.modes = {
            pomodoro: this.settings.focusTime * 60,
            shortBreak: this.settings.shortBreakTime * 60,
            longBreak: this.settings.longBreakTime * 60
        };
        
        // Calculate time passed while away
        if (this.isRunning) {
            const now = Date.now();
            const delta = Math.floor((now - this.lastTick) / 1000);
            if (delta > 0) {
                this.timeLeft = Math.max(0, this.timeLeft - delta);
                this.lastTick = now;
                
                if (this.timeLeft <= 0) {
                    this.completeTimer();
                }
            }
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.focusTimer = new FocusTimer();
});
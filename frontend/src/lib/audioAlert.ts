class AudioAlertEngine {
  private audioCtx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private stopTimeout: any = null;
  private intervalId: any = null;
  private lastTriggerTime: number = 0;

  private initCtx() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  private speakAlertText(text: string) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel(); // Clear queued speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95; // Clear natural pacing
        utterance.pitch = 1.05;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error('Speech synthesis error:', e);
      }
    }
  }

  private soundEnabled: boolean = true;

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (!enabled && this.isPlaying) {
      this.stopAlarm();
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public triggerAlarm(
    serverName: string = 'Server',
    cpuPercent: number = 60,
    durationSeconds: number = 10,
    cooldownSeconds: number = 20
  ) {
    const now = Date.now();
    if (this.isPlaying) return;
    if (now - this.lastTriggerTime < cooldownSeconds * 1000) return;
    if (!this.soundEnabled) return; // Silent mode active

    this.initCtx();
    this.isPlaying = true;
    this.lastTriggerTime = now;

    const roundedCpu = Math.round(cpuPercent);
    const alertMessage = `Critical Alert! Server ${serverName} CPU utilization has reached ${roundedCpu} percent! Immediate attention required.`;

    // 1. Speak English voice alert immediately with full detailed status
    this.speakAlertText(alertMessage);

    // 2. Play continuous siren beeps (tuned volume so voice is clearly audible)
    let toggle = false;
    const playSirenBeep = () => {
      if (!this.audioCtx || !this.isPlaying) return;
      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sawtooth'; // Alarming waveform
        osc.frequency.value = toggle ? 880 : 660; // Siren pitch oscillation
        toggle = !toggle;

        gain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.3);
      } catch (e) {
        console.error('Audio play error:', e);
      }
    };

    if (this.audioCtx) {
      playSirenBeep();
      this.intervalId = setInterval(playSirenBeep, 450);
    }

    // 3. Auto-stop continuously after exactly 10 seconds
    this.stopTimeout = setTimeout(() => {
      this.stopAlarm();
    }, durationSeconds * 1000);
  }

  public stopAlarm() {
    this.isPlaying = false;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }
  }

  public isAlarmActive() {
    return this.isPlaying;
  }
}

export const audioAlert = new AudioAlertEngine();

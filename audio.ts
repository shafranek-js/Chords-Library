declare var Soundfont: any;

interface Player {
  play: (note: string, time: number, options: { duration: number, gain?: number }) => ActivePlayer;
}

interface ActivePlayer {
    stop: (time?: number) => void;
}

class AudioEngine {
  private context: AudioContext | null = null;
  private player: Player | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private activePlayers: ActivePlayer[] = [];

  getContext() {
    return this.context;
  }

  async init(setLoading: (isLoading: boolean) => void) {
    if (this.isInitialized || this.isInitializing) return;
    this.isInitializing = true;
    setLoading(true);

    try {
      if (!this.context) {
        this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      this.player = await Soundfont.instrument(this.context, 'acoustic_guitar_nylon', { soundfont: 'MusyngKite' });
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize audio:", error);
    } finally {
      this.isInitializing = false;
      setLoading(false);
    }
  }

  playStrum(notes: string[], direction: 'down' | 'up', duration: number, accent: boolean, time: number) {
    if (!this.isInitialized || !this.context || !this.player) return;
    
    const gain = accent ? 1.0 : 0.7;
    const strumNotes = direction === 'down' ? notes : [...notes].reverse();
    const delay = 0.01;

    strumNotes.forEach((note, index) => {
      if (this.player) {
        const activePlayer = this.player.play(note, time + index * delay, { duration: duration, gain });
        this.activePlayers.push(activePlayer);
      }
    });
  }

  playNotes(notes: {note: string; accent: boolean; duration: number;}[], time: number) {
      if (!this.isInitialized || !this.context || !this.player) return;
      notes.forEach(({note, accent, duration}) => {
          if (this.player) {
              const gain = accent ? 1.2 : 0.8;
              const activePlayer = this.player.play(note, time, { duration: duration, gain });
              this.activePlayers.push(activePlayer);
          }
      });
  }
  
  playMute(duration: number, time: number) {
      if (!this.isInitialized || !this.context || !this.player) return;

      if(this.player) {
        const activePlayer = this.player.play('C2', time, { duration: duration * 0.5, gain: 0.15 });
        this.activePlayers.push(activePlayer);
      }
  }
  
  stop() {
    if (this.context) {
        this.activePlayers.forEach(p => p.stop(this.context!.currentTime));
    }
      this.activePlayers = [];
  }

  isReady() {
      return this.isInitialized;
  }
}

export const audio = new AudioEngine();
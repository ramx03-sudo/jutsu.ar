/* ── AUDIO FILES (Web Audio API for iOS Compatibility) ── */

let _audioCtx = null;

/** Lazily creates the shared AudioContext on first user interaction. */
function getCtx() {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _audioCtx;
}

// Named export kept for callers that import audioCtx directly.
// Will be null until first play() call — use getCtx() internally.
export { _audioCtx as audioCtx };

export class SFXPlayer {
  constructor(url) {
    this.buffer = null;
    this.source = null;
    this.gainNode = null;   // created lazily on first play
    this.isPlaying = false;
    this._playRequested = false;
    this.logicalVolume = 0;
    this._rawBuffer = null; // stores fetched bytes before AudioContext is ready
    this._decoding = false;

    // Fetch eagerly (no AudioContext needed for fetch/XHR)
    fetch(url)
      .then(res => res.arrayBuffer())
      .then(ab => {
        if (_audioCtx) {
          // AudioContext already exists — decode immediately
          _audioCtx.decodeAudioData(ab, buf => { 
            this.buffer = buf; 
            if (this._playRequested) this._startPlayback();
          });
        } else {
          // Store raw bytes; decode on first play()
          this._rawBuffer = ab;
          if (this._playRequested) this._decodeAndPlay();
        }
      })
      .catch(e => console.warn('Audio load error:', e));
  }

  /** Ensures gain node exists (creates AudioContext if needed). */
  _ensureGain() {
    if (!this.gainNode) {
      const ctx = getCtx();
      this.gainNode = ctx.createGain();
      this.gainNode.connect(ctx.destination);
      this.gainNode.gain.value = 0;
    }
  }

  /** Decodes raw buffer if AudioContext is now available. Calls cb when done. */
  _decodeAndPlay() {
    if (!this._rawBuffer || this._decoding) return;
    this._decoding = true;
    const ctx = getCtx();
    ctx.decodeAudioData(this._rawBuffer, buf => {
      this.buffer = buf;
      this._rawBuffer = null;
      this._decoding = false;
      if (this._playRequested) this._startPlayback();
    }, e => {
      console.warn('decodeAudioData error:', e);
      this._decoding = false;
    });
  }

  _startPlayback() {
    if (this.isPlaying || !this.buffer || !this._playRequested) return;
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    this.source = ctx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.loop = true;
    this.source.connect(this.gainNode);
    this.source.start(0);
    this.isPlaying = true;
  }

  play() {
    this._playRequested = true;
    if (this.isPlaying) return;
    this._ensureGain();
    if (this.buffer) {
      this._startPlayback();
    } else if (this._rawBuffer) {
      this._decodeAndPlay();
    }
  }

  setVolume(vol) {
    this.logicalVolume = vol;
    if (this.gainNode) {
      const ctx = getCtx();
      // Faster time constant (0.02s) for snappier jutsu response
      this.gainNode.gain.setTargetAtTime(vol, ctx.currentTime, 0.02);
    }
  }

  pause() {
    this._playRequested = false;
    if (this.source && this.isPlaying) {
      try { this.source.stop(); } catch (e) {}
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
    this.logicalVolume = 0;
    if (this.gainNode) {
      const ctx = getCtx();
      this.gainNode.gain.cancelScheduledValues(ctx.currentTime);
      this.gainNode.gain.setValueAtTime(0, ctx.currentTime);
    }
  }
}

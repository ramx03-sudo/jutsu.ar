/* ── AUDIO FILES (Web Audio API for iOS Compatibility) ── */
export const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export class SFXPlayer {
  constructor(url) {
    this.buffer = null;
    this.source = null;
    this.gainNode = audioCtx.createGain();
    this.gainNode.connect(audioCtx.destination);
    this.gainNode.gain.value = 0;
    this.isPlaying = false;
    this.logicalVolume = 0;
    
    fetch(url)
      .then(res => res.arrayBuffer())
      .then(data => audioCtx.decodeAudioData(data))
      .then(buffer => { this.buffer = buffer; })
      .catch(e => console.warn("Audio load error:", e));
  }
  
  play() {
    if (this.isPlaying || !this.buffer) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    this.source = audioCtx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.loop = true;
    this.source.connect(this.gainNode);
    this.source.start(0);
    this.isPlaying = true;
  }
  
  setVolume(vol) {
    this.logicalVolume = vol;
    this.gainNode.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.05);
  }
  
  pause() {
    if (this.source && this.isPlaying) {
      try { this.source.stop(); } catch(e){}
      this.source.disconnect();
      this.source = null;
    }
    this.isPlaying = false;
    this.logicalVolume = 0;
  }
}

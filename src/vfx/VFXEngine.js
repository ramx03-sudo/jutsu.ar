import * as THREE from 'three';

export class VFXEngine {
  constructor(canvas) {
    console.log('[VFXEngine] Initializing on canvas:', canvas.width, canvas.height);
    
    this.scene = new THREE.Scene();
    
    // Orthographic camera: pixel coords, 0,0 = center
    const W = window.innerWidth;
    const H = window.innerHeight;
    this.camera = new THREE.OrthographicCamera(-W/2, W/2, H/2, -H/2, 1, 1000);
    this.camera.position.z = 100;
    
    // Create renderer — canvas already in DOM
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    this.renderer.setSize(W, H, false); // false = don't set CSS style
    this.renderer.setPixelRatio(1); // keep it simple
    this.renderer.setClearColor(0x000000, 0); // transparent bg
    
    this.activeEffects = [];
    this.frameCount = 0;
    this.lastError = null;
    this._lastTime = performance.now();
    
    console.log('[VFXEngine] Ready. Renderer:', this.renderer.info.render);

    // Test: add a visible magenta box to confirm rendering works
    this._testMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.8 })
    );
    this._testMesh.position.set(0, 0, 0);
    this.scene.add(this._testMesh);
    
    // Remove test box after 2 seconds
    setTimeout(() => {
      if (this._testMesh) {
        this.scene.remove(this._testMesh);
        this._testMesh = null;
        console.log('[VFXEngine] Test box removed.');
      }
    }, 2000);
  }

  _getDt() {
    const now = performance.now();
    const dt = Math.min((now - this._lastTime) / 1000, 0.1);
    this._lastTime = now;
    return dt;
  }

  resize(width, height) {
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  spawn(effect) {
    console.log('[VFXEngine] Spawning effect:', effect.constructor.name);
    this.activeEffects.push(effect);
    effect.init(this.scene);
  }

  update() {
    // Schedule next frame FIRST — so crashes never kill the loop
    const dt = this._getDt();
    this.frameCount++;
    
    if (this.frameCount % 60 === 0) {
      console.log('[VFXEngine] Frame:', this.frameCount, 'Effects:', this.activeEffects.length);
    }

    try {
      this.activeEffects = this.activeEffects.filter(e => {
        try {
          e.update(dt);
        } catch(err) {
          console.error('[VFXEngine] Effect update crashed:', err);
          this.lastError = 'Effect: ' + err.message;
          e.destroy(this.scene);
          return false;
        }
        if (e.done) {
          e.destroy(this.scene);
          return false;
        }
        return true;
      });

      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      this.lastError = err.message || err.toString();
      console.error('[VFXEngine] Render crashed:', err);
      // Don't re-throw — keep loop alive
    }
  }
  
  clear() {
    this.activeEffects.forEach(e => {
      try { e.destroy(this.scene); } catch(e) {}
    });
    this.activeEffects = [];
  }
}

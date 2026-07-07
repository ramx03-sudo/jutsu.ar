import * as THREE from 'three';
import { Effect } from '../Effect';
import { createPetalMaterial } from '../materials/PetalMaterial';

function createKatanaMesh(scaleMultiplier) {
  // A thin plane geometry for the katana. 
  // Height 1.4, Width 0.04 (relative units) scaled up for pixel coordinates
  const height = 1.4 * 400 * scaleMultiplier;
  const width = 0.04 * 400 * scaleMultiplier;
  
  const geom = new THREE.PlaneGeometry(width, height);
  // Basic material that we will color-lerp to pink
  const mat = new THREE.MeshBasicMaterial({ 
    color: new THREE.Color('#111111'),
    transparent: true,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.userData = { height, width };
  return mesh;
}

function createPetal(baseScaleMultiplier) {
  const geom = new THREE.PlaneGeometry(10 * baseScaleMultiplier, 35 * baseScaleMultiplier);
  const mat = createPetalMaterial();
  const mesh = new THREE.Mesh(geom, mat);
  
  // Radial swarm motion
  const angle = Math.random() * Math.PI * 2;
  const speed = (200 + Math.random() * 100) * baseScaleMultiplier;
  mesh.userData = {
    velocity: new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed * 0.5, (Math.random() - 0.5) * 50),
    id: Math.random() * 1000,
    life: 1.0,
    decay: Math.random() * 0.4 + 0.3 // 1.4 - 2.5 sec lifetime
  };
  
  // Depth layering
  mesh.position.z = (Math.random() - 0.5) * 100;
  const scale = 1 + (mesh.position.z / 100) * 0.3;
  mesh.scale.set(scale, scale, scale);
  
  return mesh;
}

export class SenbonzakuraEffect extends Effect {
  constructor(x, y) {
    super();
    // Screen coords to Three.js orthographic coords (center is 0,0)
    this.spawnX = x - window.innerWidth / 2;
    this.spawnY = -(y - window.innerHeight / 2); // Invert Y for 3D space
    this.scale = window.innerWidth * 0.002; // Normalized base scale
  }

  init(scene) {
    this.time = 0;
    this.isDone = false;
    
    this.sword = createKatanaMesh(this.scale);
    // Drop from above
    this.sword.position.set(this.spawnX, this.spawnY + window.innerHeight * 0.6, 0);
    scene.add(this.sword);
    
    this.petals = [];
  }

  update(dt) {
    this.time += dt;

    if (this.time < 0.12) {
      // Phase: Sword Drop
      this.sword.position.y -= dt * window.innerHeight * 5; // Fast drop
      if (this.sword.position.y < this.spawnY) this.sword.position.y = this.spawnY;
    } 
    else if (this.time < 0.27) {
      // Phase: Hold
      this.sword.position.y = this.spawnY;
    }
    else if (this.time < 0.57) {
      // Phase: Glow
      this.sword.material.color.lerp(new THREE.Color('#ff2f7a'), 0.1);
    }
    else if (this.time < 1.17) {
      // Phase: Dissolve
      this.spawnPetalsAlongBlade();
      this.sword.scale.y -= dt * 1.5; 
      
      // Move sword down so it dissolves from the top down
      const h = this.sword.userData.height;
      this.sword.position.y -= dt * 1.5 * (h / 2);
      if (this.sword.scale.y < 0) this.sword.scale.y = 0;
    } 
    else if (this.time > 3.0) {
      // Swarm ends
      this.isDone = true;
    }

    this.updatePetals(dt);
  }

  spawnPetalsAlongBlade() {
    if (this.sword.scale.y <= 0) return;
    
    if (this.petals.length < 60) {
      // Spawn 1-2 petals per frame
      for (let i = 0; i < 2; i++) {
        const petal = createPetal(this.scale);
        const h = this.sword.userData.height;
        // The top of the currently visible sword geometry
        const topY = this.sword.position.y + (h * this.sword.scale.y) / 2;
        
        petal.position.set(
          this.sword.position.x + (Math.random() - 0.5) * 20 * this.scale, 
          topY, 
          petal.position.z
        );
        this.petals.push(petal);
        this.sword.parent.add(petal);
      }
    }
  }

  updatePetals(dt) {
    this.petals.forEach(p => {
      // Update Uniforms
      p.material.uniforms.uTime.value = this.time;

      // Swarm lateral flow
      p.position.add(p.userData.velocity.clone().multiplyScalar(dt));
      p.position.x += Math.sin(this.time * 4 + p.userData.id) * 3 * this.scale;
      
      // Continuous tumbling
      p.rotation.z += 4 * dt;
      p.rotation.x += 1.5 * dt;
      
      p.userData.life -= p.userData.decay * dt;
      
      // Fade out by scaling down as life ends
      if (p.userData.life < 0) {
        p.scale.set(0, 0, 0);
      } else if (p.userData.life < 0.2) {
        const s = Math.max(0, p.userData.life * 5);
        // keep base depth scale
        const baseS = 1 + (p.position.z / 100) * 0.3;
        p.scale.set(baseS * s, baseS * s, baseS * s);
      }
    });
  }

  get done() {
    return this.isDone;
  }

  destroy(scene) {
    if (this.sword && this.sword.parent) {
      scene.remove(this.sword);
      this.sword.geometry.dispose();
      this.sword.material.dispose();
    }
    this.petals.forEach(p => {
      scene.remove(p);
      p.geometry.dispose();
      p.material.dispose();
    });
  }
}

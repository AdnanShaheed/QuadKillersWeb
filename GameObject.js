// GameObject class (parent class for all game objects)
class GameObject {
  constructor() {
    this.deleteObject = false; // Object is deleted when true
    this.pos = new p5.Vector(); // Position must be initialized before it can be passed as a reference
    this.vel = new p5.Vector();
    this.scale = new p5.Vector(1, 1); // Default scale
    this.rot = 0; // Rotation
    this.id = objectCount; // Unique ID for the object (does not necessarily match list index)
    this.coll = null; // Hitbox of the object
    this.type = new Array(10).fill(false); // Layer to differentiate between objects (objects can have multiple layers)
    // 0: enemy, 1: pAttack, 2: pSlash, 3: pFireball, 4: dashAttack, 5: playerExplode, 6: rocket, 7: neutralExplosion
    objectCount++;
  }

  init() {
    // To be overridden by child classes
  }

  collUpdate() {
    // To be overridden by child classes
  }

  physUpdate() {
    // To be overridden by child classes
  }
}

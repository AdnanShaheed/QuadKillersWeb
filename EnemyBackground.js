// EnemyExplosion class (extends GameObject)
class EnemyExplosion extends GameObject {
  constructor(pos) {
    super();
    this.pos = pos;
    this.radius = 400; // Radius of the explosion
    this.startTime = millis(); // Time when object was spawned
    this.delay = 1500; // Time it takes for impact to land
    this.animTime = 100; // Time it takes for explosion animation to play
    this.decay = 1000; // Time it takes for animation to fade
    this.isExploded = false;
    this.init();
  }

  init() {
    this.type[7]=true;
    this.startTime = millis();
  }

  collUpdate() {
    if (
      this.startTime + this.delay < millis() &&
      millis() < this.startTime + this.delay + this.animTime) {
      if (this.coll==null && !this.isExploded) {
        this.coll = new CircleColl(this.pos.x, this.pos.y, this.radius);
        this.isExploded=true;
      } else if (this.isExploded && this.coll!=null) {
        this.coll=null;
      }
      // The collision with player is active only during the animTime window
     
    }
    if (testColl(this.coll, player.coll)) {
       player.onHit(player.pos.copy().sub(this.pos).setMag(50), -30);
    }
  }

  physUpdate() {
    let d = 1;
    let a = 1;

    if (millis() < this.startTime + this.delay) {
      push(); // Rotated cross
      translate(this.pos.x, this.pos.y);
      rotate(radians(45));
      fill(0, 1, 1, map(cos(TWO_PI * millis() * 0.001), -1, 1, 0.1, 0.3)); // Blinking red circle
      stroke(0, 0, 1);
      strokeWeight(1);
      circle(0, 0, 2 * this.radius);
      fill(0, 1, 1, map(cos(TWO_PI * millis() * 0.001), -1, 1, 0.3, 0.5)); // Blinking center circle
      noStroke();
      circle(0, 0, 150);
      fill(0, 1, 1);
      rectMode(CENTER);
      rect(0, 0, 20, 100);
      rect(0, 0, 100, 20);
      pop();
    } else if (millis() < this.startTime + this.delay + this.animTime) {
      screenShake.add(player.pos.copy().sub(this.pos).setMag(50));
      d = 2 * map(millis(), this.startTime + this.delay, this.startTime + this.delay + this.animTime, 0, this.radius);
    } else if (millis() < this.startTime + this.delay + this.animTime + this.decay) {
      a = map(millis(), this.startTime + this.delay + this.animTime, this.startTime + this.delay + this.animTime + this.decay, 1, 0);
      d = 2 * this.radius;
    } else {
      this.deleteObject = true;
    }

    fill(0, 1, 1, 0.25 * a);
    circle(this.pos.x, this.pos.y, d);
    fill(0, 1, 1, 0.5 * a);
    circle(this.pos.x, this.pos.y, 0.75 * d);
    fill(0, 1, 1, 0.75 * a);
    circle(this.pos.x, this.pos.y, 0.5 * d);
    fill(0, 1, 1, a);
    circle(this.pos.x, this.pos.y, 0.25 * d);
  }
}

class EnemyLaser extends GameObject {
  
}
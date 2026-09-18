let resolution = 10; // Curve resolution of the image
let frameLength = 10; // The amount of preloaded frames that the slash is split into
let slashFrame = new Array(frameLength); // Animation is split into 10 frames (this array is filled in setup)

// Default geometry has radius of 100
function calcSlash(tBound, c=255) {
  let radius = 100;
  fill(c);
  noStroke();
  strokeWeight(1);

  scale(1);

  beginShape();
  curveVertex(radius, 0); // Ends of curves need double coordinates for some reason
  curveVertex(radius, 0);
  for (let i = 1; i < resolution; i++) {
    let t = map(i, 0, resolution, 0, tBound);
    curveVertex(radius * cos(PI * t), radius * sin(PI * t));
  }
  curveVertex(radius * cos(PI * tBound), radius * sin(PI * tBound));
  curveVertex(radius * cos(PI * tBound), radius * sin(PI * tBound));
  vertex(
    (1 - tBound) * radius * cos(PI * tBound),
    (1 - tBound) * radius * sin(PI * tBound)
  );
  curveVertex(
    (1 - tBound) * radius * cos(PI * tBound),
    (1 - tBound) * radius * sin(PI * tBound)
  );
  curveVertex(
    (1 - tBound) * radius * cos(PI * tBound),
    (1 - tBound) * radius * sin(PI * tBound)
  );
  for (let i = 1; i < resolution; i++) {
    let t = map(i, 0, resolution, tBound, 0); // t but reverse direction
    curveVertex((1 - t) * radius * cos(PI * t), (1 - t) * radius * sin(PI * t));
  }
  curveVertex(radius, 0);
  curveVertex(radius, 0);
  endShape();
  
}

// Slash class (extends GameObject)
class Slash extends GameObject {
  constructor(
    pos,
    aimAngle,
    flipSlash,
    radius = 200,
    duration = 100,
    decay = 200,
    c = color(0, 0, 1)
  ) {
    super();
    this.pos = pos;
    this.radius = radius;
    this.aimAngle = aimAngle;
    this.c = c;
    this.duration = duration;
    this.decay = decay;
    this.flipSlash = flipSlash;
    this.init();
  }

  init() {
    this.type[1] = true; // pAttack
    this.type[2] = true; // pSlash
    this.coll = new CircleColl(this.pos.x, this.pos.y, this.radius);
    this.startTime = millis();
  }

  physUpdate() {
    if (this.startTime !== millis()) {
      // Waits until the frame after it was spawned before removing coll
      this.coll = null; // Removes the coll right after the first frame of the blade animation
    }
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.aimAngle - HALF_PI); // Geometry of slash was drawn 90 degrees clockwise
    scale(this.radius / 100); // 100 is the default radius of the blade geometry
    if (this.flipSlash) {
      // Flips the direction of the blade
      scale(-1, 1);
    }

    if (millis() < this.startTime + this.duration) {
      // Maps the millis to the closest frame in the array
      let index = round(
        map(
          millis(),
          this.startTime,
          this.startTime + this.duration,
          0,
          frameLength - 1
        )
      );
      
      calcSlash(index/(frameLength-1),this.c)
    } else if (millis() < this.startTime + this.duration + this.decay) {
      this.pos = this.pos.copy(); // The blade no longer follows the player
      calcSlash(1,(changeAlpha(this.c,map(millis(),this.startTime + this.duration,this.startTime + this.duration + this.decay,1,0))));
    } else if (millis() > this.startTime + this.duration + this.decay) {
      this.deleteObject = true;
    }
    pop();
  }
}

// PlayerFireball class (extends GameObject)
class PlayerFireball extends GameObject {
  constructor(pos, angle, radius, c) {
    super();
    this.pos = pos;
    this.angle = angle;
    this.radius = radius;
    this.c = c;
    this.init();
  }

  init() {
    this.startTime = millis();
    this.vel = p5.Vector.fromAngle(this.angle).setMag(30);
    this.coll = new CircleColl(this.pos.x, this.pos.y, this.radius);
    this.type[1] = true; // pAttack
    this.type[3] = true; // pFireball
  }

  physUpdate() {
    this.pos.add(this.vel.copy().mult(dt));
    this.coll.setPos(this.pos.copy());
    if (millis() >= this.startTime + this.decay) {
      this.deleteObject = true;
    }
    ellipseMode(CENTER);
    noStroke();
    fill(this.c);
    for (let i = 0; i < 3; i++) {
      let size = random(25, 50);
      particles.push(
        new Particle(
          "ELLIPSE",
          0,
          0,
          size,
          size,
          this.pos.copy().add(p5.Vector.random2D().setMag(25)),
          100,
          500,
          this.c
        )
      );
    }

    noStroke();
    fill(changeAlpha(this.c, 0.5));
    circle(this.pos.x, this.pos.y, 2 * this.radius);
    fill(this.c);
    circle(this.pos.x, this.pos.y, this.radius);
  }
}

// PlayerExplode class (extends GameObject)
class PlayerExplode extends GameObject {
  constructor(pos, radius, decay, c) {
    super();
    this.pos = pos;
    this.radius = radius;
    this.decay = decay;
    this.c = c;
    this.init();
    this.appear=100;
    this.deleteObject=false;
  }

  init() {
    this.startTime = millis();
    this.coll = new CircleColl(this.pos.x, this.pos.y, this.radius);
    this.type[1] = true; // pAttack
    this.type[5] = true; // playerExplode
  }

  collUpdate() {
    // No collision update needed
  }

  physUpdate() {
    if (millis() !== this.startTime) {
      this.coll = null; // Removes the collision after the first frame
    }
    let r = this.radius;
    let alpha = 1;
    if (millis() < this.startTime + this.appear) {
      r = map(
        millis(),
        this.startTime,
        this.startTime + this.appear,
        0,
        this.radius
      );
      screenShake.add(p5.Vector.random2D().setMag(50));
    } else if (this.startTime+this.appear < millis() && millis() < this.startTime + this.appear + this.decay) {
      alpha = map(
        millis(),
        this.startTime,
        this.startTime + this.appear + this.decay,
        1,0);
    } else if (millis() >= this.startTime+this.appear+this.decay) {
        alpha=0;
        this.deleteObject = true;
    }
    push();
    translate(this.pos.x, this.pos.y);
    ellipseMode(CENTER);
    fill(changeAlpha(this.c, 0.25 * alpha));
    circle(0, 0, 2 * r);
    fill(changeAlpha(this.c, 0.5 * alpha));
    circle(0, 0, 1.5 * r);
    fill(changeAlpha(this.c, 0.25 * alpha));
    circle(0, 0, 1 * r);
    fill(changeAlpha(this.c, alpha));
    circle(0, 0, 0.5 * r);
    pop();
  }
}


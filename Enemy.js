// Health class (extends GameObject)
class Health extends GameObject {
  constructor(pos) {
    super();
    this.pos = pos.copy();
    this.coll = new BoxColl(pos.x, pos.y, 50, 50, CENTER);
    this.emitStart = millis(); // Time when the last particle was emitted
    this.emitCooldown = 1000; // Cooldown between particle emissions
    this.coll.setPos(this.pos);
  }

  collUpdate() {
    if (testColl(this.coll, player.coll)) {
      player.addHealth(10); // Add health to the player
      textParticles.push(
        new TextParticle(
          "+10",
          random(500, 1000),
          this.pos.copy().add(random(-25, 25), random(-25, 25)),
          color(120, 1, 1)
        )
      );
      bgHue = 120; // Change background hue
      bgBrightness = 0.5; // Change background brightness
      this.deleteObject = true; // Mark for deletion
    }
  }

  physUpdate() {
    ellipseMode(CENTER);
    fill(120, 1, 0.5);
    noStroke();

    // Emit particles periodically
    if (
      testColl(
        new BoxColl(
          camPos.x,
          camPos.y,
          width / camScale,
          height / camScale,
          CENTER
        ),
        this.coll
      )
    ) {
      ellipseMode(CENTER);
      fill(120, 1, 0.5);
      noStroke();
      if (millis() > this.emitStart + this.emitCooldown) {
        this.emitStart = millis();
        particles.push(
          new Particle(
            "ELLIPSE",
            0,
            0,
            100,
            100,
            this.pos.copy(),
            100,
            500,
            color(120, 1, 0.5)
          )
        );
      }
      
      // Draw health sprite
      push();
      translate(this.pos.x, this.pos.y);
      rectMode(CENTER);
      noStroke();
      fill(0, 0, 0.7); // White
      rect(0, 0, 50, 50);
      fill(0, 1, 0.7); // Red
      rect(0, 0, 10, 30);
      rect(0, 0, 30, 10);
      pop();
    } else {
      let margin = 50;
      let tempPos = this.pos.copy(); //position of the indicator (not the health object)
      if (this.pos.x < camPos.x - (width * 0.5) / camScale + margin) {
        tempPos.x = camPos.x - (width * 0.5) / camScale + margin;
      } else if (this.pos.x > camPos.x + (width * 0.5) / camScale - margin) {
        tempPos.x = camPos.x + (width * 0.5) / camScale - margin;
      }
      if (this.pos.y < camPos.y - (height * 0.5) / camScale + margin) {
        tempPos.y = camPos.y - (height * 0.5) / camScale + margin;
      } else if (this.pos.y > camPos.y + (height * 0.5) / camScale - margin) {
        tempPos.y = camPos.y + (height * 0.5) / camScale - margin;
      }
       
      noStroke();
      push(); //circle and point
      translate(tempPos.x,tempPos.y);
      rotate(p5.Vector.sub(this.pos,tempPos).heading());
      fill(0,0,0.7);
      triangle(0,25,0,-25,50,0);
      circle(0,0,50);
      pop();
      
      push(); //cross
      translate(tempPos.x,tempPos.y);
      fill(0, 1, 0.7); //red
      rectMode(CENTER);
      rect(0, 0, 10, 30);
      rect(0, 0, 30, 10);
      pop();

    }
  }
}

// Enemy class (parent class for all enemies)
class Enemy extends GameObject {
  constructor() {
    super();
    this.separate = new p5.Vector(); // Vector for separation force
    this.calcSeparate = new Array(10).fill(false); // Whether to include this object type in separation calculations
    this.deltaPos = new p5.Vector(); // Displacement vector between enemy and player
    this.maxHealth = 50;
    this.health = 50;

    this.lastStun = 0; // Time when enemy was last stunned
    this.stunCooldown = 500; // Duration of stun
    this.mode = "stun"; // Current mode: "move", "stun"

    enemyCount++;
    this.calcSeparate[0] = true; // By default, separate from enemy types
  }

  collUpdate() {
    this.deltaPos = player.pos.copy().sub(this.pos);
    if (testColl(player.coll, this.coll)) {
      this.contactHit(player);
    }
    if (this.health === 0) {
      this.deleteObject = true;
      killCount++;
      enemyCount--;
      if (round(random(1, 5)) === 1) {
        // 20% chance to drop health packet
        objs.push(new Health(this.pos.copy()));
      }
    }
    if (this.mode === "stun" && millis() >= this.lastStun + this.stunCooldown) {
      // Remove stun if possible
      this.mode = "move";
    }
    this.separate.set(0, 0);
    for (let obj of objs) {
      if (obj.id === this.id) {
        // Skip self within loop
        continue;
      }

      for (let j = 0; j < 10; j++) {
        if (obj.type[j] && this.calcSeparate[j]) {
          if (this.pos.copy().sub(obj.pos).magSq() < sq(200)) {
            this.separate.add(p5.Vector.sub(this.pos, obj.pos));
          }
        }
      }

      if (obj.type[1]) {
        // Type pAttack
        if (
          obj.type[2] &&
          testColl(obj.coll, this.coll) &&
          this.deltaPos.copy().mult(-1).dot(mousePos.copy().sub(player.pos)) > 0
        ) {
          this.slashHit(obj);
        } else if (
          this.mode !== "stun" &&
          obj.type[3] &&
          testColl(obj.coll, this.coll)
        ) {
          this.mode = "stun";
          this.lastStun = millis();
          this.fireballHit(obj);
        } else if (obj.type[5] && testColl(this.coll, obj.coll)) {
          this.mode = "stun";
          this.lastStun = millis();
          this.smashHit(obj);
        } else {
          // Skip unneeded objects
          continue;
        }
      } else if (obj.type[7] /*neutral explosion*/ && testColl(this.coll, obj.coll)) {
        this.mode="stun";
        this.lastStun=millis();
        this.explodeHit(obj);
      } else {
        continue;
      }
    }
  }

  physUpdate() {
    this.runBehavior();
    if (this.regularMotion()) {
      this.pos.add(this.vel.copy().mult(dt));
      this.vel.lerp(0, 0, 0, 0.2 * dt);
      this.coll.setPos(this.pos);
    }
    this.drawSprite();

    // Draw health bar
    push();
    translate(this.pos.x, this.pos.y - 40);
    drawBar(this.health, 0, 50, -25, 25, 10);
    pop();
  }

  // Default code for receiving player attacks
  contactHit(obj) {
    player.onHit(this.deltaPos.copy().setMag(30), -10);
    this.vel.sub(this.deltaPos.copy().setMag(30));
    this.health = constrain(this.health - 5, 0, this.health);
    textParticles.push(
      new TextParticle(
        "-5",
        random(500, 1000),
        this.pos.copy().add(random(-25, 25), random(-25, 25)),
        color(360)
      )
    );
  }

  slashHit(obj) {
    magic = constrain(magic + 1, 0, 32+(4*wave));
    if (obj.type[4]) {
      // Dash slash code
      this.vel.add(mousePos.copy().sub(player.pos).setMag(75)); // Instantaneous
      screenShake.add(
        mousePos
          .copy()
          .sub(player.pos)
          .setMag(20 * camScale)
      );
      this.health = constrain(this.health - 20, 0, this.health);
      textParticles.push(
        new TextParticle(
          "-20",
          random(500, 1000),
          this.pos.copy().add(random(-25, 25), random(-25, 25)),
          color(180, 1, 1)
        )
      );
    } else {
      // Regular slash code
      this.vel.add(mousePos.copy().sub(player.pos).setMag(50)); // Instantaneous
      screenShake.add(
        mousePos
          .copy()
          .sub(player.pos)
          .setMag(10 * camScale)
      );
      this.health = constrain(this.health - 10, 0, this.health);
      textParticles.push(
        new TextParticle(
          "-10",
          random(500, 1000),
          this.pos.copy().add(random(-25, 25), random(-25, 25)),
          color(360)
        )
      );
    }
  }

  fireballHit(obj) {
    if (obj.type[4]) {
      // Dashed pFireball
      this.health = constrain(this.health - 30, 0, this.health);
      textParticles.push(
        new TextParticle(
          "-30",
          random(500, 1000),
          this.pos.copy().add(random(-25, 25), random(-25, 25)),
          color(180, 1, 1)
        )
      );
      this.vel.add(obj.vel.copy().setMag(50)); // Instantaneous
      screenShake.add(
        mousePos
          .copy()
          .sub(player.pos)
          .setMag(20 * camScale)
      );
    } else {
      // Basic pFireball
      this.health = constrain(this.health - 20, 0, this.health);
      textParticles.push(
        new TextParticle(
          "-20",
          random(500, 1000),
          this.pos.copy().add(random(-25, 25), random(-25, 25)),
          color(360)
        )
      );
      this.vel.add(obj.vel.copy().setMag(20)); // Instantaneous
      screenShake.add(
        mousePos
          .copy()
          .sub(player.pos)
          .setMag(10 * camScale)
      );
    }
  }

  smashHit(obj) {
    if (obj.type[4]) {
      // Dash Smash
      this.health = constrain(this.health - 30, 0, this.health);
      textParticles.push(
        new TextParticle(
          "-30",
          random(500, 1000),
          this.pos.copy().add(random(-25, 25), random(-25, 25)),
          color(180, 1, 1)
        )
      );
      this.vel.sub(obj.pos.copy().sub(this.pos).setMag(50));
      screenShake.add(
        mousePos
          .copy()
          .sub(player.pos)
          .setMag(20 * camScale)
      );
    } else {
      // Regular explosion
      this.health = constrain(this.health - 20, 0, this.health);
      textParticles.push(
        new TextParticle(
          "-20",
          random(500, 1000),
          this.pos.copy().add(random(-25, 25), random(-25, 25)),
          color(360)
        )
      );
      this.vel.sub(obj.pos.copy().sub(this.pos).setMag(50));
      screenShake.add(
        mousePos
          .copy()
          .sub(player.pos)
          .setMag(10 * camScale)
      );
    }
  }

  explodeHit (obj) {
    if (obj.type[7]) {
      this.health = constrain(this.health - 10, 0, this.health);
      textParticles.push(new TextParticle("-10", random(500, 1000), this.pos.copy().add(random(-25, 25), random(-25, 25)), color(360)));
      this.vel.sub(obj.pos.copy().sub(this.pos).setMag(30));
      screenShake.add(p5.Vector.sub(player.pos).setMag(10 * camScale)
      );
    }
  }
  
  runBehavior() {
    // Children will override this method with movement code
  }

  drawSprite() {
    // Children will override this method with the code to draw the sprite
  }

  regularMotion() {
    // Whether or not to use normal position and velocity motion
    return true;
  }
}

// BasicEnemy class (extends Enemy)
class BasicEnemy extends Enemy {
  constructor(x, y) {
    super();
    this.pos.set(x, y);
    this.init();
  }

  init() {
    this.health = 50;
    this.coll = new CircleColl(this.pos.x, this.pos.y, 25);
    this.lastTeleport = millis();
    this.teleportCooldown = 5000; // Time between teleports
    this.type[0] = true; // Set enemy type

    ellipseMode(CENTER);
    noStroke();
    particles.push(
      new Particle("ELLIPSE",0,0,300,300, this.pos.copy(),0,1000,color(300, 1, 0.5))
    );
  }

  runBehavior() {
    // Move closer
    if (this.mode === "move" && this.vel.mag() < 5) {
      // Max speed is 5
      this.vel.add(
        this.deltaPos
          .copy()
          .setMag(2)
          .add(this.separate.copy().setMag(1))
          .setMag(1 * dt)
      );
    }

    if (millis() >= this.lastTeleport + this.teleportCooldown) {
      this.lastTeleport = millis();
      this.teleportCooldown = round(random(5000, 10000));
      let angle =
        player.pos.copy().sub(mousePos).heading() + random(-HALF_PI, HALF_PI);
      this.pos.set(
        player.pos.copy().add(p5.Vector.fromAngle(angle).setMag(500))
      );
      ellipseMode(CENTER);
      noStroke();
      particles.push(
        new Particle(
          "ELLIPSE",
          0,
          0,
          300,
          300,
          this.pos.copy(),
          0,
          1000,
          color(300, 1, 0.5)
        )
      );
    }
  }

  drawSprite() {
    if (this.mode === "stun") {
      fill(0, 1, 1, 0.5);
      noStroke();
      circle(this.pos.x, this.pos.y, 150);
    }

    noStroke();
    rectMode(CENTER);
    fill(0, 0, 0.5);
    for (let i = 0; i < 8; i++) {
      let angle = map(i, 0, 8, 0, TAU);
      push();
      translate(this.pos.x + 20 * cos(angle), this.pos.y + 20 * sin(angle));
      rotate(angle + HALF_PI);
      triangle(-5, 0, 5, 0, 0, -20);
      pop();
    }

    noStroke();
    fill(0, 1, 0.5);
    circle(this.pos.x, this.pos.y, 50);
  }
}

// RangeEnemy class (extends Enemy)
class RangeEnemy extends Enemy {
  constructor(x, y) {
    super();
    this.pos.set(x, y);
    this.init();
  }

  init() {
    this.coll = new CircleColl(this.pos.x, this.pos.y, 25); // Radius, not diameter
    this.lastShoot = millis();
    this.shootCooldown = 5000; // Cooldown between shots
    this.type[0] = true; // Set enemy type
  }

  runBehavior() {
    // Move closer
    if (this.mode === "move") {
      // Max speed is 3
      let v; // Temporary vector used to calculate velocity
      if (this.deltaPos.magSq() >= sq(400)) {
        // If player is outside range, move closer
        v = p5.Vector.add(
          this.separate.copy().setMag(1),
          this.deltaPos.copy().setMag(2)
        ); // This vector is not normalized
      } else if (this.deltaPos.magSq() <= sq(300)) {
        // Move away from player
        v = p5.Vector.add(
          this.separate.copy().setMag(1),
          this.deltaPos.copy().setMag(-2)
        ); // This vector is not normalized
      } else {
        v = this.separate.copy(); // This vector is not normalized
      }
      if (this.vel.magSq() <= sq(9)) {
        // If under max speed, use acceleration value
        this.vel.add(v.setMag(1 * dt));
      }

      if (millis() >= this.lastShoot + this.shootCooldown) {
        this.lastShoot = millis();
        this.shoot();
      }
    }
  }

  shoot() {
    // Override this method to change the bullet type
    objs.push(
      new EnemyBullet(this.pos.copy(), this.deltaPos.copy().setMag(10))
    );
  }

  drawSprite() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.deltaPos.heading());
    rectMode(CENTER);
    fill(0, 1, 0.5);
    rect(20, 0, 30, 30);
    rect(30, 0, 40, 20);
    fill(0, 1, 0.7);
    circle(0, 0, 50);
    pop();
  }
}

// EnemyBullet class (extends Enemy)
class EnemyBullet extends Enemy {
  constructor(pos, vel) {
    super();
    this.pos = pos;
    this.vel = vel;
    this.init();
  }

  init() {
    this.coll = new CircleColl(this.pos.x, this.pos.y, 15);
    this.startTime = millis();
    this.duration = 5000; // Total time of the bullet
    enemyCount--; // Ensure the bullet does not count as an enemy
    this.calcSeparate[0] = false; // Bullet should not run separate calculations
  }

  slashHit(obj) {
    this.vel.add(mousePos.copy().sub(player.pos).setMag(30)); // Instantaneous
  }

  fireballHit(obj) {
    this.deleteObject = true;
    this.coll = null;
  }

  smashHit(obj) {
    this.deleteObject = true;
    this.coll = null;
  }
  
  explodeHit(obj) {
    this.deleteObject=true;
    this.coll=null;
  }

  contactHit(obj) {
    player.onHit(this.deltaPos.copy().setMag(20), -10);
  }

  physUpdate() {
    if (millis() >= this.startTime + this.duration) {
      this.deleteObject = true;
    }
    this.pos.add(this.vel.copy().mult(dt));
    if (this.coll !== null) {
      this.coll.setPos(this.pos);
    }
    fill(0, 1, 1);
    noStroke();
    circle(this.pos.x, this.pos.y, 30);
  }
}

// RocketEnemy class (extends RangeEnemy)
class RocketEnemy extends RangeEnemy {
  constructor(x, y) {
    super(x, y);
  }

  shoot() {
    objs.push(new Rocket(this.pos.copy(), p5.Vector.random2D().setMag(5)));
  }
}

// Rocket class (extends Enemy)
class Rocket extends Enemy {
  constructor(pos, vel) {
    super();
    this.pos = pos;
    this.vel = vel;
    this.init();
  }

  init() {
    this.coll = new CircleColl(this.pos.x, this.pos.y, 25);
    this.startTime = millis();
    this.type[0] = false;
    enemyCount--; // Ensure the rocket does not count as an enemy
    this.type[6] = true; // Type rocket
    this.calcSeparate[0] = false; // Don't repel enemies
    this.calcSeparate[6] = true; // Repel rockets
  }

  slashHit(obj) {
    this.deleteObject = true;
    this.coll = null;
  }

  fireballHit(obj) {
    this.deleteObject = true;
    this.coll = null;
  }

  smashHit(obj) {
    this.deleteObject = true;
    this.coll = null;
  }
  explodeHit(obj) {
    this.deleteObject=true;
    this.coll=null;
  }

  contactHit(obj) {
    player.onHit(this.deltaPos.copy().setMag(20), -10);
    this.deleteObject = true;
  }

  physUpdate() {
    this.vel.set(
      this.deltaPos
        .copy()
        .setMag(2)
        .add(this.vel.copy().setMag(10))
        .add(this.separate.copy().setMag(2))
        .setMag(10)
    );
    this.pos.add(this.vel.copy().mult(dt));

    if (this.coll !== null) {
      this.coll.setPos(this.pos);
    }
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.vel.heading());
    noStroke();
    fill(0, 0, 0.7);
    rectMode(CENTER);
    rect(0, 0, 40, 20);
    fill(0, 1, 1);
    quad(10, 15, 15, 0, 10, -15, 35, 0);
    triangle(-20, 10, -25, 20, 0, 10);
    triangle(-20, -10, -25, -20, 0, -10);
    pop();
  }
}

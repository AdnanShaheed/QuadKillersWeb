// Player class (extends GameObject)
class Player extends GameObject {
  constructor() {
    super();
    this.maxSpeed = 5; // Maximum movement speed while using WASD
    this.acc = 2; // Acceleration per frame when pressing WASD
    this.frictAmt = 0.3; // Lerp amount while applying friction
    this.health = 100;

    // Dash constants
    this.dashDistance = 300; // Length of dash in pixels
    this.dashDuration = 100; // Duration of total dash motion in milliseconds
    this.dashInvincDuration = 300; // Duration of invincibility after dash finishes
    this.dashCooldown = 1500; // Cooldown between dashes

    this.lastDash = -this.dashCooldown; // Allows player to dash instantly
    this.lastKeyDir = new p5.Vector(1, 0); // Last recorded key direction
    this.dashStartPos = new p5.Vector();
    this.dashEndPos = new p5.Vector();

    // Stun constants
    this.lastStun = 0; // Time when the last stun started
    this.stunDuration = 300; // Duration of stun in milliseconds
    this.stunInvincDuration = 300; // Duration of invincibility after stun finishes

    // Slash constants
    this.slashCooldown = 500; // Cooldown between slashes
    this.lastSlash = -this.slashCooldown; // Allows player to slash instantly
    this.dashSlashBuffer = 100; // Dash slash buffer time
    this.flipSlash = false; // Alternates the swing direction of the dash

    // Spell constants
    this.lastSpell = 0; // Time when the last spell was fired
    this.spellCooldown = 500; // Cooldown between spells

    this.mode = "move"; // Current mode: "move", "dash", "stun"
    this.states = { invincible: 0 }; // Player states (0 for false, 1 for true)
  }

  addHealth(h) {
    this.health = constrain(this.health + h, 0, 100);
  }

  init() {
    this.coll = new BoxColl(this.pos.x, this.pos.y, 50, 50, CENTER);
  }

  onHit(kb, damage) {
    // Called when the player is hit
    if (this.states.invincible === 0) {
      bgHue = 0;
      bgBrightness = 0.7;
      this.vel.add(kb);
      this.mode = "stun";
      this.lastStun = millis();
      this.states.invincible = 1;
      this.addHealth(damage);
      textParticles.push(
        new TextParticle(
          `${int(damage)}`,
          1000,
          this.pos.copy().add(random(-25, 25), random(-25, 25)),
          color(360, 1, 1)
        )
      );

      if (this.health === 0) {
        objs = []; // Clear all objects
        screen = 4;
        spawnButtons();
      }
    }
  }

  physUpdate() {
    let keyDir = new p5.Vector(0, 0); // Tracks the direction of the WASD keys
    let mouseDir = mousePos.copy().sub(this.pos).heading(); // Angle of the mouse relative to the player

    // Handle WASD input
    if (inputHeld[4]) {
      // D pressed
      keyDir.x += 1;
      if (this.vel.x < this.maxSpeed && this.mode === "move") {
        this.vel.x += this.acc * dt;
      }
    }
    if (inputHeld[2]) {
      // A pressed
      keyDir.x -= 1;
      if (this.vel.x > -this.maxSpeed && this.mode === "move") {
        this.vel.x -= this.acc * dt;
      }
    }
    if (inputHeld[1]) {
      // W pressed
      keyDir.y -= 1;
      if (this.vel.y > -this.maxSpeed && this.mode === "move") {
        this.vel.y -= this.acc * dt;
      }
    }
    if (inputHeld[3]) {
      // S pressed
      keyDir.y += 1;
      if (this.vel.y < this.maxSpeed && this.mode === "move") {
        this.vel.y += this.acc * dt;
      }
    }

    // Update invincibility state
    if (
      millis() > this.lastDash + this.dashDuration + this.dashInvincDuration &&
      millis() >= this.lastStun + this.stunDuration + this.stunInvincDuration
    ) {
      this.states.invincible = 0; // Turn off invincibility
    }

    // Handle stun mode
    if (this.mode === "stun") {
      this.pos.add(this.vel.copy().mult(dt));
      this.vel.lerp(0, 0, 0, 0.2 * dt); // Lerp velocity to 0
      if (millis() >= this.lastStun + this.stunDuration) {
        this.mode = "move";
      }
    } else if (this.mode === "move") {
      this.pos.add(this.vel.copy().mult(dt));
      this.vel.lerp(0, 0, 0, this.frictAmt * dt);

      // Update last key direction
      if (keyDir.x !== 0 || keyDir.y !== 0) {
        this.lastKeyDir = keyDir.copy();
      }

      // Handle dash
      if (inputHeld[0] && millis() - this.lastDash >= this.dashCooldown) {
        this.mode = "dash";
        this.lastDash = millis();
        this.states.invincible = 1;
        this.dashStartPos = this.pos.copy();
        if (this.lastKeyDir.x !== 0 && this.lastKeyDir.y !== 0) {
          this.dashEndPos = this.lastKeyDir
            .copy()
            .mult(this.dashDistance * 0.7)
            .add(this.pos);
        } else {
          this.dashEndPos = this.lastKeyDir
            .copy()
            .mult(this.dashDistance)
            .add(this.pos);
        }
      }

      // Handle slash
      if (inputHeld[5] && millis() > this.lastSlash + this.slashCooldown) {
        this.lastSlash = millis();
        this.flipSlash = !this.flipSlash;
        if (
          inputPressTime[5] > this.lastDash + this.dashDuration &&
          inputPressTime[5] <
            this.lastDash + this.dashDuration + this.dashSlashBuffer &&
          millis() < this.lastDash + this.dashDuration + this.dashSlashBuffer
        ) {
          // Dash slash
          objs.push(
            new Slash(
              this.pos,
              mouseDir,
              this.flipSlash,
              300,
              100,
              1000,
              color(180, 1, 1)
            )
          );
          objs[objs.length - 1].type[4] = true; // Set dash slash type
          screenShake.add(50 * cos(mouseDir), 50 * sin(mouseDir));
          bgHue = 180; // Screen flash
          bgBrightness = 0.5;
        } else {
          // Regular slash
          objs.push(new Slash(this.pos, mouseDir, this.flipSlash));
        }
      }

      // Handle spells
      if (millis() > this.lastSpell + this.spellCooldown) {
        if (magic >= 8 && (inputHeld[8] || inputHeld[7])) {
          this.lastSpell = millis();
          magic = constrain(magic - 8, 0, 32+(4*wave));
          if (
            inputHeld[8] &&
            inputPressTime[8] > this.lastDash + this.dashDuration &&
            inputPressTime[8] <
              this.lastDash + this.dashDuration + this.dashSlashBuffer &&
            millis() < this.lastDash + this.dashDuration + this.dashSlashBuffer
          ) {
            //Dash projectile if mouse input was between dash ending and dashSlashBuffer
            objs.push(
              new PlayerFireball(
                player.pos.copy(),
                mouseDir,
                150,
                color(180, 1, 1)
              )
            );
            //origin player, aim towards mouse, radius 300, light blue color
            objs[objs.length - 1].type[4] = true; //Set dash fireball type dashAttack to true
            screenShake.add(50 * cos(mouseDir), 50 * sin(mouseDir));
            bgHue = 180; //Screen flash
            bgBrightness = 0.5;
          } else if (inputHeld[8]) {
            // Fireball
            objs.push(
              new PlayerFireball(this.pos.copy(), mouseDir, 75, color(0, 0, 1))
            );
          } else if (
            inputHeld[7] &&
            inputPressTime[7] > this.lastDash + this.dashDuration &&
            inputPressTime[7] <
              this.lastDash + this.dashDuration + this.dashSlashBuffer &&
            millis() < this.lastDash + this.dashDuration + this.dashSlashBuffer
          ) {
            //Dash Explosion
            objs.push(
              new PlayerExplode(player.pos.copy(), 400, 1000, color(180, 1, 1))
            );
            objs[objs.length - 1].type[4] = true;
            screenShake.add(50 * cos(mouseDir), 50 * sin(mouseDir));
            bgHue = 180; //Screen flash
            bgBrightness = 0.5;
          } else if (inputHeld[7]) {
            // Explosion
            objs.push(
              new PlayerExplode(this.pos.copy(), 250, 300, color(0, 0, 1))
            );
            screenShake.add(50 * cos(mouseDir), 50 * sin(mouseDir));
          }
        } else if (inputHeld[8] || inputHeld[7]) {
          crossScale = 2;
        }
      }
    } else if (this.mode === "dash") {
      // Handle dash motion
      if (millis() - this.lastDash >= this.dashDuration) {
        this.mode = "move";
        this.pos.set(p5.Vector.lerp(this.dashStartPos, this.dashEndPos, 1));
      } else {
        let p = p5.Vector.lerp(
          this.dashStartPos,
          this.dashEndPos,
          map(millis(), this.lastDash, this.lastDash + this.dashDuration, 0, 1)
        );
        this.pos.set(p);
        for (let i = 0; i < 3; i++) {
          particles.push(
            new Particle(
              "ELLIPSE",
              0,
              0,
              50,
              50,
              this.pos.copy().add(random(-30, 30), random(-30, 30)),
              100,
              random(300, 500),
              color(180, 0.7, 1)
            )
          );
          particles.push(
            new Particle(
              "RECT",
              0,
              0,
              50,
              50,
              this.pos.copy().add(random(-30, 30), random(-30, 30)),
              100,
              random(300, 500),
              color(180, 0.7, 1)
            )
          );
        }
      }
    }

    // Update collider position
    this.coll.setPos(this.pos);

    // Draw shield and player
    let shieldFill = color(0, 0, 1, 0.2);
    let playerFill = color(0, 0, 1);

    if (this.mode === "dash") {
      playerFill = color(180, 0.7, 1);
      shieldFill = color(180, 0.7, 1, 0.2);
    } else if (this.mode === "stun") {
      playerFill = color(0, 1, 1);
      shieldFill = color(0, 1, 1, 0.2);
    } else if (this.mode === "move") {
      if (millis() >= this.lastDash + this.dashCooldown) {
        playerFill = color(180, 0.7, 1);
        particles.push(
          new Particle(
            "RECT",
            0,
            0,
            30,
            30,
            this.pos.copy().add(random(-10, 10), random(-10, 10)),
            0,
            300,
            color(180, 0.7, 1)
          )
        );
      } else {
        playerFill = color(360);
        particles.push(
          new Particle(
            "RECT",
            0,
            0,
            30,
            30,
            this.pos.copy().add(random(-10, 10), random(-10, 10)),
            0,
            300,
            color(0, 0, 1)
          )
        );
      }
      if (
        millis() <=
        this.lastDash + this.dashDuration + this.dashInvincDuration
      ) {
        shieldFill = color(180, 0.7, 1, 0.2);
      } else if (
        millis() <=
        this.lastStun + this.stunDuration + this.stunInvincDuration
      ) {
        shieldFill = color(0, 0.7, 1, 0.2);
      }
    }

    // Draw shield
    if (this.states.invincible === 1) {
      noStroke();
      fill(shieldFill);
      strokeWeight(8);
      circle(this.pos.x, this.pos.y, 150);
    }

    // Draw player
    noStroke();
    rectMode(CENTER);
    fill(playerFill);
    rect(this.pos.x, this.pos.y, 50, 50);

    // Draw health bar
    push();
    translate(this.pos.x, this.pos.y - 40);
    drawBar(this.health, 0, 100, -25, 25, 10);
    pop();
  }
}

/* 0: wait for player input and asks to resize window
 * 1: title screen
 * 2: tutorial screen
 * 3: game
 * 4: game over */
// Hard to account for the initial window delay of processing. There will be an instruction telling the person to press any key, and it will start
let buttons = [];
let titleFont;
let buttonFont;

function killButtons() {
  for (let b of buttons) {
    b.decay = true;
    b.startTime = millis();
  }
}

function loopButtons() {
  for (let i = buttons.length - 1; i >= 0; i--) {
    if (buttons[i].deleteButton) {
      buttons.splice(i, 1);
    } else {
      buttons[i].update();
    }
  }
}

function spawnButtons() {
  if (screen === 1) { // Title screen
    buttons.push(new PlayButton());
    buttons.push(new Title("QUAD KILLER"));
    buttons.push(new Tutorial());
    
  } else if (screen === 2) { // Tutorial screen
    buttons.push(new GoBack());
    buttons.push(new Title("TUTORIAL"));
    buttons.push(new Text("Goal: Survive for as many waves as you can", 0.25 * height + 50));
    buttons.push(new Text("Use WASD to move", 0.25 * height + 100));
    buttons.push(new Text("Press Space to dash (Gives invincibility)", 0.25 * height + 150));
    buttons.push(new Text("Left Click to Slash (collects mana)", 0.25 * height + 200));
    buttons.push(new Text("Press Q to Fireball (Uses mana)", 0.25 * height + 250));
    buttons.push(new Text("Press E to Smash (Uses mana)", 0.25 * height + 300));
    buttons.push(new Text("Your mana bar is shown on the upper left corner", 0.25 * height + 350));
    buttons.push(new Text("Try to use abilities exactly after dash ends", 0.25 * height + 400));
  } else if (screen === 4) { // Game over screen
    buttons.push(new GameOver());
    buttons.push(new Text("YOU GOT TO WAVE " + wave, 0.5 * height));
    if (wave>= highestWave) {
      highestWave=wave;
    }
    buttons.push(new Text("HIGH SCORE " + highestWave, 0.5*height+100));
    
    buttons.push(new GoBack());
  }
}

function screenLoop() {
  background(0);
  for (let s of shapes) {
    s.update();
  }
  camPos.add(0, -1);

  // Render mouse particles
  for (let p of particles) {
    p.pos.add(0, 2);
    p.update();
  }

  ellipseMode(CENTER);
  let size = 50;
  particles.push(new Particle("ELLIPSE", 0, 0, size, size, new p5.Vector(mouseX, mouseY), 0, 500, color(180, 1, 0.7)));

  loopButtons();
}

// Abstract Button class
class Button {
  constructor() {
    this.pos = new p5.Vector();
    this.size = new p5.Vector();
    this.scale = 1;
    this.text = "";
    this.font = null;
    this.textSize = 25;
    this.alpha = 0.8;
    this.buttonCol = color(255);
    this.textCol = color(0);
    this.decay = false;
    this.deleteButton = false;

    // For smooth transitions, appear should be greater than decay
    this.startTime = millis(); // Initial time
    this.appearTime = 1000; // Time it takes for button to appear
    this.decayTime = 500; // Time it takes for button to fade out
  }

  update() {
    push();
    translate(this.pos.x, this.pos.y);
    scale(this.scale);

    // Drawn around 0,0
    if (testColl(new BoxColl(mouseX, mouseY, 25, 25, CENTER), new BoxColl(this.pos.x, this.pos.y, this.size.x * this.scale, this.size.y * this.scale, CENTER))) {
      // If mouse is hovering
      this.scale = lerp(this.scale, 1.5, 0.2);
      this.alpha = lerp(this.alpha, 1, 0.2);
    } else {
      this.scale = lerp(this.scale, 1, 0.2);
      this.alpha = lerp(this.alpha, 0.7, 0.2);
    }

    if (millis() < this.startTime + this.appearTime) {
      this.alpha = map(millis(), this.startTime, this.startTime + this.appearTime, 0, 0.7);
    }

    if (this.decay) {
      if (millis() > this.startTime + this.decayTime) {
        this.deleteButton = true;
      }
      this.alpha = map(millis(), this.startTime, this.startTime + this.decayTime, 0.7, 0);
    }

    noStroke();
    rectMode(CENTER);
    textAlign(CENTER, CENTER);
    textSize(this.textSize);
    textFont(this.font);
    fill(changeAlpha(this.buttonCol, this.alpha));
    rect(0, 0, this.size.x, this.size.y, 20);
    fill(changeAlpha(this.textCol, this.alpha));
    text(this.text, 0, 0);
    pop();
  }

  testClick() {
    if (!this.decay && map(millis(), this.startTime, this.startTime + this.appearTime, 0, 1) > 0.5) {
      if (testColl(new BoxColl(mouseX, mouseY, 25, 25, CENTER), new BoxColl(this.pos.x, this.pos.y, this.size.x * this.scale, this.size.y * this.scale, CENTER))) {
        this.scale = 1.7;
        this.onClick();
      }
    }
  }

  onClick() {
    throw new Error("onClick error");
  }
}
// PlayButton class
class PlayButton extends Button {
  constructor() {
    super();
    this.startTime = millis();
    this.text = "PLAY";
    this.pos.set(0.5 * width, 0.5 * height);
    this.size.set(200, 50);
    this.textCol = color(0, 0, 0);
    this.textSize = 25;
    this.buttonCol = color(360);
    this.font = buttonFont;
  }

  onClick() {
    killButtons();
    screen = 3;
    gameStart();
  }
}

// Tutorial class
class Tutorial extends Button {
  constructor() {
    super();
    this.startTime = millis();
    this.text = "TUTORIAL";
    this.pos.set(0.5 * width, 0.5 * height + 100);
    this.size.set(200, 50);
    this.textCol = color(0, 0, 0);
    this.textSize = 25;
    this.buttonCol = color(360);
    this.font = buttonFont;
  }

  onClick() {
    killButtons();
    screen = 2;
    spawnButtons();
  }
}

// Title class
class Title extends Button {
  constructor(text) {
    super();
    this.startTime = millis();
    this.text = text;
    this.pos.set(0.5 * width, 0.15 * height);
    this.size.set(1000, 100);
    this.textCol = color(360);
    this.textSize = 25;
    this.buttonCol = color(0);
    this.font = titleFont;
  }

  onClick() {
    // No action needed for title
  }
}

// GoBack class
class GoBack extends Button {
  constructor() {
    super();
    this.startTime = millis();
    this.text = "GO BACK";
    this.pos.set(0.5 * width, 0.9 * height);
    this.size.set(200, 50);
    this.textCol = color(0, 0, 0);
    this.textSize = 25;
    this.buttonCol = color(360);
    this.font = buttonFont;
  }

  onClick() {
    killButtons();
    screen = 1;
    spawnButtons();
  }
}

// GameOver class
class GameOver extends Button {
  constructor() {
    super();
    this.startTime = millis();
    this.text = "GAME OVER";
    this.pos.set(0.5 * width, 0.25 * height);
    this.size.set(1000, 100);
    this.textCol = color(0, 1, 1);
    this.textSize = 25;
    this.buttonCol = color(0);
    this.font = titleFont;
  }

  onClick() {
    // No action needed for game over
  }
}

// Text class
class Text extends Button {
  constructor(text, h) { // h is height where the text is
    super();
    this.startTime = millis();
    this.text = text;
    this.pos.set(0.5 * width, h);
    this.size.set(500, 50);
    this.textCol = color(0, 0, 0);
    this.textSize = 25;
    this.buttonCol = color(360);
    this.font = buttonFont;
  }

  onClick() {
    // No action needed for text
  }
}
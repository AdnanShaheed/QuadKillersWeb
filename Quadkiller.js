// Global variables
let objectCount = 0; // Tracks total object count and generates unique object IDs
let objs = []; // List of game objects
let textParticles = []; // List of text particles
let particles = []; // List of particles
let shapes = []; // Background shape effects
let grid; // Background grid
let mousePos = new p5.Vector(0, 0); // World coordinates for mouse (not screen)
let player = new Player(); // Player object
let bgMusic; // Background music
let ms; // Stores the time at the beginning of the frame
let killCount = 0; // Number of kills
let enemyCount = 0; // Number of enemies
let wave = 0; // Current wave (enemy spawning)
let highestWave = 0;
let magic = 0; // Spell level (increases when nail hits enemies, max is 32+wave)
let crossScale = 1; // Crosshair scale
let crossCol;

//load before the canvas is loaded
function preload() {
  bgMusic = loadSound("GameTrack.mp3"); // Load background music
}
// Screen and camera variables
let cnv; //canvas
let screen = 0; // Current screen state
let bgBrightness = 0; // Background brightness
let bgHue = 0; // Background hue (red by default)
let screenShake = new p5.Vector(0, 0); // Screen shake effect
let screenShakeScale = 1; // Screen shake scale
let camPos = new p5.Vector(200, 200); // Camera position
let camScale = 1; // Camera scale

// Input variables
let inputHeld = new Array(10).fill(false); // Boolean state of whether a key is held
let inputPressTime = new Array(10).fill(0); // Last time a key was pressed
let inputReleaseTime = new Array(10).fill(0); // Last time a key was released

// FPS variables
let dt; // Delta time (time between frames)
let lastTime = 0; // Last time FPS was calculated
let fpsText = ""; // FPS display text
 
// Setup function
function setup() {
  cnv=createCanvas(windowWidth/1.1, windowHeight/1.2, P2D); // Screen size ratio (random numbers)
  cnv.position((windowWidth-(windowWidth/1.1))/2, 0);
  colorMode(HSB, 360, 1, 1, 1);
  frameRate(100);
  bgMusic.loop(); // Loop background music
crossCol = color(0, 0, 1); // Crosshair color
  // Preload slash animation frames
  for (let i = 0; i < frameLength; i++) {
    slashFrame[i] = calcSlash((i + 1) / frameLength);
  }

  // Set fonts
  titleFont = loadFont("DataTransfer.ttf");
  buttonFont = loadFont("arial.ttf");

  // Create background shapes
  noStroke();
  rectMode(CENTER);
  ellipseMode(CENTER);
  for (let i = 0; i < 20; i++) {
    shapes.push(
      new Shape(
        "RECT",0,0,50,50,
        new p5.Vector(50, 50),
        random(0.5, 2),
        random(0, HALF_PI),
        random(0, 360), 1, 1, 0.2
      )
    );
    shapes.push(
      new Shape(
        "ELLIPSE", 0, 0, 50, 50,
        new p5.Vector(50, 50),
        random(0.5, 2), 0,
        random(0, 360), 1, 1, 0.2
      )
    );
    fill(random(0, 360), 1, 1, 0.2);
    shapes.push(
      new Shape(
        "TRIANGLE", -25, -25, 25, -25,
        new p5.Vector(50, 50),
        random(0.5, 2),
        random(0, HALF_PI),
        random(0, 360), 1, 1, 0.2, 0, 25
      )
    );
  }
}

// Draw function
function draw() {
  ms = millis();
  changeCanvas();
  if (screen === 0) {
    background(0);
    for (let s of shapes) {
      s.update();
    }
    camPos.add(0, -1);
    textAlign(CENTER, CENTER);
    textSize(30);
    fill(360, map(sin(TWO_PI * ms * 0.001), 0, 1, 0.7, 1));
    text("Quad Killers Demo", width / 2, height / 2);
    text("(click or press key to continue)", width / 2, height / 2 + 50);
  } else if (screen === 3) {
    gameLoop();
  } else {
    screenLoop();
  }
}

// Game start function
function gameStart() {
  player = new Player();
  player.init();
  player.pos.set(0, 0);
  camPos.set(0, 0);
  enemyCount = 0;
  objectCount = 0;
  wave = 0;
  killCount = 0;
  magic = 0;
  lastSpawn = millis() + 3000;
  objs = [];
  particles = [];
  textParticles = [];
}

// Game loop function
let lastSpawn = 1000; // Last time enemies were spawned
let subWave = 0; // Subwave counter
function gameLoop() {
  calcFps(); // Show FPS and calculate delta time
  bgBrightness = lerp(bgBrightness, 0, (0.2 * dt));
  background(bgHue, 1, bgBrightness);
  
  // Render background shapes (outside camera push/pop)
  for (let s of shapes) {
    s.update();
  }
  drawGrid(50);

  if (enemyCount === 0 && millis() > lastSpawn) {
    // Spawn next wave
    lastSpawn = millis() - 1000; // Instantly spawn a subwave
    wave++;
    subWave = wave;
  }

  if (millis() >= lastSpawn + 1000) {
    lastSpawn = millis();
    if (round(random(1, 5)) === 1) {
      objs.push(new EnemyExplosion(player.pos.copy()));
    }
    if (subWave > 0) {
      if (subWave < 5) {
        for (let i = 0; i < 2; i++) {
          let angle = random(0, TWO_PI);
          objs.push(
            new BasicEnemy(
              player.pos.x + 500 * cos(angle),
              player.pos.y + 500 * sin(angle)
            )
          );
        }
      } else if (subWave >= 5 && subWave < 10) {
        for (let i = 0; i < floor(wave / 5); i++) {
          let angle = random(0, TWO_PI);
          objs.push(
            new RangeEnemy(
              player.pos.x + 500 * cos(angle),
              player.pos.y + 500 * sin(angle)
            )
          );
        }
        let angle = random(0, TWO_PI);
        objs.push(
          new BasicEnemy(
            player.pos.x + 500 * cos(angle),
            player.pos.y + 500 * sin(angle)
          )
        );
      } else if (subWave >= 10) {
        let angle = random(0, TWO_PI);
        objs.push(
          new BasicEnemy(
            player.pos.x + 500 * cos(angle),
            player.pos.y + 500 * sin(angle)
          )
        );
        angle = random(0, TWO_PI);
        objs.push(
          new RocketEnemy(
            player.pos.x + 500 * cos(angle),
            player.pos.y + 500 * sin(angle)
          )
        );
      }
      subWave--;
    }
  }

  // Camera translations
  push();
  translate(screenShake.x, screenShake.y);
  translate(width / 2, height / 2); // Center the camera
  scale(camScale * screenShakeScale);
  translate(-camPos.x, -camPos.y);

  // Set mouse position based on camera scale and position
  mousePos.set(
    (mouseX - width / 2) / camScale + camPos.x,
    (mouseY - height / 2) / camScale + camPos.y
  );

  if (screenShake.mag() > 100) {
    screenShake.setMag(100);
  }
  screenShake.lerp(new p5.Vector(0, 0), 0.5 * dt);
  screenShakeScale = lerp(screenShakeScale, 1, 0.5 * dt);

  // Calculate average position of enemies
  let avgPos = new p5.Vector(0, 0);
  let avgCount = 0;
  for (let obj of objs) {
    if (obj.type[0]) {
      // If the object is an enemy
      avgPos.add(obj.pos);
      avgCount++;
    }
  }
  if (enemyCount === 0) {
    moveCamera(player.pos, player.pos, 200);
  } else {
    avgPos.div(avgCount);
    moveCamera(avgPos, player.pos, 200);
  }

  // Render floor particles
  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].deleteObject) {
      particles.splice(i, 1);
    } else {
      particles[i].update();
    }
  }

  // Delete objects
  for (let i = objs.length - 1; i >= 0; i--) {
    if (objs[i].deleteObject) {
      objs.splice(i, 1);
    }
  }
  
player.physUpdate();
  // Update player and objects
  for (let obj of objs) {
    obj.collUpdate();
    obj.physUpdate();
  }
  
  // Render text particles
  for (let i = textParticles.length - 1; i >= 0; i--) {
    if (textParticles[i].deleteObject) {
      textParticles.splice(i, 1);
    } else {
      textParticles[i].update();
    }
  }
  pop();

  // Crosshair rendering
  if (magic < 8) {
    crossCol = color(0, 1, 0.7);
  } else {
    crossCol = color(0, 0, 1);
  }
  push();
  translate(mouseX, mouseY);
  scale(crossScale);
  noFill();
  stroke(crossCol);
  strokeWeight(2);
  line(-20, 0, 20, 0);
  line(0, -20, 0, 20);
  strokeWeight(8);
  ellipseMode(CENTER);
  arc(0, 0, 50, 50, 0, map(magic, 0, 32+(4*wave), 0, TWO_PI), OPEN);
  pop();
  crossScale = lerp(crossScale, 1, 0.2);

  // Health and magic bars
  push();
  translate(25, 25);
  noStroke();
  if (magic < 8) {
    fill(0, 1, 0.7);
  } else {
    fill(0, 0, 1);
  }
  rectMode(CORNER);
  rect(0, 25, map(magic, 0, 32+(4*wave), 0, 200), 10);
  drawBar(player.health, 0, 100, 0, 200, 10);
  pop();

  // Kill counter
  push();
  translate(width / 2, height * 0.1);
  textAlign(CENTER, CENTER);
  textSize(100);
  fill(0, 0, 1);
  text("Wave: " + wave, 0, 0);
  pop();
}

// Move camera function
function moveCamera(a, b, margin) {
  let v1 = a.copy();
  let v2 = b.copy();

  let scaleX = width / (abs(v1.x - v2.x) + 2 * margin);
  let scaleY = height / (abs(v1.y - v2.y) + 2 * margin);

  camScale = lerp(
    camScale,
    constrain(min(scaleX, scaleY), 0, 1),
    constrain(0.05 * dt, 0, 1)
  );
  camPos.lerp(p5.Vector.lerp(a, b, 0.5), 0.05 * dt);
}

// Input handling
function getKeyIndex(key) {
  switch (key) {
    case " ":
      return 0;
    case "w":
    case "W":
      return 1;
    case "a":
    case "A":
      return 2;
    case "s":
    case "S":
      return 3;
    case "d":
    case "D":
      return 4;
    case "e":
    case "E":
      return 7;
    case "q":
    case "Q":
      return 8;
    default:
      return -1;
  }
}

function keyPressed() {
  let i = getKeyIndex(key);
  if (i !== -1) {
    inputHeld[i] = true;
    inputPressTime[i] = millis();
  }
  if (screen === 0) {
    screen = 1;
    spawnButtons();
  }
}

function keyReleased() {
  let i = getKeyIndex(key);
  if (i !== -1) {
    inputHeld[i] = false;
    inputReleaseTime[i] = millis();
  }
}

function mousePressed() {
  if (!bgMusic.isPlaying) {
    bgMusic.loop;
  }
  if (mouseButton === LEFT) {
    inputHeld[5] = true;
    inputPressTime[5] = millis();
  } else {
    inputHeld[6] = true;
    inputPressTime[6] = millis();
  }
  if (screen === 0) {
    screen = 1;
    spawnButtons();
  }
  for (let button of buttons) {
    button.testClick();
  }
}

function mouseReleased() {
  if (mouseButton === LEFT) {
    inputHeld[5] = false;
    inputReleaseTime[5] = millis();
  } else {
    inputHeld[6] = false;
    inputReleaseTime[6] = millis();
  }
}

// FPS calculation
function calcFps() {
  dt = constrain((60 * (millis() * 0.001 - lastTime)), 0, 3); // Target FPS is 60
  lastTime = millis() * 0.001;

  // Update FPS text
  if (frameCount % (int(frameRate() * 0.5) === 0)) {
    fpsText = round(60 / dt) + "fps";
  }
  fill(360);
  textAlign(RIGHT);
  textSize(15);
  text(fpsText, width - 5, 15);
}

//changes canvas as required, currently changes screen size based on browser dimensions
function changeCanvas () {
  resizeCanvas(windowWidth/1.1, windowHeight/1.2);
  cnv.position((windowWidth-(windowWidth/1.1))/2, 0);
}

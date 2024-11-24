class ArrayList extends Array {
    constructor() { super(...[]); }
    size() { return this.length; }
    add(x) { this.push(x); }
    get(i) { return this[i]; }
    remove(i) { this.splice(i, 1); }
  clear() {this.length=0;}
}
class Collider {
    getType() { }
    setPos(x, y) { }
    visualize(isTouching) { }
}

class GameObject {
    constructor() {
        this.deleteObject = false;
        this.pos = new p5.Vector();
        this.vel = new p5.Vector();
        this.scal = 1;
        this.targetScale = 1;
        this.rot = 0;
        this.targetRot = 0;
        this.id = 0;
        this.coll = new Collider();
        this.type = new Array(10).fill(false);
    }

    init() { }
    collUpdate() { }
    physUpdate() { }
    visUpdate() { }
}
var player;
var objectCount = 0; //global variable that tracks total object count and generates unique object ids
var objs = new ArrayList(); //list of all the objects (entities)
var textParticles = new ArrayList(); //list of all text particles (damage indicators)
var bgObjs = new ArrayList(); //list of all particles (trail effects)
var shapes = new ArrayList(); //background shape effect
var grid;
let m;
let bgm;
var ms; //stores the time at the beginning of the frame
var killCount = 0; //the amount of kills so far
var enemyCount = 0;
var wave; //what wave (enemy spawning)
var logTime = false; //Dev tool: whether or not to log how long each gameLoop section takes
var screen = 0;

var resolution = 10; //curve resolution of the image
var frameLength = 10; //The amount of preloaded frames that the slash is split into
var slashFrame = new Array(frameLength); //animation is split into 10 frames (this array is filled in setup)

//crosshair constants
var magic; //Spell level (will increase when nail hits enemies) (max is 32 magic)
var magicInf = false;
var crossScale = 1;
var crossCol; //color of the crosshair

// 0: wait for player input and asks to resize window
// 1: title screen
// 2: tutorial screen
// 3: game
// 4: game over
// 5: patch notes
// 6: tutorial end screen
// 7: world select
// 8: difficulty select

var buttons = new ArrayList();
var textBoxes = new ArrayList();
var titleFont;
var buttonFont;
var camPos;
var camScale = 1;


// Input section: Uses an array to track whether keys are pressed
// Each time a key is pressed or released, it will update the arrays
// It is used to track if multiple inputs are held at the same time
// 0: space, 1: w, 2: a, 3: s, 4: d, 5: m1, 6: m2, 7: e, 8: q
var inputHeld = new Array(9).fill(false); // Boolean state of whether the key is held
var inputPressTime = new Array(9).fill(0); // the last time the button was pressed
var inputReleaseTime = new Array(9).fill(0); // the last time the button was released

var worldDir = new Map();
var currentWorld = "RedWorld";
var gameMode = "normal";
function preload () {
  camPos=createVector(200,200);
}
// Collision Detection


class GroupColl extends Collider {
    addColl(coll) { }
    removeColl(index) { }
    getType() { }
    visualize(isTouching) { }
    setPos(x, y) { }
}

class BoxColl extends Collider {
    constructor() {
        super();
        this.p1 = new p5.Vector();
        this.p2 = new p5.Vector();
        this.center = new p5.Vector();
        this.size = new p5.Vector();
    }

    getType() {
        return 0;
    }

    setValues(a, b, c, d, mode) {
        switch (mode) {
            case "CORNER":
                this.p1.set(a, b);
                this.p2.set(a + c, b + d);
                this.center.set(a + c * 0.5, b + d * 0.5);
                this.size.set(c, d);
                break;

            case "CORNERS":
                if (a < c) {
                    this.p1.set(a, b);
                    this.p2.set(c, d);
                } else {
                    this.p1.set(c, b);
                    this.p2.set(a, d);
                }
                if (d < b) {
                    this.p1.y = d;
                    this.p2.y = b;
                }
                this.center.set(0.5 * (a + c), 0.5 * (b + d));
                this.size.set(Math.abs(c - a), Math.abs(d - b));
                break;

            case "CENTER":
                this.p1.set(a - 0.5 * c, b - 0.5 * d);
                this.p2.set(a + 0.5 * c, b + 0.5 * d);
                this.center.set(a, b);
                this.size.set(c, d);
                break;
        }
    }

    setPos(x, y) {
        this.setValues(x, y, this.size.x, this.size.y, CENTER);
    }

    visualize(isTouching) {
        rectMode(CORNERS);
        noFill();
        strokeWeight(1);
        if (isTouching) {
            stroke(255, 0, 0);
        } else {
            stroke(255);
        }
        rect(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
    }
}

class LineColl extends Collider {
    constructor() {
        this.p1 = createVector();
        this.p2 = createVector();
        this.boundingBox = new BoxColl(); //create reference instead of creating new box object every frame
    }

    getType() {
        return 1;
    }

    setValues(p1, p2) {
        this.setValues(p1.x, p1.y, p2.x, p2.y);
    }

    setValues(x1, y1, x2, y2) {
        this.p1.set(x1, y1);
        this.p2.set(x2, y2);
        this.boundingBox.setValues(x1, y1, x2, y2, CORNERS);
    }

    setPos(x, y) {
        //when called, translates by the midpoint instead
        const deltaPos = createVector(x, y).sub(p5.Vector.lerp(this.p1, this.p2, 0.5));
        this.p1.add(deltaPos);
        this.p2.add(deltaPos);
    }

    visualize(isTouching) {
        //draws the collision box on screen
        strokeWeight(1);
        if (isTouching) {
            stroke(255, 0, 0);
        } else {
            stroke(255);
        }
        line(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
    }
}
class CircleColl extends Collider {
    constructor() {
        super();
        this.center = createVector(); // center of circle
        this.radius; // radius of circle
        this.boundingBox = new BoxColl(); // create reference instead of creating new box object every frame
    }

    getType() {
        return 2;
    }

    setValues(x, y, r) {
        this.center.set(x, y);
        this.radius = r;
        this.boundingBox.setValues(x, y, 2 * r, 2 * r, CENTER);
    }

    setPos(x, y) {
        this.center.set(x, y);
        this.boundingBox.setPos(x, y);
    }

    visualize(isTouching) {
        // draws the hitbox on screen
        stroke(isTouching ? color(255, 0, 0) : color(255));
        ellipseMode(CENTER);
        noFill();
        ellipse(this.center.x, this.center.y, 2 * this.radius, 2 * this.radius);
    }
}
function BoxBoxColl(b1, b2) {
    //Utilizes the convention that x1 < x2 and y1 < y2
    //For example, if b1.x1 is greater than b2.x2, then b1.x2 must also be greater than b2.x2
    //Compares whether x bounds cross and whether y bounds cross independently
    let coll = !(b1.p1.x > b2.p2.x || b1.p2.x < b2.p1.x || b1.p1.y > b2.p2.y || b1.p2.y < b2.p1.y);
    return coll;
}
function BoxLineColl(b, l) {
    // First do a general bounding box collision detection before using detailed line collision
    if (!BoxBoxColl(b, l.boundingBox)) {
        return false;
    }

    // visualization of linear interpolation https://www.desmos.com/geometry/5nrvzkewdg
    let t1 = (b.p1.x - l.p1.x) / (l.p2.x - l.p1.x);
    let t2 = (b.p2.x - l.p1.x) / (l.p2.x - l.p1.x);
    let y1 = (1 - t1) * l.p1.y + l.p2.y * t1;
    let y2 = (1 - t2) * l.p1.y + l.p2.y * t2;

    // If y1 and y2 are on opposite sides of the box, then the line has to collide at some point
    // the boolean returns false only if both y values are either above or below the box
    return !((y1 < b.p1.y && y2 < b.p1.y) || (y1 > b.p2.y && y2 > b.p2.y));
}
function LineBoxColl(l, b) {
    return BoxLineColl(b, l);
}
function BoxCircleColl(b, c) {
    if (!BoxBoxColl(b, c.boundingBox)) {
        return false;
    }

    //general strategy: find the distance from the closest point to the circle center which is either the corner or the edge

    //distance from the center of the box to the center of the circle
    //if the distance is less than the size of the box (center of circle is inside the box)
    //then it will set it to 0
    let x = Math.abs(c.center.x - b.center.x) - b.size.x * 0.5;
    if (x < 0) {
        x = 0;
    }
    let y = Math.abs(c.center.y - b.center.y) - b.size.y * 0.5;
    if (y < 0) {
        y = 0;
    }
    return (x * x + y * y < Math.pow(c.radius, 2)); //use the distance squared to avoid using square root
}
const CircleBoxColl = (c, b) => {
    return BoxCircleColl(b, c);
}

function LineCircleColl(l, c) {
    if (false === BoxLineColl(c.boundingBox, l)) {
        return false;
    }

    let AB = p5.Vector.sub(l.p2, l.p1); // vector representing line (tail at p1, head at p2)
    let AC = p5.Vector.sub(c.center, l.p1); // vector between p1 and center of circle
    let ABmag = AB.mag();
    let dot = AB.dot(AC) / ABmag; // the parallel between
    if (dot >= ABmag) {
        return (p5.Vector.sub(l.p2, c.center).magSq() < sq(c.radius));
    } else if (dot <= 0) {
        return (p5.Vector.sub(l.p1, c.center).magSq() < sq(c.radius));
    }
    return (AC.magSq() - sq(dot) < sq(c.radius)); // using Pythagorean theorem
}
function CircleLineColl(circle, line) {
    return LineCircleColl(line, circle);
}

function CircleCircleColl(c1, c2) {
    // true if the distance between the centers are less than the sum of the radii
    return (Math.sqrt(Math.pow(c1.center.x - c2.center.x, 2) + Math.pow(c1.center.y - c2.center.y, 2)) < c1.radius + c2.radius);
}
function LineLineColl(line1, line2) {
    return BoxBoxColl(line1.boundingBox, line2.boundingBox);
}

var scal = 1;

class BgObj {
    constructor() {
        this.deleteObject = false;
    }

    update() {
        // to be implemented by subclasses
    }
}

class Particle extends BgObj {
    constructor(pos, maxScale, minScale, duration, decay, col, mode, px1, py1, px2, py2, px3=0, py3=0) {
        super();
        this.mode = mode;
      this.px1=px1;
      this.py1=py1;
      this.px2=px2;
      this.py2=py2;
      this.px3=px3;
      this.py3=py3;
        this.pos = pos;
        this.startScale = maxScale;
        this.endScale = minScale;
        this.duration = float(duration);
        this.decay = decay;
        this.col = new p5.Color(col);
        this.startTime = millis();
        this.p.fill(this.col);
    }

  render() {
    if (this.mode==="RECT") {
      rect(this.px1, this.py1, this.px2, this.py2)
    }
    if (this.mode==="ELLIPSE") {
      ellipse(this.px1, this.py1, this.px2, this.py2)
    }
    if (this.mode==="TRIANGLE") {
      triangle(this.px1, this.py1, this.px2, this.py2, this.px3, this.py3)
    }
  }
    update() {
        if (millis() < this.startTime + this.duration) {
            push();
            translate(this.pos.x, this.pos.y);
            scale(this.startScale);
            image(this.p, 0, 0);
            pop();
        } else if (millis() > this.startTime + this.duration + this.decay) {
            this.deleteObject = true;
        } else {
            let alpha = changeAlpha(this.col, map(millis(), this.startTime + this.duration, this.startTime + this.duration + this.decay, 1, 0));
            this.p.setFill(alpha);
            let scal = map(millis(), this.startTime + this.duration, this.startTime + this.duration + this.decay, this.startScale, this.endScale);
            push();
            translate(this.pos.x, this.pos.y);
            scale(scal);
          this.render();
          pop();
        }
    }
}
class Shape {
    constructor(size, factor, rot, mode, px1, py1, px2, py2, px3=0, py3=0) {
        this.mode = mode;
      this.px1=px1;
      this.py1=py1;
      this.px2=px2;
      this.py2=py2;
      this.px3=px3;
      this.py3=py3;
        this.size = size;
        this.factor = factor;
        this.rot = rot;
        this.spacing = 1000;
        this.spacing *= factor;
        this.pos = new p5.Vector(random(0, this.spacing), random(0, this.spacing));
    }
  
  render() {
    if (this.mode==="RECT") {
      rect(this.px1, this.py1, this.px2, this.py2)
    }
    if (this.mode==="ELLIPSE") {
      ellipse(this.px1, this.py1, this.px2, this.py2)
    }
    if (this.mode==="TRIANGLE") {
      triangle(this.px1, this.py1, this.px2, this.py2, this.px3, this.py3)
    }
  }

    update() {
        push();
        scale(camScale * this.factor);
        let x = this.pos.x - camPos.x % this.spacing;
        while (x + 0.5 * this.size.x >= 0) {
            x -= this.spacing;
        }
        while (x - 0.5 * this.size.x < width / (camScale * this.factor)) {
            let y = this.pos.y - camPos.y % this.spacing;
            while (y + 0.5 * this.size.y >= 0) {
                y -= this.spacing;
            }
            while (y - 0.5 * this.size.y < height / (camScale * this.factor)) {
                push();
                translate(x, y);
                rotate(this.rot);
                this.render();
                pop();
                y += this.spacing;
            }
            x += this.spacing;
        }
        pop();
    }
}
function drawGrid(spacing) {
    noFill();
    stroke(0, 0, 0.2);
    strokeWeight(1);
    push();
    scale(camScale);

    let x = -camPos.x % spacing;
    while (x >= 0) {
        x -= spacing;
    }
    while (x < width / camScale) {
        line(x, 0, x, height / camScale);
        x += spacing;
    }

    let y = -camPos.y % spacing;
    while (y >= 0) {
        y -= spacing;
    }
    while (y < height / camScale) {
        line(0, y, width / camScale, y);
        y += spacing;
    }

    pop();
}
function testColl(a, b) {
    if (!a || !b) {
        return false;
    }
    let aType = a.getType();
    let bType = b.getType();
    if (a.getType() === 3) {
        for (let c of a.colls) {
            if (testColl(c, b)) {
                return true;
            }
        }
        return false;
    } else if (b.getType() === 3) {
        for (let c of b.colls) {
            if (testColl(a, c)) {
                return true;
            }
        }
        return false;
    } else {
        let coll = false;
        switch (aType) {
            case 0:
                switch (bType) {
                    case 0:
                        coll = BoxBoxColl(a, b);
                        break;
                    case 1:
                        coll = BoxLineColl(a, b);
                        break;
                    case 2:
                        coll = BoxCircleColl(a, b);
                        break;
                }
                break;
            case 1:
                switch (bType) {
                    case 0:
                        coll = LineBoxColl(a, b);
                        break;
                    case 1:
                        coll = LineLineColl(a, b);
                        break;
                    case 2:
                        coll = LineCircleColl(a, b);
                        break;
                }
                break;
            case 2:
                switch (bType) {
                    case 0:
                        coll = CircleBoxColl(a, b);
                        break;
                    case 1:
                        coll = CircleLineColl(a, b);
                        break;
                    case 2:
                        coll = CircleCircleColl(a, b);
                        break;
                }
                break;
        }
        return coll;
    }
}


//stores the code for all of the enemies
class Enemy extends GameObject {
    //Parent class for all enemies (enemy classes inherit this one)
    //stores default methods for registering player attacks (slash, smash, fireball)
    //These methods can be overrided to change mechanics reacting to different attacks
    constructor() {
        super();
        this.separate = createVector(); //This vector stores the calculation that forces enemies to separate from eachother (calculated in collUpdate, used in physUpdate)
        this.calcSeparate = new Array(10).fill(false); //Whether or not to include this object type in separate calculations (same indices as type[])
        this.deltaPos = createVector(); //the displacement vector between the enemy pos and the player pos
        this.maxHealth = 50;
        this.health = 50;

        this.lastStun; //time when enemy was last stunned
        this.stunCooldown = 500; //duration of stun
        this.mode = "stun"; //move, stun
        enemyCount++;
    }

    collUpdate() {
        this.deltaPos = player.pos.copy().sub(this.pos);
        if (this.testColl(player.coll, this.coll)) {
            this.contactHit(player);
        }
        if (this.health == 0) {
            this.deleteObject = true;
            killCount++;
            enemyCount--;
            if (gameMode != "nohit" && healthCount < maxHealthCount && floor(random(1, 5)) == 1) { //20% chance to drop health packet
                objs.add(new Health(this.pos.copy()));
            }
        }
        if (this.mode == "stun" && ms >= this.lastStun + this.stunCooldown) { //remove stun if possible
            this.mode = "move";
        }
        this.separate.set(0, 0);
        for (let i = 0; i < objs.size(); i++) {
            let obj = objs.get(i);
            if (obj.id == this.id) { //skip self within loop
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
                if (obj.type[2] && this.testColl(obj.coll, this.coll) && this.deltaPos.copy().mult(-1).dot(mousePos.copy().sub(player.pos)) > 0) {
                    this.slashHit(obj);
                } else if (this.mode != "stun" && obj.type[3] && this.testColl(obj.coll, this.coll)) {
                    this.fireballHit(obj);
                } else if (obj.type[5] && this.testColl(this.coll, obj.coll)) {
                    this.smashHit(obj);
                } else if (obj.type[9] && this.testColl(this.coll, obj.coll)) {
                    this.pushHit(obj);
                } else {
                    continue;
                }
            } else if (obj.type[7] && this.testColl(this.coll, obj.coll)) {
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
        if (this.mode == "stun") {
            fill(30, 1, 1, 0.5);
            noStroke();
            circle(this.pos.x, this.pos.y, 150);
        }
        this.drawSprite();
        //draw healthbar
        push();
        translate(this.pos.x, this.pos.y - 40);
        drawBar(this.health, 0, 50, -25, 25, 10);
        pop();
    }

    //default code for receiving player attacks
    contactHit(obj) {
        player.onHit(this.deltaPos.copy().setMag(30), -10);
        this.vel.sub(this.deltaPos.copy().setMag(30));
        this.health = constrain(this.health - 5, 0, this.health);
        textParticles.add(new TextParticle("-5", random(500, 1000), this.pos.copy().add(random(-25, 25), random(-25, 25)), color(360)));
    }
    slashHit(obj) {
        if (magicInf) {
            magic = constrain(magic + 1, 0, 32 + (wave / 2));
        } else magic = constrain(magic + 1, 0, 32);
        if (obj.type[4]) {
            this.vel.add(mousePos.copy().sub(player.pos).setMag(75));
            screenShake.add(mousePos.copy().sub(player.pos).setMag(20 * camScale));
            this.health = constrain(this.health - 20, 0, this.health);
            textParticles.add(new TextParticle("-20", random(500, 1000), this.pos.copy().add(random(-25, 25), random(-25, 25)), color(180, 1, 1)));
        } else {
            this.vel.add(mousePos.copy().sub(player.pos).setMag(50));
            screenShake.add(mousePos.copy().sub(player.pos).setMag(10 * camScale));
            this.health = constrain(this.health - 10, 0, this.health);
            textParticles.add(new TextParticle("-10", random(500, 1000), this.pos.copy().add(random(-25, 25), random(-25, 25)), color(360)));
        }
    }
    fireballHit(obj) {
        this.mode = "stun";
        this.lastStun = ms;
        if (obj.type[4]) {
            this.health = constrain(this.health - 30, 0, this.health);
            textParticles.add(new TextParticle("-30", random(500, 1000), this.pos.copy().add(random(-25, 25), random(-25, 25)), color(180, 1, 1)));
            this.vel.add(obj.vel.copy().setMag(50));
            screenShake.add(mousePos.copy().sub(player.pos).setMag(20 * camScale));
        } else {
            this.health = constrain(this.health - 20, 0, this.health);
            textParticles.add(new TextParticle("-20", random(500, 1000), this.pos.copy().add(random(-25, 25), random(-25, 25)), color(360)));
            this.vel.add(obj.vel.copy().setMag(20));
            screenShake.add(mousePos.copy().sub(player.pos).setMag(10 * camScale));
        }
    }
    smashHit(obj) {
        this.mode = "stun";
        this.lastStun = ms;
        if (obj.type[4]) {
            this.health = constrain(this.health - 30, 0, this.health);
            textParticles.add(new TextParticle("-30", random(500, 1000), this.pos.copy().add(random(-25, 25), random(-25, 25)), color(180, 1, 1)));
            this.vel.sub(obj.pos.copy().sub(this.pos).setMag(50));
            screenShake.add(mousePos.copy().sub(player.pos).setMag(20 * camScale));
        } else {
            this.health = constrain(this.health - 20, 0, this.health);
            textParticles.add(new TextParticle("-20", random(500, 1000), this.pos.copy().add(random(-25, 25), random(-25, 25)), color(360)));
            this.vel.sub(obj.pos.copy().sub(this.pos).setMag(50));
            screenShake.add(mousePos.copy().sub(player.pos).setMag(10 * camScale));
        }
    }
    pushHit(obj) {
        this.mode = "stun";
        if (obj.type[4]) {
            this.vel.mult(3).sub(obj.pos.copy().sub(this.pos).setMag(75));
            screenShake.add(mousePos.copy().sub(player.pos).setMag(20 * camScale));
        } else {
            this.vel.mult(3).sub(obj.pos.copy().sub(this.pos).setMag(50));
            screenShake.add(mousePos.copy().sub(player.pos).setMag(10 * camScale));
        }
    }
    explodeHit(obj) {
        this.mode = "stun";
        this.lastStun = ms;
        this.health = constrain(this.health - 10, 0, this.health);
        textParticles.add(new TextParticle("-10", random(500, 1000), this.pos.copy().add(random(-25, 25), random(-25, 25)), color(360)));
        this.vel.sub(obj.pos.copy().sub(this.pos).setMag(30));
        screenShake.add(p5.Vector.sub(this.pos, obj.pos).setMag(10 * camScale));
    }

    runBehavior() { } //children will override this method with movement code (called before drawSprite)
    drawSprite() { } //Children will override this method with the code to draw the sprite
    regularMotion() { //Whether or not to use normal position and velocity motion
        return true;
    }
}
var BasicEnemySprite;

function initBasicEnemySprite() {
    let p = createGraphics(80, 80, P2D);
    p.beginShape();
    p.translate(40, 40);
    p.colorMode(HSB, 360, 1, 1, 1);
    p.noStroke();
    p.rectMode(CENTER);
    p.fill(0, 0, 0.5); //gray
    for (let i = 0; i < 8; i++) {
        let angle = map(i, 0, 8, 0, TAU);
        p.push();
        p.translate(20 * Math.cos(angle), 20 * Math.sin(angle));
        p.rotate(angle + HALF_PI);
        p.triangle(-5, 0, 5, 0, 0, -20);
        p.pop();
    }

    p.noStroke();
    p.fill(0, 1, 0.5); //dark red
    p.circle(0, 0, 50);
    p.endShape();
    BasicEnemySprite = p;
}

class BasicEnemy extends Enemy {
    constructor(x, y) {
        super();
        this.lastTeleport = ms;
        this.teleportCooldown = 5000;
        this.pos.set(x, y);
        this.init();
    }

    init() {
        this.health = 50;
        this.coll = new CircleColl(this.pos.x, this.pos.y, 25);
        this.lastTeleport = ms;
        this.type[0] = true;
        this.calcSeparate[0] = true;
        ellipseMode(CENTER);
        noStroke();
        fill(0);
        bgObjs.add(new Particle(createShape(ELLIPSE, 0, 0, 300, 300), this.pos.copy(), 0, 1000, color(30, 1, 0.5)));
    }

    runBehavior() {
        if (this.mode === "move" && this.vel.mag() < 5) {
            this.vel.add(this.deltaPos.copy().setMag(2).add(this.separate.copy().setMag(1)).setMag(1 * dt));
        }

        if (ms >= this.lastTeleport + this.teleportCooldown) {
            this.lastTeleport = ms;
            this.teleportCooldown = round(random(5000, 10000));
            let angle = player.pos.copy().sub(mousePos).heading() + random(-HALF_PI, HALF_PI);
            this.pos.set(player.pos.copy().add(p5.Vector.fromAngle(angle).setMag(500)));
            ellipseMode(CENTER);
            noStroke();
            fill(0);
            bgObjs.add(new Particle(createShape(ELLIPSE, 0, 0, 300, 300), this.pos.copy(), 0, 1000, color(30, 1, 0.5)));
        }
    }

    drawSprite() {
        push();
        translate(this.pos.x, this.pos.y);
        imageMode(CENTER);
        image(BasicEnemySprite, 0, 0);
        pop();
    }
}
let RangeEnemySprite;

function initRangeEnemySprite() {
  let p = createGraphics(80 * scal, 80 * scal, P2D);
  p.beginShape();
  p.translate(25 * scal, 25 * scal);
  p.scale(scal);
  p.colorMode(HSB, 360, 1, 1, 1);
  p.noStroke();
  p.rectMode(CENTER);
  p.fill(0, 1, 0.5);
  p.rect(20, 0, 30, 30);
  p.rect(30, 0, 40, 20);
  p.fill(0, 1, 0.7);
  p.circle(0, 0, 50);
  p.endShape();
  RangeEnemySprite = p;
}
class RangeEnemy extends Enemy {
  constructor(x, y) {
    super();
    this.lastShoot = 0; //Time the last shot was fired
    this.shootCooldown = 3000; //Cooldown in between shots
    this.pos.set(x, y);
    this.init();
  }
  init() {
    this.coll = new CircleColl(this.pos.x, this.pos.y, 25); //radius not diameter
    this.lastShoot = ms;
    this.type[0] = true; //set enemy type to true
    this.calcSeparate[0] = true; //set enemy separate to true

    //draw spawn particle
    ellipseMode(CENTER);
    noStroke();
    fill(0);
    bgObjs.add(new Particle(ellipse(0, 0, 300, 300), this.pos.copy(), 0, 1000, color(30, 1, 0.5)));
  }
  runBehavior() {
    //move closer
    if (this.mode === "move") { //maxspeed is 3
      if (PVector.sub(player.pos, this.pos).magSq() > sq(1000)) { //teleport if too far away from player
        let angle = player.pos.copy().sub(mousePos).heading() + random(-HALF_PI, HALF_PI);
        this.pos.set(player.pos.copy().add(PVector.fromAngle(angle).setMag(500)));
        ellipseMode(CENTER);
        noStroke();
        fill(0);
        bgObjs.add(new Particle(ellipse(0, 0, 300, 300), this.pos.copy(), 0, 1000, color(30, 1, 0.5)));
      }
      let v; //temporary vector used to calculate velocity
      if (this.deltaPos.magSq() >= sq(400)) { //if player is outside range, move closer
        v = PVector.add(this.separate.copy().setMag(1), this.deltaPos.copy().setMag(2)); //THIS VECTOR IS NOT NORMALIZED
      } else if (this.deltaPos.magSq() <= sq(300)) { //move away from player
        v = PVector.add(this.separate.copy().setMag(1), this.deltaPos.copy().setMag(-2)); //THIS VECTOR IS NOT NORMALIZED
      } else {
        v = this.separate.copy(); //THIS VECTOR IS NOT NORMALIZED
      }
      if (this.vel.magSq() <= sq(9)) { //if under max speed, use acceleration value
        this.vel.add(v.setMag(1 * dt));
      }

      if (ms >= this.lastShoot + this.shootCooldown) {
        this.lastShoot = ms;
        this.shoot();
      }
    }
  }
  shoot() { //Override this method to change the bullet type
    this.objs.add(new EnemyBullet(this.pos.copy(), this.deltaPos.copy().setMag(10)));
  }
  drawSprite() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.deltaPos.heading());
    imageMode(CENTER);
    image(RangeEnemySprite, 0, 0);
    pop();
  }
}

// Define RocketEnemySprite and initialize it
let RocketEnemySprite;

function initRocketEnemySprite() {
    let p = createGraphics(80 * scal, 80 * scal, P2D);
    p.beginShape();
    p.translate(40 * scal, 40 * scal);
    p.scale(scal);
    p.colorMode(HSB, 360, 1, 1, 1);
    p.noStroke();
    p.fill(0, 1, 0.5);
    p.triangle(0, 0, 50, 25, 50, -25);
    p.fill(0, 1, 0.7);
    p.circle(0, 0, 50);
    p.endShape();
    RocketEnemySprite = p;
}
// Define RocketEnemy class and its methods
class RocketEnemy extends RangeEnemy {
    constructor(x, y) {
        super(x, y);
    }

    shoot() {
        objs.add(new Rocket(pos.copy(), p5.Vector.random2D().setMag(5)));
    }

    drawSprite() {
        push();
        translate(pos.x, pos.y);
        rotate(deltaPos.heading());
        imageMode(CENTER);
        image(RocketEnemySprite, 0, 0);
        pop();
    }
}

// Define EnemyHealerSprite and initialize it
let EnemyHealerSprite;

function initEnemyHealerSprite() {
    let p = createGraphics(80 * scal, 80 * scal, P2D);
    p.beginShape();
    p.translate(40 * scal, 40 * scal);
    p.scale(scal);
    p.colorMode(HSB, 360, 1, 1, 1);
    p.noStroke();
    p.fill(0, 1, 0.5);
    p.rectMode(CENTER);
    p.rect(0, 0, 50, 50);
    p.fill(0, 0, 0.7);
    p.rect(0, 0, 10, 30);
    p.rect(0, 0, 30, 10);
    p.endShape();
    EnemyHealerSprite = p;
}

// Define EnemyHealer class and its methods
class EnemyHealer extends RangeEnemy {
    constructor(x, y) {
        super(x, y);
        coll = new BoxColl(pos.x, pos.y, 50, 50, CENTER);
    }

    shoot() {
        for (let obj of objs) {
            if (obj.type[0] && testColl(new CircleColl(pos.x, pos.y, 300), obj.coll)) {
                let enemyObj = obj;
                if (enemyObj.health < enemyObj.maxHealth) {
                    textParticles.add(new TextParticle("+10", random(500, 1000), enemyObj.pos.copy().add(random(-25, 25), random(-25, 25)), color(120, 1, 1)));
                }
                enemyObj.health = constrain(enemyObj.health + 10, 0, enemyObj.maxHealth);
            }
        }
        noStroke();
        fill(120, 1, 0.7);
        ellipseMode(CENTER);
        bgObjs.add(new Particle(createShape(ELLIPSE, 0, 0, 600, 600), pos.copy(), 0, 500, color(120, 1, 0.5)));
    }

    drawSprite() {
        push();
        translate(pos.x, pos.y);
        imageMode(CENTER);
        image(EnemyHealerSprite, 0, 0);
        pop();
    }
}
class NeutralExplosion extends GameObject {
    constructor(pos, radius, delay) {
        super();
        this.radius = radius;
        this.startTime = millis();
        this.delay = delay;
        this.animTime = 100;
        this.decay = 500;
        this.isExploded = false;
        this.pos = pos;
        this.type[7] = true;
    }

    init() {
        this.startTime = millis();
        this.type[7] = true;
    }

    collUpdate() {
        if (this.startTime + this.delay < millis() && millis() < this.startTime + this.delay + this.animTime) {
            if (this.coll == null && !this.isExploded) {
                this.coll = new CircleColl(this.pos.x, this.pos.y, this.radius);
                this.isExploded = true;
                screenShake.add(player.pos.copy().sub(this.pos).setMag(30));
            } else if (this.isExploded && this.coll !== null) {
                this.coll = null;
            }
            if (testColl(this.coll, player.coll)) {
                player.onHit(player.pos.copy().sub(this.pos).setMag(50), -20);
            }
        } else {
            this.coll = null;
        }
    }

    physUpdate() {
        let d = 1;
        let a = 1;
        if (millis() < this.startTime + this.delay) {
            pushMatrix();
            translate(this.pos.x, this.pos.y);
            rotate(radians(45));
            fill(0, 1, 1, map(cos(TAU * millis() * 0.001), -1, 1, 0.1, 0.3));
            stroke(0, 0, 1);
            strokeWeight(1);
            circle(0, 0, 2 * this.radius);
            fill(0, 1, 1, map(cos(TAU * millis() * 0.001), -1, 1, 0.3, 0.5));
            noStroke();
            circle(0, 0, 150);
            fill(0, 1, 1);
            rectMode(CENTER);
            rect(0, 0, 20, 100);
            rect(0, 0, 100, 20);
            popMatrix();
        } else if (millis() < this.startTime + this.delay + this.animTime) {
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

class EnemyBullet extends Enemy {
    constructor(pos, vel) {
        super(pos, vel);
        this.startTime = millis();
        this.duration = 5000;
    }

    init() {
        this.coll = new CircleColl(this.pos.x, this.pos.y, 15);
        this.startTime = millis();
        enemyCount--;
    }

    slashHit(obj) {
        this.vel.add(mousePos.copy().sub(player.pos).setMag(30));
    }

    fireballHit(obj) {
        this.deleteObject = true;
        this.coll = null;
    }

    smashHit(obj) {
        this.vel.set(p5.Vector.sub(this.pos, obj.pos).setMag(50));
    }

    explodeHit(obj) {
        this.vel.set(p5.Vector.sub(this.pos, obj.pos).setMag(50));
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
        this.drawSprite();
    }

    drawSprite() {
        fill(0, 1, 1);
        noStroke();
        circle(this.pos.x, this.pos.y, 30);
    }
}

class InvincBullet extends EnemyBullet {
    constructor(pos, vel) {
        super(pos, vel);
    }

    slashHit(obj) {
        if (obj.type[4]) {
            this.vel.add(mousePos.copy().sub(player.pos).setMag(30));
        } else {
            screenShake.add(p5.Vector.sub(mousePos, player.pos).setMag(20));
        }
    }

    drawSprite() {
        fill(180, 1, 0.5);
        noStroke();
        circle(this.pos.x, this.pos.y, 30);
    }
}

let RocketFuse;
let RocketFly;

function initRocketSprite() {
    let fuse = createGraphics(400, 400, P2D);
    fuse.beginShape();
    fuse.translate(200 * scal, 200 * scal);
    fuse.scale(scal);
    fuse.colorMode(HSB, 360, 1, 1, 1);
    fuse.strokeWeight(1);
    fuse.stroke(0, 0, 1);
    fuse.noFill();
    fuse.circle(0, 0, 400);
    fuse.noStroke();
    fuse.fill(0, 1, 1, 0.2);
    fuse.circle(0, 0, 400);
    fuse.endShape();
    RocketFuse = fuse;

    let fly = createGraphics(80, 80, P2D);
    fly.beginShape();
    fly.translate(40 * scal, 40 * scal);
    fly.scale(scal);
    fly.colorMode(HSB, 360, 1, 1, 1);
    fly.fill(0, 0, 0.7);
    fly.noStroke();
    fly.rectMode(CENTER);
    fly.rect(0, 0, 40, 20);
    fly.fill(0, 1, 1);
    fly.quad(10, 15, 15, 0, 10, -15, 35, 0);
    fly.triangle(-20, 10, -25, 20, 0, 10);
    fly.triangle(-20, -10, -25, -20, 0, -10);
    fly.endShape();
    RocketFly = fly;
}

class Rocket extends Enemy {
    constructor(pos, vel) {
        super(pos, vel);
        this.startTime;
        this.fuseTime = 500;
        this.animTime = 100;
        this.decayTime = 500;
    }

    init() {
        this.coll = new CircleColl(this.pos.x, this.pos.y, 25);
        this.mode = "fly";
        this.type[0] = false;
        enemyCount--;
        this.type[6] = true;
        this.calcSeparate[6] = true;
    }

    contactHit(obj) {
        this.startExplode();
    }

    slashHit(obj) {
        this.startTime = millis();
        this.mode = "fuse";
        if (obj.type[4]) {
            this.vel.add(mousePos.copy().sub(player.pos).setMag(75));
        } else {
            this.vel.add(mousePos.copy().sub(player.pos).setMag(50));
        }
    }

    fireballHit(obj) {
        if (this.mode == "fly") {
            this.startExplode();
        }
    }

    smashHit(obj) {
        if (this.mode == "fly") {
            this.startExplode();
        }
    }

    explodeHit(obj) {
        this.startTime = millis();
        this.mode = "fuse";
        this.vel.add(p5.Vector.sub(this.pos, obj.pos).setMag(30));
    }

    startExplode() {
        objs.add(new NeutralExplosion(this.pos.copy(), 200, 0));
        this.deleteObject = true;
    }

    physUpdate() {
        if (this.vel.magSq() < sq(10)) {
            this.vel.add(this.deltaPos.copy().setMag(3).add(this.separate.copy().setMag(2)).add(this.vel.copy().setMag(10)).setMag(2 * dt));
        }
        this.vel.lerp(0, 0, 0, 0.2 * dt);
        this.pos.add(this.vel.copy().mult(dt));
        this.coll.setPos(this.pos);

        let size = random(30, 50);
        if (this.mode == "fuse") {
            if (millis() >= this.startTime + this.fuseTime) {
                this.startExplode();
            }
        }
        this.drawSprite();
    }

    drawSprite() {
        if (this.mode == "fly" || this.mode == "fuse") {
            push();
            translate(this.pos.x, this.pos.y);
            rotate(this.vel.heading());
            if (this.mode == "fuse") {
                imageMode(CENTER);
                image(RocketFuse, 0, 0);
            }
            noStroke();
            imageMode(CENTER);
            image(RocketFly, 0, 0);
            pop();
        }
    }
}
let BulletBossSprite;

function initBulletBossSprite(upScale) {
    let p = createGraphics(Math.floor(325 * upScale), Math.floor(325 * upScale));
    p.beginShape();
    p.colorMode(HSB, 360, 1, 1, 1);
    p.push();
    p.translate(p.width * 0.5, p.height * 0.5);
    p.scale(upScale);

    p.noStroke();
    let amount = 12; //amount of barrels
    for (let i = 0; i < amount; i++) {
        let angle = map(i, 0, amount, 0, TAU);
        p.pushMatrix();
        p.translate(90 * Math.cos(angle), 90 * Math.sin(angle));
        p.rotate(angle);
        p.fill(0, 1, 0.5);
        p.rectMode(CORNER);
        p.rect(0, -25, 30, 50); //big gun rect
        p.rect(30, -15, 30, 30); //small gun rect
        p.fill(0, 1, 0.7);
        p.rect(0, -15, 20, 30); //big gun rect
        //p.rect(20, -5, 20, 10); //small gun rect
        p.popMatrix();
    }

    p.fill(0, 1, 0.7);
    p.circle(0, 0, 200);
    p.fill(0, 1, 0.8);
    p.circle(0, 0, 180);
    p.fill(0, 1, 1);
    p.circle(0, 0, 160);
    p.pop();
    p.endShape();
    BulletBossSprite = p;
}

class BulletBoss extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.lastShoot = 0;
        this.shootCooldown = 400; //1 sec
    }

    init() {
        this.type[0] = true; //type enemy
        this.type[8] = true; //type boss
        this.coll = new CircleColl(this.pos.x, this.pos.y, 120 * scal);
        this.health = 200;
        this.maxHealth = 200;
        enemyCount--; //doesn't count towards enemy wave spawning
        this.targetScale = 1.5;

        bgObjs.add(new PullVisual(this)); //temporary add pull effect
    }

    runBehavior() {
        player.vel.add(deltaPos.copy().setMag(-1 * dt));

        if (this.mode === "move") {
            if (p5.Vector.sub(player.pos, this.pos).magSq() > sq(1200)) {
                let angle = player.pos.copy().sub(mousePos).heading() + random(-HALF_PI, HALF_PI);
                this.pos.set(player.pos.copy().add(p5.Vector.fromAngle(angle).setMag(700)));
                noStroke();
                fill(30, 1, 1, 0.5);
                ellipseMode(CENTER);
                bgObjs.add(new Particle(createShape(ELLIPSE, 0, 0, 400, 400), this.pos, 0, 300, color(30, 1, 1, 0.5)));
            }

            if (ms >= this.lastShoot + this.shootCooldown) {
                this.lastShoot = ms;
                this.shoot();
            }
            this.rot = lerp(this.rot, this.targetRot, 0.2 * dt);
            scal = lerp(scal, this.targetscal, 0.2 * dt);
        }

        push();
        translate(this.pos.x, this.pos.y);
        noFill();
        strokeWeight(constrain(map(deltaPos.mag(), 1000, 1200, 1, 8), 1, 8));
        stroke(0, 1, 1);
        circle(0, 0, 2400);
        pop();
    }

    shoot() {
        this.targetRot += radians(15);
        this.scal *= 1.2;
        for (let i = 0; i < 12; i++) {
            let angle = this.rot + map(i, 0, 12, 0, TAU);
            if (floor(random(1, 3)) === 1) {
                objs.add(new EnemyBullet(this.pos.copy().add(p5.Vector.fromAngle(angle).setMag(120 * scal)), p5.Vector.fromAngle(angle).setMag(5)));
            } else {
                objs.add(new InvincBullet(this.pos.copy().add(p5.Vector.fromAngle(angle).setMag(120 * scal)), p5.Vector.fromAngle(angle).setMag(5)));
            }
        }
    }

    summonExplosionArray() {
        let spacing = 150;
        let x = player.pos.x - spacing * 5;
        while (x < player.pos.x + spacing * 5) {
            objs.add(new NeutralExplosion(createVector(x, player.pos.y), 50, 1500));
            x += spacing;
        }
    }

    drawSprite() {
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.rot);
        scale(scal / 2);
        imageMode(CENTER);
        image(BulletBossSprite, 0, 0);
        pop();
    }
}

class World {
    constructor(worldType) {
        this.worldType = worldType;
    }

    difficulty() {
        if (this.gameMode === "nohit") {
            this.player.health = 10;
            this.player.maxHealth = 100;
        }
        if (this.gameMode === "normal" || this.gameMode === "doublehit") {
            this.player.health = 100;
            this.player.maxHealth = 100;
        }
    }

    gameStart() {
        // Code for starting the game
    }

    setWorld() {
        // Code for changing the background shapes depending on the selected world
    }

    enemySpawn() {
        // Code for spawning enemies
    }
}
class RedWorld extends World {
    RedWorld() {
        this.worldType = "RedWorld";
    }

    gameStart() {
        player = new Player(0, 0);

        camPos.set(0, 0);
        enemyCount = 0;
        objectCount = 0;
        wave = 0;
        killCount = 0;
        magic = 0;
        lastSpawn = ms + 3000;
        objs.clear();
        bgObjs.clear();
        textParticles.clear();
    }

    enemySpawn() {
        if (this.enemyCount == 0 && ms > this.lastSpawn && this.subWave == 0) { //spawn in next wave
            this.lastSpawn = ms - 1000; //instantly spawns a subwave
            this.wave++;
            this.subWave = this.wave;
        }
        if (ms >= this.lastSpawn + 1000) {
            this.lastSpawn = ms;
            if (Math.round(Math.random() * 5) == 1) {
                this.objs.add(new NeutralExplosion(this.player.pos.copy(), 400, 1500));
            }
            if (this.subWave > 0) {
                let mod = this.subWave % 20 + 1; //temp variable to store the mod of subWave
                let ceil = Math.ceil(this.subWave / 20); //temp variable stores floor (used for multiplying enemy count per wave)
                if (mod < 5) {
                    for (let i = 0; i < 2 * ceil; i++) {
                        let angle = Math.random() * Math.PI * 2;
                        this.objs.add(new BasicEnemy(this.player.pos.x + 500 * Math.cos(angle), this.player.pos.y + 500 * Math.sin(angle)));
                    }
                } else if (5 < mod && mod <= 10) {
                    for (let i = 0; i < ceil; i++) {
                        let angle = Math.random() * Math.PI * 2;
                        this.objs.add(new BasicEnemy(this.player.pos.x + 500 * Math.cos(angle), this.player.pos.y + 500 * Math.sin(angle)));
                    }
                    for (let i = 0; i < ceil; i++) {
                        let angle = Math.random() * Math.PI * 2;
                        this.objs.add(new RangeEnemy(this.player.pos.x + 500 * Math.cos(angle), this.player.pos.y + 500 * Math.sin(angle)));
                    }
                } else if (10 < mod && mod <= 15) {
                    for (let i = 0; i < ceil; i++) {
                        let angle = Math.random() * Math.PI * 2;
                        this.objs.add(new BasicEnemy(this.player.pos.x + 500 * Math.cos(angle), this.player.pos.y + 500 * Math.sin(angle)));
                    }
                    for (let i = 0; i < ceil; i++) {
                        let angle = Math.random() * Math.PI * 2;
                        this.objs.add(new EnemyHealer(this.player.pos.x + 500 * Math.cos(angle), this.player.pos.y + 500 * Math.sin(angle)));
                    }
                } else if (15 < mod && mod <= 20) {
                    for (let i = 0; i < ceil; i++) {
                        let angle = Math.random() * Math.PI * 2;
                        this.objs.add(new BasicEnemy(this.player.pos.x + 500 * Math.cos(angle), this.player.pos.y + 500 * Math.sin(angle)));
                    }
                    for (let i = 0; i < ceil; i++) {
                        let angle = Math.random() * Math.PI * 2;
                        this.objs.add(new RocketEnemy(this.player.pos.x + 500 * Math.cos(angle), this.player.pos.y + 500 * Math.sin(angle)));
                    }
                }
                this.subWave--;
            }
        }
    }

    setWorld() {
        initBasicEnemySprite();
        initRangeEnemySprite();
        initRocketEnemySprite();
        initEnemyHealerSprite();
        initRocketSprite();
        shapes.clear();
        rectMode(CENTER);
        ellipseMode(CENTER);
        noStroke();
        for (let i = 0; i < 10; i++) { //create background particle
            fill(Math.random() * 45, 1, 1, 0.2);
            shapes.add(new Shape(createVector(50, 50), Math.random() * 0.5 + 0.5, 0, "ELLIPSE",0, 0, 50, 50));
            fill(0, 0, Math.random() * 0.7 + 0.1, 0.2);
            shapes.add(new Shape(createVector(50, 50), Math.random() * 0.5 + 0.5, 0, "ELLIPSE", 0, 0, 50, 50));
        }
    }
}
class WhiteWorld extends World {
    constructor() {
        super();
        this.worldType = "WhiteWorld";
    }

    gameStart() {
        this.player = new Player(0, 0);
        this.camPos.set(0, 0);
        this.enemyCount = 0;
        this.objectCount = 0;
        this.wave = 15;
        this.killCount = 0;
        this.magic = 0;
        this.lastSpawn = ms + 3000;
        this.objs.clear();
        this.bgObjs.clear();
        this.textParticles.clear();
    }

    enemySpawn() {
        if (this.enemyCount == 0 && ms > this.lastSpawn && this.subWave == 0) {
            this.lastSpawn = ms - 1000;
            this.wave++;
            this.subWave = this.wave;
        }
        if (ms >= this.lastSpawn + 1000) {
            this.lastSpawn = ms;
            if (Math.round(Math.random(1, 5)) === 1) {
                this.objs.add(new NeutralExplosion(this.player.pos.copy(), 400, 1500));
            }
            if (this.subWave > 0) {
                let mod = this.subWave % 20 + 1;
                let ceil = Math.ceil(this.subWave / 20);
                if (mod < 5) {
                    for (let i = 0; i < 2 * ceil; i++) {
                        let angle = Math.random(0, Math.TAU);
                        this.objs.add(new BasicEnemy(this.player.pos.x + 500 * Math.cos(angle), this.player.pos.y + 500 * Math.sin(angle)));
                    }
                } else if (5 < mod && mod <= 10) {
                    for (let i = 0; i < ceil; i++) {
                        let angle = Math.random(0, Math.TAU);
                        this.objs.add(new BasicEnemy(this.player.pos.x + 500 * Math.cos(angle), this.player.pos.y + 500 * Math.sin(angle)));
                    }
                    for (let i = 0; i < ceil; i++) {
                        let angle = Math.random(0, Math.TAU);
                        this.objs.add(new RangeEnemy(this.player.pos.x + 500 * Math.cos(angle), this.player.pos.y + 500 * Math.sin(angle)));
                    }
                } else if (10 < mod && mod <= 15) {
                    for (let i = 0; i < ceil; i++) {
                        let angle = Math.random(0, Math.TAU);
                        this.objs.add(new BasicEnemy(this.player.pos.x + 500 * Math.cos(angle), this.player.pos.y + 500 * Math.sin(angle)));
                    }
                    for (let i = 0; i < ceil; i++) {
                        let angle = Math.random(0, Math.TAU);
                        this.objs.add(new EnemyHealer(this.player.pos.x + 500 * Math.cos(angle), this.player.pos.y + 500 * Math.sin(angle)));
                    }
                } else if (15 < mod && mod <= 20) {
                    for (let i = 0; i < ceil; i++) {
                        let angle = Math.random(0, Math.TAU);
                        this.objs.add(new BasicEnemy(this.player.pos.x + 500 * Math.cos(angle), this.player.pos.y + 500 * Math.sin(angle)));
                    }
                    for (let i = 0; i < ceil; i++) {
                        let angle = Math.random(0, Math.TAU);
                        this.objs.add(new RocketEnemy(this.player.pos.x + 500 * Math.cos(angle), this.player.pos.y + 500 * Math.sin(angle)));
                    }
                }
                this.subWave--;
            }
        }
    }

    setWorld() {
        initBasicEnemySprite();
        initRangeEnemySprite();
        initRocketEnemySprite();
        initEnemyHealerSprite();
        initRocketSprite();
        shapes.clear();
        rectMode(CENTER);
        ellipseMode(CENTER);
        noStroke();
        for (let i = 0; i < 10; i++) {
            fill(255);
            shapes.add(new Shape(createVector(50, 50), Math.random() * 2, 0, "ELLIPSE", 0, 0, 5, 5));
            shapes.add(new Shape(createVector(50, 50), Math.random() * 2, 0, "ELLIPSE", 0, 0, 5, 5));
            fill(360, 0, Math.random(), 0.2);
            shapes.add(new Shape(createVector(50, 50), Math.random() * 2, Math.random() * Math.HALF_PI, "RECT", 0, 0, 50, 50));
        }
    }
}

class PurpleWorld extends World {
    constructor() {
        super();
        this.worldType = "PurpleWorld";
    }

    gameStart() {
        player = new Player(0, 0);

        camPos.set(0, 0);
        enemyCount = 0;
        objectCount = 0;
        wave = 0;
        killCount = 0;
        magic = 40;
        lastSpawn = ms + 3000;
        objs.clear();
        bgObjs.clear();
        textParticles.clear();
        magicInf = true;
    }

    enemySpawn() {
        if (enemyCount == 0 && ms > lastSpawn && subWave == 0) {
            lastSpawn = ms - 1000;
            wave++;
            subWave = wave;
        }
        if (ms >= lastSpawn + 1000) {
            lastSpawn = ms;
            if (Math.round(Math.random() * 4) + 1 === 1) {
                objs.add(new NeutralExplosion(player.pos.copy(), 400, 1500));
            }
            if (subWave > 0) {
                let mod = subWave % 20 + 1;
                let ceil = Math.ceil(subWave / 20);
                if (mod < 5) {
                    for (let i = 0; i < 2 * ceil; i++) {
                        let angle = Math.random() * Math.PI * 2;
                        objs.add(new BasicEnemy(player.pos.x + 500 * Math.cos(angle), player.pos.y + 500 * Math.sin(angle)));
                    }
                } else if (5 < mod && mod <= 10) {
                    for (let i = 0; i < ceil; i++) {
                        let angle = Math.random() * Math.PI * 2;
                        objs.add(new BasicEnemy(player.pos.x + 500 * Math.cos(angle), player.pos.y + 500 * Math.sin(angle)));
                    }
                    for (let i = 0; i < ceil; i++) {
                        let angle = Math.random() * Math.PI * 2;
                        objs.add(new RangeEnemy(player.pos.x + 500 * Math.cos(angle), player.pos.y + 500 * Math.sin(angle)));
                    }
                } else if (10 < mod && mod <= 15) {
                    for (let i = 0; i < ceil; i++) {
                        let angle = Math.random() * Math.PI * 2;
                        objs.add(new BasicEnemy(player.pos.x + 500 * Math.cos(angle), player.pos.y + 500 * Math.sin(angle)));
                    }
                    for (let i = 0; i < ceil; i++) {
                        let angle = Math.random() * Math.PI * 2;
                        objs.add(new EnemyHealer(player.pos.x + 500 * Math.cos(angle), player.pos.y + 500 * Math.sin(angle)));
                    }
                } else if (15 < mod && mod <= 20) {
                    for (let i = 0; i < ceil; i++) {
                        let angle = Math.random() * Math.PI * 2;
                        objs.add(new BasicEnemy(player.pos.x + 500 * Math.cos(angle), player.pos.y + 500 * Math.sin(angle)));
                    }
                    for (let i = 0; i < ceil; i++) {
                        let angle = Math.random() * Math.PI * 2;
                        objs.add(new RocketEnemy(player.pos.x + 500 * Math.cos(angle), player.pos.y + 500 * Math.sin(angle)));
                    }
                }
                subWave--;
            }
        }
    }

    setWorld() {
        initBasicEnemySprite();
        initRangeEnemySprite();
        initRocketEnemySprite();
        initEnemyHealerSprite();
        initRocketSprite();
        shapes.clear();
        rectMode(CENTER);
        ellipseMode(CENTER);
        noStroke();
        for (let i = 0; i < 10; i++) {
            fill(Math.random() * 45 + 270, 1, 1, 0.2);
            shapes.add(new Shape(createVector(50, 50), Math.random() * 1 + 0.5, 0, "ELLIPSE", 0, 0, 50, 50));
            fill(0, 0, Math.random() * 0.6 + 0.1, 0.2);
            shapes.add(new Shape(createVector(50, 50), Math.random() * 1 + 0.5, 0, "ELLIPSE", 0, 0, 50, 50));
        }
    }
}
class TestWorld extends World {
    constructor() {
        super();
        this.worldType = "TestWorld";
    }

    gameStart() {
        player = new Player(0, 0);
        camPos = createVector(0, 0);
        enemyCount = 0;
        objectCount = 0;
        wave = 0;
        killCount = 0;
        magic = 0;
        lastSpawn = ms + 3000;
        objs = new ArrayList();
        bgObjs = new ArrayList();
        textParticles = new ArrayList();
        objs.add(new BulletBoss(500, 500));
    }

    enemySpawn() {
    }

    setWorld() {
        this.initBulletBossSprite(2);
        shapes.clear();
        for (let i = 0; i < 20; i++) { // create background particle
            fill(random(0, 360), 1, 1, 0.2);
            shapes.push(new Shape(createVector(50, 50), random(0.5, 2), random(0, HALF_PI), "RECT", 0, 0, 50, 50));
            fill(random(0, 360), 1, 1, 0.2);
            shapes.push(new Shape(createVector(50, 50), random(0.5, 2), 0, "ELLIPSE", 0, 0, 50, 50));
            fill(random(0, 360), 1, 1, 0.2);
            shapes.push(new Shape(createVector(50, 50), random(0.5, 2), random(0, HALF_PI), "TRIANGLE", -25, -25, 25, -25, 0, 25));
        }
    }
}
worldDir.set("TestWorld", new TestWorld());
    worldDir.set("RedWorld", new RedWorld());
    worldDir.set("WhiteWorld", new WhiteWorld());
    worldDir.set("PurpleWorld", new PurpleWorld());

function initWorlds() {
    
}

class Button {
    constructor() {
        this.pos = createVector(0, 0);
        this.size = createVector(0, 0);
        this.scal = 1;
        this.text = '';
        this.font = null;
        this.textSize = 25;
        this.alpha = 0.8;
        this.buttonCol = 0;
        this.textCol = 0;
        this.decay = false;
        this.deleteButton = false;

        this.startTime = 0;
        this.appearTime = 1000;
        this.decayTime = 500;
    }

    update() {
        translate(this.pos.x, this.pos.y);
        scale(this.scal);

        if (testColl(new BoxColl(mouseX, mouseY, 25, 25, CENTER), new BoxColl(this.pos.x, this.pos.y, this.size.x * this.scal, this.size.y * this.scal, CENTER))) {
            this.scal = lerp(this.scal, 1.5, 0.2);
            this.alpha = lerp(this.alpha, 1, 0.2);
        } else {
            this.scal = lerp(this.scal, 1, 0.2);
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
        //textFont(this.font);
        fill(changeAlpha(this.buttonCol, this.alpha));
        rect(0, 0, this.size.x, this.size.y, 20);
        fill(changeAlpha(this.textCol, this.alpha));
        text(this.text, 0, 0);
    }

    testClick() {
        if (!this.decay && map(millis(), this.startTime, this.startTime + this.appearTime, 0, 1) > 0.5) {
            if (testColl(new BoxColl(mouseX, mouseY, 25, 25, CENTER), new BoxColl(this.pos.x, this.pos.y, this.size.x * this.scal, this.size.y * this.scal, CENTER))) {
                this.scal = 1.7;
                this.onClick();
            }
        }
    }

    onClick() {
        // This method needs to be implemented in child classes
    }
}
class PlayButton extends Button {
    constructor() {
      super();
        this.startTime = ms;
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
        worldDir.get(currentWorld).setWorld();
        worldDir.get(currentWorld).gameStart(); //calls gamestart for the selected world
        worldDir.get(currentWorld).difficulty(); // sets difficulty
    }
}

class WorldMenuButton extends Button {
    constructor() {
      super();
        this.startTime = ms;
        this.text = "World Select";
        this.pos.set(0.5 * width, 0.5 * height + 300);
        this.size.set(200, 50);
        this.textCol = color(0, 0, 0);
        this.textSize = 25;
        this.buttonCol = color(360);
        this.font = buttonFont;
    }

    onClick() {
        killButtons();
        screen = 7;
        spawnButtons();
    }
}
class WorldSelect extends Button {
    constructor(displayText, worldType, h) {
        super();
        this.worldType = worldType;
        this.text = displayText;
        this.startTime = ms;
        this.pos.set(0.5 * width, h);
        this.size.set(200, 50);
        this.textCol = color(0, 0, 0);
        this.textSize = 25;
        this.buttonCol = color(360);
        this.font = buttonFont;
        this.checkType(); //update the button colors
    }

    checkType() {
        if (this.worldType === currentWorld) {
            this.buttonCol = color(180, 1, 1);
        } else {
            this.buttonCol = color(0, 0, 1);
        }
    }

    onClick() {
        currentWorld = this.worldType;
        buttons.forEach(b => {
            if (b instanceof WorldSelect) {
                b.checkType();
            }
        });
    }
}

class DifficultySelect extends Button {
    constructor(displayText, difficulty, h) {
        super();
        this.difficulty = difficulty;
        this.text = displayText;
        this.startTime = ms;
        this.pos.set(0.5 * width, h);
        this.size.set(200, 50);
        this.textCol = color(0, 0, 0);
        this.textSize = 25;
        this.buttonCol = color(360);
        this.font = buttonFont;
        this.checkType(); //update the button colors
    }

    checkType() {
        if (this.difficulty === gameMode) {
            this.buttonCol = color(180, 1, 1);
        } else {
            this.buttonCol = color(0, 0, 1);
        }
    }

    onClick() {
        gameMode = this.difficulty;
        buttons.forEach(b => {
            if (b instanceof DifficultySelect) {
                b.checkType();
            }
        });
    }
}
class DifficultyMenu extends Button {
    constructor() {
        super();
        this.startTime = ms;
        this.text = "Difficulty";
        this.pos.set(0.5 * width, 0.5 * height - 100);
        this.size.set(200, 50);
        this.textCol = color(0, 0, 0);
        this.textSize = 25;
        this.buttonCol = color(360);
        this.font = buttonFont;
    }
    onClick() {
        killButtons();
        screen = 8;
        spawnButtons();
    }
}

class Tutorial extends Button {
    constructor() {
        super();
        this.startTime = ms;
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
        for (let i = 0; i <= 9; i++) {
            inputReleaseTime[i] = 0;
        }
        tutorialStep = 0;
        tutorialEnd = false;
        screen = 2;
        tutorialStart();
        spawnButtons();
    }
}

class Title extends Button {
    constructor(text) {
        super();
        this.startTime = ms;
        this.text = text;
        this.pos.set(0.5 * width, 0.15 * height);
        this.size.set(1000, 100);
        this.textCol = color(360);
        this.textSize = 25;
        this.buttonCol = color(0);
        this.font = titleFont;
    }
    onClick() {
        // do nothing
    }
}
class GoBack extends Button {
    constructor() {
        this.startTime = ms;
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

class GameOver extends Button {
    constructor() {
        this.startTime = ms;
        this.text = "GAME OVER";
        this.pos.set(0.5 * width, 0.25 * height);
        this.size.set(1000, 100);
        this.textCol = color(0, 1, 1);
        this.textSize = 25;
        this.buttonCol = color(0);
        this.font = titleFont;
    }
    onClick() {
    }
}

class PatchNotes extends Button {
    constructor() {
      super();
        this.startTime = ms;
        this.text = "Patch Notes";
        this.pos.set(0.5 * width, 0.5 * height + 200);
        this.size.set(200, 50);
        this.textCol = color(0, 0, 0);
        this.textSize = 25;
        this.buttonCol = color(360);
        this.font = buttonFont;
    }
    onClick() {
        killButtons();
        screen = 5;
        spawnButtons();
    }
}

class Text extends Button {
    constructor(text, h) { //h is height where the text is
        this.startTime = ms;
        this.text = text;
        this.pos.set(0.5 * width, h);
        this.size.set(500, 50);
        this.textCol = color(0, 0, 0);
        this.textSize = 25;
        this.buttonCol = color(360);
        this.font = buttonFont;
    }
    onClick() {
    }
}
class ScrollText {
    constructor(text, pos, size, margin, font) {
        this.text = text;
        this.pos = p5.Vector(pos.x, pos.y);
        this.size = p5.Vector(size.x, size.y);
        this.margin = margin;
        this.scroll = 0;
        this.bgCol = [360, 0.8];
        this.textCol = [0, 0, 0];
        this.font = font;
        this.buffer = document.createElement('canvas');
        this.buffer.width = Math.floor(size.x);
        this.buffer.height = Math.floor(size.y);
    }

    scroll(scroll) {
        this.scroll = Math.min(Math.max(this.scroll + scroll, 0), 1800);
    }

    drawText() {
        let ctx = this.buffer.getContext('2d');
        ctx.clearRect(0, 0, this.size.x, this.size.y);
        ctx.fillStyle = `hsla(${this.bgCol[0]}, ${this.bgCol[1]})`;
        ctx.fillRect(0, 0, this.size.x, this.size.y);
        ctx.fillStyle = `rgb(${this.textCol[0]}, ${this.textCol[1]}, ${this.textCol[2]})`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = '25px ' + this.font;
        ctx.fillText(this.text, this.margin.x, this.margin.y - this.scroll, this.size.x - this.margin.x, this.size.y + this.scroll);

        let img = new Image();
        this.buffer.toBlob((blob) => {
            img.src = URL.createObjectURL(blob);
            img.onload = () => {
                ctx.drawImage(img, this.pos.x, this.pos.y);
                URL.revokeObjectURL(img.src);
            };
        });
    }

    isInside(checkPosX, checkPosY) {
        let inWidth = checkPosX > this.pos.x && checkPosX < this.pos.x + this.size.x;
        let inHeight = checkPosY > this.pos.y && checkPosY < this.pos.y + this.size.y;
        return inWidth && inHeight;
    }
}
class Player extends GameObject {
    constructor() {
        super();
        this.maxSpeed = 5; //maximum movement speed while using WASD
        this.acc = 2; //Acceleration per frame when you press WASD
        this.frictAmt = 0.3; //lerp amount while applying friction
        this.health = 100;
        this.maxHealth = 100;

        //dash constants
        this.dashDistance = 300; //length of dash in pixels
        this.dashDuration = 100; //in ms, duration of total dash motion
        this.dashInvincDuration = 300; //in ms, the duration of invincibility after the dash finishes
        this.dashCooldown = 1500; //in ms, the cooldown in between dashes

        this.lastDash = 0; //at what time did the last dash start
        this.lastKeyDir = new p5.Vector(1, 0); //the last recorded key direction in case no keys were pressed that frame
        this.dashStartPos = new p5.Vector();
        this.dashEndPos = new p5.Vector();

        this.lastStun = 0; //at what time did the stun start
        this.stunDuration = 300; //in ms duration of stun
        this.stunInvincDuration = 300; //in ms the duration of invincibility after stun finishes

        this.lastSlash = 0; //at what time did the last slash start
        this.slashCooldown = 500; //cooldown between slashes
        this.dashSlashBuffer = 100; //a dash slash will still register a short amount of time after the dash finishes
        this.flipSlash = false; //boolean used to alternate the swing direction of the dash

        this.lastSpell = 0; //at what time was last shot fired
        this.spellCooldown = 500; //ms cooldown between shots

        this.mode = "move"; //the current mode the player is in: "move", "dash"
        this.states = new Map(); //Stores the states of the player (0 for false, 1 for true)
        //Invinicibility (true/false)
        this.init();
    }

    addHealth(h) {
        this.health = constrain(this.health + h, 0, 100);
    }

    init() {
        this.coll = new BoxColl(this.pos.x, this.pos.y, 50, 50, "CENTER");
        this.lastDash = -this.dashCooldown; //mathematically allows player to dash instantly
        this.lastSlash = -this.slashCooldown; //mathematically allows player to slash instantly

        this.states.set("invincible", 0); //sets invincibility to false
    }

    onHit(kb, damage) { //damage should be a negative value
        if (gameMode == "doublehit") {
            damage *= 2;
        }
        //called when the player is hit
        if (this.states.get("invincible") === 0) {
            bgHue = 0;
            bgBrightness = 0.7;
            this.vel.add(kb);
            this.mode = "stun";
            this.lastStun = ms;
            this.states.set("invincible", 1);
            this.addHealth(damage);
            textParticles.push(new TextParticle("" + int(damage), 1000, this.pos.copy().add(random(-25, 25), random(-25, 25)), color(360, 1, 1)));

            if (this.health === 0) {
                objs = new ArrayList();
                textParticles = new ArrayList();
                bgObjs = new ArrayList();
                screen = 4;
                spawnButtons();
            }
        }
    }

    resetDash() {
        this.lastDash = ms - this.dashCooldown + 300; //when dash is reset, you still have to wait 500ms
    }

    physUpdate() {
        let keyDir = createVector(0, 0);
        let mouseDir = p5.Vector.sub(mousePos, player.pos).heading();

        if (inputHeld[4]) {
            keyDir.x += 1;
            if (this.vel.x < this.maxSpeed && this.mode === "move") {
                this.vel.x += this.acc * this.dt;
            }
        }
        if (inputHeld[2]) {
            keyDir.x -= 1;
            if (this.vel.x > -this, maxSpeed && this.mode === "move") {
                this.vel.x -= this.acc * this.dt;
            }
        }
        if (inputHeld[1]) {
            keyDir.y -= 1;
            if (this.vel.y > -this.maxSpeed && this.mode === "move") {
                vel.y -= acc * dt;
            }
        }
        if (inputHeld[3]) {
            keyDir.y += 1;
            if (this.vel.y < this.maxSpeed && this.mode === "move") {
                this.vel.y += this.acc * this.dt;
            }
        }

        if (ms > this.lastDash + this.dashDuration + this.dashInvincDuration && ms >= this.lastStun + this.stunDuration + this.stunInvincDuration) {
            states.set("invincible", 0);
        }

        if (mode === "stun") {
            pos.add(p5.Vector.mult(vel.copy(), dt));
            vel.lerp(0, 0, 0, 0.2 * dt);
            if (ms >= this.lastStun + this.stunDuration) {
                this.mode = "move";
            }
        } else if (mode === "move") {
            pos.add(p5.Vector.mult(vel.copy(), dt));
            vel.lerp(0, 0, 0, frictAmt * dt);

            if (keyDir.x !== 0 || keyDir.y !== 0) {
                lastKeyDir = keyDir.copy();
            }

            if (inputHeld[0] && ms - lastDash >= dashCooldown) {
                mode = "dash";
                lastDash = ms;
                states.set("invincible", 1);
                let dashStartPos = pos.copy();
                if (lastKeyDir.x !== 0 && lastKeyDir.y !== 0) {
                    dashEndPos.set(p5.Vector.mult(lastKeyDir.copy().mult(dashDistance), 0.7)).add(pos);
                } else {
                    dashEndPos.set(p5.Vector.mult(lastKeyDir.copy(), dashDistance)).add(pos);
                }
            }

            if (inputHeld[5] && ms > lastSlash + slashCooldown) {
                lastSlash = ms;
                flipSlash = !flipSlash;
                if (inputPressTime[5] > lastDash + dashDuration && inputPressTime[5] < lastDash + dashDuration + dashSlashBuffer && ms < lastDash + dashDuration + dashSlashBuffer) {
                    objs.push(new PlayerSlash(player.pos, mouseDir, 300, 100, 1000, color(180, 1, 1), flipSlash));
                    objs[objs.length - 1].type[4] = true;
                    screenShake.add(50 * cos(mouseDir), 50 * sin(mouseDir));
                    bgHue = 180;
                    bgBrightness = 0.5;
                } else {
                    objs.push(new PlayerSlash(player.pos, mouseDir, flipSlash));
                }
            }

            // Spells code
            if (ms > lastSpell + spellCooldown) {
                if (magic >= 8 && (inputHeld[8] || inputHeld[7] || inputHeld[6])) {
                    lastSpell = ms;
                    if (magicInf) {
                        magic = constrain(magic - 8, 0, 32 + (wave / 2));
                    } else {
                        magic = constrain(magic - 8, 0, 32);
                    }
                    if (inputHeld[8] && inputPressTime[8] > lastDash + dashDuration && inputPressTime[8] < lastDash + dashDuration + dashSlashBuffer && ms < lastDash + dashDuration + dashSlashBuffer) {
                        objs.push(new PlayerFireball(player.pos.copy(), mouseDir, 150, color(180, 1, 1)));
                        objs[objs.length - 1].type[4] = true;
                        screenShake.add(50 * cos(mouseDir), 50 * sin(mouseDir));
                        bgHue = 180;
                        bgBrightness = 0.5;
                    } else if (inputHeld[8]) {
                        objs.push(new PlayerFireball(player.pos.copy(), mouseDir, 75, color(0, 0, 1)));
                    } else if (inputHeld[7] && inputPressTime[7] > lastDash + dashDuration && inputPressTime[7] < lastDash + dashDuration + dashSlashBuffer && ms < lastDash + dashDuration + dashSlashBuffer) {
                        objs.push(new PlayerSmash(player.pos.copy(), 400, 1000, color(180, 1, 1)));
                        objs[objs.length - 1].type[4] = true;
                        screenShake.add(50 * cos(mouseDir), 50 * sin(mouseDir));
                        bgHue = 180;
                        bgBrightness = 0.5;
                    } else if (inputHeld[7]) {
                        objs.push(new PlayerSmash(player.pos.copy(), 250, 300, color(0, 0, 1)));
                        screenShake.add(50 * cos(mouseDir), 50 * sin(mouseDir));
                    } else if (inputHeld[6] && inputPressTime[6] > lastDash + dashDuration && inputPressTime[6] < lastDash + dashDuration + dashSlashBuffer && ms < lastDash + dashDuration + dashSlashBuffer) {
                        objs.push(new PlayerPush(player.pos.copy(), 400, 1000, color(180, 1, 1)));
                        objs[objs.length - 1].type[4] = true;
                        screenShake.add(50 * cos(mouseDir), 50 * sin(mouseDir));
                        bgHue = 180;
                        bgBrightness = 0.5;
                    } else if (inputHeld[6]) {
                        objs.push(new PlayerPush(player.pos.copy(), 250, 300, color(0, 0, 1)));
                        screenShake.add(50 * cos(mouseDir), 50 * sin(mouseDir));
                    }
                } else if (inputHeld[8] || inputHeld[7] || inputHeld[6]) {
                    crossScale = 2;
                }
            }
        } else if (mode === "dash") {
            if (ms - lastDash >= dashDuration) {
                mode = "move";
                pos.set(p5.Vector.lerp(dashStartPos, dashEndPos, 1));
            } else {
                let p = p5.Vector.lerp(dashStartPos, dashEndPos, map(ms, lastDash, lastDash + dashDuration, 0, 1));
                pos.set(p);
                rectMode(CENTER);
                ellipseMode(CENTER);
                noStroke();
                fill(180, 0.7, 1);
                bgObjs.push(new Particle(createShape(ELLIPSE, 0, 0, 70, 70), pos.copy().add(random(-30, 30), random(-30, 30)), 100, random(300, 500), color(180, 0.7, 1)));
                bgObjs.push(new Particle(createShape(RECT, 0, 0, 70, 70), pos.copy().add(random(-30, 30), random(-30, 30)), 100, random(300, 500), color(180, 0.7, 1)));
            }
        }

        coll.setPos(pos);

        let shieldFill = color(0, 0, 1, 0.2);
        let playerFill = color(0, 0, 1);

        if (mode === "dash") {
            playerFill = color(180, 0.7, 1);
            shieldFill = color(180, 0.7, 1, 0.2);
        } else if (mode === "stun") {
            playerFill = color(0, 1, 1);
            shieldFill = color(0, 1, 1, 0.2);
        } else if (mode === "move") {
            if (ms >= lastDash + dashCooldown) {
                playerFill = color(180, 0.7, 1);
                rectMode(CENTER);
                noStroke();
                fill(180, 0.7, 1);
                bgObjs.push(new Particle(createShape(RECT, 0, 0, 30, 30), pos.copy().add(random(-10, 10), random(-10, 10)), 0, 300, color(180, 0.7, 1)));
            } else {
                playerFill = color(360);
                rectMode(CENTER);
                noStroke();
                fill(0, 0, 1);
                bgObjs.push(new Particle(createShape(RECT, 0, 0, 30, 30), pos.copy().add(random(-10, 10), random(-10, 10)), 0, 300, color(0, 0, 1)));
            }
            if (ms <= lastDash + dashDuration + dashInvincDuration) {
                shieldFill = color(180, 0.7, 1, 0.2);
            } else if (ms <= lastStun + stunDuration + stunInvincDuration) {
                shieldFill = color(0, 0.7, 1, 0.2);
            }
        }

        if (states.get("invincible") === 1) {
            noStroke();
            fill(shieldFill);
            strokeWeight(8);
            circle(pos.x, pos.y, 150);
        }

        noStroke();
        rectMode(CENTER);
        fill(playerFill);
        rect(pos.x, pos.y, 50, 50);

        push();
        translate(pos.x, pos.y - 40);
        drawBar(health, 0, maxHealth, -25, 25, 10);
        pop();
    }
}

//default geometry has radius of 100
function calcSlash(tBound) {
    let radius = 100;
    let p;
    p = createGraphics(radius,radius);
    p.beginShape();
    p.fill(255);
    p.noStroke();
    p.strokeWeight(1);

    p.scale(1);

    p.curveVertex(radius, 0);//ends of curves need double coordinates for some reason
    p.curveVertex(radius, 0);
    for (let i = 1; i < resolution; i++) {
        let t = map(i, 0, resolution, 0, tBound);
        p.curveVertex(radius * Math.cos(3.14 * t), radius * Math.sin(3.14 * t));
    }
    p.curveVertex(radius * Math.cos(3.14 * tBound), radius * Math.sin(3.14 * tBound));
    p.curveVertex(radius * Math.cos(3.14 * tBound), radius * Math.sin(3.14 * tBound));
    p.vertex((1 - tBound) * radius * Math.cos(3.14 * tBound), (1 - tBound) * radius * Math.sin(3.14 * tBound));
    p.curveVertex((1 - tBound) * radius * Math.cos(3.14 * tBound), (1 - tBound) * radius * Math.sin(3.14 * tBound));
    p.curveVertex((1 - tBound) * radius * Math.cos(3.14 * tBound), (1 - tBound) * radius * Math.sin(3.14 * tBound));
    for (let i = 1; i < resolution; i++) {
        let t = map(i, 0, resolution, tBound, 0); //t but reverse direction
        p.curveVertex((1 - t) * radius * Math.cos(3.14 * t), (1 - t) * radius * Math.sin(3.14 * t));
    }
    p.curveVertex(radius, 0);
    p.curveVertex(radius, 0);

    p.endShape();
    return p;
}
//Overall root game code

player = new Player();

function tutorialStart() {
    player = new Player(0, 0);
    camPos.set(0, 0);
    enemyCount = 0;
    objectCount = 0;
    killCount = 0;
    magic = 32;
    lastSpawn = ms + 3000;
    initBasicEnemySprite();
    objs = new ArrayList();
    bgObjs = new ArrayList();
    textParticles = new ArrayList();
}

var lastSpawn = 1000; //last time when enemies were spawned
var subWave = 0; //subwave counters
function gameLoop() {
    bgBrightness = lerp(bgBrightness, 0, 0.2 * dt);
    background(bgHue, 1, bgBrightness);
    calcFps(); //show fps and calculate dt

    //render background shapes (outside camera push pop)
    let startTime = millis();
    for (let s of shapes) {
        s.update();
    }
    drawGrid(50);
    if (logTime) {
        print("bgShapes:" + (ms - startTime));
    }
    if (screen == 3) {
        worldDir.get(currentWorld).enemySpawn(); //calls loops for the currently selected world
    }
    //camera translations
    pushMatrix();
    translate(screenShake.x * camScale, screenShake.y * camScale);
    translate(0.5 * width, 0.5 * height); //this is the problem line
    scale(camScale);
    translate(-camPos.x, -camPos.y);

    mousePos = createVector((mouseX - 0.5 * width) / camScale + camPos.x, (mouseY - 0.5 * height) / camScale + camPos.y);
    //set mouse position based on camera scale and pos constant

    if (screenShake.mag() > 100) {
        screenShake.setMag(100);
    }
    screenShake.lerp(p5.Vector(0, 0), 0.5 * dt);

    let avgPos = p5.Vector(0, 0);
    let avgCount = 0; //This iss the total n count used for calculating the average position
    for (let obj of objs) {
        if (obj.type[8]) {
            //weight boss position by factor of 20
            avgPos.add(obj.pos.copy().mult(20));
            avgCount += 20;
        } else if (obj.type[0]) { //if the object is an enemy
            avgPos.add(obj.pos);
            avgCount++;
        } else {
            continue;
        }
    }
    if (avgCount == 0) {
        moveCamera(player.pos, player.pos, 300);
    } else {
        avgPos.div(avgCount);
        moveCamera(avgPos, player.pos, 300);
    }

    //render floor particles
    for (let i = bgObjs.length - 1; i >= 0; i--) { //delete objects
        if (bgObjs[i].deleteObject) {
            bgObjs.splice(i, 1);
        }
    }
    startTime = millis();
    for (let b of bgObjs) {
        b.update();
    }
    if (logTime) {
        print(" particle:" + (ms - startTime));
        print(" particle size:" + bgObjs.length);
    }

    startTime = millis();
    for (let i = objs.length - 1; i >= 0; i--) { //delete objects
        if (objs[i].deleteObject) {
            objs.splice(i, 1);
        }
    }
    //player has no collupdate
    for (let i = 0; i < objs.length; i++) {
        objs[i].collUpdate();
    }
    player.physUpdate();
    for (let i = 0; i < objs.length; i++) {
        objs[i].physUpdate();
    }
    if (logTime) {
        print(" objs:" + (ms - startTime));
    }

    startTime = millis();
    //render text particles
    for (let i = textParticles.length - 1; i >= 0; i--) { //delete objects
        if (textParticles[i].deleteObject) {
            textParticles.splice(i, 1);
        } else {
            textParticles[i].update();
        }
    }
    if (logTime) {
        print(" textParticle:" + (ms - startTime));
    }
    popMatrix();

    startTime = millis();
    drawUI();
    if (screen == 2) {
        tutorialLoop();
    }
    if (logTime) {
        print(" ui:" + (ms - startTime + "\n"));
    }
}

function drawUI() {
    //crosshair rendering
    if (magic < 8) {
        crossCol = color(0, 1, 0.7);
    } else {
        crossCol = color(0, 0, 1);
    }
    pushMatrix();
    translate(mouseX, mouseY);
    scale(crossScale);
    noFill();
    stroke(crossCol);
    strokeWeight(2);
    line(-20, 0, 20, 0);
    line(0, -20, 0, 20);
    strokeWeight(8);
    ellipseMode(CENTER);
    if (magicInf) {
        arc(0, 0, 50, 50, 0, map(magic, 0, 32 + (wave / 2), 0, TAU), OPEN);
    } else arc(0, 0, 50, 50, 0, map(magic, 0, 32, 0, TAU), OPEN);
    popMatrix();
    crossScale = lerp(crossScale, 1, 0.2);

    //health and magic bars
    pushMatrix();
    translate(25, 25);
    noStroke();
    if (magic < 8) {
        fill(0, 1, 0.7);
    } else {
        fill(0, 0, 1);
    }
    rectMode(CORNER);
    rect(0, 25, map(magic, 0, 32, 0, 200), 10);
    drawBar(player.health, 0, 100, 0, 200, 10);
    popMatrix();

    //kill counter
    pushMatrix();
    translate(0.5 * width, 0.1 * height);
    textAlign(CENTER, CENTER);
    textSize(100);
    fill(0, 0, 1);
    if (screen == 3) {
        text("Wave: " + wave, 0, 0);
    }
    popMatrix();

    drawKeystrokes(width - 10, 75, 1);
}

let keyLerpVals = new Array(10).fill(0);
function updateKeyVal(index) {
    if (inputHeld[index]) {
        keyLerpVals[index] = lerp(keyLerpVals[index], 1, 0.3 * dt);
    } else {
        keyLerpVals[index] = lerp(keyLerpVals[index], 0, 0.3 * dt);
    }
}
function drawKeystrokes(x, y, scal) {
    strokeWeight(1);
    stroke(0, 0, 1);
    for (let i = 0; i < 10; i++) {
        updateKeyVal(i);
    }
    push();
    translate(x - 25, y + 25); //i miscalculated when i first calculated the values, so i compensated here
    scale(scal);
    //drawn from upper right corner
    //0:space, 1:w, 2:a, 3:s, 4:d, 5:m1, 6:m2, 7:e, 8:q, 9:,10:,
    stroke(0, 0, 1);
    noFill();
    drawKey("E", 0, 0, keyLerpVals[7]);
    drawKey("W", -55, 0, keyLerpVals[1]);
    drawKey("Q", -110, 0, keyLerpVals[8]);
    drawKey("D", 0, 55, keyLerpVals[4]);
    drawKey("S", -55, 55, keyLerpVals[3]);
    drawKey("A", -110, 55, keyLerpVals[2]);
    drawKey("", -55, 95, 160, 20, keyLerpVals[0]); //space key
    drawKey("LMB", -96, 130, 77, 40, keyLerpVals[5]);
    drawKey("RMB", -13, 130, 77, 40, keyLerpVals[6]);
    pop();
}
function drawKey(text, x, y, t) {
    drawKey(text, x, y, 50, 50, t);
}
function drawKey(text, x, y, xSize, ySize, t) {
    push();
    translate(x, y);
    rectMode(CENTER);
    fill(0, 0, 1, lerp(0, 1, t));
    rect(0, 0, xSize, ySize);

    textAlign(CENTER, CENTER);
    textSize(30);
    fill(0, 0, lerp(1, 0, t));
    text(text, 0, 0);
    pop();
}

var tutorialEnd = false;
var tutorialStep = 0;
function tutorialLoop() {
    pushMatrix();
    translate(0.5 * width, 0.1 * height + 50);
    textAlign(CENTER, CENTER);
    textSize(50);
    fill(0, 0, 1);
    if (tutorialStep == 0) {
        text("WASD to move", 0, 0);
        if (inputReleaseTime[1] > 0 && inputReleaseTime[2] > 0 && inputReleaseTime[3] > 0 && inputReleaseTime[4] > 0) {
            for (let j = 0; j <= 9; j++) {
                inputReleaseTime[j] = 0;
            }
            tutorialStep = 1;
        }
    } else if (tutorialStep == 1) {
        text("Space to dash", 0, -40);
        text("Left click to slash", 0, 10);
        if (inputReleaseTime[0] > 0 && inputReleaseTime[5] > 0) {
            tutorialStep = 2;
        }
    } else if (tutorialStep == 2) {
        text("E to smash", 0, -40);
        text("Q to fireball", 0, 10);
        if (inputReleaseTime[7] > 0 && inputReleaseTime[8] > 0) {
            tutorialStep = 3;
        }
    } else if (tutorialStep == 3) {
        text("attack right after a dash for a combo", 0, 0);
        for (let obj of objs) {
            if (obj.type[4] == true) {
                tutorialStep = 4;
            }
        }
    } else if (tutorialStep == 4) {
        text("Beat the enemy", 0, 0);
        if (tutorialEnd == false) {
            let angle = random(0, TAU);
            objs.push(new BasicEnemy(player.pos.x + 500 * cos(angle), player.pos.y + 500 * sin(angle)));
            tutorialEnd = true;
        }
        if (tutorialEnd == true && objs.length == 0) {
            screen = 6;
            spawnButtons();
        }
    }
    popMatrix();

    //slash dash indicator
    if (tutorialStep == 3) {
        push();
        translate(0.5 * width, height - 50);
        let x;
        if (ms > player.lastDash && ms < player.lastDash + player.dashDuration + player.dashSlashBuffer) {
            x = lerp(-130, 30, map(ms, player.lastDash, player.lastDash + player.dashDuration, 0, 1));
        } else x = -130;
        text("Slash!", 0, 600);
        fill(0, 0, 0.5);
        rect(-140, -15, 60, 15, 10, 0, 0, 10);
        fill(180, 0.7, 1);
        rect(60, -15, 180, 15, 0, 10, 10, 0);
        fill(0, 0, 1);
        rect(x, -25, x + 10, 25, 10);
        pop();
    }
}


function moveCamera(a, b, margin) {
    let v1 = a.copy();
    let v2 = b.copy();

    let scaleX;
    if (v1.x >= v2.x) {
        scaleX = width / (v1.x + margin - v2.x + margin);
    } else {
        scaleX = width / (v2.x + margin - v1.x + margin);
    }
    let scaleY;
    if (v1.y >= v2.y) {
        scaleY = height / (v1.y + margin - v2.y + margin);
    } else {
        scaleY = height / (v2.y + margin - v1.y + margin);
    }

    if (scaleX <= scaleY) {
        camScale = lerp(camScale, scaleX, constrain(0.05 * dt, 0, 1));
    } else {
        camScale = lerp(camScale, scaleY, constrain(0.05 * dt, 0, 1));
    }
    camPos.lerp(p5.Vector.lerp(a, b, 0.5), 0.05 * dt);
}

function getKeyIndex(key) { // hardcoded function that returns the corresponding index for each potential key code
    let i = -1; // returns -1 if the key is not supported
    switch (key) {
        case ' ':
            i = 0;
            break;
        case 'w':
        case 'W':
            i = 1;
            break;
        case 'a':
        case 'A':
            i = 2;
            break;
        case 's':
        case 'S':
            i = 3;
            break;
        case 'd':
        case 'D':
            i = 4;
            break;
        case 'e':
        case 'E':
            i = 7;
            break;
        case 'q':
        case 'Q':
            i = 8;
            break;
    }
    return i;
}

function keyPressed(key) {
    const i = getKeyIndex(key);
    if (i !== -1) {
        inputHeld[i] = true;
        inputPressTime[i] = Date.now();
    }
    if (screen === 0) {
        screen = 1;
        spawnButtons();
    }
}

function keyReleased(key) {
    const i = getKeyIndex(key);
    if (i !== -1) {
        inputHeld[i] = false;
        inputReleaseTime[i] = Date.now();
    }
}

function mousePressed(button) {
    if (button === 'LEFT') {
        inputHeld[5] = true;
        inputPressTime[5] = Date.now();
    } else {
        inputHeld[6] = true;
        inputPressTime[6] = Date.now();
    }
    if (screen === 0) {
        screen = 1;
        spawnButtons();
    }
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].testClick();
    }
}

function mouseReleased(button) {
    if (button === 'LEFT') {
        inputHeld[5] = false;
        inputReleaseTime[5] = Date.now();
    } else {
        inputHeld[6] = false;
        inputReleaseTime[6] = Date.now();
    }
}

function mouseWheel(event) {
    for (let scroll of textBoxes) {
        if (scroll.isInside(mouseX, mouseY)) {
            scroll.scroll(event.deltaY * 10);
        }
    }
}

var dt;
var lastTime = 0;
var texts = "";

function calcFps() {
    dt = Math.min(3, 60 * ((Date.now() - lastTime) * 0.001)); // the first number is the target fps (60)
    lastTime = Date.now();

    // show fps
    if (frameCount % (frameRate * 0.5) === 0) { // run once every half second
        text = Math.round(60 / dt) + "fps";
    }
    fill(360);
    textAlign(RIGHT);
    textSize(20);
    text(text, width - 5, 15);
    text("Object count: " + objs.length, width - 5, 30);
    text("Particle count: " + (bgObjs.length + textParticles.length), width - 5, 45);
}

class PullVisual extends BgObj {
    constructor(obj) {
        super();
        this.spacing = 100;
        this.boss = obj;
    }

    update() {
        if (this.boss.deleteObject) {
            this.deleteObject = true;
        }

        push();
        translate(this.boss.pos.x, this.boss.pos.y);
        let r = 1200 - this.spacing + map(ms % 1000, 0, 1000, 100, 0);
        noFill();
        stroke(0, 0, 0.3);
        strokeWeight(2);
        while (r >= 200) {
            circle(0, 0, 2 * r);
            r -= this.spacing;
        }
        pop();
    }
}

var healthCount = 0;
const maxHealthCount = 10;

class Health extends GameObject {
    constructor(pos) {
        super();
        this.pos = pos;
        this.coll = new BoxColl(pos.x, pos.y, 50, 50, CENTER);
        this.emitStart = millis();
        healthCount++;
    }

    collUpdate() {
        if (testColl(this.coll, player.coll)) {
            player.addHealth(10);
            textParticles.push(new TextParticle("+10", random(500, 1000), this.pos.copy().add(random(-25, 25), random(-25, 25)), color(120, 1, 1)));
            bgHue = 120;
            bgBrightness = 0.5;
            this.deleteObject = true;
            healthCount--;
        }
    }

    physUpdate() {
        if (testColl(new BoxColl(camPos.x, camPos.y, width / camScale, height / camScale, CENTER), this.coll)) {
            ellipseMode(CENTER);
            fill(120, 1, 0.5);
            noStroke();
            if (millis() > this.emitStart + this.emitCooldown) {
                this.emitStart = millis();
                bgObjs.push(new Particle(createShape(ELLIPSE, 0, 0, 100, 100), this.pos.copy(), 100, 500, color(120, 1, 0.5)));
            }
            pushMatrix();
            translate(this.pos.x, this.pos.y);
            rectMode(CENTER);
            noStroke();
            fill(0, 0, 0.7);
            rect(0, 0, 50, 50);
            fill(0, 1, 0.7);
            rect(0, 0, 10, 30);
            rect(0, 0, 30, 10);
            popMatrix();
        } else {
            let margin = 50;
            let tempPos = this.pos.copy();
            if (this.pos.x < camPos.x - width * 0.5 / camScale + margin) {
                tempPos.x = camPos.x - width * 0.5 / camScale + margin;
            } else if (this.pos.x > camPos.x + width * 0.5 / camScale - margin) {
                tempPos.x = camPos.x + width * 0.5 / camScale - margin;
            }
            if (this.pos.y < camPos.y - height * 0.5 / camScale + margin) {
                tempPos.y = camPos.y - height * 0.5 / camScale + margin;
            } else if (this.pos.y > camPos.y + height * 0.5 / camScale - margin) {
                tempPos.y = camPos.y + height * 0.5 / camScale - margin;
            }

            noStroke();
            pushMatrix();
            translate(tempPos.x, tempPos.y);
            rotate(p5.Vector.sub(this.pos, tempPos).heading());
            fill(0, 0, 0.7);
            triangle(0, 25, 0, -25, 50, 0);
            circle(0, 0, 50);
            popMatrix();

            pushMatrix();
            translate(tempPos.x, tempPos.y);
            fill(0, 1, 0.7);
            rectMode(CENTER);
            rect(0, 0, 10, 30);
            rect(0, 0, 30, 10);
            popMatrix();
        }
    }
}


class PlayerSlash extends GameObject {
    /*constructor(pos, aimAngle, flipSlash) { //default settings
      this(pos, aimAngle, 200, 100, 200, color(0, 0, 1), flipSlash);
    }*/
    constructor(pos, aimAngle, radius, duration, decay, c, flipSlash) {
        this.pos = pos;
        this.radius = radius;
        this.aimAngle = aimAngle;
        this.duration = duration;
        this.decay = decay;
        this.c = c;
        this.flipSlash = flipSlash;
        this.init();
    }
    init() {
        this.type[1] = true; //pAttack
        this.type[2] = true; //pSlash
        this.coll = new CircleColl(this.pos.x, this.pos.y, this.radius);
        this.startTime = ms;
    }
    physUpdate() {
        if (this.startTime !== ms) { //waits until the frame after it was spawned before removing coll
            this.coll = null; //because collUpdate happens first, this line removes the coll right after the first frame of the blade animation
        }
        pushMatrix();
        translate(this.pos.x, this.pos.y);
        rotate(this.aimAngle - HALF_PI); //geometry of slash was drawn 90 degrees clockwise
        scale(this.radius / 100); //100 is the default radius of the blade geometry
        if (this.flipSlash) { //flips the direction of the blade
            scale(-1, 1);
        }

        if (ms < this.startTime + this.duration) {
            //maps the ms to the closest frame in the array
            let index = round(map(ms, this.startTime, this.startTime + this.duration, 0, frameLength - 1));
            slashFrame[index].setFill(this.c);
            image(slashFrame[index]);
        } else if (ms < this.startTime + this.duration + this.decay) {
            this.pos = this.pos.copy(); //The blade no longer follows the player
            slashFrame[frameLength - 1].setFill(changeAlpha(this.c, map(ms, this.startTime + this.duration, this.startTime + this.duration + this.decay, 1, 0)));
            image(slashFrame[frameLength - 1]);
        } else if (ms > this.startTime + this.duration + this.decay) {
            this.deleteObject = true;
        }
        popMatrix();
    }
}

class PlayerFireball extends GameObject {
    constructor(pos, angle, radius, c) {
        this.pos = pos;
        this.angle = angle;
        this.radius = radius;
        this.c = c;
        this.init();
    }
    init() {
        this.startTime = ms;
        this.vel = p5.Vector.fromAngle(this.angle).setMag(30);
        this.coll = new CircleColl(this.pos.x, this.pos.y, this.radius);
        this.type[1] = true; //pAttack
        this.type[3] = true; //pFireball
    }
    physUpdate() {
        this.pos.add(this.vel.copy().mult(dt));
        this.coll.setPos(this.pos.copy());
        if (ms >= this.startTime + this.decay) {
            this.deleteObject = true;
        }
        ellipseMode(CENTER);
        noStroke();
        fill(this.c);
        let size = random(25, 50);
        bgObjs.add(new Particle(createShape(ELLIPSE, 0, 0, size, size), this.pos.copy().add(p5.Vector.random2D().setMag(25)), 100, 500, this.c));

        noStroke();
        fill(changeAlpha(this.c, 0.5));
        circle(this.pos.x, this.pos.y, 2 * this.radius);
        fill(this.c);
        circle(this.pos.x, this.pos.y, this.radius);
    }
}

class PlayerSmash extends GameObject {
    constructor(pos, radius, decay, c) {
        this.pos = pos;
        this.radius = radius;
        this.decay = decay;
        this.c = c;
        this.init();
    }
    init() {
        this.startTime = ms;
        this.coll = new CircleColl(this.pos.x, this.pos.y, this.radius);
        this.type[1] = true; //pAttack
        this.type[5] = true; //playerSmash
    }
    collUpdate() { }
    physUpdate() {
        if (ms !== this.startTime) {
            this.coll = null; //removes the collision after the first frame
        }
        let r = this.radius;
        let alpha = 1;
        if (ms < this.startTime + this.appear) {
            r = map(ms, this.startTime, this.startTime + this.appear, 0, this.radius);
            screenShake.add(p5.Vector.random2D().setMag(50));
        } else if (this.startTime + this.appear < ms && ms < this.startTime + this.appear + this.decay) {
            alpha = map(ms, this.startTime + this.appear, this.startTime + this.appear + this.decay, 1, 0);
        } else if (ms >= this.startTime + this.appear + this.decay) {
            alpha = 0;
            this.deleteObject = true;
        }
        pushMatrix();
        translate(this.pos.x, this.pos.y);
        ellipseMode(CENTER);
        fill(changeAlpha(this.c, 0.25 * alpha));
        circle(0, 0, 2 * r);
        fill(changeAlpha(this.c, 0.5 * alpha));
        circle(0, 0, 1.5 * r);
        fill(changeAlpha(this.c, 0.25 * alpha));
        circle(0, 0, r);
        fill(changeAlpha(this.c, alpha));
        circle(0, 0, 0.5 * r);
        popMatrix();
    }
}
class PlayerPush extends GameObject {
    constructor(pos, radius, decay, c) {
        this.pos = pos;
        this.radius = radius;
        this.decay = decay;
        this.c = c;
        this.startTime = 0;
        this.appear = 100;
    }

    init() {
        this.startTime = ms;
        this.coll = new CircleColl(this.pos.x, this.pos.y, this.radius);
        this.type[1] = true;
        this.type[9] = true;
    }

    collUpdate() {
        // idk seemed necessary
    }

    physUpdate() {
        if (ms !== this.startTime) {
            this.coll = null;
        }
        let r = this.radius;
        let alpha = 1;
        if (ms < this.startTime + this.appear) {
            r = map(ms, this.startTime, this.startTime + this.appear, 0, this.radius);
            screenShake.add(p5.Vector.random2D().setMag(50));
        } else if (this.startTime + this.appear < ms && ms < this.startTime + this.appear + this.decay) {
            alpha = map(ms, this.startTime + this.appear, this.startTime + this.appear + this.decay, 1, 0);
        } else if (ms >= this.startTime + this.appear + this.decay) {
            alpha = 0;
            deleteObject = true;
        }
        push();
        translate(this.pos.x, this.pos.y);
        ellipseMode(CENTER);
        fill(changeAlpha(this.c, 0.5 * alpha));
        stroke(0, 0, 1);
        strokeWeight(1);
        circle(0, 0, 2.5 * r);
        pop();
    }
}

var patchText;

function killButtons() {
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].decay = true;
        buttons[i].startTime = millis();
    }
    textBoxes = new ArrayList();
}

function loopButtons() {
    for (let i = buttons.length - 1; i >= 0; i--) {
        if (buttons[i].deleteButton) {
            buttons.splice(i, 1);
        } else {
            buttons[i].update();
        }
    }
    for (let scroll of textBoxes) {
        scroll.drawText();
    }
}
function spawnButtons() {
    if (screen === 1) {
        buttons.push(new PlayButton());
        buttons.push(new Title("QUAD KILLER"));
        buttons.push(new Tutorial());
        buttons.push(new PatchNotes());
        buttons.push(new WorldMenuButton());
        buttons.push(new DifficultyMenu());
    } else if (screen === 4) {
        buttons.push(new GameOver());
        buttons.push(new Text("YOU GOT TO WAVE " + wave, 0.5 * height));
        buttons.push(new GoBack());
    } else if (screen === 5) {
        textBoxes.push(new scrollText("patchText", createVector(width / 2 - 150, height / 4), createVector(300, 400), createVector(10, 10), buttonFont));
        buttons.push(new GoBack());
    } else if (screen === 6) {
        buttons.push(new Text("Congratulations! You completed the tutorial.", 0.5 * height));
        buttons.push(new GoBack());
    } else if (screen === 7) {
        buttons.push(new WorldSelect("World 1", "RedWorld", 200));
        buttons.push(new WorldSelect("World 2", "WhiteWorld", 300));
        buttons.push(new WorldSelect("Testing", "TestWorld", 400));
        buttons.push(new WorldSelect("Infinite Magic", "PurpleWorld", 500));
        buttons.push(new GoBack());
    } else if (screen === 8) {
        buttons.push(new DifficultySelect("Normal", "normal", 200));
        buttons.push(new DifficultySelect("Hitless", "nohit", 300));
        buttons.push(new DifficultySelect("Double Damage", "doublehit", 400));
        buttons.push(new GoBack());
    }
}

function screenLoop() {
    background(0);
    shapes.forEach(s => s.update());
    camPos.add(0, -1);

    for (let p of bgObjs) {
        p.pos.add(0, 2);
        p.update();
    }

    ellipseMode(CENTER);
    let size = 50;
    bgObjs.push(new Particle(ellipse(0, 0, size, size), createVector(mouseX, mouseY), 0, 500, color(180, 1, 0.7)));

    loopButtons();
}

//classes for particles and other visual content
function changeAlpha(c, alpha) {
    // Function to change the alpha value of a color
    return color(hue(c), saturation(c), brightness(c), alpha);
}

function drawBar(value, start, end) {
    drawBar(value, start, end, start, end, 10);
}

function drawBar(value, start, end, x1, x2, h) {
    fill(360, 1, 1);
    rectMode(CORNER);
    noStroke();
    rect(x1, -0.5 * h, (x2 - x1), h);
    fill(120, 1, 1);
    rectMode(CORNERS);
    rect(x1, -0.5 * h, map(value, start, end, x1, x2), 0.5 * h);
}

class TextParticle {
    constructor(text, duration, pos, c) {
        this.deleteObject = false;
        this.text = text;
        this.c = c;
        this.pos = pos;
        this.startTime = millis();
        this.duration = duration;
        this.decay = 500;
    }

    update() {
        if (millis() < this.startTime + this.duration) {
            textAlign(CENTER, CENTER);
            fill(this.c);
            textSize(30);
            text(this.text, this.pos.x, this.pos.y);
        } else if (millis() > this.startTime + this.duration + this.decay) {
            this.deleteObject = true;
        } else {
            textAlign(CENTER, CENTER);
            textSize(30);
            fill(changeAlpha(this.c, map(millis(), this.startTime + this.duration, this.startTime + this.duration + this.decay, 1, 0))); // fade to transparent
            text(this.text, this.pos.x, this.pos.y - map(millis(), this.startTime + this.duration, this.startTime + this.duration + this.decay, 0, 50)); // 10 is the max height
        }
    }
}


var bgBrightness = 0;
var bgHue = 0; //red
var screenShake = p5.Vector(0, 0);
//don't account for screenShake in calculations because it is a very temporary effect

function setup() {
    //Oversize the screen so that it maxes out the size (the fullscreen command does not support P2D)
  var mousePos = new createVector(); //world coords for mouse (not screen)
    colorMode(HSB, 360, 1, 1, 1);
    frameRate(2000);
  createCanvas(1000,1000);
    //surface.setResizable(true);
    //m = new Minim(this);
    //bgm = m.loadFile("GameTrack.mp3");
    //bgm.loop();
    //bgMusic = new SoundFile(this, "DieAlone.mp3");
    //bgMusic.loop();
    for (let i = 0; i < frameLength; i++) { //code for preloading the slash animation
        slashFrame[i] = calcSlash((i + 1) / frameLength);
    }
    //patchText = join(loadStrings("patchtext.txt"), "\n");
    //dummy shape because shape function is weird on the first usage
    //titleFont = createFont("DataTransfer.ttf", 100); //set fonts
    //buttonFont = createFont("Arial", 25);
    //create background shapes
    noStroke();
    rectMode(CENTER);
    ellipseMode(CENTER);
   crossCol = color(0, 0, 1);
    
    for (let i=0; i<20; i++) { //create background particle
      fill(random(0, 360), 1, 1, 0.2);
      shapes.push(new Shape(createVector(50,50), random(0.5, 2), random(0, HALF_PI), "RECT",0, 0, 50, 50));
      fill(random(0, 360), 1, 1, 0.2);
      shapes.push(new Shape(createVector(50,50), random(0.5, 2), 0, "ELLIPSE",0, 0, 50, 50));
      fill(random(0, 360), 1, 1, 0.2);
      shapes.push(new Shape(createVector(50,50), random(0.5, 2), random(0, HALF_PI), "TRIANGLE",-25, -25, 25, -25, 0, 25));
    }
    initWorlds();
}

function draw() {
    ms = millis();
    if (screen == 0) {
        background(0);
        for (let s of shapes) {
            s.update();
        }
        camPos.add(0, -1);
        textAlign(CENTER, CENTER);
        textSize(30);
        fill(360, map(sin(TAU * ms * 0.001), 0, 1, 0.7, 1));
        text("Take a moment to full screen your window", 0.5 * width, 0.5 * height);
        text("(click or press key to continue)", 0.5 * width, 0.5 * height + 50);
    } else if (screen == 2 || screen == 3) {
        gameLoop();
    } else {
        screenLoop();
    }
}
// Helper function to change alpha value of a color
function changeAlpha(c, alpha) {
  return color(hue(c), saturation(c), brightness(c), alpha);
}

// Function to draw a bar
function drawBar(value, start, end, x1 = start, x2 = end, h = 10) {
  fill(360, 1, 1);
  rectMode(CORNER);
  noStroke();
  rect(x1, -0.5 * h, x2 - x1, h);
  fill(120, 1, 1);
  rectMode(CORNERS);
  rect(x1, -0.5 * h, map(value, start, end, x1, x2), 0.5 * h);
}

// TextParticle class
class TextParticle {
  constructor(text, duration, pos, c) {
    this.deleteObject = false;
    this.text = text;
    this.c = c; // Color of text
    this.pos = pos;
    this.startTime = millis(); // Time when particle was created
    this.duration = duration; // Time in millis particle lasts before decaying
    this.decay = 500; // Time in millis for particle to decay
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
      fill(
        changeAlpha(
          this.c,
          map(
            millis(),
            this.startTime + this.duration,
            this.startTime + this.duration + this.decay,
            1,
            0
          )
        )
      ); // Fade to transparent
      text(
        this.text,
        this.pos.x,
        this.pos.y -
          map(
            millis(),
            this.startTime + this.duration,
            this.startTime + this.duration + this.decay,
            0,
            50
          )
      ); // 50 is the max height
    }
  }
}

class BgObj {
  constructor() {
  this.deleteObject=false;
  }
  
}

// Particle class
class Particle extends BgObj{
  constructor(type, p1, p2, p3, p4, pos, duration, decay, c, P5 = 0, p6 = 0) {
    super();
    this.pos = pos;
   this.type = type; // PShape object
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;
    this.p4 = p4;
    this.P5 = P5;
    this.p6 = p6;
    this.decayCol = c; // Decay color
    this.startTime = millis(); // Time when particle was created
    this.duration = duration; // Time in millis particle lasts before decaying
    this.decay = decay; // Time in millis for particle to decay
  }

  update() {
    push();
    translate(this.pos.x,this.pos.y);
    if (millis() < this.startTime + this.duration) {
      // Regular particle
      switch (this.type) {
          case "RECT":
            rect(this.p1, this.p2, this.p3, this.p4);
            break;
          case "ELLIPSE":
            ellipse(this.p1, this.p2, this.p3, this.p4);
            break;
            case "TRIANGLE":
            triangle(this.p1, this.p2, this.p3, this.p4, this.P5, this.p6);
            break;
        }
    } else if (millis() > this.startTime + this.duration + this.decay) {
      this.deleteObject = true;
    } else {
      // Decay code
      fill(
        changeAlpha(
          this.decayCol,
          map(
            millis(),
            this.startTime + this.duration,
            this.startTime + this.duration + this.decay,
            1,
            0
          )
        )
      );
      noStroke();
      switch (this.type) {
          case "RECT":
            rect(this.p1, this.p2, this.p3, this.p4);
            break;
          case "ELLIPSE":
            ellipse(this.p1, this.p2, this.p3, this.p4);
            break;
            case "TRIANGLE":
            triangle(this.p1, this.p2, this.p3, this.p4, this.P5, this.p6);
            break;
        }
    }
    pop();
  }
}

// Shape class
class Shape {
  constructor(type, p1, p2, p3, p4, size, z, rot, h=0, s=0, v=0, a=0, P5 = 0, p6 = 0) {
    this.type = type; // PShape object
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;
    this.p4 = p4;
    this.P5 = P5;
    this.p6 = p6;
    this.pos = new p5.Vector(); // Assume pos X is less than spacing
    this.size = size; // Size of the shape
    this.spacing = 1000; // Spacing between shapes
    this.rot = rot; // Rotation of the shape
    this.factor = z; // Scaling factor
    this.spacing *= z;
    this.pos.set(random(0, this.spacing), random(0, this.spacing));
    this.h=h;
    this.s=s;
    this.v=v;
    this.a=a;
  }

  update() {
    push();
    scale(camScale * this.factor);
    // Array is drawn centered around 0,0
    // Add spacing margin on edges to make it smoothly move off screen
    let x = this.pos.x - (camPos.x % this.spacing); // Set x pos
    while (x + 0.5 * this.size.x >= 0) {
      // Make sure there is a shape completely off screen so that it can smoothly pan in
      x -= this.spacing;
    }
    while (x - 0.5 * this.size.x < width / (camScale * this.factor)) {
      let y = this.pos.y - (camPos.y % this.spacing); // Set y pos
      while (y + 0.5 * this.size.y >= 0) {
        // Set y pos top edge
        y -= this.spacing;
      }
      while (y - 0.5 * this.size.y < height / (camScale * this.factor)) {
        push();
        translate(x, y);
        rotate(this.rot);
        fill(this.h,this.s,this.v,this.a);
        noStroke();
        switch (this.type) {
          case "RECT":
            rect(this.p1, this.p2, this.p3, this.p4);
            break;
          case "ELLIPSE":
            ellipse(this.p1, this.p2, this.p3, this.p4);
            break;
            case "TRIANGLE":
            triangle(this.p1, this.p2, this.p3, this.p4, this.P5, this.p6);
            break;
        }
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
  stroke(0,0,0.2);
  strokeWeight(1);
  push();
  scale(camScale);
  //array is drawn centered around 0,0
  //add spacing margin on edges to make it smoothly move off screen
  let x = -camPos.x % spacing; //set x pos
  while ( x >= 0) { //make sure there is a shape comletely off screen so that it can smoothly pan in
    x-=spacing;
  }
  while (x < width / camScale) {
    line(x,0,x,height/camScale);
    x+=spacing;
  }
  
  let y = -camPos.y % spacing; //set y pos
  while (y >= 0) { //set y pos top edge
      y-=spacing;
    }
  while (y < height / camScale) {
    line(0,y,width/camScale,y);
    y+=spacing;
  }
  
  pop();
}

// Abstract Collider class (simulated using a base class in JavaScript)
class Collider {
  // Polymorphism: Subclasses will override these methods
  getType() {
    throw new Error("gettype error");
  }

  setPos(x, y=undefined) {
    if (arg2!==undefined) {
      throw new Error("setpos2 error");
    }
    throw new Error("setpos error");
  }

  visualize(isTouching = false) {
    throw new Error("visualize error");
  }
}

// Collision testing function
function testColl(a, b) {
  if (a == null || b == null) return false;

  const aType = a.getType();
  const bType = b.getType();

  if (aType === 3) { // GroupColl
    for (let c of a.colls) {
      if (testColl(c, b)) return true;
    }
    return false;
  } else if (bType === 3) { // GroupColl
    for (let c of b.colls) {
      if (testColl(a, c)) return true;
    }
    return false;
  } else {
    let coll = false;
    // Large switch case to choose the correct collision detection function
    switch (aType) {
      case 0:
        switch (bType) {
          case 0: coll = BoxBoxColl(a, b); break;
          case 1: coll = BoxLineColl(a, b); break;
          case 2: coll = BoxCircleColl(a, b); break;
        }
        break;
      case 1:
        switch (bType) {
          case 0: coll = LineBoxColl(a, b); break;
          case 1: coll = LineLineColl(a, b); break;
          case 2: coll = LineCircleColl(a, b); break;
        }
        break;
      case 2:
        switch (bType) {
          case 0: coll = CircleBoxColl(a, b); break;
          case 1: coll = CircleLineColl(a, b); break;
          case 2: coll = CircleCircleColl(a, b); break;
        }
        break;
    }
    return coll;
  }
}

// GroupColl class
class GroupColl extends Collider {
  constructor() {
    super();
    this.colls = []; // Array to hold colliders
  }

  addColl(coll) {
    this.colls.push(coll);
    return this;
  }

  removeColl(index) {
    this.colls.splice(index, 1);
    return this;
  }

  getType() {
    return 3;
  }

  visualize(isTouching) {
    for (let coll of this.colls) {
      coll.visualize(isTouching);
    }
  }

  setPos(x, y) {
    for (let coll of this.colls) {
      coll.setPos(x, y);
    }
  }
}

// BoxColl class
class BoxColl extends Collider {
  constructor(a, b, c, d, mode) {
    super();
    this.p1 = new p5.Vector(); // Upper left corner
    this.p2 = new p5.Vector(); // Bottom right corner
    this.center = new p5.Vector(); // Center of the box
    this.size = new p5.Vector(); // Width and height
    if (a !== undefined) {this.setValues(a, b, c, d, mode);}
  }

  setValues(a, b, c, d, mode) {
    switch (mode) {
      case CORNER:
        this.p1.set(a, b);
        this.p2.set(a + c, b + d);
        this.center.set(a + (c * 0.5), b + (d * 0.5));
        this.size.set(c, d);
        break;

      case CORNERS:
        // Ensure a < c and b < d
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
        this.size.set(abs(c - a), abs(d - b));
        break;

      case CENTER:
        this.p1.set(a - (0.5 * c), b - (0.5 * d));
        this.p2.set(a + (0.5 * c), b + (0.5 * d));
        this.center.set(a, b);
        this.size.set(c, d);
        break;
    }
  }

  getType() {
    return 0;
  }

  setPos(x, y=undefined) {
    if (y!== undefined) {
      this.setValues(x, y, this.size.x, this.size.y, CENTER);
    } else this.setValues(x.x, x.y, this.size.x, this.size.y, CENTER);
    
  }

  visualize(isTouching) {
    // Visualize the collision box on screen
    rectMode(CORNERS);
    noFill();
    strokeWeight(1);
    stroke(isTouching ? color(255, 0, 0) : color(255));
    rect(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
  }
}
// LineColl class
class LineColl extends Collider {
  constructor(x1, y1, x2, y2) {
    super();
    this.p1 = new p5.Vector();
    this.p2 = new p5.Vector();
    this.boundingBox = new BoxColl(); // Reference to bounding box
    if (x1 !== undefined) this.setValues(x1, y1, x2, y2);
  }

  getType() {
    return 1;
  }

  setValues(p1, p2) {
    if (p1 instanceof p5.Vector) {
      this.setValues(p1.x, p1.y, p2.x, p2.y);
    } else {
      this.setValues(p1, p2, arguments[2], arguments[3]);
    }
  }

  setValues(x1, y1, x2, y2) {
    this.p1.set(x1, y1);
    this.p2.set(x2, y2);
    this.boundingBox.setValues(x1, y1, x2, y2, CORNERS);
  }

  setPos(x, y) {
    // Translates by the midpoint
    const midpoint = p5.Vector.lerp(this.p1, this.p2, 0.5);
    const deltaPos = new p5.Vector(x, y).sub(midpoint);
    this.p1.add(deltaPos);
    this.p2.add(deltaPos);
  }

  visualize(isTouching) {
    // Draws the collision line on screen
    strokeWeight(1);
    stroke(isTouching ? color(255, 0, 0) : color(255));
    line(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
  }
}

// CircleColl class
class CircleColl extends Collider {
  constructor(x, y, r) {
    super();
    this.center = new p5.Vector(); // Center of circle
    this.radius = 0; // Radius of circle
    this.boundingBox = new BoxColl(); // Reference to bounding box
    if (x !== undefined) {this.setValues(x, y, r);}
  }

  getType() {
    return 2;
  }

  setValues(x, y, r) {
    this.center.set(x, y);
    this.radius = r;
    this.boundingBox.setValues(x, y, 2 * r, 2 * r, CENTER);
  }

  setPos(x, y=undefined) {
    if (y!==undefined) {
    this.center.set(x, y);
    this.boundingBox.setPos(x, y);
    } else {
      this.center.set(x.x, x.y);
    this.boundingBox.setPos(x.x, x.y);
    }
  }

  visualize(isTouching) {
    // Draws the hitbox on screen
    stroke(isTouching ? color(255, 0, 0) : color(255));
    ellipseMode(CENTER);
    noFill();
    ellipse(this.center.x, this.center.y, 2 * this.radius, 2 * this.radius);
  }
}

// Collision detection functions
function BoxBoxColl(b1, b2) {
  // Utilizes the convention that x1 < x2 and y1 < y2
  return !(
    b1.p1.x > b2.p2.x ||
    b1.p2.x < b2.p1.x ||
    b1.p1.y > b2.p2.y ||
    b1.p2.y < b2.p1.y
  );
}

function BoxLineColl(b, l) {
  // First do a general bounding box collision detection
  if (!BoxBoxColl(b, l.boundingBox)) return false;

  // Visualization of linear interpolation
  const t1 = (b.p1.x - l.p1.x) / (l.p2.x - l.p1.x);
  const t2 = (b.p2.x - l.p1.x) / (l.p2.x - l.p1.x);
  const y1 = (1 - t1) * l.p1.y + l.p2.y * t1;
  const y2 = (1 - t2) * l.p1.y + l.p2.y * t2;

  // If y1 and y2 are on opposite sides of the box, the line collides
  return !((y1 < b.p1.y && y2 < b.p1.y) || (y1 > b.p2.y && y2 > b.p2.y));
}

function LineBoxColl(l, b) {
  return BoxLineColl(b, l);
}

function BoxCircleColl(b, c) {
  // Overall bounding box check
  if (!BoxBoxColl(b, c.boundingBox)) return false;

  // Distance from the center of the box to the center of the circle
  let x = abs(c.center.x - b.center.x) - b.size.x * 0.5;
  if (x < 0) x = 0;
  let y = abs(c.center.y - b.center.y) - b.size.y * 0.5;
  if (y < 0) y = 0;

  // Use distance squared to avoid square root
  return x * x + y * y < c.radius * c.radius;
}

function CircleBoxColl(c, b) {
  return BoxCircleColl(b, c);
}

function LineCircleColl(l, c) {
  // Bounding box check
  if (!BoxLineColl(c.boundingBox, l)) return false;

  // Strategy developed by Matthew Emmanuel
  const AB = p5.Vector.sub(l.p2, l.p1); // Vector representing line
  const AC = p5.Vector.sub(c.center, l.p1); // Vector between p1 and circle center
  const ABmag = AB.mag();
  const dot = AB.dot(AC) / ABmag; // Parallel projection

  if (dot >= ABmag) {
    return p5.Vector.sub(l.p2, c.center).magSq() < c.radius * c.radius;
  } else if (dot <= 0) {
    return p5.Vector.sub(l.p1, c.center).magSq() < c.radius * c.radius;
  }
  return AC.magSq() - dot * dot < c.radius * c.radius; // Pythagorean theorem
}

function CircleLineColl(c, l) {
  return LineCircleColl(l, c);
}

function CircleCircleColl(c1, c2) {
  // True if the distance between centers is less than the sum of radii
  return dist(c1.center.x, c1.center.y, c2.center.x, c2.center.y) < c1.radius + c2.radius;
}

function LineLineColl(l1, l2) {
  // Placeholder function for now
  return BoxBoxColl(l1.boundingBox, l2.boundingBox);
}
// Vector Math Functions
export function dist(x1, y1, x2, y2) {
  // works, delivers always positive value
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

export function radian(x1, y1, x2, y2) {
  return Math.atan2(x2 - x1, y2 - y1); // In radians, bottom is 0, top is 3.1415
}

export function deltaX(angle, strength) {
  return Math.cos(angle) * strength; // turns angular vector into x delta coordinate
}

export function deltaY(angle, strength) {
  return Math.sin(angle) * strength; // turns angular vector into y delta coordinate
}

export function grav(m1, m2, dist) {
  //return (m * g) / Math.pow(dist, 2);
  return (0.0667408 * m1 * m2) / Math.pow(dist, 2);
}

export function radius(m) {
  // it would be nice to calculate density, but one challenge at a time.
  // density could be a multiplier that delivers a value that grows very slowly and then increases enormously at large m values
  // combined with luminosity and radiation pressure, simulating stars would become feasible.
  // not sure how to incorporate more than the main sequence of star development: https://de.wikipedia.org/wiki/Hauptreihe#/media/File:HRDiagram.png

  return Math.sqrt(m / Math.PI); // this assumes mass is f(x) = x of the surface area and returns the radius. iff mass increases density, insert factor here.
}
export function clearCanvas(context, opaque, sizes) {
  if (opaque) {
    // opaqueness is created by a relatively intransparent clear effect and a clear counter, only working it every CLR iterations. this reduces grey traces.
    context.fillStyle = "rgba(0,0,0,.2)";
    context.fillRect(0, 0, sizes.width, sizes.height);
  } else {
    context.clearRect(0, 0, sizes.width, sizes.height);
  }
}

export function createStar({width, height}, options = {}) {
  const mass = 5 + Math.random() * 10;
  const defaultStar = {
    mass,
    x: Math.random() * width,
    y: Math.random() * height,
    iStr: Math.random() * 15,
    iAng: Math.random() * Math.PI * 2,
    radius: radius(mass),
    untouchable: 0
  };

  return {
    ...defaultStar,
    ...options
  };
}

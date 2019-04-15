import {
  html,
  LitElement
} from "https://unpkg.com/lit-element@2.1.0/lit-element.js?module";

export class StarElement extends LitElement {
  render() {
    return html`
      <canvas id="canvas"></canvas>
    `;
  }

  static get properties() {
    return {
      canvasCtxs: { type: Array },
      starsCount: { type: Number, attribute: "stars-count" },
      stars: { type: Array },
      // Gravitational constant - modify this to modulate gravitational strength
      g: { type: Number },

      // clear constant; every CLRth iteration, the screen is cleared with opaque black.
      clr: { type: Number },
      clrCount: { type: Number },

      // object of width height, centerX, centerY
      sizes: { type: Object }
    };
  }

  constructor() {
    super();

    this.starsCount = 250;
    this.g = 0.0667408;
    this.CLR = 25;
    this.clrCount = 0;

    this.sizes = {
      width: this.style.width,
      height: this.style.height,
      centerX: this.style.width / 2,
      centerY: this.style.height / 2
    };

    this.renderComplete
      .then(this.init)
      .then(this.render);
  }

  init() {
    const { width, height } = this.sizes;
    // init canvas
    this.canvasCtxs.push(this.shadowRoot.canvas.getContext());
    for (let i = 0; i < 3; i++) {
      this.canvasCtxs.push(document.createElement("canvas").getContext());
    }

    this.canvasCtxs.forEach(ele => {
      ele.width = width;
      ele.height = height;
    });

    // init stars
    for (let i = 0; i < this.starsCount; i++) {
      const mass = 2 + Math.random() * 10;
      stars.push({
        mass,
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        iStr: Math.random() * 15,
        iAng: Math.random() * Math.PI * 2,
        radius: radius(mass),
        untouchable: 0,
        colliding: 0
      });
    }
  }

  static get styles() {
    return [
      css`
        canvas {
          width: 100%;
          height: 100%;
        }
      `
    ];
  }

  updateCanvas() {
    // clear canvases
    if(this.clrCount === this.CLR) {
      clearCanvas(this.canvasCtxs[1], true);
      this.clrCount = 0;
    }
    else {
      clearCanvas(this.canvasCtxs[1], false);
    }
    clearCanvas(this.canvasCtxs[2], false);
    clearCanvas(this.canvasCtxs[3], false);

    // Outer Loop
    // ------------
    // we iterate through all bodies and for each we check what forces are applied by all other bodies
    this.stars.forEach((star, i) => {
      if (star.untouchable == 0) {
        // Inner Loop
        // ------------
        // here we iterate through all bodies for each passive body and calculate forces on the passive body.
        this.stars.forEach((otherStar, j) => {
          if (otherStar.untouchable == 0 && i !== j) {
            // calculate distance vector between star and otherStar
            let distBetween = dist(star.x, star.y, otherStar.x, otherStar.y);

            // prevent calculating attraction of a body on itself. (would be infinite because 0 distance)
            // prevent attraction Calc for distances > 500px.
            // this is a dirty performance fix!
            if (powerSaving(distBetween, n)) {
              // This prevents NaN, undefined and false values for distBetween
              // The next line returns the expression to the right if the left side is falsy
              distBetween = distBetween || 0;

              // collision check, tests for touching bodies
              if (thisDistance >= star.radius + otherStar.radius) {
                // No Collision
                // --------------

                // calculate radian for distance vector between star and otherStar
                var thisRadian = radian(star.x, star.y, otherStar.x, otherStar.y);
                // calculate attraction vector for otherStar's effect on star
                // This vector is only affecting star!
                var thisAttraction = grav(star.mass, otherStar.mass, thisDistance);

                // draw attraction vector from otherStar to star
                // for some reason, deltaX and Y need to be reversed. #bug #bugfix
                var attractionX = deltaY(thisRadian, thisAttraction);
                var attractionY = deltaX(thisRadian, thisAttraction);

                // Calculate vector product of star impulse vector and attraction vecor
                var aStr = dist(
                  star.x,
                  star.y,
                  star.x + deltaX(star.iAng, star.iStr) + attractionX,
                  star.y + deltaY(star.iAng, star.iStr) + attractionY
                );
                var aAng =
                  Math.PI * 0.5 -
                  radian(
                    star.x,
                    star.y,
                    star.x + deltaX(star.iAng, star.iStr) + attractionX,
                    star.y + deltaY(star.iAng, star.iStr) + attractionY
                  );

                // update star attraction vector.
                // can't be done as part of the before statement because the aAng line references the previous star.iStr value!

                star.iStr = aStr;
                star.iAng = aAng;
              } else {
                // Collision
                // -----------

                // find out which is the larger object, that one will eat the smaller one.
                // eventually, we'll do this gradually for a smoother visual effect.
                // we could even simulate explosive collisions, but we need a cohesion calculation,
                // based on impulse, mass and density as a simplified model.

                mergeBodies(i, j);
              }
            }
          }
        }
      }

      // Update Positions
      // updates x,y position based on impulse vector.
      star.x += deltaX(star.iAng, star.iStr / 2 / star.mass);
      star.y += deltaY(star.iAng, star.iStr / 2 / star.mass);

      drawStar(i);

      if (star.untouchable > 0) {
        star.untouchable--;
      }
    });

    const [canvasToDraw, ctx1, ctx2, ctx3] = this.canvasCtxs;
    canvasToDraw.clearRect(0, 0, this.sizes.width, this.sizes.height);

    // copy canvas 1 & 2 & 3 content to canvas 0
    canvasToDraw.drawImage(ctx1.canvas, 0, 0);
    canvasToDraw.drawImage(ctx2.canvas, 0, 0);
    canvasToDraw.drawImage(ctx3.canvas, 0, 0);

    // increment clear counter for opaque tracers
    this.clrCount++;
  }


  drawStar(star) {
    const [ctx, ctx1, ctx2, ctx3] = this.stars;
    if (star) {
      const color = `hsl(${(star.iStr / star.mass) * 100},${star.iStr *
        60}%,${star.mass / 4 + 40}%)`;
      // const color2 = `hsla(${(star.iStr / star.mass) * 100},${star.iStr * 60 }%,${star.mass / 4 + 40}%, 0.25)`;
      const color3 = `hsl(${(star.iStr / star.mass) * 100},${star.iStr *
        60}%,${star.mass / 4 + 40}%, 5%)`;
  
      // Tracer
      ctx1.beginPath();
      ctx1.arc(star.x + offsetX, star.y + offsetY, 0.5, 0, 2 * Math.PI);
      ctx1.strokeStyle = color3;
      ctx1.fillStyle = color3;
      ctx1.fill();
      ctx1.stroke();
  
      // Glow
      if (star.mass >= 40) {
        var glowRadius = star.radius * 2;
        //var gradient = ctx2.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius*10);
        var gradient = ctx2.createRadialGradient(
          star.x + offsetX,
          star.y + offsetY,
          star.radius,
          star.x + offsetX,
          star.y + offsetY,
          glowRadius
        );
        // Add two color stops
        gradient.addColorStop(
          0,
          `<hsla(${(star.iStr / star.mass) * 100},${star.iStr * 60}%,${star.mass / 4 + 40}%, 0.5)`
        );
        gradient.addColorStop(
          1,
          `"hsla(${(star.iStr / star.mass) * 100},${star.iStr * 60}%, ${star.mass / 4 + 40}%, 0)`
        );
  
        ctx2.beginPath();
        ctx2.arc(star.x + offsetX, star.y + offsetY, glowRadius, 0, 2 * Math.PI);
        ctx2.strokeStyle = "transparent";
        ctx2.fillStyle = gradient;
        ctx2.fill();
      }
  
      // Body
      ctx3.beginPath();
      ctx3.arc(star.x + offsetX, star.y + offsetY, star.radius, 0, 2 * Math.PI);
      ctx3.strokeStyle = color;
      ctx3.fillStyle = color;
      ctx3.fill();
      ctx3.stroke();
    }
  }

  mergeBodies(i, j) {
    const starA = this.stars[i];
    const starB = this.stars[j];
    // this routine regularly compares a body against itself, due to the shifts in the array.
    // since this simulation uses random masses, it will be highly unlikely that two bodies will
    // randomly have the exact same mass. so as a dirty fix, we do only merge bodies of non equal masses.
    if (starA.mass > starB.mass) {
      starA.mass += starB.mass;
      starA.radius = radius(starA.mass);
      const sumDX = deltaX(starA.iAng, starA.iStr) + deltaX(starB.iAng, starB.iStr);
      const sumDY = deltaY(starA.iAng, starA.iStr) + deltaY(starB.iAng, starB.iStr);
      starA.iStr = dist(starA.x, starA.y, starA.x + sumDX, starA.y + sumDY);
      starA.iAng =
        Math.PI * 0.5 -
        radian(starA.x, starA.y, starA.x + sumDX, starA.y + sumDY);
  
      //removing item by filtering array
      this.stars = this.stars.filter(c => c !== this.stars[j]);
    } else if (starA.mass > starB.mass) {
      starB.mass += starA.mass;
      starB.radius = radius(starB.mass);
      const sumDX = deltaX(starB.iAng, starB.iStr) + deltaX(starA.iAng, starA.iStr);
      const sumDY = deltaY(starB.iAng, starB.iStr) + deltaY(starA.iAng, starA.iStr);
      starB.iStr = dist(starB.x, starB.y, starB.x + sumDX, starB.y + sumDY);
      starB.iAng =
        Math.PI * 0.5 -
        radian(starB.x, starB.y, starB.x + sumDX, starB.y + sumDY);
  
      //removing item by filtering array
      this.stars = this.stars.filter(c => c !== this.stars[i]);
    }
  }
}

window.customElements.define("star-element", StarElement);

// Vector Math Functions

function dist(x1, y1, x2, y2) {
  // works, delivers always positive value
  return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

function radian(x1, y1, x2, y2) {
  return Math.atan2(x2 - x1, y2 - y1); // In radians, bottom is 0, top is 3.1415
}

function deltaX(angle, strength) {
  return Math.cos(angle) * strength; // turns angular vector into x delta coordinate
}

function deltaY(angle, strength) {
  return Math.sin(angle) * strength; // turns angular vector into y delta coordinate
}

function grav(m1, m2, dist) {
  //return (m * g) / Math.pow(dist, 2);
  return (G * m1 * m2) / Math.pow(dist, 2);
}

function radius(m) {
  // it would be nice to calculate density, but one challenge at a time.
  // density could be a multiplier that delivers a value that grows very slowly and then increases enormously at large m values
  // combined with luminosity and radiation pressure, simulating stars would become feasible.
  // not sure how to incorporate more than the main sequence of star development: https://de.wikipedia.org/wiki/Hauptreihe#/media/File:HRDiagram.png

  return Math.sqrt(m / Math.PI); // this assumes mass is f(x) = x of the surface area and returns the radius. iff mass increases density, insert factor here.
}

function density(m) {
  // Density is an arbitrary calculation based on an exponential equation.
  // y = 0.1 * x^2 + 1        modify the x multiplier to strengthen or weaken the effect.
  // This can be used to calculate compression of heavy bodies and ignition of super heavy bodies.

  return 0.1 * (m * m) + 1;
}

/*
 * --------------------------------------
 *   FUNCTIONS
 * --------------------------------------
 */

function clearCanvas(context, opaque, sizes) {
  if (opaque) {
    // opaqueness is created by a relatively intransparent clear effect and a clear counter, only working it every CLR iterations. this reduces grey traces.
    context.fillStyle = "rgba(0,0,0,.2)";
    context.fillRect(0, 0, sizes.width, sizes.height);
  } else {
    context.clearRect(0, 0, sizes.width, sizes.height);
  }
}



// this checks the amount of bodies and the distance of the current pair,
// to limit calulations for large groups. bad implementation, but very simple.
function powerSaving(distance, amount) {
  if (amount > 500 && distance > 500) {
    return false;
  } else {
    return true;
  }
}
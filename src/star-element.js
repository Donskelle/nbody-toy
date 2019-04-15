import {
  html,
  LitElement,
  css
} from "https://unpkg.com/lit-element@2.1.0/lit-element.js?module";

import {
  clearCanvas,
  deltaX,
  deltaY,
  dist,
  grav,
  radian,
  radius,
  createStar
} from "./lib/star-helpers.js";

export class StarElement extends LitElement {
  render() {
    return html`
      <canvas id="canvas"></canvas>
    `;
  }

  static get properties() {
    return {
      canvasCtxs: { type: Array },
      starsCount: { type: Number, attribute: "star-count" },
      stars: { type: Array },

      // clear constant; every CLRth iteration, the screen is cleared with opaque black.
      clr: { type: Number },
      clrCount: { type: Number },

      // object of width height, centerX, centerY
      sizes: { type: Object }
    };
  }

  constructor() {
    super();

    this.stars = [];
    this.canvasCtxs = [];
    this.starsCount = 250;
    this.CLR = 25;
    this.clrCount = 0;

    this.sizes = {
      width: this.offsetWidth,
      height: this.offsetHeight,
      centerX: this.offsetWidth / 2,
      centerY: this.offsetHeight / 2
    };
  }

  firstUpdated() {
    this.init();
    this.drawCanvas();
  }

  drawCanvas() {
    this.updateCanvas();

    requestAnimationFrame(() => this.drawCanvas());
  }

  init() {
    const { width, height } = this.sizes;
    // init canvas
    this.canvasCtxs.push(
      this.shadowRoot.querySelector("#canvas").getContext("2d")
    );
    for (let i = 0; i < 3; i++) {
      this.canvasCtxs.push(document.createElement("canvas").getContext("2d"));
    }

    this.canvasCtxs.forEach(ele => {
      ele.canvas.width = width;
      ele.canvas.height = height;
    });

    // init stars
    for (let i = 0; i < this.starsCount; i++) {
      this.stars.push(createStar(this.sizes));
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

  startShower(count = 10) {
    for (let i = 0; i < count; i++) {
      this.stars.push(
        createStar(this.sizes, {
          iStr: 50
        })
      );
    }
  }

  updateCanvas() {
    // clear canvas
    if (this.clrCount === this.CLR) {
      clearCanvas(this.canvasCtxs[1], true, this.sizes);
      this.clrCount = 0;
    } else {
      clearCanvas(this.canvasCtxs[1], false, this.sizes);
    }
    clearCanvas(this.canvasCtxs[2], false, this.sizes);
    clearCanvas(this.canvasCtxs[3], false, this.sizes);

    // Outer Loop
    // ------------
    // we iterate through all bodies and for each we check what forces are applied by all other bodies
    this.stars.forEach((star, i) => {
      if (star.untouchable == 0 && star) {
        // Inner Loop
        // ------------
        // here we iterate through all bodies for each passive body and calculate forces on the passive body.
        this.stars.forEach((otherStar, j) => {
          if (otherStar.untouchable == 0 && i !== j && otherStar) {
            // calculate distance vector between star and otherStar
            let distBetween = dist(star.x, star.y, otherStar.x, otherStar.y);

            // This prevents NaN, undefined and false values for distBetween
            // The next line returns the expression to the right if the left side is falsy
            distBetween = distBetween || 0;

            if (distBetween < 500) {
              // collision check, tests for touching bodies
              if (distBetween >= star.radius + otherStar.radius) {
                // No Collision
                // --------------

                // calculate radian for distance vector between star and otherStar
                const thisRadian = radian(
                  star.x,
                  star.y,
                  otherStar.x,
                  otherStar.y
                );
                // calculate attraction vector for otherStar's effect on star
                // This vector is only affecting star!
                const thisAttraction = grav(
                  star.mass,
                  otherStar.mass,
                  distBetween
                );

                // draw attraction vector from otherStar to star
                // for some reason, deltaX and Y need to be reversed. #bug #bugfix
                const attractionX = deltaY(thisRadian, thisAttraction);
                const attractionY = deltaX(thisRadian, thisAttraction);

                // Calculate vector product of star impulse vector and attraction vecor
                const aStr = dist(
                  star.x,
                  star.y,
                  star.x + deltaX(star.iAng, star.iStr) + attractionX,
                  star.y + deltaY(star.iAng, star.iStr) + attractionY
                );
                const aAng =
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
                this.mergeBodies(i, j);
              }
            }
          }
        });
      }
    });

    // remove deleted
    this.stars = this.stars.filter(star => !star.delete);
    this.stars.forEach(star => {
      // Update Positions
      // updates x,y position based on impulse vector.
      star.x += deltaX(star.iAng, star.iStr / 2 / star.mass);
      star.y += deltaY(star.iAng, star.iStr / 2 / star.mass);

      this.drawStar(star);

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
    const [ctx, ctx1, ctx2, ctx3] = this.canvasCtxs;
    const { centerX, centerY } = this.sizes;

    if (star) {
      const color = `hsl(${(star.iStr / star.mass) * 100},${star.iStr *
        60}%,${star.mass / 4 + 40}%)`;
      // const color2 = `hsla(${(star.iStr / star.mass) * 100},${star.iStr * 60 }%,${star.mass / 4 + 40}%, 0.25)`;
      const color3 = `hsl(${(star.iStr / star.mass) * 100},${star.iStr *
        60}%,${star.mass / 4 + 40}%, 5%)`;

      // Tracer
      ctx1.beginPath();
      ctx1.arc(star.x + centerX, star.y + centerY, 0.5, 0, 2 * Math.PI);
      ctx1.strokeStyle = color3;
      ctx1.fillStyle = color3;
      ctx1.fill();
      ctx1.stroke();

      // Glow
      if (star.mass >= 40) {
        var glowRadius = star.radius * 2;
        //var gradient = ctx2.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius*10);
        var gradient = ctx2.createRadialGradient(
          star.x,
          star.y,
          star.radius,
          star.x,
          star.y,
          glowRadius
        );
        gradient.addColorStop(
          0,
          "hsla(" +
            (star.iStr / star.mass) * 100 +
            "," +
            star.iStr * 60 +
            "%, " +
            (star.mass / 4 + 40) +
            "%, " +
            0.5 +
            ")"
        );
        gradient.addColorStop(
          1,
          "hsla(" +
            (star.iStr / star.mass) * 100 +
            "," +
            star.iStr * 60 +
            "%, " +
            (star.mass / 4 + 40) +
            "%, " +
            0 +
            ")"
        );

        ctx2.beginPath();
        ctx2.arc(star.x, star.y, glowRadius, 0, 2 * Math.PI);
        ctx2.strokeStyle = "transparent";
        ctx2.fillStyle = gradient;
        ctx2.fill();
      }

      // Body
      ctx3.beginPath();
      ctx3.arc(star.x, star.y, star.radius, 0, 2 * Math.PI);
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
    if (starA && starB) {
      if (starA.mass > starB.mass) {
        starA.mass += starB.mass;
        starA.radius = radius(starA.mass);
        const sumDX =
          deltaX(starA.iAng, starA.iStr) + deltaX(starB.iAng, starB.iStr);
        const sumDY =
          deltaY(starA.iAng, starA.iStr) + deltaY(starB.iAng, starB.iStr);
        starA.iStr = dist(starA.x, starA.y, starA.x + sumDX, starA.y + sumDY);
        starA.iAng =
          Math.PI * 0.5 -
          radian(starA.x, starA.y, starA.x + sumDX, starA.y + sumDY);

        //removing item by filtering array
        starB.delete = true;
      } else if (starA.mass >= starB.mass) {
        starB.mass += starA.mass;
        starB.radius = radius(starB.mass);
        const sumDX =
          deltaX(starB.iAng, starB.iStr) + deltaX(starA.iAng, starA.iStr);
        const sumDY =
          deltaY(starB.iAng, starB.iStr) + deltaY(starA.iAng, starA.iStr);
        starB.iStr = dist(starB.x, starB.y, starB.x + sumDX, starB.y + sumDY);
        starB.iAng =
          Math.PI * 0.5 -
          radian(starB.x, starB.y, starB.x + sumDX, starB.y + sumDY);

        //removing item by filtering array
        starA.delete = true;
      }
    }
  }
}

window.customElements.define("star-element", StarElement);

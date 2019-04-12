$(document).ready(function() {
    ctx.canvas.width  = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    ctx1.canvas.width  = window.innerWidth;
    ctx1.canvas.height = window.innerHeight;
});

$(window).resize(function() {
    ctx.canvas.width  = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    ctx1.canvas.width  = window.innerWidth;
    ctx1.canvas.height = window.innerHeight;
});


// catch scroll events
window.addEventListener('wheel', findScrollDirectionOtherBrowsers);

function findScrollDirectionOtherBrowsers(event){
    var delta;

    if (event.wheelDelta){
        delta = event.wheelDelta;
    }else{
        delta = -1 * event.deltaY;
    }
    //setZoom(delta, window.event);
}

function setZoom(delta, mouse) {
    if (delta < 0 ) {
        //down

        ctx.translate(mouse.clientX, mouse.clientY);
        ctx1.translate(mouse.clientX, mouse.clientY);
        ctx.scale(1.1,1.1);
        ctx1.scale(1.1,1.1);

    } else if (delta > 0 ) {
        // up
        ctx.scale(.9,.9);
        ctx1.scale(.9,.9);
    }
}

// init canvas
var canvas = document.getElementById("primary-canvas");
var ctx = canvas.getContext("2d");

var canvas1 = document.getElementById("secondary-canvas");
var ctx1 = canvas1.getContext("2d");

ctx.font = "12px Arial"; // global canvas font setting
ctx1.font = "12px Arial"; // global canvas font setting

// other variables, constants
var CLEARCTXCOUNT = 10; // defines how many cycles to wait until canvas is to be cleared.
var clearCtx = 0; // counts up to clearCtxCount and then clears canvas with 10% black.

// setting up stats panel
var stats = new Stats();
stats.showPanel( 1 );
document.body.appendChild( stats.dom );


// constants

var n = 500;        // number of bodies
var g = 0.0667408;       // gravity
var INERTIA = 1;
var TIME = 1;
var collEffectDuration = 10;
var collEffectSize = 20;

// populate nbody field
var nbody = [];
for (var i = 0; i < n; i++) {
    nbody.push({
        x: Math.random() * 1920,
        y: Math.random() * 1080,
        is: Math.random() * 3,
        ia: Math.random() * Math.PI * 2,
        m: 2 + Math.random() * 10,
        coll: 0
    });
}

// ----------------------
// core functions
// ----------------------

function dist(x1, y1, x2, y2) {  // works, delivers always positive value. -> does it really?
  return Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));
}

function radian(x1, y1, x2, y2) {
  return Math.atan2(x2 - x1, y2 - y1); // In radians, bottom is 0, top is 3.1415
}

function deltaX (angle, strength) {
  return Math.cos(angle) * strength; // turns angular vector into x delta coordinate
}

function deltaY (angle, strength) {
  return Math.sin(angle) * strength; // turns angular vector into y delta coordinate
}

function grav(m1, m2, dist) {
  //return (m * g) / Math.pow(dist, 2);
  return (g * m1 * m2) / Math.pow(dist, 2);
}

function radius(m) {
  // it would be nice to calculate density, but one challenge at a time.
  // density could be a multiplier that delivers a value that grows very slowly and then increases enormously at large m values
  // combined with luminosity and radiation pressure, simulating stars would become feasible.
  // not sure how to incorporate more than the main sequence of star development: https://de.wikipedia.org/wiki/Hauptreihe#/media/File:HRDiagram.png

  return Math.sqrt(m/Math.PI); // this assumes mass is f(x) = x of the surface area and returns the radius. iff mass increases density, insert factor here.

}




// ----------------------
// simulation functions
// ----------------------


function update() {
  if (clearCtx >= CLEARCTXCOUNT) {
    clearCtx = 0;
    ctx.fillStyle='rgba(0,0,0,.1)';//"#000";
    ctx.fillRect(0, 0, 2000, 2000);
  } else {
    clearCtx++;
  }
  //ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx1.clearRect(0, 0, canvas.width, canvas.height);

  for (var i = 0; i < n; i++) {
    if (nbody[i]) {
        // no extreme positions, finite universe
        if (nbody[i].x >= 2000) { nbody[i].x = -50; }
        else if (nbody[i].x <= -50) { nbody[i].x = 2000; }
        if (nbody[i].y >= 1200) { nbody[i].y = -50; }
        else if (nbody[i].y <= -50) { nbody[i].y = 1200; }

        var contact = 0;
        for (var j = 0; j < n; j++) {
            if (nbody[i] && nbody[j]) {
                if (i != j) {
                    var myDist = dist(nbody[i].x, nbody[i].y, nbody[j].x, nbody[j].y);
                    myDist = myDist || 0;
                    if (myDist > (radius(nbody[i].m)+radius(nbody[j].m))) {
                        var myRad = radian(nbody[i].x, nbody[i].y, nbody[j].x, nbody[j].y);

                        var myG = grav(nbody[i].m, nbody[j].m, myDist);

                        // draw attraction vector from object center
                        // for some reason, deltaX and Y need to be reversed. weird!
                        var attrX = deltaY(myRad, myG);
                        var attrY = deltaX(myRad, myG);

                        var as = dist(nbody[i].x, nbody[i].y, nbody[i].x + deltaX(nbody[i].ia, nbody[i].is) + attrX, nbody[i].y + deltaY(nbody[i].ia, nbody[i].is) + attrY);
                        var aa = Math.PI * .5 - radian(nbody[i].x, nbody[i].y, nbody[i].x + deltaX(nbody[i].ia, nbody[i].is) + attrX, nbody[i].y + deltaY(nbody[i].ia, nbody[i].is) + attrY);

                        nbody[i].is = as;
                        nbody[i].ia = aa;

                    } else {
                        if (nbody[i].m >= nbody[j].m) {
                            nbody[i].m += nbody[j].m;
                            nbody[i].coll = collEffectDuration;

                            var sumDX = deltaX(nbody[i].ia,nbody[i].is) + deltaX(nbody[j].ia,nbody[j].is)
                            var sumDY = deltaY(nbody[i].ia,nbody[i].is) + deltaY(nbody[j].ia,nbody[j].is);

                            nbody[i].ia = dist(nbody[i].x, nbody[i].y, nbody[i].x + sumDX, nbody[i].y + sumDY);
                            nbody[i].ia = Math.PI * .5 - radian(nbody[i].x, nbody[i].y, nbody[i].x + sumDX, nbody[i].y + sumDY);

                            nbody = nbody.filter(c=>c!==nbody[j]);
                            
                        } else {
                            nbody[j].m += nbody[i].m;
                            nbody[j].coll = collEffectDuration;

                            var sumDX = deltaX(nbody[i].ia,nbody[i].is) + deltaX(nbody[j].ia,nbody[j].is)
                            var sumDY = deltaY(nbody[i].ia,nbody[i].is) + deltaY(nbody[j].ia,nbody[j].is);

                            nbody[j].ia = dist(nbody[j].x, nbody[j].y, nbody[j].x + sumDX, nbody[j].y + sumDY);
                            nbody[j].ia = Math.PI * .5 - radian(nbody[j].x, nbody[j].y, nbody[j].x + sumDX, nbody[j].y + sumDY);

                            nbody = nbody.filter(c=>c!==nbody[i]);

                        }
                        n = nbody.length;
                    }
                }
            }   
       }


        //ctx.beginPath();
        //ctx.moveTo(nbody[i].x,nbody[i].y);
        //ctx.strokeStyle = 'rgba(255,80,80,1)';
        // this draws the impulse vector, with a magnification of 100.
        // (a line towards the position the nbody will be located in at the next simulation frame.)
        //ctx.lineTo(nbody[i].x + (deltaX(nbody[i].ia, nbody[i].is) * 100), nbody[i].y+(deltaY(nbody[i].ia, nbody[i].is) * 100));
        //ctx.closePath();
        //ctx.stroke();

        if (nbody[i]) {
            //update positions
            nbody[i].x += deltaX(nbody[i].ia,nbody[i].is/(nbody[i].m*INERTIA)); // updates x position based on impulse vector. ignores inertia
            nbody[i].y += deltaY(nbody[i].ia,nbody[i].is/(nbody[i].m*INERTIA)); // updates y position based on impulse vector. ignores inertia

            // draw nbody circles

            //tracer
            ctx.beginPath();
            ctx.arc(nbody[i].x,nbody[i].y,.1,0,2*Math.PI);
            var col = 'hsl('+nbody[i].is/(nbody[i].m*INERTIA)*100+','+nbody[i].is*60+'%, '+(nbody[i].m/4+40)+'%)';
            ctx.strokeStyle = col;
            ctx.fillStyle = col;
            ctx.fill();
            ctx.stroke();

            //body
            ctx1.beginPath();
            ctx1.arc(nbody[i].x,nbody[i].y,radius(nbody[i].m),0,2*Math.PI);
            var col = 'hsl('+nbody[i].is/(nbody[i].m*INERTIA)*100+','+nbody[i].is*60+'%, '+(nbody[i].m/4+40)+'%)';
            ctx1.strokeStyle = col;
            ctx1.fillStyle = col;
            ctx1.fill();
            ctx1.stroke();

        }
        }
    }
    $('#debug').html(n);
}


function animate() {


  stats.begin();

  update();

  stats.end();

  requestAnimationFrame( animate );

}

animate();
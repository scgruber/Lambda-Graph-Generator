/*
 * util.js
 * Lambda Graph Generator
 * Sam Gruber <sam@scgruber.com>
 */

/* Animation shim */
window.requestAnimFrame = (function(callback) {
  return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
  function(callback) {
    window.setTimeout(callback, 1000 / 60);
  };
})();

/* Test if a string is alphabetic */
function isAlpha(str) {
  return !/[^a-zA-Z]/.test(str);
}

/* Reset the drawing transformation matrix */
function resetTransform(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/* Convert spherical coords to cartesian */
function sphericalToCartesian(r, theta, cx, cy) {
  return {
    x: cx + (r * Math.cos(theta)),
    y: cy + (r * Math.sin(theta))
  }
}

/* Calculate euclidean distance */
function dist(x1, y1, x2, y2) {
  return Math.sqrt( ((x1-x2)*(x1-x2)) + ((y1-y2)*(y1-y2)));
}

/* Calculate nearest point on p1-p2 to x */
function nearestPoint(p1, p2, x) {
  var dir = Vec2D.sub(p2, p1);
  if (Vec2D.norm(dir) == 0) {
    return Vec2D.copy(p1);
  }
  var t = Vec2D.dot(dir, Vec2D.sub(x, p1)) / Vec2D.dot(dir, dir);
  if (t < 0) {
    /* Ideal point is before start */
    return Vec2D.copy(p1);
  } else if (t > 1) {
    return Vec2D.copy(p2);
  } else {
    return Vec2D.add(p1, Vec2D.mult(t, dir));
  }
}

function sign(x) {
  return x < 0 ? -1 : 1;
}

/****************
 * Vec2D Object *
 ****************/
function Vec2D(x, y) {
  this.x = x;
  this.y = y;
}

Vec2D.copy = function(v) {
  return new Vec2D(v.x, v.y);
}

Vec2D.fromSpherical = function(r, theta, center) {
  return new Vec2D(center.x + (r * Math.cos(theta)), center.y + (r * Math.sin(theta)));
}

/* Arithmetic operators */
Vec2D.add = function(v, w) {
  return new Vec2D(v.x + w.x, v.y + w.y);
}

Vec2D.sub = function(v, w) {
  return new Vec2D(v.x - w.x, v.y - w.y);
}

Vec2D.dot = function(v, w) {
  return (v.x * w.x) + (v.y * w.y);
}

Vec2D.mult = function(s, v) {
  return new Vec2D(s * v.x, s * v.y);
}

Vec2D.norm = function(v) {
  return Math.sqrt((v.x*v.x) + (v.y*v.y))
}

Vec2D.dist = function(v, w) {
  return Vec2D.norm(Vec2D.sub(v, w));
}

Vec2D.unit = function(v) {
  if (Vec2D.norm(v) == 0) {
    return v;
  }
  return new Vec2D(v.x / Vec2D.norm(v), v.y / Vec2D.norm(v));
}

Vec2D.lerp = function(v, w, s) {
  return Vec2D.add(v, Vec2D.mult(s, Vec2D.sub(w, v)));
}

Vec2D.swap = function(v) {
  return new Vec2D(v.y, v.x);
}

/*******************
 * Drawing methods *
 *******************/
function drawStrokeCircle(ctx, center, r) {
  ctx.beginPath();
  ctx.arc(center.x, center.y, r, 0, 2*Math.PI);
  ctx.stroke();
}

function drawFillCircle(ctx, center, r) {
  ctx.beginPath();
  ctx.arc(center.x, center.y, r, 0, 2*Math.PI);
  ctx.fill();
}

function drawLine(ctx, start, end) {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}

/* Draw a bezier curve with relative control vectors */
function drawBezier(ctx, start, cp, end) {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.quadraticCurveTo(cp.x, cp.y, end.x, end.y);
  ctx.stroke();
}
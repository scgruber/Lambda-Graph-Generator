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

/****************
 * Vec2D Object *
 ****************/
function Vec2D(x, y) {
  this.x = x;
  this.y = y;
}

Vec2D.prototype.copy = function(v) {
  return new Vec2D(v.x, v.y);
}

/* Arithmetic operators */
Vec2D.prototype.add = function(v, w) {
  return new Vec2D(v.x + w.x, v.y + w.y);
}

Vec2D.prototype.sub = function(v, w) {
  return new Vec2D(v.x - w.x, v.y - w.y);
}

Vec2D.prototype.dot = function(v, w) {
  return (v.x * w.x) + (v.y * w.y);
}

Vec2D.prototype.mult = function(s, v) {
  return new Vec2D(s * v.x, s * v.y);
}

Vec2D.prototype.norm = function(v) {
  return Math.sqrt((v.x*v.x) + (v.y*v.y))
}

Vec2D.prototype.dist = function(v, w) {
  return Vec2D.norm(Vec2D.sub(v, w));
}


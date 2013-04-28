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
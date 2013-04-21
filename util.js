/*
 * util.js
 * Lambda Graph Generator
 * Sam Gruber <sam@scgruber.com>
 */

/* Test if a string is alphabetic */
function isAlpha(str) {
  return !/[^a-zA-Z]/.test(str);
}

/* Reset the drawing transformation matrix */
function resetTransform(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/* Convert spherical coords to cartesian */
function sphericalToCartesian(r, theta) {
  return {
    x: r * Math.cos(theta),
    y: r * Math.sin(theta)
  }
}

/* Calculate euclidean distance */
function dist(x1, y1, x2, y2) {
  return Math.sqrt( ((x1-x2)*(x1-x2)) + ((y1-y2)*(y1-y2)));
}
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
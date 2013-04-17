/*
 * lgg.js
 * Lambda Graph Generator
 * Sam Gruber <sam@scgruber.com>
 */

 /* Globals */
 var drawings = [];

$(function() {
  /* Calls to execute on page load */

  /* Determine how many drawings are in the document */
  for (var i = 0; true; i++) {
    var canvas = $('#lgg-canvas-'+i);
    var text = $('#lgg-text-'+i);
    if (canvas.length && text.length) {
      drawings.push(new Drawing(canvas, text));
    } else {
      /* We've exhausted the canvasses on the page */
      break;
    }
  }

  for (var i = drawings.length-1; i >= 0; i--) {
    drawings[i].clear('#888888');
  }
});

/* Drawing object */
function Drawing(canvas, textfield) {
  textfield.width(canvas.width());

  this.context = canvas[0].getContext('2d');
  this.canvas = canvas;
  this.textfield = textfield;
}

Drawing.prototype.clear = function(hexcolor) {
  this.context.fillStyle = hexcolor;
  this.context.fillRect(0, 0, this.context.width, this.context.height);
}
/*
 * interact.js
 * Lambda Graph Generator
 * Sam Gruber <sam@scgruber.com>
 */

function ToolPalette(x, y) {
  this.x = x;
  this.y = y;

  this.overButton = this.ButtonNone;
  this.activeButton = this.ButtonNone;
}

ToolPalette.prototype.ButtonGroup = 0;
ToolPalette.prototype.ButtonInput = 1;
ToolPalette.prototype.ButtonPath = 2;
ToolPalette.prototype.ButtonNone = 3;

ToolPalette.prototype.bgColor = '#bfbfbf';
ToolPalette.prototype.overColor = '#9f9f9f';

ToolPalette.prototype.buttonWidth = 40;

ToolPalette.prototype.update = function(x, y) {
  if (this.isOnPalette(x, y)) {
    this.detectRollover(y);
  } else {
    this.overButton = this.ButtonNone;
  }
}

ToolPalette.prototype.display = function(ctx) {
  for (var i = 0; i < this.ButtonNone; i++) {
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(this.x, this.y+(i*40), 40, 40);
    if (this.overButton == i) {
      ctx.fillStyle = this.overColor;
      ctx.fillRect(this.x+5, this.y+(i*40)+5, 30, 30);
    }
  }
}

ToolPalette.prototype.isOnPalette = function(x, y) {
  return (this.x <= x) && (x <= (this.x + 40)) && (this.y <= y) && (y <= (this.y + ((this.ButtonNone-1)*40)));
}

ToolPalette.prototype.detectRollover = function(y) {
  for (var i = 0; i < this.ButtonNone; i++) {
    if ((this.y+(i*40)) <= y && y <= (this.y+((i+1)*40))) {
      this.overButton = i;
      break;
    }
  }
}

ToolPalette.prototype.selectButton = function() {
  this.activeButton = this.overButton;
}

ToolPalette.prototype.deselectButton = function() {
  this.activeButton = this.ButtonNone;
}

ToolPalette.prototype.drawButton = function(x, y, i) {
  switch (i) {
    default:
      /* Do nothing */
      break;
  }
}
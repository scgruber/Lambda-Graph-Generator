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

  this.pso = new PreSelectionObject();
}

ToolPalette.prototype.ButtonGroup = 0;
ToolPalette.prototype.ButtonInput = 1;
ToolPalette.prototype.ButtonPath = 2;
ToolPalette.prototype.ButtonNone = 3;

ToolPalette.prototype.bgColor = '#bfbfbf';
ToolPalette.prototype.overColor = '#9f9f9f';
ToolPalette.prototype.activeColor = '#9f9fcf';
ToolPalette.prototype.lineColor = '#7f1f1f';

ToolPalette.prototype.buttonWidth = 40;

ToolPalette.prototype.update = function(x, y) {
  if (this.isOnPalette(x, y)) {
    this.detectRollover(y);
  } else {
    this.overButton = this.ButtonNone;
    this.pso.update(x, y);
  }
}

ToolPalette.prototype.display = function(ctx) {
  ctx.clearRect(0, 0, ctx.width, ctx.height);
  this.pso.display(ctx);
  for (var i = 0; i < this.ButtonNone; i++) {
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(this.x, this.y+(i*40), 40, 40);
    if (this.activeButton == i) {
      ctx.fillStyle = this.activeColor;
      ctx.fillRect(this.x+5, this.y+(i*40)+5, 30, 30);
    } else if (this.overButton == i) {
      ctx.fillStyle = this.overColor;
      ctx.fillRect(this.x+5, this.y+(i*40)+5, 30, 30);
    }
    this.drawButton(ctx, i);
  }
}

ToolPalette.prototype.isOnPalette = function(x, y) {
  return (this.x <= x) && (x <= (this.x + 40)) && (this.y <= y) && (y <= (this.y + (this.ButtonNone*40)));
}

ToolPalette.prototype.detectRollover = function(y) {
  if (this.y < y && y < (this.y + ((this.ButtonNone) * 40))) {
    this.overButton = Math.floor((y - this.y) / 40);
  }
}

ToolPalette.prototype.selectButton = function() {
  this.activeButton = this.overButton;
  this.pso.tooltype = this.overButton;
}

ToolPalette.prototype.deselectButton = function() {
  this.activeButton = this.ButtonNone;
  this.pso.tooltype = this.ButtonNone;
}

ToolPalette.prototype.drawButton = function(ctx, i) {
  switch (i) {
    case this.ButtonGroup:
      ctx.lineColor = this.lineColor;
      ctx.beginPath();
      ctx.arc(this.x + 20, this.y + (i*40) + 20, 11, 0, 2*Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.x + 20, this.y + (i*40) + 20, 13, 0, 2*Math.PI);
      ctx.stroke();
      break;
    case this.ButtonInput:
      ctx.lineColor = this.lineColor;
      ctx.beginPath();
      ctx.arc(this.x + 20, this.y + (i*40) + 20, 12, 0, 2*Math.PI);
      ctx.stroke();
      ctx.strokeText("x", this.x + 18, this.y + (i*40) + 22);
      break;
    case this.ButtonPath:
      ctx.lineColor = this.lineColor;
      ctx.beginPath();
      ctx.arc(this.x + 20, this.y + (i*40) + 20, 12, 0, 2*Math.PI);
      ctx.stroke();
      break;
    default:
      /* Do nothing */
      break;
  }
}

function PreSelectionObject() {
  this.x = 0;
  this.y = 0;

  this.tooltype = this.ToolNone;
}

PreSelectionObject.prototype.ToolGroup = 0;
PreSelectionObject.prototype.ToolInput = 1;
PreSelectionObject.prototype.ToolPath = 2;
PreSelectionObject.prototype.ToolNone = 3;

PreSelectionObject.prototype.ghostColor = '#003fff';

PreSelectionObject.prototype.update = function(x, y) {
  this.x = x;
  this.y = y;
}

PreSelectionObject.prototype.display = function(ctx) {
  switch(this.tooltype) {
    case this.ToolGroup:
      ctx.lineColor = this.ghostColor;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 11, 0, 2*Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.x, this.y, 13, 0, 2*Math.PI);
      ctx.stroke();
      break;
    case this.ToolInput:
      ctx.lineColor = this.ghostColor;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 12, 0, 2*Math.PI);
      ctx.stroke();
      ctx.strokeText("x", this.x - 2, this.y + 2);
      break;
    case this.ToolPath:
      ctx.lineColor = this.ghostColor;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 12, 0, 2*Math.PI);
      ctx.stroke();
      break;
    default:
      /* ToolNone */
      break;
  }
}

PreSelectionObject.prototype.setTool = function(t){
  this.tooltype = t;
}
/*
 * nodes.js
 * Lambda Graph Generator
 * Sam Gruber <sam@scgruber.com>
 */

/****************
 * Group object *
 ****************/
function Group(parent) {
  this.x = 0;
  this.y = 0;
  this.r = 25;
  this.outerRadius = 25;

  this.parent = parent;
  this.inputs = [];
  this.interior = [];
  this.groups = [];
  this.output = new Output(this.r);
}

Group.prototype.clean = function() {
  this.x = 0;
  this.y = 0;
  this.r = 25;
  this.outerRadius = 25;
  
  this.inputs = [];
  this.interior = [];
  this.groups = [];
  this.output = new Output(this.r);
}

Group.prototype.addMerge = function(fn, arg, output) {
  /* By default, set the output to the group's output */
  var m = new Merge(fn, arg, output);

  /* Fix inputs */
  if (fn != null && fn.output) {
    fn.output = m;
  }
  if (arg != null && arg.output) {
    arg.output = m;
  }

  this.interior.push(m);

  return m;
}

Group.prototype.addGroup = function(grp) {
  this.groups.push(grp);
}

Group.prototype.getInput = function(arg) {
  for (var i = this.inputs.length-1; i >= 0; i--) {
    if (this.inputs[i].arg == arg) {
      /* Found the input we were looking for */
      return this.inputs[i];
    }
  }

  if (this.parent != null) {
    /* Look higher in the ancestry */
    return this.parent.getInput(arg);
  } else {
    /* Couldn't find it */
    return null;
  }
}

Group.prototype.setPos = function(x, y) {
  var dx = x - this.x;
  var dy = y - this.y;

  this.x += dx;
  this.y += dy;
  this.output.x = this.x;
  this.output.y = this.y + this.r;
  for (var i = this.inputs.length-1; i >= 0; i--) {
    this.inputs[i].setPos(this.inputs[i].x + dx, this.inputs[i].y + dy);
  }
  for (var i = this.interior.length-1; i >= 0; i--) {
    this.interior[i].setPos(this.interior[i].x + dx, this.interior[i].y + dy);
  }
  for (var i = this.groups.length-1; i >= 0; i--) {
    this.groups[i].setPos(this.groups[i].x + dx, this.groups[i].y + dy);
  }
}

Group.prototype.update = function() {
  /* Update children */
  var maxInputRadius = 0;
  for (var i = this.inputs.length-1; i >= 0; i--) {
    var ir = this.inputs[i].update();
    maxInputRadius = Math.max(maxInputRadius, ir);
  }
  for (var i = this.groups.length-1; i >= 0; i--) {
    this.groups[i].update();
  }
  for (var i = this.interior.length-1; i >= 0; i--) {
    this.interior[i].update();
  }

  /* Update group radius */
  var defaultRadius = 25;

  /* Calculate best radius to separate inputs */
  var totalInputDiams = 0;
  for (var i = this.inputs.length-1; i >= 0; i--) {
    totalInputDiams += 2 * this.inputs[i].r;
  }
  /* The total size of the inputs cannot be more than (PI/2) * radius */
  var radiusByInputs = totalInputDiams/(Math.PI/2) + 10;

  /* Calculate best radius to contain interior groups */
  var radiusByGroups = 0;
  for (var i = this.groups.length-1; i >= 0; i--) {
    var centerDist = dist(this.x, this.y, this.groups[i].x, this.groups[i].y);
    radiusByGroups = Math.max(radiusByGroups, centerDist + this.groups[i].r);
  }
  radiusByGroups += 10;

  this.r = Math.max(defaultRadius, Math.max(radiusByInputs, radiusByGroups));
  this.outerRadius = this.r + maxInputRadius;


  /* Update inputs */
  var angularPos = 0;
  for (var i = this.inputs.length-1; i >= 0; i--) {
    angularPos += (this.inputs[i].r/totalInputDiams) * Math.PI;
    var coords = sphericalToCartesian(this.r, angularPos);
    this.inputs[i].setPos(this.x + coords.x, this.y - coords.y);
    angularPos += (this.inputs[i].r/totalInputDiams) * Math.PI;
  }

  /* Update output */
  this.output.y = this.r;
}

Group.prototype.display = function(ctx) {
  if (this.inputs.length == 0) {
    this.output.displayHidden(ctx);
  } else {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r+1.5, 0, 2*Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r-1.5, 0, 2*Math.PI);
    ctx.stroke();
    this.output.display(ctx);
  }

  for (var i = 0; i < this.groups.length; i++) {
    this.groups[i].display(ctx);
  }

  for (var i = 0; i < this.interior.length; i++) {
    this.interior[i].display(ctx);
  }

  for (var i = 0; i < this.inputs.length; i++) {
    this.inputs[i].display(ctx);
  }
}


/****************
 * Input object *
 ****************/
function Input(arg) {
  this.x = 0;
  this.y = 0;
  this.r = 10;

  this.arg = arg;
  this.group = null;
}

Input.prototype.fillColor = '#ffffff';
Input.prototype.strokeColor = '#000000';

Input.prototype.update = function() {
  if (this.group != null) {
    this.group.update();
    this.r = this.group.outerRadius + 10;
  }
  return this.r;
}

Input.prototype.display = function(ctx) {
  ctx.fillStyle = this.fillColor;
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI);
  ctx.fill();

  ctx.strokeStyle = this.strokeColor;
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI);
  ctx.stroke();

  if (this.group == null) {
    ctx.strokeText(this.arg, this.x-2, this.y+2);
  } else {
    this.group.display(ctx);
  }
}

Input.prototype.setGroup = function(grp) {
  this.group = grp;
  this.r = grp.r + 10;
}

Input.prototype.setPos = function(x, y) {
  var dx = x - this.x;
  var dy = y - this.y;

  this.x += dx;
  this.y += dy;
  if (this.group != null) {
    this.group.setPos(this.group.x + dx, this.group.y + dy);
  }
}


/****************
 * Merge object *
 ****************/
function Merge(fn, arg, output) {
  this.x = 0;
  this.y = 0;
  this.posRatio = 0.5;

  this.fn = fn;
  this.arg = arg;
  this.output = output;
}

Merge.prototype.strokeColor = '#000000';

Merge.prototype.setPos = function(x, y) {
  this.x = x;
  this.y = y;
}

Merge.prototype.update = function() {
  var mainAngle = Math.atan((this.fn.y-this.output.y)/(this.fn.x-this.output.x));
  var branchAngle = 10;
  if (this.arg != null) {
    branchAngle = Math.atan((this.y-this.arg.y)/(this.x-this.arg.x));
  }

  if (branchAngle != 10) {
    if ((mainAngle-branchAngle) < (-Math.PI/6)) {
      this.posRatio -= 0.01;
    } else if ((mainAngle-branchAngle) > Math.PI/6) {
      this.posRatio += 0.01;
    }
  }

  this.x = (this.fn.x*(1-this.posRatio)) + (this.output.x*this.posRatio);
  this.y = (this.fn.y*(1-this.posRatio)) + (this.output.y*this.posRatio);
}

Merge.prototype.display = function(ctx) {
  ctx.strokeStyle = this.strokeColor;

  /* Draw to fn */
  if (this.fn != null) {
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.fn.x, this.fn.y);
    ctx.stroke();
  }

  /* Draw to arg */
  if (this.arg != null) {
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.arg.x, this.arg.y);
    ctx.stroke();
  }

  /* Draw to output */
  if (this.output != null) {
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.output.x, this.output.y);
    ctx.stroke();
  }
}


/*****************
 * Output object *
 *****************/
function Output(radius) {
  this.x = 0;
  this.y = radius;
  this.output = null;
}

Output.prototype.fillColor = '#000000';
Output.prototype.strokeColor = '#000000';

Output.prototype.display = function(ctx) {
  if (this.output != null) {
    ctx.strokeStyle = this.strokeColor;
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.output.x, this.output.y);
    ctx.stroke();
  }

  ctx.fillStyle = this.fillColor;
  ctx.beginPath();
  ctx.arc(this.x, this.y, 5, 0, 2*Math.PI);
  ctx.fill();
}

Output.prototype.displayHidden = function(ctx) {
  if (this.output != null) {
    ctx.strokeStyle = this.strokeColor;
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.output.x, this.output.y);
    ctx.stroke();
  }
}
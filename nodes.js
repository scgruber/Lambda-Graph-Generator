/*
 * nodes.js
 * Lambda Graph Generator
 * Sam Gruber <sam@scgruber.com>
 */

/****************
 * Group object *
 ****************/
function Group(parent) {
  this.pos = new Vec2D(0, 0);
  this.r = 25;
  this.outerRadius = 25;

  this.parent = parent;
  this.inputs = [];
  this.interior = [];
  this.groups = [];
  this.output = new Output(this.r);
}

Group.prototype.clean = function() {
  this.pos = new Vec2D(0, 0);
  this.r = 25;
  this.outerRadius = 25;
  
  this.inputs = [];
  this.interior = [];
  this.groups = [];
  this.output = new Output(this.r);
}

Group.prototype.addMerge = function(fn, arg, output) {
  /* By default, set the output to the group's output */
  var m = new Merge(this, fn, arg, output);
  output.input = m;

  /* Fix inputs */
  if (fn instanceof Merge || fn instanceof Output) {
    fn.output = m;
  } else if (fn instanceof Input) {
    fn.output.push(m);
  }
  if (arg instanceof Merge || arg instanceof Output) {
    arg.output = m;
  } else if (arg instanceof Input) {
    arg.output.push(m);
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
  var delta = new Vec2D(x - this.pos.x, y - this.pos.y);

  this.pos = Vec2D.add(this.pos, delta);
  this.output.pos = new Vec2D(this.pos.x, this.pos.y + this.r);
  for (var i = this.inputs.length-1; i >= 0; i--) {
    this.inputs[i].setPos(this.inputs[i].pos.x + delta.x, this.inputs[i].pos.y + delta.y);
  }
  for (var i = this.interior.length-1; i >= 0; i--) {
    this.interior[i].setPos(this.interior[i].pos.x + delta.x, this.interior[i].pos.y + delta.y);
  }
  for (var i = this.groups.length-1; i >= 0; i--) {
    this.groups[i].setPos(this.groups[i].pos.x + delta.x, this.groups[i].pos.y + delta.y);
  }
}

Group.prototype.removeEmptySubGroups = function() {
  /* Call for all of the inputs */
  for (var i = this.inputs.length-1; i >= 0; i--) {
    if (this.inputs[i].group != null) {
      this.inputs[i].group.removeEmptySubGroups();
    }
  }

  /* Call for all of the groups inside */
  /* Then remove each of those if they are empty */
  for (var i = this.groups.length-1; i >= 0; i--) {
    this.groups[i].removeEmptySubGroups();
    if (this.groups[i].inputs.length == 0) {
      this.groups[i].output.input.output = this.groups[i].output.output;

      for (var j = this.groups[i].interior.length-1; j >= 0; j--) {
        this.interior.push(this.groups[i].interior[j]);
      }

      /* Delete the group */
      this.groups[i] = null;
    }
  }

  /* Clean up the groups list */
  var newgroups = [];
  for (var i = this.groups.length-1; i >= 0; i--) {
    if (this.groups[i] != null) {
      newgroups.push(this.groups[i]);
    }
  }
  this.groups = newgroups;
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
    var centerDist = Vec2D.dist(this.pos, this.groups[i].pos);
    radiusByGroups = Math.max(radiusByGroups, centerDist + this.groups[i].outerRadius);
  }
  radiusByGroups += 10;

  this.r = Math.max(defaultRadius, Math.max(radiusByInputs, radiusByGroups));
  this.outerRadius = this.r + maxInputRadius;


  /* Update inputs */
  for (var i = this.inputs.length-1; i >= 0; i--) {
    for (var j = this.inputs.length-1; j >= 0; j--) {
      if (j != i) {
        var diff = this.inputs[i].angle - this.inputs[j].angle;
        if (0 < diff && diff < (Math.PI/(1.5*this.inputs.length))) {
          this.inputs[i].angularSpeed += 0.1;
        } else if (0 > diff && diff > -(Math.PI/(1.5*this.inputs.length))) {
          this.inputs[i].angularSpeed -= 0.1;
        }
      }
    }

  }

  /* Update output */
  this.output.pos = Vec2D.add(this.pos, new Vec2D(0, this.r));
}

Group.prototype.display = function(ctx) {
  drawStrokeCircle(ctx, this.pos, this.r + 1.5);
  drawStrokeCircle(ctx, this.pos, this.r - 1.5);
  this.output.display(ctx);

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

/*********************
 * FalseGroup object *
 *********************/
function FalseGroup(parent, arg) {
  this.pos = new Vec2D(0, 0);
  this.r = 25;
  this.outerRadius = 25;

  this.parent = parent;
  this.backtrace = parent.getInput(arg);
}

Input.prototype.fillColor = '#ffffff';
Input.prototype.strokeColor = '#000000';

FalseGroup.prototype.update = function() {};

FalseGroup.prototype.display = function(ctx) {
  ctx.fillStyle = this.fillColor;
  ctx.strokeStyle = this.strokeColor;

  drawLine(ctx, this.pos, this.backtrace.pos);

  drawFillCircle(ctx, this.pos, this.r + 1.5);

  drawStrokeCircle(ctx, this.pos, this.r + 1.5);
  drawStrokeCircle(ctx, this.pos, this.r - 1.5);
}

FalseGroup.prototype.setPos = function(x, y) {
  this.pos = new Vec2D(x, y);
}


/****************
 * Input object *
 ****************/
function Input(parent, arg) {
  this.parent = parent;
  this.pos = new Vec2D(0, 0);
  this.r = 20;
  this.angle = (Math.PI*Math.random())+(Math.PI);
  this.angularSpeed = 0;

  this.arg = arg;
  this.group = null;
  this.output = [];
}

Input.prototype.fillColor = '#ffffff';
Input.prototype.strokeColor = '#000000';
Input.prototype.frictor = 0.85;

Input.prototype.update = function() {
  /* Update angle */
  this.angle += this.angularSpeed;
  this.angle = Math.max(Math.min(this.angle, 2*Math.PI), Math.PI);
  this.angularSpeed *= this.frictor;

  var newPos = Vec2D.fromSpherical(this.parent.r, this.angle, this.parent.pos);
  this.setPos(newPos.x, newPos.y);

  if (this.group != null) {
    this.group.update();
    this.r = this.group.outerRadius + 10;
  }
  return this.r;
}

Input.prototype.display = function(ctx) {
  ctx.fillStyle = this.fillColor;
  drawFillCircle(ctx, this.pos, this.r);

  ctx.strokeStyle = this.strokeColor;
  drawStrokeCircle(ctx, this.pos, this.r);

  if (this.group == null) {
    ctx.fillStyle = this.strokeColor;
    ctx.font = "24px Cantarell";
    ctx.fillText(this.arg, this.pos.x-5, this.pos.y+5);
  } else {
    this.group.display(ctx);
  }
}

Input.prototype.setGroup = function(grp) {
  this.group = grp;
  this.r = grp.r + 10;
  this.group.setPos(this.pos.x, this.pos.y);
}

Input.prototype.setPos = function(x, y) {
  var delta = new Vec2D(x - this.pos.x, y - this.pos.y);

  this.pos = Vec2D.add(this.pos, delta);
  if (this.group != null) {
    this.group.setPos(this.group.pos.x + delta.x, this.group.pos.y + delta.y);
  }
}


/****************
 * Merge object *
 ****************/
function Merge(parent, fn, input, output) {
  this.parent = parent;
  this.pos = new Vec2D(0, 0);
  this.r = 10;

  this.fn = fn;
  this.input = input;
  this.output = output;
}

Merge.prototype.strokeColor = '#000000';

Merge.prototype.setPos = function(x, y) {
  this.pos = new Vec2D(x, y);
}

Merge.prototype.update = function() {
  var target;
  if (this.input == null) {
    target = Vec2D.lerp(this.fn.pos, this.output.pos, 0.5);
  } else {
    target = Vec2D.lerp(this.fn.pos, this.output.pos, 0.5);
    target = Vec2D.lerp(target, this.input.pos, 0.5);
  }

  this.pos = Vec2D.lerp(this.pos, target, 0.5);
}

Merge.prototype.display = function(ctx) {
  ctx.strokeStyle = this.strokeColor;

  var mainLength = Vec2D.dist(this.fn.pos, this.output.pos);
  var mainDir = Vec2D.unit(Vec2D.sub(this.output.pos, this.fn.pos));
  var lengthToFn = Vec2D.dist(this.fn.pos, this.pos);
  var lengthToOutput = Vec2D.dist(this.output.pos, this.pos);

  /* Draw to fn */
  var cp = Vec2D.add(this.pos, Vec2D.mult(-lengthToFn/2, mainDir));
  drawBezier(ctx, this.fn.pos, cp, this.pos);

  /* Draw to output */
  var cp = Vec2D.add(this.pos, Vec2D.mult(lengthToOutput/2, mainDir));
  drawBezier(ctx, this.pos, cp, this.output.pos);
}


/*****************
 * Output object *
 *****************/
function Output(radius) {
  this.pos = new Vec2D(0, radius);
  this.r = 5;

  this.output = null;
  this.input = null;
}

Output.prototype.fillColor = '#000000';
Output.prototype.strokeColor = '#ff0000';

Output.prototype.display = function(ctx) {
  if (this.output != null) {
    drawLine(ctx, this.pos, this.output.pos);
  }

  ctx.fillStyle = this.fillColor;
  drawFillCircle(ctx, this.pos, this.r);
}
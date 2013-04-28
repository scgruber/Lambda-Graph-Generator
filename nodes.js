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
    var centerDist = dist(this.x, this.y, this.groups[i].x, this.groups[i].y);
    radiusByGroups = Math.max(radiusByGroups, centerDist + this.groups[i].r);
  }
  radiusByGroups += 10;

  this.r = Math.max(defaultRadius, Math.max(radiusByInputs, radiusByGroups));
  this.outerRadius = this.r + maxInputRadius;


  /* Update inputs */
  for (var i = this.inputs.length-1; i >= 0; i--) {
    curPos = sphericalToCartesian(this.r, this.inputs[i].angle, this.x, this.y);
    smallPos = sphericalToCartesian(this.r, this.inputs[i].angle - 0.01, this.x, this.y);
    bigPos = sphericalToCartesian(this.r, this.inputs[i].angle + 0.01, this.x, this.y);

    var curAcc = 0;
    var smallAcc = 0;
    var bigAcc = 0;

    for (var j = this.inputs[i].output.length-1; j >= 0; j--) {
      curAcc += dist(curPos.x, curPos.y, this.inputs[i].output[j].x, this.inputs[i].output[j].y);
      smallAcc += dist(smallPos.x, smallPos.y, this.inputs[i].output[j].x, this.inputs[i].output[j].y);
      bigAcc += dist(bigPos.x, bigPos.y, this.inputs[i].output[j].x, this.inputs[i].output[j].y);
    }
    for (var j = this.inputs.length-1; j >= 0; j--) {
      if (i != j) {
        curAcc += 2*(dist(curPos.x, curPos.y, this.inputs[j].x, this.inputs[j].y) - this.inputs[i].r);
        smallAcc += 2*(dist(smallPos.x, smallPos.y, this.inputs[j].x, this.inputs[j].y) - this.inputs[i].r);
        bigAcc += 2*(dist(bigPos.x, bigPos.y, this.inputs[j].x, this.inputs[j].y) - this.inputs[i].r);
      }
    }

    if (smallAcc > curAcc && this.inputs[i].angle > (Math.PI)) {
      this.inputs[i].angle -= 0.01;
      this.inputs[i].setPos(smallPos.x, smallPos.y);
    } else if (bigAcc > curAcc && this.inputs[i].angle < (2*Math.PI)) {
      this.inputs[i].angle += 0.01;
      this.inputs[i].setPos(bigPos.x, bigPos.y);
    } else {
      this.inputs[i].setPos(curPos.x, curPos.y);
    }
  }

  /* Update output */
  this.output.y = this.r;
}

Group.prototype.display = function(ctx) {
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.r+1.5, 0, 2*Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.r-1.5, 0, 2*Math.PI);
  ctx.stroke();
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


/****************
 * Input object *
 ****************/
function Input(arg) {
  this.x = 0;
  this.y = 0;
  this.r = 10;
  this.angle = 3*Math.PI/2;

  this.arg = arg;
  this.group = null;
  this.output = [];
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
function Merge(fn, input, output) {
  this.x = 0;
  this.y = 0;
  this.r = 5;
  this.posRatio = 0.5;

  this.fn = fn;
  this.input = input;
  this.output = output;
}

Merge.prototype.strokeColor = '#000000';

Merge.prototype.setPos = function(x, y) {
  this.x = x;
  this.y = y;
}

Merge.prototype.update = function() {
  curX = (this.fn.x*(1-this.posRatio)) + (this.output.x*this.posRatio);
  curY = (this.fn.y*(1-this.posRatio)) + (this.output.y*this.posRatio);
  if (this.input != null) {
    smallX = (this.fn.x*(1-(this.posRatio-0.01))) + (this.output.x*(this.posRatio-0.01));
    smallY = (this.fn.y*(1-(this.posRatio-0.01))) + (this.output.y*(this.posRatio-0.01));
    bigX = (this.fn.x*(1-(this.posRatio+0.01))) + (this.output.x*(this.posRatio+0.01));
    bigY = (this.fn.y*(1-(this.posRatio+0.01))) + (this.output.y*(this.posRatio+0.01));

    curDP = Math.abs(((this.fn.x-this.output.x)*(this.input.x-curX)) + ((this.fn.y-this.output.y)*(this.input.y-curY)));
    smallDP = Math.abs(((this.fn.x-this.output.x)*(this.input.x-smallX)) + ((this.fn.y-this.output.y)*(this.input.y-smallY)));
    bigDP = Math.abs(((this.fn.x-this.output.x)*(this.input.x-bigX)) + ((this.fn.y-this.output.y)*(this.input.y-bigY)));

    if (smallDP < curDP && this.posRatio > 0.25) {
      this.posRatio -= 0.01;
      this.x = smallX;
      this.y = smallY;
    } else if (bigDP < curDP && this.posRatio < 0.75) {
      this.posRatio += 0.01;
      this.x = bigX;
      this.y = bigY;
    } else {
      this.x = curX;
      this.y = curY;
    }
  } else {
    this.x = curX;
    this.y = curY;
  }
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

  /* Draw to input */
  if (this.input != null) {
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.input.x, this.input.y);
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
  this.r = 5;

  this.output = null;
  this.input = null;
}

Output.prototype.fillColor = '#000000';
Output.prototype.strokeColor = '#ff0000';

Output.prototype.display = function(ctx) {
  if (this.output != null) {
    ctx.strokeStyle = this.strokeColor;
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.output.x, this.output.y);
    ctx.stroke();
  }

  ctx.fillStyle = this.fillColor;
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI);
  ctx.fill();
}
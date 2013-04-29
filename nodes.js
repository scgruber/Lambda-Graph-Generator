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
    radiusByGroups = Math.max(radiusByGroups, centerDist + this.groups[i].r);
  }
  radiusByGroups += 10;

  this.r = Math.max(defaultRadius, Math.max(radiusByInputs, radiusByGroups));
  this.outerRadius = this.r + maxInputRadius;


  /* Update inputs */
  for (var i = this.inputs.length-1; i >= 0; i--) {
    curPos = Vec2D.fromSpherical(this.r, this.inputs[i].angle, this.pos);
    smallPos = Vec2D.fromSpherical(this.r, this.inputs[i].angle - 0.01, this.pos);
    bigPos = Vec2D.fromSpherical(this.r, this.inputs[i].angle + 0.01, this.pos);

    var curAcc = 0;
    var smallAcc = 0;
    var bigAcc = 0;

    for (var j = this.inputs[i].output.length-1; j >= 0; j--) {
      curAcc += Math.pow(Vec2D.dist(curPos, this.inputs[i].output[j].pos), 2);
      smallAcc += Math.pow(Vec2D.dist(smallPos, this.inputs[i].output[j].pos), 2);
      bigAcc += Math.pow(Vec2D.dist(bigPos, this.inputs[i].output[j].pos), 2);
    }
    for (var j = this.inputs.length-1; j >= 0; j--) {
      if (i != j) {
        curAcc += Math.pow(Vec2D.dist(curPos, this.inputs[j].pos), 2) - this.inputs[i].r;
        smallAcc += Math.pow(Vec2D.dist(smallPos, this.inputs[j].pos), 2) - this.inputs[i].r;
        bigAcc += Math.pow(Vec2D.dist(bigPos, this.inputs[j].pos), 2) - this.inputs[i].r;
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
  this.output.pos = new Vec2D(0, this.r);
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


/****************
 * Input object *
 ****************/
function Input(arg) {
  this.pos = new Vec2D(0, 0);
  this.r = 20;
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
    var mainDir = Vec2D.unit(Vec2D.sub(this.output.pos, this.fn.pos));
    var normal = Vec2D.swap(mainDir);
    var startLimit = Vec2D.add(this.fn.pos, Vec2D.mult(this.fn.r + this.r, mainDir));
    var endLimit = Vec2D.sub(this.output.pos, Vec2D.mult(this.output.r + this.r, mainDir));
    var target = nearestPoint(startLimit, endLimit, this.input.pos);

    var i = 1;
    do {
      var above = Vec2D.add(target, Vec2D.mult(10/i, normal));
      var below = Vec2D.add(target, Vec2D.mult(-10/i, normal));

      var curDist = Number.MAX_VALUE, aboveDist = Number.MAX_VALUE, belowDist = Number.MAX_VALUE;

      for (var i = this.parent.interior.length-1; i >= 0; i--) {
        if (this.parent.interior[i] != this) {
          var curD = Vec2D.dist(target, this.parent.interior[i].pos);
          curDist = Math.max(curDist, curD);
          var aboveD = Vec2D.dist(target, this.parent.interior[i].pos);
          aboveDist = Math.max(aboveDist, aboveD);
          var belowD = Vec2D.dist(target, this.parent.interior[i].pos);
          belowDist = Math.max(belowDist, belowD);
        }
      }
      if (aboveDist > curDist && aboveDist > belowDist) {
        target = above;
      } else if (belowDist > curDist && belowDist > aboveDist) {
        target = below;
      } else {
        break;
      }
      i++;
    } while (Math.abs(curDist - aboveDist) > 0.01 && Math.abs(curDist - belowDist));

    // /* Find the two closest other points */
    // var closestDist = Number.MAX_VALUE;
    // var closestPt = null;
    // var prevClosestDist = Number.MAX_VALUE;
    // var prevClosestPt = null;
    // for (var i = this.parent.interior.length-1; i >= 0; i--) {
    //   if (this.parent.interior[i] != this) {
    //     var d = Vec2D.dist(this.parent.interior[i].pos, this.pos);
    //     if (d <= closestDist) {
    //       prevClosestDist = closestDist;
    //       prevClosestPt = closestPt;
    //       closestDist = d;
    //       closestPt = this.parent.interior[i];
    //     } else if (d <= prevClosestDist) {
    //       prevClosestDist = d;
    //       prevClosestPt = this.parent.interior[i];
    //     }
    //   }
    // }
    // /* Also incorporate the dist to the edge of circle */
    // var d = this.parent.r - Vec2D.dist(this.parent.pos, this.pos);
    // if (d <= closestDist) {
    //   prevClosestDist = closestDist;
    //   prevClosestPt = closestPt;
    //   closestDist = d;
    //   closestPt = null;
    // } else if (d <= prevClosestDist) {
    //   prevClosestDist = d;
    //   prevClosestPt = null;
    // }

    // /* Now we know that closestDist at least is something */
    // /* If there wasn't anything else in the circle, fall toward center */
    // if (prevClosestDist == Number.MAX_VALUE) {
    //   prevClosestDist = (2*this.parent.r) - d;
    // }

    // /* Offset away from mainDir by half the difference between the two distances */
    // var centerPoint = nearestPoint(startLimit, endLimit, this.input.pos);
    // var nearPt = closestPt ? closestPt.pos : this.parent.pos;
    // var towardNearest = Vec2D.unit(Vec2D.sub(nearPt, centerPoint));
    // var liftFactor = 0;
    // if (d >= 0 && prevClosestDist - closestDist != 0) {
    //   var liftFactor = 200/Math.abs(prevClosestDist - closestDist);
    // }
    // target = Vec2D.add(Vec2D.mult(-liftFactor, towardNearest), centerPoint);
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
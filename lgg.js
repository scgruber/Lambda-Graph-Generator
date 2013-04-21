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
      drawings.push(new Drawing(i, canvas, text));
    } else {
      /* We've exhausted the canvasses on the page */
      break;
    }
  }

  for (var i = drawings.length-1; i >= 0; i--) {
    drawings[i].tokens.produceDrawing(drawings[i].root);
    drawings[i].exec();
  }
});


/******************
 * Drawing object *
 ******************/
function Drawing(i, canvas, textfield) {
  this.width = canvas.width();
  this.height = canvas.height();

  textfield.width(canvas.width() - (parseInt(textfield.css('padding'))*2));

  this.context = canvas[0].getContext('2d');
  this.textfield = textfield;
  this.root = new Group(null);

  this.regenerateTokens(textfield.val());

  this.textfield.keyup(this.makeTextChangeHandler(i));
}

Drawing.prototype.exec = function() {
  resetTransform(this.context);
  this.update();
  this.display();
}

Drawing.prototype.update = function() {
  this.root.update();
}

Drawing.prototype.display = function() {
  this.clear('#ffffff');

  this.context.translate(this.width/2, this.height/2);

  this.root.display(this.context);

  this.context.translate(-this.width/2, -this.height/2);
}

Drawing.prototype.clear = function(hexcolor) {
  this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
  this.context.fillStyle = hexcolor;
  this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
}

Drawing.prototype.makeTextChangeHandler = function(i) {
  return function(eventObject) {
    drawings[i].regenerateTokens(this.value);
    drawings[i].tokens.produceDrawing(drawings[i].root);
    drawings[i].exec();
  }
}

Drawing.prototype.regenerateTokens = function(str) {
  try {
    var newTokens = new TokenString();
    newTokens.parseString(str.replace(/ /g,''));
    this.tokens = newTokens;
    this.setValid();
  } catch(err) {
    console.warn(err.message);
    this.setInvalid();
  }
}

Drawing.prototype.setValid = function() {
  this.textfield.css('background', '#adfdad');
}

Drawing.prototype.setInvalid = function() {
  this.textfield.css('background', '#fdadad');
}


/**********************
 * TokenString object *
 **********************/
function TokenString() {
  this.val = '';
  this.next = null;
  this.child = null;
}

TokenString.prototype.parseString = function(str) {
  this.val = '';
  this.next = null;
  this.child = null;

  if (str == '') {
    throw(new Error("Empty string passed to constructor!"));
  }

  if (str[0] == '(') {
    /* Enter into a group */
    if (str.length == 1) {
      throw(new Error("Unbounded group!"));
    } else if (str[1] == '\\') {
      /* Lambda abstraction */
      var i = 2;
      if (i >= str.length) {
        throw(new Error("Abstraction has no arguments"));
      }
      while (str[i] != '.') {
        this.val += str[i];
        i++;
        if (i == str.length) {
          throw(new Error("Abstraction has no dot"));
        }
      }
      var startIndex = ++i;
      var depth = 1;
      while (depth > 0) {
        if (i == str.length) {
          throw(new Error("Mismatched parentheses"));
        }
        if (str[i] == '(') depth++;
        else if (str[i] == ')') depth--;
        i++;
      }
      var finishIndex = i;
      childStr = str.substring(startIndex, finishIndex-1);
      if (childStr.length > 0) {
        this.child = new TokenString();
        this.child.parseString(childStr);
      }
      nextStr = str.substring(finishIndex);
      if (nextStr.length > 0) {
        this.next = new TokenString();
        this.next.parseString(nextStr);
      }
    } else {
      /* Group */
      var startIndex = 1;
      var i = 1;
      var depth = 1;
      while (depth > 0) {
        if (i == str.length) {
          throw(new Error("Mismatched parentheses"));
        }
        if (str[i] == '(') depth++;
        else if (str[i] == ')') depth--;
        i++;
      }
      var finishIndex = i;
      childStr = str.substring(startIndex, finishIndex-1);
      if (childStr.length > 0) {
        this.child = new TokenString();
        this.child.parseString(childStr);
      }
      nextStr = str.substring(finishIndex);
      if (nextStr.length > 0) {
        this.next = new TokenString();
        this.next.parseString(nextStr);
      }
    }
  } else if (isAlpha(str[0])) {
    /* Some valid character found */
    this.val = str[0];
    nextStr = str.substring(1);
    if (nextStr.length > 0) {
      this.next = new TokenString();
      this.next.parseString(nextStr);
    }
  } else {
    throw(new Error("Unexpected symbol at start of string!"));
  }
}

TokenString.prototype.toString = function() {
  var out = '';
  if (child != null) {
    out += '(';
    if (val != '') {
      /* Abstraction */
      out += '\\' + val + '.';
    }
    out += child.toString();
    out += ')';
  } else {
    out += val;
  }

  if (next != null) {
    out += next.toString();
  }

  return out;
}

TokenString.prototype.makeSingleton = function() {
  var singleton = new TokenString();
  singleton.val = this.val;
  singleton.next = null;
  singleton.child = this.child;
  return singleton;
}

TokenString.prototype.produceDrawing = function(grp) {
  /* Clean out the existing group data */
  grp.clean();

  if (this.child == null) {
    throw(new Error("Cannot draw a childless root!"));
  }

  var nextToken = this.next;
  for (var i = 0; i < this.val.length; i++) {
    var input = new Input(this.val[i]);
    if (nextToken != null) {
      var arg = new Group(grp.parent);
      nextToken.makeSingleton().produceDrawing(arg);
      nextToken = nextToken.next;
      input.setGroup(arg);
    }
    grp.inputs.push(input);
  }

  var nextChild = this.child;
  var appTo = null;
  while (nextChild != null) {
    if (nextChild.child == null) {
      /* Application node */
      var origin = grp.getInput(nextChild.val[0]);
      var output;
      if (appTo != null) {
        output = appTo;
      } else {
        output = grp.output;
      }
      appTo = grp.addMerge(origin, null, output);

      nextChild = nextChild.next;
    } else {
      /* Group node */
      var output;
      if (appTo != null) {
        output = appTo;
      } else {
        output = this.output;
      }
      var ingrp = new Group(grp);
      ingrp.output.output = output;

      nextChild = nextChild.produceDrawing(ingrp);
      grp.addGroup(ingrp);
    }
  }

  return nextToken;
}


/****************
 * Group object *
 ****************/
function Group(parent) {
  this.x = 0;
  this.y = 0;
  this.r = 25;

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
  
  this.inputs = [];
  this.interior = [];
  this.groups = [];
  this.output = new Output(this.r);
}

Group.prototype.addMerge = function(fn, arg, output) {
  /* By default, set the output to the group's output */
  var m = new Merge(fn, arg, output);

  /* Fix inputs */
  if (fn.output) {
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
  this.output.x += dx;
  this.output.y += dy;
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
  for (var i = this.inputs.length-1; i >= 0; i--) {
    this.inputs[i].update();
  }

  /* Update group radius */
  var defaultRadius = 25;

  var totalInputDiams = (this.inputs.length == 1) ? 0 : 0;
  for (var i = this.inputs.length-1; i >= 0; i--) {
    totalInputDiams += 2 * this.inputs[i].r;
  }
  /* The total size of the inputs cannot be more than (PI/2) * radius */
  var radiusByInputs = totalInputDiams/(Math.PI/2);

  this.r = Math.max(defaultRadius, radiusByInputs);

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
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI);
  ctx.stroke();

  for (var i = 0; i < this.groups.length; i++) {
    this.groups[i].display(ctx);
  }

  for (var i = 0; i < this.interior.length; i++) {
    this.interior[i].display(ctx);
  }

  for (var i = 0; i < this.inputs.length; i++) {
    this.inputs[i].display(ctx);
  }

  this.output.display(ctx);
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
    this.r = this.group.r + 10;
  }
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
    ctx.strokeText(this.arg, this.x, this.y);
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

  this.fn = fn;
  this.arg = arg;
  this.output = output;
}

Merge.prototype.strokeColor = '#000000';

Merge.prototype.setPos = function(x, y) {
  this.x = x;
  this.y = y;
}

Merge.prototype.display = function(ctx) {
  ctx.strokeStyle = this.strokeColor;

  /* Draw to fn */
  if (this.fn != null) {
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.fn.x, this.fn.y);
    ctx.stroke();
  }

  /* Draw to arg */
  if (this.arg != null) {
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.arg.x, this.arg.y);
    ctx.stroke();
  }

  /* Draw to output */
  if (this.output != null) {
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
}

Output.prototype.fillColor = '#000000';

Output.prototype.display = function(ctx) {
  ctx.fillStyle = this.fillColor;
  ctx.beginPath();
  ctx.arc(this.x, this.y, 5, 0, 2*Math.PI);
  ctx.fill();
}
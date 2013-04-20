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
    drawings[i].update();
    drawings[i].display();
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
  this.context.fillStyle = hexcolor;
  this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
}

Drawing.prototype.makeTextChangeHandler = function(i) {
  return function(eventObject) {
    drawings[i].regenerateTokens(this.value);
    drawings[i].tokens.produceDrawing(drawings[i].root);
    drawings[i].update();
    drawings[i].display();
  }
}

Drawing.prototype.regenerateTokens = function(str) {
  try {
    var newTokens = new TokenString(str);
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
function TokenString(str) {
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
        this.child = new TokenString(childStr);
      }
      nextStr = str.substring(finishIndex);
      if (nextStr.length > 0) {
        this.next = new TokenString(nextStr);
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
        this.child = new TokenString(childStr);
      }
      nextStr = str.substring(finishIndex);
      if (nextStr.length > 0) {
        this.next = new TokenString(nextStr);
      }
    }
  } else if ((65 <= str.charCodeAt(0) && str.charCodeAt(0) <= 90) || (97 <= str.charCodeAt(0) && str.charCodeAt(0) <= 122)) {
    /* Some valid character found */
    this.val = str[0];
    nextStr = str.substring(1);
    if (nextStr.length > 0) {
      this.next = new TokenString(nextStr);
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
  return {
    val: this.val,
    next: null,
    child: this.child
  }
}

TokenString.prototype.produceDrawing = function(grp) {
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
      nextChild = nextChild.next;
    } else {
      /* Group node */
      nextChild = nextChild.next;
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

Group.prototype.update = function() {
  this.r = 25;

  /* Update inputs */
  for (var i = 0; i < this.inputs.length; i++) {
    this.inputs[i].x = this.x + (this.r*Math.cos((i+1)*Math.PI/(i+2)));
    this.inputs[i].y = this.y - (this.r*Math.sin((i+1)*Math.PI/(i+2)));
  }

  /* Update output */
  this.output.y = this.r;
}

Group.prototype.display = function(ctx) {
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI);
  ctx.stroke();

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

Input.prototype.display = function(ctx) {
  ctx.fillStyle = this.fillColor;
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI);
  ctx.fill();

  ctx.strokeStyle = this.strokeColor;
  ctx.beginPath();
  ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI);
  ctx.stroke();
}

Input.prototype.setGroup = function(grp) {
  this.group = grp;
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
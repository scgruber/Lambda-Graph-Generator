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

  this.canvas = canvas;
  this.context = canvas[0].getContext('2d');
  this.textfield = textfield;
  this.root = new Group(null);
  this.palette = new ToolPalette(0, 0);

  this.regenerateTokens(textfield.val());

  this.textfield.keyup(this.makeTextChangeHandler(i));
  this.canvas.mousemove(this.makeMouseMoveHandler(i));
  this.canvas.click(this.makeMouseClickHandler(i));
}

Drawing.prototype.exec = function() {
  resetTransform(this.context);
  this.update();
  this.display();
  resetTransform(this.context);
  this.palette.update();
  this.palette.display(this.context);

}

Drawing.prototype.update = function() {
  this.root.update();
}

Drawing.prototype.display = function() {
  this.clear('#ffffff');

  this.context.translate(this.width/2, this.height/2);
  this.context.scale(1/this.root.r)

  this.root.display(this.context);

  this.context.scale(this.root.r);
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

Drawing.prototype.makeMouseMoveHandler = function(i) {
  return function(eventObject) {
    var mouseX = eventObject.pageX - drawings[i].canvas.offset().left;
    var mouseY = eventObject.pageY - drawings[i].canvas.offset().top;
    drawings[i].exec();
  }
}

Drawing.prototype.makeMouseClickHandler = function(i) {
  return function(eventObject) {
    drawings[i].palette.selectButton();
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
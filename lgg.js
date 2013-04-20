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
    drawings[i].clear('#dddddd');
  }
});


/******************
 * Drawing object *
 ******************/
function Drawing(i, canvas, textfield) {
  textfield.width(canvas.width() - (parseInt(textfield.css('padding'))*2));

  this.context = canvas[0].getContext('2d');
  this.textfield = textfield;

  this.regenerateTokens(textfield.val());

  this.textfield.keyup(this.makeTextChangeHandler(i));
}

Drawing.prototype.clear = function(hexcolor) {
  this.context.fillStyle = hexcolor;
  this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
}

Drawing.prototype.makeTextChangeHandler = function(i) {
  return function(eventObject) {
    drawings[i].regenerateTokens(this.value);
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
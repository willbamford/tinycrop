var Rectangle = function(x, y, width, height) {

  this._x = x;
  this._y = y;
  this._width = width;
  this._height = height;
};

Rectangle.prototype.copy = function(copy) {
  this._x = copy.x;
  this._y = copy.y;
  this._width = copy.width;
  this._height = copy.height;
  return this;
};

Rectangle.prototype.round = function() {
  var dx = this._x;
  var dy = this._y;
  this._x = Math.round(dx);
  this._y = Math.round(dy);
  dx -= this._x;
  dy -= this._y;
  this._width = Math.round(this._width + dx);
  this._height = Math.round(this._height + dy);
  return this;
};

Rectangle.prototype.isInside = function(point) {
  return point.x >= this.left &&
    point.y >= this.top &&
    point.x < this.right &&
    point.y < this.bottom;
};

Object.defineProperties(Rectangle.prototype, {
  x: {
    get: function() { return this._x; },
    set: function(v) { this._x = v; }
  },
  y: {
    get: function() { return this._y; },
    set: function(v) { this._y = v; }
  },
  centerX: {
    get: function() { return this._x + this._width * 0.5; },
    set: function(v) { this._x = v - this._width * 0.5; }
  },
  centerY: {
    get: function() { return this._y + this._height * 0.5; },
    set: function(v) { this._y = v - this._height * 0.5; }
  },
  width: {
    get: function() { return this._width; },
    set: function(v) { this._width = v; }
  },
  height: {
    get: function() { return this._height; },
    set: function(v) { this._height = v; }
  },
  left: {
    get: function() { return this._x; },
    set: function(v) {
      this._width = this._x + this._width - v;
      this._x = v;
    }
  },
  top: {
    get: function() { return this._y; },
    set: function(v) {
      this._height = this._y + this._height - v;
      this._y = v;
    }
  },
  right: {
    get: function() { return this._x + this._width; },
    set: function(v) {
      this._width = v - this._x;
    }
  },
  bottom: {
    get: function() { return this._y + this._height; },
    set: function(v) {
      this._height = v - this._y;
    }
  },
  aspectRatio: {
    get: function() { return this._width / this._height; }
  }
});

Rectangle.create = function(x, y, width, height) {
  return new Rectangle(x, y, width, height);
};

module.exports = Rectangle;

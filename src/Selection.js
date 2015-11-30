var Rectangle = require('./Rectangle.js');

var Selection = function(opts) {

  this.target = opts.target || null;
  this.bounds = Rectangle.create(0, 0, 0, 0);
  this.boundsPx = Rectangle.create(0, 0, 0, 0);
  this.region = Rectangle.create(0, 0, 400, 400);

  // TODO: change!
  this.minHeight = 100;
  this.minWidth = 100;
};

Object.defineProperties(Selection.prototype, {
  x: {
    get: function() { return this.bounds.x; },
    set: function(v) {
      this.bounds.x = Math.min(Math.max(v, this.target.bounds.x), this.target.bounds.x + this.target.bounds.width - this.bounds.width);
    }
  },
  y: {
    get: function() { return this.bounds.y; },
    set: function(v) {
      this.bounds.y = Math.min(Math.max(v, this.target.bounds.y), this.target.bounds.y + this.target.bounds.height - this.bounds.height);
    }
  },
  width: {
    get: function() { return this.bounds.width; },
    set: function(v) { this.bounds.width = v; }
  },
  height: {
    get: function() { return this.bounds.height; },
    set: function(v) { this.bounds.height = v; }
  },
  left: {
    get: function() { return this.bounds.x; },
    set: function(v) {
      this.bounds.left = Math.min(Math.max(v, this.target.bounds.left), this.bounds.right - this.minWidth);
    }
  },
  top: {
    get: function() { return this.bounds.y; },
    set: function(v) {
      this.bounds.top = Math.min(Math.max(v, this.target.bounds.top), this.bounds.bottom - this.minHeight);
    }
  },
  right: {
    get: function() { return this.bounds.right; },
    set: function(v) {
      this.bounds.right = Math.max(Math.min(v, this.target.bounds.right), this.bounds.left + this.minWidth);
    }
  },
  bottom: {
    get: function() { return this.bounds.bottom; },
    set: function(v) {
      this.bounds.bottom = Math.max(Math.min(v, this.target.bounds.bottom), this.bounds.top + this.minHeight);
    }
  },
  aspectRatio: {
    get: function() { return this.bounds.aspectRatio; }
  }
});

Selection.prototype.isInside = function(point) {
  return this.bounds.isInside(point);
};

Selection.create = function(opts) {
  return new Selection(opts);
};

module.exports = Selection;

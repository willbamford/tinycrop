var Rectangle = require('./Rectangle.js');

var Selection = function(opts) {

  this.target = opts.target || null;
  this.bounds = Rectangle.create(0, 0, 0, 0);
  this.boundsPx = Rectangle.create(0, 0, 0, 0);
  this.region = Rectangle.create(0, 0, 400, 400);
  this.aspectRatio = opts.aspectRatio;

  // TODO: change!
  this.minHeight = 100;
  this.minWidth = 100;

  this._delta = {x: 0, h: 0};
};

Object.defineProperties(Selection.prototype, {
  x: {
    get: function() { return this.bounds.x; },
    set: function(v) { this.bounds.x = v; }
  },
  y: {
    get: function() { return this.bounds.y; },
    set: function(v) { this.bounds.y = v; }
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
      this.bounds.left = v;
    }
  },
  top: {
    get: function() { return this.bounds.y; },
    set: function(v) { this.bounds.top = v; }
  },
  right: {
    get: function() { return this.bounds.right; },
    set: function(v) { this.bounds.right = v; }
  },
  bottom: {
    get: function() { return this.bounds.bottom; },
    set: function(v) { this.bounds.bottom = v; }
  }
});

Selection.prototype.moveBy = function(dx, dy) {

  var bounds = this.bounds;
  var target = this.target;

  bounds.x = Math.min(Math.max(bounds.x + dx, target.bounds.x), target.bounds.x + target.bounds.width - bounds.width);
  bounds.y = Math.min(Math.max(bounds.y + dy, target.bounds.y), target.bounds.y + target.bounds.height - bounds.height);
};

Selection.prototype.resizeBy = function(dx, dy, p) {

  var delta = this._delta;
  var aspectRatio = this.aspectRatio;
  var bounds = this.bounds;
  var minWidth = this.minWidth;
  var minHeight = this.minHeight;
  var target = this.target;

  function updateDelta(x, y) {
    delta.width = bounds.width + x;
    delta.height = bounds.height + y;

    delta.width = Math.max(minWidth, delta.width);
    delta.height = Math.max(minHeight, delta.height);

    if (delta.width / delta.height > aspectRatio)
      delta.width = delta.height * aspectRatio;
    else
      delta.height = delta.width / aspectRatio;

    delta.width -= bounds.width;
    delta.height -= bounds.height;
  }

  if (p[0] === 'n')
    dy = Math.min(dy, this.top - target.bounds.top);
  else if (p[0] === 's')
    dy = Math.min(dy, target.bounds.bottom - this.bottom);

  if (p[1] === 'w')
    dx = Math.min(dx, this.left - target.bounds.left);
  else if (p[1] === 'e')
    dx = Math.min(dx, target.bounds.right - this.right);

  updateDelta(dx, dy);

  switch (p) {
    case 'nw':
      this.left -= delta.width;
      this.top -= delta.height;
      break;
    case 'ne':
      this.right += delta.width;
      this.top -= delta.height;
      break;
    case 'sw':
      this.left -= delta.width;
      this.bottom += delta.height;
      break;
    case 'se':
      this.right += delta.width;
      this.bottom += delta.height;
      break;
  }

};

Selection.prototype.isInside = function(point) {
  return this.bounds.isInside(point);
};

Selection.create = function(opts) {
  return new Selection(opts);
};

module.exports = Selection;

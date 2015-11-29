var Input = require('./Input.js');
var Listeners = require('./Listeners.js');

var SelectionLayer = function(opts) {

  this.bounds = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  };

  this.region = {
    x: 0,
    y: 0,
    width: 400,
    height: 400
  };

  this.parent = opts.parent;
  this.context = opts.context;
  this.target = opts.target;
  this.minSize = opts.minSize || {
    width: 10,
    height: 10
  };
  this.aspectRatio = opts.aspectRatio;

  var handleOpts = opts.handle || {};
  handleOpts.length = handleOpts.length || 32;
  handleOpts.depth = handleOpts.depth || 3;
  handleOpts.size = handleOpts.size || handleOpts.length * 2;
  handleOpts.color = handleOpts.color || 'rgba(255, 255, 255, 1.0)';
  handleOpts.activeColor = handleOpts.activeColor || 'rgba(255, 0, 160, 1.0)';
  this.handleOpts = handleOpts;

  this.listeners = Listeners.create();

  this.input = Input.create(this.parent.canvas);

  this.activeRegion = null;
  this.delta = {x: 0, y: 0};
  this.downEvent = null;
  this.downBounds = {x: 0, y: 0};

  this.input.on('down', function(e) {

    var hitRegion = this.findHitRegion(e);

    if (hitRegion) {
      this.activeRegion = hitRegion;
      this.setCursor(hitRegion);
      this.downEvent = e;
      this.downBounds.x = this.bounds.x;
      this.downBounds.y = this.bounds.y;
      this.downBounds.width = this.bounds.width;
      this.downBounds.height = this.bounds.height;
      e.source.preventDefault();
    }

  }.bind(this));

  this.input.on('move', function(e) {

    var activeRegion = this.activeRegion;

    if (!activeRegion) {
      var hitRegion = this.findHitRegion(e);
      if (hitRegion) {
        this.setCursor(hitRegion);
        e.source.preventDefault();
      } else {
        this.resetCursor();
      }
    } else {

      e.source.preventDefault();

      var delta = this.delta;
      var target = this.target;
      var bounds = this.bounds;
      var downBounds = this.downBounds;
      var downEvent = this.downEvent;

      delta.x = e.x - downEvent.x;
      delta.y = e.y - downEvent.y;

      var bounds = this.bounds;

      var minLen = this.handleOpts.length * 2;
      var minWidth = minLen;
      var minHeight = minLen;

      var moveLeft = downBounds.x;
      var moveTop = downBounds.y;
      var moveWidth = downBounds.width;
      var moveHeight = downBounds.height;
      var moveRight = moveLeft + moveWidth;
      var moveBottom = moveTop + moveHeight;
      var moveAspectRatio;

      if (activeRegion === 'move') {
        moveLeft += delta.x;
        moveTop += delta.y;
        moveLeft = Math.min(Math.max(moveLeft, target.bounds.x), target.bounds.x + target.bounds.width - moveWidth);
        moveTop = Math.min(Math.max(moveTop, target.bounds.y), target.bounds.y + target.bounds.height - moveHeight);
      } else {
        var dirV = activeRegion[0];
        var dirH = activeRegion[1];

        if (dirV === 'n') {
          moveTop += delta.y;
          if (delta.y < 0) {
            moveTop = Math.max(target.bounds.y, moveTop);
            moveHeight = moveBottom - moveTop;
          } else {
            moveHeight = Math.max(minHeight, moveBottom - moveTop);
            moveTop = moveBottom - moveHeight;
          }
        } else if (dirV === 's') {
          moveBottom += delta.y;
          if (delta.y > 0) {
            moveBottom = Math.min(target.bounds.y + target.bounds.height, moveBottom);
            moveHeight = moveBottom - moveTop;
          } else {
            moveHeight = Math.max(minHeight, moveBottom - moveTop);
            moveBottom = moveTop + Math.max(minHeight, moveBottom - moveTop);
          }
        }

        if (dirH === 'w') {
          moveLeft += delta.x;
          if (delta.x < 0) {
            moveLeft = Math.max(target.bounds.x, moveLeft);
            moveWidth = moveRight - moveLeft;
          } else {
            moveWidth = Math.max(minWidth, moveRight - moveLeft);
            moveLeft = moveRight - Math.max(minWidth, moveRight - moveLeft);
          }
        } else if (dirH === 'e') {
          moveRight += delta.x;
          if (delta.x > 0) {
            moveRight = Math.min(target.bounds.x + target.bounds.width, moveRight);
            moveWidth = moveRight - moveLeft;
          } else {
            moveWidth = Math.max(minWidth, moveRight - moveLeft);
            moveRight = moveLeft + Math.max(minWidth, moveRight - moveLeft);
          }
        }
      }

      this.setBounds(moveLeft, moveTop, moveWidth, moveHeight);
      this.updateRegion();
      this.listeners.notify('regionChange', this);
    }

  }.bind(this));

  function handleUpOrCancel(e) {
    e.source.preventDefault();
    this.activeRegion = null;
    this.resetCursor();
    this.downEvent = null;
    this.listeners.notify('dirty', this);
  }

  this.input
    .on('up', handleUpOrCancel.bind(this))
    .on('cancel', handleUpOrCancel.bind(this));
};

SelectionLayer.create = function(opts) {
  return new SelectionLayer(opts);
};

SelectionLayer.prototype.findHitRegion = function(point) {

  var hitRegion = null;
  var closest = Number.MAX_VALUE;

  var d = this.isWithinNorthWestHandle(point);
  if (d !== false && d < closest) {
    closest = d;
    hitRegion = 'nw-resize';
  }

  d = this.isWithinNorthEastHandle(point);
  if (d !== false && d < closest) {
    closest = d;
    hitRegion = 'ne-resize';
  }

  d = this.isWithinSouthWestHandle(point);
  if (d !== false && d < closest) {
    closest = d;
    hitRegion = 'sw-resize';
  }

  d = this.isWithinSouthEastHandle(point);
  if (d !== false && d < closest) {
    closest = d;
    hitRegion = 'se-resize';
  }

  if (hitRegion)
    return hitRegion;
  else if (this.isWithinBounds(point))
    return 'move';
  else
    return null;
};

SelectionLayer.prototype.setBounds = function(x, y, w, h) {
  var target = this.target;
  var bounds = this.bounds;

  var constraintRatio = this.aspectRatio;
  if (constraintRatio) {
    if ((w / h) > constraintRatio)
      w = h * constraintRatio;
    else
      h = w / constraintRatio;
  }

  bounds.x = Math.round(x);
  bounds.y = Math.round(y);
  bounds.width = Math.round(w);
  bounds.height = Math.round(h);
};

SelectionLayer.prototype.on = function(type, fn) {
  this.listeners.on(type, fn);
  return this;
};

SelectionLayer.prototype.off = function(type, fn) {
  this.listeners.off(type, fn);
  return this;
};

SelectionLayer.prototype.setCursor = function(type) {
  if (this.parent.canvas.style.cursor !== type)
    this.parent.canvas.style.cursor = type;
};

SelectionLayer.prototype.resetCursor = function() {
  this.setCursor('auto');
};

SelectionLayer.prototype.isWithinRadius = function(ax, ay, bx, by, r) {
  var tsq = r * r;
  var dx = ax - bx;
  var dy = ay - by;
  var dsq = dx * dx + dy * dy;
  return (dsq < tsq) ? dsq : false;
};

SelectionLayer.prototype.isWithinNorthWestHandle = function(point) {
  return this.isWithinRadius(point.x, point.y, this.bounds.x, this.bounds.y, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinNorthEastHandle = function(point) {
  return this.isWithinRadius(point.x, point.y, this.bounds.x + this.bounds.width, this.bounds.y, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinSouthWestHandle = function(point) {
  return this.isWithinRadius(point.x, point.y, this.bounds.x, this.bounds.y + this.bounds.height, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinSouthEastHandle = function(point) {
  return this.isWithinRadius(point.x, point.y, this.bounds.x + this.bounds.width, this.bounds.y + this.bounds.height, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinBounds = function(point) {

  var bounds = this.bounds;
  return point.x >= bounds.x &&
    point.y >= bounds.y &&
    point.x < bounds.x + bounds.width &&
    point.y < bounds.y + bounds.height;
};

SelectionLayer.prototype.getHandleRadius = function() {
  return this.handleOpts.size / 2;
};

SelectionLayer.prototype.updateRegion = function() {

  var region = this.region;
  var bounds = this.bounds;
  var target = this.target;

  region.x = target.image.width * (bounds.x - target.bounds.x) / target.bounds.width;
  region.y = target.image.height * (bounds.y - target.bounds.y) / target.bounds.height;

  region.width = target.image.width * (bounds.width / target.bounds.width);
  region.height = target.image.height * (bounds.height / target.bounds.height);

  var constraintRatio = this.aspectRatio;
  if (constraintRatio) {
    if ((region.width / region.height) > constraintRatio)
      region.width = region.height * constraintRatio;
    else
      region.height = region.width / constraintRatio;
  }
};

SelectionLayer.prototype.revalidate = function() {

  var target = this.target;
  var region = this.region;
  var bounds = this.bounds;

  if (target.image) {

    this.setBounds(
      target.bounds.x + target.bounds.width * (region.x / target.image.width),
      target.bounds.y + target.bounds.height * (region.y / target.image.height),
      target.bounds.width * (region.width / target.image.width),
      target.bounds.height * (region.height / target.image.height)
    );
  }
};

SelectionLayer.prototype.paint = function() {
  this.paintOutside();
  this.paintInside();
};

SelectionLayer.prototype.paintOutside = function() {
  var parent = this.parent;
  var bounds = this.bounds;
  var g = this.context;
  var target = this.target;

  var tl = target.bounds.x;
  var tt = target.bounds.y;
  var tw = target.bounds.width;
  var th = target.bounds.height;
  var tr = tl + tw;
  var tb = tt + th;

  var bl = bounds.x;
  var bt = bounds.y;
  var bw = bounds.width;
  var bh = bounds.height;
  var br = bl + bw;
  var bb = bt + bh;

  g.fillStyle = 'rgba(0, 0, 0, 0.5)';
  g.fillRect(tl, tt, tw, bt - tt);
  g.fillRect(tl, bt, bl - tl, bh);
  g.fillRect(br, bt, tr - br, bh);
  g.fillRect(tl, bb, tw, tb - bb);
};

SelectionLayer.prototype.paintInside = function() {

  var g = this.context;
  var bounds = this.bounds;
  var activeRegion = this.activeRegion;
  var opts = this.handleOpts;

  var lengthWidth = Math.min(opts.length, bounds.width * 0.5);
  var lengthHeight = Math.min(opts.length, bounds.height * 0.5);
  var depth = opts.depth;
  var color = opts.color;
  var activeColor = opts.activeColor;

  // Handles
  g.fillStyle = activeRegion === 'move' || activeRegion === 'nw-resize' ? activeColor : color;
  g.fillRect(bounds.x, bounds.y, lengthWidth, depth);
  g.fillRect(bounds.x, bounds.y + depth, depth, lengthHeight - depth);

  g.fillStyle = activeRegion === 'move' || activeRegion === 'ne-resize' ? activeColor : color;
  g.fillRect(bounds.x + bounds.width - lengthWidth, bounds.y, lengthWidth, depth);
  g.fillRect(bounds.x + bounds.width - depth, bounds.y + depth, depth, lengthHeight - depth);

  g.fillStyle = activeRegion === 'move' || activeRegion === 'sw-resize' ? activeColor : color;
  g.fillRect(bounds.x, bounds.y + bounds.height - depth, lengthWidth, depth);
  g.fillRect(bounds.x, bounds.y + bounds.height - lengthHeight, depth, lengthHeight - depth);

  g.fillStyle = activeRegion === 'move' || activeRegion === 'se-resize' ? activeColor : color;
  g.fillRect(bounds.x + bounds.width - lengthWidth, bounds.y + bounds.height - depth, lengthWidth, depth);
  g.fillRect(bounds.x + bounds.width - depth, bounds.y + bounds.height - lengthHeight, depth, lengthHeight - depth);

  // Sides
  g.fillStyle = 'rgba(255, 255, 255, 0.3)';
  g.fillRect(bounds.x + length, bounds.y, bounds.width - 2 * length, depth);
  g.fillRect(bounds.x + length, bounds.y + bounds.height - depth, bounds.width - 2 * length, depth);
  g.fillRect(bounds.x, bounds.y + length, depth, bounds.height - 2 * length);
  g.fillRect(bounds.x + bounds.width - depth, bounds.y + length, depth, bounds.height - 2 * length);
};

module.exports = SelectionLayer;

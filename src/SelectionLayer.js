var Input = require('./Input.js');
var Listeners = require('./Listeners.js');
var Selection = require('./Selection.js');
var Rectangle = require('./Rectangle.js');

var SelectionLayer = function(opts) {

  this.selection = Selection.create({
    target: opts.target
  });

  this.parent = opts.parent;
  this.context = opts.context;
  this.target = opts.target;
  this.minSize = opts.minSize || {
    width: 10,
    height: 10
  };
  this.aspectRatio = opts.aspectRatio;

  this.applyAspectRatio(this.aspectRatio, this.selection.region);

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
  this.downBounds = Rectangle.create(0, 0, 0, 0);

  this.input.on('down', this.onInputDown.bind(this));
  this.input.on('move', this.onInputMove.bind(this));
  this.input
    .on('up', this.onInputUpOrCancel.bind(this))
    .on('cancel', this.onInputUpOrCancel.bind(this));
};

SelectionLayer.create = function(opts) {
  return new SelectionLayer(opts);
};

SelectionLayer.prototype.onInputDown = function(e) {

  var hitRegion = this.findHitRegion(e);

  if (hitRegion) {
    e.source.preventDefault();
    this.activeRegion = hitRegion;
    this.setCursor(hitRegion);
    this.downBounds.copy(this.selection.bounds);
  }
};

SelectionLayer.prototype.onInputMove = function(e) {

  var activeRegion = this.activeRegion;

  if (!activeRegion) {
    var hitRegion = this.findHitRegion(e);
    if (hitRegion) {
      e.source.preventDefault();
      this.setCursor(hitRegion);
    } else {
      this.resetCursor();
    }
  } else {

    e.source.preventDefault();

    var selection = this.selection;
    selection.bounds.copy(this.downBounds);

    var minLen = this.handleOpts.length * 2;
    var minWidth = minLen;
    var minHeight = minLen;

    if (activeRegion === 'move') {

      selection.x += e.dx;
      selection.y += e.dy;

    } else {
      var dirV = activeRegion[0];
      var dirH = activeRegion[1];

      if (dirV === 'n')
        selection.top += e.dy;
      else if (dirV === 's')
        selection.bottom += e.dy;

      if (dirH === 'w')
        selection.left += e.dx;
      else if (dirH === 'e')
        selection.right += e.dx;
    }

    this.updateRegion();
    this.listeners.notify('regionChange', this);
  }
};

SelectionLayer.prototype.onInputUpOrCancel = function(e) {
  e.source.preventDefault();
  this.activeRegion = null;
  this.resetCursor();
  this.listeners.notify('dirty', this);
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
  return this.isWithinRadius(point.x, point.y, this.selection.x, this.selection.y, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinNorthEastHandle = function(point) {
  return this.isWithinRadius(point.x, point.y, this.selection.x + this.selection.width, this.selection.y, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinSouthWestHandle = function(point) {
  return this.isWithinRadius(point.x, point.y, this.selection.x, this.selection.y + this.selection.height, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinSouthEastHandle = function(point) {
  return this.isWithinRadius(point.x, point.y, this.selection.x + this.selection.width, this.selection.y + this.selection.height, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinBounds = function(point) {
  return this.selection.isInside(point);
};

SelectionLayer.prototype.getHandleRadius = function() {
  return this.handleOpts.size / 2;
};

SelectionLayer.prototype.updateRegion = function() {

  var region = this.selection.region;
  var bounds = this.selection.bounds;
  var target = this.target;

  region.x = target.image.width * (bounds.x - target.bounds.x) / target.bounds.width;
  region.y = target.image.height * (bounds.y - target.bounds.y) / target.bounds.height;

  region.width = target.image.width * (bounds.width / target.bounds.width);
  region.height = target.image.height * (bounds.height / target.bounds.height);

  if (this.aspectRatio)
    this.applyAspectRatio(this.aspectRatio, region);
};

SelectionLayer.prototype.applyAspectRatio = function(aspectRatio, target) {
  if ((target.width / target.height) > aspectRatio)
    target.width = target.height * aspectRatio;
  else
    target.height = target.width / aspectRatio;
};

SelectionLayer.prototype.revalidate = function() {

  var target = this.target;
  var region = this.selection.region;
  var bounds = this.selection.bounds;

  if (target.image) {
    bounds.x = target.bounds.x + target.bounds.width * (region.x / target.image.width);
    bounds.y = target.bounds.y + target.bounds.height * (region.y / target.image.height);
    bounds.width = target.bounds.width * (region.width / target.image.width);
    bounds.height = target.bounds.height * (region.height / target.image.height);
  }
};

SelectionLayer.prototype.paint = function() {

  this.selection.boundsPx.copy(this.selection.bounds).round();

  this.paintOutside();
  this.paintInside();
};

SelectionLayer.prototype.paintOutside = function() {
  var parent = this.parent;
  var bounds = this.selection.boundsPx;
  var g = this.context;
  var target = this.target;

  var tl = target.bounds.x;
  var tt = target.bounds.y;
  var tw = target.bounds.width;
  var th = target.bounds.height;
  var tr = target.bounds.right;
  var tb = target.bounds.bottom;

  var bl = bounds.x;
  var bt = bounds.y;
  var bw = bounds.width;
  var bh = bounds.height;
  var br = bounds.right;
  var bb = bounds.bottom;

  g.fillStyle = 'rgba(0, 0, 0, 0.5)';
  g.fillRect(tl, tt, tw, bt - tt);
  g.fillRect(tl, bt, bl - tl, bh);
  g.fillRect(br, bt, tr - br, bh);
  g.fillRect(tl, bb, tw, tb - bb);
};

SelectionLayer.prototype.paintInside = function() {

  var g = this.context;
  var bounds = this.selection.boundsPx;
  var activeRegion = this.activeRegion;
  var opts = this.handleOpts;

  var lengthWidth = Math.min(opts.length, bounds.width * 0.5);
  var lengthHeight = Math.min(opts.length, bounds.height * 0.5);
  var depth = opts.depth;
  var color = opts.color;
  var activeColor = opts.activeColor;

  // Sides
  g.fillStyle = 'rgba(255, 255, 255, 0.3)';
  g.fillRect(bounds.x + length, bounds.y, bounds.width - 2 * length, depth);
  g.fillRect(bounds.x + length, bounds.bottom - depth, bounds.width - 2 * length, depth);
  g.fillRect(bounds.x, bounds.y + length, depth, bounds.height - 2 * length);
  g.fillRect(bounds.right - depth, bounds.y + length, depth, bounds.height - 2 * length);

  // Handles
  var isMoveRegion = activeRegion === 'move';

  g.fillStyle = isMoveRegion || activeRegion === 'nw-resize' ? activeColor : color;
  g.fillRect(bounds.x, bounds.y, lengthWidth, depth);
  g.fillRect(bounds.x, bounds.y + depth, depth, lengthHeight - depth);

  g.fillStyle = isMoveRegion || activeRegion === 'ne-resize' ? activeColor : color;
  g.fillRect(bounds.right - lengthWidth, bounds.y, lengthWidth, depth);
  g.fillRect(bounds.right - depth, bounds.y + depth, depth, lengthHeight - depth);

  g.fillStyle = isMoveRegion || activeRegion === 'sw-resize' ? activeColor : color;
  g.fillRect(bounds.x, bounds.bottom - depth, lengthWidth, depth);
  g.fillRect(bounds.x, bounds.bottom - lengthHeight, depth, lengthHeight - depth);

  g.fillStyle = isMoveRegion || activeRegion === 'se-resize' ? activeColor : color;
  g.fillRect(bounds.right - lengthWidth, bounds.bottom - depth, lengthWidth, depth);
  g.fillRect(bounds.right - depth, bounds.bottom - lengthHeight, depth, lengthHeight - depth);
};

module.exports = SelectionLayer;

var Input = require('./Input.js');
var Listeners = require('./Listeners.js');
var Selection = require('./Selection.js');
var Rectangle = require('./Rectangle.js');

var SelectionLayer = function(opts) {

  opts = opts || {};

  this.selection = Selection.create(opts);

  this.parent = opts.parent;
  this.context = opts.context;
  this.context.setLineDash = this.context.setLineDash || function() {};
  this.target = opts.target;

  var handleOpts = opts.handle || {};
  handleOpts.length = handleOpts.handleLength || 32;
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
    this.listeners.notify('start', this.selection.region);
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

    if (activeRegion === 'move') {
      selection.moveBy(e.dx, e.dy);
      this.listeners.notify('move', this.selection.region);
    } else {

      var dir = activeRegion.substring(0, 2);
      var dx = dir[1] === 'w' ? -e.dx : e.dx;
      var dy = dir[0] === 'n' ? -e.dy : e.dy;
      selection.resizeBy(dx, dy, dir);
      this.listeners.notify('resize', this.selection.region);
    }

    this.listeners.notify('change', this.selection.region);
  }
};

SelectionLayer.prototype.onInputUpOrCancel = function(e) {
  e.source.preventDefault();
  this.activeRegion = null;
  this.resetCursor();
  this.listeners.notify('end', this.selection.region);
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
  return this.isWithinRadius(point.x, point.y, this.selection.left, this.selection.top, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinNorthEastHandle = function(point) {
  return this.isWithinRadius(point.x, point.y, this.selection.right, this.selection.top, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinSouthWestHandle = function(point) {
  return this.isWithinRadius(point.x, point.y, this.selection.left, this.selection.bottom, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinSouthEastHandle = function(point) {
  return this.isWithinRadius(point.x, point.y, this.selection.right, this.selection.bottom, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinBounds = function(point) {
  return this.selection.isInside(point);
};

SelectionLayer.prototype.getHandleRadius = function() {
  return this.handleOpts.size / 2;
};

SelectionLayer.prototype.onImageLoad = function() {
  this.selection.onImageLoad();
};

SelectionLayer.prototype.revalidate = function() {
  this.selection.updateBoundsFromRegion();
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

  // Guides
  g.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  g.setLineDash([2,3]);
  g.lineWidth = 1;
  g.beginPath();
  var bw3 = bounds.width / 3;
  var bh3 = bounds.height / 3;
  g.moveTo(bounds.x + bw3, bounds.y);
  g.lineTo(bounds.x + bw3, bounds.y + bounds.height);
  g.moveTo(bounds.x + 2 * bw3, bounds.y);
  g.lineTo(bounds.x + 2 * bw3, bounds.y + bounds.height);
  g.moveTo(bounds.x, bounds.y + bh3);
  g.lineTo(bounds.x + bounds.width, bounds.y + bh3);
  g.moveTo(bounds.x, bounds.y + 2 * bh3);
  g.lineTo(bounds.x + bounds.width, bounds.y + 2 * bh3);
  g.stroke();
  g.closePath();
};

module.exports = SelectionLayer;

var debounce = require('./debounce.js');
var BackgroundLayer = require('./BackgroundLayer.js');
var ImageLayer = require('./ImageLayer.js');
var SelectionLayer = require('./SelectionLayer.js');
var Image = require('./Image.js');
var Listeners = require('./Listeners.js');

var DEFAULT_CANVAS_WIDTH = 400;
var DEFAULT_CANVAS_HEIGHT = 300;

var Crop = function(opts) {

  this.parent = typeof opts.parent === 'string' ? document.querySelector(opts.parent) : opts.parent;
  
  this.canvas = document.createElement('canvas');
  this.context = this.canvas.getContext('2d');
  this.boundsOpts = opts.bounds || {width: '100%', height: 'auto'};
  opts.selection = opts.selection || {};
  this.backgroundColor = opts.backgroundColor || '#fff';
  this.foregroundColor = opts.foregroundColor || '#f7f7f7';
  this.debounceResize = opts.debounceResize !== undefined ? opts.debounceResize : true;
  this.listeners = Listeners.create();

  this.parent.appendChild(this.canvas);

  this.backgroundLayer = BackgroundLayer.create({
    parent: this,
    context: this.context,
    backgroundColor: this.backgroundColor,
    foregroundColor: this.foregroundColor
  });

  this.imageLayer = ImageLayer.create({
    parent: this,
    context: this.context,
    image: this.image
  });

  this.selectionLayer = SelectionLayer.create({
    parent: this,
    context: this.context,
    target: this.imageLayer,
    aspectRatio: opts.selection.aspectRatio,
    minWidth: opts.selection.minWidth,
    minHeight: opts.selection.minHeight,
    x: opts.selection.x,
    y: opts.selection.y,
    width: opts.selection.width,
    height: opts.selection.height,
    handle: {
      color: opts.selection.color,
      activeColor: opts.selection.activeColor
    }
  });

  var listeners = this.listeners;
  var paint = this.paint.bind(this);

  this.selectionLayer
    .on(
      'start',
      function(region) {
        paint();
        listeners.notify('start', region);
      }
    )
    .on(
      'move',
      function(region) {
        listeners.notify('move', region);
      }
    )
    .on(
      'resize',
      function(region) {
        listeners.notify('resize', region);
      }
    )
    .on(
      'change',
      function(region) {
        paint();
        listeners.notify('change', region);
      }
    )
    .on(
      'end',
      function(region) {
        paint();
        listeners.notify('end', region);
      }
    );

  window.addEventListener(
    'resize',
    this.debounceResize ?
      debounce(this.revalidateAndPaint.bind(this), 100) :
      this.revalidateAndPaint.bind(this)
  );

  this.setImage(opts.image);

  this.revalidateAndPaint();
};

Crop.create = function(opts) {
  return new Crop(opts);
};

Crop.prototype.on = function(type, fn) {
  this.listeners.on(type, fn);
  return this;
};

Crop.prototype.off = function(type, fn) {
  this.listeners.off(type, fn);
  return this;
};

Crop.prototype.revalidateAndPaint = function() {
  this.revalidate();
  this.paint();
};

Crop.prototype.revalidate = function() {

  var parent = this.parent;
  var canvas = this.canvas;
  var image = this.image;

  var boundsWidth = this.boundsOpts.width;
  var boundsHeight = this.boundsOpts.height;
  var width = 0;
  var height = 0;

  var percent;

  if (isInteger(boundsWidth)) {
    width = boundsWidth;
  } else if (parent && isPercent(boundsWidth)) {
    width = Math.round(parent.clientWidth * getPercent(boundsWidth) / 100);
  } else {
    width = DEFAULT_CANVAS_WIDTH;
  }

  if (isInteger(boundsHeight)) {
    height = boundsHeight;
  } else if (isPercent(boundsHeight)) {
    height = Math.round(width * getPercent(boundsHeight) / 100);
  } else if (image && image.hasLoaded && isAuto(boundsHeight)) {
    height = Math.floor(width / image.getAspectRatio());
  } else {
    height = DEFAULT_CANVAS_HEIGHT;
  }

  this.resizeCanvas(width, height);

  this.backgroundLayer.revalidate();
  this.imageLayer.revalidate();
  this.selectionLayer.revalidate();
};

Crop.prototype.paint = function() {

  var context = this.context;

  context.save();
  context.scale(this.ratio, this.ratio);

  this.backgroundLayer.paint();

  if (this.image && this.image.hasLoaded) {
    this.imageLayer.paint();
    this.selectionLayer.paint();
  }

  context.restore();
};

Crop.prototype.resizeCanvas = function(width, height) {

  var context = this.context;
  var canvas = this.canvas;
  this.ratio = 1;

  if (!context.webkitBackingStorePixelRatio)
    this.ratio = window.devicePixelRatio || 1;

  this.width = width;
  this.height = height;

  canvas.width = this.width * this.ratio;
  canvas.height = this.height * this.ratio;
};

Crop.prototype.setImage = function(source) {

  var image = Image.create(source)
    .on(
      'load',
      function() {
        this.selectionLayer.onImageLoad();
        this.revalidateAndPaint();
      }.bind(this)
    )
    .on(
      'error',
      function(e) {
        alert(e);
        console.error(e);
      }.bind(this)
    );

  this.imageLayer.setImage(image);
  this.image = image;
  this.revalidateAndPaint();
};

Crop.prototype.dispose = noop;

function noop() {};

function isPercent(v) {
  if (typeof v !== 'string')
    return false;

  if (v.length < 1)
    return false;

  if (v[v.length - 1] === '%')
    return true;
}

function getPercent(v) {
  if (!isPercent(v))
    return 0;

  return v.slice(0, -1);
}

function isAuto(v) {
  return v === 'auto';
}

function isInteger(v) {
  return typeof v == 'number' && Math.round(v) == v;
}

module.exports = Crop;

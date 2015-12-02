var debounce = require('./debounce.js');
var BackgroundLayer = require('./BackgroundLayer.js');
var ImageLayer = require('./ImageLayer.js');
var SelectionLayer = require('./SelectionLayer.js');
var Image = require('./Image.js');

var DEFAULT_CANVAS_WIDTH = 400;
var DEFAULT_CANVAS_HEIGHT = 300;

var ImageCrop = function(opts) {

  this.parent = opts.parent || null;
  this.canvas = document.createElement('canvas');
  this.context = this.canvas.getContext('2d');

  this.boundsOpts = opts.bounds || {width: '100%', height: 'auto'};
  this.selectionOpts = opts.selection || {};
  this.backgroundColor = opts.backgroundColor || '#fff';
  this.foregroundColor = opts.foregroundColor || '#f7f7f7';
  this.debounceResize = opts.debounceResize !== undefined ? opts.debounceResize : true;

  this.image = null;

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
    aspectRatio: this.selectionOpts.aspectRatio,
    minWidth: this.selectionOpts.minWidth,
    minHeight: this.selectionOpts.minHeight
  });

  this.selectionLayer
    .on(
      'regionChange',
      function() {
        this.paint();
      }.bind(this)
    )
    .on(
      'dirty',
      function() {
        this.paint();
      }.bind(this)
    );

  window.addEventListener(
    'resize',
    this.debounceResize ?
      debounce(this.revalidateAndPaint.bind(this), 100) :
      this.revalidateAndPaint.bind(this)
  );

  this.revalidateAndPaint();
};

ImageCrop.create = function(opts) {
  return new ImageCrop(opts);
};

ImageCrop.prototype.revalidateAndPaint = function() {
  this.revalidate();
  this.paint();
};

ImageCrop.prototype.revalidate = function() {

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

ImageCrop.prototype.paint = function() {

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

ImageCrop.prototype.resizeCanvas = function(width, height) {

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

ImageCrop.prototype.setImage = function(sourceImage) {

  var image = Image.create(sourceImage)
    .on(
      'load',
      function() {
        this.selectionLayer.autoSizeRegion();
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
};

ImageCrop.prototype.dispose = noop;

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

module.exports = ImageCrop;

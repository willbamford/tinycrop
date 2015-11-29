var debounce = require('./debounce.js');
var BackgroundLayer = require('./BackgroundLayer.js');
var ImageLayer = require('./ImageLayer.js');
var SelectionLayer = require('./SelectionLayer.js');
var Image = require('./Image.js');

var DEFAULT_CANVAS_WIDTH = 400;
var DEFAULT_CANVAS_HEIGHT = 300;

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

var ImageCrop = function(opts) {

  this.parent = opts.parent || null;
  this.canvas = document.createElement('canvas');
  this.context = this.canvas.getContext('2d');
  this.aspectRatio = opts.aspectRatio || null;

  this.image = null;

  this.backgroundColor = opts.backgroundColor || '#ccc';

  this.optWidth = opts.width || '100%';
  this.optHeight = opts.height || 'auto';

  this.parent.appendChild(this.canvas);

  this.backgroundLayer = BackgroundLayer.create({
    parent: this,
    context: this.context,
    color: this.backgroundColor
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
    aspectRatio: this.aspectRatio
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

  window.addEventListener('resize', debounce(this.revalidateAndPaint.bind(this), 100));

  this.revalidateAndPaint();
};

ImageCrop.create = function(opts) {
  return new ImageCrop(opts);
};

ImageCrop.prototype.revalidateAndPaint = function() {
  this.revalidate();
  this.paint();
};

ImageCrop.prototype.paint = function() {

  var context = this.context;

  context.save();
  context.scale(this.ratio, this.ratio);

  if (this.image && this.image.hasLoaded) {
    this.backgroundLayer.paint();
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

ImageCrop.prototype.revalidate = function() {

  var parent = this.parent;
  var canvas = this.canvas;
  var image = this.image;

  var optWidth = this.optWidth;
  var optHeight = this.optHeight;
  var width = 0;
  var height = 0;

  var percent;

  if (isInteger(optWidth)) {
    width = optWidth;
  } else if (parent && isPercent(optWidth)) {
    width = Math.round(parent.clientWidth * getPercent(optWidth) / 100);
  } else {
    width = DEFAULT_CANVAS_WIDTH;
  }

  if (isInteger(optHeight)) {
    height = optHeight;
  } else if (isPercent(optHeight)) {
    height = Math.round(width * getPercent(optHeight) / 100);
  } else if (image && image.hasLoaded && isAuto(optHeight)) {
    height = Math.floor(width / image.getAspectRatio());
  } else {
    height = DEFAULT_CANVAS_HEIGHT;
  }

  this.resizeCanvas(width, height);

  this.backgroundLayer.revalidate();
  this.imageLayer.revalidate();
  this.selectionLayer.revalidate();
};

ImageCrop.prototype.setImage = function(sourceImage) {

  var image = Image.create(sourceImage)
    .on(
      'load',
      function() {
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

module.exports = ImageCrop;

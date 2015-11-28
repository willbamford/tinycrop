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

	this.image = null;

	this.optWidth = opts.width || '100%';
	this.optHeight = opts.height || 'auto';

	this.parent.appendChild(this.canvas);

	this.backgroundLayer = BackgroundLayer.create({
		canvas: this.canvas,
		color: '#ccc'
	});

	this.imageLayer = ImageLayer.create({
		canvas: this.canvas,
		image: this.image
	});

	this.selectionLayer = SelectionLayer.create({
		canvas: this.canvas,
		target: this.imageLayer
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
	this.backgroundLayer.paint();
	this.imageLayer.paint();
	this.selectionLayer.paint();
};

ImageCrop.prototype.revalidate = function() {

	var parent = this.parent;
	var canvas = this.canvas;
	var imageLayer = this.imageLayer;

	var optWidth = this.optWidth;
	var optHeight = this.optHeight;

	var percent;

	if (isInteger(optWidth)) {
		canvas.width = optWidth;
	} else if (parent && isPercent(optWidth)) {
		canvas.width = Math.round(parent.clientWidth * getPercent(optWidth) / 100);
	} else {
		canvas.width = DEFAULT_CANVAS_WIDTH;
	}

	if (isInteger(optHeight)) {
		canvas.height = optHeight;
	} else if (isPercent(optHeight)) {
		canvas.height = Math.round(canvas.width * getPercent(optHeight) / 100);
	} else if (imageLayer.hasImage() && isAuto(optHeight)) {
		canvas.height = Math.floor(canvas.width / imageLayer.getAspect());
	} else {
		canvas.height = DEFAULT_CANVAS_HEIGHT;
	}

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

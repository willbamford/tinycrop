var imageLoaded = require('image-loaded');

var DEFAULT_CANVAS_WIDTH = 400;
var DEFAULT_CANVAS_HEIGHT = 300;

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

	this.optWidth = opts.width || '100%';
	this.optHeight = opts.height || 'auto';

	this.parent.appendChild(this.canvas);

	this.bounds = {};

	window.addEventListener('resize', this.resizeAndPaint.bind(this));

	this.setImage(opts.image || null);
	this.resizeAndPaint();
};

ImageCrop.create = function(opts) {
	return new ImageCrop(opts);
};

ImageCrop.prototype.resizeAndPaint = function() {
	this.resize();
	this.paint();
};

ImageCrop.prototype.paint = function() {

	var g = this.context;
	var canvas = this.canvas;
	var image = this.image;
	var bounds = this.bounds;

	if (image && bounds) {

		g.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, bounds.x, bounds.y, bounds.w, bounds.h);
	}
};

ImageCrop.prototype.resize = function() {

	var parent = this.parent;
	var canvas = this.canvas;
	var image = this.image;

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
	} else if (image && isAuto(optHeight)) {
		canvas.height = Math.floor(image.naturalHeight / image.naturalWidth * canvas.width);
	} else {
		canvas.height = DEFAULT_CANVAS_HEIGHT;
	}

	this.updateBounds();
};

ImageCrop.prototype.updateBounds = function() {

	var bounds = this.bounds;
	var canvas = this.canvas;
	var image = this.image;

	if (image) {

		console.log('Canvas size: ' + canvas.width + ' by ' + canvas.height);

		// Constrained by width (otherwise height)
		if (image.naturalWidth / image.naturalHeight >= canvas.width / canvas.height) {
			bounds.w = canvas.width;
			bounds.h = Math.round(image.naturalHeight / image.naturalWidth * canvas.width);
			bounds.x = 0;
			bounds.y = Math.round((canvas.height - bounds.h) * 0.5);
		} else {
			bounds.w = Math.round(image.naturalWidth / image.naturalHeight * canvas.height);
			bounds.h = canvas.height;
			bounds.x = Math.round((canvas.width - bounds.w) * 0.5);
			bounds.y = 0;
		}
	}
};

ImageCrop.prototype.setImage = function(image) {

	if (!image)
		return;

	imageLoaded(image, function(err) {

		if (err) {
			console.error(err);
			return;
		}
		this.image = image;
		this.resizeAndPaint();

	}.bind(this));
};

ImageCrop.prototype.dispose = function() {
};

module.exports = ImageCrop;

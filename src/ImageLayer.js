var Listeners = require('./Listeners.js');
var loaded = require('./imageLoaded.js');

var ImageLayer = function(opts) {

	opts = opts || {};

	this.bounds = {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};

	this.image = opts.image || null;

	this.canvas = opts.canvas;
	this.context = this.canvas.getContext('2d');

	this.listeners = Listeners.create();
};

ImageLayer.create = function(opts) {
	return new ImageLayer(opts);
};

ImageLayer.prototype.on = function(type, fn) {
	this.listeners.on(type, fn);
};

ImageLayer.prototype.off = function(type, fn) {
	this.listeners.off(type, fn);
};

ImageLayer.prototype.setImage = function(image) {

	if (!image)
		return;

	loaded(image, function(err) {

		if (err) {
			this.listeners.notify('imageError', err);
		} else {
			this.image = image;
			this.listeners.notify('imageLoad', this);
		}

	}.bind(this));
};

ImageLayer.prototype.revalidate = function() {

	var canvas = this.canvas;
	var image = this.image;
	var bounds = this.bounds;

	if (image) {

		// Constrained by width (otherwise height)
		if (image.naturalWidth / image.naturalHeight >= canvas.width / canvas.height) {
			bounds.width = canvas.width;
			bounds.height = Math.round(image.naturalHeight / image.naturalWidth * canvas.width);
			bounds.x = 0;
			bounds.y = Math.round((canvas.height - bounds.height) * 0.5);
		} else {
			bounds.width = Math.round(image.naturalWidth / image.naturalHeight * canvas.height);
			bounds.height = canvas.height;
			bounds.x = Math.round((canvas.width - bounds.width) * 0.5);
			bounds.y = 0;
		}
	}
};

ImageLayer.prototype.paint = function() {

	var context = this.context;
	var image = this.image;
	var bounds = this.bounds;

	if (image) {
		context.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, bounds.x, bounds.y, bounds.width, bounds.height);
	}
};

module.exports = ImageLayer;

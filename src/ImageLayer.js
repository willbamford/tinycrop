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
};

ImageLayer.create = function(opts) {
	return new ImageLayer(opts);
};

ImageLayer.prototype.setImage = function(image) {
	this.image = image;
};

ImageLayer.prototype.revalidate = function() {

	var canvas = this.canvas;
	var image = this.image;
	var bounds = this.bounds;

	if (image) {

		// Constrained by width (otherwise height)
		if (image.width / image.height >= canvas.width / canvas.height) {
			bounds.width = canvas.width;
			bounds.height = Math.round(image.height / image.width * canvas.width);
			bounds.x = 0;
			bounds.y = Math.round((canvas.height - bounds.height) * 0.5);
		} else {
			bounds.width = Math.round(image.width / image.height * canvas.height);
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
		context.drawImage(image.source, 0, 0, image.width, image.height, bounds.x, bounds.y, bounds.width, bounds.height);
	}
};

module.exports = ImageLayer;

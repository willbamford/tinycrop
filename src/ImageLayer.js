var ImageLayer = function(opts) {

	opts = opts || {};

	this.bounds = {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};

	this.image = opts.image || null;

	this.parent = opts.parent;
	this.context = opts.context;
};

ImageLayer.create = function(opts) {
	return new ImageLayer(opts);
};

ImageLayer.prototype.setImage = function(image) {
	this.image = image;
};

ImageLayer.prototype.revalidate = function() {

	var parent = this.parent;
	var image = this.image;
	var bounds = this.bounds;

	if (image) {

		// Constrained by width (otherwise height)
		if (image.width / image.height >= parent.width / parent.height) {
			bounds.width = parent.width;
			bounds.height = Math.round(image.height / image.width * parent.width);
			bounds.x = 0;
			bounds.y = Math.round((parent.height - bounds.height) * 0.5);
		} else {
			bounds.width = Math.round(image.width / image.height * parent.height);
			bounds.height = parent.height;
			bounds.x = Math.round((parent.width - bounds.width) * 0.5);
			bounds.y = 0;
		}
	}
};

ImageLayer.prototype.paint = function() {

	var context = this.context;
	var image = this.image;
	var bounds = this.bounds;

	if (image && image.hasLoaded)
		context.drawImage(image.source, 0, 0, image.width, image.height, bounds.x, bounds.y, bounds.width, bounds.height);
};

module.exports = ImageLayer;

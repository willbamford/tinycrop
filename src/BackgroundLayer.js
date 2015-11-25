var BackgroundLayer = function(opts) {

	opts = opts || {};

	this.color = opts.color || '#e0e0e0';

	this.canvas = opts.canvas;
	this.context = this.canvas.getContext('2d');
};

BackgroundLayer.create = function(opts) {
	return new BackgroundLayer(opts);
};

BackgroundLayer.prototype.revalidate = function() {};

BackgroundLayer.prototype.paint = function() {

	var canvas = this.canvas;
	var context = this.context;

	context.fillStyle = this.color;
	context.fillRect(0, 0, canvas.width, canvas.height);
};

module.exports = BackgroundLayer;

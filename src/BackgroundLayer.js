var BackgroundLayer = function(opts) {

	opts = opts || {};

	this.color = opts.color || '#e0e0e0';

	this.parent = opts.parent;
	this.context = opts.context;
};

BackgroundLayer.create = function(opts) {
	return new BackgroundLayer(opts);
};

BackgroundLayer.prototype.revalidate = function() {};

BackgroundLayer.prototype.paint = function() {

	var parent = this.parent;
	var context = this.context;

	context.fillStyle = this.color;
	context.fillRect(0, 0, parent.width, parent.height);
};

module.exports = BackgroundLayer;

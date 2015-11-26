var SelectionLayer = function(opts) {

	this.bounds = {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};

	this.region = {
		x: 100,
		y: 200,
		width: 300,
		height: 400
	};

	this.canvas = opts.canvas;
	this.context = this.canvas.getContext('2d');
	this.target = opts.target;
};

SelectionLayer.create = function(opts) {
	return new SelectionLayer(opts);
};

SelectionLayer.prototype.revalidate = function() {

	var target = this.target;
	var region = this.region;
	var bounds = this.bounds;

	if (target.image) {

		bounds.x = target.bounds.x + target.bounds.width * (region.x / target.image.width);
		bounds.y = target.bounds.y + target.bounds.height * (region.y / target.image.height);
		bounds.width = target.bounds.width * (region.width / target.image.width);
		bounds.height = target.bounds.height * (region.height / target.image.height);
	}
};

SelectionLayer.prototype.paint = function() {

	var bounds = this.bounds;

	var context = this.context;
	context.fillStyle = 'rgba(255, 0, 0, 0.5)';
	context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
};

module.exports = SelectionLayer;

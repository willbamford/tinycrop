var Input = require('./Input.js');

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

	this.input = Input.create(this.canvas);

	this.input.on('down', function(e) {
		e.source.preventDefault();
	});

	this.input.on('move', function(e) {
		e.source.preventDefault();
	});

	this.input.on('up', function(e) {
		e.source.preventDefault();
	});
};

SelectionLayer.create = function(opts) {
	return new SelectionLayer(opts);
};

SelectionLayer.prototype.revalidate = function() {

	var target = this.target;
	var region = this.region;
	var bounds = this.bounds;

	if (target.image) {

		bounds.x = Math.round(target.bounds.x + target.bounds.width * (region.x / target.image.width));
		bounds.y = Math.round(target.bounds.y + target.bounds.height * (region.y / target.image.height));
		bounds.width = Math.round(target.bounds.width * (region.width / target.image.width));
		bounds.height = Math.round(target.bounds.height * (region.height / target.image.height));
	}
};

SelectionLayer.prototype.paint = function() {

	var canvas = this.canvas;
	var bounds = this.bounds;

	var context = this.context;

	context.fillStyle = 'rgba(0, 0, 0, 0.5)';

	context.fillRect(0, 0, canvas.width, bounds.y);
	context.fillRect(0, bounds.y, bounds.x, bounds.height);
	context.fillRect(bounds.x + bounds.width, bounds.y, canvas.width - bounds.x + bounds.width, bounds.height);
	context.fillRect(0, bounds.y + bounds.height, canvas.width, canvas.height - bounds.y + bounds.height);
};

module.exports = SelectionLayer;

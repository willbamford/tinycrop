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

	this.action = null;
	this.downEvent = null;

	this.input.on('down', function(e) {
		e.source.preventDefault();

		if (this.isWithinBounds(e)) {
			this.action = 'moving';
			this.canvas.style.cursor = 'move';
			this.downEvent = e;
		}

	}.bind(this));

	this.input.on('move', function(e) {
		e.source.preventDefault();

		if (this.action === null) {
			if (this.isWithinBounds(e)) {
				this.canvas.style.cursor = 'move';
			} else {
				this.canvas.style.cursor = 'auto';
			}
		} else if (this.action === 'moving') {
			console.log('Moving..');
		}
	}.bind(this));

	this.input.on('up', function(e) {
		e.source.preventDefault();

		this.action = null;
		this.canvas.style.cursor = 'auto';
		this.downEvent = null;
	}.bind(this));

	this.input.on('cancel', function(e) {
		e.source.preventDefault();

		this.action = null;
		this.downEvent = null;
		this.canvas.style.cursor = 'auto';
	}.bind(this));
};

SelectionLayer.create = function(opts) {
	return new SelectionLayer(opts);
};

SelectionLayer.prototype.isWithinBounds = function(point) {

	var bounds = this.bounds;
	return point.x >= bounds.x &&
		point.y >= bounds.y &&
		point.x < bounds.x + bounds.width &&
		point.y < bounds.y + bounds.height;
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

	// Greyed-out
	context.fillStyle = 'rgba(0, 0, 0, 0.5)';
	context.fillRect(0, 0, canvas.width, bounds.y);
	context.fillRect(0, bounds.y, bounds.x, bounds.height);
	context.fillRect(bounds.x + bounds.width, bounds.y, canvas.width - bounds.x + bounds.width, bounds.height);
	context.fillRect(0, bounds.y + bounds.height, canvas.width, canvas.height - bounds.y + bounds.height);

	var cornerLength = 32;
	var cornerDepth = 3;

	// Handles
	context.fillStyle = 'rgba(255, 255, 255, 1.0)';
	context.fillRect(bounds.x, bounds.y, cornerLength, cornerDepth);
	context.fillRect(bounds.x, bounds.y + cornerDepth, cornerDepth, cornerLength - cornerDepth);
	context.fillRect(bounds.x + bounds.width - cornerLength, bounds.y, cornerLength, cornerDepth);
	context.fillRect(bounds.x + bounds.width - cornerDepth, bounds.y + cornerDepth, cornerDepth, cornerLength - cornerDepth);
	context.fillRect(bounds.x, bounds.y + bounds.height - cornerDepth, cornerLength, cornerDepth);
	context.fillRect(bounds.x, bounds.y + bounds.height - cornerLength, cornerDepth, cornerLength - cornerDepth);
	context.fillRect(bounds.x + bounds.width - cornerLength, bounds.y + bounds.height - cornerDepth, cornerLength, cornerDepth);
	context.fillRect(bounds.x + bounds.width - cornerDepth, bounds.y + bounds.height - cornerLength, cornerDepth, cornerLength - cornerDepth);

	// Sides
	context.fillStyle = 'rgba(255, 255, 255, 0.25)';
	context.fillRect(bounds.x + cornerLength, bounds.y, bounds.width - 2 * cornerLength, cornerDepth);
	context.fillRect(bounds.x + cornerLength, bounds.y + bounds.height - cornerDepth, bounds.width - 2 * cornerLength, cornerDepth);
	context.fillRect(bounds.x, bounds.y + cornerLength, cornerDepth, bounds.height - 2 * cornerLength);
	context.fillRect(bounds.x + bounds.width - cornerDepth, bounds.y + cornerLength, cornerDepth, bounds.height - 2 * cornerLength);
};

module.exports = SelectionLayer;

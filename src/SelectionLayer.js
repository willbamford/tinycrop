var Input = require('./Input.js');
var Listeners = require('./Listeners.js');

var SelectionLayer = function(opts) {

	this.bounds = {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};

	this.region = {
		x: 0,
		y: 0,
		width: 400,
		height: 400
	};

	this.canvas = opts.canvas;
	this.context = this.canvas.getContext('2d');
	this.target = opts.target;
	this.minSize = opts.minSize || {
		width: 10,
		height: 10
	};

	var handleOpts = opts.handle || {};
	handleOpts.length = handleOpts.length || 32;
	handleOpts.depth = handleOpts.depth || 3;
	handleOpts.size = handleOpts.size || handleOpts.length * 2;
	handleOpts.color = handleOpts.color || 'rgba(255, 255, 255, 1.0)';
	handleOpts.activeColor = handleOpts.activeColor || 'rgba(0, 127, 255, 1.0)';
	this.handleOpts = handleOpts;

	this.listeners = Listeners.create();

	this.input = Input.create(this.canvas);

	this.activeRegion = null;
	this.delta = {x: 0, y: 0};
	this.downEvent = null;
	this.downBounds = {x: 0, y: 0};

	this.input.on('down', function(e) {

		var hitRegion = this.findHitRegion(e);

		if (hitRegion) {
			this.activeRegion = hitRegion;
			this.setCursor(hitRegion);
			this.downEvent = e;
			this.downBounds.x = this.bounds.x;
			this.downBounds.y = this.bounds.y;
			this.downBounds.width = this.bounds.width;
			this.downBounds.height = this.bounds.height;
			e.source.preventDefault();
		}

	}.bind(this));

	this.input.on('move', function(e) {

		var activeRegion = this.activeRegion;

		if (!activeRegion) {
			var hitRegion = this.findHitRegion(e);
			if (hitRegion) {
				this.setCursor(hitRegion);
				e.source.preventDefault();
			} else {
				this.resetCursor();
			}
		} else {

			e.source.preventDefault();

			var delta = this.delta;
			var bounds = this.bounds;
			var downBounds = this.downBounds;
			var downEvent = this.downEvent;

			delta.x = e.x - downEvent.x;
			delta.y = e.y - downEvent.y;

			switch (activeRegion) {
				case 'move':
					this.setBounds(downBounds.x + delta.x, downBounds.y + delta.y, downBounds.width, downBounds.height);
					break;
				case 'nw-resize':
					this.setBounds(downBounds.x + delta.x, downBounds.y + delta.y, downBounds.width - delta.x, downBounds.height - delta.y);
					break;
				case 'ne-resize':
					this.setBounds(downBounds.x, downBounds.y + delta.y, downBounds.width + delta.x, downBounds.height - delta.y);
					break;
				case 'sw-resize':
					this.setBounds(downBounds.x + delta.x, downBounds.y, downBounds.width - delta.x, downBounds.height + delta.y);
					break;
				case 'se-resize':
					this.setBounds(downBounds.x, downBounds.y, downBounds.width + delta.x, downBounds.height + delta.y);
					break;
			}

			this.updateRegionAndNotifyListeners();
		}

	}.bind(this));

	function handleUpOrCancel(e) {
		e.source.preventDefault();
		this.activeRegion = null;
		this.resetCursor();
		this.downEvent = null;
		this.listeners.notify('dirty', this);
	}

	this.input
		.on('up', handleUpOrCancel.bind(this))
		.on('cancel', handleUpOrCancel.bind(this));
};

SelectionLayer.create = function(opts) {
	return new SelectionLayer(opts);
};

SelectionLayer.prototype.findHitRegion = function(point) {

	var hitRegion = null;
	var closest = Number.MAX_VALUE;

	var d = this.isWithinNorthWestHandle(point);
	if (d !== false && d < closest) {
		closest = d;
		hitRegion = 'nw-resize';
	}

	d = this.isWithinNorthEastHandle(point);
	if (d !== false && d < closest) {
		closest = d;
		hitRegion = 'ne-resize';
	}

	d = this.isWithinSouthWestHandle(point);
	if (d !== false && d < closest) {
		closest = d;
		hitRegion = 'sw-resize';
	}

	d = this.isWithinSouthEastHandle(point);
	if (d !== false && d < closest) {
		closest = d;
		hitRegion = 'se-resize';
	}

	if (hitRegion)
		return hitRegion;
	else if (this.isWithinBounds(point))
		return 'move';
	else
		return null;
};

SelectionLayer.prototype.setBounds = function(x, y, width, height) {

	var bounds = this.bounds;
	bounds.x = x;
	bounds.y = y;
	bounds.width = Math.max(width, this.handleOpts.length * 2);
	bounds.height = Math.max(height, this.handleOpts.length * 2);
};

SelectionLayer.prototype.on = function(type, fn) {
	this.listeners.on(type, fn);
	return this;
};

SelectionLayer.prototype.off = function(type, fn) {
	this.listeners.off(type, fn);
	return this;
};

SelectionLayer.prototype.setCursor = function(type) {
	this.canvas.style.cursor = type;
};

SelectionLayer.prototype.resetCursor = function() {
	this.setCursor('auto');
};

SelectionLayer.prototype.isWithinRadius = function(ax, ay, bx, by, r) {
	var tsq = r * r;
	var dx = ax - bx;
	var dy = ay - by;
	var dsq = dx * dx + dy * dy;
	return (dsq < tsq) ? dsq : false;
};

SelectionLayer.prototype.isWithinNorthWestHandle = function(point) {
	return this.isWithinRadius(point.x, point.y, this.bounds.x, this.bounds.y, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinNorthEastHandle = function(point) {
	return this.isWithinRadius(point.x, point.y, this.bounds.x + this.bounds.width, this.bounds.y, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinSouthWestHandle = function(point) {
	return this.isWithinRadius(point.x, point.y, this.bounds.x, this.bounds.y + this.bounds.height, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinSouthEastHandle = function(point) {
	return this.isWithinRadius(point.x, point.y, this.bounds.x + this.bounds.width, this.bounds.y + this.bounds.height, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinBounds = function(point) {

	var bounds = this.bounds;
	return point.x >= bounds.x &&
		point.y >= bounds.y &&
		point.x < bounds.x + bounds.width &&
		point.y < bounds.y + bounds.height;
};

SelectionLayer.prototype.getHandleRadius = function() {
	return this.handleOpts.size / 2;
};

SelectionLayer.prototype.updateRegionAndNotifyListeners = function() {
	this.updateRegion();
	this.listeners.notify('regionChange', this);
};

SelectionLayer.prototype.updateRegion = function() {

	var region = this.region;
	var bounds = this.bounds;
	var target = this.target;

	region.x = target.image.width * (bounds.x - target.bounds.x) / target.bounds.width;
	region.y = target.image.height * (bounds.y - target.bounds.y) / target.bounds.height;

	region.width = target.image.width * (bounds.width / target.bounds.width);
	region.height = target.image.height * (bounds.height / target.bounds.height);
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
	var activeRegion = this.activeRegion;

	// Greyed-out
	context.fillStyle = 'rgba(0, 0, 0, 0.5)';
	context.fillRect(0, 0, canvas.width, bounds.y);
	context.fillRect(0, bounds.y, bounds.x, bounds.height);
	context.fillRect(bounds.x + bounds.width, bounds.y, canvas.width - bounds.x + bounds.width, bounds.height);
	context.fillRect(0, bounds.y + bounds.height, canvas.width, canvas.height - bounds.y + bounds.height);

	var opts = this.handleOpts;

	var handleLengthWidth = Math.min(opts.length, bounds.width);
	var handleLengthHeight = Math.min(opts.length, bounds.height);
	var handleDepth = opts.depth;
	var handleColor = opts.color;
	var handleActiveColor = opts.activeColor;

	// Handles
	context.fillStyle = activeRegion === 'nw-resize' ? handleActiveColor : handleColor;
	context.fillRect(bounds.x, bounds.y, handleLengthWidth, handleDepth);
	context.fillRect(bounds.x, bounds.y + handleDepth, handleDepth, handleLengthHeight - handleDepth);

	context.fillStyle = activeRegion === 'ne-resize' ? handleActiveColor : handleColor;
	context.fillRect(bounds.x + bounds.width - handleLengthWidth, bounds.y, handleLengthWidth, handleDepth);
	context.fillRect(bounds.x + bounds.width - handleDepth, bounds.y + handleDepth, handleDepth, handleLengthHeight - handleDepth);

	context.fillStyle = activeRegion === 'sw-resize' ? handleActiveColor : handleColor;
	context.fillRect(bounds.x, bounds.y + bounds.height - handleDepth, handleLengthWidth, handleDepth);
	context.fillRect(bounds.x, bounds.y + bounds.height - handleLengthHeight, handleDepth, handleLengthHeight - handleDepth);

	context.fillStyle = activeRegion === 'se-resize' ? handleActiveColor : handleColor;
	context.fillRect(bounds.x + bounds.width - handleLengthWidth, bounds.y + bounds.height - handleDepth, handleLengthWidth, handleDepth);
	context.fillRect(bounds.x + bounds.width - handleDepth, bounds.y + bounds.height - handleLengthHeight, handleDepth, handleLengthHeight - handleDepth);

	// Sides
	context.fillStyle = 'rgba(255, 255, 255, 0.25)';
	context.fillRect(bounds.x + handleLengthWidth, bounds.y, bounds.width - 2 * handleLengthWidth, handleDepth);
	context.fillRect(bounds.x + handleLengthWidth, bounds.y + bounds.height - handleDepth, bounds.width - 2 * handleLengthWidth, handleDepth);
	context.fillRect(bounds.x, bounds.y + handleLengthHeight, handleDepth, bounds.height - 2 * handleLengthHeight);
	context.fillRect(bounds.x + bounds.width - handleDepth, bounds.y + handleLengthHeight, handleDepth, bounds.height - 2 * handleLengthHeight);
};

module.exports = SelectionLayer;

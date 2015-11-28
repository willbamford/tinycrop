var Listeners = require('./Listeners.js');

var Input = function(domElement) {

	this.domElement = domElement;
	this.listeners = Listeners.create();

	function createEventForMouse(source) {
		return {
			source: source,
			x: source.offsetX,
			y: source.offsetY,
			type: 'Mouse'
		};
	}

	function createEventForTouch(source) {
		var bounds = source.target.getBoundingClientRect();
		var touch = source.touches.length > 0 ? source.touches[0] : source.changedTouches[0];
		return {
			source: source,
			x: touch.pageX - bounds.left,
			y: touch.pageY - bounds.top,
			type: 'Touch'
		};
	}

	domElement.addEventListener('mousedown', function(source) {
		this.listeners.notify('down', createEventForMouse(source));
	}.bind(this));

	domElement.addEventListener('touchstart', function(source) {
		this.listeners.notify('down', createEventForTouch(source));
	}.bind(this));

	domElement.addEventListener('mousemove', function(source) {
		this.listeners.notify('move', createEventForMouse(source));
	}.bind(this));

	domElement.addEventListener('touchmove', function(source) {
		this.listeners.notify('move', createEventForTouch(source));
	}.bind(this));

	domElement.addEventListener('mouseup', function(source) {
		this.listeners.notify('up', createEventForMouse(source));
	}.bind(this));

	domElement.addEventListener('touchend', function(source) {
		this.listeners.notify('up', createEventForTouch(source));
	}.bind(this));

	domElement.addEventListener('mouseout', function(source) {
		this.listeners.notify('cancel', createEventForMouse(source));
	}.bind(this));

	domElement.addEventListener('touchcancel', function(source) {
		this.listeners.notify('cancel', createEventForTouch(source));
	}.bind(this));
};

Input.create = function(domElement) {
	return new Input(domElement);
};

Input.prototype.on = function(type, fn) {
	this.listeners.on(type, fn);
	return this;
};

Input.prototype.off = function(type, fn) {
	this.listeners.off(type, fn);
	return this;
};

module.exports = Input;

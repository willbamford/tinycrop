var loaded = require('./imageLoaded.js');

var Listeners = require('./Listeners.js');

var DOMImage = window.Image;

var Image = function(source) {

	this.width = 0;
	this.height = 0;

	this.hasLoaded = false;
	this.source = source;

	this.listeners = Listeners.create();

	if (!source)
		return;

	loaded(source, function(err) {

		if (err) {
			this.listeners.notify('error', err);
		} else {
			this.hasLoaded = true;
			this.width = source.naturalWidth;
			this.height = source.naturalHeight;
			this.listeners.notify('load', this);
		}

	}.bind(this));
};

Image.create = function(source) {
	return new Image(source);
};

Image.prototype.getAspect = function() {

	if (!this.hasLoaded)
		return 1;

	return this.width / this.height;
};

Image.prototype.on = function(type, fn) {
	this.listeners.on(type, fn);
};

Image.prototype.off = function(type, fn) {
	this.listeners.off(type, fn);
};

module.exports = Image;

var loaded = require('./imageLoaded.js');

var Listeners = require('./Listeners.js');

var DOMImage = window.Image;

var Image = function(source) {

  this.width = 0;
  this.height = 0;

  this.hasLoaded = false;
  this.src = null;

  this.listeners = Listeners.create();

  if (!source)
    return;

  if (typeof source === 'string') {
    this.src = source;
    var img = document.createElement('img');
    img.src = this.src;
    source = img;
  } else {
    this.src = source.src;
  }

  this.source = source;

  loaded(source, function(err) {

    if (err) {
      this.notify('error', err);
    } else {
      this.hasLoaded = true;
      this.width = source.naturalWidth;
      this.height = source.naturalHeight;
      this.notify('load', this);
    }

  }.bind(this));
};

Image.create = function(source) {
  return new Image(source);
};

Image.prototype.getAspectRatio = function() {

  if (!this.hasLoaded)
    return 1;

  return this.width / this.height;
};

Image.prototype.notify = function(type, data) {
  var listeners = this.listeners;
  setTimeout(function() {
    listeners.notify(type, data);
  }, 0);
};

Image.prototype.on = function(type, fn) {
  this.listeners.on(type, fn);
  return this;
};

Image.prototype.off = function(type, fn) {
  this.listeners.off(type, fn);
  return this;
};

module.exports = Image;

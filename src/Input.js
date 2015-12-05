var Listeners = require('./Listeners.js');

var Input = function(domElement) {

  var listeners = Listeners.create();
  var downEvent = null;
  this.listeners = listeners;

  function createEventForMouse(source) {

    var x = source.offsetX;
    var y = source.offsetY;

    return {
      source: source,
      x: x,
      y: y,
      dx: downEvent ? x - downEvent.x : 0,
      dy: downEvent ? y - downEvent.y : 0,
      type: 'Mouse'
    };
  }

  function createEventForTouch(source) {
    var bounds = source.target.getBoundingClientRect();
    var touch = source.touches.length > 0 ? source.touches[0] : source.changedTouches[0];

    var x = touch.clientX - bounds.left;
    var y = touch.clientY - bounds.top;

    return {
      source: source,
      x: x,
      y: y,
      dx: downEvent ? x - downEvent.x : 0,
      dy: downEvent ? y - downEvent.y : 0,
      type: 'Touch'
    };
  }

  domElement.addEventListener('mousedown', function(source) {
    downEvent = createEventForMouse(source);
    listeners.notify('down', downEvent);
  }.bind(this));

  domElement.addEventListener('touchstart', function(source) {
    downEvent = createEventForTouch(source);
    listeners.notify('down', downEvent);
  }.bind(this));

  domElement.addEventListener('mousemove', function(source) {
    listeners.notify('move', createEventForMouse(source));
  }.bind(this));

  domElement.addEventListener('touchmove', function(source) {
    listeners.notify('move', createEventForTouch(source));
  }.bind(this));

  domElement.addEventListener('mouseup', function(source) {
    listeners.notify('up', createEventForMouse(source));
  }.bind(this));

  domElement.addEventListener('touchend', function(source) {
    listeners.notify('up', createEventForTouch(source));
    downEvent = null;
  }.bind(this));

  domElement.addEventListener('mouseout', function(source) {
    listeners.notify('cancel', createEventForMouse(source));
    downEvent = null;
  }.bind(this));

  domElement.addEventListener('touchcancel', function(source) {
    listeners.notify('cancel', createEventForTouch(source));
    downEvent = null;
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

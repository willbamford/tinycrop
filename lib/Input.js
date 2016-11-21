'use strict';

exports.__esModule = true;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Listeners = require('./Listeners.js');

var _Listeners2 = _interopRequireDefault(_Listeners);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Input = function () {
  function Input(domElement) {
    _classCallCheck(this, Input);

    var listeners = _Listeners2.default.create();
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

    domElement.addEventListener('mousedown', function (source) {
      downEvent = createEventForMouse(source);
      listeners.notify('down', downEvent);
    });

    domElement.addEventListener('touchstart', function (source) {
      downEvent = createEventForTouch(source);
      listeners.notify('down', downEvent);
    });

    domElement.addEventListener('mousemove', function (source) {
      listeners.notify('move', createEventForMouse(source));
    });

    domElement.addEventListener('touchmove', function (source) {
      listeners.notify('move', createEventForTouch(source));
    });

    domElement.addEventListener('mouseup', function (source) {
      listeners.notify('up', createEventForMouse(source));
    });

    domElement.addEventListener('touchend', function (source) {
      listeners.notify('up', createEventForTouch(source));
      downEvent = null;
    });

    domElement.addEventListener('mouseout', function (source) {
      listeners.notify('cancel', createEventForMouse(source));
      downEvent = null;
    });

    domElement.addEventListener('touchcancel', function (source) {
      listeners.notify('cancel', createEventForTouch(source));
      downEvent = null;
    });
  }

  _createClass(Input, [{
    key: 'on',
    value: function on(type, fn) {
      this.listeners.on(type, fn);
      return this;
    }
  }, {
    key: 'off',
    value: function off(type, fn) {
      this.listeners.off(type, fn);
      return this;
    }
  }]);

  return Input;
}();

Input.create = function (domElement) {
  return new Input(domElement);
};

exports.default = Input;
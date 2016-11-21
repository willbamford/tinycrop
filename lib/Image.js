'use strict';

exports.__esModule = true;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _loadImage = require('./loadImage.js');

var _loadImage2 = _interopRequireDefault(_loadImage);

var _Listeners = require('./Listeners.js');

var _Listeners2 = _interopRequireDefault(_Listeners);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Image = function () {
  function Image(source) {
    var _this = this;

    _classCallCheck(this, Image);

    this.width = 0;
    this.height = 0;

    this.hasLoaded = false;
    this.src = null;

    this.listeners = _Listeners2.default.create();

    if (!source) {
      return;
    }

    if (typeof source === 'string') {
      this.src = source;
      var img = document.createElement('img');
      img.src = this.src;
      source = img;
    } else {
      this.src = source.src;
    }

    this.source = source;

    (0, _loadImage2.default)(source, function (err) {
      if (err) {
        _this.notify('error', err);
      } else {
        _this.hasLoaded = true;
        _this.width = source.naturalWidth;
        _this.height = source.naturalHeight;
        _this.notify('load', _this);
      }
    });
  }

  _createClass(Image, [{
    key: 'getAspectRatio',
    value: function getAspectRatio() {
      if (!this.hasLoaded) {
        return 1;
      }

      return this.width / this.height;
    }
  }, {
    key: 'notify',
    value: function notify(type, data) {
      var listeners = this.listeners;
      setTimeout(function () {
        listeners.notify(type, data);
      }, 0);
    }
  }, {
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

  return Image;
}();

Image.create = function (source) {
  return new Image(source);
};

exports.default = Image;
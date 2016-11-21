'use strict';

exports.__esModule = true;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Rectangle = require('./Rectangle.js');

var _Rectangle2 = _interopRequireDefault(_Rectangle);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ImageLayer = function () {
  function ImageLayer() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, ImageLayer);

    this.bounds = _Rectangle2.default.create(0, 0, 0, 0);
    this.image = opts.image || null;
    this.parent = opts.parent;
    this.context = opts.context;
  }

  _createClass(ImageLayer, [{
    key: 'setImage',
    value: function setImage(image) {
      this.image = image;
    }
  }, {
    key: 'revalidate',
    value: function revalidate() {
      var parent = this.parent;
      var image = this.image;
      var bounds = this.bounds;

      if (image) {
        // Constrained by width (otherwise height)
        if (image.width / image.height >= parent.width / parent.height) {
          bounds.width = parent.width;
          bounds.height = Math.ceil(image.height / image.width * parent.width);
          bounds.x = 0;
          bounds.y = Math.floor((parent.height - bounds.height) * 0.5);
        } else {
          bounds.width = Math.ceil(image.width / image.height * parent.height);
          bounds.height = parent.height;
          bounds.x = Math.floor((parent.width - bounds.width) * 0.5);
          bounds.y = 0;
        }
      }
    }
  }, {
    key: 'paint',
    value: function paint() {
      var g = this.context;
      var image = this.image;
      var bounds = this.bounds;

      if (image && image.hasLoaded) {
        g.drawImage(image.source, 0, 0, image.width, image.height, bounds.x, bounds.y, bounds.width, bounds.height);
      }
    }
  }]);

  return ImageLayer;
}();

ImageLayer.create = function (opts) {
  return new ImageLayer(opts);
};

exports.default = ImageLayer;
"use strict";

exports.__esModule = true;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BackgroundLayer = function () {
  function BackgroundLayer() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, BackgroundLayer);

    this.colors = opts.colors;
    this.parent = opts.parent;
    this.context = opts.context;
    this.isDirty = true;
  }

  _createClass(BackgroundLayer, [{
    key: "revalidate",
    value: function revalidate() {
      this.isDirty = true;
    }
  }, {
    key: "setColors",
    value: function setColors(colors) {
      this.colors = colors;
    }
  }, {
    key: "paint",
    value: function paint() {
      if (this.isDirty) {
        var parent = this.parent;
        var g = this.context;

        if (!this.colors || !this.colors.length) {
          g.clearRect(0, 0, parent.width, parent.height);
        } else {
          g.fillStyle = this.colors[0];
          g.fillRect(0, 0, parent.width, parent.height);
        }

        if (this.colors && this.colors.length > 1) {
          var h = parent.height;

          var cols = 32;
          var size = parent.width / cols;
          var rows = Math.ceil(h / size);

          g.fillStyle = this.colors[1];
          for (var i = 0; i < cols; i += 1) {
            for (var j = 0; j < rows; j += 1) {
              if ((i + j) % 2 === 0) {
                g.fillRect(i * size, j * size, size, size);
              }
            }
          }
        }

        this.isDirty = false;
      }
    }
  }]);

  return BackgroundLayer;
}();

BackgroundLayer.create = function (opts) {
  return new BackgroundLayer(opts);
};

exports.default = BackgroundLayer;
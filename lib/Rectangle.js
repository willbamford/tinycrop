"use strict";

exports.__esModule = true;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Rectangle = function () {
  function Rectangle(x, y, width, height) {
    _classCallCheck(this, Rectangle);

    this._x = x;
    this._y = y;
    this._width = width;
    this._height = height;
  }

  _createClass(Rectangle, [{
    key: "copy",
    value: function copy(_copy) {
      this._x = _copy.x;
      this._y = _copy.y;
      this._width = _copy.width;
      this._height = _copy.height;
      return this;
    }
  }, {
    key: "clone",
    value: function clone() {
      return Rectangle.create(this._x, this._y, this._width, this._height);
    }
  }, {
    key: "round",
    value: function round() {
      var dx = this._x;
      var dy = this._y;
      this._x = Math.round(dx);
      this._y = Math.round(dy);
      dx -= this._x;
      dy -= this._y;
      this._width = Math.round(this._width + dx);
      this._height = Math.round(this._height + dy);
      return this;
    }
  }, {
    key: "isInside",
    value: function isInside(point) {
      return point.x >= this.left && point.y >= this.top && point.x < this.right && point.y < this.bottom;
    }
  }]);

  return Rectangle;
}();

Object.defineProperties(Rectangle.prototype, {
  x: {
    get: function get() {
      return this._x;
    },
    set: function set(v) {
      this._x = v;
    }
  },
  y: {
    get: function get() {
      return this._y;
    },
    set: function set(v) {
      this._y = v;
    }
  },
  centerX: {
    get: function get() {
      return this._x + this._width * 0.5;
    },
    set: function set(v) {
      this._x = v - this._width * 0.5;
    }
  },
  centerY: {
    get: function get() {
      return this._y + this._height * 0.5;
    },
    set: function set(v) {
      this._y = v - this._height * 0.5;
    }
  },
  width: {
    get: function get() {
      return this._width;
    },
    set: function set(v) {
      this._width = v;
    }
  },
  height: {
    get: function get() {
      return this._height;
    },
    set: function set(v) {
      this._height = v;
    }
  },
  left: {
    get: function get() {
      return this._x;
    },
    set: function set(v) {
      this._width = this._x + this._width - v;
      this._x = v;
    }
  },
  top: {
    get: function get() {
      return this._y;
    },
    set: function set(v) {
      this._height = this._y + this._height - v;
      this._y = v;
    }
  },
  right: {
    get: function get() {
      return this._x + this._width;
    },
    set: function set(v) {
      this._width = v - this._x;
    }
  },
  bottom: {
    get: function get() {
      return this._y + this._height;
    },
    set: function set(v) {
      this._height = v - this._y;
    }
  },
  aspectRatio: {
    get: function get() {
      return this._width / this._height;
    }
  }
});

Rectangle.create = function (x, y, width, height) {
  return new Rectangle(x, y, width, height);
};

exports.default = Rectangle;
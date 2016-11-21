'use strict';

exports.__esModule = true;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Rectangle = require('./Rectangle.js');

var _Rectangle2 = _interopRequireDefault(_Rectangle);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Selection = function () {
  function Selection(opts) {
    _classCallCheck(this, Selection);

    this.target = opts.target || null;
    this.bounds = _Rectangle2.default.create(0, 0, 0, 0);
    this.boundsPx = _Rectangle2.default.create(0, 0, 0, 0);
    this.region = _Rectangle2.default.create(0, 0, 0, 0);

    this.initialOpts = {
      x: opts.x,
      y: opts.y,
      width: opts.width,
      height: opts.height
    };

    this.aspectRatio = opts.aspectRatio;
    this.minWidth = opts.minWidth !== undefined ? opts.minWidth : 100;
    this.minHeight = opts.minHeight !== undefined ? opts.minHeight : 100;

    this.boundsMinWidth = 0;
    this.boundsMinHeight = 0;

    this._delta = { x: 0, h: 0 };
  }

  _createClass(Selection, [{
    key: 'getBoundsLengthForRegion',
    value: function getBoundsLengthForRegion(regionLen) {
      return regionLen / this.region.width * this.width;
    }
  }, {
    key: 'moveBy',
    value: function moveBy(dx, dy) {
      var bounds = this.bounds;
      var target = this.target;

      bounds.x = Math.min(Math.max(bounds.x + dx, target.bounds.x), target.bounds.x + target.bounds.width - bounds.width);
      bounds.y = Math.min(Math.max(bounds.y + dy, target.bounds.y), target.bounds.y + target.bounds.height - bounds.height);

      return this.updateRegionFromBounds();
    }
  }, {
    key: 'resizeBy',
    value: function resizeBy(dx, dy, p) {
      var delta = this._delta;
      var aspectRatio = this.aspectRatio;
      var bounds = this.bounds;
      var boundsMinWidth = this.boundsMinWidth;
      var boundsMinHeight = this.boundsMinHeight;
      var target = this.target;

      function calculateDelta(x, y) {
        delta.width = bounds.width + x;
        delta.height = bounds.height + y;

        delta.width = Math.max(boundsMinWidth, delta.width);
        delta.height = Math.max(boundsMinHeight, delta.height);

        if (aspectRatio) {
          if (delta.width / delta.height > aspectRatio) {
            delta.width = delta.height * aspectRatio;
          } else {
            delta.height = delta.width / aspectRatio;
          }
        }

        delta.width -= bounds.width;
        delta.height -= bounds.height;

        return delta;
      }

      if (p[0] === 'n') {
        dy = Math.min(dy, this.top - target.bounds.top);
      } else if (p[0] === 's') {
        dy = Math.min(dy, target.bounds.bottom - this.bottom);
      }

      if (p[1] === 'w') {
        dx = Math.min(dx, this.left - target.bounds.left);
      } else if (p[1] === 'e') {
        dx = Math.min(dx, target.bounds.right - this.right);
      }

      delta = calculateDelta(dx, dy);

      switch (p) {
        case 'nw':
          this.left -= delta.width;
          this.top -= delta.height;
          break;
        case 'ne':
          this.right += delta.width;
          this.top -= delta.height;
          break;
        case 'sw':
          this.left -= delta.width;
          this.bottom += delta.height;
          break;
        case 'se':
          this.right += delta.width;
          this.bottom += delta.height;
          break;
      }

      return this.updateRegionFromBounds();
    }
  }, {
    key: 'autoSizeRegion',
    value: function autoSizeRegion() {
      var target = this.target;
      var region = this.region;
      var aspectRatio = this.aspectRatio;
      var initialOpts = this.initialOpts;
      var beforeX = region.x;
      var beforeY = region.y;
      var beforeWidth = region.width;
      var beforeHeight = region.height;

      region.x = initialOpts.x !== undefined ? initialOpts.x : 0;
      region.y = initialOpts.y !== undefined ? initialOpts.y : 0;

      region.width = initialOpts.width !== undefined ? initialOpts.width : target.image.width;
      region.height = initialOpts.height !== undefined ? initialOpts.height : target.image.height;

      if (aspectRatio) {
        if (region.width / region.height > aspectRatio) {
          region.width = region.height * aspectRatio;
        } else {
          region.height = region.width / aspectRatio;
        }
      }

      if (initialOpts.x === undefined) {
        region.centerX = target.image.width * 0.5;
      }

      if (initialOpts.y === undefined) {
        region.centerY = target.image.height * 0.5;
      }

      region.round();

      this.updateBoundsFromRegion();

      return region.x !== beforeX || region.y !== beforeY || region.width !== beforeWidth || region.height !== beforeHeight;
    }
  }, {
    key: 'updateRegionFromBounds',
    value: function updateRegionFromBounds() {
      var target = this.target;
      var region = this.region;
      var bounds = this.bounds;
      var beforeX = region.x;
      var beforeY = region.y;
      var beforeWidth = region.width;
      var beforeHeight = region.height;

      region.x = target.image.width * (bounds.x - target.bounds.x) / target.bounds.width;
      region.y = target.image.height * (bounds.y - target.bounds.y) / target.bounds.height;

      region.width = target.image.width * (bounds.width / target.bounds.width);
      region.height = target.image.height * (bounds.height / target.bounds.height);

      region.round();

      return region.x !== beforeX || region.y !== beforeY || region.width !== beforeWidth || region.height !== beforeHeight;
    }
  }, {
    key: 'updateBoundsFromRegion',
    value: function updateBoundsFromRegion() {
      var target = this.target;
      var region = this.region;
      var bounds = this.bounds;

      if (target.image) {
        bounds.x = target.bounds.x + target.bounds.width * (region.x / target.image.width);
        bounds.y = target.bounds.y + target.bounds.height * (region.y / target.image.height);
        bounds.width = target.bounds.width * (region.width / target.image.width);
        bounds.height = target.bounds.height * (region.height / target.image.height);
      }

      this.boundsMinWidth = this.getBoundsLengthForRegion(this.minWidth);
      this.boundsMinHeight = this.getBoundsLengthForRegion(this.minHeight);
    }
  }, {
    key: 'isInside',
    value: function isInside(point) {
      return this.bounds.isInside(point);
    }
  }]);

  return Selection;
}();

Object.defineProperties(Selection.prototype, {
  x: {
    get: function get() {
      return this.bounds.x;
    },
    set: function set(v) {
      this.bounds.x = v;
    }
  },
  y: {
    get: function get() {
      return this.bounds.y;
    },
    set: function set(v) {
      this.bounds.y = v;
    }
  },
  width: {
    get: function get() {
      return this.bounds.width;
    },
    set: function set(v) {
      this.bounds.width = v;
    }
  },
  height: {
    get: function get() {
      return this.bounds.height;
    },
    set: function set(v) {
      this.bounds.height = v;
    }
  },
  left: {
    get: function get() {
      return this.bounds.x;
    },
    set: function set(v) {
      this.bounds.left = v;
    }
  },
  top: {
    get: function get() {
      return this.bounds.y;
    },
    set: function set(v) {
      this.bounds.top = v;
    }
  },
  right: {
    get: function get() {
      return this.bounds.right;
    },
    set: function set(v) {
      this.bounds.right = v;
    }
  },
  bottom: {
    get: function get() {
      return this.bounds.bottom;
    },
    set: function set(v) {
      this.bounds.bottom = v;
    }
  }
});

Selection.create = function (opts) {
  return new Selection(opts);
};

exports.default = Selection;
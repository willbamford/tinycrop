'use strict';

exports.__esModule = true;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _tinytouch = require('tinytouch');

var _tinytouch2 = _interopRequireDefault(_tinytouch);

var _Listeners = require('./Listeners.js');

var _Listeners2 = _interopRequireDefault(_Listeners);

var _Selection = require('./Selection.js');

var _Selection2 = _interopRequireDefault(_Selection);

var _Rectangle = require('./Rectangle.js');

var _Rectangle2 = _interopRequireDefault(_Rectangle);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SelectionLayer = function () {
  function SelectionLayer() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, SelectionLayer);

    this.selection = _Selection2.default.create(opts);

    this.parent = opts.parent;
    this.context = opts.context;
    this.context.setLineDash = this.context.setLineDash || function () {};
    this.target = opts.target;

    var handleOpts = opts.handle || {};
    handleOpts.length = handleOpts.handleLength || 32;
    handleOpts.depth = handleOpts.depth || 3;
    handleOpts.size = handleOpts.size || handleOpts.length * 2;
    handleOpts.color = handleOpts.color || 'rgba(255, 255, 255, 1.0)';
    handleOpts.activeColor = handleOpts.activeColor || 'rgba(255, 0, 160, 1.0)';
    this.handleOpts = handleOpts;

    this.listeners = _Listeners2.default.create();

    this.touch = (0, _tinytouch2.default)(this.parent.canvas);

    this.activeRegion = null;
    this.downBounds = _Rectangle2.default.create(0, 0, 0, 0);

    this.touch.on('down', this.onInputDown.bind(this)).on('move', this.onInputMove.bind(this)).on('up', this.onInputUpOrCancel.bind(this)).on('cancel', this.onInputUpOrCancel.bind(this));
  }

  _createClass(SelectionLayer, [{
    key: 'onInputDown',
    value: function onInputDown(e) {
      var hitRegion = this.findHitRegion(e);

      if (hitRegion) {
        e.source.preventDefault();
        this.activeRegion = hitRegion;
        this.setCursor(hitRegion);
        this.downBounds.copy(this.selection.bounds);
        this.listeners.notify('start', this.selection.region);
      }
    }
  }, {
    key: 'onInputMove',
    value: function onInputMove(e) {
      var activeRegion = this.activeRegion;

      if (!activeRegion) {
        var hitRegion = this.findHitRegion(e);
        if (hitRegion) {
          e.source.preventDefault();
          this.setCursor(hitRegion);
        } else {
          this.resetCursor();
        }
      } else {
        e.source.preventDefault();

        var selection = this.selection;
        var hasChanged = false;
        selection.bounds.copy(this.downBounds);

        if (activeRegion === 'move') {
          hasChanged = selection.moveBy(e.tx, e.ty);
          if (hasChanged) {
            this.listeners.notify('move', this.selection.region);
          }
        } else {
          var dir = activeRegion.substring(0, 2);
          var dx = dir[1] === 'w' ? -e.tx : e.tx;
          var dy = dir[0] === 'n' ? -e.ty : e.ty;
          hasChanged = selection.resizeBy(dx, dy, dir);
          if (hasChanged) {
            this.listeners.notify('resize', this.selection.region);
          }
        }

        if (hasChanged) {
          this.listeners.notify('change', this.selection.region);
        }
      }
    }
  }, {
    key: 'onInputUpOrCancel',
    value: function onInputUpOrCancel(e) {
      e.source.preventDefault();
      if (this.activeRegion) {
        this.activeRegion = null;
        this.resetCursor();
        this.listeners.notify('end', this.selection.region);
      }
    }
  }, {
    key: 'findHitRegion',
    value: function findHitRegion(point) {
      var hitRegion = null;
      var closest = Number.MAX_VALUE;

      var d = this.isWithinNorthWestHandle(point);
      if (d !== false && d < closest) {
        closest = d;
        hitRegion = 'nw-resize';
      }

      d = this.isWithinNorthEastHandle(point);
      if (d !== false && d < closest) {
        closest = d;
        hitRegion = 'ne-resize';
      }

      d = this.isWithinSouthWestHandle(point);
      if (d !== false && d < closest) {
        closest = d;
        hitRegion = 'sw-resize';
      }

      d = this.isWithinSouthEastHandle(point);
      if (d !== false && d < closest) {
        closest = d;
        hitRegion = 'se-resize';
      }

      if (hitRegion) {
        return hitRegion;
      } else if (this.isWithinBounds(point)) {
        return 'move';
      } else {
        return null;
      }
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
  }, {
    key: 'setCursor',
    value: function setCursor(type) {
      if (this.parent.canvas.style.cursor !== type) {
        this.parent.canvas.style.cursor = type;
      }
    }
  }, {
    key: 'resetCursor',
    value: function resetCursor() {
      this.setCursor('auto');
    }
  }, {
    key: 'isWithinRadius',
    value: function isWithinRadius(ax, ay, bx, by, r) {
      var tsq = r * r;
      var dx = ax - bx;
      var dy = ay - by;
      var dsq = dx * dx + dy * dy;
      return dsq < tsq ? dsq : false;
    }
  }, {
    key: 'isWithinNorthWestHandle',
    value: function isWithinNorthWestHandle(point) {
      return this.isWithinRadius(point.x, point.y, this.selection.left, this.selection.top, this.getHandleRadius());
    }
  }, {
    key: 'isWithinNorthEastHandle',
    value: function isWithinNorthEastHandle(point) {
      return this.isWithinRadius(point.x, point.y, this.selection.right, this.selection.top, this.getHandleRadius());
    }
  }, {
    key: 'isWithinSouthWestHandle',
    value: function isWithinSouthWestHandle(point) {
      return this.isWithinRadius(point.x, point.y, this.selection.left, this.selection.bottom, this.getHandleRadius());
    }
  }, {
    key: 'isWithinSouthEastHandle',
    value: function isWithinSouthEastHandle(point) {
      return this.isWithinRadius(point.x, point.y, this.selection.right, this.selection.bottom, this.getHandleRadius());
    }
  }, {
    key: 'isWithinBounds',
    value: function isWithinBounds(point) {
      return this.selection.isInside(point);
    }
  }, {
    key: 'getHandleRadius',
    value: function getHandleRadius() {
      return this.handleOpts.size / 2;
    }
  }, {
    key: 'onImageLoad',
    value: function onImageLoad() {
      this.autoSizeRegionAndNotify();
    }
  }, {
    key: 'setAspectRatio',
    value: function setAspectRatio(aspectRatio) {
      this.selection.aspectRatio = aspectRatio;
      this.autoSizeRegionAndNotify();
    }
  }, {
    key: 'autoSizeRegionAndNotify',
    value: function autoSizeRegionAndNotify() {
      var hasChanged = this.selection.autoSizeRegion();
      if (hasChanged) {
        this.listeners.notify('change', this.selection.region);
      }
    }
  }, {
    key: 'revalidate',
    value: function revalidate() {
      this.selection.updateBoundsFromRegion();
    }
  }, {
    key: 'paint',
    value: function paint() {
      this.selection.boundsPx.copy(this.selection.bounds).round();

      this.paintOutside();
      this.paintInside();
    }
  }, {
    key: 'paintOutside',
    value: function paintOutside() {
      var bounds = this.selection.boundsPx;
      var g = this.context;
      var target = this.target;

      var tl = target.bounds.x;
      var tt = target.bounds.y;
      var tw = target.bounds.width;
      var tr = target.bounds.right;
      var tb = target.bounds.bottom;

      var bl = bounds.x;
      var bt = bounds.y;
      var bh = bounds.height;
      var br = bounds.right;
      var bb = bounds.bottom;

      g.fillStyle = 'rgba(0, 0, 0, 0.5)';
      g.fillRect(tl, tt, tw, bt - tt);
      g.fillRect(tl, bt, bl - tl, bh);
      g.fillRect(br, bt, tr - br, bh);
      g.fillRect(tl, bb, tw, tb - bb);
    }
  }, {
    key: 'paintInside',
    value: function paintInside() {
      var g = this.context;
      var bounds = this.selection.boundsPx;
      var activeRegion = this.activeRegion;
      var opts = this.handleOpts;

      var lengthWidth = Math.min(opts.length, bounds.width * 0.5);
      var lengthHeight = Math.min(opts.length, bounds.height * 0.5);
      var depth = opts.depth;
      var color = opts.color;
      var activeColor = opts.activeColor;
      var length = 0; // TODO: CHECK

      // Sides
      g.fillStyle = 'rgba(255, 255, 255, 0.3)';
      g.fillRect(bounds.x + length, bounds.y, bounds.width - 2 * length, depth);
      g.fillRect(bounds.x + length, bounds.bottom - depth, bounds.width - 2 * length, depth);
      g.fillRect(bounds.x, bounds.y + length, depth, bounds.height - 2 * length);
      g.fillRect(bounds.right - depth, bounds.y + length, depth, bounds.height - 2 * length);

      // Handles
      var isMoveRegion = activeRegion === 'move';

      g.fillStyle = isMoveRegion || activeRegion === 'nw-resize' ? activeColor : color;
      g.fillRect(bounds.x, bounds.y, lengthWidth, depth);
      g.fillRect(bounds.x, bounds.y + depth, depth, lengthHeight - depth);

      g.fillStyle = isMoveRegion || activeRegion === 'ne-resize' ? activeColor : color;
      g.fillRect(bounds.right - lengthWidth, bounds.y, lengthWidth, depth);
      g.fillRect(bounds.right - depth, bounds.y + depth, depth, lengthHeight - depth);

      g.fillStyle = isMoveRegion || activeRegion === 'sw-resize' ? activeColor : color;
      g.fillRect(bounds.x, bounds.bottom - depth, lengthWidth, depth);
      g.fillRect(bounds.x, bounds.bottom - lengthHeight, depth, lengthHeight - depth);

      g.fillStyle = isMoveRegion || activeRegion === 'se-resize' ? activeColor : color;
      g.fillRect(bounds.right - lengthWidth, bounds.bottom - depth, lengthWidth, depth);
      g.fillRect(bounds.right - depth, bounds.bottom - lengthHeight, depth, lengthHeight - depth);

      // Guides
      g.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      g.setLineDash([2, 3]);
      g.lineWidth = 1;
      g.beginPath();
      var bw3 = bounds.width / 3;
      var bh3 = bounds.height / 3;
      g.moveTo(bounds.x + bw3, bounds.y);
      g.lineTo(bounds.x + bw3, bounds.y + bounds.height);
      g.moveTo(bounds.x + 2 * bw3, bounds.y);
      g.lineTo(bounds.x + 2 * bw3, bounds.y + bounds.height);
      g.moveTo(bounds.x, bounds.y + bh3);
      g.lineTo(bounds.x + bounds.width, bounds.y + bh3);
      g.moveTo(bounds.x, bounds.y + 2 * bh3);
      g.lineTo(bounds.x + bounds.width, bounds.y + 2 * bh3);
      g.stroke();
      g.closePath();
    }
  }]);

  return SelectionLayer;
}();

SelectionLayer.create = function (opts) {
  return new SelectionLayer(opts);
};

exports.default = SelectionLayer;
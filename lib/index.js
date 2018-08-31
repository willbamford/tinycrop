'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _debounce = require('./debounce.js');

var _debounce2 = _interopRequireDefault(_debounce);

var _BackgroundLayer = require('./BackgroundLayer.js');

var _BackgroundLayer2 = _interopRequireDefault(_BackgroundLayer);

var _ImageLayer = require('./ImageLayer.js');

var _ImageLayer2 = _interopRequireDefault(_ImageLayer);

var _SelectionLayer = require('./SelectionLayer.js');

var _SelectionLayer2 = _interopRequireDefault(_SelectionLayer);

var _Image = require('./Image.js');

var _Image2 = _interopRequireDefault(_Image);

var _Listeners = require('./Listeners.js');

var _Listeners2 = _interopRequireDefault(_Listeners);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DEFAULT_CANVAS_WIDTH = 400;
var DEFAULT_CANVAS_HEIGHT = 300;

var Crop = function () {
  function Crop(opts) {
    _classCallCheck(this, Crop);

    this.parent = typeof opts.parent === 'string' ? document.querySelector(opts.parent) : opts.parent;

    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    this.boundsOpts = opts.bounds || { width: '100%', height: 'auto' };
    opts.selection = opts.selection || {};
    this.debounceResize = opts.debounceResize !== undefined ? opts.debounceResize : true;
    this.listeners = _Listeners2.default.create();

    this.parent.appendChild(this.canvas);

    this.backgroundLayer = _BackgroundLayer2.default.create({
      parent: this,
      context: this.context,
      colors: opts.backgroundColors || ['#fff', '#f0f0f0']
    });

    this.imageLayer = _ImageLayer2.default.create({
      parent: this,
      context: this.context,
      image: this.image
    });

    this.selectionLayer = _SelectionLayer2.default.create({
      parent: this,
      context: this.context,
      target: this.imageLayer,
      aspectRatio: opts.selection.aspectRatio,
      minWidth: opts.selection.minWidth,
      minHeight: opts.selection.minHeight,
      x: opts.selection.x,
      y: opts.selection.y,
      width: opts.selection.width,
      height: opts.selection.height,
      handle: {
        color: opts.selection.color,
        activeColor: opts.selection.activeColor
      }
    });

    this.ignoreDevicePixelRatio = opts.ignoreDevicePixelRatio || false;

    var listeners = this.listeners;
    var paint = this.paint.bind(this);

    this.selectionLayer.on('start', function (region) {
      paint();
      listeners.notify('start', region);
    }).on('move', function (region) {
      listeners.notify('move', region);
    }).on('resize', function (region) {
      listeners.notify('resize', region);
    }).on('change', function (region) {
      paint();
      listeners.notify('change', region);
    }).on('end', function (region) {
      paint();
      listeners.notify('end', region);
    });

    window.addEventListener('resize', this.debounceResize ? (0, _debounce2.default)(this.revalidateAndPaint.bind(this), 100) : this.revalidateAndPaint.bind(this));

    this.setImage(opts.image, opts.onInit);

    this.revalidateAndPaint();
  }

  _createClass(Crop, [{
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
    key: 'revalidateAndPaint',
    value: function revalidateAndPaint() {
      this.revalidate();
      this.paint();
    }
  }, {
    key: 'revalidate',
    value: function revalidate() {
      var parent = this.parent;
      var image = this.image;

      var boundsWidth = this.boundsOpts.width;
      var boundsHeight = this.boundsOpts.height;
      var width = 0;
      var height = 0;

      if (isInteger(boundsWidth)) {
        width = boundsWidth;
      } else if (parent && isPercent(boundsWidth)) {
        width = Math.round(parent.clientWidth * getPercent(boundsWidth) / 100);
      } else {
        width = DEFAULT_CANVAS_WIDTH;
      }

      if (isInteger(boundsHeight)) {
        height = boundsHeight;
      } else if (isPercent(boundsHeight)) {
        height = Math.round(width * getPercent(boundsHeight) / 100);
      } else if (image && image.hasLoaded && isAuto(boundsHeight)) {
        height = Math.floor(width / image.getAspectRatio());
      } else {
        height = DEFAULT_CANVAS_HEIGHT;
      }

      this.resizeCanvas(width, height);

      this.backgroundLayer.revalidate();
      this.imageLayer.revalidate();
      this.selectionLayer.revalidate();
    }
  }, {
    key: 'paint',
    value: function paint() {
      var g = this.context;

      g.save();
      g.scale(this.ratio, this.ratio);

      this.backgroundLayer.paint();

      if (this.image && this.image.hasLoaded) {
        this.imageLayer.paint();
        this.selectionLayer.paint();
      }

      g.restore();
    }
  }, {
    key: 'resizeCanvas',
    value: function resizeCanvas(width, height) {
      var canvas = this.canvas;
      this.ratio = !this.ignoreDevicePixelRatio && window.devicePixelRatio ? window.devicePixelRatio : 1;
      this.width = width;
      this.height = height;
      canvas.width = this.width * this.ratio;
      canvas.height = this.height * this.ratio;
    }
  }, {
    key: 'setImage',
    value: function setImage(source, onLoad) {
      var _this = this;

      var image = _Image2.default.create(source).on('load', function () {
        _this.selectionLayer.onImageLoad();
        _this.revalidateAndPaint();
        onLoad && onLoad();
      }).on('error', function (e) {
        console.error(e);
      });

      this.imageLayer.setImage(image);
      this.image = image;
      this.revalidateAndPaint();
    }
  }, {
    key: 'getImage',
    value: function getImage() {
      return this.image;
    }
  }, {
    key: 'setAspectRatio',
    value: function setAspectRatio(aspectRatio) {
      this.selectionLayer.setAspectRatio(aspectRatio);
      this.revalidateAndPaint();
    }
  }, {
    key: 'setBounds',
    value: function setBounds(opts) {
      this.boundsOpts = opts;
      this.revalidateAndPaint();
    }
  }, {
    key: 'setBackgroundColors',
    value: function setBackgroundColors(colors) {
      this.backgroundLayer.setColors(colors);
      this.revalidateAndPaint();
    }
  }]);

  return Crop;
}();

Crop.create = function (opts) {
  return new Crop(opts);
};

Crop.prototype.dispose = noop;

function noop() {}

function isPercent(v) {
  if (typeof v !== 'string') {
    return false;
  }

  if (v.length < 1) {
    return false;
  }

  if (v[v.length - 1] === '%') {
    return true;
  }
}

function getPercent(v) {
  if (!isPercent(v)) {
    return 0;
  }

  return v.slice(0, -1);
}

function isAuto(v) {
  return v === 'auto';
}

function isInteger(v) {
  return typeof v === 'number' && Math.round(v) === v;
}

module.exports = Crop;
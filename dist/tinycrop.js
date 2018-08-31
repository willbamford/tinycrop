(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["tinycrop"] = factory();
	else
		root["tinycrop"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _debounce = __webpack_require__(8);

	var _debounce2 = _interopRequireDefault(_debounce);

	var _BackgroundLayer = __webpack_require__(3);

	var _BackgroundLayer2 = _interopRequireDefault(_BackgroundLayer);

	var _ImageLayer = __webpack_require__(5);

	var _ImageLayer2 = _interopRequireDefault(_ImageLayer);

	var _SelectionLayer = __webpack_require__(7);

	var _SelectionLayer2 = _interopRequireDefault(_SelectionLayer);

	var _Image = __webpack_require__(4);

	var _Image2 = _interopRequireDefault(_Image);

	var _Listeners = __webpack_require__(1);

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

/***/ },
/* 1 */
/***/ function(module, exports) {

	"use strict";

	exports.__esModule = true;

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var Listeners = function () {
	  function Listeners(opts) {
	    _classCallCheck(this, Listeners);

	    this.events = {};
	  }

	  _createClass(Listeners, [{
	    key: "on",
	    value: function on(type, fn) {
	      if (!this.events[type]) {
	        this.events[type] = [];
	      }

	      if (this.events[type].indexOf(fn) === -1) {
	        this.events[type].push(fn);
	      }

	      return this;
	    }
	  }, {
	    key: "off",
	    value: function off(type, fn) {
	      if (this.events[type]) {
	        var i = this.events[type].indexOf(fn);
	        if (i !== -1) {
	          this.events[type].splice(i, 1);
	        }
	      }

	      return this;
	    }
	  }, {
	    key: "notify",
	    value: function notify(type, data) {
	      var _this = this;

	      if (this.events[type]) {
	        this.events[type].forEach(function (fn) {
	          fn.call(_this, data);
	        });
	      }
	    }
	  }, {
	    key: "clearAll",
	    value: function clearAll() {
	      this.events = {};
	    }
	  }]);

	  return Listeners;
	}();

	Listeners.create = function (opts) {
	  return new Listeners(opts);
	};

	exports.default = Listeners;

/***/ },
/* 2 */
/***/ function(module, exports) {

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

/***/ },
/* 3 */
/***/ function(module, exports) {

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

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _loadImage = __webpack_require__(9);

	var _loadImage2 = _interopRequireDefault(_loadImage);

	var _Listeners = __webpack_require__(1);

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

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _Rectangle = __webpack_require__(2);

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

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _Rectangle = __webpack_require__(2);

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

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	var _tinytouch = __webpack_require__(11);

	var _tinytouch2 = _interopRequireDefault(_tinytouch);

	var _Listeners = __webpack_require__(1);

	var _Listeners2 = _interopRequireDefault(_Listeners);

	var _Selection = __webpack_require__(6);

	var _Selection2 = _interopRequireDefault(_Selection);

	var _Rectangle = __webpack_require__(2);

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

/***/ },
/* 8 */
/***/ function(module, exports) {

	"use strict";

	exports.__esModule = true;
	// http://snippetrepo.com/snippets/basic-vanilla-javascript-throttlingdebounce
	function debounce(fn, wait, immediate) {
	  var timeout = void 0;
	  return function () {
	    var context = this;
	    var args = arguments;
	    clearTimeout(timeout);
	    timeout = setTimeout(function () {
	      timeout = null;
	      if (!immediate) fn.apply(context, args);
	    }, wait);
	    if (immediate && !timeout) fn.apply(context, args);
	  };
	}
	exports.default = debounce;

/***/ },
/* 9 */
/***/ function(module, exports) {

	'use strict';

	exports.__esModule = true;
	/*
	 * Modified version of http://github.com/desandro/imagesloaded v2.1.1
	 * MIT License.
	 */

	var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

	function loadImage(image, callback) {
	  if (!image.nodeName || image.nodeName.toLowerCase() !== 'img') {
	    return callback(new Error('First argument must an image element'));
	  }

	  if (image.src && image.complete && image.naturalWidth !== undefined) {
	    return callback(null, true);
	  }

	  image.addEventListener('load', function () {
	    callback(null, false);
	  });

	  image.addEventListener('error', function (e) {
	    callback(new Error('Failed to load image \'' + (image.src || '') + '\''));
	  });

	  if (image.complete) {
	    var src = image.src;
	    image.src = BLANK;
	    image.src = src;
	  }
	}

	exports.default = loadImage;

/***/ },
/* 10 */
/***/ function(module, exports) {

	function E () {
	  // Keep this empty so it's easier to inherit from
	  // (via https://github.com/lipsmack from https://github.com/scottcorgan/tiny-emitter/issues/3)
	}

	E.prototype = {
	  on: function (name, callback, ctx) {
	    var e = this.e || (this.e = {});

	    (e[name] || (e[name] = [])).push({
	      fn: callback,
	      ctx: ctx
	    });

	    return this;
	  },

	  once: function (name, callback, ctx) {
	    var self = this;
	    function listener () {
	      self.off(name, listener);
	      callback.apply(ctx, arguments);
	    };

	    listener._ = callback
	    return this.on(name, listener, ctx);
	  },

	  emit: function (name) {
	    var data = [].slice.call(arguments, 1);
	    var evtArr = ((this.e || (this.e = {}))[name] || []).slice();
	    var i = 0;
	    var len = evtArr.length;

	    for (i; i < len; i++) {
	      evtArr[i].fn.apply(evtArr[i].ctx, data);
	    }

	    return this;
	  },

	  off: function (name, callback) {
	    var e = this.e || (this.e = {});
	    var evts = e[name];
	    var liveEvents = [];

	    if (evts && callback) {
	      for (var i = 0, len = evts.length; i < len; i++) {
	        if (evts[i].fn !== callback && evts[i].fn._ !== callback)
	          liveEvents.push(evts[i]);
	      }
	    }

	    // Remove event from queue to prevent memory leak
	    // Suggested by https://github.com/lazd
	    // Ref: https://github.com/scottcorgan/tiny-emitter/commit/c6ebfaa9bc973b33d110a84a307742b7cf94c953#commitcomment-5024910

	    (liveEvents.length)
	      ? e[name] = liveEvents
	      : delete e[name];

	    return this;
	  }
	};

	module.exports = E;


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.CANCEL = exports.UP = exports.DRAG = exports.MOVE = exports.DOWN = undefined;

	var _tinyEmitter = __webpack_require__(10);

	var _tinyEmitter2 = _interopRequireDefault(_tinyEmitter);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	var createListen = function createListen(element) {
	  return function (name, cb) {
	    element.addEventListener(name, cb);
	  };
	};

	var create = function create() {
	  var domElement = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : window;

	  var emitter = new _tinyEmitter2.default();
	  var instance = {};
	  var listen = createListen(domElement);
	  var downEvent = null;
	  var moveEvent = null;

	  var on = function on(name, fn) {
	    emitter.on(name, fn);
	    return instance;
	  };

	  var once = function once(name, fn) {
	    emitter.once(name, fn);
	    return instance;
	  };

	  var off = function off(name, fn) {
	    emitter.off(name, fn);
	    return instance;
	  };

	  var isDown = function isDown() {
	    return !!downEvent;
	  };

	  var createEvent = function createEvent(source, x, y, type) {
	    var prevEvent = moveEvent || downEvent;
	    return {
	      source: source,
	      x: x,
	      y: y,
	      dx: prevEvent ? x - prevEvent.x : 0,
	      dy: prevEvent ? y - prevEvent.y : 0,
	      tx: downEvent ? x - downEvent.x : 0,
	      ty: downEvent ? y - downEvent.y : 0,
	      type: type
	    };
	  };

	  var createEventForMouse = function createEventForMouse(source) {
	    var target = source.target || source.srcElement;
	    var bounds = target.getBoundingClientRect();
	    var x = source.clientX - bounds.left;
	    var y = source.clientY - bounds.top;
	    return createEvent(source, x, y, 'Mouse');
	  };

	  var createEventForTouch = function createEventForTouch(source) {
	    var bounds = source.target.getBoundingClientRect();
	    var touch = source.touches.length > 0 ? source.touches[0] : source.changedTouches[0];
	    var x = touch.clientX - bounds.left;
	    var y = touch.clientY - bounds.top;
	    return createEvent(source, x, y, 'Touch');
	  };

	  var handleDown = function handleDown(event) {
	    downEvent = event;
	    emitter.emit(DOWN, event);
	  };

	  var handleMove = function handleMove(event) {
	    moveEvent = event;
	    emitter.emit(MOVE, event);
	    if (isDown()) {
	      emitter.emit(DRAG, event);
	    }
	  };

	  var handleUp = function handleUp(event) {
	    emitter.emit(UP, event);
	    downEvent = null;
	    moveEvent = null;
	  };

	  var handleCancel = function handleCancel(event) {
	    emitter.emit(CANCEL, event);
	    downEvent = null;
	    moveEvent = null;
	  };

	  listen('mousedown', function (source) {
	    return handleDown(createEventForMouse(source));
	  });
	  listen('touchstart', function (source) {
	    return handleDown(createEventForTouch(source));
	  });

	  listen('mousemove', function (source) {
	    return handleMove(createEventForMouse(source));
	  });
	  listen('touchmove', function (source) {
	    return handleMove(createEventForTouch(source));
	  });

	  listen('mouseup', function (source) {
	    return handleUp(createEventForMouse(source));
	  });
	  listen('touchend', function (source) {
	    return handleUp(createEventForTouch(source));
	  });

	  listen('mouseout', function (source) {
	    return handleCancel(createEventForMouse(source));
	  });
	  listen('touchcancel', function (source) {
	    return handleCancel(createEventForTouch(source));
	  });

	  instance.on = on;
	  instance.once = once;
	  instance.off = off;

	  return instance;
	};

	exports.default = create;
	var DOWN = exports.DOWN = 'down';
	var MOVE = exports.MOVE = 'move';
	var DRAG = exports.DRAG = 'drag';
	var UP = exports.UP = 'up';
	var CANCEL = exports.CANCEL = 'cancel';

/***/ }
/******/ ])
});
;
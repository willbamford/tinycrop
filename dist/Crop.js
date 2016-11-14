(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Crop = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var BackgroundLayer = function BackgroundLayer(opts) {
  opts = opts || {};

  this.colors = opts.colors;

  this.parent = opts.parent;
  this.context = opts.context;
  this.isDirty = true;
};

BackgroundLayer.create = function (opts) {
  return new BackgroundLayer(opts);
};

BackgroundLayer.prototype.revalidate = function () {
  this.isDirty = true;
};

BackgroundLayer.prototype.setColors = function (colors) {
  this.colors = colors;
};

BackgroundLayer.prototype.paint = function () {
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
};

module.exports = BackgroundLayer;

},{}],2:[function(require,module,exports){
'use strict';

var debounce = require('./debounce.js');
var BackgroundLayer = require('./BackgroundLayer.js');
var ImageLayer = require('./ImageLayer.js');
var SelectionLayer = require('./SelectionLayer.js');
var Image = require('./Image.js');
var Listeners = require('./Listeners.js');

var DEFAULT_CANVAS_WIDTH = 400;
var DEFAULT_CANVAS_HEIGHT = 300;

var Crop = function Crop(opts) {
  this.parent = typeof opts.parent === 'string' ? document.querySelector(opts.parent) : opts.parent;

  this.canvas = document.createElement('canvas');
  this.context = this.canvas.getContext('2d');
  this.boundsOpts = opts.bounds || { width: '100%', height: 'auto' };
  opts.selection = opts.selection || {};
  this.debounceResize = opts.debounceResize !== undefined ? opts.debounceResize : true;
  this.listeners = Listeners.create();

  this.parent.appendChild(this.canvas);

  this.backgroundLayer = BackgroundLayer.create({
    parent: this,
    context: this.context,
    colors: opts.backgroundColors || ['#fff', '#f0f0f0']
  });

  this.imageLayer = ImageLayer.create({
    parent: this,
    context: this.context,
    image: this.image
  });

  this.selectionLayer = SelectionLayer.create({
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

  window.addEventListener('resize', this.debounceResize ? debounce(this.revalidateAndPaint.bind(this), 100) : this.revalidateAndPaint.bind(this));

  this.setImage(opts.image);

  this.revalidateAndPaint();
};

Crop.create = function (opts) {
  return new Crop(opts);
};

Crop.prototype.on = function (type, fn) {
  this.listeners.on(type, fn);
  return this;
};

Crop.prototype.off = function (type, fn) {
  this.listeners.off(type, fn);
  return this;
};

Crop.prototype.revalidateAndPaint = function () {
  this.revalidate();
  this.paint();
};

Crop.prototype.revalidate = function () {
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
};

Crop.prototype.paint = function () {
  var g = this.context;

  g.save();
  g.scale(this.ratio, this.ratio);

  this.backgroundLayer.paint();

  if (this.image && this.image.hasLoaded) {
    this.imageLayer.paint();
    this.selectionLayer.paint();
  }

  g.restore();
};

Crop.prototype.resizeCanvas = function (width, height) {
  var context = this.context;
  var canvas = this.canvas;
  this.ratio = 1;

  if (!context.webkitBackingStorePixelRatio) {
    this.ratio = window.devicePixelRatio || 1;
  }

  this.width = width;
  this.height = height;

  canvas.width = this.width * this.ratio;
  canvas.height = this.height * this.ratio;
};

Crop.prototype.setImage = function (source) {
  var image = Image.create(source).on('load', function () {
    this.selectionLayer.onImageLoad();
    this.revalidateAndPaint();
  }.bind(this)).on('error', function (e) {
    console.error(e);
  });

  this.imageLayer.setImage(image);
  this.image = image;
  this.revalidateAndPaint();
};

Crop.prototype.getImage = function () {
  return this.image;
};

Crop.prototype.setAspectRatio = function (aspectRatio) {
  this.selectionLayer.setAspectRatio(aspectRatio);
  this.revalidateAndPaint();
};

Crop.prototype.setBounds = function (opts) {
  this.boundsOpts = opts;
  this.revalidateAndPaint();
};

Crop.prototype.setBackgroundColors = function (colors) {
  this.backgroundLayer.setColors(colors);
  this.revalidateAndPaint();
};

Crop.prototype.dispose = noop;

function noop() {};

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

},{"./BackgroundLayer.js":1,"./Image.js":3,"./ImageLayer.js":4,"./Listeners.js":6,"./SelectionLayer.js":9,"./debounce.js":10}],3:[function(require,module,exports){
'use strict';

var loaded = require('./loadImage.js');
var Listeners = require('./Listeners.js');

var Image = function Image(source) {
  this.width = 0;
  this.height = 0;

  this.hasLoaded = false;
  this.src = null;

  this.listeners = Listeners.create();

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

  loaded(source, function (err) {
    if (err) {
      this.notify('error', err);
    } else {
      this.hasLoaded = true;
      this.width = source.naturalWidth;
      this.height = source.naturalHeight;
      this.notify('load', this);
    }
  }.bind(this));
};

Image.create = function (source) {
  return new Image(source);
};

Image.prototype.getAspectRatio = function () {
  if (!this.hasLoaded) {
    return 1;
  }

  return this.width / this.height;
};

Image.prototype.notify = function (type, data) {
  var listeners = this.listeners;
  setTimeout(function () {
    listeners.notify(type, data);
  }, 0);
};

Image.prototype.on = function (type, fn) {
  this.listeners.on(type, fn);
  return this;
};

Image.prototype.off = function (type, fn) {
  this.listeners.off(type, fn);
  return this;
};

module.exports = Image;

},{"./Listeners.js":6,"./loadImage.js":11}],4:[function(require,module,exports){
'use strict';

var Rectangle = require('./Rectangle.js');

var ImageLayer = function ImageLayer(opts) {
  opts = opts || {};
  this.bounds = Rectangle.create(0, 0, 0, 0);
  this.image = opts.image || null;
  this.parent = opts.parent;
  this.context = opts.context;
};

ImageLayer.create = function (opts) {
  return new ImageLayer(opts);
};

ImageLayer.prototype.setImage = function (image) {
  this.image = image;
};

ImageLayer.prototype.revalidate = function () {
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
};

ImageLayer.prototype.paint = function () {
  var g = this.context;
  var image = this.image;
  var bounds = this.bounds;

  if (image && image.hasLoaded) {
    g.drawImage(image.source, 0, 0, image.width, image.height, bounds.x, bounds.y, bounds.width, bounds.height);
  }
};

module.exports = ImageLayer;

},{"./Rectangle.js":7}],5:[function(require,module,exports){
'use strict';

var Listeners = require('./Listeners.js');

var Input = function Input(domElement) {
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
};

Input.create = function (domElement) {
  return new Input(domElement);
};

Input.prototype.on = function (type, fn) {
  this.listeners.on(type, fn);
  return this;
};

Input.prototype.off = function (type, fn) {
  this.listeners.off(type, fn);
  return this;
};

module.exports = Input;

},{"./Listeners.js":6}],6:[function(require,module,exports){
"use strict";

var Listeners = function Listeners(opts) {
  this.events = {};
};

Listeners.create = function (opts) {
  return new Listeners(opts);
};

Listeners.prototype.on = function (type, fn) {
  if (!this.events[type]) {
    this.events[type] = [];
  }

  if (this.events[type].indexOf(fn) === -1) {
    this.events[type].push(fn);
  }

  return this;
};

Listeners.prototype.off = function (type, fn) {
  if (this.events[type]) {
    var i = this.events[type].indexOf(fn);
    if (i !== -1) {
      this.events[type].splice(i, 1);
    }
  }

  return this;
};

Listeners.prototype.notify = function (type, data) {
  if (this.events[type]) {
    this.events[type].forEach(function (fn) {
      fn.call(this, data);
    }.bind(this));
  }
};

Listeners.prototype.clearAll = function () {
  this.events = {};
};

module.exports = Listeners;

},{}],7:[function(require,module,exports){
"use strict";

var Rectangle = function Rectangle(x, y, width, height) {
  this._x = x;
  this._y = y;
  this._width = width;
  this._height = height;
};

Rectangle.prototype.copy = function (copy) {
  this._x = copy.x;
  this._y = copy.y;
  this._width = copy.width;
  this._height = copy.height;
  return this;
};

Rectangle.prototype.clone = function () {
  return Rectangle.create(this._x, this._y, this._width, this._height);
};

Rectangle.prototype.round = function () {
  var dx = this._x;
  var dy = this._y;
  this._x = Math.round(dx);
  this._y = Math.round(dy);
  dx -= this._x;
  dy -= this._y;
  this._width = Math.round(this._width + dx);
  this._height = Math.round(this._height + dy);
  return this;
};

Rectangle.prototype.isInside = function (point) {
  return point.x >= this.left && point.y >= this.top && point.x < this.right && point.y < this.bottom;
};

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

module.exports = Rectangle;

},{}],8:[function(require,module,exports){
'use strict';

var Rectangle = require('./Rectangle.js');

var Selection = function Selection(opts) {
  this.target = opts.target || null;
  this.bounds = Rectangle.create(0, 0, 0, 0);
  this.boundsPx = Rectangle.create(0, 0, 0, 0);
  this.region = Rectangle.create(0, 0, 0, 0);

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
};

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

Selection.prototype.getBoundsLengthForRegion = function (regionLen) {
  return regionLen / this.region.width * this.width;
};

Selection.prototype.moveBy = function (dx, dy) {
  var bounds = this.bounds;
  var target = this.target;

  bounds.x = Math.min(Math.max(bounds.x + dx, target.bounds.x), target.bounds.x + target.bounds.width - bounds.width);
  bounds.y = Math.min(Math.max(bounds.y + dy, target.bounds.y), target.bounds.y + target.bounds.height - bounds.height);

  return this.updateRegionFromBounds();
};

Selection.prototype.resizeBy = function (dx, dy, p) {
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
};

Selection.prototype.autoSizeRegion = function () {
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
};

Selection.prototype.updateRegionFromBounds = function () {
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
};

Selection.prototype.updateBoundsFromRegion = function () {
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
};

Selection.prototype.isInside = function (point) {
  return this.bounds.isInside(point);
};

Selection.create = function (opts) {
  return new Selection(opts);
};

module.exports = Selection;

},{"./Rectangle.js":7}],9:[function(require,module,exports){
'use strict';

var Input = require('./Input.js');
var Listeners = require('./Listeners.js');
var Selection = require('./Selection.js');
var Rectangle = require('./Rectangle.js');

var SelectionLayer = function SelectionLayer(opts) {
  opts = opts || {};

  this.selection = Selection.create(opts);

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

  this.listeners = Listeners.create();

  this.input = Input.create(this.parent.canvas);

  this.activeRegion = null;
  this.downBounds = Rectangle.create(0, 0, 0, 0);

  this.input.on('down', this.onInputDown.bind(this));
  this.input.on('move', this.onInputMove.bind(this));
  this.input.on('up', this.onInputUpOrCancel.bind(this)).on('cancel', this.onInputUpOrCancel.bind(this));
};

SelectionLayer.create = function (opts) {
  return new SelectionLayer(opts);
};

SelectionLayer.prototype.onInputDown = function (e) {
  var hitRegion = this.findHitRegion(e);

  if (hitRegion) {
    e.source.preventDefault();
    this.activeRegion = hitRegion;
    this.setCursor(hitRegion);
    this.downBounds.copy(this.selection.bounds);
    this.listeners.notify('start', this.selection.region);
  }
};

SelectionLayer.prototype.onInputMove = function (e) {
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
      hasChanged = selection.moveBy(e.dx, e.dy);
      if (hasChanged) {
        this.listeners.notify('move', this.selection.region);
      }
    } else {
      var dir = activeRegion.substring(0, 2);
      var dx = dir[1] === 'w' ? -e.dx : e.dx;
      var dy = dir[0] === 'n' ? -e.dy : e.dy;
      hasChanged = selection.resizeBy(dx, dy, dir);
      if (hasChanged) {
        this.listeners.notify('resize', this.selection.region);
      }
    }

    if (hasChanged) {
      this.listeners.notify('change', this.selection.region);
    }
  }
};

SelectionLayer.prototype.onInputUpOrCancel = function (e) {
  e.source.preventDefault();
  if (this.activeRegion) {
    this.activeRegion = null;
    this.resetCursor();
    this.listeners.notify('end', this.selection.region);
  }
};

SelectionLayer.prototype.findHitRegion = function (point) {
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
};

SelectionLayer.prototype.on = function (type, fn) {
  this.listeners.on(type, fn);
  return this;
};

SelectionLayer.prototype.off = function (type, fn) {
  this.listeners.off(type, fn);
  return this;
};

SelectionLayer.prototype.setCursor = function (type) {
  if (this.parent.canvas.style.cursor !== type) {
    this.parent.canvas.style.cursor = type;
  }
};

SelectionLayer.prototype.resetCursor = function () {
  this.setCursor('auto');
};

SelectionLayer.prototype.isWithinRadius = function (ax, ay, bx, by, r) {
  var tsq = r * r;
  var dx = ax - bx;
  var dy = ay - by;
  var dsq = dx * dx + dy * dy;
  return dsq < tsq ? dsq : false;
};

SelectionLayer.prototype.isWithinNorthWestHandle = function (point) {
  return this.isWithinRadius(point.x, point.y, this.selection.left, this.selection.top, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinNorthEastHandle = function (point) {
  return this.isWithinRadius(point.x, point.y, this.selection.right, this.selection.top, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinSouthWestHandle = function (point) {
  return this.isWithinRadius(point.x, point.y, this.selection.left, this.selection.bottom, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinSouthEastHandle = function (point) {
  return this.isWithinRadius(point.x, point.y, this.selection.right, this.selection.bottom, this.getHandleRadius());
};

SelectionLayer.prototype.isWithinBounds = function (point) {
  return this.selection.isInside(point);
};

SelectionLayer.prototype.getHandleRadius = function () {
  return this.handleOpts.size / 2;
};

SelectionLayer.prototype.onImageLoad = function () {
  this.autoSizeRegionAndNotify();
};

SelectionLayer.prototype.setAspectRatio = function (aspectRatio) {
  this.selection.aspectRatio = aspectRatio;
  this.autoSizeRegionAndNotify();
};

SelectionLayer.prototype.autoSizeRegionAndNotify = function () {
  var hasChanged = this.selection.autoSizeRegion();
  if (hasChanged) {
    this.listeners.notify('change', this.selection.region);
  }
};

SelectionLayer.prototype.revalidate = function () {
  this.selection.updateBoundsFromRegion();
};

SelectionLayer.prototype.paint = function () {
  this.selection.boundsPx.copy(this.selection.bounds).round();

  this.paintOutside();
  this.paintInside();
};

SelectionLayer.prototype.paintOutside = function () {
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
};

SelectionLayer.prototype.paintInside = function () {
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
};

module.exports = SelectionLayer;

},{"./Input.js":5,"./Listeners.js":6,"./Rectangle.js":7,"./Selection.js":8}],10:[function(require,module,exports){
"use strict";

// http://snippetrepo.com/snippets/basic-vanilla-javascript-throttlingdebounce
function debounce(fn, wait, immediate) {
  var timeout;
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
};

module.exports = debounce;

},{}],11:[function(require,module,exports){
'use strict';

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

module.exports = loadImage;

},{}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvQmFja2dyb3VuZExheWVyLmpzIiwic3JjL0Nyb3AuanMiLCJzcmMvSW1hZ2UuanMiLCJzcmMvSW1hZ2VMYXllci5qcyIsInNyYy9JbnB1dC5qcyIsInNyYy9MaXN0ZW5lcnMuanMiLCJzcmMvUmVjdGFuZ2xlLmpzIiwic3JjL1NlbGVjdGlvbi5qcyIsInNyYy9TZWxlY3Rpb25MYXllci5qcyIsInNyYy9kZWJvdW5jZS5qcyIsInNyYy9sb2FkSW1hZ2UuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0FBLElBQUksa0JBQWtCLFNBQWxCLGVBQWtCLENBQVUsSUFBVixFQUFnQjtBQUNwQyxTQUFPLFFBQVEsRUFBZjs7QUFFQSxPQUFLLE1BQUwsR0FBYyxLQUFLLE1BQW5COztBQUVBLE9BQUssTUFBTCxHQUFjLEtBQUssTUFBbkI7QUFDQSxPQUFLLE9BQUwsR0FBZSxLQUFLLE9BQXBCO0FBQ0EsT0FBSyxPQUFMLEdBQWUsSUFBZjtBQUNELENBUkQ7O0FBVUEsZ0JBQWdCLE1BQWhCLEdBQXlCLFVBQVUsSUFBVixFQUFnQjtBQUN2QyxTQUFPLElBQUksZUFBSixDQUFvQixJQUFwQixDQUFQO0FBQ0QsQ0FGRDs7QUFJQSxnQkFBZ0IsU0FBaEIsQ0FBMEIsVUFBMUIsR0FBdUMsWUFBWTtBQUNqRCxPQUFLLE9BQUwsR0FBZSxJQUFmO0FBQ0QsQ0FGRDs7QUFJQSxnQkFBZ0IsU0FBaEIsQ0FBMEIsU0FBMUIsR0FBc0MsVUFBVSxNQUFWLEVBQWtCO0FBQ3RELE9BQUssTUFBTCxHQUFjLE1BQWQ7QUFDRCxDQUZEOztBQUlBLGdCQUFnQixTQUFoQixDQUEwQixLQUExQixHQUFrQyxZQUFZO0FBQzVDLE1BQUksS0FBSyxPQUFULEVBQWtCO0FBQ2hCLFFBQUksU0FBUyxLQUFLLE1BQWxCO0FBQ0EsUUFBSSxJQUFJLEtBQUssT0FBYjs7QUFFQSxRQUFJLENBQUMsS0FBSyxNQUFO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QUFQLEdBQWlCLFNBQWpCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBCYWNrZ3JvdW5kTGF5ZXIgPSBmdW5jdGlvbiAob3B0cykge1xuICBvcHRzID0gb3B0cyB8fCB7fVxuXG4gIHRoaXMuY29sb3JzID0gb3B0cy5jb2xvcnNcblxuICB0aGlzLnBhcmVudCA9IG9wdHMucGFyZW50XG4gIHRoaXMuY29udGV4dCA9IG9wdHMuY29udGV4dFxuICB0aGlzLmlzRGlydHkgPSB0cnVlXG59XG5cbkJhY2tncm91bmRMYXllci5jcmVhdGUgPSBmdW5jdGlvbiAob3B0cykge1xuICByZXR1cm4gbmV3IEJhY2tncm91bmRMYXllcihvcHRzKVxufVxuXG5CYWNrZ3JvdW5kTGF5ZXIucHJvdG90eXBlLnJldmFsaWRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuaXNEaXJ0eSA9IHRydWVcbn1cblxuQmFja2dyb3VuZExheWVyLnByb3RvdHlwZS5zZXRDb2xvcnMgPSBmdW5jdGlvbiAoY29sb3JzKSB7XG4gIHRoaXMuY29sb3JzID0gY29sb3JzXG59XG5cbkJhY2tncm91bmRMYXllci5wcm90b3R5cGUucGFpbnQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0aGlzLmlzRGlydHkpIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcy5wYXJlbnRcbiAgICB2YXIgZyA9IHRoaXMuY29udGV4dFxuXG4gICAgaWYgKCF0aGlzLmNvbG9ycyB8fCAhdGhpcy5jb2xvcnMubGVuZ3RoKSB7XG4gICAgICBnLmNsZWFyUmVjdCgwLCAwLCBwYXJlbnQud2lkdGgsIHBhcmVudC5oZWlnaHQpXG4gICAgfSBlbHNlIHtcbiAgICAgIGcuZmlsbFN0eWxlID0gdGhpcy5jb2xvcnNbMF1cbiAgICAgIGcuZmlsbFJlY3QoMCwgMCwgcGFyZW50LndpZHRoLCBwYXJlbnQuaGVpZ2h0KVxuICAgIH1cblxuICAgIGlmICh0aGlzLmNvbG9ycyAmJiB0aGlzLmNvbG9ycy5sZW5ndGggPiAxKSB7XG4gICAgICB2YXIgaCA9IHBhcmVudC5oZWlnaHRcblxuICAgICAgdmFyIGNvbHMgPSAzMlxuICAgICAgdmFyIHNpemUgPSBwYXJlbnQud2lkdGggLyBjb2xzXG4gICAgICB2YXIgcm93cyA9IE1hdGguY2VpbChoIC8gc2l6ZSlcblxuICAgICAgZy5maWxsU3R5bGUgPSB0aGlzLmNvbG9yc1sxXVxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb2xzOyBpICs9IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCByb3dzOyBqICs9IDEpIHtcbiAgICAgICAgICBpZiAoKGkgKyBqKSAlIDIgPT09IDApIHtcbiAgICAgICAgICAgIGcuZmlsbFJlY3QoaSAqIHNpemUsIGogKiBzaXplLCBzaXplLCBzaXplKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuaXNEaXJ0eSA9IGZhbHNlXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBCYWNrZ3JvdW5kTGF5ZXJcbiIsInZhciBkZWJvdW5jZSA9IHJlcXVpcmUoJy4vZGVib3VuY2UuanMnKVxudmFyIEJhY2tncm91bmRMYXllciA9IHJlcXVpcmUoJy4vQmFja2dyb3VuZExheWVyLmpzJylcbnZhciBJbWFnZUxheWVyID0gcmVxdWlyZSgnLi9JbWFnZUxheWVyLmpzJylcbnZhciBTZWxlY3Rpb25MYXllciA9IHJlcXVpcmUoJy4vU2VsZWN0aW9uTGF5ZXIuanMnKVxudmFyIEltYWdlID0gcmVxdWlyZSgnLi9JbWFnZS5qcycpXG52YXIgTGlzdGVuZXJzID0gcmVxdWlyZSgnLi9MaXN0ZW5lcnMuanMnKVxuXG52YXIgREVGQVVMVF9DQU5WQVNfV0lEVEggPSA0MDBcbnZhciBERUZBVUxUX0NBTlZBU19IRUlHSFQgPSAzMDBcblxudmFyIENyb3AgPSBmdW5jdGlvbiAob3B0cykge1xuICB0aGlzLnBhcmVudCA9IHR5cGVvZiBvcHRzLnBhcmVudCA9PT0gJ3N0cmluZycgPyBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKG9wdHMucGFyZW50KSA6IG9wdHMucGFyZW50XG5cbiAgdGhpcy5jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKVxuICB0aGlzLmNvbnRleHQgPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpXG4gIHRoaXMuYm91bmRzT3B0cyA9IG9wdHMuYm91bmRzIHx8IHt3aWR0aDogJzEwMCUnLCBoZWlnaHQ6ICdhdXRvJ31cbiAgb3B0cy5zZWxlY3Rpb24gPSBvcHRzLnNlbGVjdGlvbiB8fCB7fVxuICB0aGlzLmRlYm91bmNlUmVzaXplID0gb3B0cy5kZWJvdW5jZVJlc2l6ZSAhPT0gdW5kZWZpbmVkID8gb3B0cy5kZWJvdW5jZVJlc2l6ZSA6IHRydWVcbiAgdGhpcy5saXN0ZW5lcnMgPSBMaXN0ZW5lcnMuY3JlYXRlKClcblxuICB0aGlzLnBhcmVudC5hcHBlbmRDaGlsZCh0aGlzLmNhbnZhcylcblxuICB0aGlzLmJhY2tncm91bmRMYXllciA9IEJhY2tncm91bmRMYXllci5jcmVhdGUoe1xuICAgIHBhcmVudDogdGhpcyxcbiAgICBjb250ZXh0OiB0aGlzLmNvbnRleHQsXG4gICAgY29sb3JzOiBvcHRzLmJhY2tncm91bmRDb2xvcnMgfHwgWycjZmZmJywgJyNmMGYwZjAnXVxuICB9KVxuXG4gIHRoaXMuaW1hZ2VMYXllciA9IEltYWdlTGF5ZXIuY3JlYXRlKHtcbiAgICBwYXJlbnQ6IHRoaXMsXG4gICAgY29udGV4dDogdGhpcy5jb250ZXh0LFxuICAgIGltYWdlOiB0aGlzLmltYWdlXG4gIH0pXG5cbiAgdGhpcy5zZWxlY3Rpb25MYXllciA9IFNlbGVjdGlvbkxheWVyLmNyZWF0ZSh7XG4gICAgcGFyZW50OiB0aGlzLFxuICAgIGNvbnRleHQ6IHRoaXMuY29udGV4dCxcbiAgICB0YXJnZXQ6IHRoaXMuaW1hZ2VMYXllcixcbiAgICBhc3BlY3RSYXRpbzogb3B0cy5zZWxlY3Rpb24uYXNwZWN0UmF0aW8sXG4gICAgbWluV2lkdGg6IG9wdHMuc2VsZWN0aW9uLm1pbldpZHRoLFxuICAgIG1pbkhlaWdodDogb3B0cy5zZWxlY3Rpb24ubWluSGVpZ2h0LFxuICAgIHg6IG9wdHMuc2VsZWN0aW9uLngsXG4gICAgeTogb3B0cy5zZWxlY3Rpb24ueSxcbiAgICB3aWR0aDogb3B0cy5zZWxlY3Rpb24ud2lkdGgsXG4gICAgaGVpZ2h0OiBvcHRzLnNlbGVjdGlvbi5oZWlnaHQsXG4gICAgaGFuZGxlOiB7XG4gICAgICBjb2xvcjogb3B0cy5zZWxlY3Rpb24uY29sb3IsXG4gICAgICBhY3RpdmVDb2xvcjogb3B0cy5zZWxlY3Rpb24uYWN0aXZlQ29sb3JcbiAgICB9XG4gIH0pXG5cbiAgdmFyIGxpc3RlbmVycyA9IHRoaXMubGlzdGVuZXJzXG4gIHZhciBwYWludCA9IHRoaXMucGFpbnQuYmluZCh0aGlzKVxuXG4gIHRoaXMuc2VsZWN0aW9uTGF5ZXJcbiAgICAub24oXG4gICAgICAnc3RhcnQnLFxuICAgICAgZnVuY3Rpb24gKHJlZ2lvbikge1xuICAgICAgICBwYWludCgpXG4gICAgICAgIGxpc3RlbmVycy5ub3RpZnkoJ3N0YXJ0JywgcmVnaW9uKVxuICAgICAgfVxuICAgIClcbiAgICAub24oXG4gICAgICAnbW92ZScsXG4gICAgICBmdW5jdGlvbiAocmVnaW9uKSB7XG4gICAgICAgIGxpc3RlbmVycy5ub3RpZnkoJ21vdmUnLCByZWdpb24pXG4gICAgICB9XG4gICAgKVxuICAgIC5vbihcbiAgICAgICdyZXNpemUnLFxuICAgICAgZnVuY3Rpb24gKHJlZ2lvbikge1xuICAgICAgICBsaXN0ZW5lcnMubm90aWZ5KCdyZXNpemUnLCByZWdpb24pXG4gICAgICB9XG4gICAgKVxuICAgIC5vbihcbiAgICAgICdjaGFuZ2UnLFxuICAgICAgZnVuY3Rpb24gKHJlZ2lvbikge1xuICAgICAgICBwYWludCgpXG4gICAgICAgIGxpc3RlbmVycy5ub3RpZnkoJ2NoYW5nZScsIHJlZ2lvbilcbiAgICAgIH1cbiAgICApXG4gICAgLm9uKFxuICAgICAgJ2VuZCcsXG4gICAgICBmdW5jdGlvbiAocmVnaW9uKSB7XG4gICAgICAgIHBhaW50KClcbiAgICAgICAgbGlzdGVuZXJzLm5vdGlmeSgnZW5kJywgcmVnaW9uKVxuICAgICAgfVxuICAgIClcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAncmVzaXplJyxcbiAgICB0aGlzLmRlYm91bmNlUmVzaXplXG4gICAgICA/IGRlYm91bmNlKHRoaXMucmV2YWxpZGF0ZUFuZFBhaW50LmJpbmQodGhpcyksIDEwMClcbiAgICAgIDogdGhpcy5yZXZhbGlkYXRlQW5kUGFpbnQuYmluZCh0aGlzKVxuICApXG5cbiAgdGhpcy5zZXRJbWFnZShvcHRzLmltYWdlKVxuXG4gIHRoaXMucmV2YWxpZGF0ZUFuZFBhaW50KClcbn1cblxuQ3JvcC5jcmVhdGUgPSBmdW5jdGlvbiAob3B0cykge1xuICByZXR1cm4gbmV3IENyb3Aob3B0cylcbn1cblxuQ3JvcC5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAodHlwZSwgZm4pIHtcbiAgdGhpcy5saXN0ZW5lcnMub24odHlwZSwgZm4pXG4gIHJldHVybiB0aGlzXG59XG5cbkNyb3AucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuICB0aGlzLmxpc3RlbmVycy5vZmYodHlwZSwgZm4pXG4gIHJldHVybiB0aGlzXG59XG5cbkNyb3AucHJvdG90eXBlLnJldmFsaWRhdGVBbmRQYWludCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5yZXZhbGlkYXRlKClcbiAgdGhpcy5wYWludCgpXG59XG5cbkNyb3AucHJvdG90eXBlLnJldmFsaWRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBwYXJlbnQgPSB0aGlzLnBhcmVudFxuICB2YXIgaW1hZ2UgPSB0aGlzLmltYWdlXG5cbiAgdmFyIGJvdW5kc1dpZHRoID0gdGhpcy5ib3VuZHNPcHRzLndpZHRoXG4gIHZhciBib3VuZHNIZWlnaHQgPSB0aGlzLmJvdW5kc09wdHMuaGVpZ2h0XG4gIHZhciB3aWR0aCA9IDBcbiAgdmFyIGhlaWdodCA9IDBcblxuICBpZiAoaXNJbnRlZ2VyKGJvdW5kc1dpZHRoKSkge1xuICAgIHdpZHRoID0gYm91bmRzV2lkdGhcbiAgfSBlbHNlIGlmIChwYXJlbnQgJiYgaXNQZXJjZW50KGJvdW5kc1dpZHRoKSkge1xuICAgIHdpZHRoID0gTWF0aC5yb3VuZChwYXJlbnQuY2xpZW50V2lkdGggKiBnZXRQZXJjZW50KGJvdW5kc1dpZHRoKSAvIDEwMClcbiAgfSBlbHNlIHtcbiAgICB3aWR0aCA9IERFRkFVTFRfQ0FOVkFTX1dJRFRIXG4gIH1cblxuICBpZiAoaXNJbnRlZ2VyKGJvdW5kc0hlaWdodCkpIHtcbiAgICBoZWlnaHQgPSBib3VuZHNIZWlnaHRcbiAgfSBlbHNlIGlmIChpc1BlcmNlbnQoYm91bmRzSGVpZ2h0KSkge1xuICAgIGhlaWdodCA9IE1hdGgucm91bmQod2lkdGggKiBnZXRQZXJjZW50KGJvdW5kc0hlaWdodCkgLyAxMDApXG4gIH0gZWxzZSBpZiAoaW1hZ2UgJiYgaW1hZ2UuaGFzTG9hZGVkICYmIGlzQXV0byhib3VuZHNIZWlnaHQpKSB7XG4gICAgaGVpZ2h0ID0gTWF0aC5mbG9vcih3aWR0aCAvIGltYWdlLmdldEFzcGVjdFJhdGlvKCkpXG4gIH0gZWxzZSB7XG4gICAgaGVpZ2h0ID0gREVGQVVMVF9DQU5WQVNfSEVJR0hUXG4gIH1cblxuICB0aGlzLnJlc2l6ZUNhbnZhcyh3aWR0aCwgaGVpZ2h0KVxuXG4gIHRoaXMuYmFja2dyb3VuZExheWVyLnJldmFsaWRhdGUoKVxuICB0aGlzLmltYWdlTGF5ZXIucmV2YWxpZGF0ZSgpXG4gIHRoaXMuc2VsZWN0aW9uTGF5ZXIucmV2YWxpZGF0ZSgpXG59XG5cbkNyb3AucHJvdG90eXBlLnBhaW50ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZyA9IHRoaXMuY29udGV4dFxuXG4gIGcuc2F2ZSgpXG4gIGcuc2NhbGUodGhpcy5yYXRpbywgdGhpcy5yYXRpbylcblxuICB0aGlzLmJhY2tncm91bmRMYXllci5wYWludCgpXG5cbiAgaWYgKHRoaXMuaW1hZ2UgJiYgdGhpcy5pbWFnZS5oYXNMb2FkZWQpIHtcbiAgICB0aGlzLmltYWdlTGF5ZXIucGFpbnQoKVxuICAgIHRoaXMuc2VsZWN0aW9uTGF5ZXIucGFpbnQoKVxuICB9XG5cbiAgZy5yZXN0b3JlKClcbn1cblxuQ3JvcC5wcm90b3R5cGUucmVzaXplQ2FudmFzID0gZnVuY3Rpb24gKHdpZHRoLCBoZWlnaHQpIHtcbiAgdmFyIGNvbnRleHQgPSB0aGlzLmNvbnRleHRcbiAgdmFyIGNhbnZhcyA9IHRoaXMuY2FudmFzXG4gIHRoaXMucmF0aW8gPSAxXG5cbiAgaWYgKCFjb250ZXh0LndlYmtpdEJhY2tpbmdTdG9yZVBpeGVsUmF0aW8pIHtcbiAgICB0aGlzLnJhdGlvID0gd2luZG93LmRldmljZVBpeGVsUmF0aW8gfHwgMVxuICB9XG5cbiAgdGhpcy53aWR0aCA9IHdpZHRoXG4gIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0XG5cbiAgY2FudmFzLndpZHRoID0gdGhpcy53aWR0aCAqIHRoaXMucmF0aW9cbiAgY2FudmFzLmhlaWdodCA9IHRoaXMuaGVpZ2h0ICogdGhpcy5yYXRpb1xufVxuXG5Dcm9wLnByb3RvdHlwZS5zZXRJbWFnZSA9IGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgdmFyIGltYWdlID0gSW1hZ2UuY3JlYXRlKHNvdXJjZSlcbiAgICAub24oXG4gICAgICAnbG9hZCcsXG4gICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuc2VsZWN0aW9uTGF5ZXIub25JbWFnZUxvYWQoKVxuICAgICAgICB0aGlzLnJldmFsaWRhdGVBbmRQYWludCgpXG4gICAgICB9LmJpbmQodGhpcylcbiAgICApXG4gICAgLm9uKFxuICAgICAgJ2Vycm9yJyxcbiAgICAgIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZSlcbiAgICAgIH1cbiAgICApXG5cbiAgdGhpcy5pbWFnZUxheWVyLnNldEltYWdlKGltYWdlKVxuICB0aGlzLmltYWdlID0gaW1hZ2VcbiAgdGhpcy5yZXZhbGlkYXRlQW5kUGFpbnQoKVxufVxuXG5Dcm9wLnByb3RvdHlwZS5nZXRJbWFnZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuaW1hZ2Vcbn1cblxuQ3JvcC5wcm90b3R5cGUuc2V0QXNwZWN0UmF0aW8gPSBmdW5jdGlvbiAoYXNwZWN0UmF0aW8pIHtcbiAgdGhpcy5zZWxlY3Rpb25MYXllci5zZXRBc3BlY3RSYXRpbyhhc3BlY3RSYXRpbylcbiAgdGhpcy5yZXZhbGlkYXRlQW5kUGFpbnQoKVxufVxuXG5Dcm9wLnByb3RvdHlwZS5zZXRCb3VuZHMgPSBmdW5jdGlvbiAob3B0cykge1xuICB0aGlzLmJvdW5kc09wdHMgPSBvcHRzXG4gIHRoaXMucmV2YWxpZGF0ZUFuZFBhaW50KClcbn1cblxuQ3JvcC5wcm90b3R5cGUuc2V0QmFja2dyb3VuZENvbG9ycyA9IGZ1bmN0aW9uIChjb2xvcnMpIHtcbiAgdGhpcy5iYWNrZ3JvdW5kTGF5ZXIuc2V0Q29sb3JzKGNvbG9ycylcbiAgdGhpcy5yZXZhbGlkYXRlQW5kUGFpbnQoKVxufVxuXG5Dcm9wLnByb3RvdHlwZS5kaXNwb3NlID0gbm9vcFxuXG5mdW5jdGlvbiBub29wICgpIHt9O1xuXG5mdW5jdGlvbiBpc1BlcmNlbnQgKHYpIHtcbiAgaWYgKHR5cGVvZiB2ICE9PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgaWYgKHYubGVuZ3RoIDwgMSkge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgaWYgKHZbdi5sZW5ndGggLSAxXSA9PT0gJyUnKSB7XG4gICAgcmV0dXJuIHRydWVcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRQZXJjZW50ICh2KSB7XG4gIGlmICghaXNQZXJjZW50KHYpKSB7XG4gICAgcmV0dXJuIDBcbiAgfVxuXG4gIHJldHVybiB2LnNsaWNlKDAsIC0xKVxufVxuXG5mdW5jdGlvbiBpc0F1dG8gKHYpIHtcbiAgcmV0dXJuIHYgPT09ICdhdXRvJ1xufVxuXG5mdW5jdGlvbiBpc0ludGVnZXIgKHYpIHtcbiAgcmV0dXJuIHR5cGVvZiB2ID09PSAnbnVtYmVyJyAmJiBNYXRoLnJvdW5kKHYpID09PSB2XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQ3JvcFxuIiwidmFyIGxvYWRlZCA9IHJlcXVpcmUoJy4vbG9hZEltYWdlLmpzJylcbnZhciBMaXN0ZW5lcnMgPSByZXF1aXJlKCcuL0xpc3RlbmVycy5qcycpXG5cbnZhciBJbWFnZSA9IGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgdGhpcy53aWR0aCA9IDBcbiAgdGhpcy5oZWlnaHQgPSAwXG5cbiAgdGhpcy5oYXNMb2FkZWQgPSBmYWxzZVxuICB0aGlzLnNyYyA9IG51bGxcblxuICB0aGlzLmxpc3RlbmVycyA9IExpc3RlbmVycy5jcmVhdGUoKVxuXG4gIGlmICghc291cmNlKSB7XG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAodHlwZW9mIHNvdXJjZSA9PT0gJ3N0cmluZycpIHtcbiAgICB0aGlzLnNyYyA9IHNvdXJjZVxuICAgIHZhciBpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKVxuICAgIGltZy5zcmMgPSB0aGlzLnNyY1xuICAgIHNvdXJjZSA9IGltZ1xuICB9IGVsc2Uge1xuICAgIHRoaXMuc3JjID0gc291cmNlLnNyY1xuICB9XG5cbiAgdGhpcy5zb3VyY2UgPSBzb3VyY2VcblxuICBsb2FkZWQoc291cmNlLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgaWYgKGVycikge1xuICAgICAgdGhpcy5ub3RpZnkoJ2Vycm9yJywgZXJyKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmhhc0xvYWRlZCA9IHRydWVcbiAgICAgIHRoaXMud2lkdGggPSBzb3VyY2UubmF0dXJhbFdpZHRoXG4gICAgICB0aGlzLmhlaWdodCA9IHNvdXJjZS5uYXR1cmFsSGVpZ2h0XG4gICAgICB0aGlzLm5vdGlmeSgnbG9hZCcsIHRoaXMpXG4gICAgfVxuICB9LmJpbmQodGhpcykpXG59XG5cbkltYWdlLmNyZWF0ZSA9IGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgcmV0dXJuIG5ldyBJbWFnZShzb3VyY2UpXG59XG5cbkltYWdlLnByb3RvdHlwZS5nZXRBc3BlY3RSYXRpbyA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKCF0aGlzLmhhc0xvYWRlZCkge1xuICAgIHJldHVybiAxXG4gIH1cblxuICByZXR1cm4gdGhpcy53aWR0aCAvIHRoaXMuaGVpZ2h0XG59XG5cbkltYWdlLnByb3RvdHlwZS5ub3RpZnkgPSBmdW5jdGlvbiAodHlwZSwgZGF0YSkge1xuICB2YXIgbGlzdGVuZXJzID0gdGhpcy5saXN0ZW5lcnNcbiAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgbGlzdGVuZXJzLm5vdGlmeSh0eXBlLCBkYXRhKVxuICB9LCAwKVxufVxuXG5JbWFnZS5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAodHlwZSwgZm4pIHtcbiAgdGhpcy5saXN0ZW5lcnMub24odHlwZSwgZm4pXG4gIHJldHVybiB0aGlzXG59XG5cbkltYWdlLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbiAodHlwZSwgZm4pIHtcbiAgdGhpcy5saXN0ZW5lcnMub2ZmKHR5cGUsIGZuKVxuICByZXR1cm4gdGhpc1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEltYWdlXG4iLCJ2YXIgUmVjdGFuZ2xlID0gcmVxdWlyZSgnLi9SZWN0YW5nbGUuanMnKVxuXG52YXIgSW1hZ2VMYXllciA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gIG9wdHMgPSBvcHRzIHx8IHt9XG4gIHRoaXMuYm91bmRzID0gUmVjdGFuZ2xlLmNyZWF0ZSgwLCAwLCAwLCAwKVxuICB0aGlzLmltYWdlID0gb3B0cy5pbWFnZSB8fCBudWxsXG4gIHRoaXMucGFyZW50ID0gb3B0cy5wYXJlbnRcbiAgdGhpcy5jb250ZXh0ID0gb3B0cy5jb250ZXh0XG59XG5cbkltYWdlTGF5ZXIuY3JlYXRlID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgcmV0dXJuIG5ldyBJbWFnZUxheWVyKG9wdHMpXG59XG5cbkltYWdlTGF5ZXIucHJvdG90eXBlLnNldEltYWdlID0gZnVuY3Rpb24gKGltYWdlKSB7XG4gIHRoaXMuaW1hZ2UgPSBpbWFnZVxufVxuXG5JbWFnZUxheWVyLnByb3RvdHlwZS5yZXZhbGlkYXRlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcGFyZW50ID0gdGhpcy5wYXJlbnRcbiAgdmFyIGltYWdlID0gdGhpcy5pbWFnZVxuICB2YXIgYm91bmRzID0gdGhpcy5ib3VuZHNcblxuICBpZiAoaW1hZ2UpIHtcbiAgICAvLyBDb25zdHJhaW5lZCBieSB3aWR0aCAob3RoZXJ3aXNlIGhlaWdodClcbiAgICBpZiAoaW1hZ2Uud2lkdGggLyBpbWFnZS5oZWlnaHQgPj0gcGFyZW50LndpZHRoIC8gcGFyZW50LmhlaWdodCkge1xuICAgICAgYm91bmRzLndpZHRoID0gcGFyZW50LndpZHRoXG4gICAgICBib3VuZHMuaGVpZ2h0ID0gTWF0aC5jZWlsKGltYWdlLmhlaWdodCAvIGltYWdlLndpZHRoICogcGFyZW50LndpZHRoKVxuICAgICAgYm91bmRzLnggPSAwXG4gICAgICBib3VuZHMueSA9IE1hdGguZmxvb3IoKHBhcmVudC5oZWlnaHQgLSBib3VuZHMuaGVpZ2h0KSAqIDAuNSlcbiAgICB9IGVsc2Uge1xuICAgICAgYm91bmRzLndpZHRoID0gTWF0aC5jZWlsKGltYWdlLndpZHRoIC8gaW1hZ2UuaGVpZ2h0ICogcGFyZW50LmhlaWdodClcbiAgICAgIGJvdW5kcy5oZWlnaHQgPSBwYXJlbnQuaGVpZ2h0XG4gICAgICBib3VuZHMueCA9IE1hdGguZmxvb3IoKHBhcmVudC53aWR0aCAtIGJvdW5kcy53aWR0aCkgKiAwLjUpXG4gICAgICBib3VuZHMueSA9IDBcbiAgICB9XG4gIH1cbn1cblxuSW1hZ2VMYXllci5wcm90b3R5cGUucGFpbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBnID0gdGhpcy5jb250ZXh0XG4gIHZhciBpbWFnZSA9IHRoaXMuaW1hZ2VcbiAgdmFyIGJvdW5kcyA9IHRoaXMuYm91bmRzXG5cbiAgaWYgKGltYWdlICYmIGltYWdlLmhhc0xvYWRlZCkge1xuICAgIGcuZHJhd0ltYWdlKFxuICAgICAgaW1hZ2Uuc291cmNlLFxuICAgICAgMCwgMCwgaW1hZ2Uud2lkdGgsIGltYWdlLmhlaWdodCxcbiAgICAgIGJvdW5kcy54LCBib3VuZHMueSwgYm91bmRzLndpZHRoLCBib3VuZHMuaGVpZ2h0XG4gICAgKVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gSW1hZ2VMYXllclxuIiwidmFyIExpc3RlbmVycyA9IHJlcXVpcmUoJy4vTGlzdGVuZXJzLmpzJylcblxudmFyIElucHV0ID0gZnVuY3Rpb24gKGRvbUVsZW1lbnQpIHtcbiAgdmFyIGxpc3RlbmVycyA9IExpc3RlbmVycy5jcmVhdGUoKVxuICB2YXIgZG93bkV2ZW50ID0gbnVsbFxuICB0aGlzLmxpc3RlbmVycyA9IGxpc3RlbmVyc1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZUV2ZW50Rm9yTW91c2UgKHNvdXJjZSkge1xuICAgIHZhciB4ID0gc291cmNlLm9mZnNldFhcbiAgICB2YXIgeSA9IHNvdXJjZS5vZmZzZXRZXG5cbiAgICByZXR1cm4ge1xuICAgICAgc291cmNlOiBzb3VyY2UsXG4gICAgICB4OiB4LFxuICAgICAgeTogeSxcbiAgICAgIGR4OiBkb3duRXZlbnQgPyB4IC0gZG93bkV2ZW50LnggOiAwLFxuICAgICAgZHk6IGRvd25FdmVudCA/IHkgLSBkb3duRXZlbnQueSA6IDAsXG4gICAgICB0eXBlOiAnTW91c2UnXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlRXZlbnRGb3JUb3VjaCAoc291cmNlKSB7XG4gICAgdmFyIGJvdW5kcyA9IHNvdXJjZS50YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KClcbiAgICB2YXIgdG91Y2ggPSBzb3VyY2UudG91Y2hlcy5sZW5ndGggPiAwID8gc291cmNlLnRvdWNoZXNbMF0gOiBzb3VyY2UuY2hhbmdlZFRvdWNoZXNbMF1cblxuICAgIHZhciB4ID0gdG91Y2guY2xpZW50WCAtIGJvdW5kcy5sZWZ0XG4gICAgdmFyIHkgPSB0b3VjaC5jbGllbnRZIC0gYm91bmRzLnRvcFxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHNvdXJjZTogc291cmNlLFxuICAgICAgeDogeCxcbiAgICAgIHk6IHksXG4gICAgICBkeDogZG93bkV2ZW50ID8geCAtIGRvd25FdmVudC54IDogMCxcbiAgICAgIGR5OiBkb3duRXZlbnQgPyB5IC0gZG93bkV2ZW50LnkgOiAwLFxuICAgICAgdHlwZTogJ1RvdWNoJ1xuICAgIH1cbiAgfVxuXG4gIGRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgZnVuY3Rpb24gKHNvdXJjZSkge1xuICAgIGRvd25FdmVudCA9IGNyZWF0ZUV2ZW50Rm9yTW91c2Uoc291cmNlKVxuICAgIGxpc3RlbmVycy5ub3RpZnkoJ2Rvd24nLCBkb3duRXZlbnQpXG4gIH0pXG5cbiAgZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgZnVuY3Rpb24gKHNvdXJjZSkge1xuICAgIGRvd25FdmVudCA9IGNyZWF0ZUV2ZW50Rm9yVG91Y2goc291cmNlKVxuICAgIGxpc3RlbmVycy5ub3RpZnkoJ2Rvd24nLCBkb3duRXZlbnQpXG4gIH0pXG5cbiAgZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgbGlzdGVuZXJzLm5vdGlmeSgnbW92ZScsIGNyZWF0ZUV2ZW50Rm9yTW91c2Uoc291cmNlKSlcbiAgfSlcblxuICBkb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICBsaXN0ZW5lcnMubm90aWZ5KCdtb3ZlJywgY3JlYXRlRXZlbnRGb3JUb3VjaChzb3VyY2UpKVxuICB9KVxuXG4gIGRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICBsaXN0ZW5lcnMubm90aWZ5KCd1cCcsIGNyZWF0ZUV2ZW50Rm9yTW91c2Uoc291cmNlKSlcbiAgfSlcblxuICBkb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgZnVuY3Rpb24gKHNvdXJjZSkge1xuICAgIGxpc3RlbmVycy5ub3RpZnkoJ3VwJywgY3JlYXRlRXZlbnRGb3JUb3VjaChzb3VyY2UpKVxuICAgIGRvd25FdmVudCA9IG51bGxcbiAgfSlcblxuICBkb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlb3V0JywgZnVuY3Rpb24gKHNvdXJjZSkge1xuICAgIGxpc3RlbmVycy5ub3RpZnkoJ2NhbmNlbCcsIGNyZWF0ZUV2ZW50Rm9yTW91c2Uoc291cmNlKSlcbiAgICBkb3duRXZlbnQgPSBudWxsXG4gIH0pXG5cbiAgZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGNhbmNlbCcsIGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICBsaXN0ZW5lcnMubm90aWZ5KCdjYW5jZWwnLCBjcmVhdGVFdmVudEZvclRvdWNoKHNvdXJjZSkpXG4gICAgZG93bkV2ZW50ID0gbnVsbFxuICB9KVxufVxuXG5JbnB1dC5jcmVhdGUgPSBmdW5jdGlvbiAoZG9tRWxlbWVudCkge1xuICByZXR1cm4gbmV3IElucHV0KGRvbUVsZW1lbnQpXG59XG5cbklucHV0LnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuICB0aGlzLmxpc3RlbmVycy5vbih0eXBlLCBmbilcbiAgcmV0dXJuIHRoaXNcbn1cblxuSW5wdXQucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuICB0aGlzLmxpc3RlbmVycy5vZmYodHlwZSwgZm4pXG4gIHJldHVybiB0aGlzXG59XG5cbm1vZHVsZS5leHBvcnRzID0gSW5wdXRcbiIsInZhciBMaXN0ZW5lcnMgPSBmdW5jdGlvbiAob3B0cykge1xuICB0aGlzLmV2ZW50cyA9IHt9XG59XG5cbkxpc3RlbmVycy5jcmVhdGUgPSBmdW5jdGlvbiAob3B0cykge1xuICByZXR1cm4gbmV3IExpc3RlbmVycyhvcHRzKVxufVxuXG5MaXN0ZW5lcnMucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gIGlmICghdGhpcy5ldmVudHNbdHlwZV0pIHtcbiAgICB0aGlzLmV2ZW50c1t0eXBlXSA9IFtdXG4gIH1cblxuICBpZiAodGhpcy5ldmVudHNbdHlwZV0uaW5kZXhPZihmbikgPT09IC0xKSB7XG4gICAgdGhpcy5ldmVudHNbdHlwZV0ucHVzaChmbilcbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbkxpc3RlbmVycy5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gIGlmICh0aGlzLmV2ZW50c1t0eXBlXSkge1xuICAgIHZhciBpID0gdGhpcy5ldmVudHNbdHlwZV0uaW5kZXhPZihmbilcbiAgICBpZiAoaSAhPT0gLTEpIHtcbiAgICAgIHRoaXMuZXZlbnRzW3R5cGVdLnNwbGljZShpLCAxKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzXG59XG5cbkxpc3RlbmVycy5wcm90b3R5cGUubm90aWZ5ID0gZnVuY3Rpb24gKHR5cGUsIGRhdGEpIHtcbiAgaWYgKHRoaXMuZXZlbnRzW3R5cGVdKSB7XG4gICAgdGhpcy5ldmVudHNbdHlwZV0uZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgIGZuLmNhbGwodGhpcywgZGF0YSlcbiAgICB9LmJpbmQodGhpcykpXG4gIH1cbn1cblxuTGlzdGVuZXJzLnByb3RvdHlwZS5jbGVhckFsbCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5ldmVudHMgPSB7fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IExpc3RlbmVyc1xuIiwidmFyIFJlY3RhbmdsZSA9IGZ1bmN0aW9uICh4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gIHRoaXMuX3ggPSB4XG4gIHRoaXMuX3kgPSB5XG4gIHRoaXMuX3dpZHRoID0gd2lkdGhcbiAgdGhpcy5faGVpZ2h0ID0gaGVpZ2h0XG59XG5cblJlY3RhbmdsZS5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uIChjb3B5KSB7XG4gIHRoaXMuX3ggPSBjb3B5LnhcbiAgdGhpcy5feSA9IGNvcHkueVxuICB0aGlzLl93aWR0aCA9IGNvcHkud2lkdGhcbiAgdGhpcy5faGVpZ2h0ID0gY29weS5oZWlnaHRcbiAgcmV0dXJuIHRoaXNcbn1cblxuUmVjdGFuZ2xlLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIFJlY3RhbmdsZS5jcmVhdGUodGhpcy5feCwgdGhpcy5feSwgdGhpcy5fd2lkdGgsIHRoaXMuX2hlaWdodClcbn1cblxuUmVjdGFuZ2xlLnByb3RvdHlwZS5yb3VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGR4ID0gdGhpcy5feFxuICB2YXIgZHkgPSB0aGlzLl95XG4gIHRoaXMuX3ggPSBNYXRoLnJvdW5kKGR4KVxuICB0aGlzLl95ID0gTWF0aC5yb3VuZChkeSlcbiAgZHggLT0gdGhpcy5feFxuICBkeSAtPSB0aGlzLl95XG4gIHRoaXMuX3dpZHRoID0gTWF0aC5yb3VuZCh0aGlzLl93aWR0aCArIGR4KVxuICB0aGlzLl9oZWlnaHQgPSBNYXRoLnJvdW5kKHRoaXMuX2hlaWdodCArIGR5KVxuICByZXR1cm4gdGhpc1xufVxuXG5SZWN0YW5nbGUucHJvdG90eXBlLmlzSW5zaWRlID0gZnVuY3Rpb24gKHBvaW50KSB7XG4gIHJldHVybiBwb2ludC54ID49IHRoaXMubGVmdCAmJlxuICAgIHBvaW50LnkgPj0gdGhpcy50b3AgJiZcbiAgICBwb2ludC54IDwgdGhpcy5yaWdodCAmJlxuICAgIHBvaW50LnkgPCB0aGlzLmJvdHRvbVxufVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhSZWN0YW5nbGUucHJvdG90eXBlLCB7XG4gIHg6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3ggfSxcbiAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuX3ggPSB2IH1cbiAgfSxcbiAgeToge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5feSB9LFxuICAgIHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5feSA9IHYgfVxuICB9LFxuICBjZW50ZXJYOiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl94ICsgdGhpcy5fd2lkdGggKiAwLjUgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuX3ggPSB2IC0gdGhpcy5fd2lkdGggKiAwLjUgfVxuICB9LFxuICBjZW50ZXJZOiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl95ICsgdGhpcy5faGVpZ2h0ICogMC41IH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLl95ID0gdiAtIHRoaXMuX2hlaWdodCAqIDAuNSB9XG4gIH0sXG4gIHdpZHRoOiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl93aWR0aCB9LFxuICAgIHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5fd2lkdGggPSB2IH1cbiAgfSxcbiAgaGVpZ2h0OiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl9oZWlnaHQgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuX2hlaWdodCA9IHYgfVxuICB9LFxuICBsZWZ0OiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl94IH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodikge1xuICAgICAgdGhpcy5fd2lkdGggPSB0aGlzLl94ICsgdGhpcy5fd2lkdGggLSB2XG4gICAgICB0aGlzLl94ID0gdlxuICAgIH1cbiAgfSxcbiAgdG9wOiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl95IH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodikge1xuICAgICAgdGhpcy5faGVpZ2h0ID0gdGhpcy5feSArIHRoaXMuX2hlaWdodCAtIHZcbiAgICAgIHRoaXMuX3kgPSB2XG4gICAgfVxuICB9LFxuICByaWdodDoge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5feCArIHRoaXMuX3dpZHRoIH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodikge1xuICAgICAgdGhpcy5fd2lkdGggPSB2IC0gdGhpcy5feFxuICAgIH1cbiAgfSxcbiAgYm90dG9tOiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl95ICsgdGhpcy5faGVpZ2h0IH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodikge1xuICAgICAgdGhpcy5faGVpZ2h0ID0gdiAtIHRoaXMuX3lcbiAgICB9XG4gIH0sXG4gIGFzcGVjdFJhdGlvOiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl93aWR0aCAvIHRoaXMuX2hlaWdodCB9XG4gIH1cbn0pXG5cblJlY3RhbmdsZS5jcmVhdGUgPSBmdW5jdGlvbiAoeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICByZXR1cm4gbmV3IFJlY3RhbmdsZSh4LCB5LCB3aWR0aCwgaGVpZ2h0KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFJlY3RhbmdsZVxuIiwidmFyIFJlY3RhbmdsZSA9IHJlcXVpcmUoJy4vUmVjdGFuZ2xlLmpzJylcblxudmFyIFNlbGVjdGlvbiA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gIHRoaXMudGFyZ2V0ID0gb3B0cy50YXJnZXQgfHwgbnVsbFxuICB0aGlzLmJvdW5kcyA9IFJlY3RhbmdsZS5jcmVhdGUoMCwgMCwgMCwgMClcbiAgdGhpcy5ib3VuZHNQeCA9IFJlY3RhbmdsZS5jcmVhdGUoMCwgMCwgMCwgMClcbiAgdGhpcy5yZWdpb24gPSBSZWN0YW5nbGUuY3JlYXRlKDAsIDAsIDAsIDApXG5cbiAgdGhpcy5pbml0aWFsT3B0cyA9IHtcbiAgICB4OiBvcHRzLngsXG4gICAgeTogb3B0cy55LFxuICAgIHdpZHRoOiBvcHRzLndpZHRoLFxuICAgIGhlaWdodDogb3B0cy5oZWlnaHRcbiAgfVxuXG4gIHRoaXMuYXNwZWN0UmF0aW8gPSBvcHRzLmFzcGVjdFJhdGlvXG4gIHRoaXMubWluV2lkdGggPSBvcHRzLm1pbldpZHRoICE9PSB1bmRlZmluZWQgPyBvcHRzLm1pbldpZHRoIDogMTAwXG4gIHRoaXMubWluSGVpZ2h0ID0gb3B0cy5taW5IZWlnaHQgIT09IHVuZGVmaW5lZCA/IG9wdHMubWluSGVpZ2h0IDogMTAwXG5cbiAgdGhpcy5ib3VuZHNNaW5XaWR0aCA9IDBcbiAgdGhpcy5ib3VuZHNNaW5IZWlnaHQgPSAwXG5cbiAgdGhpcy5fZGVsdGEgPSB7eDogMCwgaDogMH1cbn1cblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoU2VsZWN0aW9uLnByb3RvdHlwZSwge1xuICB4OiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLmJvdW5kcy54IH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLmJvdW5kcy54ID0gdiB9XG4gIH0sXG4gIHk6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuYm91bmRzLnkgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuYm91bmRzLnkgPSB2IH1cbiAgfSxcbiAgd2lkdGg6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuYm91bmRzLndpZHRoIH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLmJvdW5kcy53aWR0aCA9IHYgfVxuICB9LFxuICBoZWlnaHQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuYm91bmRzLmhlaWdodCB9LFxuICAgIHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5ib3VuZHMuaGVpZ2h0ID0gdiB9XG4gIH0sXG4gIGxlZnQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuYm91bmRzLnggfSxcbiAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7XG4gICAgICB0aGlzLmJvdW5kcy5sZWZ0ID0gdlxuICAgIH1cbiAgfSxcbiAgdG9wOiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLmJvdW5kcy55IH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLmJvdW5kcy50b3AgPSB2IH1cbiAgfSxcbiAgcmlnaHQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuYm91bmRzLnJpZ2h0IH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLmJvdW5kcy5yaWdodCA9IHYgfVxuICB9LFxuICBib3R0b206IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuYm91bmRzLmJvdHRvbSB9LFxuICAgIHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5ib3VuZHMuYm90dG9tID0gdiB9XG4gIH1cbn0pXG5cblNlbGVjdGlvbi5wcm90b3R5cGUuZ2V0Qm91bmRzTGVuZ3RoRm9yUmVnaW9uID0gZnVuY3Rpb24gKHJlZ2lvbkxlbikge1xuICByZXR1cm4gcmVnaW9uTGVuIC8gdGhpcy5yZWdpb24ud2lkdGggKiB0aGlzLndpZHRoXG59XG5cblNlbGVjdGlvbi5wcm90b3R5cGUubW92ZUJ5ID0gZnVuY3Rpb24gKGR4LCBkeSkge1xuICB2YXIgYm91bmRzID0gdGhpcy5ib3VuZHNcbiAgdmFyIHRhcmdldCA9IHRoaXMudGFyZ2V0XG5cbiAgYm91bmRzLnggPSBNYXRoLm1pbihNYXRoLm1heChib3VuZHMueCArIGR4LCB0YXJnZXQuYm91bmRzLngpLCB0YXJnZXQuYm91bmRzLnggKyB0YXJnZXQuYm91bmRzLndpZHRoIC0gYm91bmRzLndpZHRoKVxuICBib3VuZHMueSA9IE1hdGgubWluKE1hdGgubWF4KGJvdW5kcy55ICsgZHksIHRhcmdldC5ib3VuZHMueSksIHRhcmdldC5ib3VuZHMueSArIHRhcmdldC5ib3VuZHMuaGVpZ2h0IC0gYm91bmRzLmhlaWdodClcblxuICByZXR1cm4gdGhpcy51cGRhdGVSZWdpb25Gcm9tQm91bmRzKClcbn1cblxuU2VsZWN0aW9uLnByb3RvdHlwZS5yZXNpemVCeSA9IGZ1bmN0aW9uIChkeCwgZHksIHApIHtcbiAgdmFyIGRlbHRhID0gdGhpcy5fZGVsdGFcbiAgdmFyIGFzcGVjdFJhdGlvID0gdGhpcy5hc3BlY3RSYXRpb1xuICB2YXIgYm91bmRzID0gdGhpcy5ib3VuZHNcbiAgdmFyIGJvdW5kc01pbldpZHRoID0gdGhpcy5ib3VuZHNNaW5XaWR0aFxuICB2YXIgYm91bmRzTWluSGVpZ2h0ID0gdGhpcy5ib3VuZHNNaW5IZWlnaHRcbiAgdmFyIHRhcmdldCA9IHRoaXMudGFyZ2V0XG5cbiAgZnVuY3Rpb24gY2FsY3VsYXRlRGVsdGEgKHgsIHkpIHtcbiAgICBkZWx0YS53aWR0aCA9IGJvdW5kcy53aWR0aCArIHhcbiAgICBkZWx0YS5oZWlnaHQgPSBib3VuZHMuaGVpZ2h0ICsgeVxuXG4gICAgZGVsdGEud2lkdGggPSBNYXRoLm1heChib3VuZHNNaW5XaWR0aCwgZGVsdGEud2lkdGgpXG4gICAgZGVsdGEuaGVpZ2h0ID0gTWF0aC5tYXgoYm91bmRzTWluSGVpZ2h0LCBkZWx0YS5oZWlnaHQpXG5cbiAgICBpZiAoYXNwZWN0UmF0aW8pIHtcbiAgICAgIGlmIChkZWx0YS53aWR0aCAvIGRlbHRhLmhlaWdodCA+IGFzcGVjdFJhdGlvKSB7XG4gICAgICAgIGRlbHRhLndpZHRoID0gZGVsdGEuaGVpZ2h0ICogYXNwZWN0UmF0aW9cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbHRhLmhlaWdodCA9IGRlbHRhLndpZHRoIC8gYXNwZWN0UmF0aW9cbiAgICAgIH1cbiAgICB9XG5cbiAgICBkZWx0YS53aWR0aCAtPSBib3VuZHMud2lkdGhcbiAgICBkZWx0YS5oZWlnaHQgLT0gYm91bmRzLmhlaWdodFxuXG4gICAgcmV0dXJuIGRlbHRhXG4gIH1cblxuICBpZiAocFswXSA9PT0gJ24nKSB7XG4gICAgZHkgPSBNYXRoLm1pbihkeSwgdGhpcy50b3AgLSB0YXJnZXQuYm91bmRzLnRvcClcbiAgfSBlbHNlIGlmIChwWzBdID09PSAncycpIHtcbiAgICBkeSA9IE1hdGgubWluKGR5LCB0YXJnZXQuYm91bmRzLmJvdHRvbSAtIHRoaXMuYm90dG9tKVxuICB9XG5cbiAgaWYgKHBbMV0gPT09ICd3Jykge1xuICAgIGR4ID0gTWF0aC5taW4oZHgsIHRoaXMubGVmdCAtIHRhcmdldC5ib3VuZHMubGVmdClcbiAgfSBlbHNlIGlmIChwWzFdID09PSAnZScpIHtcbiAgICBkeCA9IE1hdGgubWluKGR4LCB0YXJnZXQuYm91bmRzLnJpZ2h0IC0gdGhpcy5yaWdodClcbiAgfVxuXG4gIGRlbHRhID0gY2FsY3VsYXRlRGVsdGEoZHgsIGR5KVxuXG4gIHN3aXRjaCAocCkge1xuICAgIGNhc2UgJ253JzpcbiAgICAgIHRoaXMubGVmdCAtPSBkZWx0YS53aWR0aFxuICAgICAgdGhpcy50b3AgLT0gZGVsdGEuaGVpZ2h0XG4gICAgICBicmVha1xuICAgIGNhc2UgJ25lJzpcbiAgICAgIHRoaXMucmlnaHQgKz0gZGVsdGEud2lkdGhcbiAgICAgIHRoaXMudG9wIC09IGRlbHRhLmhlaWdodFxuICAgICAgYnJlYWtcbiAgICBjYXNlICdzdyc6XG4gICAgICB0aGlzLmxlZnQgLT0gZGVsdGEud2lkdGhcbiAgICAgIHRoaXMuYm90dG9tICs9IGRlbHRhLmhlaWdodFxuICAgICAgYnJlYWtcbiAgICBjYXNlICdzZSc6XG4gICAgICB0aGlzLnJpZ2h0ICs9IGRlbHRhLndpZHRoXG4gICAgICB0aGlzLmJvdHRvbSArPSBkZWx0YS5oZWlnaHRcbiAgICAgIGJyZWFrXG4gIH1cblxuICByZXR1cm4gdGhpcy51cGRhdGVSZWdpb25Gcm9tQm91bmRzKClcbn1cblxuU2VsZWN0aW9uLnByb3RvdHlwZS5hdXRvU2l6ZVJlZ2lvbiA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHRhcmdldCA9IHRoaXMudGFyZ2V0XG4gIHZhciByZWdpb24gPSB0aGlzLnJlZ2lvblxuICB2YXIgYXNwZWN0UmF0aW8gPSB0aGlzLmFzcGVjdFJhdGlvXG4gIHZhciBpbml0aWFsT3B0cyA9IHRoaXMuaW5pdGlhbE9wdHNcbiAgdmFyIGJlZm9yZVggPSByZWdpb24ueFxuICB2YXIgYmVmb3JlWSA9IHJlZ2lvbi55XG4gIHZhciBiZWZvcmVXaWR0aCA9IHJlZ2lvbi53aWR0aFxuICB2YXIgYmVmb3JlSGVpZ2h0ID0gcmVnaW9uLmhlaWdodFxuXG4gIHJlZ2lvbi54ID0gaW5pdGlhbE9wdHMueCAhPT0gdW5kZWZpbmVkID8gaW5pdGlhbE9wdHMueCA6IDBcbiAgcmVnaW9uLnkgPSBpbml0aWFsT3B0cy55ICE9PSB1bmRlZmluZWQgPyBpbml0aWFsT3B0cy55IDogMFxuXG4gIHJlZ2lvbi53aWR0aCA9IGluaXRpYWxPcHRzLndpZHRoICE9PSB1bmRlZmluZWQgPyBpbml0aWFsT3B0cy53aWR0aCA6IHRhcmdldC5pbWFnZS53aWR0aFxuICByZWdpb24uaGVpZ2h0ID0gaW5pdGlhbE9wdHMuaGVpZ2h0ICE9PSB1bmRlZmluZWQgPyBpbml0aWFsT3B0cy5oZWlnaHQgOiB0YXJnZXQuaW1hZ2UuaGVpZ2h0XG5cbiAgaWYgKGFzcGVjdFJhdGlvKSB7XG4gICAgaWYgKHJlZ2lvbi53aWR0aCAvIHJlZ2lvbi5oZWlnaHQgPiBhc3BlY3RSYXRpbykge1xuICAgICAgcmVnaW9uLndpZHRoID0gcmVnaW9uLmhlaWdodCAqIGFzcGVjdFJhdGlvXG4gICAgfSBlbHNlIHtcbiAgICAgIHJlZ2lvbi5oZWlnaHQgPSByZWdpb24ud2lkdGggLyBhc3BlY3RSYXRpb1xuICAgIH1cbiAgfVxuXG4gIGlmIChpbml0aWFsT3B0cy54ID09PSB1bmRlZmluZWQpIHtcbiAgICByZWdpb24uY2VudGVyWCA9IHRhcmdldC5pbWFnZS53aWR0aCAqIDAuNVxuICB9XG5cbiAgaWYgKGluaXRpYWxPcHRzLnkgPT09IHVuZGVmaW5lZCkge1xuICAgIHJlZ2lvbi5jZW50ZXJZID0gdGFyZ2V0LmltYWdlLmhlaWdodCAqIDAuNVxuICB9XG5cbiAgcmVnaW9uLnJvdW5kKClcblxuICB0aGlzLnVwZGF0ZUJvdW5kc0Zyb21SZWdpb24oKVxuXG4gIHJldHVybiByZWdpb24ueCAhPT0gYmVmb3JlWCB8fFxuICAgIHJlZ2lvbi55ICE9PSBiZWZvcmVZIHx8XG4gICAgcmVnaW9uLndpZHRoICE9PSBiZWZvcmVXaWR0aCB8fFxuICAgIHJlZ2lvbi5oZWlnaHQgIT09IGJlZm9yZUhlaWdodFxufVxuXG5TZWxlY3Rpb24ucHJvdG90eXBlLnVwZGF0ZVJlZ2lvbkZyb21Cb3VuZHMgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciB0YXJnZXQgPSB0aGlzLnRhcmdldFxuICB2YXIgcmVnaW9uID0gdGhpcy5yZWdpb25cbiAgdmFyIGJvdW5kcyA9IHRoaXMuYm91bmRzXG4gIHZhciBiZWZvcmVYID0gcmVnaW9uLnhcbiAgdmFyIGJlZm9yZVkgPSByZWdpb24ueVxuICB2YXIgYmVmb3JlV2lkdGggPSByZWdpb24ud2lkdGhcbiAgdmFyIGJlZm9yZUhlaWdodCA9IHJlZ2lvbi5oZWlnaHRcblxuICByZWdpb24ueCA9IHRhcmdldC5pbWFnZS53aWR0aCAqIChib3VuZHMueCAtIHRhcmdldC5ib3VuZHMueCkgLyB0YXJnZXQuYm91bmRzLndpZHRoXG4gIHJlZ2lvbi55ID0gdGFyZ2V0LmltYWdlLmhlaWdodCAqIChib3VuZHMueSAtIHRhcmdldC5ib3VuZHMueSkgLyB0YXJnZXQuYm91bmRzLmhlaWdodFxuXG4gIHJlZ2lvbi53aWR0aCA9IHRhcmdldC5pbWFnZS53aWR0aCAqIChib3VuZHMud2lkdGggLyB0YXJnZXQuYm91bmRzLndpZHRoKVxuICByZWdpb24uaGVpZ2h0ID0gdGFyZ2V0LmltYWdlLmhlaWdodCAqIChib3VuZHMuaGVpZ2h0IC8gdGFyZ2V0LmJvdW5kcy5oZWlnaHQpXG5cbiAgcmVnaW9uLnJvdW5kKClcblxuICByZXR1cm4gcmVnaW9uLnggIT09IGJlZm9yZVggfHxcbiAgICByZWdpb24ueSAhPT0gYmVmb3JlWSB8fFxuICAgIHJlZ2lvbi53aWR0aCAhPT0gYmVmb3JlV2lkdGggfHxcbiAgICByZWdpb24uaGVpZ2h0ICE9PSBiZWZvcmVIZWlnaHRcbn1cblxuU2VsZWN0aW9uLnByb3RvdHlwZS51cGRhdGVCb3VuZHNGcm9tUmVnaW9uID0gZnVuY3Rpb24gKCkge1xuICB2YXIgdGFyZ2V0ID0gdGhpcy50YXJnZXRcbiAgdmFyIHJlZ2lvbiA9IHRoaXMucmVnaW9uXG4gIHZhciBib3VuZHMgPSB0aGlzLmJvdW5kc1xuXG4gIGlmICh0YXJnZXQuaW1hZ2UpIHtcbiAgICBib3VuZHMueCA9IHRhcmdldC5ib3VuZHMueCArIHRhcmdldC5ib3VuZHMud2lkdGggKiAocmVnaW9uLnggLyB0YXJnZXQuaW1hZ2Uud2lkdGgpXG4gICAgYm91bmRzLnkgPSB0YXJnZXQuYm91bmRzLnkgKyB0YXJnZXQuYm91bmRzLmhlaWdodCAqIChyZWdpb24ueSAvIHRhcmdldC5pbWFnZS5oZWlnaHQpXG4gICAgYm91bmRzLndpZHRoID0gdGFyZ2V0LmJvdW5kcy53aWR0aCAqIChyZWdpb24ud2lkdGggLyB0YXJnZXQuaW1hZ2Uud2lkdGgpXG4gICAgYm91bmRzLmhlaWdodCA9IHRhcmdldC5ib3VuZHMuaGVpZ2h0ICogKHJlZ2lvbi5oZWlnaHQgLyB0YXJnZXQuaW1hZ2UuaGVpZ2h0KVxuICB9XG5cbiAgdGhpcy5ib3VuZHNNaW5XaWR0aCA9IHRoaXMuZ2V0Qm91bmRzTGVuZ3RoRm9yUmVnaW9uKHRoaXMubWluV2lkdGgpXG4gIHRoaXMuYm91bmRzTWluSGVpZ2h0ID0gdGhpcy5nZXRCb3VuZHNMZW5ndGhGb3JSZWdpb24odGhpcy5taW5IZWlnaHQpXG59XG5cblNlbGVjdGlvbi5wcm90b3R5cGUuaXNJbnNpZGUgPSBmdW5jdGlvbiAocG9pbnQpIHtcbiAgcmV0dXJuIHRoaXMuYm91bmRzLmlzSW5zaWRlKHBvaW50KVxufVxuXG5TZWxlY3Rpb24uY3JlYXRlID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb24ob3B0cylcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3Rpb25cbiIsInZhciBJbnB1dCA9IHJlcXVpcmUoJy4vSW5wdXQuanMnKVxudmFyIExpc3RlbmVycyA9IHJlcXVpcmUoJy4vTGlzdGVuZXJzLmpzJylcbnZhciBTZWxlY3Rpb24gPSByZXF1aXJlKCcuL1NlbGVjdGlvbi5qcycpXG52YXIgUmVjdGFuZ2xlID0gcmVxdWlyZSgnLi9SZWN0YW5nbGUuanMnKVxuXG52YXIgU2VsZWN0aW9uTGF5ZXIgPSBmdW5jdGlvbiAob3B0cykge1xuICBvcHRzID0gb3B0cyB8fCB7fVxuXG4gIHRoaXMuc2VsZWN0aW9uID0gU2VsZWN0aW9uLmNyZWF0ZShvcHRzKVxuXG4gIHRoaXMucGFyZW50ID0gb3B0cy5wYXJlbnRcbiAgdGhpcy5jb250ZXh0ID0gb3B0cy5jb250ZXh0XG4gIHRoaXMuY29udGV4dC5zZXRMaW5lRGFzaCA9IHRoaXMuY29udGV4dC5zZXRMaW5lRGFzaCB8fCBmdW5jdGlvbiAoKSB7fVxuICB0aGlzLnRhcmdldCA9IG9wdHMudGFyZ2V0XG5cbiAgdmFyIGhhbmRsZU9wdHMgPSBvcHRzLmhhbmRsZSB8fCB7fVxuICBoYW5kbGVPcHRzLmxlbmd0aCA9IGhhbmRsZU9wdHMuaGFuZGxlTGVuZ3RoIHx8IDMyXG4gIGhhbmRsZU9wdHMuZGVwdGggPSBoYW5kbGVPcHRzLmRlcHRoIHx8IDNcbiAgaGFuZGxlT3B0cy5zaXplID0gaGFuZGxlT3B0cy5zaXplIHx8IGhhbmRsZU9wdHMubGVuZ3RoICogMlxuICBoYW5kbGVPcHRzLmNvbG9yID0gaGFuZGxlT3B0cy5jb2xvciB8fCAncmdiYSgyNTUsIDI1NSwgMjU1LCAxLjApJ1xuICBoYW5kbGVPcHRzLmFjdGl2ZUNvbG9yID0gaGFuZGxlT3B0cy5hY3RpdmVDb2xvciB8fCAncmdiYSgyNTUsIDAsIDE2MCwgMS4wKSdcbiAgdGhpcy5oYW5kbGVPcHRzID0gaGFuZGxlT3B0c1xuXG4gIHRoaXMubGlzdGVuZXJzID0gTGlzdGVuZXJzLmNyZWF0ZSgpXG5cbiAgdGhpcy5pbnB1dCA9IElucHV0LmNyZWF0ZSh0aGlzLnBhcmVudC5jYW52YXMpXG5cbiAgdGhpcy5hY3RpdmVSZWdpb24gPSBudWxsXG4gIHRoaXMuZG93bkJvdW5kcyA9IFJlY3RhbmdsZS5jcmVhdGUoMCwgMCwgMCwgMClcblxuICB0aGlzLmlucHV0Lm9uKCdkb3duJywgdGhpcy5vbklucHV0RG93bi5iaW5kKHRoaXMpKVxuICB0aGlzLmlucHV0Lm9uKCdtb3ZlJywgdGhpcy5vbklucHV0TW92ZS5iaW5kKHRoaXMpKVxuICB0aGlzLmlucHV0XG4gICAgLm9uKCd1cCcsIHRoaXMub25JbnB1dFVwT3JDYW5jZWwuYmluZCh0aGlzKSlcbiAgICAub24oJ2NhbmNlbCcsIHRoaXMub25JbnB1dFVwT3JDYW5jZWwuYmluZCh0aGlzKSlcbn1cblxuU2VsZWN0aW9uTGF5ZXIuY3JlYXRlID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgcmV0dXJuIG5ldyBTZWxlY3Rpb25MYXllcihvcHRzKVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUub25JbnB1dERvd24gPSBmdW5jdGlvbiAoZSkge1xuICB2YXIgaGl0UmVnaW9uID0gdGhpcy5maW5kSGl0UmVnaW9uKGUpXG5cbiAgaWYgKGhpdFJlZ2lvbikge1xuICAgIGUuc291cmNlLnByZXZlbnREZWZhdWx0KClcbiAgICB0aGlzLmFjdGl2ZVJlZ2lvbiA9IGhpdFJlZ2lvblxuICAgIHRoaXMuc2V0Q3Vyc29yKGhpdFJlZ2lvbilcbiAgICB0aGlzLmRvd25Cb3VuZHMuY29weSh0aGlzLnNlbGVjdGlvbi5ib3VuZHMpXG4gICAgdGhpcy5saXN0ZW5lcnMubm90aWZ5KCdzdGFydCcsIHRoaXMuc2VsZWN0aW9uLnJlZ2lvbilcbiAgfVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUub25JbnB1dE1vdmUgPSBmdW5jdGlvbiAoZSkge1xuICB2YXIgYWN0aXZlUmVnaW9uID0gdGhpcy5hY3RpdmVSZWdpb25cblxuICBpZiAoIWFjdGl2ZVJlZ2lvbikge1xuICAgIHZhciBoaXRSZWdpb24gPSB0aGlzLmZpbmRIaXRSZWdpb24oZSlcbiAgICBpZiAoaGl0UmVnaW9uKSB7XG4gICAgICBlLnNvdXJjZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICB0aGlzLnNldEN1cnNvcihoaXRSZWdpb24pXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucmVzZXRDdXJzb3IoKVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBlLnNvdXJjZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICB2YXIgc2VsZWN0aW9uID0gdGhpcy5zZWxlY3Rpb25cbiAgICB2YXIgaGFzQ2hhbmdlZCA9IGZhbHNlXG4gICAgc2VsZWN0aW9uLmJvdW5kcy5jb3B5KHRoaXMuZG93bkJvdW5kcylcblxuICAgIGlmIChhY3RpdmVSZWdpb24gPT09ICdtb3ZlJykge1xuICAgICAgaGFzQ2hhbmdlZCA9IHNlbGVjdGlvbi5tb3ZlQnkoZS5keCwgZS5keSlcbiAgICAgIGlmIChoYXNDaGFuZ2VkKSB7XG4gICAgICAgIHRoaXMubGlzdGVuZXJzLm5vdGlmeSgnbW92ZScsIHRoaXMuc2VsZWN0aW9uLnJlZ2lvbilcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGRpciA9IGFjdGl2ZVJlZ2lvbi5zdWJzdHJpbmcoMCwgMilcbiAgICAgIHZhciBkeCA9IGRpclsxXSA9PT0gJ3cnID8gLWUuZHggOiBlLmR4XG4gICAgICB2YXIgZHkgPSBkaXJbMF0gPT09ICduJyA/IC1lLmR5IDogZS5keVxuICAgICAgaGFzQ2hhbmdlZCA9IHNlbGVjdGlvbi5yZXNpemVCeShkeCwgZHksIGRpcilcbiAgICAgIGlmIChoYXNDaGFuZ2VkKSB7XG4gICAgICAgIHRoaXMubGlzdGVuZXJzLm5vdGlmeSgncmVzaXplJywgdGhpcy5zZWxlY3Rpb24ucmVnaW9uKVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChoYXNDaGFuZ2VkKSB7XG4gICAgICB0aGlzLmxpc3RlbmVycy5ub3RpZnkoJ2NoYW5nZScsIHRoaXMuc2VsZWN0aW9uLnJlZ2lvbilcbiAgICB9XG4gIH1cbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLm9uSW5wdXRVcE9yQ2FuY2VsID0gZnVuY3Rpb24gKGUpIHtcbiAgZS5zb3VyY2UucHJldmVudERlZmF1bHQoKVxuICBpZiAodGhpcy5hY3RpdmVSZWdpb24pIHtcbiAgICB0aGlzLmFjdGl2ZVJlZ2lvbiA9IG51bGxcbiAgICB0aGlzLnJlc2V0Q3Vyc29yKClcbiAgICB0aGlzLmxpc3RlbmVycy5ub3RpZnkoJ2VuZCcsIHRoaXMuc2VsZWN0aW9uLnJlZ2lvbilcbiAgfVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUuZmluZEhpdFJlZ2lvbiA9IGZ1bmN0aW9uIChwb2ludCkge1xuICB2YXIgaGl0UmVnaW9uID0gbnVsbFxuICB2YXIgY2xvc2VzdCA9IE51bWJlci5NQVhfVkFMVUVcblxuICB2YXIgZCA9IHRoaXMuaXNXaXRoaW5Ob3J0aFdlc3RIYW5kbGUocG9pbnQpXG4gIGlmIChkICE9PSBmYWxzZSAmJiBkIDwgY2xvc2VzdCkge1xuICAgIGNsb3Nlc3QgPSBkXG4gICAgaGl0UmVnaW9uID0gJ253LXJlc2l6ZSdcbiAgfVxuXG4gIGQgPSB0aGlzLmlzV2l0aGluTm9ydGhFYXN0SGFuZGxlKHBvaW50KVxuICBpZiAoZCAhPT0gZmFsc2UgJiYgZCA8IGNsb3Nlc3QpIHtcbiAgICBjbG9zZXN0ID0gZFxuICAgIGhpdFJlZ2lvbiA9ICduZS1yZXNpemUnXG4gIH1cblxuICBkID0gdGhpcy5pc1dpdGhpblNvdXRoV2VzdEhhbmRsZShwb2ludClcbiAgaWYgKGQgIT09IGZhbHNlICYmIGQgPCBjbG9zZXN0KSB7XG4gICAgY2xvc2VzdCA9IGRcbiAgICBoaXRSZWdpb24gPSAnc3ctcmVzaXplJ1xuICB9XG5cbiAgZCA9IHRoaXMuaXNXaXRoaW5Tb3V0aEVhc3RIYW5kbGUocG9pbnQpXG4gIGlmIChkICE9PSBmYWxzZSAmJiBkIDwgY2xvc2VzdCkge1xuICAgIGNsb3Nlc3QgPSBkXG4gICAgaGl0UmVnaW9uID0gJ3NlLXJlc2l6ZSdcbiAgfVxuXG4gIGlmIChoaXRSZWdpb24pIHtcbiAgICByZXR1cm4gaGl0UmVnaW9uXG4gIH0gZWxzZSBpZiAodGhpcy5pc1dpdGhpbkJvdW5kcyhwb2ludCkpIHtcbiAgICByZXR1cm4gJ21vdmUnXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG51bGxcbiAgfVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAodHlwZSwgZm4pIHtcbiAgdGhpcy5saXN0ZW5lcnMub24odHlwZSwgZm4pXG4gIHJldHVybiB0aGlzXG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbiAodHlwZSwgZm4pIHtcbiAgdGhpcy5saXN0ZW5lcnMub2ZmKHR5cGUsIGZuKVxuICByZXR1cm4gdGhpc1xufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUuc2V0Q3Vyc29yID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgaWYgKHRoaXMucGFyZW50LmNhbnZhcy5zdHlsZS5jdXJzb3IgIT09IHR5cGUpIHtcbiAgICB0aGlzLnBhcmVudC5jYW52YXMuc3R5bGUuY3Vyc29yID0gdHlwZVxuICB9XG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5yZXNldEN1cnNvciA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zZXRDdXJzb3IoJ2F1dG8nKVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUuaXNXaXRoaW5SYWRpdXMgPSBmdW5jdGlvbiAoYXgsIGF5LCBieCwgYnksIHIpIHtcbiAgdmFyIHRzcSA9IHIgKiByXG4gIHZhciBkeCA9IGF4IC0gYnhcbiAgdmFyIGR5ID0gYXkgLSBieVxuICB2YXIgZHNxID0gZHggKiBkeCArIGR5ICogZHlcbiAgcmV0dXJuIChkc3EgPCB0c3EpID8gZHNxIDogZmFsc2Vcbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLmlzV2l0aGluTm9ydGhXZXN0SGFuZGxlID0gZnVuY3Rpb24gKHBvaW50KSB7XG4gIHJldHVybiB0aGlzLmlzV2l0aGluUmFkaXVzKHBvaW50LngsIHBvaW50LnksIHRoaXMuc2VsZWN0aW9uLmxlZnQsIHRoaXMuc2VsZWN0aW9uLnRvcCwgdGhpcy5nZXRIYW5kbGVSYWRpdXMoKSlcbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLmlzV2l0aGluTm9ydGhFYXN0SGFuZGxlID0gZnVuY3Rpb24gKHBvaW50KSB7XG4gIHJldHVybiB0aGlzLmlzV2l0aGluUmFkaXVzKHBvaW50LngsIHBvaW50LnksIHRoaXMuc2VsZWN0aW9uLnJpZ2h0LCB0aGlzLnNlbGVjdGlvbi50b3AsIHRoaXMuZ2V0SGFuZGxlUmFkaXVzKCkpXG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5pc1dpdGhpblNvdXRoV2VzdEhhbmRsZSA9IGZ1bmN0aW9uIChwb2ludCkge1xuICByZXR1cm4gdGhpcy5pc1dpdGhpblJhZGl1cyhwb2ludC54LCBwb2ludC55LCB0aGlzLnNlbGVjdGlvbi5sZWZ0LCB0aGlzLnNlbGVjdGlvbi5ib3R0b20sIHRoaXMuZ2V0SGFuZGxlUmFkaXVzKCkpXG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5pc1dpdGhpblNvdXRoRWFzdEhhbmRsZSA9IGZ1bmN0aW9uIChwb2ludCkge1xuICByZXR1cm4gdGhpcy5pc1dpdGhpblJhZGl1cyhwb2ludC54LCBwb2ludC55LCB0aGlzLnNlbGVjdGlvbi5yaWdodCwgdGhpcy5zZWxlY3Rpb24uYm90dG9tLCB0aGlzLmdldEhhbmRsZVJhZGl1cygpKVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUuaXNXaXRoaW5Cb3VuZHMgPSBmdW5jdGlvbiAocG9pbnQpIHtcbiAgcmV0dXJuIHRoaXMuc2VsZWN0aW9uLmlzSW5zaWRlKHBvaW50KVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUuZ2V0SGFuZGxlUmFkaXVzID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5oYW5kbGVPcHRzLnNpemUgLyAyXG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5vbkltYWdlTG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5hdXRvU2l6ZVJlZ2lvbkFuZE5vdGlmeSgpXG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5zZXRBc3BlY3RSYXRpbyA9IGZ1bmN0aW9uIChhc3BlY3RSYXRpbykge1xuICB0aGlzLnNlbGVjdGlvbi5hc3BlY3RSYXRpbyA9IGFzcGVjdFJhdGlvXG4gIHRoaXMuYXV0b1NpemVSZWdpb25BbmROb3RpZnkoKVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUuYXV0b1NpemVSZWdpb25BbmROb3RpZnkgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBoYXNDaGFuZ2VkID0gdGhpcy5zZWxlY3Rpb24uYXV0b1NpemVSZWdpb24oKVxuICBpZiAoaGFzQ2hhbmdlZCkge1xuICAgIHRoaXMubGlzdGVuZXJzLm5vdGlmeSgnY2hhbmdlJywgdGhpcy5zZWxlY3Rpb24ucmVnaW9uKVxuICB9XG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5yZXZhbGlkYXRlID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNlbGVjdGlvbi51cGRhdGVCb3VuZHNGcm9tUmVnaW9uKClcbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLnBhaW50ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNlbGVjdGlvbi5ib3VuZHNQeC5jb3B5KHRoaXMuc2VsZWN0aW9uLmJvdW5kcykucm91bmQoKVxuXG4gIHRoaXMucGFpbnRPdXRzaWRlKClcbiAgdGhpcy5wYWludEluc2lkZSgpXG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5wYWludE91dHNpZGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBib3VuZHMgPSB0aGlzLnNlbGVjdGlvbi5ib3VuZHNQeFxuICB2YXIgZyA9IHRoaXMuY29udGV4dFxuICB2YXIgdGFyZ2V0ID0gdGhpcy50YXJnZXRcblxuICB2YXIgdGwgPSB0YXJnZXQuYm91bmRzLnhcbiAgdmFyIHR0ID0gdGFyZ2V0LmJvdW5kcy55XG4gIHZhciB0dyA9IHRhcmdldC5ib3VuZHMud2lkdGhcbiAgdmFyIHRyID0gdGFyZ2V0LmJvdW5kcy5yaWdodFxuICB2YXIgdGIgPSB0YXJnZXQuYm91bmRzLmJvdHRvbVxuXG4gIHZhciBibCA9IGJvdW5kcy54XG4gIHZhciBidCA9IGJvdW5kcy55XG4gIHZhciBiaCA9IGJvdW5kcy5oZWlnaHRcbiAgdmFyIGJyID0gYm91bmRzLnJpZ2h0XG4gIHZhciBiYiA9IGJvdW5kcy5ib3R0b21cblxuICBnLmZpbGxTdHlsZSA9ICdyZ2JhKDAsIDAsIDAsIDAuNSknXG4gIGcuZmlsbFJlY3QodGwsIHR0LCB0dywgYnQgLSB0dClcbiAgZy5maWxsUmVjdCh0bCwgYnQsIGJsIC0gdGwsIGJoKVxuICBnLmZpbGxSZWN0KGJyLCBidCwgdHIgLSBiciwgYmgpXG4gIGcuZmlsbFJlY3QodGwsIGJiLCB0dywgdGIgLSBiYilcbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLnBhaW50SW5zaWRlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZyA9IHRoaXMuY29udGV4dFxuICB2YXIgYm91bmRzID0gdGhpcy5zZWxlY3Rpb24uYm91bmRzUHhcbiAgdmFyIGFjdGl2ZVJlZ2lvbiA9IHRoaXMuYWN0aXZlUmVnaW9uXG4gIHZhciBvcHRzID0gdGhpcy5oYW5kbGVPcHRzXG5cbiAgdmFyIGxlbmd0aFdpZHRoID0gTWF0aC5taW4ob3B0cy5sZW5ndGgsIGJvdW5kcy53aWR0aCAqIDAuNSlcbiAgdmFyIGxlbmd0aEhlaWdodCA9IE1hdGgubWluKG9wdHMubGVuZ3RoLCBib3VuZHMuaGVpZ2h0ICogMC41KVxuICB2YXIgZGVwdGggPSBvcHRzLmRlcHRoXG4gIHZhciBjb2xvciA9IG9wdHMuY29sb3JcbiAgdmFyIGFjdGl2ZUNvbG9yID0gb3B0cy5hY3RpdmVDb2xvclxuICB2YXIgbGVuZ3RoID0gMCAvLyBUT0RPOiBDSEVDS1xuXG4gIC8vIFNpZGVzXG4gIGcuZmlsbFN0eWxlID0gJ3JnYmEoMjU1LCAyNTUsIDI1NSwgMC4zKSdcbiAgZy5maWxsUmVjdChib3VuZHMueCArIGxlbmd0aCwgYm91bmRzLnksIGJvdW5kcy53aWR0aCAtIDIgKiBsZW5ndGgsIGRlcHRoKVxuICBnLmZpbGxSZWN0KGJvdW5kcy54ICsgbGVuZ3RoLCBib3VuZHMuYm90dG9tIC0gZGVwdGgsIGJvdW5kcy53aWR0aCAtIDIgKiBsZW5ndGgsIGRlcHRoKVxuICBnLmZpbGxSZWN0KGJvdW5kcy54LCBib3VuZHMueSArIGxlbmd0aCwgZGVwdGgsIGJvdW5kcy5oZWlnaHQgLSAyICogbGVuZ3RoKVxuICBnLmZpbGxSZWN0KGJvdW5kcy5yaWdodCAtIGRlcHRoLCBib3VuZHMueSArIGxlbmd0aCwgZGVwdGgsIGJvdW5kcy5oZWlnaHQgLSAyICogbGVuZ3RoKVxuXG4gIC8vIEhhbmRsZXNcbiAgdmFyIGlzTW92ZVJlZ2lvbiA9IGFjdGl2ZVJlZ2lvbiA9PT0gJ21vdmUnXG5cbiAgZy5maWxsU3R5bGUgPSBpc01vdmVSZWdpb24gfHwgYWN0aXZlUmVnaW9uID09PSAnbnctcmVzaXplJyA/IGFjdGl2ZUNvbG9yIDogY29sb3JcbiAgZy5maWxsUmVjdChib3VuZHMueCwgYm91bmRzLnksIGxlbmd0aFdpZHRoLCBkZXB0aClcbiAgZy5maWxsUmVjdChib3VuZHMueCwgYm91bmRzLnkgKyBkZXB0aCwgZGVwdGgsIGxlbmd0aEhlaWdodCAtIGRlcHRoKVxuXG4gIGcuZmlsbFN0eWxlID0gaXNNb3ZlUmVnaW9uIHx8IGFjdGl2ZVJlZ2lvbiA9PT0gJ25lLXJlc2l6ZScgPyBhY3RpdmVDb2xvciA6IGNvbG9yXG4gIGcuZmlsbFJlY3QoYm91bmRzLnJpZ2h0IC0gbGVuZ3RoV2lkdGgsIGJvdW5kcy55LCBsZW5ndGhXaWR0aCwgZGVwdGgpXG4gIGcuZmlsbFJlY3QoYm91bmRzLnJpZ2h0IC0gZGVwdGgsIGJvdW5kcy55ICsgZGVwdGgsIGRlcHRoLCBsZW5ndGhIZWlnaHQgLSBkZXB0aClcblxuICBnLmZpbGxTdHlsZSA9IGlzTW92ZVJlZ2lvbiB8fCBhY3RpdmVSZWdpb24gPT09ICdzdy1yZXNpemUnID8gYWN0aXZlQ29sb3IgOiBjb2xvclxuICBnLmZpbGxSZWN0KGJvdW5kcy54LCBib3VuZHMuYm90dG9tIC0gZGVwdGgsIGxlbmd0aFdpZHRoLCBkZXB0aClcbiAgZy5maWxsUmVjdChib3VuZHMueCwgYm91bmRzLmJvdHRvbSAtIGxlbmd0aEhlaWdodCwgZGVwdGgsIGxlbmd0aEhlaWdodCAtIGRlcHRoKVxuXG4gIGcuZmlsbFN0eWxlID0gaXNNb3ZlUmVnaW9uIHx8IGFjdGl2ZVJlZ2lvbiA9PT0gJ3NlLXJlc2l6ZScgPyBhY3RpdmVDb2xvciA6IGNvbG9yXG4gIGcuZmlsbFJlY3QoYm91bmRzLnJpZ2h0IC0gbGVuZ3RoV2lkdGgsIGJvdW5kcy5ib3R0b20gLSBkZXB0aCwgbGVuZ3RoV2lkdGgsIGRlcHRoKVxuICBnLmZpbGxSZWN0KGJvdW5kcy5yaWdodCAtIGRlcHRoLCBib3VuZHMuYm90dG9tIC0gbGVuZ3RoSGVpZ2h0LCBkZXB0aCwgbGVuZ3RoSGVpZ2h0IC0gZGVwdGgpXG5cbiAgLy8gR3VpZGVzXG4gIGcuc3Ryb2tlU3R5bGUgPSAncmdiYSgyNTUsIDI1NSwgMjU1LCAwLjYpJ1xuICBnLnNldExpbmVEYXNoKFsyLCAzXSlcbiAgZy5saW5lV2lkdGggPSAxXG4gIGcuYmVnaW5QYXRoKClcbiAgdmFyIGJ3MyA9IGJvdW5kcy53aWR0aCAvIDNcbiAgdmFyIGJoMyA9IGJvdW5kcy5oZWlnaHQgLyAzXG4gIGcubW92ZVRvKGJvdW5kcy54ICsgYnczLCBib3VuZHMueSlcbiAgZy5saW5lVG8oYm91bmRzLnggKyBidzMsIGJvdW5kcy55ICsgYm91bmRzLmhlaWdodClcbiAgZy5tb3ZlVG8oYm91bmRzLnggKyAyICogYnczLCBib3VuZHMueSlcbiAgZy5saW5lVG8oYm91bmRzLnggKyAyICogYnczLCBib3VuZHMueSArIGJvdW5kcy5oZWlnaHQpXG4gIGcubW92ZVRvKGJvdW5kcy54LCBib3VuZHMueSArIGJoMylcbiAgZy5saW5lVG8oYm91bmRzLnggKyBib3VuZHMud2lkdGgsIGJvdW5kcy55ICsgYmgzKVxuICBnLm1vdmVUbyhib3VuZHMueCwgYm91bmRzLnkgKyAyICogYmgzKVxuICBnLmxpbmVUbyhib3VuZHMueCArIGJvdW5kcy53aWR0aCwgYm91bmRzLnkgKyAyICogYmgzKVxuICBnLnN0cm9rZSgpXG4gIGcuY2xvc2VQYXRoKClcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3Rpb25MYXllclxuIiwiLy8gaHR0cDovL3NuaXBwZXRyZXBvLmNvbS9zbmlwcGV0cy9iYXNpYy12YW5pbGxhLWphdmFzY3JpcHQtdGhyb3R0bGluZ2RlYm91bmNlXG5mdW5jdGlvbiBkZWJvdW5jZSAoZm4sIHdhaXQsIGltbWVkaWF0ZSkge1xuICB2YXIgdGltZW91dFxuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHZhciBjb250ZXh0ID0gdGhpc1xuICAgIHZhciBhcmdzID0gYXJndW1lbnRzXG4gICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpXG4gICAgdGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgdGltZW91dCA9IG51bGxcbiAgICAgIGlmICghaW1tZWRpYXRlKSBmbi5hcHBseShjb250ZXh0LCBhcmdzKVxuICAgIH0sIHdhaXQpXG4gICAgaWYgKGltbWVkaWF0ZSAmJiAhdGltZW91dCkgZm4uYXBwbHkoY29udGV4dCwgYXJncylcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBkZWJvdW5jZVxuIiwiLypcbiAqIE1vZGlmaWVkIHZlcnNpb24gb2YgaHR0cDovL2dpdGh1Yi5jb20vZGVzYW5kcm8vaW1hZ2VzbG9hZGVkIHYyLjEuMVxuICogTUlUIExpY2Vuc2UuXG4gKi9cblxudmFyIEJMQU5LID0gJ2RhdGE6aW1hZ2UvZ2lmO2Jhc2U2NCxSMGxHT0RsaEFRQUJBSUFBQUFBQUFQLy8veXdBQUFBQUFRQUJBQUFDQVV3QU93PT0nXG5cbmZ1bmN0aW9uIGxvYWRJbWFnZSAoaW1hZ2UsIGNhbGxiYWNrKSB7XG4gIGlmICghaW1hZ2Uubm9kZU5hbWUgfHwgaW1hZ2Uubm9kZU5hbWUudG9Mb3dlckNhc2UoKSAhPT0gJ2ltZycpIHtcbiAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdGaXJzdCBhcmd1bWVudCBtdXN0IGFuIGltYWdlIGVsZW1lbnQnKSlcbiAgfVxuXG4gIGlmIChpbWFnZS5zcmMgJiYgaW1hZ2UuY29tcGxldGUgJiYgaW1hZ2UubmF0dXJhbFdpZHRoICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgdHJ1ZSlcbiAgfVxuXG4gIGltYWdlLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgY2FsbGJhY2sobnVsbCwgZmFsc2UpXG4gIH0pXG5cbiAgaW1hZ2UuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBmdW5jdGlvbiAoZSkge1xuICAgIGNhbGxiYWNrKG5ldyBFcnJvcignRmFpbGVkIHRvIGxvYWQgaW1hZ2UgXFwnJyArIChpbWFnZS5zcmMgfHwgJycpICsgJ1xcJycpKVxuICB9KVxuXG4gIGlmIChpbWFnZS5jb21wbGV0ZSkge1xuICAgIHZhciBzcmMgPSBpbWFnZS5zcmNcbiAgICBpbWFnZS5zcmMgPSBCTEFOS1xuICAgIGltYWdlLnNyYyA9IHNyY1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbG9hZEltYWdlXG4iXX0=

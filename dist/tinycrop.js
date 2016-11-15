(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.tinycrop = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./Listeners.js":5,"./loadImage.js":11}],3:[function(require,module,exports){
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

},{"./Rectangle.js":6}],4:[function(require,module,exports){
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

},{"./Listeners.js":5}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{"./Rectangle.js":6}],8:[function(require,module,exports){
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

},{"./Input.js":4,"./Listeners.js":5,"./Rectangle.js":6,"./Selection.js":7}],9:[function(require,module,exports){
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

},{}],10:[function(require,module,exports){
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

},{"./BackgroundLayer.js":1,"./Image.js":2,"./ImageLayer.js":3,"./Listeners.js":5,"./SelectionLayer.js":8,"./debounce.js":9}],11:[function(require,module,exports){
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

},{}]},{},[10])(10)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvQmFja2dyb3VuZExheWVyLmpzIiwic3JjL0ltYWdlLmpzIiwic3JjL0ltYWdlTGF5ZXIuanMiLCJzcmMvSW5wdXQuanMiLCJzcmMvTGlzdGVuZXJzLmpzIiwic3JjL1JlY3RhbmdsZS5qcyIsInNyYy9TZWxlY3Rpb24uanMiLCJzcmMvU2VsZWN0aW9uTGF5ZXIuanMiLCJzcmMvZGVib3VuY2UuanMiLCJzcmMvaW5kZXguanMiLCJzcmMvbG9hZEltYWdlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQSxJQUFJLGtCQUFrQixTQUFsQixlQUFrQixDQUFVLElBQVYsRUFBZ0I7QUFDcEMsU0FBTyxRQUFRLEVBQWY7O0FBRUEsT0FBSyxNQUFMLEdBQWMsS0FBSyxNQUFuQjs7QUFFQSxPQUFLLE1BQUwsR0FBYyxLQUFLLE1BQW5CO0FBQ0EsT0FBSyxPQUFMLEdBQWUsS0FBSyxPQUFwQjtBQUNBLE9BQUssT0FBTCxHQUFlLElBQWY7QUFDRCxDQVJEOztBQVVBLGdCQUFnQixNQUFoQixHQUF5QixVQUFVLElBQVYsRUFBZ0I7QUFDdkMsU0FBTyxJQUFJLGVBQUosQ0FBb0IsSUFBcEIsQ0FBUDtBQUNELENBRkQ7O0FBSUEsZ0JBQWdCLFNBQWhCLENBQTBCLFVBQTFCLEdBQXVDLFlBQVk7QUFDakQsT0FBSyxPQUFMLEdBQWUsSUFBZjtBQUNELENBRkQ7O0FBSUEsZ0JBQWdCLFNBQWhCLENBQTBCLFNBQTFCLEdBQXNDLFVBQVUsTUFBVixFQUFrQjtBQUN0RCxPQUFLLE1BQUwsR0FBYyxNQUFkO0FBQ0QsQ0FGRDs7QUFJQSxnQkFBZ0IsU0FBaEIsQ0FBMEIsS0FBMUIsR0FBa0MsWUFBWTtBQUM1QyxNQUFJLEtBQUssT0FBVCxFQUFrQjtBQUNoQixRQUFJLFNBQVMsS0FBSyxNQUFsQjtBQUNBLFFBQUksSUFBSSxLQUFLLE9BQWI7O0FBRUEsUUFBSSxDQUFDLEtBQUssTUFB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T0FBUCxHQUFpQixTQUFqQiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgQmFja2dyb3VuZExheWVyID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgb3B0cyA9IG9wdHMgfHwge31cblxuICB0aGlzLmNvbG9ycyA9IG9wdHMuY29sb3JzXG5cbiAgdGhpcy5wYXJlbnQgPSBvcHRzLnBhcmVudFxuICB0aGlzLmNvbnRleHQgPSBvcHRzLmNvbnRleHRcbiAgdGhpcy5pc0RpcnR5ID0gdHJ1ZVxufVxuXG5CYWNrZ3JvdW5kTGF5ZXIuY3JlYXRlID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgcmV0dXJuIG5ldyBCYWNrZ3JvdW5kTGF5ZXIob3B0cylcbn1cblxuQmFja2dyb3VuZExheWVyLnByb3RvdHlwZS5yZXZhbGlkYXRlID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmlzRGlydHkgPSB0cnVlXG59XG5cbkJhY2tncm91bmRMYXllci5wcm90b3R5cGUuc2V0Q29sb3JzID0gZnVuY3Rpb24gKGNvbG9ycykge1xuICB0aGlzLmNvbG9ycyA9IGNvbG9yc1xufVxuXG5CYWNrZ3JvdW5kTGF5ZXIucHJvdG90eXBlLnBhaW50ID0gZnVuY3Rpb24gKCkge1xuICBpZiAodGhpcy5pc0RpcnR5KSB7XG4gICAgdmFyIHBhcmVudCA9IHRoaXMucGFyZW50XG4gICAgdmFyIGcgPSB0aGlzLmNvbnRleHRcblxuICAgIGlmICghdGhpcy5jb2xvcnMgfHwgIXRoaXMuY29sb3JzLmxlbmd0aCkge1xuICAgICAgZy5jbGVhclJlY3QoMCwgMCwgcGFyZW50LndpZHRoLCBwYXJlbnQuaGVpZ2h0KVxuICAgIH0gZWxzZSB7XG4gICAgICBnLmZpbGxTdHlsZSA9IHRoaXMuY29sb3JzWzBdXG4gICAgICBnLmZpbGxSZWN0KDAsIDAsIHBhcmVudC53aWR0aCwgcGFyZW50LmhlaWdodClcbiAgICB9XG5cbiAgICBpZiAodGhpcy5jb2xvcnMgJiYgdGhpcy5jb2xvcnMubGVuZ3RoID4gMSkge1xuICAgICAgdmFyIGggPSBwYXJlbnQuaGVpZ2h0XG5cbiAgICAgIHZhciBjb2xzID0gMzJcbiAgICAgIHZhciBzaXplID0gcGFyZW50LndpZHRoIC8gY29sc1xuICAgICAgdmFyIHJvd3MgPSBNYXRoLmNlaWwoaCAvIHNpemUpXG5cbiAgICAgIGcuZmlsbFN0eWxlID0gdGhpcy5jb2xvcnNbMV1cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29sczsgaSArPSAxKSB7XG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgcm93czsgaiArPSAxKSB7XG4gICAgICAgICAgaWYgKChpICsgaikgJSAyID09PSAwKSB7XG4gICAgICAgICAgICBnLmZpbGxSZWN0KGkgKiBzaXplLCBqICogc2l6ZSwgc2l6ZSwgc2l6ZSlcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmlzRGlydHkgPSBmYWxzZVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gQmFja2dyb3VuZExheWVyXG4iLCJ2YXIgbG9hZGVkID0gcmVxdWlyZSgnLi9sb2FkSW1hZ2UuanMnKVxudmFyIExpc3RlbmVycyA9IHJlcXVpcmUoJy4vTGlzdGVuZXJzLmpzJylcblxudmFyIEltYWdlID0gZnVuY3Rpb24gKHNvdXJjZSkge1xuICB0aGlzLndpZHRoID0gMFxuICB0aGlzLmhlaWdodCA9IDBcblxuICB0aGlzLmhhc0xvYWRlZCA9IGZhbHNlXG4gIHRoaXMuc3JjID0gbnVsbFxuXG4gIHRoaXMubGlzdGVuZXJzID0gTGlzdGVuZXJzLmNyZWF0ZSgpXG5cbiAgaWYgKCFzb3VyY2UpIHtcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmICh0eXBlb2Ygc291cmNlID09PSAnc3RyaW5nJykge1xuICAgIHRoaXMuc3JjID0gc291cmNlXG4gICAgdmFyIGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpXG4gICAgaW1nLnNyYyA9IHRoaXMuc3JjXG4gICAgc291cmNlID0gaW1nXG4gIH0gZWxzZSB7XG4gICAgdGhpcy5zcmMgPSBzb3VyY2Uuc3JjXG4gIH1cblxuICB0aGlzLnNvdXJjZSA9IHNvdXJjZVxuXG4gIGxvYWRlZChzb3VyY2UsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICBpZiAoZXJyKSB7XG4gICAgICB0aGlzLm5vdGlmeSgnZXJyb3InLCBlcnIpXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaGFzTG9hZGVkID0gdHJ1ZVxuICAgICAgdGhpcy53aWR0aCA9IHNvdXJjZS5uYXR1cmFsV2lkdGhcbiAgICAgIHRoaXMuaGVpZ2h0ID0gc291cmNlLm5hdHVyYWxIZWlnaHRcbiAgICAgIHRoaXMubm90aWZ5KCdsb2FkJywgdGhpcylcbiAgICB9XG4gIH0uYmluZCh0aGlzKSlcbn1cblxuSW1hZ2UuY3JlYXRlID0gZnVuY3Rpb24gKHNvdXJjZSkge1xuICByZXR1cm4gbmV3IEltYWdlKHNvdXJjZSlcbn1cblxuSW1hZ2UucHJvdG90eXBlLmdldEFzcGVjdFJhdGlvID0gZnVuY3Rpb24gKCkge1xuICBpZiAoIXRoaXMuaGFzTG9hZGVkKSB7XG4gICAgcmV0dXJuIDFcbiAgfVxuXG4gIHJldHVybiB0aGlzLndpZHRoIC8gdGhpcy5oZWlnaHRcbn1cblxuSW1hZ2UucHJvdG90eXBlLm5vdGlmeSA9IGZ1bmN0aW9uICh0eXBlLCBkYXRhKSB7XG4gIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmxpc3RlbmVyc1xuICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICBsaXN0ZW5lcnMubm90aWZ5KHR5cGUsIGRhdGEpXG4gIH0sIDApXG59XG5cbkltYWdlLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuICB0aGlzLmxpc3RlbmVycy5vbih0eXBlLCBmbilcbiAgcmV0dXJuIHRoaXNcbn1cblxuSW1hZ2UucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuICB0aGlzLmxpc3RlbmVycy5vZmYodHlwZSwgZm4pXG4gIHJldHVybiB0aGlzXG59XG5cbm1vZHVsZS5leHBvcnRzID0gSW1hZ2VcbiIsInZhciBSZWN0YW5nbGUgPSByZXF1aXJlKCcuL1JlY3RhbmdsZS5qcycpXG5cbnZhciBJbWFnZUxheWVyID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgb3B0cyA9IG9wdHMgfHwge31cbiAgdGhpcy5ib3VuZHMgPSBSZWN0YW5nbGUuY3JlYXRlKDAsIDAsIDAsIDApXG4gIHRoaXMuaW1hZ2UgPSBvcHRzLmltYWdlIHx8IG51bGxcbiAgdGhpcy5wYXJlbnQgPSBvcHRzLnBhcmVudFxuICB0aGlzLmNvbnRleHQgPSBvcHRzLmNvbnRleHRcbn1cblxuSW1hZ2VMYXllci5jcmVhdGUgPSBmdW5jdGlvbiAob3B0cykge1xuICByZXR1cm4gbmV3IEltYWdlTGF5ZXIob3B0cylcbn1cblxuSW1hZ2VMYXllci5wcm90b3R5cGUuc2V0SW1hZ2UgPSBmdW5jdGlvbiAoaW1hZ2UpIHtcbiAgdGhpcy5pbWFnZSA9IGltYWdlXG59XG5cbkltYWdlTGF5ZXIucHJvdG90eXBlLnJldmFsaWRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBwYXJlbnQgPSB0aGlzLnBhcmVudFxuICB2YXIgaW1hZ2UgPSB0aGlzLmltYWdlXG4gIHZhciBib3VuZHMgPSB0aGlzLmJvdW5kc1xuXG4gIGlmIChpbWFnZSkge1xuICAgIC8vIENvbnN0cmFpbmVkIGJ5IHdpZHRoIChvdGhlcndpc2UgaGVpZ2h0KVxuICAgIGlmIChpbWFnZS53aWR0aCAvIGltYWdlLmhlaWdodCA+PSBwYXJlbnQud2lkdGggLyBwYXJlbnQuaGVpZ2h0KSB7XG4gICAgICBib3VuZHMud2lkdGggPSBwYXJlbnQud2lkdGhcbiAgICAgIGJvdW5kcy5oZWlnaHQgPSBNYXRoLmNlaWwoaW1hZ2UuaGVpZ2h0IC8gaW1hZ2Uud2lkdGggKiBwYXJlbnQud2lkdGgpXG4gICAgICBib3VuZHMueCA9IDBcbiAgICAgIGJvdW5kcy55ID0gTWF0aC5mbG9vcigocGFyZW50LmhlaWdodCAtIGJvdW5kcy5oZWlnaHQpICogMC41KVxuICAgIH0gZWxzZSB7XG4gICAgICBib3VuZHMud2lkdGggPSBNYXRoLmNlaWwoaW1hZ2Uud2lkdGggLyBpbWFnZS5oZWlnaHQgKiBwYXJlbnQuaGVpZ2h0KVxuICAgICAgYm91bmRzLmhlaWdodCA9IHBhcmVudC5oZWlnaHRcbiAgICAgIGJvdW5kcy54ID0gTWF0aC5mbG9vcigocGFyZW50LndpZHRoIC0gYm91bmRzLndpZHRoKSAqIDAuNSlcbiAgICAgIGJvdW5kcy55ID0gMFxuICAgIH1cbiAgfVxufVxuXG5JbWFnZUxheWVyLnByb3RvdHlwZS5wYWludCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGcgPSB0aGlzLmNvbnRleHRcbiAgdmFyIGltYWdlID0gdGhpcy5pbWFnZVxuICB2YXIgYm91bmRzID0gdGhpcy5ib3VuZHNcblxuICBpZiAoaW1hZ2UgJiYgaW1hZ2UuaGFzTG9hZGVkKSB7XG4gICAgZy5kcmF3SW1hZ2UoXG4gICAgICBpbWFnZS5zb3VyY2UsXG4gICAgICAwLCAwLCBpbWFnZS53aWR0aCwgaW1hZ2UuaGVpZ2h0LFxuICAgICAgYm91bmRzLngsIGJvdW5kcy55LCBib3VuZHMud2lkdGgsIGJvdW5kcy5oZWlnaHRcbiAgICApXG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBJbWFnZUxheWVyXG4iLCJ2YXIgTGlzdGVuZXJzID0gcmVxdWlyZSgnLi9MaXN0ZW5lcnMuanMnKVxuXG52YXIgSW5wdXQgPSBmdW5jdGlvbiAoZG9tRWxlbWVudCkge1xuICB2YXIgbGlzdGVuZXJzID0gTGlzdGVuZXJzLmNyZWF0ZSgpXG4gIHZhciBkb3duRXZlbnQgPSBudWxsXG4gIHRoaXMubGlzdGVuZXJzID0gbGlzdGVuZXJzXG5cbiAgZnVuY3Rpb24gY3JlYXRlRXZlbnRGb3JNb3VzZSAoc291cmNlKSB7XG4gICAgdmFyIHggPSBzb3VyY2Uub2Zmc2V0WFxuICAgIHZhciB5ID0gc291cmNlLm9mZnNldFlcblxuICAgIHJldHVybiB7XG4gICAgICBzb3VyY2U6IHNvdXJjZSxcbiAgICAgIHg6IHgsXG4gICAgICB5OiB5LFxuICAgICAgZHg6IGRvd25FdmVudCA/IHggLSBkb3duRXZlbnQueCA6IDAsXG4gICAgICBkeTogZG93bkV2ZW50ID8geSAtIGRvd25FdmVudC55IDogMCxcbiAgICAgIHR5cGU6ICdNb3VzZSdcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVFdmVudEZvclRvdWNoIChzb3VyY2UpIHtcbiAgICB2YXIgYm91bmRzID0gc291cmNlLnRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKVxuICAgIHZhciB0b3VjaCA9IHNvdXJjZS50b3VjaGVzLmxlbmd0aCA+IDAgPyBzb3VyY2UudG91Y2hlc1swXSA6IHNvdXJjZS5jaGFuZ2VkVG91Y2hlc1swXVxuXG4gICAgdmFyIHggPSB0b3VjaC5jbGllbnRYIC0gYm91bmRzLmxlZnRcbiAgICB2YXIgeSA9IHRvdWNoLmNsaWVudFkgLSBib3VuZHMudG9wXG5cbiAgICByZXR1cm4ge1xuICAgICAgc291cmNlOiBzb3VyY2UsXG4gICAgICB4OiB4LFxuICAgICAgeTogeSxcbiAgICAgIGR4OiBkb3duRXZlbnQgPyB4IC0gZG93bkV2ZW50LnggOiAwLFxuICAgICAgZHk6IGRvd25FdmVudCA/IHkgLSBkb3duRXZlbnQueSA6IDAsXG4gICAgICB0eXBlOiAnVG91Y2gnXG4gICAgfVxuICB9XG5cbiAgZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgZG93bkV2ZW50ID0gY3JlYXRlRXZlbnRGb3JNb3VzZShzb3VyY2UpXG4gICAgbGlzdGVuZXJzLm5vdGlmeSgnZG93bicsIGRvd25FdmVudClcbiAgfSlcblxuICBkb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCBmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgZG93bkV2ZW50ID0gY3JlYXRlRXZlbnRGb3JUb3VjaChzb3VyY2UpXG4gICAgbGlzdGVuZXJzLm5vdGlmeSgnZG93bicsIGRvd25FdmVudClcbiAgfSlcblxuICBkb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICBsaXN0ZW5lcnMubm90aWZ5KCdtb3ZlJywgY3JlYXRlRXZlbnRGb3JNb3VzZShzb3VyY2UpKVxuICB9KVxuXG4gIGRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgZnVuY3Rpb24gKHNvdXJjZSkge1xuICAgIGxpc3RlbmVycy5ub3RpZnkoJ21vdmUnLCBjcmVhdGVFdmVudEZvclRvdWNoKHNvdXJjZSkpXG4gIH0pXG5cbiAgZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZnVuY3Rpb24gKHNvdXJjZSkge1xuICAgIGxpc3RlbmVycy5ub3RpZnkoJ3VwJywgY3JlYXRlRXZlbnRGb3JNb3VzZShzb3VyY2UpKVxuICB9KVxuXG4gIGRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCBmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgbGlzdGVuZXJzLm5vdGlmeSgndXAnLCBjcmVhdGVFdmVudEZvclRvdWNoKHNvdXJjZSkpXG4gICAgZG93bkV2ZW50ID0gbnVsbFxuICB9KVxuXG4gIGRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VvdXQnLCBmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgbGlzdGVuZXJzLm5vdGlmeSgnY2FuY2VsJywgY3JlYXRlRXZlbnRGb3JNb3VzZShzb3VyY2UpKVxuICAgIGRvd25FdmVudCA9IG51bGxcbiAgfSlcblxuICBkb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoY2FuY2VsJywgZnVuY3Rpb24gKHNvdXJjZSkge1xuICAgIGxpc3RlbmVycy5ub3RpZnkoJ2NhbmNlbCcsIGNyZWF0ZUV2ZW50Rm9yVG91Y2goc291cmNlKSlcbiAgICBkb3duRXZlbnQgPSBudWxsXG4gIH0pXG59XG5cbklucHV0LmNyZWF0ZSA9IGZ1bmN0aW9uIChkb21FbGVtZW50KSB7XG4gIHJldHVybiBuZXcgSW5wdXQoZG9tRWxlbWVudClcbn1cblxuSW5wdXQucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gIHRoaXMubGlzdGVuZXJzLm9uKHR5cGUsIGZuKVxuICByZXR1cm4gdGhpc1xufVxuXG5JbnB1dC5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gIHRoaXMubGlzdGVuZXJzLm9mZih0eXBlLCBmbilcbiAgcmV0dXJuIHRoaXNcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBJbnB1dFxuIiwidmFyIExpc3RlbmVycyA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gIHRoaXMuZXZlbnRzID0ge31cbn1cblxuTGlzdGVuZXJzLmNyZWF0ZSA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gIHJldHVybiBuZXcgTGlzdGVuZXJzKG9wdHMpXG59XG5cbkxpc3RlbmVycy5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAodHlwZSwgZm4pIHtcbiAgaWYgKCF0aGlzLmV2ZW50c1t0eXBlXSkge1xuICAgIHRoaXMuZXZlbnRzW3R5cGVdID0gW11cbiAgfVxuXG4gIGlmICh0aGlzLmV2ZW50c1t0eXBlXS5pbmRleE9mKGZuKSA9PT0gLTEpIHtcbiAgICB0aGlzLmV2ZW50c1t0eXBlXS5wdXNoKGZuKVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuTGlzdGVuZXJzLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbiAodHlwZSwgZm4pIHtcbiAgaWYgKHRoaXMuZXZlbnRzW3R5cGVdKSB7XG4gICAgdmFyIGkgPSB0aGlzLmV2ZW50c1t0eXBlXS5pbmRleE9mKGZuKVxuICAgIGlmIChpICE9PSAtMSkge1xuICAgICAgdGhpcy5ldmVudHNbdHlwZV0uc3BsaWNlKGksIDEpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuTGlzdGVuZXJzLnByb3RvdHlwZS5ub3RpZnkgPSBmdW5jdGlvbiAodHlwZSwgZGF0YSkge1xuICBpZiAodGhpcy5ldmVudHNbdHlwZV0pIHtcbiAgICB0aGlzLmV2ZW50c1t0eXBlXS5mb3JFYWNoKGZ1bmN0aW9uIChmbikge1xuICAgICAgZm4uY2FsbCh0aGlzLCBkYXRhKVxuICAgIH0uYmluZCh0aGlzKSlcbiAgfVxufVxuXG5MaXN0ZW5lcnMucHJvdG90eXBlLmNsZWFyQWxsID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmV2ZW50cyA9IHt9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTGlzdGVuZXJzXG4iLCJ2YXIgUmVjdGFuZ2xlID0gZnVuY3Rpb24gKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgdGhpcy5feCA9IHhcbiAgdGhpcy5feSA9IHlcbiAgdGhpcy5fd2lkdGggPSB3aWR0aFxuICB0aGlzLl9oZWlnaHQgPSBoZWlnaHRcbn1cblxuUmVjdGFuZ2xlLnByb3RvdHlwZS5jb3B5ID0gZnVuY3Rpb24gKGNvcHkpIHtcbiAgdGhpcy5feCA9IGNvcHkueFxuICB0aGlzLl95ID0gY29weS55XG4gIHRoaXMuX3dpZHRoID0gY29weS53aWR0aFxuICB0aGlzLl9oZWlnaHQgPSBjb3B5LmhlaWdodFxuICByZXR1cm4gdGhpc1xufVxuXG5SZWN0YW5nbGUucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gUmVjdGFuZ2xlLmNyZWF0ZSh0aGlzLl94LCB0aGlzLl95LCB0aGlzLl93aWR0aCwgdGhpcy5faGVpZ2h0KVxufVxuXG5SZWN0YW5nbGUucHJvdG90eXBlLnJvdW5kID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZHggPSB0aGlzLl94XG4gIHZhciBkeSA9IHRoaXMuX3lcbiAgdGhpcy5feCA9IE1hdGgucm91bmQoZHgpXG4gIHRoaXMuX3kgPSBNYXRoLnJvdW5kKGR5KVxuICBkeCAtPSB0aGlzLl94XG4gIGR5IC09IHRoaXMuX3lcbiAgdGhpcy5fd2lkdGggPSBNYXRoLnJvdW5kKHRoaXMuX3dpZHRoICsgZHgpXG4gIHRoaXMuX2hlaWdodCA9IE1hdGgucm91bmQodGhpcy5faGVpZ2h0ICsgZHkpXG4gIHJldHVybiB0aGlzXG59XG5cblJlY3RhbmdsZS5wcm90b3R5cGUuaXNJbnNpZGUgPSBmdW5jdGlvbiAocG9pbnQpIHtcbiAgcmV0dXJuIHBvaW50LnggPj0gdGhpcy5sZWZ0ICYmXG4gICAgcG9pbnQueSA+PSB0aGlzLnRvcCAmJlxuICAgIHBvaW50LnggPCB0aGlzLnJpZ2h0ICYmXG4gICAgcG9pbnQueSA8IHRoaXMuYm90dG9tXG59XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFJlY3RhbmdsZS5wcm90b3R5cGUsIHtcbiAgeDoge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5feCB9LFxuICAgIHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5feCA9IHYgfVxuICB9LFxuICB5OiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl95IH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLl95ID0gdiB9XG4gIH0sXG4gIGNlbnRlclg6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3ggKyB0aGlzLl93aWR0aCAqIDAuNSB9LFxuICAgIHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5feCA9IHYgLSB0aGlzLl93aWR0aCAqIDAuNSB9XG4gIH0sXG4gIGNlbnRlclk6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3kgKyB0aGlzLl9oZWlnaHQgKiAwLjUgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuX3kgPSB2IC0gdGhpcy5faGVpZ2h0ICogMC41IH1cbiAgfSxcbiAgd2lkdGg6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3dpZHRoIH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLl93aWR0aCA9IHYgfVxuICB9LFxuICBoZWlnaHQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX2hlaWdodCB9LFxuICAgIHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5faGVpZ2h0ID0gdiB9XG4gIH0sXG4gIGxlZnQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3ggfSxcbiAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7XG4gICAgICB0aGlzLl93aWR0aCA9IHRoaXMuX3ggKyB0aGlzLl93aWR0aCAtIHZcbiAgICAgIHRoaXMuX3ggPSB2XG4gICAgfVxuICB9LFxuICB0b3A6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3kgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7XG4gICAgICB0aGlzLl9oZWlnaHQgPSB0aGlzLl95ICsgdGhpcy5faGVpZ2h0IC0gdlxuICAgICAgdGhpcy5feSA9IHZcbiAgICB9XG4gIH0sXG4gIHJpZ2h0OiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl94ICsgdGhpcy5fd2lkdGggfSxcbiAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7XG4gICAgICB0aGlzLl93aWR0aCA9IHYgLSB0aGlzLl94XG4gICAgfVxuICB9LFxuICBib3R0b206IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3kgKyB0aGlzLl9oZWlnaHQgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7XG4gICAgICB0aGlzLl9oZWlnaHQgPSB2IC0gdGhpcy5feVxuICAgIH1cbiAgfSxcbiAgYXNwZWN0UmF0aW86IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3dpZHRoIC8gdGhpcy5faGVpZ2h0IH1cbiAgfVxufSlcblxuUmVjdGFuZ2xlLmNyZWF0ZSA9IGZ1bmN0aW9uICh4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gIHJldHVybiBuZXcgUmVjdGFuZ2xlKHgsIHksIHdpZHRoLCBoZWlnaHQpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gUmVjdGFuZ2xlXG4iLCJ2YXIgUmVjdGFuZ2xlID0gcmVxdWlyZSgnLi9SZWN0YW5nbGUuanMnKVxuXG52YXIgU2VsZWN0aW9uID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgdGhpcy50YXJnZXQgPSBvcHRzLnRhcmdldCB8fCBudWxsXG4gIHRoaXMuYm91bmRzID0gUmVjdGFuZ2xlLmNyZWF0ZSgwLCAwLCAwLCAwKVxuICB0aGlzLmJvdW5kc1B4ID0gUmVjdGFuZ2xlLmNyZWF0ZSgwLCAwLCAwLCAwKVxuICB0aGlzLnJlZ2lvbiA9IFJlY3RhbmdsZS5jcmVhdGUoMCwgMCwgMCwgMClcblxuICB0aGlzLmluaXRpYWxPcHRzID0ge1xuICAgIHg6IG9wdHMueCxcbiAgICB5OiBvcHRzLnksXG4gICAgd2lkdGg6IG9wdHMud2lkdGgsXG4gICAgaGVpZ2h0OiBvcHRzLmhlaWdodFxuICB9XG5cbiAgdGhpcy5hc3BlY3RSYXRpbyA9IG9wdHMuYXNwZWN0UmF0aW9cbiAgdGhpcy5taW5XaWR0aCA9IG9wdHMubWluV2lkdGggIT09IHVuZGVmaW5lZCA/IG9wdHMubWluV2lkdGggOiAxMDBcbiAgdGhpcy5taW5IZWlnaHQgPSBvcHRzLm1pbkhlaWdodCAhPT0gdW5kZWZpbmVkID8gb3B0cy5taW5IZWlnaHQgOiAxMDBcblxuICB0aGlzLmJvdW5kc01pbldpZHRoID0gMFxuICB0aGlzLmJvdW5kc01pbkhlaWdodCA9IDBcblxuICB0aGlzLl9kZWx0YSA9IHt4OiAwLCBoOiAwfVxufVxuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhTZWxlY3Rpb24ucHJvdG90eXBlLCB7XG4gIHg6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuYm91bmRzLnggfSxcbiAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuYm91bmRzLnggPSB2IH1cbiAgfSxcbiAgeToge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5ib3VuZHMueSB9LFxuICAgIHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5ib3VuZHMueSA9IHYgfVxuICB9LFxuICB3aWR0aDoge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5ib3VuZHMud2lkdGggfSxcbiAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuYm91bmRzLndpZHRoID0gdiB9XG4gIH0sXG4gIGhlaWdodDoge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5ib3VuZHMuaGVpZ2h0IH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLmJvdW5kcy5oZWlnaHQgPSB2IH1cbiAgfSxcbiAgbGVmdDoge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5ib3VuZHMueCB9LFxuICAgIHNldDogZnVuY3Rpb24gKHYpIHtcbiAgICAgIHRoaXMuYm91bmRzLmxlZnQgPSB2XG4gICAgfVxuICB9LFxuICB0b3A6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuYm91bmRzLnkgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuYm91bmRzLnRvcCA9IHYgfVxuICB9LFxuICByaWdodDoge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5ib3VuZHMucmlnaHQgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuYm91bmRzLnJpZ2h0ID0gdiB9XG4gIH0sXG4gIGJvdHRvbToge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5ib3VuZHMuYm90dG9tIH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLmJvdW5kcy5ib3R0b20gPSB2IH1cbiAgfVxufSlcblxuU2VsZWN0aW9uLnByb3RvdHlwZS5nZXRCb3VuZHNMZW5ndGhGb3JSZWdpb24gPSBmdW5jdGlvbiAocmVnaW9uTGVuKSB7XG4gIHJldHVybiByZWdpb25MZW4gLyB0aGlzLnJlZ2lvbi53aWR0aCAqIHRoaXMud2lkdGhcbn1cblxuU2VsZWN0aW9uLnByb3RvdHlwZS5tb3ZlQnkgPSBmdW5jdGlvbiAoZHgsIGR5KSB7XG4gIHZhciBib3VuZHMgPSB0aGlzLmJvdW5kc1xuICB2YXIgdGFyZ2V0ID0gdGhpcy50YXJnZXRcblxuICBib3VuZHMueCA9IE1hdGgubWluKE1hdGgubWF4KGJvdW5kcy54ICsgZHgsIHRhcmdldC5ib3VuZHMueCksIHRhcmdldC5ib3VuZHMueCArIHRhcmdldC5ib3VuZHMud2lkdGggLSBib3VuZHMud2lkdGgpXG4gIGJvdW5kcy55ID0gTWF0aC5taW4oTWF0aC5tYXgoYm91bmRzLnkgKyBkeSwgdGFyZ2V0LmJvdW5kcy55KSwgdGFyZ2V0LmJvdW5kcy55ICsgdGFyZ2V0LmJvdW5kcy5oZWlnaHQgLSBib3VuZHMuaGVpZ2h0KVxuXG4gIHJldHVybiB0aGlzLnVwZGF0ZVJlZ2lvbkZyb21Cb3VuZHMoKVxufVxuXG5TZWxlY3Rpb24ucHJvdG90eXBlLnJlc2l6ZUJ5ID0gZnVuY3Rpb24gKGR4LCBkeSwgcCkge1xuICB2YXIgZGVsdGEgPSB0aGlzLl9kZWx0YVxuICB2YXIgYXNwZWN0UmF0aW8gPSB0aGlzLmFzcGVjdFJhdGlvXG4gIHZhciBib3VuZHMgPSB0aGlzLmJvdW5kc1xuICB2YXIgYm91bmRzTWluV2lkdGggPSB0aGlzLmJvdW5kc01pbldpZHRoXG4gIHZhciBib3VuZHNNaW5IZWlnaHQgPSB0aGlzLmJvdW5kc01pbkhlaWdodFxuICB2YXIgdGFyZ2V0ID0gdGhpcy50YXJnZXRcblxuICBmdW5jdGlvbiBjYWxjdWxhdGVEZWx0YSAoeCwgeSkge1xuICAgIGRlbHRhLndpZHRoID0gYm91bmRzLndpZHRoICsgeFxuICAgIGRlbHRhLmhlaWdodCA9IGJvdW5kcy5oZWlnaHQgKyB5XG5cbiAgICBkZWx0YS53aWR0aCA9IE1hdGgubWF4KGJvdW5kc01pbldpZHRoLCBkZWx0YS53aWR0aClcbiAgICBkZWx0YS5oZWlnaHQgPSBNYXRoLm1heChib3VuZHNNaW5IZWlnaHQsIGRlbHRhLmhlaWdodClcblxuICAgIGlmIChhc3BlY3RSYXRpbykge1xuICAgICAgaWYgKGRlbHRhLndpZHRoIC8gZGVsdGEuaGVpZ2h0ID4gYXNwZWN0UmF0aW8pIHtcbiAgICAgICAgZGVsdGEud2lkdGggPSBkZWx0YS5oZWlnaHQgKiBhc3BlY3RSYXRpb1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsdGEuaGVpZ2h0ID0gZGVsdGEud2lkdGggLyBhc3BlY3RSYXRpb1xuICAgICAgfVxuICAgIH1cblxuICAgIGRlbHRhLndpZHRoIC09IGJvdW5kcy53aWR0aFxuICAgIGRlbHRhLmhlaWdodCAtPSBib3VuZHMuaGVpZ2h0XG5cbiAgICByZXR1cm4gZGVsdGFcbiAgfVxuXG4gIGlmIChwWzBdID09PSAnbicpIHtcbiAgICBkeSA9IE1hdGgubWluKGR5LCB0aGlzLnRvcCAtIHRhcmdldC5ib3VuZHMudG9wKVxuICB9IGVsc2UgaWYgKHBbMF0gPT09ICdzJykge1xuICAgIGR5ID0gTWF0aC5taW4oZHksIHRhcmdldC5ib3VuZHMuYm90dG9tIC0gdGhpcy5ib3R0b20pXG4gIH1cblxuICBpZiAocFsxXSA9PT0gJ3cnKSB7XG4gICAgZHggPSBNYXRoLm1pbihkeCwgdGhpcy5sZWZ0IC0gdGFyZ2V0LmJvdW5kcy5sZWZ0KVxuICB9IGVsc2UgaWYgKHBbMV0gPT09ICdlJykge1xuICAgIGR4ID0gTWF0aC5taW4oZHgsIHRhcmdldC5ib3VuZHMucmlnaHQgLSB0aGlzLnJpZ2h0KVxuICB9XG5cbiAgZGVsdGEgPSBjYWxjdWxhdGVEZWx0YShkeCwgZHkpXG5cbiAgc3dpdGNoIChwKSB7XG4gICAgY2FzZSAnbncnOlxuICAgICAgdGhpcy5sZWZ0IC09IGRlbHRhLndpZHRoXG4gICAgICB0aGlzLnRvcCAtPSBkZWx0YS5oZWlnaHRcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnbmUnOlxuICAgICAgdGhpcy5yaWdodCArPSBkZWx0YS53aWR0aFxuICAgICAgdGhpcy50b3AgLT0gZGVsdGEuaGVpZ2h0XG4gICAgICBicmVha1xuICAgIGNhc2UgJ3N3JzpcbiAgICAgIHRoaXMubGVmdCAtPSBkZWx0YS53aWR0aFxuICAgICAgdGhpcy5ib3R0b20gKz0gZGVsdGEuaGVpZ2h0XG4gICAgICBicmVha1xuICAgIGNhc2UgJ3NlJzpcbiAgICAgIHRoaXMucmlnaHQgKz0gZGVsdGEud2lkdGhcbiAgICAgIHRoaXMuYm90dG9tICs9IGRlbHRhLmhlaWdodFxuICAgICAgYnJlYWtcbiAgfVxuXG4gIHJldHVybiB0aGlzLnVwZGF0ZVJlZ2lvbkZyb21Cb3VuZHMoKVxufVxuXG5TZWxlY3Rpb24ucHJvdG90eXBlLmF1dG9TaXplUmVnaW9uID0gZnVuY3Rpb24gKCkge1xuICB2YXIgdGFyZ2V0ID0gdGhpcy50YXJnZXRcbiAgdmFyIHJlZ2lvbiA9IHRoaXMucmVnaW9uXG4gIHZhciBhc3BlY3RSYXRpbyA9IHRoaXMuYXNwZWN0UmF0aW9cbiAgdmFyIGluaXRpYWxPcHRzID0gdGhpcy5pbml0aWFsT3B0c1xuICB2YXIgYmVmb3JlWCA9IHJlZ2lvbi54XG4gIHZhciBiZWZvcmVZID0gcmVnaW9uLnlcbiAgdmFyIGJlZm9yZVdpZHRoID0gcmVnaW9uLndpZHRoXG4gIHZhciBiZWZvcmVIZWlnaHQgPSByZWdpb24uaGVpZ2h0XG5cbiAgcmVnaW9uLnggPSBpbml0aWFsT3B0cy54ICE9PSB1bmRlZmluZWQgPyBpbml0aWFsT3B0cy54IDogMFxuICByZWdpb24ueSA9IGluaXRpYWxPcHRzLnkgIT09IHVuZGVmaW5lZCA/IGluaXRpYWxPcHRzLnkgOiAwXG5cbiAgcmVnaW9uLndpZHRoID0gaW5pdGlhbE9wdHMud2lkdGggIT09IHVuZGVmaW5lZCA/IGluaXRpYWxPcHRzLndpZHRoIDogdGFyZ2V0LmltYWdlLndpZHRoXG4gIHJlZ2lvbi5oZWlnaHQgPSBpbml0aWFsT3B0cy5oZWlnaHQgIT09IHVuZGVmaW5lZCA/IGluaXRpYWxPcHRzLmhlaWdodCA6IHRhcmdldC5pbWFnZS5oZWlnaHRcblxuICBpZiAoYXNwZWN0UmF0aW8pIHtcbiAgICBpZiAocmVnaW9uLndpZHRoIC8gcmVnaW9uLmhlaWdodCA+IGFzcGVjdFJhdGlvKSB7XG4gICAgICByZWdpb24ud2lkdGggPSByZWdpb24uaGVpZ2h0ICogYXNwZWN0UmF0aW9cbiAgICB9IGVsc2Uge1xuICAgICAgcmVnaW9uLmhlaWdodCA9IHJlZ2lvbi53aWR0aCAvIGFzcGVjdFJhdGlvXG4gICAgfVxuICB9XG5cbiAgaWYgKGluaXRpYWxPcHRzLnggPT09IHVuZGVmaW5lZCkge1xuICAgIHJlZ2lvbi5jZW50ZXJYID0gdGFyZ2V0LmltYWdlLndpZHRoICogMC41XG4gIH1cblxuICBpZiAoaW5pdGlhbE9wdHMueSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmVnaW9uLmNlbnRlclkgPSB0YXJnZXQuaW1hZ2UuaGVpZ2h0ICogMC41XG4gIH1cblxuICByZWdpb24ucm91bmQoKVxuXG4gIHRoaXMudXBkYXRlQm91bmRzRnJvbVJlZ2lvbigpXG5cbiAgcmV0dXJuIHJlZ2lvbi54ICE9PSBiZWZvcmVYIHx8XG4gICAgcmVnaW9uLnkgIT09IGJlZm9yZVkgfHxcbiAgICByZWdpb24ud2lkdGggIT09IGJlZm9yZVdpZHRoIHx8XG4gICAgcmVnaW9uLmhlaWdodCAhPT0gYmVmb3JlSGVpZ2h0XG59XG5cblNlbGVjdGlvbi5wcm90b3R5cGUudXBkYXRlUmVnaW9uRnJvbUJvdW5kcyA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHRhcmdldCA9IHRoaXMudGFyZ2V0XG4gIHZhciByZWdpb24gPSB0aGlzLnJlZ2lvblxuICB2YXIgYm91bmRzID0gdGhpcy5ib3VuZHNcbiAgdmFyIGJlZm9yZVggPSByZWdpb24ueFxuICB2YXIgYmVmb3JlWSA9IHJlZ2lvbi55XG4gIHZhciBiZWZvcmVXaWR0aCA9IHJlZ2lvbi53aWR0aFxuICB2YXIgYmVmb3JlSGVpZ2h0ID0gcmVnaW9uLmhlaWdodFxuXG4gIHJlZ2lvbi54ID0gdGFyZ2V0LmltYWdlLndpZHRoICogKGJvdW5kcy54IC0gdGFyZ2V0LmJvdW5kcy54KSAvIHRhcmdldC5ib3VuZHMud2lkdGhcbiAgcmVnaW9uLnkgPSB0YXJnZXQuaW1hZ2UuaGVpZ2h0ICogKGJvdW5kcy55IC0gdGFyZ2V0LmJvdW5kcy55KSAvIHRhcmdldC5ib3VuZHMuaGVpZ2h0XG5cbiAgcmVnaW9uLndpZHRoID0gdGFyZ2V0LmltYWdlLndpZHRoICogKGJvdW5kcy53aWR0aCAvIHRhcmdldC5ib3VuZHMud2lkdGgpXG4gIHJlZ2lvbi5oZWlnaHQgPSB0YXJnZXQuaW1hZ2UuaGVpZ2h0ICogKGJvdW5kcy5oZWlnaHQgLyB0YXJnZXQuYm91bmRzLmhlaWdodClcblxuICByZWdpb24ucm91bmQoKVxuXG4gIHJldHVybiByZWdpb24ueCAhPT0gYmVmb3JlWCB8fFxuICAgIHJlZ2lvbi55ICE9PSBiZWZvcmVZIHx8XG4gICAgcmVnaW9uLndpZHRoICE9PSBiZWZvcmVXaWR0aCB8fFxuICAgIHJlZ2lvbi5oZWlnaHQgIT09IGJlZm9yZUhlaWdodFxufVxuXG5TZWxlY3Rpb24ucHJvdG90eXBlLnVwZGF0ZUJvdW5kc0Zyb21SZWdpb24gPSBmdW5jdGlvbiAoKSB7XG4gIHZhciB0YXJnZXQgPSB0aGlzLnRhcmdldFxuICB2YXIgcmVnaW9uID0gdGhpcy5yZWdpb25cbiAgdmFyIGJvdW5kcyA9IHRoaXMuYm91bmRzXG5cbiAgaWYgKHRhcmdldC5pbWFnZSkge1xuICAgIGJvdW5kcy54ID0gdGFyZ2V0LmJvdW5kcy54ICsgdGFyZ2V0LmJvdW5kcy53aWR0aCAqIChyZWdpb24ueCAvIHRhcmdldC5pbWFnZS53aWR0aClcbiAgICBib3VuZHMueSA9IHRhcmdldC5ib3VuZHMueSArIHRhcmdldC5ib3VuZHMuaGVpZ2h0ICogKHJlZ2lvbi55IC8gdGFyZ2V0LmltYWdlLmhlaWdodClcbiAgICBib3VuZHMud2lkdGggPSB0YXJnZXQuYm91bmRzLndpZHRoICogKHJlZ2lvbi53aWR0aCAvIHRhcmdldC5pbWFnZS53aWR0aClcbiAgICBib3VuZHMuaGVpZ2h0ID0gdGFyZ2V0LmJvdW5kcy5oZWlnaHQgKiAocmVnaW9uLmhlaWdodCAvIHRhcmdldC5pbWFnZS5oZWlnaHQpXG4gIH1cblxuICB0aGlzLmJvdW5kc01pbldpZHRoID0gdGhpcy5nZXRCb3VuZHNMZW5ndGhGb3JSZWdpb24odGhpcy5taW5XaWR0aClcbiAgdGhpcy5ib3VuZHNNaW5IZWlnaHQgPSB0aGlzLmdldEJvdW5kc0xlbmd0aEZvclJlZ2lvbih0aGlzLm1pbkhlaWdodClcbn1cblxuU2VsZWN0aW9uLnByb3RvdHlwZS5pc0luc2lkZSA9IGZ1bmN0aW9uIChwb2ludCkge1xuICByZXR1cm4gdGhpcy5ib3VuZHMuaXNJbnNpZGUocG9pbnQpXG59XG5cblNlbGVjdGlvbi5jcmVhdGUgPSBmdW5jdGlvbiAob3B0cykge1xuICByZXR1cm4gbmV3IFNlbGVjdGlvbihvcHRzKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdGlvblxuIiwidmFyIElucHV0ID0gcmVxdWlyZSgnLi9JbnB1dC5qcycpXG52YXIgTGlzdGVuZXJzID0gcmVxdWlyZSgnLi9MaXN0ZW5lcnMuanMnKVxudmFyIFNlbGVjdGlvbiA9IHJlcXVpcmUoJy4vU2VsZWN0aW9uLmpzJylcbnZhciBSZWN0YW5nbGUgPSByZXF1aXJlKCcuL1JlY3RhbmdsZS5qcycpXG5cbnZhciBTZWxlY3Rpb25MYXllciA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gIG9wdHMgPSBvcHRzIHx8IHt9XG5cbiAgdGhpcy5zZWxlY3Rpb24gPSBTZWxlY3Rpb24uY3JlYXRlKG9wdHMpXG5cbiAgdGhpcy5wYXJlbnQgPSBvcHRzLnBhcmVudFxuICB0aGlzLmNvbnRleHQgPSBvcHRzLmNvbnRleHRcbiAgdGhpcy5jb250ZXh0LnNldExpbmVEYXNoID0gdGhpcy5jb250ZXh0LnNldExpbmVEYXNoIHx8IGZ1bmN0aW9uICgpIHt9XG4gIHRoaXMudGFyZ2V0ID0gb3B0cy50YXJnZXRcblxuICB2YXIgaGFuZGxlT3B0cyA9IG9wdHMuaGFuZGxlIHx8IHt9XG4gIGhhbmRsZU9wdHMubGVuZ3RoID0gaGFuZGxlT3B0cy5oYW5kbGVMZW5ndGggfHwgMzJcbiAgaGFuZGxlT3B0cy5kZXB0aCA9IGhhbmRsZU9wdHMuZGVwdGggfHwgM1xuICBoYW5kbGVPcHRzLnNpemUgPSBoYW5kbGVPcHRzLnNpemUgfHwgaGFuZGxlT3B0cy5sZW5ndGggKiAyXG4gIGhhbmRsZU9wdHMuY29sb3IgPSBoYW5kbGVPcHRzLmNvbG9yIHx8ICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDEuMCknXG4gIGhhbmRsZU9wdHMuYWN0aXZlQ29sb3IgPSBoYW5kbGVPcHRzLmFjdGl2ZUNvbG9yIHx8ICdyZ2JhKDI1NSwgMCwgMTYwLCAxLjApJ1xuICB0aGlzLmhhbmRsZU9wdHMgPSBoYW5kbGVPcHRzXG5cbiAgdGhpcy5saXN0ZW5lcnMgPSBMaXN0ZW5lcnMuY3JlYXRlKClcblxuICB0aGlzLmlucHV0ID0gSW5wdXQuY3JlYXRlKHRoaXMucGFyZW50LmNhbnZhcylcblxuICB0aGlzLmFjdGl2ZVJlZ2lvbiA9IG51bGxcbiAgdGhpcy5kb3duQm91bmRzID0gUmVjdGFuZ2xlLmNyZWF0ZSgwLCAwLCAwLCAwKVxuXG4gIHRoaXMuaW5wdXQub24oJ2Rvd24nLCB0aGlzLm9uSW5wdXREb3duLmJpbmQodGhpcykpXG4gIHRoaXMuaW5wdXQub24oJ21vdmUnLCB0aGlzLm9uSW5wdXRNb3ZlLmJpbmQodGhpcykpXG4gIHRoaXMuaW5wdXRcbiAgICAub24oJ3VwJywgdGhpcy5vbklucHV0VXBPckNhbmNlbC5iaW5kKHRoaXMpKVxuICAgIC5vbignY2FuY2VsJywgdGhpcy5vbklucHV0VXBPckNhbmNlbC5iaW5kKHRoaXMpKVxufVxuXG5TZWxlY3Rpb25MYXllci5jcmVhdGUgPSBmdW5jdGlvbiAob3B0cykge1xuICByZXR1cm4gbmV3IFNlbGVjdGlvbkxheWVyKG9wdHMpXG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5vbklucHV0RG93biA9IGZ1bmN0aW9uIChlKSB7XG4gIHZhciBoaXRSZWdpb24gPSB0aGlzLmZpbmRIaXRSZWdpb24oZSlcblxuICBpZiAoaGl0UmVnaW9uKSB7XG4gICAgZS5zb3VyY2UucHJldmVudERlZmF1bHQoKVxuICAgIHRoaXMuYWN0aXZlUmVnaW9uID0gaGl0UmVnaW9uXG4gICAgdGhpcy5zZXRDdXJzb3IoaGl0UmVnaW9uKVxuICAgIHRoaXMuZG93bkJvdW5kcy5jb3B5KHRoaXMuc2VsZWN0aW9uLmJvdW5kcylcbiAgICB0aGlzLmxpc3RlbmVycy5ub3RpZnkoJ3N0YXJ0JywgdGhpcy5zZWxlY3Rpb24ucmVnaW9uKVxuICB9XG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5vbklucHV0TW92ZSA9IGZ1bmN0aW9uIChlKSB7XG4gIHZhciBhY3RpdmVSZWdpb24gPSB0aGlzLmFjdGl2ZVJlZ2lvblxuXG4gIGlmICghYWN0aXZlUmVnaW9uKSB7XG4gICAgdmFyIGhpdFJlZ2lvbiA9IHRoaXMuZmluZEhpdFJlZ2lvbihlKVxuICAgIGlmIChoaXRSZWdpb24pIHtcbiAgICAgIGUuc291cmNlLnByZXZlbnREZWZhdWx0KClcbiAgICAgIHRoaXMuc2V0Q3Vyc29yKGhpdFJlZ2lvbilcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZXNldEN1cnNvcigpXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGUuc291cmNlLnByZXZlbnREZWZhdWx0KClcblxuICAgIHZhciBzZWxlY3Rpb24gPSB0aGlzLnNlbGVjdGlvblxuICAgIHZhciBoYXNDaGFuZ2VkID0gZmFsc2VcbiAgICBzZWxlY3Rpb24uYm91bmRzLmNvcHkodGhpcy5kb3duQm91bmRzKVxuXG4gICAgaWYgKGFjdGl2ZVJlZ2lvbiA9PT0gJ21vdmUnKSB7XG4gICAgICBoYXNDaGFuZ2VkID0gc2VsZWN0aW9uLm1vdmVCeShlLmR4LCBlLmR5KVxuICAgICAgaWYgKGhhc0NoYW5nZWQpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5lcnMubm90aWZ5KCdtb3ZlJywgdGhpcy5zZWxlY3Rpb24ucmVnaW9uKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZGlyID0gYWN0aXZlUmVnaW9uLnN1YnN0cmluZygwLCAyKVxuICAgICAgdmFyIGR4ID0gZGlyWzFdID09PSAndycgPyAtZS5keCA6IGUuZHhcbiAgICAgIHZhciBkeSA9IGRpclswXSA9PT0gJ24nID8gLWUuZHkgOiBlLmR5XG4gICAgICBoYXNDaGFuZ2VkID0gc2VsZWN0aW9uLnJlc2l6ZUJ5KGR4LCBkeSwgZGlyKVxuICAgICAgaWYgKGhhc0NoYW5nZWQpIHtcbiAgICAgICAgdGhpcy5saXN0ZW5lcnMubm90aWZ5KCdyZXNpemUnLCB0aGlzLnNlbGVjdGlvbi5yZWdpb24pXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGhhc0NoYW5nZWQpIHtcbiAgICAgIHRoaXMubGlzdGVuZXJzLm5vdGlmeSgnY2hhbmdlJywgdGhpcy5zZWxlY3Rpb24ucmVnaW9uKVxuICAgIH1cbiAgfVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUub25JbnB1dFVwT3JDYW5jZWwgPSBmdW5jdGlvbiAoZSkge1xuICBlLnNvdXJjZS5wcmV2ZW50RGVmYXVsdCgpXG4gIGlmICh0aGlzLmFjdGl2ZVJlZ2lvbikge1xuICAgIHRoaXMuYWN0aXZlUmVnaW9uID0gbnVsbFxuICAgIHRoaXMucmVzZXRDdXJzb3IoKVxuICAgIHRoaXMubGlzdGVuZXJzLm5vdGlmeSgnZW5kJywgdGhpcy5zZWxlY3Rpb24ucmVnaW9uKVxuICB9XG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5maW5kSGl0UmVnaW9uID0gZnVuY3Rpb24gKHBvaW50KSB7XG4gIHZhciBoaXRSZWdpb24gPSBudWxsXG4gIHZhciBjbG9zZXN0ID0gTnVtYmVyLk1BWF9WQUxVRVxuXG4gIHZhciBkID0gdGhpcy5pc1dpdGhpbk5vcnRoV2VzdEhhbmRsZShwb2ludClcbiAgaWYgKGQgIT09IGZhbHNlICYmIGQgPCBjbG9zZXN0KSB7XG4gICAgY2xvc2VzdCA9IGRcbiAgICBoaXRSZWdpb24gPSAnbnctcmVzaXplJ1xuICB9XG5cbiAgZCA9IHRoaXMuaXNXaXRoaW5Ob3J0aEVhc3RIYW5kbGUocG9pbnQpXG4gIGlmIChkICE9PSBmYWxzZSAmJiBkIDwgY2xvc2VzdCkge1xuICAgIGNsb3Nlc3QgPSBkXG4gICAgaGl0UmVnaW9uID0gJ25lLXJlc2l6ZSdcbiAgfVxuXG4gIGQgPSB0aGlzLmlzV2l0aGluU291dGhXZXN0SGFuZGxlKHBvaW50KVxuICBpZiAoZCAhPT0gZmFsc2UgJiYgZCA8IGNsb3Nlc3QpIHtcbiAgICBjbG9zZXN0ID0gZFxuICAgIGhpdFJlZ2lvbiA9ICdzdy1yZXNpemUnXG4gIH1cblxuICBkID0gdGhpcy5pc1dpdGhpblNvdXRoRWFzdEhhbmRsZShwb2ludClcbiAgaWYgKGQgIT09IGZhbHNlICYmIGQgPCBjbG9zZXN0KSB7XG4gICAgY2xvc2VzdCA9IGRcbiAgICBoaXRSZWdpb24gPSAnc2UtcmVzaXplJ1xuICB9XG5cbiAgaWYgKGhpdFJlZ2lvbikge1xuICAgIHJldHVybiBoaXRSZWdpb25cbiAgfSBlbHNlIGlmICh0aGlzLmlzV2l0aGluQm91bmRzKHBvaW50KSkge1xuICAgIHJldHVybiAnbW92ZSdcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbnVsbFxuICB9XG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuICB0aGlzLmxpc3RlbmVycy5vbih0eXBlLCBmbilcbiAgcmV0dXJuIHRoaXNcbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuICB0aGlzLmxpc3RlbmVycy5vZmYodHlwZSwgZm4pXG4gIHJldHVybiB0aGlzXG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5zZXRDdXJzb3IgPSBmdW5jdGlvbiAodHlwZSkge1xuICBpZiAodGhpcy5wYXJlbnQuY2FudmFzLnN0eWxlLmN1cnNvciAhPT0gdHlwZSkge1xuICAgIHRoaXMucGFyZW50LmNhbnZhcy5zdHlsZS5jdXJzb3IgPSB0eXBlXG4gIH1cbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLnJlc2V0Q3Vyc29yID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNldEN1cnNvcignYXV0bycpXG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5pc1dpdGhpblJhZGl1cyA9IGZ1bmN0aW9uIChheCwgYXksIGJ4LCBieSwgcikge1xuICB2YXIgdHNxID0gciAqIHJcbiAgdmFyIGR4ID0gYXggLSBieFxuICB2YXIgZHkgPSBheSAtIGJ5XG4gIHZhciBkc3EgPSBkeCAqIGR4ICsgZHkgKiBkeVxuICByZXR1cm4gKGRzcSA8IHRzcSkgPyBkc3EgOiBmYWxzZVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUuaXNXaXRoaW5Ob3J0aFdlc3RIYW5kbGUgPSBmdW5jdGlvbiAocG9pbnQpIHtcbiAgcmV0dXJuIHRoaXMuaXNXaXRoaW5SYWRpdXMocG9pbnQueCwgcG9pbnQueSwgdGhpcy5zZWxlY3Rpb24ubGVmdCwgdGhpcy5zZWxlY3Rpb24udG9wLCB0aGlzLmdldEhhbmRsZVJhZGl1cygpKVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUuaXNXaXRoaW5Ob3J0aEVhc3RIYW5kbGUgPSBmdW5jdGlvbiAocG9pbnQpIHtcbiAgcmV0dXJuIHRoaXMuaXNXaXRoaW5SYWRpdXMocG9pbnQueCwgcG9pbnQueSwgdGhpcy5zZWxlY3Rpb24ucmlnaHQsIHRoaXMuc2VsZWN0aW9uLnRvcCwgdGhpcy5nZXRIYW5kbGVSYWRpdXMoKSlcbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLmlzV2l0aGluU291dGhXZXN0SGFuZGxlID0gZnVuY3Rpb24gKHBvaW50KSB7XG4gIHJldHVybiB0aGlzLmlzV2l0aGluUmFkaXVzKHBvaW50LngsIHBvaW50LnksIHRoaXMuc2VsZWN0aW9uLmxlZnQsIHRoaXMuc2VsZWN0aW9uLmJvdHRvbSwgdGhpcy5nZXRIYW5kbGVSYWRpdXMoKSlcbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLmlzV2l0aGluU291dGhFYXN0SGFuZGxlID0gZnVuY3Rpb24gKHBvaW50KSB7XG4gIHJldHVybiB0aGlzLmlzV2l0aGluUmFkaXVzKHBvaW50LngsIHBvaW50LnksIHRoaXMuc2VsZWN0aW9uLnJpZ2h0LCB0aGlzLnNlbGVjdGlvbi5ib3R0b20sIHRoaXMuZ2V0SGFuZGxlUmFkaXVzKCkpXG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5pc1dpdGhpbkJvdW5kcyA9IGZ1bmN0aW9uIChwb2ludCkge1xuICByZXR1cm4gdGhpcy5zZWxlY3Rpb24uaXNJbnNpZGUocG9pbnQpXG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5nZXRIYW5kbGVSYWRpdXMgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLmhhbmRsZU9wdHMuc2l6ZSAvIDJcbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLm9uSW1hZ2VMb2FkID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLmF1dG9TaXplUmVnaW9uQW5kTm90aWZ5KClcbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLnNldEFzcGVjdFJhdGlvID0gZnVuY3Rpb24gKGFzcGVjdFJhdGlvKSB7XG4gIHRoaXMuc2VsZWN0aW9uLmFzcGVjdFJhdGlvID0gYXNwZWN0UmF0aW9cbiAgdGhpcy5hdXRvU2l6ZVJlZ2lvbkFuZE5vdGlmeSgpXG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5hdXRvU2l6ZVJlZ2lvbkFuZE5vdGlmeSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGhhc0NoYW5nZWQgPSB0aGlzLnNlbGVjdGlvbi5hdXRvU2l6ZVJlZ2lvbigpXG4gIGlmIChoYXNDaGFuZ2VkKSB7XG4gICAgdGhpcy5saXN0ZW5lcnMubm90aWZ5KCdjaGFuZ2UnLCB0aGlzLnNlbGVjdGlvbi5yZWdpb24pXG4gIH1cbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLnJldmFsaWRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc2VsZWN0aW9uLnVwZGF0ZUJvdW5kc0Zyb21SZWdpb24oKVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUucGFpbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc2VsZWN0aW9uLmJvdW5kc1B4LmNvcHkodGhpcy5zZWxlY3Rpb24uYm91bmRzKS5yb3VuZCgpXG5cbiAgdGhpcy5wYWludE91dHNpZGUoKVxuICB0aGlzLnBhaW50SW5zaWRlKClcbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLnBhaW50T3V0c2lkZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGJvdW5kcyA9IHRoaXMuc2VsZWN0aW9uLmJvdW5kc1B4XG4gIHZhciBnID0gdGhpcy5jb250ZXh0XG4gIHZhciB0YXJnZXQgPSB0aGlzLnRhcmdldFxuXG4gIHZhciB0bCA9IHRhcmdldC5ib3VuZHMueFxuICB2YXIgdHQgPSB0YXJnZXQuYm91bmRzLnlcbiAgdmFyIHR3ID0gdGFyZ2V0LmJvdW5kcy53aWR0aFxuICB2YXIgdHIgPSB0YXJnZXQuYm91bmRzLnJpZ2h0XG4gIHZhciB0YiA9IHRhcmdldC5ib3VuZHMuYm90dG9tXG5cbiAgdmFyIGJsID0gYm91bmRzLnhcbiAgdmFyIGJ0ID0gYm91bmRzLnlcbiAgdmFyIGJoID0gYm91bmRzLmhlaWdodFxuICB2YXIgYnIgPSBib3VuZHMucmlnaHRcbiAgdmFyIGJiID0gYm91bmRzLmJvdHRvbVxuXG4gIGcuZmlsbFN0eWxlID0gJ3JnYmEoMCwgMCwgMCwgMC41KSdcbiAgZy5maWxsUmVjdCh0bCwgdHQsIHR3LCBidCAtIHR0KVxuICBnLmZpbGxSZWN0KHRsLCBidCwgYmwgLSB0bCwgYmgpXG4gIGcuZmlsbFJlY3QoYnIsIGJ0LCB0ciAtIGJyLCBiaClcbiAgZy5maWxsUmVjdCh0bCwgYmIsIHR3LCB0YiAtIGJiKVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUucGFpbnRJbnNpZGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBnID0gdGhpcy5jb250ZXh0XG4gIHZhciBib3VuZHMgPSB0aGlzLnNlbGVjdGlvbi5ib3VuZHNQeFxuICB2YXIgYWN0aXZlUmVnaW9uID0gdGhpcy5hY3RpdmVSZWdpb25cbiAgdmFyIG9wdHMgPSB0aGlzLmhhbmRsZU9wdHNcblxuICB2YXIgbGVuZ3RoV2lkdGggPSBNYXRoLm1pbihvcHRzLmxlbmd0aCwgYm91bmRzLndpZHRoICogMC41KVxuICB2YXIgbGVuZ3RoSGVpZ2h0ID0gTWF0aC5taW4ob3B0cy5sZW5ndGgsIGJvdW5kcy5oZWlnaHQgKiAwLjUpXG4gIHZhciBkZXB0aCA9IG9wdHMuZGVwdGhcbiAgdmFyIGNvbG9yID0gb3B0cy5jb2xvclxuICB2YXIgYWN0aXZlQ29sb3IgPSBvcHRzLmFjdGl2ZUNvbG9yXG4gIHZhciBsZW5ndGggPSAwIC8vIFRPRE86IENIRUNLXG5cbiAgLy8gU2lkZXNcbiAgZy5maWxsU3R5bGUgPSAncmdiYSgyNTUsIDI1NSwgMjU1LCAwLjMpJ1xuICBnLmZpbGxSZWN0KGJvdW5kcy54ICsgbGVuZ3RoLCBib3VuZHMueSwgYm91bmRzLndpZHRoIC0gMiAqIGxlbmd0aCwgZGVwdGgpXG4gIGcuZmlsbFJlY3QoYm91bmRzLnggKyBsZW5ndGgsIGJvdW5kcy5ib3R0b20gLSBkZXB0aCwgYm91bmRzLndpZHRoIC0gMiAqIGxlbmd0aCwgZGVwdGgpXG4gIGcuZmlsbFJlY3QoYm91bmRzLngsIGJvdW5kcy55ICsgbGVuZ3RoLCBkZXB0aCwgYm91bmRzLmhlaWdodCAtIDIgKiBsZW5ndGgpXG4gIGcuZmlsbFJlY3QoYm91bmRzLnJpZ2h0IC0gZGVwdGgsIGJvdW5kcy55ICsgbGVuZ3RoLCBkZXB0aCwgYm91bmRzLmhlaWdodCAtIDIgKiBsZW5ndGgpXG5cbiAgLy8gSGFuZGxlc1xuICB2YXIgaXNNb3ZlUmVnaW9uID0gYWN0aXZlUmVnaW9uID09PSAnbW92ZSdcblxuICBnLmZpbGxTdHlsZSA9IGlzTW92ZVJlZ2lvbiB8fCBhY3RpdmVSZWdpb24gPT09ICdudy1yZXNpemUnID8gYWN0aXZlQ29sb3IgOiBjb2xvclxuICBnLmZpbGxSZWN0KGJvdW5kcy54LCBib3VuZHMueSwgbGVuZ3RoV2lkdGgsIGRlcHRoKVxuICBnLmZpbGxSZWN0KGJvdW5kcy54LCBib3VuZHMueSArIGRlcHRoLCBkZXB0aCwgbGVuZ3RoSGVpZ2h0IC0gZGVwdGgpXG5cbiAgZy5maWxsU3R5bGUgPSBpc01vdmVSZWdpb24gfHwgYWN0aXZlUmVnaW9uID09PSAnbmUtcmVzaXplJyA/IGFjdGl2ZUNvbG9yIDogY29sb3JcbiAgZy5maWxsUmVjdChib3VuZHMucmlnaHQgLSBsZW5ndGhXaWR0aCwgYm91bmRzLnksIGxlbmd0aFdpZHRoLCBkZXB0aClcbiAgZy5maWxsUmVjdChib3VuZHMucmlnaHQgLSBkZXB0aCwgYm91bmRzLnkgKyBkZXB0aCwgZGVwdGgsIGxlbmd0aEhlaWdodCAtIGRlcHRoKVxuXG4gIGcuZmlsbFN0eWxlID0gaXNNb3ZlUmVnaW9uIHx8IGFjdGl2ZVJlZ2lvbiA9PT0gJ3N3LXJlc2l6ZScgPyBhY3RpdmVDb2xvciA6IGNvbG9yXG4gIGcuZmlsbFJlY3QoYm91bmRzLngsIGJvdW5kcy5ib3R0b20gLSBkZXB0aCwgbGVuZ3RoV2lkdGgsIGRlcHRoKVxuICBnLmZpbGxSZWN0KGJvdW5kcy54LCBib3VuZHMuYm90dG9tIC0gbGVuZ3RoSGVpZ2h0LCBkZXB0aCwgbGVuZ3RoSGVpZ2h0IC0gZGVwdGgpXG5cbiAgZy5maWxsU3R5bGUgPSBpc01vdmVSZWdpb24gfHwgYWN0aXZlUmVnaW9uID09PSAnc2UtcmVzaXplJyA/IGFjdGl2ZUNvbG9yIDogY29sb3JcbiAgZy5maWxsUmVjdChib3VuZHMucmlnaHQgLSBsZW5ndGhXaWR0aCwgYm91bmRzLmJvdHRvbSAtIGRlcHRoLCBsZW5ndGhXaWR0aCwgZGVwdGgpXG4gIGcuZmlsbFJlY3QoYm91bmRzLnJpZ2h0IC0gZGVwdGgsIGJvdW5kcy5ib3R0b20gLSBsZW5ndGhIZWlnaHQsIGRlcHRoLCBsZW5ndGhIZWlnaHQgLSBkZXB0aClcblxuICAvLyBHdWlkZXNcbiAgZy5zdHJva2VTdHlsZSA9ICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNiknXG4gIGcuc2V0TGluZURhc2goWzIsIDNdKVxuICBnLmxpbmVXaWR0aCA9IDFcbiAgZy5iZWdpblBhdGgoKVxuICB2YXIgYnczID0gYm91bmRzLndpZHRoIC8gM1xuICB2YXIgYmgzID0gYm91bmRzLmhlaWdodCAvIDNcbiAgZy5tb3ZlVG8oYm91bmRzLnggKyBidzMsIGJvdW5kcy55KVxuICBnLmxpbmVUbyhib3VuZHMueCArIGJ3MywgYm91bmRzLnkgKyBib3VuZHMuaGVpZ2h0KVxuICBnLm1vdmVUbyhib3VuZHMueCArIDIgKiBidzMsIGJvdW5kcy55KVxuICBnLmxpbmVUbyhib3VuZHMueCArIDIgKiBidzMsIGJvdW5kcy55ICsgYm91bmRzLmhlaWdodClcbiAgZy5tb3ZlVG8oYm91bmRzLngsIGJvdW5kcy55ICsgYmgzKVxuICBnLmxpbmVUbyhib3VuZHMueCArIGJvdW5kcy53aWR0aCwgYm91bmRzLnkgKyBiaDMpXG4gIGcubW92ZVRvKGJvdW5kcy54LCBib3VuZHMueSArIDIgKiBiaDMpXG4gIGcubGluZVRvKGJvdW5kcy54ICsgYm91bmRzLndpZHRoLCBib3VuZHMueSArIDIgKiBiaDMpXG4gIGcuc3Ryb2tlKClcbiAgZy5jbG9zZVBhdGgoKVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdGlvbkxheWVyXG4iLCIvLyBodHRwOi8vc25pcHBldHJlcG8uY29tL3NuaXBwZXRzL2Jhc2ljLXZhbmlsbGEtamF2YXNjcmlwdC10aHJvdHRsaW5nZGVib3VuY2VcbmZ1bmN0aW9uIGRlYm91bmNlIChmbiwgd2FpdCwgaW1tZWRpYXRlKSB7XG4gIHZhciB0aW1lb3V0XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNvbnRleHQgPSB0aGlzXG4gICAgdmFyIGFyZ3MgPSBhcmd1bWVudHNcbiAgICBjbGVhclRpbWVvdXQodGltZW91dClcbiAgICB0aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICB0aW1lb3V0ID0gbnVsbFxuICAgICAgaWYgKCFpbW1lZGlhdGUpIGZuLmFwcGx5KGNvbnRleHQsIGFyZ3MpXG4gICAgfSwgd2FpdClcbiAgICBpZiAoaW1tZWRpYXRlICYmICF0aW1lb3V0KSBmbi5hcHBseShjb250ZXh0LCBhcmdzKVxuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRlYm91bmNlXG4iLCJ2YXIgZGVib3VuY2UgPSByZXF1aXJlKCcuL2RlYm91bmNlLmpzJylcbnZhciBCYWNrZ3JvdW5kTGF5ZXIgPSByZXF1aXJlKCcuL0JhY2tncm91bmRMYXllci5qcycpXG52YXIgSW1hZ2VMYXllciA9IHJlcXVpcmUoJy4vSW1hZ2VMYXllci5qcycpXG52YXIgU2VsZWN0aW9uTGF5ZXIgPSByZXF1aXJlKCcuL1NlbGVjdGlvbkxheWVyLmpzJylcbnZhciBJbWFnZSA9IHJlcXVpcmUoJy4vSW1hZ2UuanMnKVxudmFyIExpc3RlbmVycyA9IHJlcXVpcmUoJy4vTGlzdGVuZXJzLmpzJylcblxudmFyIERFRkFVTFRfQ0FOVkFTX1dJRFRIID0gNDAwXG52YXIgREVGQVVMVF9DQU5WQVNfSEVJR0hUID0gMzAwXG5cbnZhciBDcm9wID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgdGhpcy5wYXJlbnQgPSB0eXBlb2Ygb3B0cy5wYXJlbnQgPT09ICdzdHJpbmcnID8gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihvcHRzLnBhcmVudCkgOiBvcHRzLnBhcmVudFxuXG4gIHRoaXMuY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJylcbiAgdGhpcy5jb250ZXh0ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICB0aGlzLmJvdW5kc09wdHMgPSBvcHRzLmJvdW5kcyB8fCB7d2lkdGg6ICcxMDAlJywgaGVpZ2h0OiAnYXV0byd9XG4gIG9wdHMuc2VsZWN0aW9uID0gb3B0cy5zZWxlY3Rpb24gfHwge31cbiAgdGhpcy5kZWJvdW5jZVJlc2l6ZSA9IG9wdHMuZGVib3VuY2VSZXNpemUgIT09IHVuZGVmaW5lZCA/IG9wdHMuZGVib3VuY2VSZXNpemUgOiB0cnVlXG4gIHRoaXMubGlzdGVuZXJzID0gTGlzdGVuZXJzLmNyZWF0ZSgpXG5cbiAgdGhpcy5wYXJlbnQuYXBwZW5kQ2hpbGQodGhpcy5jYW52YXMpXG5cbiAgdGhpcy5iYWNrZ3JvdW5kTGF5ZXIgPSBCYWNrZ3JvdW5kTGF5ZXIuY3JlYXRlKHtcbiAgICBwYXJlbnQ6IHRoaXMsXG4gICAgY29udGV4dDogdGhpcy5jb250ZXh0LFxuICAgIGNvbG9yczogb3B0cy5iYWNrZ3JvdW5kQ29sb3JzIHx8IFsnI2ZmZicsICcjZjBmMGYwJ11cbiAgfSlcblxuICB0aGlzLmltYWdlTGF5ZXIgPSBJbWFnZUxheWVyLmNyZWF0ZSh7XG4gICAgcGFyZW50OiB0aGlzLFxuICAgIGNvbnRleHQ6IHRoaXMuY29udGV4dCxcbiAgICBpbWFnZTogdGhpcy5pbWFnZVxuICB9KVxuXG4gIHRoaXMuc2VsZWN0aW9uTGF5ZXIgPSBTZWxlY3Rpb25MYXllci5jcmVhdGUoe1xuICAgIHBhcmVudDogdGhpcyxcbiAgICBjb250ZXh0OiB0aGlzLmNvbnRleHQsXG4gICAgdGFyZ2V0OiB0aGlzLmltYWdlTGF5ZXIsXG4gICAgYXNwZWN0UmF0aW86IG9wdHMuc2VsZWN0aW9uLmFzcGVjdFJhdGlvLFxuICAgIG1pbldpZHRoOiBvcHRzLnNlbGVjdGlvbi5taW5XaWR0aCxcbiAgICBtaW5IZWlnaHQ6IG9wdHMuc2VsZWN0aW9uLm1pbkhlaWdodCxcbiAgICB4OiBvcHRzLnNlbGVjdGlvbi54LFxuICAgIHk6IG9wdHMuc2VsZWN0aW9uLnksXG4gICAgd2lkdGg6IG9wdHMuc2VsZWN0aW9uLndpZHRoLFxuICAgIGhlaWdodDogb3B0cy5zZWxlY3Rpb24uaGVpZ2h0LFxuICAgIGhhbmRsZToge1xuICAgICAgY29sb3I6IG9wdHMuc2VsZWN0aW9uLmNvbG9yLFxuICAgICAgYWN0aXZlQ29sb3I6IG9wdHMuc2VsZWN0aW9uLmFjdGl2ZUNvbG9yXG4gICAgfVxuICB9KVxuXG4gIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmxpc3RlbmVyc1xuICB2YXIgcGFpbnQgPSB0aGlzLnBhaW50LmJpbmQodGhpcylcblxuICB0aGlzLnNlbGVjdGlvbkxheWVyXG4gICAgLm9uKFxuICAgICAgJ3N0YXJ0JyxcbiAgICAgIGZ1bmN0aW9uIChyZWdpb24pIHtcbiAgICAgICAgcGFpbnQoKVxuICAgICAgICBsaXN0ZW5lcnMubm90aWZ5KCdzdGFydCcsIHJlZ2lvbilcbiAgICAgIH1cbiAgICApXG4gICAgLm9uKFxuICAgICAgJ21vdmUnLFxuICAgICAgZnVuY3Rpb24gKHJlZ2lvbikge1xuICAgICAgICBsaXN0ZW5lcnMubm90aWZ5KCdtb3ZlJywgcmVnaW9uKVxuICAgICAgfVxuICAgIClcbiAgICAub24oXG4gICAgICAncmVzaXplJyxcbiAgICAgIGZ1bmN0aW9uIChyZWdpb24pIHtcbiAgICAgICAgbGlzdGVuZXJzLm5vdGlmeSgncmVzaXplJywgcmVnaW9uKVxuICAgICAgfVxuICAgIClcbiAgICAub24oXG4gICAgICAnY2hhbmdlJyxcbiAgICAgIGZ1bmN0aW9uIChyZWdpb24pIHtcbiAgICAgICAgcGFpbnQoKVxuICAgICAgICBsaXN0ZW5lcnMubm90aWZ5KCdjaGFuZ2UnLCByZWdpb24pXG4gICAgICB9XG4gICAgKVxuICAgIC5vbihcbiAgICAgICdlbmQnLFxuICAgICAgZnVuY3Rpb24gKHJlZ2lvbikge1xuICAgICAgICBwYWludCgpXG4gICAgICAgIGxpc3RlbmVycy5ub3RpZnkoJ2VuZCcsIHJlZ2lvbilcbiAgICAgIH1cbiAgICApXG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgJ3Jlc2l6ZScsXG4gICAgdGhpcy5kZWJvdW5jZVJlc2l6ZVxuICAgICAgPyBkZWJvdW5jZSh0aGlzLnJldmFsaWRhdGVBbmRQYWludC5iaW5kKHRoaXMpLCAxMDApXG4gICAgICA6IHRoaXMucmV2YWxpZGF0ZUFuZFBhaW50LmJpbmQodGhpcylcbiAgKVxuXG4gIHRoaXMuc2V0SW1hZ2Uob3B0cy5pbWFnZSlcblxuICB0aGlzLnJldmFsaWRhdGVBbmRQYWludCgpXG59XG5cbkNyb3AuY3JlYXRlID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgcmV0dXJuIG5ldyBDcm9wKG9wdHMpXG59XG5cbkNyb3AucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gIHRoaXMubGlzdGVuZXJzLm9uKHR5cGUsIGZuKVxuICByZXR1cm4gdGhpc1xufVxuXG5Dcm9wLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbiAodHlwZSwgZm4pIHtcbiAgdGhpcy5saXN0ZW5lcnMub2ZmKHR5cGUsIGZuKVxuICByZXR1cm4gdGhpc1xufVxuXG5Dcm9wLnByb3RvdHlwZS5yZXZhbGlkYXRlQW5kUGFpbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMucmV2YWxpZGF0ZSgpXG4gIHRoaXMucGFpbnQoKVxufVxuXG5Dcm9wLnByb3RvdHlwZS5yZXZhbGlkYXRlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgcGFyZW50ID0gdGhpcy5wYXJlbnRcbiAgdmFyIGltYWdlID0gdGhpcy5pbWFnZVxuXG4gIHZhciBib3VuZHNXaWR0aCA9IHRoaXMuYm91bmRzT3B0cy53aWR0aFxuICB2YXIgYm91bmRzSGVpZ2h0ID0gdGhpcy5ib3VuZHNPcHRzLmhlaWdodFxuICB2YXIgd2lkdGggPSAwXG4gIHZhciBoZWlnaHQgPSAwXG5cbiAgaWYgKGlzSW50ZWdlcihib3VuZHNXaWR0aCkpIHtcbiAgICB3aWR0aCA9IGJvdW5kc1dpZHRoXG4gIH0gZWxzZSBpZiAocGFyZW50ICYmIGlzUGVyY2VudChib3VuZHNXaWR0aCkpIHtcbiAgICB3aWR0aCA9IE1hdGgucm91bmQocGFyZW50LmNsaWVudFdpZHRoICogZ2V0UGVyY2VudChib3VuZHNXaWR0aCkgLyAxMDApXG4gIH0gZWxzZSB7XG4gICAgd2lkdGggPSBERUZBVUxUX0NBTlZBU19XSURUSFxuICB9XG5cbiAgaWYgKGlzSW50ZWdlcihib3VuZHNIZWlnaHQpKSB7XG4gICAgaGVpZ2h0ID0gYm91bmRzSGVpZ2h0XG4gIH0gZWxzZSBpZiAoaXNQZXJjZW50KGJvdW5kc0hlaWdodCkpIHtcbiAgICBoZWlnaHQgPSBNYXRoLnJvdW5kKHdpZHRoICogZ2V0UGVyY2VudChib3VuZHNIZWlnaHQpIC8gMTAwKVxuICB9IGVsc2UgaWYgKGltYWdlICYmIGltYWdlLmhhc0xvYWRlZCAmJiBpc0F1dG8oYm91bmRzSGVpZ2h0KSkge1xuICAgIGhlaWdodCA9IE1hdGguZmxvb3Iod2lkdGggLyBpbWFnZS5nZXRBc3BlY3RSYXRpbygpKVxuICB9IGVsc2Uge1xuICAgIGhlaWdodCA9IERFRkFVTFRfQ0FOVkFTX0hFSUdIVFxuICB9XG5cbiAgdGhpcy5yZXNpemVDYW52YXMod2lkdGgsIGhlaWdodClcblxuICB0aGlzLmJhY2tncm91bmRMYXllci5yZXZhbGlkYXRlKClcbiAgdGhpcy5pbWFnZUxheWVyLnJldmFsaWRhdGUoKVxuICB0aGlzLnNlbGVjdGlvbkxheWVyLnJldmFsaWRhdGUoKVxufVxuXG5Dcm9wLnByb3RvdHlwZS5wYWludCA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGcgPSB0aGlzLmNvbnRleHRcblxuICBnLnNhdmUoKVxuICBnLnNjYWxlKHRoaXMucmF0aW8sIHRoaXMucmF0aW8pXG5cbiAgdGhpcy5iYWNrZ3JvdW5kTGF5ZXIucGFpbnQoKVxuXG4gIGlmICh0aGlzLmltYWdlICYmIHRoaXMuaW1hZ2UuaGFzTG9hZGVkKSB7XG4gICAgdGhpcy5pbWFnZUxheWVyLnBhaW50KClcbiAgICB0aGlzLnNlbGVjdGlvbkxheWVyLnBhaW50KClcbiAgfVxuXG4gIGcucmVzdG9yZSgpXG59XG5cbkNyb3AucHJvdG90eXBlLnJlc2l6ZUNhbnZhcyA9IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0KSB7XG4gIHZhciBjb250ZXh0ID0gdGhpcy5jb250ZXh0XG4gIHZhciBjYW52YXMgPSB0aGlzLmNhbnZhc1xuICB0aGlzLnJhdGlvID0gMVxuXG4gIGlmICghY29udGV4dC53ZWJraXRCYWNraW5nU3RvcmVQaXhlbFJhdGlvKSB7XG4gICAgdGhpcy5yYXRpbyA9IHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvIHx8IDFcbiAgfVxuXG4gIHRoaXMud2lkdGggPSB3aWR0aFxuICB0aGlzLmhlaWdodCA9IGhlaWdodFxuXG4gIGNhbnZhcy53aWR0aCA9IHRoaXMud2lkdGggKiB0aGlzLnJhdGlvXG4gIGNhbnZhcy5oZWlnaHQgPSB0aGlzLmhlaWdodCAqIHRoaXMucmF0aW9cbn1cblxuQ3JvcC5wcm90b3R5cGUuc2V0SW1hZ2UgPSBmdW5jdGlvbiAoc291cmNlKSB7XG4gIHZhciBpbWFnZSA9IEltYWdlLmNyZWF0ZShzb3VyY2UpXG4gICAgLm9uKFxuICAgICAgJ2xvYWQnLFxuICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnNlbGVjdGlvbkxheWVyLm9uSW1hZ2VMb2FkKClcbiAgICAgICAgdGhpcy5yZXZhbGlkYXRlQW5kUGFpbnQoKVxuICAgICAgfS5iaW5kKHRoaXMpXG4gICAgKVxuICAgIC5vbihcbiAgICAgICdlcnJvcicsXG4gICAgICBmdW5jdGlvbiAoZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKGUpXG4gICAgICB9XG4gICAgKVxuXG4gIHRoaXMuaW1hZ2VMYXllci5zZXRJbWFnZShpbWFnZSlcbiAgdGhpcy5pbWFnZSA9IGltYWdlXG4gIHRoaXMucmV2YWxpZGF0ZUFuZFBhaW50KClcbn1cblxuQ3JvcC5wcm90b3R5cGUuZ2V0SW1hZ2UgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiB0aGlzLmltYWdlXG59XG5cbkNyb3AucHJvdG90eXBlLnNldEFzcGVjdFJhdGlvID0gZnVuY3Rpb24gKGFzcGVjdFJhdGlvKSB7XG4gIHRoaXMuc2VsZWN0aW9uTGF5ZXIuc2V0QXNwZWN0UmF0aW8oYXNwZWN0UmF0aW8pXG4gIHRoaXMucmV2YWxpZGF0ZUFuZFBhaW50KClcbn1cblxuQ3JvcC5wcm90b3R5cGUuc2V0Qm91bmRzID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgdGhpcy5ib3VuZHNPcHRzID0gb3B0c1xuICB0aGlzLnJldmFsaWRhdGVBbmRQYWludCgpXG59XG5cbkNyb3AucHJvdG90eXBlLnNldEJhY2tncm91bmRDb2xvcnMgPSBmdW5jdGlvbiAoY29sb3JzKSB7XG4gIHRoaXMuYmFja2dyb3VuZExheWVyLnNldENvbG9ycyhjb2xvcnMpXG4gIHRoaXMucmV2YWxpZGF0ZUFuZFBhaW50KClcbn1cblxuQ3JvcC5wcm90b3R5cGUuZGlzcG9zZSA9IG5vb3BcblxuZnVuY3Rpb24gbm9vcCAoKSB7fTtcblxuZnVuY3Rpb24gaXNQZXJjZW50ICh2KSB7XG4gIGlmICh0eXBlb2YgdiAhPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGlmICh2Lmxlbmd0aCA8IDEpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGlmICh2W3YubGVuZ3RoIC0gMV0gPT09ICclJykge1xuICAgIHJldHVybiB0cnVlXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0UGVyY2VudCAodikge1xuICBpZiAoIWlzUGVyY2VudCh2KSkge1xuICAgIHJldHVybiAwXG4gIH1cblxuICByZXR1cm4gdi5zbGljZSgwLCAtMSlcbn1cblxuZnVuY3Rpb24gaXNBdXRvICh2KSB7XG4gIHJldHVybiB2ID09PSAnYXV0bydcbn1cblxuZnVuY3Rpb24gaXNJbnRlZ2VyICh2KSB7XG4gIHJldHVybiB0eXBlb2YgdiA9PT0gJ251bWJlcicgJiYgTWF0aC5yb3VuZCh2KSA9PT0gdlxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IENyb3BcbiIsIi8qXG4gKiBNb2RpZmllZCB2ZXJzaW9uIG9mIGh0dHA6Ly9naXRodWIuY29tL2Rlc2FuZHJvL2ltYWdlc2xvYWRlZCB2Mi4xLjFcbiAqIE1JVCBMaWNlbnNlLlxuICovXG5cbnZhciBCTEFOSyA9ICdkYXRhOmltYWdlL2dpZjtiYXNlNjQsUjBsR09EbGhBUUFCQUlBQUFBQUFBUC8vL3l3QUFBQUFBUUFCQUFBQ0FVd0FPdz09J1xuXG5mdW5jdGlvbiBsb2FkSW1hZ2UgKGltYWdlLCBjYWxsYmFjaykge1xuICBpZiAoIWltYWdlLm5vZGVOYW1lIHx8IGltYWdlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgIT09ICdpbWcnKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignRmlyc3QgYXJndW1lbnQgbXVzdCBhbiBpbWFnZSBlbGVtZW50JykpXG4gIH1cblxuICBpZiAoaW1hZ2Uuc3JjICYmIGltYWdlLmNvbXBsZXRlICYmIGltYWdlLm5hdHVyYWxXaWR0aCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHRydWUpXG4gIH1cblxuICBpbWFnZS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24gKCkge1xuICAgIGNhbGxiYWNrKG51bGwsIGZhbHNlKVxuICB9KVxuXG4gIGltYWdlLmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgZnVuY3Rpb24gKGUpIHtcbiAgICBjYWxsYmFjayhuZXcgRXJyb3IoJ0ZhaWxlZCB0byBsb2FkIGltYWdlIFxcJycgKyAoaW1hZ2Uuc3JjIHx8ICcnKSArICdcXCcnKSlcbiAgfSlcblxuICBpZiAoaW1hZ2UuY29tcGxldGUpIHtcbiAgICB2YXIgc3JjID0gaW1hZ2Uuc3JjXG4gICAgaW1hZ2Uuc3JjID0gQkxBTktcbiAgICBpbWFnZS5zcmMgPSBzcmNcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGxvYWRJbWFnZVxuIl19

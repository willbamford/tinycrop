(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Crop = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var BackgroundLayer = function (opts) {
  opts = opts || {}

  this.colors = opts.colors

  this.parent = opts.parent
  this.context = opts.context
  this.isDirty = true
}

BackgroundLayer.create = function (opts) {
  return new BackgroundLayer(opts)
}

BackgroundLayer.prototype.revalidate = function () {
  this.isDirty = true
}

BackgroundLayer.prototype.setColors = function (colors) {
  this.colors = colors
}

BackgroundLayer.prototype.paint = function () {
  if (this.isDirty) {
    var parent = this.parent
    var g = this.context

    if (!this.colors || !this.colors.length) {
      g.clearRect(0, 0, parent.width, parent.height)
    } else {
      g.fillStyle = this.colors[0]
      g.fillRect(0, 0, parent.width, parent.height)
    }

    if (this.colors && this.colors.length > 1) {
      var h = parent.height

      var cols = 32
      var size = parent.width / cols
      var rows = Math.ceil(h / size)

      g.fillStyle = this.colors[1]
      for (var i = 0; i < cols; i += 1) {
        for (var j = 0; j < rows; j += 1) {
          if ((i + j) % 2 === 0) {
            g.fillRect(i * size, j * size, size, size)
          }
        }
      }
    }

    this.isDirty = false
  }
}

module.exports = BackgroundLayer

},{}],2:[function(require,module,exports){
var debounce = require('./debounce.js')
var BackgroundLayer = require('./BackgroundLayer.js')
var ImageLayer = require('./ImageLayer.js')
var SelectionLayer = require('./SelectionLayer.js')
var Image = require('./Image.js')
var Listeners = require('./Listeners.js')

var DEFAULT_CANVAS_WIDTH = 400
var DEFAULT_CANVAS_HEIGHT = 300

var Crop = function (opts) {
  this.parent = typeof opts.parent === 'string' ? document.querySelector(opts.parent) : opts.parent

  this.canvas = document.createElement('canvas')
  this.context = this.canvas.getContext('2d')
  this.boundsOpts = opts.bounds || {width: '100%', height: 'auto'}
  opts.selection = opts.selection || {}
  this.debounceResize = opts.debounceResize !== undefined ? opts.debounceResize : true
  this.listeners = Listeners.create()

  this.parent.appendChild(this.canvas)

  this.backgroundLayer = BackgroundLayer.create({
    parent: this,
    context: this.context,
    colors: opts.backgroundColors || ['#fff', '#f0f0f0']
  })

  this.imageLayer = ImageLayer.create({
    parent: this,
    context: this.context,
    image: this.image
  })

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
  })

  var listeners = this.listeners
  var paint = this.paint.bind(this)

  this.selectionLayer
    .on(
      'start',
      function (region) {
        paint()
        listeners.notify('start', region)
      }
    )
    .on(
      'move',
      function (region) {
        listeners.notify('move', region)
      }
    )
    .on(
      'resize',
      function (region) {
        listeners.notify('resize', region)
      }
    )
    .on(
      'change',
      function (region) {
        paint()
        listeners.notify('change', region)
      }
    )
    .on(
      'end',
      function (region) {
        paint()
        listeners.notify('end', region)
      }
    )

  window.addEventListener(
    'resize',
    this.debounceResize
      ? debounce(this.revalidateAndPaint.bind(this), 100)
      : this.revalidateAndPaint.bind(this)
  )

  this.setImage(opts.image)

  this.revalidateAndPaint()
}

Crop.create = function (opts) {
  return new Crop(opts)
}

Crop.prototype.on = function (type, fn) {
  this.listeners.on(type, fn)
  return this
}

Crop.prototype.off = function (type, fn) {
  this.listeners.off(type, fn)
  return this
}

Crop.prototype.revalidateAndPaint = function () {
  this.revalidate()
  this.paint()
}

Crop.prototype.revalidate = function () {
  var parent = this.parent
  var image = this.image

  var boundsWidth = this.boundsOpts.width
  var boundsHeight = this.boundsOpts.height
  var width = 0
  var height = 0

  if (isInteger(boundsWidth)) {
    width = boundsWidth
  } else if (parent && isPercent(boundsWidth)) {
    width = Math.round(parent.clientWidth * getPercent(boundsWidth) / 100)
  } else {
    width = DEFAULT_CANVAS_WIDTH
  }

  if (isInteger(boundsHeight)) {
    height = boundsHeight
  } else if (isPercent(boundsHeight)) {
    height = Math.round(width * getPercent(boundsHeight) / 100)
  } else if (image && image.hasLoaded && isAuto(boundsHeight)) {
    height = Math.floor(width / image.getAspectRatio())
  } else {
    height = DEFAULT_CANVAS_HEIGHT
  }

  this.resizeCanvas(width, height)

  this.backgroundLayer.revalidate()
  this.imageLayer.revalidate()
  this.selectionLayer.revalidate()
}

Crop.prototype.paint = function () {
  var g = this.context

  g.save()
  g.scale(this.ratio, this.ratio)

  this.backgroundLayer.paint()

  if (this.image && this.image.hasLoaded) {
    this.imageLayer.paint()
    this.selectionLayer.paint()
  }

  g.restore()
}

Crop.prototype.resizeCanvas = function (width, height) {
  var context = this.context
  var canvas = this.canvas
  this.ratio = 1

  if (!context.webkitBackingStorePixelRatio) {
    this.ratio = window.devicePixelRatio || 1
  }

  this.width = width
  this.height = height

  canvas.width = this.width * this.ratio
  canvas.height = this.height * this.ratio
}

Crop.prototype.setImage = function (source) {
  var image = Image.create(source)
    .on(
      'load',
      function () {
        this.selectionLayer.onImageLoad()
        this.revalidateAndPaint()
      }.bind(this)
    )
    .on(
      'error',
      function (e) {
        console.error(e)
      }
    )

  this.imageLayer.setImage(image)
  this.image = image
  this.revalidateAndPaint()
}

Crop.prototype.getImage = function () {
  return this.image
}

Crop.prototype.setAspectRatio = function (aspectRatio) {
  this.selectionLayer.setAspectRatio(aspectRatio)
  this.revalidateAndPaint()
}

Crop.prototype.setBounds = function (opts) {
  this.boundsOpts = opts
  this.revalidateAndPaint()
}

Crop.prototype.setBackgroundColors = function (colors) {
  this.backgroundLayer.setColors(colors)
  this.revalidateAndPaint()
}

Crop.prototype.dispose = noop

function noop () {};

function isPercent (v) {
  if (typeof v !== 'string') {
    return false
  }

  if (v.length < 1) {
    return false
  }

  if (v[v.length - 1] === '%') {
    return true
  }
}

function getPercent (v) {
  if (!isPercent(v)) {
    return 0
  }

  return v.slice(0, -1)
}

function isAuto (v) {
  return v === 'auto'
}

function isInteger (v) {
  return typeof v === 'number' && Math.round(v) === v
}

module.exports = Crop

},{"./BackgroundLayer.js":1,"./Image.js":3,"./ImageLayer.js":4,"./Listeners.js":6,"./SelectionLayer.js":9,"./debounce.js":10}],3:[function(require,module,exports){
var loaded = require('./imageLoaded.js')
var Listeners = require('./Listeners.js')

var Image = function (source) {
  this.width = 0
  this.height = 0

  this.hasLoaded = false
  this.src = null

  this.listeners = Listeners.create()

  if (!source) {
    return
  }

  if (typeof source === 'string') {
    this.src = source
    var img = document.createElement('img')
    img.src = this.src
    source = img
  } else {
    this.src = source.src
  }

  this.source = source

  loaded(source, function (err) {
    if (err) {
      this.notify('error', err)
    } else {
      this.hasLoaded = true
      this.width = source.naturalWidth
      this.height = source.naturalHeight
      this.notify('load', this)
    }
  }.bind(this))
}

Image.create = function (source) {
  return new Image(source)
}

Image.prototype.getAspectRatio = function () {
  if (!this.hasLoaded) {
    return 1
  }

  return this.width / this.height
}

Image.prototype.notify = function (type, data) {
  var listeners = this.listeners
  setTimeout(function () {
    listeners.notify(type, data)
  }, 0)
}

Image.prototype.on = function (type, fn) {
  this.listeners.on(type, fn)
  return this
}

Image.prototype.off = function (type, fn) {
  this.listeners.off(type, fn)
  return this
}

module.exports = Image

},{"./Listeners.js":6,"./imageLoaded.js":11}],4:[function(require,module,exports){
var Rectangle = require('./Rectangle.js')

var ImageLayer = function (opts) {
  opts = opts || {}
  this.bounds = Rectangle.create(0, 0, 0, 0)
  this.image = opts.image || null
  this.parent = opts.parent
  this.context = opts.context
}

ImageLayer.create = function (opts) {
  return new ImageLayer(opts)
}

ImageLayer.prototype.setImage = function (image) {
  this.image = image
}

ImageLayer.prototype.revalidate = function () {
  var parent = this.parent
  var image = this.image
  var bounds = this.bounds

  if (image) {
    // Constrained by width (otherwise height)
    if (image.width / image.height >= parent.width / parent.height) {
      bounds.width = parent.width
      bounds.height = Math.ceil(image.height / image.width * parent.width)
      bounds.x = 0
      bounds.y = Math.floor((parent.height - bounds.height) * 0.5)
    } else {
      bounds.width = Math.ceil(image.width / image.height * parent.height)
      bounds.height = parent.height
      bounds.x = Math.floor((parent.width - bounds.width) * 0.5)
      bounds.y = 0
    }
  }
}

ImageLayer.prototype.paint = function () {
  var g = this.context
  var image = this.image
  var bounds = this.bounds

  if (image && image.hasLoaded) {
    g.drawImage(
      image.source,
      0, 0, image.width, image.height,
      bounds.x, bounds.y, bounds.width, bounds.height
    )
  }
}

module.exports = ImageLayer

},{"./Rectangle.js":7}],5:[function(require,module,exports){
var Listeners = require('./Listeners.js')

var Input = function (domElement) {
  var listeners = Listeners.create()
  var downEvent = null
  this.listeners = listeners

  function createEventForMouse (source) {
    var x = source.offsetX
    var y = source.offsetY

    return {
      source: source,
      x: x,
      y: y,
      dx: downEvent ? x - downEvent.x : 0,
      dy: downEvent ? y - downEvent.y : 0,
      type: 'Mouse'
    }
  }

  function createEventForTouch (source) {
    var bounds = source.target.getBoundingClientRect()
    var touch = source.touches.length > 0 ? source.touches[0] : source.changedTouches[0]

    var x = touch.clientX - bounds.left
    var y = touch.clientY - bounds.top

    return {
      source: source,
      x: x,
      y: y,
      dx: downEvent ? x - downEvent.x : 0,
      dy: downEvent ? y - downEvent.y : 0,
      type: 'Touch'
    }
  }

  domElement.addEventListener('mousedown', function (source) {
    downEvent = createEventForMouse(source)
    listeners.notify('down', downEvent)
  })

  domElement.addEventListener('touchstart', function (source) {
    downEvent = createEventForTouch(source)
    listeners.notify('down', downEvent)
  })

  domElement.addEventListener('mousemove', function (source) {
    listeners.notify('move', createEventForMouse(source))
  })

  domElement.addEventListener('touchmove', function (source) {
    listeners.notify('move', createEventForTouch(source))
  })

  domElement.addEventListener('mouseup', function (source) {
    listeners.notify('up', createEventForMouse(source))
  })

  domElement.addEventListener('touchend', function (source) {
    listeners.notify('up', createEventForTouch(source))
    downEvent = null
  })

  domElement.addEventListener('mouseout', function (source) {
    listeners.notify('cancel', createEventForMouse(source))
    downEvent = null
  })

  domElement.addEventListener('touchcancel', function (source) {
    listeners.notify('cancel', createEventForTouch(source))
    downEvent = null
  })
}

Input.create = function (domElement) {
  return new Input(domElement)
}

Input.prototype.on = function (type, fn) {
  this.listeners.on(type, fn)
  return this
}

Input.prototype.off = function (type, fn) {
  this.listeners.off(type, fn)
  return this
}

module.exports = Input

},{"./Listeners.js":6}],6:[function(require,module,exports){
var Listeners = function (opts) {
  this.events = {}
}

Listeners.create = function (opts) {
  return new Listeners(opts)
}

Listeners.prototype.on = function (type, fn) {
  if (!this.events[type]) {
    this.events[type] = []
  }

  if (this.events[type].indexOf(fn) === -1) {
    this.events[type].push(fn)
  }

  return this
}

Listeners.prototype.off = function (type, fn) {
  if (this.events[type]) {
    var i = this.events[type].indexOf(fn)
    if (i !== -1) {
      this.events[type].splice(i, 1)
    }
  }

  return this
}

Listeners.prototype.notify = function (type, data) {
  if (this.events[type]) {
    this.events[type].forEach(function (fn) {
      fn.call(this, data)
    }.bind(this))
  }
}

Listeners.prototype.clearAll = function () {
  this.events = {}
}

module.exports = Listeners

},{}],7:[function(require,module,exports){
var Rectangle = function (x, y, width, height) {
  this._x = x
  this._y = y
  this._width = width
  this._height = height
}

Rectangle.prototype.copy = function (copy) {
  this._x = copy.x
  this._y = copy.y
  this._width = copy.width
  this._height = copy.height
  return this
}

Rectangle.prototype.clone = function () {
  return Rectangle.create(this._x, this._y, this._width, this._height)
}

Rectangle.prototype.round = function () {
  var dx = this._x
  var dy = this._y
  this._x = Math.round(dx)
  this._y = Math.round(dy)
  dx -= this._x
  dy -= this._y
  this._width = Math.round(this._width + dx)
  this._height = Math.round(this._height + dy)
  return this
}

Rectangle.prototype.isInside = function (point) {
  return point.x >= this.left &&
    point.y >= this.top &&
    point.x < this.right &&
    point.y < this.bottom
}

Object.defineProperties(Rectangle.prototype, {
  x: {
    get: function () { return this._x },
    set: function (v) { this._x = v }
  },
  y: {
    get: function () { return this._y },
    set: function (v) { this._y = v }
  },
  centerX: {
    get: function () { return this._x + this._width * 0.5 },
    set: function (v) { this._x = v - this._width * 0.5 }
  },
  centerY: {
    get: function () { return this._y + this._height * 0.5 },
    set: function (v) { this._y = v - this._height * 0.5 }
  },
  width: {
    get: function () { return this._width },
    set: function (v) { this._width = v }
  },
  height: {
    get: function () { return this._height },
    set: function (v) { this._height = v }
  },
  left: {
    get: function () { return this._x },
    set: function (v) {
      this._width = this._x + this._width - v
      this._x = v
    }
  },
  top: {
    get: function () { return this._y },
    set: function (v) {
      this._height = this._y + this._height - v
      this._y = v
    }
  },
  right: {
    get: function () { return this._x + this._width },
    set: function (v) {
      this._width = v - this._x
    }
  },
  bottom: {
    get: function () { return this._y + this._height },
    set: function (v) {
      this._height = v - this._y
    }
  },
  aspectRatio: {
    get: function () { return this._width / this._height }
  }
})

Rectangle.create = function (x, y, width, height) {
  return new Rectangle(x, y, width, height)
}

module.exports = Rectangle

},{}],8:[function(require,module,exports){
var Rectangle = require('./Rectangle.js')

var Selection = function (opts) {
  this.target = opts.target || null
  this.bounds = Rectangle.create(0, 0, 0, 0)
  this.boundsPx = Rectangle.create(0, 0, 0, 0)
  this.region = Rectangle.create(0, 0, 0, 0)

  this.initialOpts = {
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height
  }

  this.aspectRatio = opts.aspectRatio
  this.minWidth = opts.minWidth !== undefined ? opts.minWidth : 100
  this.minHeight = opts.minHeight !== undefined ? opts.minHeight : 100

  this.boundsMinWidth = 0
  this.boundsMinHeight = 0

  this._delta = {x: 0, h: 0}
}

Object.defineProperties(Selection.prototype, {
  x: {
    get: function () { return this.bounds.x },
    set: function (v) { this.bounds.x = v }
  },
  y: {
    get: function () { return this.bounds.y },
    set: function (v) { this.bounds.y = v }
  },
  width: {
    get: function () { return this.bounds.width },
    set: function (v) { this.bounds.width = v }
  },
  height: {
    get: function () { return this.bounds.height },
    set: function (v) { this.bounds.height = v }
  },
  left: {
    get: function () { return this.bounds.x },
    set: function (v) {
      this.bounds.left = v
    }
  },
  top: {
    get: function () { return this.bounds.y },
    set: function (v) { this.bounds.top = v }
  },
  right: {
    get: function () { return this.bounds.right },
    set: function (v) { this.bounds.right = v }
  },
  bottom: {
    get: function () { return this.bounds.bottom },
    set: function (v) { this.bounds.bottom = v }
  }
})

Selection.prototype.getBoundsLengthForRegion = function (regionLen) {
  return regionLen / this.region.width * this.width
}

Selection.prototype.moveBy = function (dx, dy) {
  var bounds = this.bounds
  var target = this.target

  bounds.x = Math.min(Math.max(bounds.x + dx, target.bounds.x), target.bounds.x + target.bounds.width - bounds.width)
  bounds.y = Math.min(Math.max(bounds.y + dy, target.bounds.y), target.bounds.y + target.bounds.height - bounds.height)

  return this.updateRegionFromBounds()
}

Selection.prototype.resizeBy = function (dx, dy, p) {
  var delta = this._delta
  var aspectRatio = this.aspectRatio
  var bounds = this.bounds
  var boundsMinWidth = this.boundsMinWidth
  var boundsMinHeight = this.boundsMinHeight
  var target = this.target

  function calculateDelta (x, y) {
    delta.width = bounds.width + x
    delta.height = bounds.height + y

    delta.width = Math.max(boundsMinWidth, delta.width)
    delta.height = Math.max(boundsMinHeight, delta.height)

    if (aspectRatio) {
      if (delta.width / delta.height > aspectRatio) {
        delta.width = delta.height * aspectRatio
      } else {
        delta.height = delta.width / aspectRatio
      }
    }

    delta.width -= bounds.width
    delta.height -= bounds.height

    return delta
  }

  if (p[0] === 'n') {
    dy = Math.min(dy, this.top - target.bounds.top)
  } else if (p[0] === 's') {
    dy = Math.min(dy, target.bounds.bottom - this.bottom)
  }

  if (p[1] === 'w') {
    dx = Math.min(dx, this.left - target.bounds.left)
  } else if (p[1] === 'e') {
    dx = Math.min(dx, target.bounds.right - this.right)
  }

  delta = calculateDelta(dx, dy)

  switch (p) {
    case 'nw':
      this.left -= delta.width
      this.top -= delta.height
      break
    case 'ne':
      this.right += delta.width
      this.top -= delta.height
      break
    case 'sw':
      this.left -= delta.width
      this.bottom += delta.height
      break
    case 'se':
      this.right += delta.width
      this.bottom += delta.height
      break
  }

  return this.updateRegionFromBounds()
}

Selection.prototype.autoSizeRegion = function () {
  var target = this.target
  var region = this.region
  var aspectRatio = this.aspectRatio
  var initialOpts = this.initialOpts
  var beforeX = region.x
  var beforeY = region.y
  var beforeWidth = region.width
  var beforeHeight = region.height

  region.x = initialOpts.x !== undefined ? initialOpts.x : 0
  region.y = initialOpts.y !== undefined ? initialOpts.y : 0

  region.width = initialOpts.width !== undefined ? initialOpts.width : target.image.width
  region.height = initialOpts.height !== undefined ? initialOpts.height : target.image.height

  if (aspectRatio) {
    if (region.width / region.height > aspectRatio) {
      region.width = region.height * aspectRatio
    } else {
      region.height = region.width / aspectRatio
    }
  }

  if (initialOpts.x === undefined) {
    region.centerX = target.image.width * 0.5
  }

  if (initialOpts.y === undefined) {
    region.centerY = target.image.height * 0.5
  }

  region.round()

  this.updateBoundsFromRegion()

  return region.x !== beforeX ||
    region.y !== beforeY ||
    region.width !== beforeWidth ||
    region.height !== beforeHeight
}

Selection.prototype.updateRegionFromBounds = function () {
  var target = this.target
  var region = this.region
  var bounds = this.bounds
  var beforeX = region.x
  var beforeY = region.y
  var beforeWidth = region.width
  var beforeHeight = region.height

  region.x = target.image.width * (bounds.x - target.bounds.x) / target.bounds.width
  region.y = target.image.height * (bounds.y - target.bounds.y) / target.bounds.height

  region.width = target.image.width * (bounds.width / target.bounds.width)
  region.height = target.image.height * (bounds.height / target.bounds.height)

  region.round()

  return region.x !== beforeX ||
    region.y !== beforeY ||
    region.width !== beforeWidth ||
    region.height !== beforeHeight
}

Selection.prototype.updateBoundsFromRegion = function () {
  var target = this.target
  var region = this.region
  var bounds = this.bounds

  if (target.image) {
    bounds.x = target.bounds.x + target.bounds.width * (region.x / target.image.width)
    bounds.y = target.bounds.y + target.bounds.height * (region.y / target.image.height)
    bounds.width = target.bounds.width * (region.width / target.image.width)
    bounds.height = target.bounds.height * (region.height / target.image.height)
  }

  this.boundsMinWidth = this.getBoundsLengthForRegion(this.minWidth)
  this.boundsMinHeight = this.getBoundsLengthForRegion(this.minHeight)
}

Selection.prototype.isInside = function (point) {
  return this.bounds.isInside(point)
}

Selection.create = function (opts) {
  return new Selection(opts)
}

module.exports = Selection

},{"./Rectangle.js":7}],9:[function(require,module,exports){
var Input = require('./Input.js')
var Listeners = require('./Listeners.js')
var Selection = require('./Selection.js')
var Rectangle = require('./Rectangle.js')

var SelectionLayer = function (opts) {
  opts = opts || {}

  this.selection = Selection.create(opts)

  this.parent = opts.parent
  this.context = opts.context
  this.context.setLineDash = this.context.setLineDash || function () {}
  this.target = opts.target

  var handleOpts = opts.handle || {}
  handleOpts.length = handleOpts.handleLength || 32
  handleOpts.depth = handleOpts.depth || 3
  handleOpts.size = handleOpts.size || handleOpts.length * 2
  handleOpts.color = handleOpts.color || 'rgba(255, 255, 255, 1.0)'
  handleOpts.activeColor = handleOpts.activeColor || 'rgba(255, 0, 160, 1.0)'
  this.handleOpts = handleOpts

  this.listeners = Listeners.create()

  this.input = Input.create(this.parent.canvas)

  this.activeRegion = null
  this.downBounds = Rectangle.create(0, 0, 0, 0)

  this.input.on('down', this.onInputDown.bind(this))
  this.input.on('move', this.onInputMove.bind(this))
  this.input
    .on('up', this.onInputUpOrCancel.bind(this))
    .on('cancel', this.onInputUpOrCancel.bind(this))
}

SelectionLayer.create = function (opts) {
  return new SelectionLayer(opts)
}

SelectionLayer.prototype.onInputDown = function (e) {
  var hitRegion = this.findHitRegion(e)

  if (hitRegion) {
    e.source.preventDefault()
    this.activeRegion = hitRegion
    this.setCursor(hitRegion)
    this.downBounds.copy(this.selection.bounds)
    this.listeners.notify('start', this.selection.region)
  }
}

SelectionLayer.prototype.onInputMove = function (e) {
  var activeRegion = this.activeRegion

  if (!activeRegion) {
    var hitRegion = this.findHitRegion(e)
    if (hitRegion) {
      e.source.preventDefault()
      this.setCursor(hitRegion)
    } else {
      this.resetCursor()
    }
  } else {
    e.source.preventDefault()

    var selection = this.selection
    var hasChanged = false
    selection.bounds.copy(this.downBounds)

    if (activeRegion === 'move') {
      hasChanged = selection.moveBy(e.dx, e.dy)
      if (hasChanged) {
        this.listeners.notify('move', this.selection.region)
      }
    } else {
      var dir = activeRegion.substring(0, 2)
      var dx = dir[1] === 'w' ? -e.dx : e.dx
      var dy = dir[0] === 'n' ? -e.dy : e.dy
      hasChanged = selection.resizeBy(dx, dy, dir)
      if (hasChanged) {
        this.listeners.notify('resize', this.selection.region)
      }
    }

    if (hasChanged) {
      this.listeners.notify('change', this.selection.region)
    }
  }
}

SelectionLayer.prototype.onInputUpOrCancel = function (e) {
  e.source.preventDefault()
  if (this.activeRegion) {
    this.activeRegion = null
    this.resetCursor()
    this.listeners.notify('end', this.selection.region)
  }
}

SelectionLayer.prototype.findHitRegion = function (point) {
  var hitRegion = null
  var closest = Number.MAX_VALUE

  var d = this.isWithinNorthWestHandle(point)
  if (d !== false && d < closest) {
    closest = d
    hitRegion = 'nw-resize'
  }

  d = this.isWithinNorthEastHandle(point)
  if (d !== false && d < closest) {
    closest = d
    hitRegion = 'ne-resize'
  }

  d = this.isWithinSouthWestHandle(point)
  if (d !== false && d < closest) {
    closest = d
    hitRegion = 'sw-resize'
  }

  d = this.isWithinSouthEastHandle(point)
  if (d !== false && d < closest) {
    closest = d
    hitRegion = 'se-resize'
  }

  if (hitRegion) {
    return hitRegion
  } else if (this.isWithinBounds(point)) {
    return 'move'
  } else {
    return null
  }
}

SelectionLayer.prototype.on = function (type, fn) {
  this.listeners.on(type, fn)
  return this
}

SelectionLayer.prototype.off = function (type, fn) {
  this.listeners.off(type, fn)
  return this
}

SelectionLayer.prototype.setCursor = function (type) {
  if (this.parent.canvas.style.cursor !== type) {
    this.parent.canvas.style.cursor = type
  }
}

SelectionLayer.prototype.resetCursor = function () {
  this.setCursor('auto')
}

SelectionLayer.prototype.isWithinRadius = function (ax, ay, bx, by, r) {
  var tsq = r * r
  var dx = ax - bx
  var dy = ay - by
  var dsq = dx * dx + dy * dy
  return (dsq < tsq) ? dsq : false
}

SelectionLayer.prototype.isWithinNorthWestHandle = function (point) {
  return this.isWithinRadius(point.x, point.y, this.selection.left, this.selection.top, this.getHandleRadius())
}

SelectionLayer.prototype.isWithinNorthEastHandle = function (point) {
  return this.isWithinRadius(point.x, point.y, this.selection.right, this.selection.top, this.getHandleRadius())
}

SelectionLayer.prototype.isWithinSouthWestHandle = function (point) {
  return this.isWithinRadius(point.x, point.y, this.selection.left, this.selection.bottom, this.getHandleRadius())
}

SelectionLayer.prototype.isWithinSouthEastHandle = function (point) {
  return this.isWithinRadius(point.x, point.y, this.selection.right, this.selection.bottom, this.getHandleRadius())
}

SelectionLayer.prototype.isWithinBounds = function (point) {
  return this.selection.isInside(point)
}

SelectionLayer.prototype.getHandleRadius = function () {
  return this.handleOpts.size / 2
}

SelectionLayer.prototype.onImageLoad = function () {
  this.autoSizeRegionAndNotify()
}

SelectionLayer.prototype.setAspectRatio = function (aspectRatio) {
  this.selection.aspectRatio = aspectRatio
  this.autoSizeRegionAndNotify()
}

SelectionLayer.prototype.autoSizeRegionAndNotify = function () {
  var hasChanged = this.selection.autoSizeRegion()
  if (hasChanged) {
    this.listeners.notify('change', this.selection.region)
  }
}

SelectionLayer.prototype.revalidate = function () {
  this.selection.updateBoundsFromRegion()
}

SelectionLayer.prototype.paint = function () {
  this.selection.boundsPx.copy(this.selection.bounds).round()

  this.paintOutside()
  this.paintInside()
}

SelectionLayer.prototype.paintOutside = function () {
  var bounds = this.selection.boundsPx
  var g = this.context
  var target = this.target

  var tl = target.bounds.x
  var tt = target.bounds.y
  var tw = target.bounds.width
  var tr = target.bounds.right
  var tb = target.bounds.bottom

  var bl = bounds.x
  var bt = bounds.y
  var bh = bounds.height
  var br = bounds.right
  var bb = bounds.bottom

  g.fillStyle = 'rgba(0, 0, 0, 0.5)'
  g.fillRect(tl, tt, tw, bt - tt)
  g.fillRect(tl, bt, bl - tl, bh)
  g.fillRect(br, bt, tr - br, bh)
  g.fillRect(tl, bb, tw, tb - bb)
}

SelectionLayer.prototype.paintInside = function () {
  var g = this.context
  var bounds = this.selection.boundsPx
  var activeRegion = this.activeRegion
  var opts = this.handleOpts

  var lengthWidth = Math.min(opts.length, bounds.width * 0.5)
  var lengthHeight = Math.min(opts.length, bounds.height * 0.5)
  var depth = opts.depth
  var color = opts.color
  var activeColor = opts.activeColor
  var length = 0 // TODO: CHECK

  // Sides
  g.fillStyle = 'rgba(255, 255, 255, 0.3)'
  g.fillRect(bounds.x + length, bounds.y, bounds.width - 2 * length, depth)
  g.fillRect(bounds.x + length, bounds.bottom - depth, bounds.width - 2 * length, depth)
  g.fillRect(bounds.x, bounds.y + length, depth, bounds.height - 2 * length)
  g.fillRect(bounds.right - depth, bounds.y + length, depth, bounds.height - 2 * length)

  // Handles
  var isMoveRegion = activeRegion === 'move'

  g.fillStyle = isMoveRegion || activeRegion === 'nw-resize' ? activeColor : color
  g.fillRect(bounds.x, bounds.y, lengthWidth, depth)
  g.fillRect(bounds.x, bounds.y + depth, depth, lengthHeight - depth)

  g.fillStyle = isMoveRegion || activeRegion === 'ne-resize' ? activeColor : color
  g.fillRect(bounds.right - lengthWidth, bounds.y, lengthWidth, depth)
  g.fillRect(bounds.right - depth, bounds.y + depth, depth, lengthHeight - depth)

  g.fillStyle = isMoveRegion || activeRegion === 'sw-resize' ? activeColor : color
  g.fillRect(bounds.x, bounds.bottom - depth, lengthWidth, depth)
  g.fillRect(bounds.x, bounds.bottom - lengthHeight, depth, lengthHeight - depth)

  g.fillStyle = isMoveRegion || activeRegion === 'se-resize' ? activeColor : color
  g.fillRect(bounds.right - lengthWidth, bounds.bottom - depth, lengthWidth, depth)
  g.fillRect(bounds.right - depth, bounds.bottom - lengthHeight, depth, lengthHeight - depth)

  // Guides
  g.strokeStyle = 'rgba(255, 255, 255, 0.6)'
  g.setLineDash([2, 3])
  g.lineWidth = 1
  g.beginPath()
  var bw3 = bounds.width / 3
  var bh3 = bounds.height / 3
  g.moveTo(bounds.x + bw3, bounds.y)
  g.lineTo(bounds.x + bw3, bounds.y + bounds.height)
  g.moveTo(bounds.x + 2 * bw3, bounds.y)
  g.lineTo(bounds.x + 2 * bw3, bounds.y + bounds.height)
  g.moveTo(bounds.x, bounds.y + bh3)
  g.lineTo(bounds.x + bounds.width, bounds.y + bh3)
  g.moveTo(bounds.x, bounds.y + 2 * bh3)
  g.lineTo(bounds.x + bounds.width, bounds.y + 2 * bh3)
  g.stroke()
  g.closePath()
}

module.exports = SelectionLayer

},{"./Input.js":5,"./Listeners.js":6,"./Rectangle.js":7,"./Selection.js":8}],10:[function(require,module,exports){
// http://snippetrepo.com/snippets/basic-vanilla-javascript-throttlingdebounce
function debounce (fn, wait, immediate) {
  var timeout
  return function () {
    var context = this
    var args = arguments
    clearTimeout(timeout)
    timeout = setTimeout(function () {
      timeout = null
      if (!immediate) fn.apply(context, args)
    }, wait)
    if (immediate && !timeout) fn.apply(context, args)
  }
};

module.exports = debounce

},{}],11:[function(require,module,exports){
/*
 * Modified version of http://github.com/desandro/imagesloaded v2.1.1
 * MIT License.
 */

var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

function imageLoaded (image, callback) {
  if (!image.nodeName || image.nodeName.toLowerCase() !== 'img') {
    return callback(new Error('First argument must an image element'))
  }

  if (image.src && image.complete && image.naturalWidth !== undefined) {
    return callback(null, true)
  }

  image.addEventListener('load', function () {
    callback(null, false)
  })

  image.addEventListener('error', function (e) {
    callback(new Error('Failed to load image \'' + (image.src || '') + '\''))
  })

  if (image.complete) {
    var src = image.src
    image.src = BLANK
    image.src = src
  }
}

module.exports = imageLoaded

},{}]},{},[2])(2)
});
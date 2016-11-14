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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvd2lsbC5iYW1mb3JkL0NvZGUvY3JvcC9zcmMvQmFja2dyb3VuZExheWVyLmpzIiwiL1VzZXJzL3dpbGwuYmFtZm9yZC9Db2RlL2Nyb3Avc3JjL0Nyb3AuanMiLCIvVXNlcnMvd2lsbC5iYW1mb3JkL0NvZGUvY3JvcC9zcmMvSW1hZ2UuanMiLCIvVXNlcnMvd2lsbC5iYW1mb3JkL0NvZGUvY3JvcC9zcmMvSW1hZ2VMYXllci5qcyIsIi9Vc2Vycy93aWxsLmJhbWZvcmQvQ29kZS9jcm9wL3NyYy9JbnB1dC5qcyIsIi9Vc2Vycy93aWxsLmJhbWZvcmQvQ29kZS9jcm9wL3NyYy9MaXN0ZW5lcnMuanMiLCIvVXNlcnMvd2lsbC5iYW1mb3JkL0NvZGUvY3JvcC9zcmMvUmVjdGFuZ2xlLmpzIiwiL1VzZXJzL3dpbGwuYmFtZm9yZC9Db2RlL2Nyb3Avc3JjL1NlbGVjdGlvbi5qcyIsIi9Vc2Vycy93aWxsLmJhbWZvcmQvQ29kZS9jcm9wL3NyYy9TZWxlY3Rpb25MYXllci5qcyIsIi9Vc2Vycy93aWxsLmJhbWZvcmQvQ29kZS9jcm9wL3NyYy9kZWJvdW5jZS5qcyIsIi9Vc2Vycy93aWxsLmJhbWZvcmQvQ29kZS9jcm9wL3NyYy9pbWFnZUxvYWRlZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBLElBQUksZUFBZSxHQUFHLFVBQVUsSUFBSSxFQUFFLENBQUM7QUFDdkMsRUFBRSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7O0FBRW5CLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTTs7RUFFekIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTTtFQUN6QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPO0VBQzNCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSTtBQUNyQixDQUFDOztBQUVELGVBQWUsQ0FBQyxNQUFN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LEVBQUU7O0lBRVQsSUFBSSxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFO01BQzlELE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUs7TUFDM0IsTUFBTSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO01BQ3BFLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQztNQUNaLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUM7S0FDN0QsTUFBTTtNQUNMLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztNQUNwRSxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNO01BQzdCLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUM7TUFDMUQsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDO0tBQ2I7R0FDRjtBQUNILENBQUM7O0FBRUQsVUFBVSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsWUFBWSxDQUFDO0VBQ3hDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPO0VBQ3BCLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLO0FBQ3hCLEVBQUUsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU07O0VBRXhCLElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxTQUFTLEVBQUU7SUFDNUIsQ0FBQyxDQUFD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Q0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7RUFDM0IsT0FBTyxJQUFJO0FBQ2IsQ0FBQzs7QUFFRCxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxVQUFVLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQztFQUN6QyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO0VBQzVCLE9BQU8sSUFBSTtBQUNiLENBQUM7O0FBRUQsTUFBTSxDQUFDLE9BQU8sR0FBRyxLQUFLOzs7QUMxRnRCLElBQUksU0FBUyxHQUFHLFVBQVUsSUFBSSxFQUFFLENBQUM7RUFDL0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFO0FBQ2xCLENBQUM7O0FBRUQsU0FBUyxDQUFDLE1BQU0sR0FBRyxVQUFVLElBQUksRUFBRSxDQUFDO0VBQ2xDLE9BQU8sSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDO0FBQzVCLENBQUM7O0FBRUQsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsVUFBVSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUM7RUFDNUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7SUFDdEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO0FBQzFCLEdBQUc7O0VBRUQsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtJQUN4QyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7QUFDOUIsR0FBRzs7RUFFRCxPQUFPLElBQUk7QUFDYixDQUFDOztBQUVELFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLFVBQVUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDO0VBQzdDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtJ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TSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7R0FDeEM7RUFDRCxLQUFLLEVBQUU7SUFDTCxHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzdDLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7R0FDNUM7RUFDRCxNQUFNLEVBQUU7SUFDTixHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzlDLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7R0FDN0M7RUFDRCxJQUFJLEVBQUU7SUFDSixHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDO01BQ2pCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUM7S0FDckI7R0FDRjtFQUNELEdBQUcsRUFBRTtJQUNILEdBQUcsRUFBRSxZQUFZLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztHQUMxQztFQUNELEtBQUssRUFBRTtJQUNMLEdBQUcsRUFBRSxZQUFZLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDN0MsR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztHQUM1QztFQUNELE1BQU0sRUFBRTtJQUNOLEdBQUcsRUFBRSxZQUFZLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDOUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztHQUM3QztBQUNILENBQUMsQ0FBQzs7QUFFRixTQUFTLENBQUMsU0FBUyxDQUFDLHdCQUF3QixHQUFHLFVBQVUsU0FBUyxFQUFFLENBQUM7RUFDbkUsT0FBTyxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUs7QUFDbkQsQ0FBQzs7QUFFRCxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztFQUM5QyxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTTtBQUMxQixFQUFFLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNOztFQUV4QixNQUFNLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUM7QUFDckgsRUFBRSxNQUFNLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7O0VBRXJILE9BQU8sSUFBSSxDQUFDLHNCQUFzQixFQUFFO0FBQ3RDLENBQUM7O0FBRUQsU0FBUyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEdBQUcsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0VBQ25ELElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNO0VBQ3ZCLElBQUksV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXO0VBQ2xDLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNO0VBQ3hCLElBQUksY0FBYyxHQUFHLElBQUksQ0FBQyxjQUFjO0VBQ3hDLElBQUksZUFBZSxHQUFHLElBQUksQ0FBQyxlQUFlO0FBQzVDLEVBQUUsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU07O0VBRXhCLFNBQVMsY0FBYyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUM5QixLQUFLLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQztBQUNsQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDOztJQUVoQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUM7QUFDdkQsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUM7O0lBRXRELElBQUksV0FBVyxFQUFFO01BQ2YsSUFBSSxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsV0FBVyxFQUFFO1FBQzVDLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxXQUFXO09BQ3pDLE1BQU07UUFDTCxLQUFLLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxLQUFLLEdBQUcsV0FBVztPQUN6QztBQUNQLEtBQUs7O0lBRUQsS0FBSyxDQUFDLEtBQUssSUFBSSxNQUFNLENBQUMsS0FBSztBQUMvQixJQUFJLEtBQUssQ0FBQyxNQUFNLElBQUksTUFBTSxDQUFDLE1BQU07O0lBRTdCLE9BQU8sS0FBSztBQUNoQixHQUFHOztFQUVELElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtJQUNoQixFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztHQUNoRCxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtJQUN2QixFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztBQUN6RCxHQUFHOztFQUVELElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtJQUNoQixFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztHQUNsRCxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRTtJQUN2QixFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUN2RCxHQUFHOztBQUVILEVBQUUsS0FBSyxHQUFHLGNBQWMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDOztFQUU5QixRQUFRLENBQUM7SUFDUCxLQUFLLElBQUk7TUFDUCxJQUFJLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQyxLQUFLO01BQ3hCLElBQUksQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDLE1BQU07TUFDeEIsS0FBSztJQUNQLEtBQUssSUFBSTtNQUNQLElBQUksQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLEtBQUs7TUFDekIsSUFBSSxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsTUFBTTtNQUN4QixLQUFLO0lBQ1AsS0FBSyxJQUFJO01BQ1AsSUFBSSxDQUFDLElBQUksSUFBSSxLQUFLLENBQUMsS0FBSztNQUN4QixJQUFJLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNO01BQzNCLEtBQUs7SUFDUCxLQUFLLElBQUk7TUFDUCxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxLQUFLO01BQ3pCLElBQUksQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDLE1BQU07TUFDM0IsS0FBSztBQUNYLEdBQUc7O0VBRUQsT0FBTyxJQUFJLENBQUMsc0JBQXNCLEVBQUU7QUFDdEMsQ0FBQzs7QUFFRCxTQUFTLENBQUMsU0FBUyxDQUFDLGNBQWMsR0FBRyxZQUFZLENBQUM7RUFDaEQsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU07RUFDeEIsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU07RUFDeEIsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVc7RUFDbEMsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVc7RUFDbEMsSUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLENBQUM7RUFDdEIsSUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLENBQUM7RUFDdEIsSUFBSSxXQUFXLEdBQUcsTUFBTSxDQUFDLEtBQUs7QUFDaEMsRUFBRSxJQUFJLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTTs7RUFFaEMsTUFBTSxDQUFDLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxLQUFLLFNBQVMsR0FBRyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDNUQsRUFBRSxNQUFNLENBQUMsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEtBQUssU0FBUyxHQUFHLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQzs7RUFFMUQsTUFBTSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxLQUFLLFNBQVMsR0FBRyxXQUFXLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSztBQUN6RixFQUFFLE1BQU0sQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLE1BQU0sS0FBSyxTQUFTLEdBQUcsV0FBVyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU07O0VBRTNGLElBQUksV0FBVyxFQUFFO0lBQ2YsSUFBSSxNQUFNLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsV0FBVyxFQUFFO01BQzlDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxXQUFXO0tBQzNDLE1BQU07TUFDTCxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLEdBQUcsV0FBVztLQUMzQztBQUNMLEdBQUc7O0VBRUQsSUFBSSxXQUFXLENBQUMsQ0FBQyxLQUFLLFNBQVMsRUFBRTtJQUMvQixNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEdBQUc7QUFDN0MsR0FBRzs7RUFFRCxJQUFJLFdBQVcsQ0FBQyxDQUFDLEtBQUssU0FBUyxFQUFFO0lBQy9CLE1BQU0sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsR0FBRztBQUM5QyxHQUFHOztBQUVILEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRTs7QUFFaEIsRUFBRSxJQUFJLENBQUMsc0JBQXNCLEVBQUU7O0VBRTdCLE9BQU8sTUFBTSxDQUFDLENBQUMsS0FBSyxPQUFPO0lBQ3pCLE1BQU0sQ0FBQyxDQUFDLEtBQUssT0FBTztJQUNwQixNQUFNLENBQUMsS0FBSyxLQUFLLFdBQVc7SUFDNUIsTUFBTSxDQUFDLE1BQU0sS0FBSyxZQUFZO0FBQ2xDLENBQUM7O0FBRUQsU0FBUyxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsR0FBRyxZQUFZLENBQUM7RUFDeEQsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU07RUFDeEIsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU07RUFDeEIsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU07RUFDeEIsSUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLENBQUM7RUFDdEIsSUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLENBQUM7RUFDdEIsSUFBSSxXQUFXLEdBQUcsTUFBTSxDQUFDLEtBQUs7QUFDaEMsRUFBRSxJQUFJLFlBQVksR0FBRyxNQUFNLENBQUMsTUFBTTs7RUFFaEMsTUFBTSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLO0FBQ3BGLEVBQUUsTUFBTSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNOztFQUVwRixNQUFNLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7QUFDMUUsRUFBRSxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7O0FBRTlFLEVBQUUsTUFBTSxDQUFDLEtBQUssRUFBRTs7RUFFZCxPQUFPLE1BQU0sQ0FBQyxDQUFDLEtBQUssT0FBTztJQUN6QixNQUFNLENBQUMsQ0FBQyxLQUFLLE9BQU87SUFDcEIsTUFBTSxDQUFDLEtBQUssS0FBSyxXQUFXO0lBQzVCLE1BQU0sQ0FBQyxNQUFNLEtBQUssWUFBWTtBQUNsQyxDQUFDOztBQUVELFNBQVMsQ0FBQyxTQUFTLENBQUMsc0JBQXNCLEdBQUcsWUFBWSxDQUFDO0VBQ3hELElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNO0VBQ3hCLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNO0FBQzFCLEVBQUUsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU07O0VBRXhCLElBQUksTUFBTSxDQUFDLEtBQUssRUFBRTtJQUNoQixNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxJQUFJLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDbEYsTUFBTSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sSUFBSSxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQ3BGLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLElBQUksTUFBTSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztJQUN4RSxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7QUFDaEYsR0FBRzs7RUFFRCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO0VBQ2xFLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUM7QUFDdEUsQ0FBQzs7QUFFRCxTQUFTLENBQUMsU0FBUyxDQUFDLFFBQVEsR0FBRyxVQUFVLEtBQUssRUFBRSxDQUFDO0VBQy9DLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO0FBQ3BDLENBQUM7O0FBRUQsU0FBUyxDQUFDLE1BQU0sR0FBRyxVQUFVLElBQUksRUFBRSxDQUFDO0VBQ2xDLE9BQU8sSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDO0FBQzVCLENBQUM7O0FBRUQsTUFBTSxDQUFDLE9BQU8sR0FBRyxTQUFTOzs7QUN0TzFCLElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUM7QUFDakMsSUFBSSxTQUFTLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDO0FBQ3pDLElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztBQUN6QyxJQUFJLFNBQVMsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7O0FBRXpDLElBQUksY0FBYyxHQUFHLFVBQVUsSUFBSSxFQUFFLENBQUM7QUFDdEMsRUFBRSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7O0FBRW5CLEVBQUUsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQzs7RUFFdkMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTTtFQUN6QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPO0VBQzNCLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxJQUFJLFlBQVksQ0FBQyxDQUFDO0FBQ3ZFLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTTs7RUFFekIsSUFBSSxVQUFVLEdBQUcsSUFBSSxDQUFDLE1BQU0sSUFBSSxFQUFFO0VBQ2xDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLFlBQVksSUFBSSxFQUFFO0VBQ2pELFVBQVUsQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDLEtBQUssSUFBSSxDQUFDO0VBQ3hDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLElBQUksSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUM7RUFDMUQsVUFBVSxDQUFDLEtBQUssR0FBRyxVQUFVLENBQUMsS0FBSyxJQUFJLDBCQUEwQjtFQUNqRSxVQUFVLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQyxXQUFXLElBQUksd0JBQXdCO0FBQzdFLEVBQUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVOztBQUU5QixFQUFFLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDLE1BQU0sRUFBRTs7QUFFckMsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7O0VBRTdDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSTtBQUMxQixFQUFFLElBQUksQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7O0VBRTlDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztFQUNsRCxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7RUFDbEQsSUFBSSxDQUFDLEtBQUs7S0FDUCxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDM0MsRUFBRSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BELENBQUM7O0FBRUQsY0FBYyxDQUFDLE1BQU0sR0FBRyxVQUFVLElBQUksRUFBRSxDQUFDO0VBQ3ZDLE9BQU8sSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDO0FBQ2pDLENBQUM7O0FBRUQsY0FBYyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDLEVBQUUsQ0FBQztBQUNyRCxFQUFFLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDOztFQUVyQyxJQUFJLFNBQVMsRUFBRTtJQUNiLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO0lBQ3pCLElBQUksQ0FBQyxZQUFZLEdBQUcsU0FBUztJQUM3QixJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQztJQUN6QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztJQUMzQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7R0FDdEQ7QUFDSCxDQUFDOztBQUVELGNBQWMsQ0FBQyxTQUFTLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQyxFQUFFLENBQUM7QUFDckQsRUFBRSxJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWTs7RUFFcEMsSUFBSSxDQUFDLFlBQVksRUFBRTtJQUNqQixJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztJQUNyQyxJQUFJLFNBQVMsRUFBRTtNQUNiLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO01BQ3pCLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO0tBQzFCLE1BQU07TUFDTCxJQUFJLENBQUMsV0FBVyxFQUFFO0tBQ25CO0dBQ0YsTUFBTTtBQUNULElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUU7O0lBRXpCLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTO0lBQzlCLElBQUksVUFBVSxHQUFHLEtBQUs7QUFDMUIsSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDOztJQUV0QyxJQUFJLFlBQVksS0FBSyxNQUFNLEVBQUU7TUFDM0IsVUFBVSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO01BQ3pDLElBQUksVUFBVSxFQUFFO1FBQ2QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO09BQ3JEO0tBQ0YsTUFBTTtNQUNMLElBQUksR0FBRyxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztNQUN0QyxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRTtNQUN0QyxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRTtNQUN0QyxVQUFVLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQztNQUM1QyxJQUFJLFVBQVUsRUFBRTtRQUNkLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztPQUN2RDtBQUNQLEtBQUs7O0lBRUQsSUFBSSxVQUFVLEVBQUU7TUFDZCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7S0FDdkQ7R0FDRjtBQUNILENBQUM7O0FBRUQsY0FBYyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsR0FBRyxVQUFVLENBQUMsRUFBRSxDQUFDO0VBQ3pELENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO0VBQ3pCLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRTtJQUNyQixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUk7SUFDeEIsSUFBSSxDQUFDLFdBQVcsRUFBRTtJQUNsQixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7R0FDcEQ7QUFDSCxDQUFDOztBQUVELGNBQWMsQ0FBQyxTQUFTLENBQUMsYUFBYSxHQUFHLFVBQVUsS0FBSyxFQUFFLENBQUM7RUFDekQsSUFBSSxTQUFTLEdBQUcsSUFBSTtBQUN0QixFQUFFLElBQUksT0FBTyxHQUFHLE1BQU0sQ0FBQyxTQUFTOztFQUU5QixJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDO0VBQzNDLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLEdBQUcsT0FBTyxFQUFFO0lBQzlCLE9BQU8sR0FBRyxDQUFDO0lBQ1gsU0FBUyxHQUFHLFdBQVc7QUFDM0IsR0FBRzs7RUFFRCxDQUFDLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQztFQUN2QyxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxHQUFHLE9BQU8sRUFBRTtJQUM5QixPQUFPLEdBQUcsQ0FBQztJQUNYLFNBQVMsR0FBRyxXQUFXO0FBQzNCLEdBQUc7O0VBRUQsQ0FBQyxHQUFHLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLENBQUM7RUFDdkMsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsR0FBRyxPQUFPLEVBQUU7SUFDOUIsT0FBTyxHQUFHLENBQUM7SUFDWCxTQUFTLEdBQUcsV0FBVztBQUMzQixHQUFHOztFQUVELENBQUMsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsS0FBSyxDQUFDO0VBQ3ZDLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLEdBQUcsT0FBTyxFQUFFO0lBQzlCLE9BQU8sR0FBRyxDQUFDO0lBQ1gsU0FBUyxHQUFHLFdBQVc7QUFDM0IsR0FBRzs7RUFFRCxJQUFJLFNBQVMsRUFBRTtJQUNiLE9BQU8sU0FBUztHQUNqQixNQUFNLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsRUFBRTtJQUNyQyxPQUFPLE1BQU07R0FDZCxNQUFNO0lBQ0wsT0FBTyxJQUFJO0dBQ1o7QUFDSCxDQUFDOztBQUVELGNBQWMsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLFVBQVUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDO0VBQ2pELElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7RUFDM0IsT0FBTyxJQUFJO0FBQ2IsQ0FBQzs7QUFFRCxjQUFjLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBRyxVQUFVLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQztFQUNsRCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO0VBQzVCLE9BQU8sSUFBSTtBQUNiLENBQUM7O0FBRUQsY0FBYyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUcsVUFBVSxJQUFJLEVBQUUsQ0FBQztFQUNwRCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssSUFBSSxFQUFFO0lBQzVDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSTtHQUN2QztBQUNILENBQUM7O0FBRUQsY0FBYyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDO0VBQ2xELElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO0FBQ3hCLENBQUM7O0FBRUQsY0FBYyxDQUFDLFNBQVMsQ0FBQyxjQUFjLEdBQUcsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7RUFDdEUsSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7RUFDZixJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUNoQixJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRTtFQUNoQixJQUFJLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFO0VBQzNCLE9BQU8sQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxLQUFLO0FBQ2xDLENBQUM7O0FBRUQsY0FBYyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsR0FBRyxVQUFVLEtBQUssRUFBRSxDQUFDO0VBQ25FLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0FBQy9HLENBQUM7O0FBRUQsY0FBYyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsR0FBRyxVQUFVLEtBQUssRUFBRSxDQUFDO0VBQ25FLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0FBQ2hILENBQUM7O0FBRUQsY0FBYyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsR0FBRyxVQUFVLEtBQUssRUFBRSxDQUFDO0VBQ25FLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0FBQ2xILENBQUM7O0FBRUQsY0FBYyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsR0FBRyxVQUFVLEtBQUssRUFBRSxDQUFDO0VBQ25FLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFL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RUFDMUIsSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDO0VBQzNCLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztFQUNsQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztFQUNsRCxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0VBQ3RDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztFQUN0RCxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7RUFDbEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUM7RUFDakQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztFQUN0QyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7RUFDckQsQ0FBQyxDQUFDLE1BQU0sRUFBRTtFQUNWLENBQUMsQ0FBQyxTQUFTLEVBQUU7QUFDZixDQUFDOztBQUVELE1BQU0sQ0FBQyxPQUFPLEdBQUcsY0FBYzs7O0FDM1MvQiw4RUFBOEU7QUFDOUUsU0FBUyxRQUFRLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQztFQUN2QyxJQUFJLE9BQU87RUFDWCxPQUFPLFlBQVksQ0FBQztJQUNsQixJQUFJLE9BQU8sR0FBRyxJQUFJO0lBQ2xCLElBQUksSUFBSSxHQUFHLFNBQVM7SUFDcEIsWUFBWSxDQUFDLE9BQU8sQ0FBQztJQUNyQixPQUFPLEdBQUcsVUFBVSxDQUFDLFlBQVksQ0FBQztNQUNoQyxPQUFPLEdBQUcsSUFBSTtNQUNkLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDO0tBQ3hDLEVBQUUsSUFBSSxDQUFDO0lBQ1IsSUFBSSxTQUFTLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDO0dBQ25EO0FBQ0gsQ0FBQyxDQUFDOztBQUVGLE1BQU0sQ0FBQyxPQUFPLEdBQUcsUUFBUTs7O0FDZnpCO0FBQ0E7O0FBRUEsR0FBRzs7QUFFSCxJQUFJLEtBQUssR0FBRyx3RUFBd0U7O0FBRXBGLFNBQVMsV0FBVyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQztFQUN0QyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxLQUFLLEtBQUssRUFBRTtJQUM3RCxPQUFPLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO0FBQ3RFLEdBQUc7O0VBRUQsSUFBSSxLQUFLLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxRQUFRLElBQUksS0FBSyxDQUFDLFlBQVksS0FBSyxTQUFTLEVBQUU7SUFDbkUsT0FBTyxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQztBQUMvQixHQUFHOztFQUVELEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDO0lBQzFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDO0FBQ3pCLEdBQUcsQ0FBQzs7RUFFRixLQUFLLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUM7SUFDNUMsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLHlCQUF5QixJQUFJLEtBQUssQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFDN0UsR0FBRyxDQUFDOztFQUVGLElBQUksS0FBSyxDQUFDLFFBQVEsRUFBRTtJQUNsQixJQUFJLEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRztJQUNuQixLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUs7SUFDakIsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHO0dBQ2hCO0FBQ0gsQ0FBQzs7QUFFRCxNQUFNLENBQUMsT0FBTyxHQUFHLFdBQVciLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEJhY2tncm91bmRMYXllciA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gIG9wdHMgPSBvcHRzIHx8IHt9XG5cbiAgdGhpcy5jb2xvcnMgPSBvcHRzLmNvbG9yc1xuXG4gIHRoaXMucGFyZW50ID0gb3B0cy5wYXJlbnRcbiAgdGhpcy5jb250ZXh0ID0gb3B0cy5jb250ZXh0XG4gIHRoaXMuaXNEaXJ0eSA9IHRydWVcbn1cblxuQmFja2dyb3VuZExheWVyLmNyZWF0ZSA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gIHJldHVybiBuZXcgQmFja2dyb3VuZExheWVyKG9wdHMpXG59XG5cbkJhY2tncm91bmRMYXllci5wcm90b3R5cGUucmV2YWxpZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5pc0RpcnR5ID0gdHJ1ZVxufVxuXG5CYWNrZ3JvdW5kTGF5ZXIucHJvdG90eXBlLnNldENvbG9ycyA9IGZ1bmN0aW9uIChjb2xvcnMpIHtcbiAgdGhpcy5jb2xvcnMgPSBjb2xvcnNcbn1cblxuQmFja2dyb3VuZExheWVyLnByb3RvdHlwZS5wYWludCA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHRoaXMuaXNEaXJ0eSkge1xuICAgIHZhciBwYXJlbnQgPSB0aGlzLnBhcmVudFxuICAgIHZhciBnID0gdGhpcy5jb250ZXh0XG5cbiAgICBpZiAoIXRoaXMuY29sb3JzIHx8ICF0aGlzLmNvbG9ycy5sZW5ndGgpIHtcbiAgICAgIGcuY2xlYXJSZWN0KDAsIDAsIHBhcmVudC53aWR0aCwgcGFyZW50LmhlaWdodClcbiAgICB9IGVsc2Uge1xuICAgICAgZy5maWxsU3R5bGUgPSB0aGlzLmNvbG9yc1swXVxuICAgICAgZy5maWxsUmVjdCgwLCAwLCBwYXJlbnQud2lkdGgsIHBhcmVudC5oZWlnaHQpXG4gICAgfVxuXG4gICAgaWYgKHRoaXMuY29sb3JzICYmIHRoaXMuY29sb3JzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHZhciBoID0gcGFyZW50LmhlaWdodFxuXG4gICAgICB2YXIgY29scyA9IDMyXG4gICAgICB2YXIgc2l6ZSA9IHBhcmVudC53aWR0aCAvIGNvbHNcbiAgICAgIHZhciByb3dzID0gTWF0aC5jZWlsKGggLyBzaXplKVxuXG4gICAgICBnLmZpbGxTdHlsZSA9IHRoaXMuY29sb3JzWzFdXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbHM7IGkgKz0gMSkge1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHJvd3M7IGogKz0gMSkge1xuICAgICAgICAgIGlmICgoaSArIGopICUgMiA9PT0gMCkge1xuICAgICAgICAgICAgZy5maWxsUmVjdChpICogc2l6ZSwgaiAqIHNpemUsIHNpemUsIHNpemUpXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5pc0RpcnR5ID0gZmFsc2VcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEJhY2tncm91bmRMYXllclxuIiwidmFyIGRlYm91bmNlID0gcmVxdWlyZSgnLi9kZWJvdW5jZS5qcycpXG52YXIgQmFja2dyb3VuZExheWVyID0gcmVxdWlyZSgnLi9CYWNrZ3JvdW5kTGF5ZXIuanMnKVxudmFyIEltYWdlTGF5ZXIgPSByZXF1aXJlKCcuL0ltYWdlTGF5ZXIuanMnKVxudmFyIFNlbGVjdGlvbkxheWVyID0gcmVxdWlyZSgnLi9TZWxlY3Rpb25MYXllci5qcycpXG52YXIgSW1hZ2UgPSByZXF1aXJlKCcuL0ltYWdlLmpzJylcbnZhciBMaXN0ZW5lcnMgPSByZXF1aXJlKCcuL0xpc3RlbmVycy5qcycpXG5cbnZhciBERUZBVUxUX0NBTlZBU19XSURUSCA9IDQwMFxudmFyIERFRkFVTFRfQ0FOVkFTX0hFSUdIVCA9IDMwMFxuXG52YXIgQ3JvcCA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gIHRoaXMucGFyZW50ID0gdHlwZW9mIG9wdHMucGFyZW50ID09PSAnc3RyaW5nJyA/IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Iob3B0cy5wYXJlbnQpIDogb3B0cy5wYXJlbnRcblxuICB0aGlzLmNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpXG4gIHRoaXMuY29udGV4dCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgdGhpcy5ib3VuZHNPcHRzID0gb3B0cy5ib3VuZHMgfHwge3dpZHRoOiAnMTAwJScsIGhlaWdodDogJ2F1dG8nfVxuICBvcHRzLnNlbGVjdGlvbiA9IG9wdHMuc2VsZWN0aW9uIHx8IHt9XG4gIHRoaXMuZGVib3VuY2VSZXNpemUgPSBvcHRzLmRlYm91bmNlUmVzaXplICE9PSB1bmRlZmluZWQgPyBvcHRzLmRlYm91bmNlUmVzaXplIDogdHJ1ZVxuICB0aGlzLmxpc3RlbmVycyA9IExpc3RlbmVycy5jcmVhdGUoKVxuXG4gIHRoaXMucGFyZW50LmFwcGVuZENoaWxkKHRoaXMuY2FudmFzKVxuXG4gIHRoaXMuYmFja2dyb3VuZExheWVyID0gQmFja2dyb3VuZExheWVyLmNyZWF0ZSh7XG4gICAgcGFyZW50OiB0aGlzLFxuICAgIGNvbnRleHQ6IHRoaXMuY29udGV4dCxcbiAgICBjb2xvcnM6IG9wdHMuYmFja2dyb3VuZENvbG9ycyB8fCBbJyNmZmYnLCAnI2YwZjBmMCddXG4gIH0pXG5cbiAgdGhpcy5pbWFnZUxheWVyID0gSW1hZ2VMYXllci5jcmVhdGUoe1xuICAgIHBhcmVudDogdGhpcyxcbiAgICBjb250ZXh0OiB0aGlzLmNvbnRleHQsXG4gICAgaW1hZ2U6IHRoaXMuaW1hZ2VcbiAgfSlcblxuICB0aGlzLnNlbGVjdGlvbkxheWVyID0gU2VsZWN0aW9uTGF5ZXIuY3JlYXRlKHtcbiAgICBwYXJlbnQ6IHRoaXMsXG4gICAgY29udGV4dDogdGhpcy5jb250ZXh0LFxuICAgIHRhcmdldDogdGhpcy5pbWFnZUxheWVyLFxuICAgIGFzcGVjdFJhdGlvOiBvcHRzLnNlbGVjdGlvbi5hc3BlY3RSYXRpbyxcbiAgICBtaW5XaWR0aDogb3B0cy5zZWxlY3Rpb24ubWluV2lkdGgsXG4gICAgbWluSGVpZ2h0OiBvcHRzLnNlbGVjdGlvbi5taW5IZWlnaHQsXG4gICAgeDogb3B0cy5zZWxlY3Rpb24ueCxcbiAgICB5OiBvcHRzLnNlbGVjdGlvbi55LFxuICAgIHdpZHRoOiBvcHRzLnNlbGVjdGlvbi53aWR0aCxcbiAgICBoZWlnaHQ6IG9wdHMuc2VsZWN0aW9uLmhlaWdodCxcbiAgICBoYW5kbGU6IHtcbiAgICAgIGNvbG9yOiBvcHRzLnNlbGVjdGlvbi5jb2xvcixcbiAgICAgIGFjdGl2ZUNvbG9yOiBvcHRzLnNlbGVjdGlvbi5hY3RpdmVDb2xvclxuICAgIH1cbiAgfSlcblxuICB2YXIgbGlzdGVuZXJzID0gdGhpcy5saXN0ZW5lcnNcbiAgdmFyIHBhaW50ID0gdGhpcy5wYWludC5iaW5kKHRoaXMpXG5cbiAgdGhpcy5zZWxlY3Rpb25MYXllclxuICAgIC5vbihcbiAgICAgICdzdGFydCcsXG4gICAgICBmdW5jdGlvbiAocmVnaW9uKSB7XG4gICAgICAgIHBhaW50KClcbiAgICAgICAgbGlzdGVuZXJzLm5vdGlmeSgnc3RhcnQnLCByZWdpb24pXG4gICAgICB9XG4gICAgKVxuICAgIC5vbihcbiAgICAgICdtb3ZlJyxcbiAgICAgIGZ1bmN0aW9uIChyZWdpb24pIHtcbiAgICAgICAgbGlzdGVuZXJzLm5vdGlmeSgnbW92ZScsIHJlZ2lvbilcbiAgICAgIH1cbiAgICApXG4gICAgLm9uKFxuICAgICAgJ3Jlc2l6ZScsXG4gICAgICBmdW5jdGlvbiAocmVnaW9uKSB7XG4gICAgICAgIGxpc3RlbmVycy5ub3RpZnkoJ3Jlc2l6ZScsIHJlZ2lvbilcbiAgICAgIH1cbiAgICApXG4gICAgLm9uKFxuICAgICAgJ2NoYW5nZScsXG4gICAgICBmdW5jdGlvbiAocmVnaW9uKSB7XG4gICAgICAgIHBhaW50KClcbiAgICAgICAgbGlzdGVuZXJzLm5vdGlmeSgnY2hhbmdlJywgcmVnaW9uKVxuICAgICAgfVxuICAgIClcbiAgICAub24oXG4gICAgICAnZW5kJyxcbiAgICAgIGZ1bmN0aW9uIChyZWdpb24pIHtcbiAgICAgICAgcGFpbnQoKVxuICAgICAgICBsaXN0ZW5lcnMubm90aWZ5KCdlbmQnLCByZWdpb24pXG4gICAgICB9XG4gICAgKVxuXG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFxuICAgICdyZXNpemUnLFxuICAgIHRoaXMuZGVib3VuY2VSZXNpemVcbiAgICAgID8gZGVib3VuY2UodGhpcy5yZXZhbGlkYXRlQW5kUGFpbnQuYmluZCh0aGlzKSwgMTAwKVxuICAgICAgOiB0aGlzLnJldmFsaWRhdGVBbmRQYWludC5iaW5kKHRoaXMpXG4gIClcblxuICB0aGlzLnNldEltYWdlKG9wdHMuaW1hZ2UpXG5cbiAgdGhpcy5yZXZhbGlkYXRlQW5kUGFpbnQoKVxufVxuXG5Dcm9wLmNyZWF0ZSA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gIHJldHVybiBuZXcgQ3JvcChvcHRzKVxufVxuXG5Dcm9wLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuICB0aGlzLmxpc3RlbmVycy5vbih0eXBlLCBmbilcbiAgcmV0dXJuIHRoaXNcbn1cblxuQ3JvcC5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gIHRoaXMubGlzdGVuZXJzLm9mZih0eXBlLCBmbilcbiAgcmV0dXJuIHRoaXNcbn1cblxuQ3JvcC5wcm90b3R5cGUucmV2YWxpZGF0ZUFuZFBhaW50ID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnJldmFsaWRhdGUoKVxuICB0aGlzLnBhaW50KClcbn1cblxuQ3JvcC5wcm90b3R5cGUucmV2YWxpZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHBhcmVudCA9IHRoaXMucGFyZW50XG4gIHZhciBpbWFnZSA9IHRoaXMuaW1hZ2VcblxuICB2YXIgYm91bmRzV2lkdGggPSB0aGlzLmJvdW5kc09wdHMud2lkdGhcbiAgdmFyIGJvdW5kc0hlaWdodCA9IHRoaXMuYm91bmRzT3B0cy5oZWlnaHRcbiAgdmFyIHdpZHRoID0gMFxuICB2YXIgaGVpZ2h0ID0gMFxuXG4gIGlmIChpc0ludGVnZXIoYm91bmRzV2lkdGgpKSB7XG4gICAgd2lkdGggPSBib3VuZHNXaWR0aFxuICB9IGVsc2UgaWYgKHBhcmVudCAmJiBpc1BlcmNlbnQoYm91bmRzV2lkdGgpKSB7XG4gICAgd2lkdGggPSBNYXRoLnJvdW5kKHBhcmVudC5jbGllbnRXaWR0aCAqIGdldFBlcmNlbnQoYm91bmRzV2lkdGgpIC8gMTAwKVxuICB9IGVsc2Uge1xuICAgIHdpZHRoID0gREVGQVVMVF9DQU5WQVNfV0lEVEhcbiAgfVxuXG4gIGlmIChpc0ludGVnZXIoYm91bmRzSGVpZ2h0KSkge1xuICAgIGhlaWdodCA9IGJvdW5kc0hlaWdodFxuICB9IGVsc2UgaWYgKGlzUGVyY2VudChib3VuZHNIZWlnaHQpKSB7XG4gICAgaGVpZ2h0ID0gTWF0aC5yb3VuZCh3aWR0aCAqIGdldFBlcmNlbnQoYm91bmRzSGVpZ2h0KSAvIDEwMClcbiAgfSBlbHNlIGlmIChpbWFnZSAmJiBpbWFnZS5oYXNMb2FkZWQgJiYgaXNBdXRvKGJvdW5kc0hlaWdodCkpIHtcbiAgICBoZWlnaHQgPSBNYXRoLmZsb29yKHdpZHRoIC8gaW1hZ2UuZ2V0QXNwZWN0UmF0aW8oKSlcbiAgfSBlbHNlIHtcbiAgICBoZWlnaHQgPSBERUZBVUxUX0NBTlZBU19IRUlHSFRcbiAgfVxuXG4gIHRoaXMucmVzaXplQ2FudmFzKHdpZHRoLCBoZWlnaHQpXG5cbiAgdGhpcy5iYWNrZ3JvdW5kTGF5ZXIucmV2YWxpZGF0ZSgpXG4gIHRoaXMuaW1hZ2VMYXllci5yZXZhbGlkYXRlKClcbiAgdGhpcy5zZWxlY3Rpb25MYXllci5yZXZhbGlkYXRlKClcbn1cblxuQ3JvcC5wcm90b3R5cGUucGFpbnQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBnID0gdGhpcy5jb250ZXh0XG5cbiAgZy5zYXZlKClcbiAgZy5zY2FsZSh0aGlzLnJhdGlvLCB0aGlzLnJhdGlvKVxuXG4gIHRoaXMuYmFja2dyb3VuZExheWVyLnBhaW50KClcblxuICBpZiAodGhpcy5pbWFnZSAmJiB0aGlzLmltYWdlLmhhc0xvYWRlZCkge1xuICAgIHRoaXMuaW1hZ2VMYXllci5wYWludCgpXG4gICAgdGhpcy5zZWxlY3Rpb25MYXllci5wYWludCgpXG4gIH1cblxuICBnLnJlc3RvcmUoKVxufVxuXG5Dcm9wLnByb3RvdHlwZS5yZXNpemVDYW52YXMgPSBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuICB2YXIgY29udGV4dCA9IHRoaXMuY29udGV4dFxuICB2YXIgY2FudmFzID0gdGhpcy5jYW52YXNcbiAgdGhpcy5yYXRpbyA9IDFcblxuICBpZiAoIWNvbnRleHQud2Via2l0QmFja2luZ1N0b3JlUGl4ZWxSYXRpbykge1xuICAgIHRoaXMucmF0aW8gPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyB8fCAxXG4gIH1cblxuICB0aGlzLndpZHRoID0gd2lkdGhcbiAgdGhpcy5oZWlnaHQgPSBoZWlnaHRcblxuICBjYW52YXMud2lkdGggPSB0aGlzLndpZHRoICogdGhpcy5yYXRpb1xuICBjYW52YXMuaGVpZ2h0ID0gdGhpcy5oZWlnaHQgKiB0aGlzLnJhdGlvXG59XG5cbkNyb3AucHJvdG90eXBlLnNldEltYWdlID0gZnVuY3Rpb24gKHNvdXJjZSkge1xuICB2YXIgaW1hZ2UgPSBJbWFnZS5jcmVhdGUoc291cmNlKVxuICAgIC5vbihcbiAgICAgICdsb2FkJyxcbiAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5zZWxlY3Rpb25MYXllci5vbkltYWdlTG9hZCgpXG4gICAgICAgIHRoaXMucmV2YWxpZGF0ZUFuZFBhaW50KClcbiAgICAgIH0uYmluZCh0aGlzKVxuICAgIClcbiAgICAub24oXG4gICAgICAnZXJyb3InLFxuICAgICAgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlKVxuICAgICAgfVxuICAgIClcblxuICB0aGlzLmltYWdlTGF5ZXIuc2V0SW1hZ2UoaW1hZ2UpXG4gIHRoaXMuaW1hZ2UgPSBpbWFnZVxuICB0aGlzLnJldmFsaWRhdGVBbmRQYWludCgpXG59XG5cbkNyb3AucHJvdG90eXBlLmdldEltYWdlID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5pbWFnZVxufVxuXG5Dcm9wLnByb3RvdHlwZS5zZXRBc3BlY3RSYXRpbyA9IGZ1bmN0aW9uIChhc3BlY3RSYXRpbykge1xuICB0aGlzLnNlbGVjdGlvbkxheWVyLnNldEFzcGVjdFJhdGlvKGFzcGVjdFJhdGlvKVxuICB0aGlzLnJldmFsaWRhdGVBbmRQYWludCgpXG59XG5cbkNyb3AucHJvdG90eXBlLnNldEJvdW5kcyA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gIHRoaXMuYm91bmRzT3B0cyA9IG9wdHNcbiAgdGhpcy5yZXZhbGlkYXRlQW5kUGFpbnQoKVxufVxuXG5Dcm9wLnByb3RvdHlwZS5zZXRCYWNrZ3JvdW5kQ29sb3JzID0gZnVuY3Rpb24gKGNvbG9ycykge1xuICB0aGlzLmJhY2tncm91bmRMYXllci5zZXRDb2xvcnMoY29sb3JzKVxuICB0aGlzLnJldmFsaWRhdGVBbmRQYWludCgpXG59XG5cbkNyb3AucHJvdG90eXBlLmRpc3Bvc2UgPSBub29wXG5cbmZ1bmN0aW9uIG5vb3AgKCkge307XG5cbmZ1bmN0aW9uIGlzUGVyY2VudCAodikge1xuICBpZiAodHlwZW9mIHYgIT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICBpZiAodi5sZW5ndGggPCAxKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICBpZiAodlt2Lmxlbmd0aCAtIDFdID09PSAnJScpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG59XG5cbmZ1bmN0aW9uIGdldFBlcmNlbnQgKHYpIHtcbiAgaWYgKCFpc1BlcmNlbnQodikpIHtcbiAgICByZXR1cm4gMFxuICB9XG5cbiAgcmV0dXJuIHYuc2xpY2UoMCwgLTEpXG59XG5cbmZ1bmN0aW9uIGlzQXV0byAodikge1xuICByZXR1cm4gdiA9PT0gJ2F1dG8nXG59XG5cbmZ1bmN0aW9uIGlzSW50ZWdlciAodikge1xuICByZXR1cm4gdHlwZW9mIHYgPT09ICdudW1iZXInICYmIE1hdGgucm91bmQodikgPT09IHZcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBDcm9wXG4iLCJ2YXIgbG9hZGVkID0gcmVxdWlyZSgnLi9pbWFnZUxvYWRlZC5qcycpXG52YXIgTGlzdGVuZXJzID0gcmVxdWlyZSgnLi9MaXN0ZW5lcnMuanMnKVxuXG52YXIgSW1hZ2UgPSBmdW5jdGlvbiAoc291cmNlKSB7XG4gIHRoaXMud2lkdGggPSAwXG4gIHRoaXMuaGVpZ2h0ID0gMFxuXG4gIHRoaXMuaGFzTG9hZGVkID0gZmFsc2VcbiAgdGhpcy5zcmMgPSBudWxsXG5cbiAgdGhpcy5saXN0ZW5lcnMgPSBMaXN0ZW5lcnMuY3JlYXRlKClcblxuICBpZiAoIXNvdXJjZSkge1xuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKHR5cGVvZiBzb3VyY2UgPT09ICdzdHJpbmcnKSB7XG4gICAgdGhpcy5zcmMgPSBzb3VyY2VcbiAgICB2YXIgaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJylcbiAgICBpbWcuc3JjID0gdGhpcy5zcmNcbiAgICBzb3VyY2UgPSBpbWdcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnNyYyA9IHNvdXJjZS5zcmNcbiAgfVxuXG4gIHRoaXMuc291cmNlID0gc291cmNlXG5cbiAgbG9hZGVkKHNvdXJjZSwgZnVuY3Rpb24gKGVycikge1xuICAgIGlmIChlcnIpIHtcbiAgICAgIHRoaXMubm90aWZ5KCdlcnJvcicsIGVycilcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5oYXNMb2FkZWQgPSB0cnVlXG4gICAgICB0aGlzLndpZHRoID0gc291cmNlLm5hdHVyYWxXaWR0aFxuICAgICAgdGhpcy5oZWlnaHQgPSBzb3VyY2UubmF0dXJhbEhlaWdodFxuICAgICAgdGhpcy5ub3RpZnkoJ2xvYWQnLCB0aGlzKVxuICAgIH1cbiAgfS5iaW5kKHRoaXMpKVxufVxuXG5JbWFnZS5jcmVhdGUgPSBmdW5jdGlvbiAoc291cmNlKSB7XG4gIHJldHVybiBuZXcgSW1hZ2Uoc291cmNlKVxufVxuXG5JbWFnZS5wcm90b3R5cGUuZ2V0QXNwZWN0UmF0aW8gPSBmdW5jdGlvbiAoKSB7XG4gIGlmICghdGhpcy5oYXNMb2FkZWQpIHtcbiAgICByZXR1cm4gMVxuICB9XG5cbiAgcmV0dXJuIHRoaXMud2lkdGggLyB0aGlzLmhlaWdodFxufVxuXG5JbWFnZS5wcm90b3R5cGUubm90aWZ5ID0gZnVuY3Rpb24gKHR5cGUsIGRhdGEpIHtcbiAgdmFyIGxpc3RlbmVycyA9IHRoaXMubGlzdGVuZXJzXG4gIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIGxpc3RlbmVycy5ub3RpZnkodHlwZSwgZGF0YSlcbiAgfSwgMClcbn1cblxuSW1hZ2UucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gIHRoaXMubGlzdGVuZXJzLm9uKHR5cGUsIGZuKVxuICByZXR1cm4gdGhpc1xufVxuXG5JbWFnZS5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gIHRoaXMubGlzdGVuZXJzLm9mZih0eXBlLCBmbilcbiAgcmV0dXJuIHRoaXNcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBJbWFnZVxuIiwidmFyIFJlY3RhbmdsZSA9IHJlcXVpcmUoJy4vUmVjdGFuZ2xlLmpzJylcblxudmFyIEltYWdlTGF5ZXIgPSBmdW5jdGlvbiAob3B0cykge1xuICBvcHRzID0gb3B0cyB8fCB7fVxuICB0aGlzLmJvdW5kcyA9IFJlY3RhbmdsZS5jcmVhdGUoMCwgMCwgMCwgMClcbiAgdGhpcy5pbWFnZSA9IG9wdHMuaW1hZ2UgfHwgbnVsbFxuICB0aGlzLnBhcmVudCA9IG9wdHMucGFyZW50XG4gIHRoaXMuY29udGV4dCA9IG9wdHMuY29udGV4dFxufVxuXG5JbWFnZUxheWVyLmNyZWF0ZSA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gIHJldHVybiBuZXcgSW1hZ2VMYXllcihvcHRzKVxufVxuXG5JbWFnZUxheWVyLnByb3RvdHlwZS5zZXRJbWFnZSA9IGZ1bmN0aW9uIChpbWFnZSkge1xuICB0aGlzLmltYWdlID0gaW1hZ2Vcbn1cblxuSW1hZ2VMYXllci5wcm90b3R5cGUucmV2YWxpZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHBhcmVudCA9IHRoaXMucGFyZW50XG4gIHZhciBpbWFnZSA9IHRoaXMuaW1hZ2VcbiAgdmFyIGJvdW5kcyA9IHRoaXMuYm91bmRzXG5cbiAgaWYgKGltYWdlKSB7XG4gICAgLy8gQ29uc3RyYWluZWQgYnkgd2lkdGggKG90aGVyd2lzZSBoZWlnaHQpXG4gICAgaWYgKGltYWdlLndpZHRoIC8gaW1hZ2UuaGVpZ2h0ID49IHBhcmVudC53aWR0aCAvIHBhcmVudC5oZWlnaHQpIHtcbiAgICAgIGJvdW5kcy53aWR0aCA9IHBhcmVudC53aWR0aFxuICAgICAgYm91bmRzLmhlaWdodCA9IE1hdGguY2VpbChpbWFnZS5oZWlnaHQgLyBpbWFnZS53aWR0aCAqIHBhcmVudC53aWR0aClcbiAgICAgIGJvdW5kcy54ID0gMFxuICAgICAgYm91bmRzLnkgPSBNYXRoLmZsb29yKChwYXJlbnQuaGVpZ2h0IC0gYm91bmRzLmhlaWdodCkgKiAwLjUpXG4gICAgfSBlbHNlIHtcbiAgICAgIGJvdW5kcy53aWR0aCA9IE1hdGguY2VpbChpbWFnZS53aWR0aCAvIGltYWdlLmhlaWdodCAqIHBhcmVudC5oZWlnaHQpXG4gICAgICBib3VuZHMuaGVpZ2h0ID0gcGFyZW50LmhlaWdodFxuICAgICAgYm91bmRzLnggPSBNYXRoLmZsb29yKChwYXJlbnQud2lkdGggLSBib3VuZHMud2lkdGgpICogMC41KVxuICAgICAgYm91bmRzLnkgPSAwXG4gICAgfVxuICB9XG59XG5cbkltYWdlTGF5ZXIucHJvdG90eXBlLnBhaW50ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgZyA9IHRoaXMuY29udGV4dFxuICB2YXIgaW1hZ2UgPSB0aGlzLmltYWdlXG4gIHZhciBib3VuZHMgPSB0aGlzLmJvdW5kc1xuXG4gIGlmIChpbWFnZSAmJiBpbWFnZS5oYXNMb2FkZWQpIHtcbiAgICBnLmRyYXdJbWFnZShcbiAgICAgIGltYWdlLnNvdXJjZSxcbiAgICAgIDAsIDAsIGltYWdlLndpZHRoLCBpbWFnZS5oZWlnaHQsXG4gICAgICBib3VuZHMueCwgYm91bmRzLnksIGJvdW5kcy53aWR0aCwgYm91bmRzLmhlaWdodFxuICAgIClcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEltYWdlTGF5ZXJcbiIsInZhciBMaXN0ZW5lcnMgPSByZXF1aXJlKCcuL0xpc3RlbmVycy5qcycpXG5cbnZhciBJbnB1dCA9IGZ1bmN0aW9uIChkb21FbGVtZW50KSB7XG4gIHZhciBsaXN0ZW5lcnMgPSBMaXN0ZW5lcnMuY3JlYXRlKClcbiAgdmFyIGRvd25FdmVudCA9IG51bGxcbiAgdGhpcy5saXN0ZW5lcnMgPSBsaXN0ZW5lcnNcblxuICBmdW5jdGlvbiBjcmVhdGVFdmVudEZvck1vdXNlIChzb3VyY2UpIHtcbiAgICB2YXIgeCA9IHNvdXJjZS5vZmZzZXRYXG4gICAgdmFyIHkgPSBzb3VyY2Uub2Zmc2V0WVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHNvdXJjZTogc291cmNlLFxuICAgICAgeDogeCxcbiAgICAgIHk6IHksXG4gICAgICBkeDogZG93bkV2ZW50ID8geCAtIGRvd25FdmVudC54IDogMCxcbiAgICAgIGR5OiBkb3duRXZlbnQgPyB5IC0gZG93bkV2ZW50LnkgOiAwLFxuICAgICAgdHlwZTogJ01vdXNlJ1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUV2ZW50Rm9yVG91Y2ggKHNvdXJjZSkge1xuICAgIHZhciBib3VuZHMgPSBzb3VyY2UudGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpXG4gICAgdmFyIHRvdWNoID0gc291cmNlLnRvdWNoZXMubGVuZ3RoID4gMCA/IHNvdXJjZS50b3VjaGVzWzBdIDogc291cmNlLmNoYW5nZWRUb3VjaGVzWzBdXG5cbiAgICB2YXIgeCA9IHRvdWNoLmNsaWVudFggLSBib3VuZHMubGVmdFxuICAgIHZhciB5ID0gdG91Y2guY2xpZW50WSAtIGJvdW5kcy50b3BcblxuICAgIHJldHVybiB7XG4gICAgICBzb3VyY2U6IHNvdXJjZSxcbiAgICAgIHg6IHgsXG4gICAgICB5OiB5LFxuICAgICAgZHg6IGRvd25FdmVudCA/IHggLSBkb3duRXZlbnQueCA6IDAsXG4gICAgICBkeTogZG93bkV2ZW50ID8geSAtIGRvd25FdmVudC55IDogMCxcbiAgICAgIHR5cGU6ICdUb3VjaCdcbiAgICB9XG4gIH1cblxuICBkb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICBkb3duRXZlbnQgPSBjcmVhdGVFdmVudEZvck1vdXNlKHNvdXJjZSlcbiAgICBsaXN0ZW5lcnMubm90aWZ5KCdkb3duJywgZG93bkV2ZW50KVxuICB9KVxuXG4gIGRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICBkb3duRXZlbnQgPSBjcmVhdGVFdmVudEZvclRvdWNoKHNvdXJjZSlcbiAgICBsaXN0ZW5lcnMubm90aWZ5KCdkb3duJywgZG93bkV2ZW50KVxuICB9KVxuXG4gIGRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZnVuY3Rpb24gKHNvdXJjZSkge1xuICAgIGxpc3RlbmVycy5ub3RpZnkoJ21vdmUnLCBjcmVhdGVFdmVudEZvck1vdXNlKHNvdXJjZSkpXG4gIH0pXG5cbiAgZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgbGlzdGVuZXJzLm5vdGlmeSgnbW92ZScsIGNyZWF0ZUV2ZW50Rm9yVG91Y2goc291cmNlKSlcbiAgfSlcblxuICBkb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgbGlzdGVuZXJzLm5vdGlmeSgndXAnLCBjcmVhdGVFdmVudEZvck1vdXNlKHNvdXJjZSkpXG4gIH0pXG5cbiAgZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICBsaXN0ZW5lcnMubm90aWZ5KCd1cCcsIGNyZWF0ZUV2ZW50Rm9yVG91Y2goc291cmNlKSlcbiAgICBkb3duRXZlbnQgPSBudWxsXG4gIH0pXG5cbiAgZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW91dCcsIGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICBsaXN0ZW5lcnMubm90aWZ5KCdjYW5jZWwnLCBjcmVhdGVFdmVudEZvck1vdXNlKHNvdXJjZSkpXG4gICAgZG93bkV2ZW50ID0gbnVsbFxuICB9KVxuXG4gIGRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hjYW5jZWwnLCBmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgbGlzdGVuZXJzLm5vdGlmeSgnY2FuY2VsJywgY3JlYXRlRXZlbnRGb3JUb3VjaChzb3VyY2UpKVxuICAgIGRvd25FdmVudCA9IG51bGxcbiAgfSlcbn1cblxuSW5wdXQuY3JlYXRlID0gZnVuY3Rpb24gKGRvbUVsZW1lbnQpIHtcbiAgcmV0dXJuIG5ldyBJbnB1dChkb21FbGVtZW50KVxufVxuXG5JbnB1dC5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAodHlwZSwgZm4pIHtcbiAgdGhpcy5saXN0ZW5lcnMub24odHlwZSwgZm4pXG4gIHJldHVybiB0aGlzXG59XG5cbklucHV0LnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbiAodHlwZSwgZm4pIHtcbiAgdGhpcy5saXN0ZW5lcnMub2ZmKHR5cGUsIGZuKVxuICByZXR1cm4gdGhpc1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IElucHV0XG4iLCJ2YXIgTGlzdGVuZXJzID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgdGhpcy5ldmVudHMgPSB7fVxufVxuXG5MaXN0ZW5lcnMuY3JlYXRlID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgcmV0dXJuIG5ldyBMaXN0ZW5lcnMob3B0cylcbn1cblxuTGlzdGVuZXJzLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuICBpZiAoIXRoaXMuZXZlbnRzW3R5cGVdKSB7XG4gICAgdGhpcy5ldmVudHNbdHlwZV0gPSBbXVxuICB9XG5cbiAgaWYgKHRoaXMuZXZlbnRzW3R5cGVdLmluZGV4T2YoZm4pID09PSAtMSkge1xuICAgIHRoaXMuZXZlbnRzW3R5cGVdLnB1c2goZm4pXG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG5MaXN0ZW5lcnMucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uICh0eXBlLCBmbikge1xuICBpZiAodGhpcy5ldmVudHNbdHlwZV0pIHtcbiAgICB2YXIgaSA9IHRoaXMuZXZlbnRzW3R5cGVdLmluZGV4T2YoZm4pXG4gICAgaWYgKGkgIT09IC0xKSB7XG4gICAgICB0aGlzLmV2ZW50c1t0eXBlXS5zcGxpY2UoaSwgMSlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpc1xufVxuXG5MaXN0ZW5lcnMucHJvdG90eXBlLm5vdGlmeSA9IGZ1bmN0aW9uICh0eXBlLCBkYXRhKSB7XG4gIGlmICh0aGlzLmV2ZW50c1t0eXBlXSkge1xuICAgIHRoaXMuZXZlbnRzW3R5cGVdLmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICBmbi5jYWxsKHRoaXMsIGRhdGEpXG4gICAgfS5iaW5kKHRoaXMpKVxuICB9XG59XG5cbkxpc3RlbmVycy5wcm90b3R5cGUuY2xlYXJBbGwgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuZXZlbnRzID0ge31cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBMaXN0ZW5lcnNcbiIsInZhciBSZWN0YW5nbGUgPSBmdW5jdGlvbiAoeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICB0aGlzLl94ID0geFxuICB0aGlzLl95ID0geVxuICB0aGlzLl93aWR0aCA9IHdpZHRoXG4gIHRoaXMuX2hlaWdodCA9IGhlaWdodFxufVxuXG5SZWN0YW5nbGUucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAoY29weSkge1xuICB0aGlzLl94ID0gY29weS54XG4gIHRoaXMuX3kgPSBjb3B5LnlcbiAgdGhpcy5fd2lkdGggPSBjb3B5LndpZHRoXG4gIHRoaXMuX2hlaWdodCA9IGNvcHkuaGVpZ2h0XG4gIHJldHVybiB0aGlzXG59XG5cblJlY3RhbmdsZS5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBSZWN0YW5nbGUuY3JlYXRlKHRoaXMuX3gsIHRoaXMuX3ksIHRoaXMuX3dpZHRoLCB0aGlzLl9oZWlnaHQpXG59XG5cblJlY3RhbmdsZS5wcm90b3R5cGUucm91bmQgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBkeCA9IHRoaXMuX3hcbiAgdmFyIGR5ID0gdGhpcy5feVxuICB0aGlzLl94ID0gTWF0aC5yb3VuZChkeClcbiAgdGhpcy5feSA9IE1hdGgucm91bmQoZHkpXG4gIGR4IC09IHRoaXMuX3hcbiAgZHkgLT0gdGhpcy5feVxuICB0aGlzLl93aWR0aCA9IE1hdGgucm91bmQodGhpcy5fd2lkdGggKyBkeClcbiAgdGhpcy5faGVpZ2h0ID0gTWF0aC5yb3VuZCh0aGlzLl9oZWlnaHQgKyBkeSlcbiAgcmV0dXJuIHRoaXNcbn1cblxuUmVjdGFuZ2xlLnByb3RvdHlwZS5pc0luc2lkZSA9IGZ1bmN0aW9uIChwb2ludCkge1xuICByZXR1cm4gcG9pbnQueCA+PSB0aGlzLmxlZnQgJiZcbiAgICBwb2ludC55ID49IHRoaXMudG9wICYmXG4gICAgcG9pbnQueCA8IHRoaXMucmlnaHQgJiZcbiAgICBwb2ludC55IDwgdGhpcy5ib3R0b21cbn1cblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoUmVjdGFuZ2xlLnByb3RvdHlwZSwge1xuICB4OiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLl94IH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLl94ID0gdiB9XG4gIH0sXG4gIHk6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3kgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuX3kgPSB2IH1cbiAgfSxcbiAgY2VudGVyWDoge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5feCArIHRoaXMuX3dpZHRoICogMC41IH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLl94ID0gdiAtIHRoaXMuX3dpZHRoICogMC41IH1cbiAgfSxcbiAgY2VudGVyWToge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5feSArIHRoaXMuX2hlaWdodCAqIDAuNSB9LFxuICAgIHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5feSA9IHYgLSB0aGlzLl9oZWlnaHQgKiAwLjUgfVxuICB9LFxuICB3aWR0aDoge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fd2lkdGggfSxcbiAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuX3dpZHRoID0gdiB9XG4gIH0sXG4gIGhlaWdodDoge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5faGVpZ2h0IH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLl9oZWlnaHQgPSB2IH1cbiAgfSxcbiAgbGVmdDoge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5feCB9LFxuICAgIHNldDogZnVuY3Rpb24gKHYpIHtcbiAgICAgIHRoaXMuX3dpZHRoID0gdGhpcy5feCArIHRoaXMuX3dpZHRoIC0gdlxuICAgICAgdGhpcy5feCA9IHZcbiAgICB9XG4gIH0sXG4gIHRvcDoge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5feSB9LFxuICAgIHNldDogZnVuY3Rpb24gKHYpIHtcbiAgICAgIHRoaXMuX2hlaWdodCA9IHRoaXMuX3kgKyB0aGlzLl9oZWlnaHQgLSB2XG4gICAgICB0aGlzLl95ID0gdlxuICAgIH1cbiAgfSxcbiAgcmlnaHQ6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3ggKyB0aGlzLl93aWR0aCB9LFxuICAgIHNldDogZnVuY3Rpb24gKHYpIHtcbiAgICAgIHRoaXMuX3dpZHRoID0gdiAtIHRoaXMuX3hcbiAgICB9XG4gIH0sXG4gIGJvdHRvbToge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5feSArIHRoaXMuX2hlaWdodCB9LFxuICAgIHNldDogZnVuY3Rpb24gKHYpIHtcbiAgICAgIHRoaXMuX2hlaWdodCA9IHYgLSB0aGlzLl95XG4gICAgfVxuICB9LFxuICBhc3BlY3RSYXRpbzoge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fd2lkdGggLyB0aGlzLl9oZWlnaHQgfVxuICB9XG59KVxuXG5SZWN0YW5nbGUuY3JlYXRlID0gZnVuY3Rpb24gKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgcmV0dXJuIG5ldyBSZWN0YW5nbGUoeCwgeSwgd2lkdGgsIGhlaWdodClcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBSZWN0YW5nbGVcbiIsInZhciBSZWN0YW5nbGUgPSByZXF1aXJlKCcuL1JlY3RhbmdsZS5qcycpXG5cbnZhciBTZWxlY3Rpb24gPSBmdW5jdGlvbiAob3B0cykge1xuICB0aGlzLnRhcmdldCA9IG9wdHMudGFyZ2V0IHx8IG51bGxcbiAgdGhpcy5ib3VuZHMgPSBSZWN0YW5nbGUuY3JlYXRlKDAsIDAsIDAsIDApXG4gIHRoaXMuYm91bmRzUHggPSBSZWN0YW5nbGUuY3JlYXRlKDAsIDAsIDAsIDApXG4gIHRoaXMucmVnaW9uID0gUmVjdGFuZ2xlLmNyZWF0ZSgwLCAwLCAwLCAwKVxuXG4gIHRoaXMuaW5pdGlhbE9wdHMgPSB7XG4gICAgeDogb3B0cy54LFxuICAgIHk6IG9wdHMueSxcbiAgICB3aWR0aDogb3B0cy53aWR0aCxcbiAgICBoZWlnaHQ6IG9wdHMuaGVpZ2h0XG4gIH1cblxuICB0aGlzLmFzcGVjdFJhdGlvID0gb3B0cy5hc3BlY3RSYXRpb1xuICB0aGlzLm1pbldpZHRoID0gb3B0cy5taW5XaWR0aCAhPT0gdW5kZWZpbmVkID8gb3B0cy5taW5XaWR0aCA6IDEwMFxuICB0aGlzLm1pbkhlaWdodCA9IG9wdHMubWluSGVpZ2h0ICE9PSB1bmRlZmluZWQgPyBvcHRzLm1pbkhlaWdodCA6IDEwMFxuXG4gIHRoaXMuYm91bmRzTWluV2lkdGggPSAwXG4gIHRoaXMuYm91bmRzTWluSGVpZ2h0ID0gMFxuXG4gIHRoaXMuX2RlbHRhID0ge3g6IDAsIGg6IDB9XG59XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFNlbGVjdGlvbi5wcm90b3R5cGUsIHtcbiAgeDoge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5ib3VuZHMueCB9LFxuICAgIHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5ib3VuZHMueCA9IHYgfVxuICB9LFxuICB5OiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLmJvdW5kcy55IH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodikgeyB0aGlzLmJvdW5kcy55ID0gdiB9XG4gIH0sXG4gIHdpZHRoOiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLmJvdW5kcy53aWR0aCB9LFxuICAgIHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5ib3VuZHMud2lkdGggPSB2IH1cbiAgfSxcbiAgaGVpZ2h0OiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLmJvdW5kcy5oZWlnaHQgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuYm91bmRzLmhlaWdodCA9IHYgfVxuICB9LFxuICBsZWZ0OiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLmJvdW5kcy54IH0sXG4gICAgc2V0OiBmdW5jdGlvbiAodikge1xuICAgICAgdGhpcy5ib3VuZHMubGVmdCA9IHZcbiAgICB9XG4gIH0sXG4gIHRvcDoge1xuICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5ib3VuZHMueSB9LFxuICAgIHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5ib3VuZHMudG9wID0gdiB9XG4gIH0sXG4gIHJpZ2h0OiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLmJvdW5kcy5yaWdodCB9LFxuICAgIHNldDogZnVuY3Rpb24gKHYpIHsgdGhpcy5ib3VuZHMucmlnaHQgPSB2IH1cbiAgfSxcbiAgYm90dG9tOiB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLmJvdW5kcy5ib3R0b20gfSxcbiAgICBzZXQ6IGZ1bmN0aW9uICh2KSB7IHRoaXMuYm91bmRzLmJvdHRvbSA9IHYgfVxuICB9XG59KVxuXG5TZWxlY3Rpb24ucHJvdG90eXBlLmdldEJvdW5kc0xlbmd0aEZvclJlZ2lvbiA9IGZ1bmN0aW9uIChyZWdpb25MZW4pIHtcbiAgcmV0dXJuIHJlZ2lvbkxlbiAvIHRoaXMucmVnaW9uLndpZHRoICogdGhpcy53aWR0aFxufVxuXG5TZWxlY3Rpb24ucHJvdG90eXBlLm1vdmVCeSA9IGZ1bmN0aW9uIChkeCwgZHkpIHtcbiAgdmFyIGJvdW5kcyA9IHRoaXMuYm91bmRzXG4gIHZhciB0YXJnZXQgPSB0aGlzLnRhcmdldFxuXG4gIGJvdW5kcy54ID0gTWF0aC5taW4oTWF0aC5tYXgoYm91bmRzLnggKyBkeCwgdGFyZ2V0LmJvdW5kcy54KSwgdGFyZ2V0LmJvdW5kcy54ICsgdGFyZ2V0LmJvdW5kcy53aWR0aCAtIGJvdW5kcy53aWR0aClcbiAgYm91bmRzLnkgPSBNYXRoLm1pbihNYXRoLm1heChib3VuZHMueSArIGR5LCB0YXJnZXQuYm91bmRzLnkpLCB0YXJnZXQuYm91bmRzLnkgKyB0YXJnZXQuYm91bmRzLmhlaWdodCAtIGJvdW5kcy5oZWlnaHQpXG5cbiAgcmV0dXJuIHRoaXMudXBkYXRlUmVnaW9uRnJvbUJvdW5kcygpXG59XG5cblNlbGVjdGlvbi5wcm90b3R5cGUucmVzaXplQnkgPSBmdW5jdGlvbiAoZHgsIGR5LCBwKSB7XG4gIHZhciBkZWx0YSA9IHRoaXMuX2RlbHRhXG4gIHZhciBhc3BlY3RSYXRpbyA9IHRoaXMuYXNwZWN0UmF0aW9cbiAgdmFyIGJvdW5kcyA9IHRoaXMuYm91bmRzXG4gIHZhciBib3VuZHNNaW5XaWR0aCA9IHRoaXMuYm91bmRzTWluV2lkdGhcbiAgdmFyIGJvdW5kc01pbkhlaWdodCA9IHRoaXMuYm91bmRzTWluSGVpZ2h0XG4gIHZhciB0YXJnZXQgPSB0aGlzLnRhcmdldFxuXG4gIGZ1bmN0aW9uIGNhbGN1bGF0ZURlbHRhICh4LCB5KSB7XG4gICAgZGVsdGEud2lkdGggPSBib3VuZHMud2lkdGggKyB4XG4gICAgZGVsdGEuaGVpZ2h0ID0gYm91bmRzLmhlaWdodCArIHlcblxuICAgIGRlbHRhLndpZHRoID0gTWF0aC5tYXgoYm91bmRzTWluV2lkdGgsIGRlbHRhLndpZHRoKVxuICAgIGRlbHRhLmhlaWdodCA9IE1hdGgubWF4KGJvdW5kc01pbkhlaWdodCwgZGVsdGEuaGVpZ2h0KVxuXG4gICAgaWYgKGFzcGVjdFJhdGlvKSB7XG4gICAgICBpZiAoZGVsdGEud2lkdGggLyBkZWx0YS5oZWlnaHQgPiBhc3BlY3RSYXRpbykge1xuICAgICAgICBkZWx0YS53aWR0aCA9IGRlbHRhLmhlaWdodCAqIGFzcGVjdFJhdGlvXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkZWx0YS5oZWlnaHQgPSBkZWx0YS53aWR0aCAvIGFzcGVjdFJhdGlvXG4gICAgICB9XG4gICAgfVxuXG4gICAgZGVsdGEud2lkdGggLT0gYm91bmRzLndpZHRoXG4gICAgZGVsdGEuaGVpZ2h0IC09IGJvdW5kcy5oZWlnaHRcblxuICAgIHJldHVybiBkZWx0YVxuICB9XG5cbiAgaWYgKHBbMF0gPT09ICduJykge1xuICAgIGR5ID0gTWF0aC5taW4oZHksIHRoaXMudG9wIC0gdGFyZ2V0LmJvdW5kcy50b3ApXG4gIH0gZWxzZSBpZiAocFswXSA9PT0gJ3MnKSB7XG4gICAgZHkgPSBNYXRoLm1pbihkeSwgdGFyZ2V0LmJvdW5kcy5ib3R0b20gLSB0aGlzLmJvdHRvbSlcbiAgfVxuXG4gIGlmIChwWzFdID09PSAndycpIHtcbiAgICBkeCA9IE1hdGgubWluKGR4LCB0aGlzLmxlZnQgLSB0YXJnZXQuYm91bmRzLmxlZnQpXG4gIH0gZWxzZSBpZiAocFsxXSA9PT0gJ2UnKSB7XG4gICAgZHggPSBNYXRoLm1pbihkeCwgdGFyZ2V0LmJvdW5kcy5yaWdodCAtIHRoaXMucmlnaHQpXG4gIH1cblxuICBkZWx0YSA9IGNhbGN1bGF0ZURlbHRhKGR4LCBkeSlcblxuICBzd2l0Y2ggKHApIHtcbiAgICBjYXNlICdudyc6XG4gICAgICB0aGlzLmxlZnQgLT0gZGVsdGEud2lkdGhcbiAgICAgIHRoaXMudG9wIC09IGRlbHRhLmhlaWdodFxuICAgICAgYnJlYWtcbiAgICBjYXNlICduZSc6XG4gICAgICB0aGlzLnJpZ2h0ICs9IGRlbHRhLndpZHRoXG4gICAgICB0aGlzLnRvcCAtPSBkZWx0YS5oZWlnaHRcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnc3cnOlxuICAgICAgdGhpcy5sZWZ0IC09IGRlbHRhLndpZHRoXG4gICAgICB0aGlzLmJvdHRvbSArPSBkZWx0YS5oZWlnaHRcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnc2UnOlxuICAgICAgdGhpcy5yaWdodCArPSBkZWx0YS53aWR0aFxuICAgICAgdGhpcy5ib3R0b20gKz0gZGVsdGEuaGVpZ2h0XG4gICAgICBicmVha1xuICB9XG5cbiAgcmV0dXJuIHRoaXMudXBkYXRlUmVnaW9uRnJvbUJvdW5kcygpXG59XG5cblNlbGVjdGlvbi5wcm90b3R5cGUuYXV0b1NpemVSZWdpb24gPSBmdW5jdGlvbiAoKSB7XG4gIHZhciB0YXJnZXQgPSB0aGlzLnRhcmdldFxuICB2YXIgcmVnaW9uID0gdGhpcy5yZWdpb25cbiAgdmFyIGFzcGVjdFJhdGlvID0gdGhpcy5hc3BlY3RSYXRpb1xuICB2YXIgaW5pdGlhbE9wdHMgPSB0aGlzLmluaXRpYWxPcHRzXG4gIHZhciBiZWZvcmVYID0gcmVnaW9uLnhcbiAgdmFyIGJlZm9yZVkgPSByZWdpb24ueVxuICB2YXIgYmVmb3JlV2lkdGggPSByZWdpb24ud2lkdGhcbiAgdmFyIGJlZm9yZUhlaWdodCA9IHJlZ2lvbi5oZWlnaHRcblxuICByZWdpb24ueCA9IGluaXRpYWxPcHRzLnggIT09IHVuZGVmaW5lZCA/IGluaXRpYWxPcHRzLnggOiAwXG4gIHJlZ2lvbi55ID0gaW5pdGlhbE9wdHMueSAhPT0gdW5kZWZpbmVkID8gaW5pdGlhbE9wdHMueSA6IDBcblxuICByZWdpb24ud2lkdGggPSBpbml0aWFsT3B0cy53aWR0aCAhPT0gdW5kZWZpbmVkID8gaW5pdGlhbE9wdHMud2lkdGggOiB0YXJnZXQuaW1hZ2Uud2lkdGhcbiAgcmVnaW9uLmhlaWdodCA9IGluaXRpYWxPcHRzLmhlaWdodCAhPT0gdW5kZWZpbmVkID8gaW5pdGlhbE9wdHMuaGVpZ2h0IDogdGFyZ2V0LmltYWdlLmhlaWdodFxuXG4gIGlmIChhc3BlY3RSYXRpbykge1xuICAgIGlmIChyZWdpb24ud2lkdGggLyByZWdpb24uaGVpZ2h0ID4gYXNwZWN0UmF0aW8pIHtcbiAgICAgIHJlZ2lvbi53aWR0aCA9IHJlZ2lvbi5oZWlnaHQgKiBhc3BlY3RSYXRpb1xuICAgIH0gZWxzZSB7XG4gICAgICByZWdpb24uaGVpZ2h0ID0gcmVnaW9uLndpZHRoIC8gYXNwZWN0UmF0aW9cbiAgICB9XG4gIH1cblxuICBpZiAoaW5pdGlhbE9wdHMueCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmVnaW9uLmNlbnRlclggPSB0YXJnZXQuaW1hZ2Uud2lkdGggKiAwLjVcbiAgfVxuXG4gIGlmIChpbml0aWFsT3B0cy55ID09PSB1bmRlZmluZWQpIHtcbiAgICByZWdpb24uY2VudGVyWSA9IHRhcmdldC5pbWFnZS5oZWlnaHQgKiAwLjVcbiAgfVxuXG4gIHJlZ2lvbi5yb3VuZCgpXG5cbiAgdGhpcy51cGRhdGVCb3VuZHNGcm9tUmVnaW9uKClcblxuICByZXR1cm4gcmVnaW9uLnggIT09IGJlZm9yZVggfHxcbiAgICByZWdpb24ueSAhPT0gYmVmb3JlWSB8fFxuICAgIHJlZ2lvbi53aWR0aCAhPT0gYmVmb3JlV2lkdGggfHxcbiAgICByZWdpb24uaGVpZ2h0ICE9PSBiZWZvcmVIZWlnaHRcbn1cblxuU2VsZWN0aW9uLnByb3RvdHlwZS51cGRhdGVSZWdpb25Gcm9tQm91bmRzID0gZnVuY3Rpb24gKCkge1xuICB2YXIgdGFyZ2V0ID0gdGhpcy50YXJnZXRcbiAgdmFyIHJlZ2lvbiA9IHRoaXMucmVnaW9uXG4gIHZhciBib3VuZHMgPSB0aGlzLmJvdW5kc1xuICB2YXIgYmVmb3JlWCA9IHJlZ2lvbi54XG4gIHZhciBiZWZvcmVZID0gcmVnaW9uLnlcbiAgdmFyIGJlZm9yZVdpZHRoID0gcmVnaW9uLndpZHRoXG4gIHZhciBiZWZvcmVIZWlnaHQgPSByZWdpb24uaGVpZ2h0XG5cbiAgcmVnaW9uLnggPSB0YXJnZXQuaW1hZ2Uud2lkdGggKiAoYm91bmRzLnggLSB0YXJnZXQuYm91bmRzLngpIC8gdGFyZ2V0LmJvdW5kcy53aWR0aFxuICByZWdpb24ueSA9IHRhcmdldC5pbWFnZS5oZWlnaHQgKiAoYm91bmRzLnkgLSB0YXJnZXQuYm91bmRzLnkpIC8gdGFyZ2V0LmJvdW5kcy5oZWlnaHRcblxuICByZWdpb24ud2lkdGggPSB0YXJnZXQuaW1hZ2Uud2lkdGggKiAoYm91bmRzLndpZHRoIC8gdGFyZ2V0LmJvdW5kcy53aWR0aClcbiAgcmVnaW9uLmhlaWdodCA9IHRhcmdldC5pbWFnZS5oZWlnaHQgKiAoYm91bmRzLmhlaWdodCAvIHRhcmdldC5ib3VuZHMuaGVpZ2h0KVxuXG4gIHJlZ2lvbi5yb3VuZCgpXG5cbiAgcmV0dXJuIHJlZ2lvbi54ICE9PSBiZWZvcmVYIHx8XG4gICAgcmVnaW9uLnkgIT09IGJlZm9yZVkgfHxcbiAgICByZWdpb24ud2lkdGggIT09IGJlZm9yZVdpZHRoIHx8XG4gICAgcmVnaW9uLmhlaWdodCAhPT0gYmVmb3JlSGVpZ2h0XG59XG5cblNlbGVjdGlvbi5wcm90b3R5cGUudXBkYXRlQm91bmRzRnJvbVJlZ2lvbiA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHRhcmdldCA9IHRoaXMudGFyZ2V0XG4gIHZhciByZWdpb24gPSB0aGlzLnJlZ2lvblxuICB2YXIgYm91bmRzID0gdGhpcy5ib3VuZHNcblxuICBpZiAodGFyZ2V0LmltYWdlKSB7XG4gICAgYm91bmRzLnggPSB0YXJnZXQuYm91bmRzLnggKyB0YXJnZXQuYm91bmRzLndpZHRoICogKHJlZ2lvbi54IC8gdGFyZ2V0LmltYWdlLndpZHRoKVxuICAgIGJvdW5kcy55ID0gdGFyZ2V0LmJvdW5kcy55ICsgdGFyZ2V0LmJvdW5kcy5oZWlnaHQgKiAocmVnaW9uLnkgLyB0YXJnZXQuaW1hZ2UuaGVpZ2h0KVxuICAgIGJvdW5kcy53aWR0aCA9IHRhcmdldC5ib3VuZHMud2lkdGggKiAocmVnaW9uLndpZHRoIC8gdGFyZ2V0LmltYWdlLndpZHRoKVxuICAgIGJvdW5kcy5oZWlnaHQgPSB0YXJnZXQuYm91bmRzLmhlaWdodCAqIChyZWdpb24uaGVpZ2h0IC8gdGFyZ2V0LmltYWdlLmhlaWdodClcbiAgfVxuXG4gIHRoaXMuYm91bmRzTWluV2lkdGggPSB0aGlzLmdldEJvdW5kc0xlbmd0aEZvclJlZ2lvbih0aGlzLm1pbldpZHRoKVxuICB0aGlzLmJvdW5kc01pbkhlaWdodCA9IHRoaXMuZ2V0Qm91bmRzTGVuZ3RoRm9yUmVnaW9uKHRoaXMubWluSGVpZ2h0KVxufVxuXG5TZWxlY3Rpb24ucHJvdG90eXBlLmlzSW5zaWRlID0gZnVuY3Rpb24gKHBvaW50KSB7XG4gIHJldHVybiB0aGlzLmJvdW5kcy5pc0luc2lkZShwb2ludClcbn1cblxuU2VsZWN0aW9uLmNyZWF0ZSA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gIHJldHVybiBuZXcgU2VsZWN0aW9uKG9wdHMpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0aW9uXG4iLCJ2YXIgSW5wdXQgPSByZXF1aXJlKCcuL0lucHV0LmpzJylcbnZhciBMaXN0ZW5lcnMgPSByZXF1aXJlKCcuL0xpc3RlbmVycy5qcycpXG52YXIgU2VsZWN0aW9uID0gcmVxdWlyZSgnLi9TZWxlY3Rpb24uanMnKVxudmFyIFJlY3RhbmdsZSA9IHJlcXVpcmUoJy4vUmVjdGFuZ2xlLmpzJylcblxudmFyIFNlbGVjdGlvbkxheWVyID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgb3B0cyA9IG9wdHMgfHwge31cblxuICB0aGlzLnNlbGVjdGlvbiA9IFNlbGVjdGlvbi5jcmVhdGUob3B0cylcblxuICB0aGlzLnBhcmVudCA9IG9wdHMucGFyZW50XG4gIHRoaXMuY29udGV4dCA9IG9wdHMuY29udGV4dFxuICB0aGlzLmNvbnRleHQuc2V0TGluZURhc2ggPSB0aGlzLmNvbnRleHQuc2V0TGluZURhc2ggfHwgZnVuY3Rpb24gKCkge31cbiAgdGhpcy50YXJnZXQgPSBvcHRzLnRhcmdldFxuXG4gIHZhciBoYW5kbGVPcHRzID0gb3B0cy5oYW5kbGUgfHwge31cbiAgaGFuZGxlT3B0cy5sZW5ndGggPSBoYW5kbGVPcHRzLmhhbmRsZUxlbmd0aCB8fCAzMlxuICBoYW5kbGVPcHRzLmRlcHRoID0gaGFuZGxlT3B0cy5kZXB0aCB8fCAzXG4gIGhhbmRsZU9wdHMuc2l6ZSA9IGhhbmRsZU9wdHMuc2l6ZSB8fCBoYW5kbGVPcHRzLmxlbmd0aCAqIDJcbiAgaGFuZGxlT3B0cy5jb2xvciA9IGhhbmRsZU9wdHMuY29sb3IgfHwgJ3JnYmEoMjU1LCAyNTUsIDI1NSwgMS4wKSdcbiAgaGFuZGxlT3B0cy5hY3RpdmVDb2xvciA9IGhhbmRsZU9wdHMuYWN0aXZlQ29sb3IgfHwgJ3JnYmEoMjU1LCAwLCAxNjAsIDEuMCknXG4gIHRoaXMuaGFuZGxlT3B0cyA9IGhhbmRsZU9wdHNcblxuICB0aGlzLmxpc3RlbmVycyA9IExpc3RlbmVycy5jcmVhdGUoKVxuXG4gIHRoaXMuaW5wdXQgPSBJbnB1dC5jcmVhdGUodGhpcy5wYXJlbnQuY2FudmFzKVxuXG4gIHRoaXMuYWN0aXZlUmVnaW9uID0gbnVsbFxuICB0aGlzLmRvd25Cb3VuZHMgPSBSZWN0YW5nbGUuY3JlYXRlKDAsIDAsIDAsIDApXG5cbiAgdGhpcy5pbnB1dC5vbignZG93bicsIHRoaXMub25JbnB1dERvd24uYmluZCh0aGlzKSlcbiAgdGhpcy5pbnB1dC5vbignbW92ZScsIHRoaXMub25JbnB1dE1vdmUuYmluZCh0aGlzKSlcbiAgdGhpcy5pbnB1dFxuICAgIC5vbigndXAnLCB0aGlzLm9uSW5wdXRVcE9yQ2FuY2VsLmJpbmQodGhpcykpXG4gICAgLm9uKCdjYW5jZWwnLCB0aGlzLm9uSW5wdXRVcE9yQ2FuY2VsLmJpbmQodGhpcykpXG59XG5cblNlbGVjdGlvbkxheWVyLmNyZWF0ZSA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gIHJldHVybiBuZXcgU2VsZWN0aW9uTGF5ZXIob3B0cylcbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLm9uSW5wdXREb3duID0gZnVuY3Rpb24gKGUpIHtcbiAgdmFyIGhpdFJlZ2lvbiA9IHRoaXMuZmluZEhpdFJlZ2lvbihlKVxuXG4gIGlmIChoaXRSZWdpb24pIHtcbiAgICBlLnNvdXJjZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgdGhpcy5hY3RpdmVSZWdpb24gPSBoaXRSZWdpb25cbiAgICB0aGlzLnNldEN1cnNvcihoaXRSZWdpb24pXG4gICAgdGhpcy5kb3duQm91bmRzLmNvcHkodGhpcy5zZWxlY3Rpb24uYm91bmRzKVxuICAgIHRoaXMubGlzdGVuZXJzLm5vdGlmeSgnc3RhcnQnLCB0aGlzLnNlbGVjdGlvbi5yZWdpb24pXG4gIH1cbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLm9uSW5wdXRNb3ZlID0gZnVuY3Rpb24gKGUpIHtcbiAgdmFyIGFjdGl2ZVJlZ2lvbiA9IHRoaXMuYWN0aXZlUmVnaW9uXG5cbiAgaWYgKCFhY3RpdmVSZWdpb24pIHtcbiAgICB2YXIgaGl0UmVnaW9uID0gdGhpcy5maW5kSGl0UmVnaW9uKGUpXG4gICAgaWYgKGhpdFJlZ2lvbikge1xuICAgICAgZS5zb3VyY2UucHJldmVudERlZmF1bHQoKVxuICAgICAgdGhpcy5zZXRDdXJzb3IoaGl0UmVnaW9uKVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlc2V0Q3Vyc29yKClcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZS5zb3VyY2UucHJldmVudERlZmF1bHQoKVxuXG4gICAgdmFyIHNlbGVjdGlvbiA9IHRoaXMuc2VsZWN0aW9uXG4gICAgdmFyIGhhc0NoYW5nZWQgPSBmYWxzZVxuICAgIHNlbGVjdGlvbi5ib3VuZHMuY29weSh0aGlzLmRvd25Cb3VuZHMpXG5cbiAgICBpZiAoYWN0aXZlUmVnaW9uID09PSAnbW92ZScpIHtcbiAgICAgIGhhc0NoYW5nZWQgPSBzZWxlY3Rpb24ubW92ZUJ5KGUuZHgsIGUuZHkpXG4gICAgICBpZiAoaGFzQ2hhbmdlZCkge1xuICAgICAgICB0aGlzLmxpc3RlbmVycy5ub3RpZnkoJ21vdmUnLCB0aGlzLnNlbGVjdGlvbi5yZWdpb24pXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBkaXIgPSBhY3RpdmVSZWdpb24uc3Vic3RyaW5nKDAsIDIpXG4gICAgICB2YXIgZHggPSBkaXJbMV0gPT09ICd3JyA/IC1lLmR4IDogZS5keFxuICAgICAgdmFyIGR5ID0gZGlyWzBdID09PSAnbicgPyAtZS5keSA6IGUuZHlcbiAgICAgIGhhc0NoYW5nZWQgPSBzZWxlY3Rpb24ucmVzaXplQnkoZHgsIGR5LCBkaXIpXG4gICAgICBpZiAoaGFzQ2hhbmdlZCkge1xuICAgICAgICB0aGlzLmxpc3RlbmVycy5ub3RpZnkoJ3Jlc2l6ZScsIHRoaXMuc2VsZWN0aW9uLnJlZ2lvbilcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoaGFzQ2hhbmdlZCkge1xuICAgICAgdGhpcy5saXN0ZW5lcnMubm90aWZ5KCdjaGFuZ2UnLCB0aGlzLnNlbGVjdGlvbi5yZWdpb24pXG4gICAgfVxuICB9XG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5vbklucHV0VXBPckNhbmNlbCA9IGZ1bmN0aW9uIChlKSB7XG4gIGUuc291cmNlLnByZXZlbnREZWZhdWx0KClcbiAgaWYgKHRoaXMuYWN0aXZlUmVnaW9uKSB7XG4gICAgdGhpcy5hY3RpdmVSZWdpb24gPSBudWxsXG4gICAgdGhpcy5yZXNldEN1cnNvcigpXG4gICAgdGhpcy5saXN0ZW5lcnMubm90aWZ5KCdlbmQnLCB0aGlzLnNlbGVjdGlvbi5yZWdpb24pXG4gIH1cbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLmZpbmRIaXRSZWdpb24gPSBmdW5jdGlvbiAocG9pbnQpIHtcbiAgdmFyIGhpdFJlZ2lvbiA9IG51bGxcbiAgdmFyIGNsb3Nlc3QgPSBOdW1iZXIuTUFYX1ZBTFVFXG5cbiAgdmFyIGQgPSB0aGlzLmlzV2l0aGluTm9ydGhXZXN0SGFuZGxlKHBvaW50KVxuICBpZiAoZCAhPT0gZmFsc2UgJiYgZCA8IGNsb3Nlc3QpIHtcbiAgICBjbG9zZXN0ID0gZFxuICAgIGhpdFJlZ2lvbiA9ICdudy1yZXNpemUnXG4gIH1cblxuICBkID0gdGhpcy5pc1dpdGhpbk5vcnRoRWFzdEhhbmRsZShwb2ludClcbiAgaWYgKGQgIT09IGZhbHNlICYmIGQgPCBjbG9zZXN0KSB7XG4gICAgY2xvc2VzdCA9IGRcbiAgICBoaXRSZWdpb24gPSAnbmUtcmVzaXplJ1xuICB9XG5cbiAgZCA9IHRoaXMuaXNXaXRoaW5Tb3V0aFdlc3RIYW5kbGUocG9pbnQpXG4gIGlmIChkICE9PSBmYWxzZSAmJiBkIDwgY2xvc2VzdCkge1xuICAgIGNsb3Nlc3QgPSBkXG4gICAgaGl0UmVnaW9uID0gJ3N3LXJlc2l6ZSdcbiAgfVxuXG4gIGQgPSB0aGlzLmlzV2l0aGluU291dGhFYXN0SGFuZGxlKHBvaW50KVxuICBpZiAoZCAhPT0gZmFsc2UgJiYgZCA8IGNsb3Nlc3QpIHtcbiAgICBjbG9zZXN0ID0gZFxuICAgIGhpdFJlZ2lvbiA9ICdzZS1yZXNpemUnXG4gIH1cblxuICBpZiAoaGl0UmVnaW9uKSB7XG4gICAgcmV0dXJuIGhpdFJlZ2lvblxuICB9IGVsc2UgaWYgKHRoaXMuaXNXaXRoaW5Cb3VuZHMocG9pbnQpKSB7XG4gICAgcmV0dXJuICdtb3ZlJ1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBudWxsXG4gIH1cbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gIHRoaXMubGlzdGVuZXJzLm9uKHR5cGUsIGZuKVxuICByZXR1cm4gdGhpc1xufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24gKHR5cGUsIGZuKSB7XG4gIHRoaXMubGlzdGVuZXJzLm9mZih0eXBlLCBmbilcbiAgcmV0dXJuIHRoaXNcbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLnNldEN1cnNvciA9IGZ1bmN0aW9uICh0eXBlKSB7XG4gIGlmICh0aGlzLnBhcmVudC5jYW52YXMuc3R5bGUuY3Vyc29yICE9PSB0eXBlKSB7XG4gICAgdGhpcy5wYXJlbnQuY2FudmFzLnN0eWxlLmN1cnNvciA9IHR5cGVcbiAgfVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUucmVzZXRDdXJzb3IgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc2V0Q3Vyc29yKCdhdXRvJylcbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLmlzV2l0aGluUmFkaXVzID0gZnVuY3Rpb24gKGF4LCBheSwgYngsIGJ5LCByKSB7XG4gIHZhciB0c3EgPSByICogclxuICB2YXIgZHggPSBheCAtIGJ4XG4gIHZhciBkeSA9IGF5IC0gYnlcbiAgdmFyIGRzcSA9IGR4ICogZHggKyBkeSAqIGR5XG4gIHJldHVybiAoZHNxIDwgdHNxKSA/IGRzcSA6IGZhbHNlXG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5pc1dpdGhpbk5vcnRoV2VzdEhhbmRsZSA9IGZ1bmN0aW9uIChwb2ludCkge1xuICByZXR1cm4gdGhpcy5pc1dpdGhpblJhZGl1cyhwb2ludC54LCBwb2ludC55LCB0aGlzLnNlbGVjdGlvbi5sZWZ0LCB0aGlzLnNlbGVjdGlvbi50b3AsIHRoaXMuZ2V0SGFuZGxlUmFkaXVzKCkpXG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5pc1dpdGhpbk5vcnRoRWFzdEhhbmRsZSA9IGZ1bmN0aW9uIChwb2ludCkge1xuICByZXR1cm4gdGhpcy5pc1dpdGhpblJhZGl1cyhwb2ludC54LCBwb2ludC55LCB0aGlzLnNlbGVjdGlvbi5yaWdodCwgdGhpcy5zZWxlY3Rpb24udG9wLCB0aGlzLmdldEhhbmRsZVJhZGl1cygpKVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUuaXNXaXRoaW5Tb3V0aFdlc3RIYW5kbGUgPSBmdW5jdGlvbiAocG9pbnQpIHtcbiAgcmV0dXJuIHRoaXMuaXNXaXRoaW5SYWRpdXMocG9pbnQueCwgcG9pbnQueSwgdGhpcy5zZWxlY3Rpb24ubGVmdCwgdGhpcy5zZWxlY3Rpb24uYm90dG9tLCB0aGlzLmdldEhhbmRsZVJhZGl1cygpKVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUuaXNXaXRoaW5Tb3V0aEVhc3RIYW5kbGUgPSBmdW5jdGlvbiAocG9pbnQpIHtcbiAgcmV0dXJuIHRoaXMuaXNXaXRoaW5SYWRpdXMocG9pbnQueCwgcG9pbnQueSwgdGhpcy5zZWxlY3Rpb24ucmlnaHQsIHRoaXMuc2VsZWN0aW9uLmJvdHRvbSwgdGhpcy5nZXRIYW5kbGVSYWRpdXMoKSlcbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLmlzV2l0aGluQm91bmRzID0gZnVuY3Rpb24gKHBvaW50KSB7XG4gIHJldHVybiB0aGlzLnNlbGVjdGlvbi5pc0luc2lkZShwb2ludClcbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLmdldEhhbmRsZVJhZGl1cyA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHRoaXMuaGFuZGxlT3B0cy5zaXplIC8gMlxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUub25JbWFnZUxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuYXV0b1NpemVSZWdpb25BbmROb3RpZnkoKVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUuc2V0QXNwZWN0UmF0aW8gPSBmdW5jdGlvbiAoYXNwZWN0UmF0aW8pIHtcbiAgdGhpcy5zZWxlY3Rpb24uYXNwZWN0UmF0aW8gPSBhc3BlY3RSYXRpb1xuICB0aGlzLmF1dG9TaXplUmVnaW9uQW5kTm90aWZ5KClcbn1cblxuU2VsZWN0aW9uTGF5ZXIucHJvdG90eXBlLmF1dG9TaXplUmVnaW9uQW5kTm90aWZ5ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgaGFzQ2hhbmdlZCA9IHRoaXMuc2VsZWN0aW9uLmF1dG9TaXplUmVnaW9uKClcbiAgaWYgKGhhc0NoYW5nZWQpIHtcbiAgICB0aGlzLmxpc3RlbmVycy5ub3RpZnkoJ2NoYW5nZScsIHRoaXMuc2VsZWN0aW9uLnJlZ2lvbilcbiAgfVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUucmV2YWxpZGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zZWxlY3Rpb24udXBkYXRlQm91bmRzRnJvbVJlZ2lvbigpXG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5wYWludCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5zZWxlY3Rpb24uYm91bmRzUHguY29weSh0aGlzLnNlbGVjdGlvbi5ib3VuZHMpLnJvdW5kKClcblxuICB0aGlzLnBhaW50T3V0c2lkZSgpXG4gIHRoaXMucGFpbnRJbnNpZGUoKVxufVxuXG5TZWxlY3Rpb25MYXllci5wcm90b3R5cGUucGFpbnRPdXRzaWRlID0gZnVuY3Rpb24gKCkge1xuICB2YXIgYm91bmRzID0gdGhpcy5zZWxlY3Rpb24uYm91bmRzUHhcbiAgdmFyIGcgPSB0aGlzLmNvbnRleHRcbiAgdmFyIHRhcmdldCA9IHRoaXMudGFyZ2V0XG5cbiAgdmFyIHRsID0gdGFyZ2V0LmJvdW5kcy54XG4gIHZhciB0dCA9IHRhcmdldC5ib3VuZHMueVxuICB2YXIgdHcgPSB0YXJnZXQuYm91bmRzLndpZHRoXG4gIHZhciB0ciA9IHRhcmdldC5ib3VuZHMucmlnaHRcbiAgdmFyIHRiID0gdGFyZ2V0LmJvdW5kcy5ib3R0b21cblxuICB2YXIgYmwgPSBib3VuZHMueFxuICB2YXIgYnQgPSBib3VuZHMueVxuICB2YXIgYmggPSBib3VuZHMuaGVpZ2h0XG4gIHZhciBiciA9IGJvdW5kcy5yaWdodFxuICB2YXIgYmIgPSBib3VuZHMuYm90dG9tXG5cbiAgZy5maWxsU3R5bGUgPSAncmdiYSgwLCAwLCAwLCAwLjUpJ1xuICBnLmZpbGxSZWN0KHRsLCB0dCwgdHcsIGJ0IC0gdHQpXG4gIGcuZmlsbFJlY3QodGwsIGJ0LCBibCAtIHRsLCBiaClcbiAgZy5maWxsUmVjdChiciwgYnQsIHRyIC0gYnIsIGJoKVxuICBnLmZpbGxSZWN0KHRsLCBiYiwgdHcsIHRiIC0gYmIpXG59XG5cblNlbGVjdGlvbkxheWVyLnByb3RvdHlwZS5wYWludEluc2lkZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIGcgPSB0aGlzLmNvbnRleHRcbiAgdmFyIGJvdW5kcyA9IHRoaXMuc2VsZWN0aW9uLmJvdW5kc1B4XG4gIHZhciBhY3RpdmVSZWdpb24gPSB0aGlzLmFjdGl2ZVJlZ2lvblxuICB2YXIgb3B0cyA9IHRoaXMuaGFuZGxlT3B0c1xuXG4gIHZhciBsZW5ndGhXaWR0aCA9IE1hdGgubWluKG9wdHMubGVuZ3RoLCBib3VuZHMud2lkdGggKiAwLjUpXG4gIHZhciBsZW5ndGhIZWlnaHQgPSBNYXRoLm1pbihvcHRzLmxlbmd0aCwgYm91bmRzLmhlaWdodCAqIDAuNSlcbiAgdmFyIGRlcHRoID0gb3B0cy5kZXB0aFxuICB2YXIgY29sb3IgPSBvcHRzLmNvbG9yXG4gIHZhciBhY3RpdmVDb2xvciA9IG9wdHMuYWN0aXZlQ29sb3JcbiAgdmFyIGxlbmd0aCA9IDAgLy8gVE9ETzogQ0hFQ0tcblxuICAvLyBTaWRlc1xuICBnLmZpbGxTdHlsZSA9ICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMyknXG4gIGcuZmlsbFJlY3QoYm91bmRzLnggKyBsZW5ndGgsIGJvdW5kcy55LCBib3VuZHMud2lkdGggLSAyICogbGVuZ3RoLCBkZXB0aClcbiAgZy5maWxsUmVjdChib3VuZHMueCArIGxlbmd0aCwgYm91bmRzLmJvdHRvbSAtIGRlcHRoLCBib3VuZHMud2lkdGggLSAyICogbGVuZ3RoLCBkZXB0aClcbiAgZy5maWxsUmVjdChib3VuZHMueCwgYm91bmRzLnkgKyBsZW5ndGgsIGRlcHRoLCBib3VuZHMuaGVpZ2h0IC0gMiAqIGxlbmd0aClcbiAgZy5maWxsUmVjdChib3VuZHMucmlnaHQgLSBkZXB0aCwgYm91bmRzLnkgKyBsZW5ndGgsIGRlcHRoLCBib3VuZHMuaGVpZ2h0IC0gMiAqIGxlbmd0aClcblxuICAvLyBIYW5kbGVzXG4gIHZhciBpc01vdmVSZWdpb24gPSBhY3RpdmVSZWdpb24gPT09ICdtb3ZlJ1xuXG4gIGcuZmlsbFN0eWxlID0gaXNNb3ZlUmVnaW9uIHx8IGFjdGl2ZVJlZ2lvbiA9PT0gJ253LXJlc2l6ZScgPyBhY3RpdmVDb2xvciA6IGNvbG9yXG4gIGcuZmlsbFJlY3QoYm91bmRzLngsIGJvdW5kcy55LCBsZW5ndGhXaWR0aCwgZGVwdGgpXG4gIGcuZmlsbFJlY3QoYm91bmRzLngsIGJvdW5kcy55ICsgZGVwdGgsIGRlcHRoLCBsZW5ndGhIZWlnaHQgLSBkZXB0aClcblxuICBnLmZpbGxTdHlsZSA9IGlzTW92ZVJlZ2lvbiB8fCBhY3RpdmVSZWdpb24gPT09ICduZS1yZXNpemUnID8gYWN0aXZlQ29sb3IgOiBjb2xvclxuICBnLmZpbGxSZWN0KGJvdW5kcy5yaWdodCAtIGxlbmd0aFdpZHRoLCBib3VuZHMueSwgbGVuZ3RoV2lkdGgsIGRlcHRoKVxuICBnLmZpbGxSZWN0KGJvdW5kcy5yaWdodCAtIGRlcHRoLCBib3VuZHMueSArIGRlcHRoLCBkZXB0aCwgbGVuZ3RoSGVpZ2h0IC0gZGVwdGgpXG5cbiAgZy5maWxsU3R5bGUgPSBpc01vdmVSZWdpb24gfHwgYWN0aXZlUmVnaW9uID09PSAnc3ctcmVzaXplJyA/IGFjdGl2ZUNvbG9yIDogY29sb3JcbiAgZy5maWxsUmVjdChib3VuZHMueCwgYm91bmRzLmJvdHRvbSAtIGRlcHRoLCBsZW5ndGhXaWR0aCwgZGVwdGgpXG4gIGcuZmlsbFJlY3QoYm91bmRzLngsIGJvdW5kcy5ib3R0b20gLSBsZW5ndGhIZWlnaHQsIGRlcHRoLCBsZW5ndGhIZWlnaHQgLSBkZXB0aClcblxuICBnLmZpbGxTdHlsZSA9IGlzTW92ZVJlZ2lvbiB8fCBhY3RpdmVSZWdpb24gPT09ICdzZS1yZXNpemUnID8gYWN0aXZlQ29sb3IgOiBjb2xvclxuICBnLmZpbGxSZWN0KGJvdW5kcy5yaWdodCAtIGxlbmd0aFdpZHRoLCBib3VuZHMuYm90dG9tIC0gZGVwdGgsIGxlbmd0aFdpZHRoLCBkZXB0aClcbiAgZy5maWxsUmVjdChib3VuZHMucmlnaHQgLSBkZXB0aCwgYm91bmRzLmJvdHRvbSAtIGxlbmd0aEhlaWdodCwgZGVwdGgsIGxlbmd0aEhlaWdodCAtIGRlcHRoKVxuXG4gIC8vIEd1aWRlc1xuICBnLnN0cm9rZVN0eWxlID0gJ3JnYmEoMjU1LCAyNTUsIDI1NSwgMC42KSdcbiAgZy5zZXRMaW5lRGFzaChbMiwgM10pXG4gIGcubGluZVdpZHRoID0gMVxuICBnLmJlZ2luUGF0aCgpXG4gIHZhciBidzMgPSBib3VuZHMud2lkdGggLyAzXG4gIHZhciBiaDMgPSBib3VuZHMuaGVpZ2h0IC8gM1xuICBnLm1vdmVUbyhib3VuZHMueCArIGJ3MywgYm91bmRzLnkpXG4gIGcubGluZVRvKGJvdW5kcy54ICsgYnczLCBib3VuZHMueSArIGJvdW5kcy5oZWlnaHQpXG4gIGcubW92ZVRvKGJvdW5kcy54ICsgMiAqIGJ3MywgYm91bmRzLnkpXG4gIGcubGluZVRvKGJvdW5kcy54ICsgMiAqIGJ3MywgYm91bmRzLnkgKyBib3VuZHMuaGVpZ2h0KVxuICBnLm1vdmVUbyhib3VuZHMueCwgYm91bmRzLnkgKyBiaDMpXG4gIGcubGluZVRvKGJvdW5kcy54ICsgYm91bmRzLndpZHRoLCBib3VuZHMueSArIGJoMylcbiAgZy5tb3ZlVG8oYm91bmRzLngsIGJvdW5kcy55ICsgMiAqIGJoMylcbiAgZy5saW5lVG8oYm91bmRzLnggKyBib3VuZHMud2lkdGgsIGJvdW5kcy55ICsgMiAqIGJoMylcbiAgZy5zdHJva2UoKVxuICBnLmNsb3NlUGF0aCgpXG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2VsZWN0aW9uTGF5ZXJcbiIsIi8vIGh0dHA6Ly9zbmlwcGV0cmVwby5jb20vc25pcHBldHMvYmFzaWMtdmFuaWxsYS1qYXZhc2NyaXB0LXRocm90dGxpbmdkZWJvdW5jZVxuZnVuY3Rpb24gZGVib3VuY2UgKGZuLCB3YWl0LCBpbW1lZGlhdGUpIHtcbiAgdmFyIHRpbWVvdXRcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY29udGV4dCA9IHRoaXNcbiAgICB2YXIgYXJncyA9IGFyZ3VtZW50c1xuICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KVxuICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgIHRpbWVvdXQgPSBudWxsXG4gICAgICBpZiAoIWltbWVkaWF0ZSkgZm4uYXBwbHkoY29udGV4dCwgYXJncylcbiAgICB9LCB3YWl0KVxuICAgIGlmIChpbW1lZGlhdGUgJiYgIXRpbWVvdXQpIGZuLmFwcGx5KGNvbnRleHQsIGFyZ3MpXG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZGVib3VuY2VcbiIsIi8qXG4gKiBNb2RpZmllZCB2ZXJzaW9uIG9mIGh0dHA6Ly9naXRodWIuY29tL2Rlc2FuZHJvL2ltYWdlc2xvYWRlZCB2Mi4xLjFcbiAqIE1JVCBMaWNlbnNlLlxuICovXG5cbnZhciBCTEFOSyA9ICdkYXRhOmltYWdlL2dpZjtiYXNlNjQsUjBsR09EbGhBUUFCQUlBQUFBQUFBUC8vL3l3QUFBQUFBUUFCQUFBQ0FVd0FPdz09J1xuXG5mdW5jdGlvbiBpbWFnZUxvYWRlZCAoaW1hZ2UsIGNhbGxiYWNrKSB7XG4gIGlmICghaW1hZ2Uubm9kZU5hbWUgfHwgaW1hZ2Uubm9kZU5hbWUudG9Mb3dlckNhc2UoKSAhPT0gJ2ltZycpIHtcbiAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdGaXJzdCBhcmd1bWVudCBtdXN0IGFuIGltYWdlIGVsZW1lbnQnKSlcbiAgfVxuXG4gIGlmIChpbWFnZS5zcmMgJiYgaW1hZ2UuY29tcGxldGUgJiYgaW1hZ2UubmF0dXJhbFdpZHRoICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgdHJ1ZSlcbiAgfVxuXG4gIGltYWdlLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgY2FsbGJhY2sobnVsbCwgZmFsc2UpXG4gIH0pXG5cbiAgaW1hZ2UuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBmdW5jdGlvbiAoZSkge1xuICAgIGNhbGxiYWNrKG5ldyBFcnJvcignRmFpbGVkIHRvIGxvYWQgaW1hZ2UgXFwnJyArIChpbWFnZS5zcmMgfHwgJycpICsgJ1xcJycpKVxuICB9KVxuXG4gIGlmIChpbWFnZS5jb21wbGV0ZSkge1xuICAgIHZhciBzcmMgPSBpbWFnZS5zcmNcbiAgICBpbWFnZS5zcmMgPSBCTEFOS1xuICAgIGltYWdlLnNyYyA9IHNyY1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW1hZ2VMb2FkZWRcbiJdfQ==

import debounce from './debounce.js'
import BackgroundLayer from './BackgroundLayer.js'
import ImageLayer from './ImageLayer.js'
import SelectionLayer from './SelectionLayer.js'
import Image from './Image.js'
import Listeners from './Listeners.js'

const DEFAULT_CANVAS_WIDTH = 400
const DEFAULT_CANVAS_HEIGHT = 300

class Crop {
  constructor (opts) {
    this.parent = typeof opts.parent === 'string'
      ? document.querySelector(opts.parent)
      : opts.parent

    this.canvas = document.createElement('canvas')
    this.context = this.canvas.getContext('2d')
    this.boundsOpts = opts.bounds || { width: '100%', height: 'auto' }
    opts.selection = opts.selection || {}
    this.debounceResize = opts.debounceResize !== undefined
      ? opts.debounceResize
      : true
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

    this.ignoreDevicePixelRatio = opts.ignoreDevicePixelRatio || false;

    const listeners = this.listeners
    const paint = this.paint.bind(this)

    this.selectionLayer
      .on(
        'start',
        region => {
          paint()
          listeners.notify('start', region)
        }
      )
      .on(
        'move',
        region => {
          listeners.notify('move', region)
        }
      )
      .on(
        'resize',
        region => {
          listeners.notify('resize', region)
        }
      )
      .on(
        'change',
        region => {
          paint()
          listeners.notify('change', region)
        }
      )
      .on(
        'end',
        region => {
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

    this.setImage(opts.image, opts.onInit)

    this.revalidateAndPaint()
  }

  on (type, fn) {
    this.listeners.on(type, fn)
    return this
  }

  off (type, fn) {
    this.listeners.off(type, fn)
    return this
  }

  revalidateAndPaint () {
    this.revalidate()
    this.paint()
  }

  revalidate () {
    const parent = this.parent
    const image = this.image

    const boundsWidth = this.boundsOpts.width
    const boundsHeight = this.boundsOpts.height
    let width = 0
    let height = 0

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

  paint () {
    const g = this.context

    g.save()
    g.scale(this.ratio, this.ratio)

    this.backgroundLayer.paint()

    if (this.image && this.image.hasLoaded) {
      this.imageLayer.paint()
      this.selectionLayer.paint()
    }

    g.restore()
  }

  resizeCanvas (width, height) {
    const canvas = this.canvas
    this.ratio = (!this.ignoreDevicePixelRatio && window.devicePixelRatio) ? window.devicePixelRatio : 1
    this.width = width
    this.height = height
    canvas.width = this.width * this.ratio
    canvas.height = this.height * this.ratio
  }

  setImage (source, onLoad) {
    const image = Image.create(source)
      .on(
        'load',
        () => {
          this.selectionLayer.onImageLoad()
          this.revalidateAndPaint()
          onLoad && onLoad()
        }
      )
      .on(
        'error',
        e => {
          console.error(e)
        }
      )

    this.imageLayer.setImage(image)
    this.image = image
    this.revalidateAndPaint()
  }

  getImage () {
    return this.image
  }

  setAspectRatio (aspectRatio) {
    this.selectionLayer.setAspectRatio(aspectRatio)
    this.revalidateAndPaint()
  }

  setBounds (opts) {
    this.boundsOpts = opts
    this.revalidateAndPaint()
  }

  setBackgroundColors (colors) {
    this.backgroundLayer.setColors(colors)
    this.revalidateAndPaint()
  }
}

Crop.create = opts => new Crop(opts)

Crop.prototype.dispose = noop

function noop () {}

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

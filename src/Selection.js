import Rectangle from './Rectangle.js'

class Selection {
  constructor (opts) {
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

  getBoundsLengthForRegion (regionLen) {
    return regionLen / this.region.width * this.width
  }

  moveBy (dx, dy) {
    const bounds = this.bounds
    const target = this.target

    bounds.x = Math.min(Math.max(bounds.x + dx, target.bounds.x), target.bounds.x + target.bounds.width - bounds.width)
    bounds.y = Math.min(Math.max(bounds.y + dy, target.bounds.y), target.bounds.y + target.bounds.height - bounds.height)

    return this.updateRegionFromBounds()
  }

  resizeBy (dx, dy, p) {
    let delta = this._delta
    const aspectRatio = this.aspectRatio
    const bounds = this.bounds
    const boundsMinWidth = this.boundsMinWidth
    const boundsMinHeight = this.boundsMinHeight
    const target = this.target

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

  autoSizeRegion () {
    const target = this.target
    const region = this.region
    const aspectRatio = this.aspectRatio
    const initialOpts = this.initialOpts
    const beforeX = region.x
    const beforeY = region.y
    const beforeWidth = region.width
    const beforeHeight = region.height

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

  updateRegionFromBounds () {
    const target = this.target
    const region = this.region
    const bounds = this.bounds
    const beforeX = region.x
    const beforeY = region.y
    const beforeWidth = region.width
    const beforeHeight = region.height

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

  updateBoundsFromRegion () {
    const target = this.target
    const region = this.region
    const bounds = this.bounds

    if (target.image) {
      bounds.x = target.bounds.x + target.bounds.width * (region.x / target.image.width)
      bounds.y = target.bounds.y + target.bounds.height * (region.y / target.image.height)
      bounds.width = target.bounds.width * (region.width / target.image.width)
      bounds.height = target.bounds.height * (region.height / target.image.height)
    }

    this.boundsMinWidth = this.getBoundsLengthForRegion(this.minWidth)
    this.boundsMinHeight = this.getBoundsLengthForRegion(this.minHeight)
  }

  isInside (point) {
    return this.bounds.isInside(point)
  }
}

Object.defineProperties(Selection.prototype, {
  x: {
    get () { return this.bounds.x },
    set (v) { this.bounds.x = v }
  },
  y: {
    get () { return this.bounds.y },
    set (v) { this.bounds.y = v }
  },
  width: {
    get () { return this.bounds.width },
    set (v) { this.bounds.width = v }
  },
  height: {
    get () { return this.bounds.height },
    set (v) { this.bounds.height = v }
  },
  left: {
    get () { return this.bounds.x },
    set (v) {
      this.bounds.left = v
    }
  },
  top: {
    get () { return this.bounds.y },
    set (v) { this.bounds.top = v }
  },
  right: {
    get () { return this.bounds.right },
    set (v) { this.bounds.right = v }
  },
  bottom: {
    get () { return this.bounds.bottom },
    set (v) { this.bounds.bottom = v }
  }
})

Selection.create = opts => new Selection(opts)

export default Selection

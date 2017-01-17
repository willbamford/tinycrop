import createTouch from 'tinytouch'
import Listeners from './Listeners.js'
import Selection from './Selection.js'
import Rectangle from './Rectangle.js'

class SelectionLayer {
  constructor (opts = {}) {
    this.selection = Selection.create(opts)

    this.parent = opts.parent
    this.context = opts.context
    this.context.setLineDash = this.context.setLineDash || (() => {})
    this.target = opts.target

    const handleOpts = opts.handle || {}
    handleOpts.length = handleOpts.handleLength || 32
    handleOpts.depth = handleOpts.depth || 3
    handleOpts.size = handleOpts.size || handleOpts.length * 2
    handleOpts.color = handleOpts.color || 'rgba(255, 255, 255, 1.0)'
    handleOpts.activeColor = handleOpts.activeColor || 'rgba(255, 0, 160, 1.0)'
    this.handleOpts = handleOpts

    this.listeners = Listeners.create()

    this.touch = createTouch(this.parent.canvas)

    this.activeRegion = null
    this.downBounds = Rectangle.create(0, 0, 0, 0)

    this.touch
      .on('down', this.onInputDown.bind(this))
      .on('move', this.onInputMove.bind(this))
      .on('up', this.onInputUpOrCancel.bind(this))
      .on('cancel', this.onInputUpOrCancel.bind(this))
  }

  onInputDown (e) {
    const hitRegion = this.findHitRegion(e)

    if (hitRegion) {
      e.source.preventDefault()
      this.activeRegion = hitRegion
      this.setCursor(hitRegion)
      this.downBounds.copy(this.selection.bounds)
      this.listeners.notify('start', this.selection.region)
    }
  }

  onInputMove (e) {
    const activeRegion = this.activeRegion

    if (!activeRegion) {
      const hitRegion = this.findHitRegion(e)
      if (hitRegion) {
        e.source.preventDefault()
        this.setCursor(hitRegion)
      } else {
        this.resetCursor()
      }
    } else {
      e.source.preventDefault()

      const selection = this.selection
      let hasChanged = false
      selection.bounds.copy(this.downBounds)

      if (activeRegion === 'move') {
        hasChanged = selection.moveBy(e.tx, e.ty)
        if (hasChanged) {
          this.listeners.notify('move', this.selection.region)
        }
      } else {
        const dir = activeRegion.substring(0, 2)
        const dx = dir[1] === 'w' ? -e.tx : e.tx
        const dy = dir[0] === 'n' ? -e.ty : e.ty
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

  onInputUpOrCancel (e) {
    e.source.preventDefault()
    if (this.activeRegion) {
      this.activeRegion = null
      this.resetCursor()
      this.listeners.notify('end', this.selection.region)
    }
  }

  findHitRegion (point) {
    let hitRegion = null
    let closest = Number.MAX_VALUE

    let d = this.isWithinNorthWestHandle(point)
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

  on (type, fn) {
    this.listeners.on(type, fn)
    return this
  }

  off (type, fn) {
    this.listeners.off(type, fn)
    return this
  }

  setCursor (type) {
    if (this.parent.canvas.style.cursor !== type) {
      this.parent.canvas.style.cursor = type
    }
  }

  resetCursor () {
    this.setCursor('auto')
  }

  isWithinRadius (ax, ay, bx, by, r) {
    const tsq = r * r
    const dx = ax - bx
    const dy = ay - by
    const dsq = dx * dx + dy * dy
    return (dsq < tsq) ? dsq : false
  }

  isWithinNorthWestHandle (point) {
    return this.isWithinRadius(point.x, point.y, this.selection.left, this.selection.top, this.getHandleRadius())
  }

  isWithinNorthEastHandle (point) {
    return this.isWithinRadius(point.x, point.y, this.selection.right, this.selection.top, this.getHandleRadius())
  }

  isWithinSouthWestHandle (point) {
    return this.isWithinRadius(point.x, point.y, this.selection.left, this.selection.bottom, this.getHandleRadius())
  }

  isWithinSouthEastHandle (point) {
    return this.isWithinRadius(point.x, point.y, this.selection.right, this.selection.bottom, this.getHandleRadius())
  }

  isWithinBounds (point) {
    return this.selection.isInside(point)
  }

  getHandleRadius () {
    return this.handleOpts.size / 2
  }

  onImageLoad () {
    this.autoSizeRegionAndNotify()
  }

  setAspectRatio (aspectRatio) {
    this.selection.aspectRatio = aspectRatio
    this.autoSizeRegionAndNotify()
  }

  autoSizeRegionAndNotify () {
    const hasChanged = this.selection.autoSizeRegion()
    if (hasChanged) {
      this.listeners.notify('change', this.selection.region)
    }
  }

  revalidate () {
    this.selection.updateBoundsFromRegion()
  }

  paint () {
    this.selection.boundsPx.copy(this.selection.bounds).round()

    this.paintOutside()
    this.paintInside()
  }

  paintOutside () {
    const bounds = this.selection.boundsPx
    const g = this.context
    const target = this.target

    const tl = target.bounds.x
    const tt = target.bounds.y
    const tw = target.bounds.width
    const tr = target.bounds.right
    const tb = target.bounds.bottom

    const bl = bounds.x
    const bt = bounds.y
    const bh = bounds.height
    const br = bounds.right
    const bb = bounds.bottom

    g.fillStyle = 'rgba(0, 0, 0, 0.5)'
    g.fillRect(tl, tt, tw, bt - tt)
    g.fillRect(tl, bt, bl - tl, bh)
    g.fillRect(br, bt, tr - br, bh)
    g.fillRect(tl, bb, tw, tb - bb)
  }

  paintInside () {
    const g = this.context
    const bounds = this.selection.boundsPx
    const activeRegion = this.activeRegion
    const opts = this.handleOpts

    const lengthWidth = Math.min(opts.length, bounds.width * 0.5)
    const lengthHeight = Math.min(opts.length, bounds.height * 0.5)
    const depth = opts.depth
    const color = opts.color
    const activeColor = opts.activeColor
    const length = 0 // TODO: CHECK

    // Sides
    g.fillStyle = 'rgba(255, 255, 255, 0.3)'
    g.fillRect(bounds.x + length, bounds.y, bounds.width - 2 * length, depth)
    g.fillRect(bounds.x + length, bounds.bottom - depth, bounds.width - 2 * length, depth)
    g.fillRect(bounds.x, bounds.y + length, depth, bounds.height - 2 * length)
    g.fillRect(bounds.right - depth, bounds.y + length, depth, bounds.height - 2 * length)

    // Handles
    const isMoveRegion = activeRegion === 'move'

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
    const bw3 = bounds.width / 3
    const bh3 = bounds.height / 3
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
}

SelectionLayer.create = opts => new SelectionLayer(opts)

export default SelectionLayer

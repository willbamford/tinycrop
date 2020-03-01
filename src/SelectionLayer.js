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
    handleOpts.borderColor = handleOpts.borderColor || handleOpts.color
    handleOpts.activeColor = handleOpts.activeColor || 'rgba(255, 0, 160, 1.0)'
    handleOpts.activeBorderColor = handleOpts.activeBorderColor || handleOpts.activeColor
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
        const dir = activeRegion.substring(0, 2).replace( '-', '' )
        // dir is direction; if corner point then will be two characters like ne or sw
        // otherwise for cross point will be single character like n or w or e or s
        const dx = (dir.indexOf('w') > -1) ? -e.tx : e.tx
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

    let d = this.isWithinNorthHandle(point)
    if (d !== false && d < closest) {
      closest = d
      hitRegion = 'n-resize'
    }

    d = this.isWithinSouthHandle(point)
    if (d !== false && d < closest) {
      closest = d
      hitRegion = 's-resize'
    }

    d = this.isWithinEastHandle(point)
    if (d !== false && d < closest) {
      closest = d
      hitRegion = 'e-resize'
    }

    d = this.isWithinWestHandle(point)
    if (d !== false && d < closest) {
      closest = d
      hitRegion = 'w-resize'
    }

    d = this.isWithinNorthWestHandle(point)
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

  isWithinNorthHandle (point) {
    const halfSelWidth = this.selection.width / 2
    const handleX = halfSelWidth + this.selection.left
    return this.isWithinRadius(point.x, point.y, handleX, this.selection.top, this.getCrossHandleRadius())
  }

  isWithinSouthHandle (point) {
    const halfSelWidth = this.selection.width / 2
    const handleX = halfSelWidth + this.selection.left
    return this.isWithinRadius(point.x, point.y, handleX, this.selection.bottom, this.getCrossHandleRadius())
  }

  isWithinEastHandle (point) {
    const halfSelHeight = this.selection.height / 2
    const handleY = halfSelHeight + this.selection.top
    return this.isWithinRadius(point.x, point.y, this.selection.right, handleY, this.getCrossHandleRadius())
  }

  isWithinWestHandle (point) {
    const halfSelHeight = this.selection.height / 2
    const handleY = halfSelHeight + this.selection.top
    return this.isWithinRadius(point.x, point.y, this.selection.left, handleY, this.getCrossHandleRadius())
  }

  isWithinNorthWestHandle (point) {
    return this.isWithinRadius(point.x, point.y, this.selection.left, this.selection.top, this.getCornerHandleRadius())
  }

  isWithinNorthEastHandle (point) {
    return this.isWithinRadius(point.x, point.y, this.selection.right, this.selection.top, this.getCornerHandleRadius())
  }

  isWithinSouthWestHandle (point) {
    return this.isWithinRadius(point.x, point.y, this.selection.left, this.selection.bottom, this.getCornerHandleRadius())
  }

  isWithinSouthEastHandle (point) {
    return this.isWithinRadius(point.x, point.y, this.selection.right, this.selection.bottom, this.getCornerHandleRadius())
  }

  isWithinBounds (point) {
    return this.selection.isInside(point)
  }

  getCrossHandleRadius () {
    return this.handleOpts.size / 4
  }

  getCornerHandleRadius () {
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
    const borderColor = opts.borderColor
    const activeColor = opts.activeColor
    const activeBorderColor = opts.activeBorderColor
    const length = 0 // TODO: CHECK

    // Sides
    g.fillStyle = 'rgba(255, 255, 255, 0.3)'
    g.fillRect(bounds.x + length, bounds.y, bounds.width - 2 * length, depth)
    g.fillRect(bounds.x + length, bounds.bottom - depth, bounds.width - 2 * length, depth)
    g.fillRect(bounds.x, bounds.y + length, depth, bounds.height - 2 * length)
    g.fillRect(bounds.right - depth, bounds.y + length, depth, bounds.height - 2 * length)

    // Handles
    const isMoveRegion = activeRegion === 'move'

    const halfBoundWidth = bounds.width / 2
    const halfBoundHeight = bounds.height / 2
    const halfHandleWidth = lengthWidth / 2
    const nsX = (halfBoundWidth - halfHandleWidth + bounds.x)
    const ewY = (halfBoundHeight - halfHandleWidth + bounds.y)

    let handleOptions = {
      "borderSize" : opts.borderSize,
      "activeRegion" : activeRegion,
      "isMoveRegion" : isMoveRegion,
      "borderColor" : borderColor,
      "activeBorderColor" : activeBorderColor,
      "color" : color,
      "borderColor" : borderColor,
      "activeColor" : activeColor,
      "activeBorderColor" : activeBorderColor,
      "width" : lengthWidth,
      "height" : lengthHeight,
      "depth" : opts.depth
    }

    // Draw N handle
    this.renderCrossHandle("n-resize", nsX, bounds.y, handleOptions)

    // Draw S handle
    this.renderCrossHandle("s-resize", nsX, bounds.bottom - depth, handleOptions)

    // Draw E handle
    this.renderCrossHandle("e-resize", bounds.right - depth, ewY, handleOptions)

    // Draw W handle
    this.renderCrossHandle("w-resize", bounds.x, ewY, handleOptions)

    // Draw NW handle
    this.renderCornerHandle("nw-resize", bounds, handleOptions)

    // Draw NE handle
    this.renderCornerHandle("ne-resize", bounds, handleOptions)

    // Draw SW handle
    this.renderCornerHandle("sw-resize", bounds, handleOptions)

    // Draw SE handle
    this.renderCornerHandle("se-resize", bounds, handleOptions)

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

  renderCrossHandle (handleName, x, y, handleOptions) {
    const g = this.context

    let w = null
    let h = null

    if (handleName[0] == "n" || handleName[0] == "s") {
      w = handleOptions.width
      h = handleOptions.depth
    } else if (handleName[0] == "e" || handleName[0] == "w") {
      w = handleOptions.depth
      h = handleOptions.height
    }

    // Draw handle border
    g.fillStyle = handleOptions.isMoveRegion || handleOptions.activeRegion === handleName ? handleOptions.activeBorderColor : handleOptions.borderColor
    g.fillRect(x, y, w, h)

    // Draw handle as inset of border box
    g.fillStyle = handleOptions.isMoveRegion || handleOptions.activeRegion === handleName ? handleOptions.activeColor : handleOptions.color
    g.fillRect(x + handleOptions.borderSize, y + handleOptions.borderSize, w - (2 * handleOptions.borderSize), h - (2 * handleOptions.borderSize))
  }

  renderCornerHandle (handleName, bounds, handleOptions) {
    const g = this.context

    const wH = handleOptions.width
    const hH = handleOptions.depth

    const wV = handleOptions.depth
    const hV = handleOptions.height - handleOptions.depth

    let xH = null
    let yH = null
    let xV = null
    let yV = null
    let borderGapY = null

    if (handleName[0] == "n") {
      yH = bounds.y
      yV = bounds.y + handleOptions.depth
      borderGapY = yV - handleOptions.borderSize
    } else if (handleName[0] == "s") {
      yH = bounds.bottom - handleOptions.depth
      yV = bounds.bottom - handleOptions.height
      borderGapY = yV + handleOptions.borderSize
    }

    if (handleName[1] == "e") {
      xH = bounds.right - handleOptions.width
      xV = bounds.right - handleOptions.depth
    } else if (handleName[1] == "w") {
      xH = bounds.x
      xV = bounds.x
    }

    // Draw border boxes
    g.fillStyle = handleOptions.isMoveRegion || handleOptions.activeRegion === handleName ? handleOptions.activeBorderColor : handleOptions.borderColor
    g.fillRect(xH, yH, wH, hH) // Horizontal
    g.fillRect(xV, yV, wV, hV) // Vertical

    // Draw handle
    g.fillStyle = handleOptions.isMoveRegion || handleOptions.activeRegion === handleName ? handleOptions.activeColor : handleOptions.color
    g.fillRect(xH + handleOptions.borderSize, yH + handleOptions.borderSize, wH - (2 * handleOptions.borderSize), hH - (2 * handleOptions.borderSize)) // Horizontal
    g.fillRect(xV + handleOptions.borderSize, borderGapY, wV - (2 * handleOptions.borderSize), hV) // Vertical
  }
}

SelectionLayer.create = opts => new SelectionLayer(opts)

export default SelectionLayer

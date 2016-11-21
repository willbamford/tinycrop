class Rectangle {
  constructor (x, y, width, height) {
    this._x = x
    this._y = y
    this._width = width
    this._height = height
  }

  copy (copy) {
    this._x = copy.x
    this._y = copy.y
    this._width = copy.width
    this._height = copy.height
    return this
  }

  clone () {
    return Rectangle.create(this._x, this._y, this._width, this._height)
  }

  round () {
    let dx = this._x
    let dy = this._y
    this._x = Math.round(dx)
    this._y = Math.round(dy)
    dx -= this._x
    dy -= this._y
    this._width = Math.round(this._width + dx)
    this._height = Math.round(this._height + dy)
    return this
  }

  isInside (point) {
    return point.x >= this.left &&
      point.y >= this.top &&
      point.x < this.right &&
      point.y < this.bottom
  }
}

Object.defineProperties(Rectangle.prototype, {
  x: {
    get () { return this._x },
    set (v) { this._x = v }
  },
  y: {
    get () { return this._y },
    set (v) { this._y = v }
  },
  centerX: {
    get () { return this._x + this._width * 0.5 },
    set (v) { this._x = v - this._width * 0.5 }
  },
  centerY: {
    get () { return this._y + this._height * 0.5 },
    set (v) { this._y = v - this._height * 0.5 }
  },
  width: {
    get () { return this._width },
    set (v) { this._width = v }
  },
  height: {
    get () { return this._height },
    set (v) { this._height = v }
  },
  left: {
    get () { return this._x },
    set (v) {
      this._width = this._x + this._width - v
      this._x = v
    }
  },
  top: {
    get () { return this._y },
    set (v) {
      this._height = this._y + this._height - v
      this._y = v
    }
  },
  right: {
    get () { return this._x + this._width },
    set (v) {
      this._width = v - this._x
    }
  },
  bottom: {
    get () { return this._y + this._height },
    set (v) {
      this._height = v - this._y
    }
  },
  aspectRatio: {
    get () { return this._width / this._height }
  }
})

Rectangle.create = (x, y, width, height) => new Rectangle(x, y, width, height)

export default Rectangle

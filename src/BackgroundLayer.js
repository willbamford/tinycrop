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

class BackgroundLayer {
  constructor (opts = {}) {
    this.colors = opts.colors
    this.parent = opts.parent
    this.context = opts.context
    this.isDirty = true
  }

  revalidate () {
    this.isDirty = true
  }

  setColors (colors) {
    this.colors = colors
  }

  paint () {
    if (this.isDirty) {
      const parent = this.parent
      const g = this.context

      if (!this.colors || !this.colors.length) {
        g.clearRect(0, 0, parent.width, parent.height)
      } else {
        g.fillStyle = this.colors[0]
        g.fillRect(0, 0, parent.width, parent.height)
      }

      if (this.colors && this.colors.length > 1) {
        const h = parent.height

        const cols = 32
        const size = parent.width / cols
        const rows = Math.ceil(h / size)

        g.fillStyle = this.colors[1]
        for (let i = 0; i < cols; i += 1) {
          for (let j = 0; j < rows; j += 1) {
            if ((i + j) % 2 === 0) {
              g.fillRect(i * size, j * size, size, size)
            }
          }
        }
      }

      this.isDirty = false
    }
  }
}

BackgroundLayer.create = opts => new BackgroundLayer(opts)

export default BackgroundLayer

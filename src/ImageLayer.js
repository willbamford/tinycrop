import Rectangle from './Rectangle.js'

class ImageLayer {
  constructor (opts = {}) {
    this.bounds = Rectangle.create(0, 0, 0, 0)
    this.image = opts.image || null
    this.parent = opts.parent
    this.context = opts.context
  }

  setImage (image) {
    this.image = image
  }

  revalidate () {
    const parent = this.parent
    const image = this.image
    const bounds = this.bounds

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

  paint () {
    const g = this.context
    const image = this.image
    const bounds = this.bounds

    if (image && image.hasLoaded) {
      g.drawImage(
        image.source,
        0, 0, image.width, image.height,
        bounds.x, bounds.y, bounds.width, bounds.height
      )
    }
  }
}

ImageLayer.create = opts => new ImageLayer(opts)

export default ImageLayer

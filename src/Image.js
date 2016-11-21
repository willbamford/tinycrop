import loaded from './loadImage.js'
import Listeners from './Listeners.js'

class Image {
  constructor (source) {
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
      const img = document.createElement('img')
      img.src = this.src
      source = img
    } else {
      this.src = source.src
    }

    this.source = source

    loaded(source, err => {
      if (err) {
        this.notify('error', err)
      } else {
        this.hasLoaded = true
        this.width = source.naturalWidth
        this.height = source.naturalHeight
        this.notify('load', this)
      }
    })
  }

  getAspectRatio () {
    if (!this.hasLoaded) {
      return 1
    }

    return this.width / this.height
  }

  notify (type, data) {
    const listeners = this.listeners
    setTimeout(() => {
      listeners.notify(type, data)
    }, 0)
  }

  on (type, fn) {
    this.listeners.on(type, fn)
    return this
  }

  off (type, fn) {
    this.listeners.off(type, fn)
    return this
  }
}

Image.create = source => new Image(source)

export default Image

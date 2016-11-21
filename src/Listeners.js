class Listeners {
  constructor (opts) {
    this.events = {}
  }

  on (type, fn) {
    if (!this.events[type]) {
      this.events[type] = []
    }

    if (this.events[type].indexOf(fn) === -1) {
      this.events[type].push(fn)
    }

    return this
  }

  off (type, fn) {
    if (this.events[type]) {
      const i = this.events[type].indexOf(fn)
      if (i !== -1) {
        this.events[type].splice(i, 1)
      }
    }

    return this
  }

  notify (type, data) {
    if (this.events[type]) {
      this.events[type].forEach(fn => {
        fn.call(this, data)
      })
    }
  }

  clearAll () {
    this.events = {}
  }
}

Listeners.create = opts => new Listeners(opts)

export default Listeners

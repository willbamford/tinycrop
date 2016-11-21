import Listeners from './Listeners.js'

class Input {
  constructor (domElement) {
    const listeners = Listeners.create()
    let downEvent = null
    this.listeners = listeners

    function createEventForMouse (source) {
      const x = source.offsetX
      const y = source.offsetY

      return {
        source,
        x,
        y,
        dx: downEvent ? x - downEvent.x : 0,
        dy: downEvent ? y - downEvent.y : 0,
        type: 'Mouse'
      }
    }

    function createEventForTouch (source) {
      const bounds = source.target.getBoundingClientRect()
      const touch = source.touches.length > 0 ? source.touches[0] : source.changedTouches[0]

      const x = touch.clientX - bounds.left
      const y = touch.clientY - bounds.top

      return {
        source,
        x,
        y,
        dx: downEvent ? x - downEvent.x : 0,
        dy: downEvent ? y - downEvent.y : 0,
        type: 'Touch'
      }
    }

    domElement.addEventListener('mousedown', source => {
      downEvent = createEventForMouse(source)
      listeners.notify('down', downEvent)
    })

    domElement.addEventListener('touchstart', source => {
      downEvent = createEventForTouch(source)
      listeners.notify('down', downEvent)
    })

    domElement.addEventListener('mousemove', source => {
      listeners.notify('move', createEventForMouse(source))
    })

    domElement.addEventListener('touchmove', source => {
      listeners.notify('move', createEventForTouch(source))
    })

    domElement.addEventListener('mouseup', source => {
      listeners.notify('up', createEventForMouse(source))
    })

    domElement.addEventListener('touchend', source => {
      listeners.notify('up', createEventForTouch(source))
      downEvent = null
    })

    domElement.addEventListener('mouseout', source => {
      listeners.notify('cancel', createEventForMouse(source))
      downEvent = null
    })

    domElement.addEventListener('touchcancel', source => {
      listeners.notify('cancel', createEventForTouch(source))
      downEvent = null
    })
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

Input.create = domElement => new Input(domElement)

export default Input

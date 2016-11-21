/*
 * Modified version of http://github.com/desandro/imagesloaded v2.1.1
 * MIT License.
 */

const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

function loadImage (image, callback) {
  if (!image.nodeName || image.nodeName.toLowerCase() !== 'img') {
    return callback(new Error('First argument must an image element'))
  }

  if (image.src && image.complete && image.naturalWidth !== undefined) {
    return callback(null, true)
  }

  image.addEventListener('load', () => {
    callback(null, false)
  })

  image.addEventListener('error', e => {
    callback(new Error(`Failed to load image '${image.src || ''}'`))
  })

  if (image.complete) {
    const src = image.src
    image.src = BLANK
    image.src = src
  }
}

export default loadImage

/*
 * Modified version of http://github.com/desandro/imagesloaded v2.1.1
 * MIT License.
 */

var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

function imageLoaded(image, callback) {

  if (!image.nodeName || image.nodeName.toLowerCase() !== 'img')
    return callback(new Error('First argument must an image element'));

  if (image.src && image.complete && image.naturalWidth !== undefined)
    return callback(null, true);

  image.addEventListener('load', function() {
    console.log('d');
    callback(null, false);
  }.bind(this));

  image.addEventListener('error', function(e) {
    callback(new Error('Failed to load image \'' + (image.src || '') + '\''));
  }.bind(this));

  if (image.complete) {
    src = image.src;
    image.src = BLANK;
    image.src = src;
  }
}

module.exports = imageLoaded;

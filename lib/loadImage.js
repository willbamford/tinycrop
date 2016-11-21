'use strict';

exports.__esModule = true;
/*
 * Modified version of http://github.com/desandro/imagesloaded v2.1.1
 * MIT License.
 */

var BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

function loadImage(image, callback) {
  if (!image.nodeName || image.nodeName.toLowerCase() !== 'img') {
    return callback(new Error('First argument must an image element'));
  }

  if (image.src && image.complete && image.naturalWidth !== undefined) {
    return callback(null, true);
  }

  image.addEventListener('load', function () {
    callback(null, false);
  });

  image.addEventListener('error', function (e) {
    callback(new Error('Failed to load image \'' + (image.src || '') + '\''));
  });

  if (image.complete) {
    var src = image.src;
    image.src = BLANK;
    image.src = src;
  }
}

exports.default = loadImage;
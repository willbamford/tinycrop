// http://snippetrepo.com/snippets/basic-vanilla-javascript-throttlingdebounce
function debounce (fn, wait, immediate) {
  var timeout
  return function () {
    var context = this
    var args = arguments
    clearTimeout(timeout)
    timeout = setTimeout(function () {
      timeout = null
      if (!immediate) fn.apply(context, args)
    }, wait)
    if (immediate && !timeout) fn.apply(context, args)
  }
};

module.exports = debounce

// http://snippetrepo.com/snippets/basic-vanilla-javascript-throttlingdebounce
function debounce (fn, wait, immediate) {
  let timeout
  return function () {
    const context = this
    const args = arguments
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      timeout = null
      if (!immediate) fn.apply(context, args)
    }, wait)
    if (immediate && !timeout) fn.apply(context, args)
  }
}
export default debounce

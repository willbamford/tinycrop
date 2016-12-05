var React = require('react')
var Crop = require('../src')

module.exports = React.createClass({

  componentDidMount: function () {
    this.crop = Crop.create({
      parent: this.refs.parent,
      image: 'http://www.hdwallpapers.in/walls/russell_boy_in_pixars_up-normal.jpg',
      bounds: {
        width: '100%',
        height: '100%'
      },
      selection: {
        color: 'red',
        activeColor: 'blue',
        aspectRatio: 4 / 3,
        minWidth: 200,
        minHeight: 300,
        width: 400,
        height: 500,
        x: 100,
        y: 500
      }
    })

    this.crop
      .on('start', function (region) {
        console.log('Selection has started', region)
      })
      .on('move', function (region) {
        console.log('Selection has moved', region)
      })
      .on('resize', function (region) {
        console.log('Selection has resized', region)
      })
      .on('change', function (region) {
        console.log('Selection has changed', region)
      })
      .on('end', function (region) {
        console.log('Selection has ended', region)
      })
  },

  componentWillUnmount: function () {
    this.crop.dispose()
  },

  componentDidUpdate: function () {
  },

  render: function () {
    return <div ref='parent' className='image-crop' />
  }
})

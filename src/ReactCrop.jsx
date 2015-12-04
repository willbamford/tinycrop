var React = require('react');
var Crop = require('./Crop.js');

var ReactCrop = React.createClass({

  componentDidMount: function() {

    console.log('ReactCrop componentDidMount()');
    // this.Crop = Crop.create({
    //   parent: this.refs.parent,
    //   bounds: {
    //     width: '100%',
    //     height: 'auto'
    //   },
    //   selection: {
    //     aspectRatio: 3 / 4,
    //     minWidth: 200,
    //     minHeight: 300
    //     // width: 400,
    //     // height: 500,
    //     // x: 100,
    //     // y: 500
    //   }
    // });

    this.Crop = Crop.create({
      parent: this.refs.parent,
      image: 'http://www.hdwallpapers.in/walls/russell_boy_in_pixars_up-normal.jpg',
      bounds: {
        width: '100%',
        height: '50%'
      },
      selection: {
        // color: 'red',
        // activeColor: 'blue',
        aspectRatio: 4 / 3,
        // minWidth: 200,
        // minHeight: 300
        // width: 400,
        // height: 500,
        // x: 100,
        // y: 500
      }
    });

    this.Crop
      .on('start', function(region) {
        console.log('Selection has started', region);
      })
      .on('move', function(region) {
        console.log('Selection has moved', region);
      })
      .on('resize', function(region) {
        console.log('Selection has resized', region);
      })
      .on('change', function(region) {
        console.log('Selection has changed', region);
      })
      .on('end', function(region) {
        console.log('Selection has ended', region);
      });

    // var image = document.createElement('img');
    // // image.src = 'images/landscape.jpg';
    // image.src = 'http://joombig.com/demo-extensions1/images/gallery_slider/Swan_large.jpg';
    // this.Crop.setImage(image);
    // this.Crop.setImage('http://joombig.com/demo-extensions1/images/gallery_slider/Swan_large.jpg');
  },

  componentWillUnmount: function() {
    console.log('ReactCrop componentWillUnmount()');
    this.Crop.dispose();
  },

  componentDidUpdate: function() {
    console.log('ReactCrop componentDidUpdate()');
  },

  render: function() {

    console.log('ReactCrop render()');

    return <div ref="parent" className="image-crop"></div>;
  }
});

module.exports = ReactCrop;

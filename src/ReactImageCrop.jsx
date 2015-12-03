var React = require('react');
var ImageCrop = require('./ImageCrop.js');

var ReactImageCrop = React.createClass({

  componentDidMount: function() {

    console.log('ReactImageCrop componentDidMount()');
    // this.imageCrop = ImageCrop.create({
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

    this.imageCrop = ImageCrop.create({
      parent: this.refs.parent,
      bounds: {
        width: '100%',
        height: '50%'
      },
      selection: {
        // color: 'red',
        // activeColor: 'blue',
        // aspectRatio: 3 / 4,
        // minWidth: 200,
        // minHeight: 300
        // width: 400,
        // height: 500,
        // x: 100,
        // y: 500
      }
    });

    this.imageCrop
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
    // this.imageCrop.setImage(image);
    this.imageCrop.setImage('http://joombig.com/demo-extensions1/images/gallery_slider/Swan_large.jpg');
  },

  componentWillUnmount: function() {
    console.log('ReactImageCrop componentWillUnmount()');
    this.imageCrop.dispose();
  },

  componentDidUpdate: function() {
    console.log('ReactImageCrop componentDidUpdate()');
  },

  render: function() {

    console.log('ReactImageCrop render()');

    return <div ref="parent" className="image-crop"></div>;
  }
});

module.exports = ReactImageCrop;

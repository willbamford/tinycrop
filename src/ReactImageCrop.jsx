var React = require('react');
var ImageCrop = require('./ImageCrop.js');

var ReactImageCrop = React.createClass({

  componentDidMount: function() {

    console.log('ReactImageCrop componentDidMount()');
    this.imageCrop = ImageCrop.create({
      parent: this.refs.parent,
      bounds: {
        width: '100%',
        height: 'auto'
      },
      selection: {
        aspectRatio: 3 / 4,
        minWidth: 200,
        minHeight: 300
        // width: 400,
        // height: 500,
        // x: 100,
        // y: 500
      }
    });

    var image = document.createElement('img');
    image.src = 'images/landscape.jpg';
    this.imageCrop.setImage(image);
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

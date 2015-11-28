var React = require('react');
var ImageCrop = require('./ImageCrop.js');

var ReactImageCrop = React.createClass({

  componentDidMount: function() {

    console.log('ReactImageCrop componentDidMount()');
    this.imageCrop = ImageCrop.create({
      parent: this.refs.parent,
      width: '100%',
      height: '100%'
    });

    var image = document.createElement('img');
    image.src = 'images/portrait.jpg';

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

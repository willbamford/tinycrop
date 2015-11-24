var React = require('react');
var ReactDOM = require('react-dom');
var ReactImageCrop = require('./ReactImageCrop.jsx');

var node = document.createElement('div');
document.body.appendChild(node);

ReactDOM.render(<ReactImageCrop />, node);

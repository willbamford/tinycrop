var React = require('react');
var ReactDOM = require('react-dom');
var ReactCrop = require('./ReactCrop.jsx');

var node = document.createElement('div');
document.body.appendChild(node);

ReactDOM.render(<ReactCrop />, node);

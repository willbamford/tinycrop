var SelectionLayer = function(opts) {

	this.canvas = opts.canvas;
	this.context = this.canvas.getContext('2d');
};

SelectionLayer.create = function(opts) {
	return new SelectionLayer(opts);
};

SelectionLayer.prototype.revalidate = function() {

};

SelectionLayer.prototype.paint = function() {

	var context = this.context;
	context.fillStyle = 'green';
	context.fillRect(0, 0, 100, 100);
};

module.exports = SelectionLayer;

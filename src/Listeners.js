var Listeners = function(opts) {
	this.events = {};
};

Listeners.create = function(opts) {
	return new Listeners(opts);
};

Listeners.prototype.on = function(type, fn) {

	if (!this.events[type])
		this.events[type] = [];

  if (this.events[type].indexOf(fn) === -1)
      this.events[type].push(fn);

  return this;
};

Listeners.prototype.off = function(type, fn) {

  if (this.events[type]) {

    var i = this.events[type].indexOf(fn);
    if (i !== -1)
			this.events[type].splice(i, 1);
  }

  return this;
};

Listeners.prototype.notify = function(type, data) {

  if (this.events[type]) {
    this.events[type].forEach(function(fn) {
      fn.call(this, data);
    }.bind(this));
  }
};

module.exports = Listeners;

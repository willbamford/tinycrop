"use strict";

exports.__esModule = true;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Listeners = function () {
  function Listeners(opts) {
    _classCallCheck(this, Listeners);

    this.events = {};
  }

  _createClass(Listeners, [{
    key: "on",
    value: function on(type, fn) {
      if (!this.events[type]) {
        this.events[type] = [];
      }

      if (this.events[type].indexOf(fn) === -1) {
        this.events[type].push(fn);
      }

      return this;
    }
  }, {
    key: "off",
    value: function off(type, fn) {
      if (this.events[type]) {
        var i = this.events[type].indexOf(fn);
        if (i !== -1) {
          this.events[type].splice(i, 1);
        }
      }

      return this;
    }
  }, {
    key: "notify",
    value: function notify(type, data) {
      var _this = this;

      if (this.events[type]) {
        this.events[type].forEach(function (fn) {
          fn.call(_this, data);
        });
      }
    }
  }, {
    key: "clearAll",
    value: function clearAll() {
      this.events = {};
    }
  }]);

  return Listeners;
}();

Listeners.create = function (opts) {
  return new Listeners(opts);
};

exports.default = Listeners;
'use strict';

var React = require('react');
var Crop = require('./Crop.js');

var ReactCrop = React.createClass({
  displayName: 'ReactCrop',


  componentDidMount: function componentDidMount() {
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
    });

    this.crop.on('start', function (region) {
      console.log('Selection has started', region);
    }).on('move', function (region) {
      console.log('Selection has moved', region);
    }).on('resize', function (region) {
      console.log('Selection has resized', region);
    }).on('change', function (region) {
      console.log('Selection has changed', region);
    }).on('end', function (region) {
      console.log('Selection has ended', region);
    });
  },

  componentWillUnmount: function componentWillUnmount() {
    this.crop.dispose();
  },

  componentDidUpdate: function componentDidUpdate() {},

  render: function render() {
    return React.createElement('div', { ref: 'parent', className: 'image-crop' });
  }
});

module.exports = ReactCrop;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9SZWFjdENyb3AuanN4Il0sIm5hbWVzIjpbIlJlYWN0IiwicmVxdWlyZSIsIkNyb3AiLCJSZWFjdENyb3AiLCJjcmVhdGVDbGFzcyIsImNvbXBvbmVudERpZE1vdW50IiwiY3JvcCIsImNyZWF0ZSIsInBhcmVudCIsInJlZnMiLCJpbWFnZSIsImJvdW5kcyIsIndpZHRoIiwiaGVpZ2h0Iiwic2VsZWN0aW9uIiwiY29sb3IiLCJhY3RpdmVDb2xvciIsImFzcGVjdFJhdGlvIiwibWluV2lkdGgiLCJtaW5IZWlnaHQiLCJ4IiwieSIsIm9uIiwicmVnaW9uIiwiY29uc29sZSIsImxvZyIsImNvbXBvbmVudFdpbGxVbm1vdW50IiwiZGlzcG9zZSIsImNvbXBvbmVudERpZFVwZGF0ZSIsInJlbmRlciIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7O0FBQUEsSUFBSUEsUUFBUUMsUUFBUSxPQUFSLENBQVo7QUFDQSxJQUFJQyxPQUFPRCxRQUFRLFdBQVIsQ0FBWDs7QUFFQSxJQUFJRSxZQUFZSCxNQUFNSSxXQUFOLENBQWtCO0FBQUE7OztBQUVoQ0MscUJBQW1CLDZCQUFZO0FBQzdCLFNBQUtDLElBQUwsR0FBWUosS0FBS0ssTUFBTCxDQUFZO0FBQ3RCQyxjQUFRLEtBQUtDLElBQUwsQ0FBVUQsTUFESTtBQUV0QkUsYUFBTyxzRUFGZTtBQUd0QkMsY0FBUTtBQUNOQyxlQUFPLE1BREQ7QUFFTkMsZ0JBQVE7QUFGRixPQUhjO0FBT3RCQyxpQkFBVztBQUNUQyxlQUFPLEtBREU7QUFFVEMscUJBQWEsTUFGSjtBQUdUQyxxQkFBYSxJQUFJLENBSFI7QUFJVEMsa0JBQVUsR0FKRDtBQUtUQyxtQkFBVyxHQUxGO0FBTVRQLGVBQU8sR0FORTtBQU9UQyxnQkFBUSxHQVBDO0FBUVRPLFdBQUcsR0FSTTtBQVNUQyxXQUFHO0FBVE07QUFQVyxLQUFaLENBQVo7O0FBb0JBLFNBQUtmLElBQUwsQ0FDR2dCLEVBREgsQ0FDTSxPQUROLEVBQ2UsVUFBVUMsTUFBVixFQUFrQjtBQUM3QkMsY0FBUUMsR0FBUixDQUFZLHVCQUFaLEVBQXFDRixNQUFyQztBQUNELEtBSEgsRUFJR0QsRUFKSCxDQUlNLE1BSk4sRUFJYyxVQUFVQyxNQUFWLEVBQWtCO0FBQzVCQyxjQUFRQyxHQUFSLENBQVkscUJBQVosRUFBbUNGLE1BQW5DO0FBQ0QsS0FOSCxFQU9HRCxFQVBILENBT00sUUFQTixFQU9nQixVQUFVQyxNQUFWLEVBQWtCO0FBQzlCQyxjQUFRQyxHQUFSLENBQVksdUJBQVosRUFBcUNGLE1BQXJDO0FBQ0QsS0FUSCxFQVVHRCxFQVZILENBVU0sUUFWTixFQVVnQixVQUFVQyxNQUFWLEVBQWtCO0FBQzlCQyxjQUFRQyxHQUFSLENBQVksdUJBQVosRUFBcUNGLE1BQXJDO0FBQ0QsS0FaSCxFQWFHRCxFQWJILENBYU0sS0FiTixFQWFhLFVBQVVDLE1BQVYsRUFBa0I7QUFDM0JDLGNBQVFDLEdBQVIsQ0FBWSxxQkFBWixFQUFtQ0YsTUFBbkM7QUFDRCxLQWZIO0FBZ0JELEdBdkMrQjs7QUF5Q2hDRyx3QkFBc0IsZ0NBQVk7QUFDaEMsU0FBS3BCLElBQUwsQ0FBVXFCLE9BQVY7QUFDRCxHQTNDK0I7O0FBNkNoQ0Msc0JBQW9CLDhCQUFZLENBQy9CLENBOUMrQjs7QUFnRGhDQyxVQUFRLGtCQUFZO0FBQ2xCLFdBQU8sNkJBQUssS0FBSSxRQUFULEVBQWtCLFdBQVUsWUFBNUIsR0FBUDtBQUNEO0FBbEQrQixDQUFsQixDQUFoQjs7QUFxREFDLE9BQU9DLE9BQVAsR0FBaUI1QixTQUFqQiIsImZpbGUiOiJSZWFjdENyb3AuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpXG52YXIgQ3JvcCA9IHJlcXVpcmUoJy4vQ3JvcC5qcycpXG5cbnZhciBSZWFjdENyb3AgPSBSZWFjdC5jcmVhdGVDbGFzcyh7XG5cbiAgY29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmNyb3AgPSBDcm9wLmNyZWF0ZSh7XG4gICAgICBwYXJlbnQ6IHRoaXMucmVmcy5wYXJlbnQsXG4gICAgICBpbWFnZTogJ2h0dHA6Ly93d3cuaGR3YWxscGFwZXJzLmluL3dhbGxzL3J1c3NlbGxfYm95X2luX3BpeGFyc191cC1ub3JtYWwuanBnJyxcbiAgICAgIGJvdW5kczoge1xuICAgICAgICB3aWR0aDogJzEwMCUnLFxuICAgICAgICBoZWlnaHQ6ICcxMDAlJ1xuICAgICAgfSxcbiAgICAgIHNlbGVjdGlvbjoge1xuICAgICAgICBjb2xvcjogJ3JlZCcsXG4gICAgICAgIGFjdGl2ZUNvbG9yOiAnYmx1ZScsXG4gICAgICAgIGFzcGVjdFJhdGlvOiA0IC8gMyxcbiAgICAgICAgbWluV2lkdGg6IDIwMCxcbiAgICAgICAgbWluSGVpZ2h0OiAzMDAsXG4gICAgICAgIHdpZHRoOiA0MDAsXG4gICAgICAgIGhlaWdodDogNTAwLFxuICAgICAgICB4OiAxMDAsXG4gICAgICAgIHk6IDUwMFxuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGlzLmNyb3BcbiAgICAgIC5vbignc3RhcnQnLCBmdW5jdGlvbiAocmVnaW9uKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdTZWxlY3Rpb24gaGFzIHN0YXJ0ZWQnLCByZWdpb24pXG4gICAgICB9KVxuICAgICAgLm9uKCdtb3ZlJywgZnVuY3Rpb24gKHJlZ2lvbikge1xuICAgICAgICBjb25zb2xlLmxvZygnU2VsZWN0aW9uIGhhcyBtb3ZlZCcsIHJlZ2lvbilcbiAgICAgIH0pXG4gICAgICAub24oJ3Jlc2l6ZScsIGZ1bmN0aW9uIChyZWdpb24pIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1NlbGVjdGlvbiBoYXMgcmVzaXplZCcsIHJlZ2lvbilcbiAgICAgIH0pXG4gICAgICAub24oJ2NoYW5nZScsIGZ1bmN0aW9uIChyZWdpb24pIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1NlbGVjdGlvbiBoYXMgY2hhbmdlZCcsIHJlZ2lvbilcbiAgICAgIH0pXG4gICAgICAub24oJ2VuZCcsIGZ1bmN0aW9uIChyZWdpb24pIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1NlbGVjdGlvbiBoYXMgZW5kZWQnLCByZWdpb24pXG4gICAgICB9KVxuICB9LFxuXG4gIGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5jcm9wLmRpc3Bvc2UoKVxuICB9LFxuXG4gIGNvbXBvbmVudERpZFVwZGF0ZTogZnVuY3Rpb24gKCkge1xuICB9LFxuXG4gIHJlbmRlcjogZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiA8ZGl2IHJlZj0ncGFyZW50JyBjbGFzc05hbWU9J2ltYWdlLWNyb3AnIC8+XG4gIH1cbn0pXG5cbm1vZHVsZS5leHBvcnRzID0gUmVhY3RDcm9wXG4iXX0=
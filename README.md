# Crop

JavaScript image cropper.

## Install

Using NPM:
```
npm i jscrop -S
```

Or [Yarn](https://yarnpkg.com):
```
yarn add jscrop
```

## Instantiate

```js
var Crop = require('jscrop')

var crop = Crop.create({
  parent: '#mount',
  image: 'images/portrait.jpg',
  bounds: {
    width: '100%',
    height: '50%'
  },
  backgroundColors: ['#fff', '#f0f0f0'],
  selection: {
    color: 'red',
    activeColor: 'blue',
    aspectRatio: 4 / 3,
    minWidth: 200,
    minHeight: 300
    width: 400,
    height: 500,
    x: 100,
    y: 500
  }
});
```

## Event Handling

```js
crop
  .on('start', function (region) { console.log('Start', region) })
  .on('move', function (region) { console.log('Move', region) })
  .on('resize', function (region) { console.log('Resize', region) })
  .on('change', function (region) { console.log('Change', region) })
  .on('end', function (region) { console.log('End', region) })
```

## Demo

http://webseed.github.io/crop/

# crop

<a href="https://circleci.com/gh/WebSeed/crop">
  <img
    src="https://circleci.com/gh/WebSeed/crop.svg?style=shield"
    alt="Build status" />
</a>
<a href="https://npmjs.org/package/jscrop">
  <img
    src="https://img.shields.io/npm/v/jscrop.svg?style=flat-square"
    alt="NPM version" />
</a>
<a href="https://standardjs.com">
  <img
    src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square"
    alt="Standard" />
</a>
<a href="https://unpkg.com/jscrop/dist/Crop.min.js">
   <img
    src="https://badge-size.herokuapp.com/WebSeed/crop/master/dist/Crop.min.js.svg?compression=gzip"
    alt="File size" />
</a>

Pure JavaScript image crop library. Also [plays nicely with React](http://webseed.github.io/crop/react-example).

## Install

Using NPM:
```
npm i jscrop -S
```

Or [Yarn](https://yarnpkg.com):
```
yarn add jscrop
```

## Create

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

## Events

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

# 🚨 Sorry this repo is no longer maintained

# tinycrop

<a href="https://circleci.com/gh/willbamford/tinycrop">
  <img
    src="https://circleci.com/gh/willbamford/tinycrop.svg?style=shield"
    alt="Build status" />
</a>
<a href="https://npmjs.org/package/tinycrop">
  <img
    src="https://img.shields.io/npm/v/tinycrop.svg?style=flat-square"
    alt="NPM version" />
</a>
<a href="https://standardjs.com">
  <img
    src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square"
    alt="Standard" />
</a>
<a href="https://unpkg.com/tinycrop/dist/tinycrop.min.js">
   <img
    src="https://badge-size.herokuapp.com/willbamford/tinycrop/master/dist/tinycrop.min.js.svg?compression=gzip"
    alt="File size" />
</a>

Lightweight pure JavaScript image crop library. [Plays nicely with React](http://willbamford.github.io/tinycrop/react-example).

## Install from repository

Using NPM:
```
npm i tinycrop -S
```

Or [Yarn](https://yarnpkg.com):
```
yarn add tinycrop
```

## Build from source
1. Install nodejs
1. Clone this repository
1.
    ```bash
    npm install
    ```
1. 
    ```bash
    npm run build
    ```

## Create new cropper

```js
var Crop = require('tinycrop')

var crop = Crop.create({
  parent: '#mount',
  image: 'images/portrait.jpg',
  bounds: {
    width: '100%',
    height: '50%'
  },
  backgroundColors: ['#fff', '#f3f3f3'],
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
  },
  onInit: () => { console.log('Initialised') }
});
```

## Events

```js
crop
  .on('start', function (region) { console.log('Start', region) })
  .on('move', function (region) { console.log('Move', region) })
  .on('resize', function (region) { console.log('Resize', region) })
  .on('change', function (region) { console.log('Change', region) })
  .on('end', function (region) { console.log('End', region) });
```

## Demo

http://willbamford.github.io/tinycrop/

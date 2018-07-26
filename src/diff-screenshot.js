#! /usr/bin/env node

const Blink = require('blink-diff');
const path = require('path');
const argv = require('yargs').argv;

const resolve = (name) => {
  // NOTE: this assumes the script is being in the projects node_modules folder atm!
  return path.resolve(__dirname, `../../../${name}`);
};

const threshold = argv.threshold !== undefined ? argv.threshold : 0.005;
let thresholdType;
switch (argv.thresholdType) {
  case 'pixel':
    thresholdType = Blink.THRESHOLD_PIXEL;
    break;
  case 'percent':
  default:
    thresholdType = Blink.THRESHOLD_PERCENT;
    break;
}
const diff = new Blink({
  imageAPath: resolve(argv.pathOld),
  imageBPath: resolve(argv.pathNew),
  imageOutputPath: resolve(argv.target),
  thresholdType: 'percent',
  threshold: 0.2,
  outputMaskRed: 0,
  outputMaskBlue: 255, // Use blue for highlighting differences
  createComparison: 'compareLeftToRight',
  hideShift: false, // Hide anti-aliasing differences - will still determine but not showing it
});

diff.run((error, result) => {
  console.log(diff.hasPassed(result.code) ? 'Yay' : 'Nah');
});

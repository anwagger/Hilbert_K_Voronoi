import {Canvas} from "./drawing/canvas/canvas.js"

let canvasElement = document.getElementById('canvas');
let canvas = new Canvas(canvasElement);
let ctx = canvas.ctx;
console.log(canvas);  
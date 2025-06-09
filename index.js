import {DrawablePoint} from "./drawing/drawable.js"
import {Canvas} from "./drawing/canvas/canvas.js"
import {Point} from "./geometry/primitives.js"

let canvasElement = document.getElementById('canvas');
let canvas = new Canvas(canvasElement);
let ctx = canvas.ctx


let point = new Point(100,50);
let drawable_point = new DrawablePoint(point);
console.log("point1");
drawable_point.draw();
console.log("point2");



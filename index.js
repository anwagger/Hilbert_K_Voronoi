import {DrawablePoint, DrawablePolygon, DrawableSegment} from "./drawing/drawable.js"
import {Canvas} from "./drawing/canvas/canvas.js"
import {Point, Polygon, Segment, Spoke} from "./geometry/primitives.js"
import { calculateSpokes } from "./geometry/hilbert.js";

let canvasElement = document.getElementById('canvas');
let canvas = new Canvas(canvasElement);
let ctx = canvas.ctx;
console.log(canvas);  

let point1 = new Point(10,10);
let point2 = new Point(100,100);
let point3 = new Point(10, 100);


let point4 = new Point(20,20);

let boundary = new Polygon([point1, point2, point3]);
let drawable_point1 = new DrawablePoint(point1);
let drawable_point2 = new DrawablePoint(point2);
let segment = new Segment(point1, point2);
let spokes = calculateSpokes(boundary, point4);

let drawable_boundary = new DrawablePolygon(boundary);
drawable_boundary.draw(ctx);

for (let i = 0; i < spokes.length; i++) {
  drawer = new DrawableSegment(spokes[i]);
  drawer.draw(ctx);
}

let drawable_segment = new DrawableSegment(segment);
//drawable_segment.draw(ctx);
console.log("point1");
/*
drawable_point1.draw(ctx);
drawable_point2.draw(ctx);
drawable_segment.draw(ctx);
*/
console.log("point2");



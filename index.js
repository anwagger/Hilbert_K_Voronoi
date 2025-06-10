import {DrawableConicSegment, DrawablePoint, DrawablePolygon, DrawableSegment} from "./drawing/drawable.js"
import {Canvas} from "./drawing/canvas/canvas.js"
import {Point, Polygon, Segment, Spoke} from "./geometry/primitives.js"
import { calculateBisector, calculateSector,calculateSectorTesting, calculateSpokes, HilbertPoint } from "./geometry/hilbert.js";
import { convexHull } from "./geometry/utils.js";
import { Conic, ConicSegment, parameterizeConic } from "./geometry/conics.js";

let canvasElement = document.getElementById('canvas');
let canvas = new Canvas(canvasElement);
let ctx = canvas.ctx;
console.log(canvas);  

let point1 = new Point(30,50);
let drawable_point1 = new DrawablePoint(point1);

let point2 = new Point(80,90)
let drawable_point2 = new DrawablePoint(point2);


let boundary = new Polygon(convexHull([new Point(10,10), new Point(100,10),new Point(100,100), new Point(10, 100)]));
let spokes1 = calculateSpokes(boundary, point1);
let spokes2 = calculateSpokes(boundary, point2);


let drawable_boundary = new DrawablePolygon(boundary,"red");
drawable_boundary.draw(ctx);



drawable_point1.draw(ctx)
drawable_point2.draw(ctx)

for (let i = 0; i < spokes1.length; i++) {
  let drawer = new DrawableSegment(spokes1[i].segment);
  drawer.draw(ctx);
}

for (let i = 0; i < spokes2.length; i++) {
  let drawer = new DrawableSegment(spokes2[i].segment);
  drawer.draw(ctx);
}

let h_p1 = new HilbertPoint(point1,spokes1)
let h_p2 = new HilbertPoint(point2,spokes2)

let {sector:sector, gons:gons} = calculateSectorTesting(boundary,h_p1,h_p2,3,2,2,3)

console.log("SECTOR",sector)
let colors = ["green","purple","yellow","orange"]
for(let i = 0; i < gons.length; i++){
    let gon = new DrawablePolygon(gons[i],colors[i]);
    gon.draw(ctx);
}

let drawable_sector = new DrawablePolygon(sector.polygon,"blue","blue",false);
drawable_sector.draw(ctx);
//let bisector = calculateBisector(boundary,h_p1,h_p2)
//console.log("BISECTOR",bisector)


console.log("CONIC TESTING!")

let c = new Conic({A:0.5,B:0,C:-1.5,D:-10,E:100,F:-10})
console.log(c)
let p_c = parameterizeConic(c)
console.log(p_c)

let c_s = new ConicSegment(p_c,0,2*Math.PI,null)

let draw_conic = new DrawableConicSegment(c_s)

draw_conic.draw(ctx,50)


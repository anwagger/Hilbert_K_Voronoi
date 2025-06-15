import {CAMERA,DrawableBisector,DrawableConicSegment, DrawablePoint, DrawablePolygon, DrawableSegment} from "./drawing/drawable.js"
import {Canvas} from "./drawing/canvas/canvas.js"
import {Point, Polygon, Segment, Spoke} from "./geometry/primitives.js"
import { calculateBisector, calculateSector,calculateSectorTesting, calculateSpokes, HilbertPoint } from "./geometry/hilbert.js";
import { convexHull } from "./geometry/utils.js";
import { Conic, ConicSegment, parameterizeConic,bisectorConicFromSector,getConicParameterBoundsInPolygon } from "./geometry/conics.js";

let canvasElement = document.getElementById('canvas');
let canvas = new Canvas(canvasElement);
let ctx = canvas.ctx;
console.log(canvas);  

/*
canvasElement.onmousedown = (event) => {
    CAMERA.move_lock = false
}
canvasElement.onmouseup = (event) => {
    CAMERA.move_lock = true
}

canvasElement.onscroll = (event) => {
    CAMERA.changeScale(event.movementY)

}

canvasElement.onmousemove = (event) => {
    if (!CAMERA.move_lock){
        if(event.shiftKey){
                CAMERA.changeScale(event.movementY)

        }else{
            
            CAMERA.changeOffset(event.movementX,event.movementY)

        }
        test_render()
        //canvas.drawAll()
    }
}

canvasElement.onscroll = (event) => {
    CAMERA.changeOffset(event.movementX,event.movementY)
}
*/


let point1 = new Point(30,50);
let drawable_point1 = new DrawablePoint(point1);

let point2 = new Point(80,90)
let drawable_point2 = new DrawablePoint(point2);

let boundary = new Polygon(convexHull([new Point(10,10), new Point(100,10),new Point(100,100), new Point(10, 100)]));
let spokes1 = calculateSpokes(boundary, point1);
let spokes2 = calculateSpokes(boundary, point2);

let drawable_boundary = new DrawablePolygon(boundary,"red");


let h_p1 = new HilbertPoint(point1,spokes1)
let h_p2 = new HilbertPoint(point2,spokes2)

//let {sector:sector, gons:gons} = calculateSectorTesting(boundary,h_p1,h_p2,3,2,1,2)

//let {sector:sector, gons:gons} = calculateSectorTesting(boundary,h_p1,h_p2,3,2,2,3)

//console.log("SECTOR",sector)
let colors = ["green","purple","yellow","orange"]

//let drawable_sector = new DrawablePolygon(sector.polygon,"blue","blue",false);

let bisector = calculateBisector(boundary,h_p1,h_p2)
console.log("bisector",bisector)
let draw_bisector = new DrawableBisector(bisector)


let draw_conics = []
let draw_sectors = []
let sector_params = [[3,1,2,3],[3,1,2,0],[3,2,1,3],[0,2,1,3],[3,2,2,3]]//
let conic_colors = ["blue","green","red","purple","orange","pink"]
let int_points = []
for (let i = 0; i < sector_params.length; i++){
    let p = sector_params[i]
    let {sector:mid} = calculateSectorTesting(boundary,h_p1,h_p2,p[0],p[1],p[2],p[3])
    let mid_conic = bisectorConicFromSector(boundary,mid)

    let mid_p = parameterizeConic(mid_conic)

    let {start_t:start,end_t:end,points:i_points} = getConicParameterBoundsInPolygon(mid_p,mid.polygon)

    //console.log("t bounds",start,end)
    int_points = int_points.concat(i_points)
    let draw_mid_conic = new DrawableConicSegment(new ConicSegment(mid_p,start,end,null))
    //console.log("draw:",start,end,Math.abs(draw_mid_conic.conic_segment.end - draw_mid_conic.conic_segment.start)/ 50,Math.abs(draw_mid_conic.conic_segment.end - draw_mid_conic.conic_segment.start)) 

    draw_mid_conic.color = conic_colors[i]
    //console.log("sector:",p,mid)
    let draw_mid = new DrawablePolygon(mid.polygon,"gray","gray",false);
    draw_sectors.push(draw_mid)
    draw_conics.push(draw_mid_conic)
}


//console.log("BISECTOR",bisector)


console.log("CONIC TESTING!")

let c = new Conic({A:-3,B:0,C:1,D:0,E:0,F:1})
//console.log(c)
let p_c = parameterizeConic(c)
//console.log(p_c)

let c_s = new ConicSegment(p_c,0,2*Math.PI,null)

let draw_conic = new DrawableConicSegment(c_s)


let c2 = new Conic({A:3,B:0,C:-1,D:0,E:0,F:1})
//console.log(c2)
let p_c2 = parameterizeConic(c2)
//console.log(p_c2)


let c_s2 = new ConicSegment(p_c2,0,2*Math.PI,null)

let draw_conic2 = new DrawableConicSegment(c_s2)
draw_conic2.color = "blue"

let p_0 = p_c.getPointFromT(Math.PI/4)
let t_0 = p_c.getTOfPoint(p_0)
//console.log("test",p_0,t_0)


function test_render(){

    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

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

/**
for(let i = 0; i < gons.length; i++){
    let gon = new DrawablePolygon(gons[i],colors[i]);
    gon.draw(ctx);
}

drawable_sector.draw(ctx);
 */

    //draw_conic.draw(ctx,50)
    //draw_conic2.draw(ctx,50)

    for (let i = 0; i < draw_conics.length; i++){
        draw_sectors[i].draw(ctx)
        draw_conics[i].draw(ctx,50)
        //draw_conics[i].drawStraight(ctx,50)
    }
    for(   let i = 0; i < int_points.length; i++){
        let d_p = new DrawablePoint(int_points[i])
        d_p.color = "yellow"
        d_p.draw(ctx)
    }
         

    draw_bisector.draw(ctx)

}


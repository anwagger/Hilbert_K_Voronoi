import {CAMERA,DrawableBisector,DrawableConicSegment, DrawablePoint, DrawablePolygon, DrawableSegment} from "./drawing/drawable.js"
import {Canvas} from "./drawing/canvas/canvas.js"
import {Point, Polygon, Segment, Spoke} from "./geometry/primitives.js"
import { calculateBisector, calculateMidsector, calculateSector,calculateSectorTesting,testBisectorSector, calculateSpokes, HilbertPoint,getSectorNeighbors } from "./geometry/hilbert.js";
import { convexHull } from "./geometry/utils.js";
import { Conic, ConicSegment, parameterizeConic,bisectorConicFromSector,getConicParameterBoundsInPolygon } from "./geometry/conics.js";

let canvasElement = document.getElementById('canvas');
let canvas = new Canvas(canvasElement);
let ctx = canvas.ctx;
console.log(canvas);  

/**
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

function testBisector(boundary,point1,point2){
    let drawable_point1 = new DrawablePoint(point1);
    let drawable_point2 = new DrawablePoint(point2);
    let spokes1 = calculateSpokes(boundary, point1);
    let spokes2 = calculateSpokes(boundary, point2);
    let h_p1 = new HilbertPoint(point1,spokes1)
    let h_p2 = new HilbertPoint(point2,spokes2)

    let drawable_boundary = new DrawablePolygon(boundary,"red");

    let midsector = calculateMidsector(boundary,h_p1,h_p2)

    console.log("MIDSECTOR",midsector)

    let m = testBisectorSector(boundary,midsector)

    let h_d = getSectorNeighbors(boundary,midsector)

    let sectors = [[0,3,2,0],[0,3,2,3],[3,1,3,1],[3,0,3,0],[2,0,3,0],[2,3,2,3],[2,0,2,0],[0,3,0,3],[0,2,3,2]]

    for(let i = 0; i < sectors.length; i++){
        let p = sectors[i]
        let sector2 = calculateSector(boundary,h_p1,h_p2,p[0],p[1],p[2],p[3])

        let h_d2 = getSectorNeighbors(boundary,sector2)
    }




    

    let bisector = null
    let draw_bisector = null
    try{
        bisector = calculateBisector(boundary,h_p1,h_p2)
        draw_bisector = new DrawableBisector(bisector)

    }catch{

    }
    console.log("bisector",bisector)

    return {
        draw_bisector:draw_bisector,
        drawable_boundary:drawable_boundary,
        drawable_point1:drawable_point1,
        drawable_point2:drawable_point2,
        spokes1:spokes1,
        spokes2:spokes2,
        midsector_intersections:m
    }
}

let point1 = new Point(30,50);
let point2 = new Point(80,90)
let boundary = new Polygon(convexHull([new Point(10,10), new Point(100,10),new Point(100,100), new Point(10, 100)]));


let colors = ["green","purple","yellow","orange"]
let draw_conics = []
let draw_sectors = []
let sector_params = [[3,1,2,3],[3,1,2,0],[3,2,1,3],[0,2,1,3],[3,2,2,3]]//
let conic_colors = ["blue","green","red","purple","orange","pink"]
let int_points = []
let spokes1 = calculateSpokes(boundary, point1);
let spokes2 = calculateSpokes(boundary, point2);
let h_p1 = new HilbertPoint(point1,spokes1)
let h_p2 = new HilbertPoint(point2,spokes2)
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
let b = []
//testBisector(boundary,point1,point2),
b.push(testBisector(boundary,point1,new Point(20,70)))

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

    for(let i = 0; i < b.length; i++){
        let b_test = b[i]
        b_test.drawable_boundary.draw(ctx);

        b_test.drawable_point1.draw(ctx)
        b_test.drawable_point2.draw(ctx)

        for (let i = 0; i < b_test.spokes1.length; i++) {
        let drawer = new DrawableSegment(b_test.spokes1[i].segment);
        drawer.draw(ctx);
        }

        for (let i = 0; i < b_test.spokes2.length; i++) {
        let drawer = new DrawableSegment(b_test.spokes2[i].segment);
        drawer.draw(ctx);
        }
        if(b_test.draw_bisector){
        b_test.draw_bisector.draw(ctx)

        }

        let d_m1 = new DrawablePoint(b_test.midsector_intersections.start_point)
        let d_m2 = new DrawablePoint(b_test.midsector_intersections.end_point)

        d_m1.draw(ctx)
        d_m2.draw(ctx)



    }

/*  
for(let i = 0; i < gons.length; i++){
    let gon = new DrawablePolygon(gons[i],colors[i]);
    gon.draw(ctx);
}
    */

//drawable_sector.draw(ctx);


    //draw_conic.draw(ctx,50)
    //draw_conic2.draw(ctx,50)

    /**
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
    */
         
    


}

        test_render()

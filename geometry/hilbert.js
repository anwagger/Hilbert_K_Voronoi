import {Bisector} from "./bisectors.js"
import { ConicSegment,bisectorConicFromSector,parameterizeConic,getConicParameterBoundsInPolygon,calculateConicSegmentBounds } from "./conics.js"
import { Polygon, Sector, Segment,Spoke } from "./primitives.js"
import { convexHull, euclideanDistance, intersectSegments, pointInPolygon,isBetween, intersectSegmentsAsLines, pointSegDistance, pointOnPolygon, isZero, hasSign } from "./utils.js"

export class HilbertPoint {
    constructor(point,spokes){
        this.point = point
        this.spokes = spokes
    }
}

export function calculateHilbertPoint(boundary,point){
    let spokes = calculateSpokes(boundary,point)
    return new HilbertPoint(point,spokes)
}

export function calculateSpokes(boundary,point){

    // line segments from boundary points to point, 
    // then check if a vertex-point line intersects a segment of the boundary validly
    const points = boundary.points
    let spokes = []
    let n_points = points.length;
    // each segment of the boundary
    for (let i = 0; i < n_points; i++){
        let partial_spoke = new Segment(points[i],point)
        // for each segment not adjacent to the vertex
        for (let j = 1; j < n_points-1; j++){
            let i2 = (i + j)%n_points

            let boundary_segment = new Segment(points[i2],points[(i2+1)%n_points])
            
            let intersection = intersectSegmentsAsLines(partial_spoke,boundary_segment); 
            
            
            if (intersection){
                // valid intersection
                if (
                    isBetween(boundary_segment.start.x,boundary_segment.end.x,intersection.x)
                    &&
                    isBetween(boundary_segment.start.y,boundary_segment.end.y,intersection.y)
                ){
                    spokes.push(new Spoke(new Segment(points[i],intersection),i,i2));
                    break;
                }
            }
            // check for valid intersection , 
            // add proper spoke if so, then break!
        }
    }
    if(spokes.length != n_points){
        console.log("ISSUE",spokes.length,n_points)
    }
    return spokes
}

export class HilbertPair {
    constructor(sectors,bisector){
        this.sectors = sectors;
        this.bisector = bisector;
    }
}

export function calculateSpokeIntersections(h_p1,h_p2){
    let intersections = []
    for(let i = 0; i < h_p1.spokes.length; i++){
        intersections.push([])
    }

    for(let i = 0; i < h_p1.spokes.length; i++){
        let p1_spoke = h_p1.spokes[i]
        for(let j = 0; j < h_p2.spokes.length; j++){
            let p2_spoke = h_p2.spokes[i]
            let intersection = intersectSegments(p1_spoke,p2_spoke)        
            intersections[i].push(intersection) 
        }
    }
    return intersections
}

export function makeBoundingCone(boundary,h_p,face_num,is_front){
    let faces = boundary.points.length
    if (is_front){
        return new Polygon(convexHull([
            h_p.point,
            h_p.spokes[face_num].segment.start,
            h_p.spokes[(face_num+1) % faces].segment.start
        ]))
    }else{
        let back1 = h_p.spokes[face_num].back
        let back2 = h_p.spokes[(face_num+1) % faces].back
        let min_back = Math.min(back1,back2)
        let max_back = Math.max(back1,back2)
        let forward = true
        if(face_num > min_back && face_num < max_back){
            forward = false
        }
        let connecting_points = []
        let start_face = forward?min_back:max_back
        let end_face = forward?max_back:min_back
        for(let i = faces + start_face;(i % faces) != end_face ; i = (faces + i + 1) % faces){
            connecting_points.push(boundary.points[(faces + i + 1) % faces])
        }
        let cone_points = [
            h_p.point,
            h_p.spokes[face_num].segment.end,
            h_p.spokes[(face_num+1) % boundary.points.length].segment.end]
         return new Polygon(convexHull(cone_points.concat(connecting_points)))
    }
}
/*
    for p1_enter, make the polygon of the end-part of the two spokes coming from the edges of 
    p1_enter and their collisions with the boundary
    for p1_exit, make the polygon of the start-part of the two spokes coming from the edges of 
    p1_exit and their collisions with the boundary
    do this for p2 as well.

    For each spoke-part intersection, spoke-part-boundary intersection, and initial points, 
    check if they're in the polygons of the parts not make out of the intersecting lines
    The collection of points in all the polygons is the sector 
    */

export function calculateSector(boundary,h_p1,h_p2,p1_enter,p1_exit,p2_enter,p2_exit){
    let {sector:sector} = calculateSectorTesting(boundary,h_p1,h_p2,p1_enter,p1_exit,p2_enter,p2_exit)
    return sector
}
export function calculateSectorTesting(boundary,h_p1,h_p2,p1_enter,p1_exit,p2_enter,p2_exit){

    // sector creation algorithm issue(?), specifically sometimes on a vertex corner, fails to get both collisions!  

    /* 
    algorithm:

    get polygons created by the parts of the spokes coming from the boundaries of the intersected faces
    that are passed in

    Each point that these spokes-segments make with each other and the boundary is checked
    to be in all the polygons. If so, they are part of the sector polygon

    we then calculate some metadata for the sector for later calculations to use

    */

    let p1_lines = [
        new Segment(h_p1.point,h_p1.spokes[p1_enter].segment.end),
        new Segment(h_p1.point,h_p1.spokes[(p1_enter+1) % boundary.points.length].segment.end),

        new Segment(h_p1.spokes[p1_exit].segment.start,h_p1.point),
        new Segment(h_p1.spokes[(p1_exit+1) % boundary.points.length].segment.start,h_p1.point),
    ]

    // calculate needed bounding cones for calculating sectors
    let sector_bounding_polygons = []

    //let cone1_1_points = [h_p1.point,p1_lines[0].end,p1_lines[1].end]
    //sector_bounding_polygons.push(new Polygon(convexHull(cone1_1_points)))
    sector_bounding_polygons.push(makeBoundingCone(boundary,h_p1,p1_enter,false))
    //let cone1_2_points = [h_p1.point,p1_lines[2].start,p1_lines[3].start]
    //sector_bounding_polygons.push(new Polygon(convexHull(cone1_2_points)))
    sector_bounding_polygons.push(makeBoundingCone(boundary,h_p1,p1_exit,true))
    let p2_lines = [
        new Segment(h_p2.point,h_p2.spokes[p2_enter].segment.end),
        new Segment(h_p2.point,h_p2.spokes[(p2_enter+1) % boundary.points.length].segment.end),

        new Segment(h_p2.spokes[p2_exit].segment.start,h_p2.point),
        new Segment(h_p2.spokes[(p2_exit+1) % boundary.points.length].segment.start,h_p2.point),
    ]

    //let cone2_1_points = [h_p2.point,p2_lines[0].end,p2_lines[1].end]
    //sector_bounding_polygons.push(new Polygon(convexHull(cone2_1_points)))
    sector_bounding_polygons.push(makeBoundingCone(boundary,h_p2,p2_enter,false))
    //let cone2_2_points = [h_p2.point,p2_lines[2].start,p2_lines[3].start]

    //sector_bounding_polygons.push(new Polygon(convexHull(cone2_2_points)))
    sector_bounding_polygons.push(makeBoundingCone(boundary,h_p2,p2_exit,true))

    let intersections = []

    // number in p1/p2 means which line it came from
    // this is used to skip certain polygon checks
    // -1 means check all -- used for the opposite point
    // null means check none -- used for the same point

    intersections.push({
        point: h_p1.point,
        p1: null, p2:-1
    })
    intersections.push({
        point: h_p2.point,
        p1: -1, p2:null
    })


    // intersect all the spoke lines
    // also add the non-h-point lines intersections with the boundary
    for (let i = 0; i < p1_lines.length; i++){
        let side = (Math.floor((i)/2)+1)%2 == 0?"start":"end"
        intersections.push({
            point: p1_lines[i][side], // selects the non-h_point point
            p1: i, p2:-2,
        })
    }
    for (let j = 0; j < p2_lines.length; j++){
        let side = (Math.floor((j)/2)+1)%2 == 0?"start":"end"
        intersections.push({
            point: p2_lines[j][side], // selects the non-h_point point
            p1: -2, p2:j,
        })
    }
    for (let i = 0; i < p1_lines.length; i++){
        for (let j = 0; j < p2_lines.length; j++){

            let intersection = intersectSegments(p1_lines[i],p2_lines[j])
            if (intersection){
                intersections.push({
                    point: intersection,
                    p1: i, p2:j
                })
            }
        }
    }
    let sector_points = []
    let sector_face_data = new Map()

    for (let i = 0; i < intersections.length; i++){
        let point = intersections[i].point
        let add = true
        for (let j = 0; j < sector_bounding_polygons.length; j++){
            let polygon = sector_bounding_polygons[j]
            // first 2 polygons are p1, rest are p2
            let p = Math.floor((j-1)/2)
            let line = (p == 0)?intersections[i].p1:intersections[i].p2
            
            // only need to check polygon if this point didn't come from this polygon
            // issue with this logic!
            //if (line && Math.floor((line-1)/2) != (j-1)% 2){
                if (!pointInPolygon(point,polygon)){
                    // make sure the point collides with all polygons
                    add = false
                    break;
                }
            //}
        }
        if (add){
            let face_data = sector_face_data.get(point)
            if(face_data){
                // may be duplicate intersections. If so, we want to combine the data such that it
                // gets the complete picture
                // usually the reason for duplicates is on vertices, hence checking for < 0
                if(intersections[i].p1 > 0 && face_data.p1 < 0 ){
                    face_data.p1 = intersections[i].p1
                }
                if(intersections[i].p2 > 0 && face_data.p2 < 0 ){
                    face_data.p2 = intersections[i].p2
                }
            }else{
                sector_points.push(point)
                sector_face_data.set(point, intersections[i])
            }
            
            // add points
        }
    }
    // turn points into the sector's polygon
    let sector_polygon = new Polygon(convexHull(sector_points))

    let spoke_data = []

    let line_map = [
        [p1_enter,(p1_enter+1) % boundary.points.length,p1_exit,(p1_exit+1) % boundary.points.length],
        [p2_enter,(p2_enter+1) % boundary.points.length,p2_exit,(p2_exit+1) % boundary.points.length],
    ]

    let line_id_to_spoke_id= (point_id,line_id) => {
        // returns spoke id, and if the spoke-part is the front
        //let spoke_id = (line_id < 2)?(point_id == 1?p1_enter:p2_enter):(point_id == 1?p1_exit:p2_exit)
        let spoke_id = null
        if (line_id < 0){
            if(line_id == -1){ //opposite point
                spoke_id = null
            }else if(line_id == -2){ //boundary
                spoke_id = -1
            }
        }else{
            spoke_id = line_map[point_id-1][line_id]
        }
        return {
            spoke_id: spoke_id, 
            front: (line_id >= 2)}
    }

    for (let i = 0; i < sector_polygon.points.length; i++){
        let data = sector_face_data.get(sector_polygon.points[i])
        let next_data = sector_face_data.get(sector_polygon.points[(i+1)%sector_polygon.points.length])
        let p1 = null
        let p1_side = false
        // this means its the point itself, so need next data
        if (data.p1 == null){
            // if the first point is the point, the next one's p1 should be "valid"
            let ids = line_id_to_spoke_id(1,next_data.p1)
            p1 = ids.spoke_id
            p1_side = ids.front
        }else if (data.p1 >= 0){
            let ids = line_id_to_spoke_id(1,data.p1)
            p1 = ids.spoke_id
            p1_side = ids.front
        }else if (data.p1 == -2){
            p1 = -1
        }
        let p2 = null
        let p2_side = false
        if (data.p2 == null){
            // if the first point is the point, the next one's p1 should be "valid"
            let ids = line_id_to_spoke_id(2,next_data.p2)
            p2 = ids.spoke_id
            p2_side = ids.front
        }else if (data.p2 >= 0){
            let ids = line_id_to_spoke_id(2,data.p2)
            p2 = ids.spoke_id
            p2_side = ids.front
        }else if (data.p2 == -2){
            p2 = -1
        }
        spoke_data.push( {
            p1_spoke: p1, p2_spoke:p2,
            p1_front: p1_side, p2_front: p2_side
        })
    }

    let sector =  new Sector(sector_polygon,h_p1.point,h_p2.point,p1_enter,p1_exit,p2_enter,p2_exit,spoke_data)
    //CHANGE, THIS IS FOR DEBUGGING
    return {sector:sector,gons:sector_bounding_polygons}

}

export function calculateMidsector(boundary,h_p1,h_p2){
    let mid_segment = new Segment(h_p1.point,h_p2.point)

    let x_diff = h_p1.point.x - h_p2.point.x

    let y_diff = h_p1.point.y - h_p2.point.y
    // issue if points are same x?

    let points = boundary.points

    let enter = -1
    let exit = -1

    for (let i = 0; i < points.length; i++){
        let i2 = (i+1) % points.length
        let s = new Segment(points[i],points[i2])
        let line_intersection = intersectSegmentsAsLines(mid_segment,s)

        let intersection = null


        if(line_intersection){
            const is_on = isBetween(s.start.x, s.end.x, line_intersection.x) && isBetween(s.start.y, s.end.y, line_intersection.y);
            if (is_on){
                intersection = line_intersection
            }
        }

        if (intersection){
            let ix_diff = intersection.x - h_p1.point.x
            let iy_diff = intersection.y - h_p1.point.y
            // intersect before or after
            if (hasSign(x_diff) === hasSign(ix_diff) && hasSign(y_diff) === hasSign(iy_diff)){
                enter = i
            }else{
                exit = i
            }
        }
    }

    console.log("MID",enter,exit,exit,enter)

    return calculateSector(boundary,h_p1,h_p2,enter,exit,exit,enter)

}

export function calculateBisector(boundary,h_p1,h_p2){
    // The hamming distance between two sector's edge paramterizations
    // is equal to the number of spokes needed to cross to get between sectors
    // ei neighbors are a distance of 1
    // which edge changes is based on whose spoke is crossed
    /*
    
    get middle sector
    
    NEED TO ESTABLISH A DIRECTION!!!!

    routine:
        get conic of sector
        get collisions with sector polygon, keep track of what it collided with
        if boundary collision, end
        otherwise a spoke collision:
            if front of spoke, change pi_exit as the other segment connected to the spoke
            if back of spoke, change pi_enter as the other segment connected to the spoke
    */

    let sector = calculateMidsector(boundary,h_p1,h_p2)
    //return {mid:sector}

    //console.log("MID-SECTOR:",sector)

    console.log("TRAVERSING")

    let conic_segments = traverseBisector(boundary,h_p1,h_p2,sector,null)

    console.log("DONE")

    return new Bisector(conic_segments)
}

export function traverseBisector(boundary,h_p1,h_p2,sector,start_point){

    console.log("recurse:",sector.p1_enter,sector.p1_exit,sector.p2_enter,sector.p2_exit)

    let conic = bisectorConicFromSector(boundary,sector)

    let p_conic = parameterizeConic(conic)

    let {start_t:start_t, start_segment:start_segment,start_point:s_point, end_t:end_t, end_segment:end_segment,end_point:e_point,direction:direction} = getConicParameterBoundsInPolygon(p_conic,sector.polygon,start_point)
    
    if (start_t === null || end_t === null){
        console.log("BAD T")
        console.log("intersections","start:",start_t,start_segment,s_point,"end:",end_t,end_segment,e_point,"conic:",p_conic)
    }
    //

    let data = []

    let segments = [start_segment,end_segment]
    let points = [s_point,e_point]

    for(let i = 0; i < segments.length; i++){
        if (!pointOnPolygon(points[i],boundary)){
            let segment = segments[i]
            let data1 = sector.edge_spokes[segment]
            let data2 = sector.edge_spokes[(segment+1) % sector.edge_spokes.length]
            data.push([data1,data2])
        }
    }

    //console.log("DATA",data)
    //console.log("SECTOR",start_segment,end_segment,sector)

    // parameters for the neighboring sector that was intersected with
    // hit_end is for a boundary hit
    let sector_hit = []

    for(let i = 0; i < data.length; i++){
        sector_hit.push(calculateNeighboringSector(boundary,sector,data[i]))
    }

    let bound = calculateConicSegmentBounds(p_conic,start_t,end_t,direction)

    let start_num = 0
    let end_num = 1

    let start_p = s_point//p_conic.getPointFromT(start_t)
    let end_p = e_point//p_conic.getPointFromT(end_t)

    // this is true if this isn't the first call
    if (start_point){
        if (euclideanDistance(start_point,start_p) > euclideanDistance(start_point,end_p)){
            start_num = 1
            end_num = 0

            start_p = e_point
            end_p = s_point
        }        
    }

    //console.log("RESULT\n","end\n",sector_hit[end_num],"start\n",sector_hit[start_num])

    //console.log("ENTER:",start_point,"START",start_p,"END",end_p)

    let c_s = new ConicSegment(p_conic,start_num===0?start_t:end_t,start_num===0?end_t:start_t,bound,direction)
    
    // data.length will equal 1 if there is no valid way forward
    // 0 should not happen because of the first check, but just in case...
    if (data.length <= 1){
        return [c_s]
    }
    // if the end hits a wall, return 
    if (sector_hit[end_num].hit_end){
            if(c_s.start > -Infinity && c_s.end < Infinity){
                return [c_s]
            }else{
                return []
            }
    }

    // calculate the neighboring sectors
    let start_data = sector_hit[start_num]
    let start_sector = calculateSector(boundary,h_p1,h_p2,start_data.p1_enter,start_data.p1_exit,start_data.p2_enter,start_data.p2_exit)
    let end_data = sector_hit[end_num]
    let end_sector = calculateSector(boundary,h_p1,h_p2,end_data.p1_enter,end_data.p1_exit,end_data.p2_enter,end_data.p2_exit)

    // get recursivly calculated segments
    // end_p used to be p_conic.getPointFromT(c_s.end)
    let end_segments = traverseBisector(boundary,h_p1,h_p2,end_sector,end_p)

    if(!start_point){
        // first call
        // need to get other side too!
        // start_p used to be p_conic.getPointFromT(c_s.start)
        let start_segments = traverseBisector(boundary,h_p1,h_p2,start_sector,start_p)
        
        // start will be backwards?
        // flip both order and parameter bounds
        start_segments = start_segments.reverse()
        for (let i = 0; i < start_segments.length; i++){
            let conic_seg = start_segments[i]
            let temp = conic_seg.start
            conic_seg.start = conic_seg.end
            conic_seg.end = temp
            conic_seg.direction *= -1

        }
        start_segments.push(c_s)
        let final_bisector = start_segments.concat(end_segments)
        console.log("FINAL:",final_bisector)
        return final_bisector
    }

    
        return [c_s].concat(end_segments)
        
}


export function testBisectorSector(boundary,sector){
    
    let conic = bisectorConicFromSector(boundary,sector)

    let p_conic = parameterizeConic(conic)

    return getConicParameterBoundsInPolygon(p_conic,sector.polygon)
    

}

export function getSectorNeighbors(boundary,sector){

    let sector_hit = []

    let data = []

    console.log("get: ",sector.p1_enter,sector.p1_exit,sector.p2_enter,sector.p2_exit)

    for(let i = 0; i < sector.edge_spokes.length; i++){
        let start_data1 = sector.edge_spokes[i]
        let start_data2 = sector.edge_spokes[(i+1) % sector.edge_spokes.length]
        data.push([start_data1,start_data2])
        sector_hit.push({
            p1_enter: sector.p1_enter,
            p1_exit: sector.p1_exit,
            p2_enter: sector.p2_enter,
            p2_exit: sector.p2_exit,
            hit_end: false,//(start_t === end_t)
        },)
    }

    for(let i = 0; i < data.length; i++){
        sector_hit[i] = calculateNeighboringSector(boundary,sector,data[i])
    }
    for(let i = 0; i < sector_hit.length; i++){
        let d = sector_hit[i]
        console.log("neighbor: ",i,"|",d.p1_enter,d.p1_exit,d.p2_enter,d.p2_exit,d.hit_end)
    }
    return sector_hit
}

export function calculateNeighboringSector(boundary,sector,edge_data){
    let hit_data = {
        p1_enter: sector.p1_enter,
        p1_exit: sector.p1_exit,
        p2_enter: sector.p2_enter,
        p2_exit: sector.p2_exit,
        hit_end: false,//(start_t === end_t)
    }

    let data1 = edge_data[0]
    let data2 = edge_data[1]
    

    if(!data1){
        data1 = {}
    }
    if(!data2){
        data2 = {}
    }
    //console.log("DATA",data1,data2)
    
    // if the p1 spokes are the same, we know its the p1 spoke, unless they're both null (must be a border)
    // if either of the p2 spokes are null, we must be on a p1 spoke, and the p1 stuff is not helpful 
    // if the start p2-spoke is null, and the two p1 aren't 
    let matchingP1 = 
    (data1.p1_spoke == data2.p1_spoke && (data1.p1_spoke >= 0 && data1.p1_spoke != null)) 
    || (data1.p2_spoke === null || data1.p2_spoke < 0) 
    || (data2.p2_spoke === null || data2.p2_spoke < 0)
    let point_num = matchingP1?"1":"2"
    let spoke1 = data1["p" + point_num + "_spoke"]
    let front1 = data1["p" + point_num + "_front"]
    let change = ("p" + point_num ) + (front1?"_exit":"_enter")

    // what this is doing is checking which spoke was hit,
    // whether it was the front or back,
    // and determines which parameters to change to what when passing over

    //console.log("CHANGE",change," crossing: ",spoke1," current: ",hit_data[change]," else: ",((boundary.points.length + spoke1-1)%boundary.points.length))

    // if spoke1 != null && spoke1 >= 0: not opposite point/border
    
    // check for both point spokes being equal on both means a total boundary traversal
    
    // if either are duplicates, we must be on a corner. If we then go to a edge point, 
    // we know we went on an edge
    let hit_border = 
        (spoke1 != null && spoke1 >= 0) 
        && ((data1.p1_spoke != data1.p2_spoke )|| (data2.p1_spoke != data2.p2_spoke)) 
        && ((data1.p1_spoke != data1.p2_spoke) || (data2.p1_spoke >= 0 && data2.p2_spoke >= 0))
        && ((data2.p1_spoke != data2.p2_spoke) || (data1.p1_spoke >= 0 && data1.p2_spoke >= 0))
        && ((data1.p1_spoke >= 0 && data1.p2_spoke >= 0) || (data2.p1_spoke >= 0 && data2.p2_spoke >= 0))
    if (hit_border){
        if (hit_data[change] == spoke1){
            hit_data[change] = ((boundary.points.length + spoke1-1)%boundary.points.length)
        }else{
            hit_data[change] = spoke1
        }
    }else{
        hit_data.hit_end = true
    }
    return hit_data
}


export class HilbertSpace {
    constructor(boundary, hilbert_points,hilbert_pairs){
        this.boundary = boundary
        this.hilbert_points = hilbert_points
        this.hilbert_pairs = hilbert_pairs
    }
}
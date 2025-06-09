import { ConicSegment } from "./conics"
import { Polygon, Sector, Segment, segment } from "./primitives"
import { convexHull, euclideanDistance, intersectSegments, pointInPolygon } from "./utils"

class HilbertPoint {
    constructor(point,spokes){
        this.point = point
        this.spokes = spokes
    }
}

function calculateSpokes(boundary,point){
    // line segments from boundary points to point, 
    // then check if a vertex-point line intersects a segment of the boundary validly
    const points = boundary.points
    let spokes = []
    // each segment of the boundary
    for (let i = 0; i < n_points; i++){
        let partial_spoke = new Segment(points[i],point)
        // for each segment not adjacent to the vertex
        for (let j = 1; j < n_points-1; j++){
            let i2 = (i + j)%n_points
            let boundary_segment = new Segment(points[i2],points[(i2+1)%n_points])

            let intersection = intersectSegments(partial_spoke,boundary_segment); 
            if (intersection){
                // valid intersection
                if (
                    isBetween(boundary_segment.start.x,boundary_segment.end.x,intersection.x)
                    &&
                    isBetween(boundary_segment.start.y,boundary_segment.end.y,intersection.y)
                ){
                    spokes.push(new Spoke(new Segment(points[i],intersection)),i,i2);
                    break;
                }
            }
            // check for valid intersection , 
            // add proper spoke if so, then break!
        }
    }
    return spokes
}

class HilbertPair {
    constructor(sectors,bisector){
        this.sectors = sectors;
        this.bisector = bisector;
    }
}

function calculateSpokeIntersections(h_p1,h_p2){
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
function calculateSector(boundary,h_p1,h_p2,p1_enter,p1_exit,p2_enter,p2_exit){

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

    let cone1_1_points = [h_p1.point,p1_lines[0].end,p1_lines[1].end]
    sector_bounding_polygons.push(new Polygon(convexHull(cone1_1_points)))

    let cone1_2_points = [h_p1.point,p1_lines[2].start,p1_lines[3].start]
    sector_bounding_polygons.push(new Polygon(convexHull(cone1_2_points)))

    let p2_lines = [
        new Segment(h_p2.point,h_p2.spokes[p2_enter].segment.end),
        new Segment(h_p2.point,h_p2.spokes[(p2_enter+1) % boundary.points.length].segment.end),

        new Segment(h_p2.spokes[p2_exit].segment.start,h_p2.point),
        new Segment(h_p2.spokes[(p2_exit+1) % boundary.points.length].segment.start,h_p2.point),
    ]

    let cone2_1_points = [h_p2.point,p2_lines[0].end,p2_lines[1].end]
    sector_bounding_polygons.push(new Polygon(convexHull(cone2_1_points)))

    let cone2_2_points = [h_p2.point,p2_lines[2].start,p2_lines[3].start]

    sector_bounding_polygons.push(new Polygon(convexHull(cone2_2_points)))


    let intersections = []

    // number in p1/p2 means which line it came from
    // this is used to skip certain polygon checks
    // -1 means check all
    // null means check none

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
        intersections.push({
            point: p1_lines[(Math.floor((i-1)/2)+1)%2], // selects the non-h_point point
            p1: i, p2:-1,
        })
        for (let j = 0; j < p2_lines.length; j++){
            intersections.push({
                point: p2_lines[(Math.floor((j-1)/2)+1)%2], // selects the non-h_point point
                p1: -1, p2:j,
            })
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
            if (line && Math.floor((line-1)/2) != (j-1)% 2){
                if (!pointInPolygon(point,polygon)){
                    // make sure the point collides with all polygons
                    add = false
                }
            }
        }
        if (add){
            sector_points.push(point)
            sector_face_data.set(point, intersections[i])
            // add points
        }
    }

    // turn points into the sector's polygon
    let sector_polygon = new Polygon(convexHull(sector_points))

    let spoke_data = []

    let line_id_to_spoke_id= (point_id,line_id) => {
        // returns spoke id, and if the spoke-part is the front
        return (line_id < 2)?(point_id == 1?p1_enter:p2_enter):(point_id == 1?p1_exit:p2_exit), (line_id < 2)
    }

    for (let i = 0; i < sector_polygon.points.length; i++){
        let data = sector_face_data.get(sector_polygon.points[i])
        let next_data = sector_face_data.get(sector_polygon.points[(i+1)%sector_polygon.points.length])
        let p1 = null
        let p1_side = false
        // this means its the point itself, so need next data
        if (!data.p1){
            // if the first point is the point, the next one's p1 should be "valid"
            p1,p1_side = line_id_to_spoke_id(1,next_data.p1)
        }else if (data.p1 >= 0){
            p1,p1_side = line_id_to_spoke_id(1,data.p1)
        }
        let p2 = null
        let p2_side = false
        if (!data.p2){
            // if the first point is the point, the next one's p1 should be "valid"
            p2,p2_side = line_id_to_spoke_id(2,next_data.p2)
        }else if (data.p2 >= 0){
            p2,p2_side = line_id_to_spoke_id(2,data.p2)
        }
        spoke_data.push( {
            p1_spoke: p1, p2_spoke:p2,
            p1_front: p1_side, p2_front: p2_side
        })
    }

    return new Sector(sector_polygon,h_p1.point,h_p2.point,p1_enter,p1_exit,p2_enter,p2_exit,spoke_data)

}

// for 
function calculateBisector(boundary,h_p1,h_p2){
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

    let mid_segment = new Segment(h_p1.point,h_p2.point)

    let x_diff = h_p1.point.x - h_p2.point.x

    let y_diff = h_p1.point.y - h_p2.point.y

    let points = boundary.points

    let enter = -1
    let exit = -1

    for (let i = 0; i < points.length; i++){
        let i2 = (i+1) % points.length
        let s = new Segment(points[i],points[i2])
        let intersection = intersectSegments(mid_segment,s)
        let ix_diff = intersection.x - h_p1.point.x
        let iy_diff = intersection.y - h_p1.point.y
        if (intersection){
            // intersect before or after
            if (Math.sign(x_diff) === Math.sign(ix_diff) && Math.sign(y_diff) === Math.sign(iy_diff)){
                enter = i
            }else{
                exit = i
            }
        }
    }

    let sector = calculateSector(boundary,h_p1,h_p2,enter,exit,exit,enter)

    let conic_segments = traverse_bisector(boundary,h_p1,h_p2,sector,null)

    return new Bisector(conic_segments)
}

function traverse_bisector(boundary,h_p1,h_p2,sector,start_point){

    let conic = bisectorConicFromSector(boundary,sector)

    let p_conic = parameterizeConic(conic)

    let start_t, start_segment, end_t, end_segment = getConicParameterBoundsInPolygon(p_conic,sector.polygon)

    let start_data1 = sector.spoke_data[start_segment]
    let start_data2 = sector.spoke_data[(start_segment+1) % sector.spoke_data.length]

    let end_data1 = sector.spoke_data[end_segment]
    let end_data2 = sector.spoke_data[(end_segment+1) % sector.spoke_data.length]


    let data = [
        [start_data1,start_data2],
        [end_data1,end_data2]
    ]

    // parameters for the neighboring sector that was intersected with
    // hit_end is for a boundary hit
    let sector_hit = [
        {
            p1_enter: sector.p1_enter,
            p1_exit: sector.p1_exit,
            p2_enter: sector.p2_enter,
            p2_exit: sector.p2_exit,
            hit_end: false
        },
        {
            p1_enter: sector.p1_enter,
            p1_exit: sector.p1_exit,
            p2_enter: sector.p2_enter,
            p2_exit: sector.p2_exit,
            hit_end: false
        }
    ]
    
    for(let i = 0; i < data.length; i++){
        let hit_data = sector_hit[i]

        let data1 = data[i][0]
        let data2 = data[i][1]
        
        let point_num = data1.p1_spoke == data2.p1_spoke?"1":"2"
        let spoke1 = data1["p" + point_num + "_spoke"]
        let front1 = data1["p" + point_num + "_front"]
        let change = front1?"_exit":"_enter"

        // what this is doing is checking which spoke was hit,
        // whether it was the front or back,
        // and determines which parameters to change to what when passing over
        if (spoke1){
            if (hit_data[change] == data1.p1_spoke){
                hit_data[change] = ((sector.spoke_data.length + spoke1-1)%sector.spoke_data.length)
            }else{
                hit_data[change] = spoke1
            }
        }else{
            hit_data.hit_end = true
        }
    }
    
    let conic_segments = []
    let conic_segment = null
    // this is true if this isn't the first call

    let bound = calculateConicSegmentBounds(parameterized_conic,start_t,end_t)

    let start_num = 0
    let end_num = 1

    let start_p = p_conic.getPointFromT(start_t)
    let end_p = p_conic.getPointFromT(end_t)

    if (start_point){
        if (euclideanDistance(start_point,start_p) > euclideanDistance(start_point,end_p)){
            start_num = 1
            end_num = 0
        }
        // if the end hits a wall, return 
        
    }

    let c_s = new ConicSegment(p_conic,start_num===0?start_t:end_t,start_num===0?end_t:start_t,bound)
    
    if (sector_hit[end_num].hit_end){
            return [c_s]
    }

    // calculate the neighboring sectors
    let start_data = sector_hit[start_num]
    let start_sector = calculateSector(boundary,h_p1,h_p2,start_data.p1_enter,start_data.p1_exit,start_data.p2_enter,start_data.p2_exit)
    let end_data = sector_hit[end_num]
    let end_sector = calculateSector(boundary,h_p1,h_p2,end_data.p1_enter,end_data.p1_exit,end_data.p2_enter,end_data.p2_exit)

    // get recursivly calculated segments
    let end_segments = traverse_bisector(boundary,h_p1,h_p2,end_sector,p_conic.getPointFromT(c_s.end))

    if(!start_point){
        // first call
        // need to get other side too!
        let start_segments = traverse_bisector(boundary,h_p1,h_p2,start_sector,p_conic.getPointFromT(c_s.start))
        
        start_segments.push(c_s)
        // end will be backwards?
        end_segments = end_segments.reverse()
        return start_segments.concat(end_segments)
    }
        
    return [c_s].concat(end_segments)
}


class HilbertSpace {
    constructor(boundary, hilbert_points,hilbert_pairs){
        this.boundary = boundary
        this.hilbert_points = hilbert_points
        this.hilbert_pairs = hilbert_pairs
    }
}

export {HilbertPoint, 
        HilbertPair, 
        HilbertSpace}
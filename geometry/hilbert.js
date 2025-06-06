import { Segment, segment } from "./primitives"
import { intersectSegments } from "./utils"

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


// dont need???????
function calculateSectors(boundary,h_p1,h_p2){
// get E1-4 params of first sector, 
// when crossing a boundary
// determine which sectors form the edges
}

// for 
function calculateBisector(boundary,h_p1,h_p2,sectors){
    // The hamming distance between two sector's edge paramterizations
    // is equal to the number of spokes needed to cross to get between sectors
    // ei neighbors are a distance of 1
    // which edge changes is based on whose spoke is crossed
    // 
    // 
    // for each sector
    // check if 
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
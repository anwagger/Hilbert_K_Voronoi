import { segment } from "./primitives"

class hilbert_point {
    constructor(point,spokes){
        this.point = point
        this.spokes = spokes
    }
}

function calculate_spokes(boundary,point){
    // line segments from boundary points to point, 
    // then check if a vertex-point line intersects a segment of the boundary validly
    const points = boundary.points
    let spokes = []
    // each segment of the boundary
    for (let i = 0; i < n_points; i++){
        let partial_spoke = new segment(points[i],point)

        // for each segment not adjacent to the vertex
        for (let j = 1; j < n_points-1; j++){
            let i2 = (i + j)%n_points
            let boundary_segment = new segment(points[i2],points[(i2+1)%n_points])
            // check for valid intersection , 
            // add proper spoke if so, then break!
        }
    }
    return spokes
}

class hilbert_pair {
    constructor(sectors,bisector){
        this.sectors = sectors;
        this.bisector = bisector;
    }
}

// for 
function calculate_bisector(h_p1,h_p2,sectors){
    // The hamming distance between two sector's edge paramterizations
    // is equal to the number of spokes needed to cross to get between sectors
    // ei neighbors are a distance of 1
    // which edge changes is based on whose spoke is crossed
    // 
    // 
    // for each sector
    // check if 
}

class hilbert_space {
    constructor(boundary, hilbert_points,hilbert_pairs){
        this.boundary = boundary
        this.hilbert_points = hilbert_points
        this.hilbert_pairs = hilbert_pairs
    }
}

export {hilbert_point, hilbert_pair, hilbert_space}
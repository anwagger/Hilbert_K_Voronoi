class Bisector {
    constructor(conic_segments){
        this.conic_segments = conic_segments
    }
}

class BisectorSegment {
    constructor(bisector,start,end,bound){
        this.bisector = bisector
        this.start = start
        this.end = end
        this.bound = bound
    }
}

function calculateBisectorSegmentBounds(bisector,start,end){
    let conic_segments = bisector.conic_segments
    // find the extremes of each of the bounds of the conic_segments
    
    let bound = new Bound(Infinity,-Infinity,-Infinity,Infinity)

    for (let i = Math.floor(start); i < Math.ceil(end); i++){
        let conic_segment = conic_segments[i];
        
        if (i == Math.floor(start)) {
            let start_point; // calculate end point in first conic segment
            segment_bound = new Bound(start_point.y,start_point.y,start_point.x,start_point.x)
        }else if (i == Math.ceil(end) - 1){
            let end_point; // calculate end point in first conic segment
            segment_bound = new Bound(end_point.y,end_point.y,end_point.x,end_point.x)
        }else{
            segment_bound = conic_segment.bound
        }

        bound.top = Math.max(bound.top,segment_bound.top)
        bound.bottom = Math.min(bound.bottom,segment_bound.bottom)
        bound.left = Math.min(bound.left,segment_bound.left)
        bound.right = Math.max(bound.right,segment_bound.right)
    }
    return bound
}

export {Bisector, BisectorSegment}
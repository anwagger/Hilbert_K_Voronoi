class bisector {
    constructor(conic_segments){
        this.conic_segments = conic_segments
    }
}

class bisector_segment {
    constructor(bisector,start,end,bound){
        this.bisector = bisector
        this.start = start
        this.end = end
        this.bound = bound
    }
}

export {bisector, bisector_segment}
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

export {Bisector, BisectorSegment}
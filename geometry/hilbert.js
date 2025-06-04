class hilbert_point {
    constructor(point,spokes){
        this.point = point
        this.spokes = spokes
    }
}

class hilbert_pair {
    constructor(sectors,bisector){
        this.sectors = sectors;
        this.bisector = bisector;
    }
}

class hilbert_space {
    constructor(boundary, hilbert_points,hilbert_pairs){
        this.boundary = boundary
        this.hilbert_points = hilbert_points
        this.hilbert_pairs = hilbert_pairs
    }
}
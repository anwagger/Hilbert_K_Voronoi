class VoronoiCell {
    constructor(bisector_segments, bound){
        this.bisector_segments = bisector_segments
        this.bound = bound
    }
}

function calculateVoronoiCellBounds(voronoi_cell){
    let bisectors = voronoi_cell.bisector_segments
    // find the extremes of each of the bounds of the conic_segments
    return bisectors.reduce(
        (bisector_segment, current_bound) => {
            const segment_bound = bisector_segment.bound
            current_bound.top = Math.max(current_bound.top,segment_bound.top)
            current_bound.bottom = Math.min(current_bound.bottom,segment_bound.bottom)
            current_bound.left = Math.min(current_bound.left,segment_bound.left)
            current_bound.right = Math.max(current_bound.right,segment_bound.right)
        },
        new Bound(Infinity,-Infinity,-Infinity,Infinity),
    );
}


class VoronoiDiagram {
    constructor(cells,degree,partition_tree){
        this.cells = cells
        this.degree = degree
        this.partition_tree = partition_tree
    }
}

export {VoronoiCell, 
        VoronoiDiagram}
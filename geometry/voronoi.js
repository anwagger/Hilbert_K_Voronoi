class VoronoiCell {
    constructor(bisectors, bound){
        this.bisectors = bisectors
        this.bound = bound
    }
}

class VoronoiDiagram {
    constructor(cells,degree,partition_tree){
        this.cells = cells
        this.degree = degree
        this.partition_tree = partition_tree
    }
}

export {VoronoiCell, VoronoiDiagram}
class voronoi_cell {
    constructor(bisectors, bound){
        this.bisectors = bisectors
        this.bound = bound
    }
}

class voronoi_diagram {
    constructor(cells,degree,partition_tree){
        this.cells = cells
        this.degree = degree
        this.partition_tree = partition_tree
    }
}

export {voronoi_cell, voronoi_diagram}
import { DrawableSegment } from "../drawing/drawable.js";
import { BisectorSegment, calculateBisectorSegmentBounds, calculateCircumcenter, findPointsOnEitherSideOfBisector, intersectBisectors } from "./bisectors.js";
import { calculateBisector, calculateHilbertPoint } from "./hilbert.js";
import { PartitionTree } from "./partition_tree.js";
import { Bound, Point, Polygon, Segment } from "./primitives.js";
import { pointInPolygon, 
    pointOnPolygon, 
    intersectSegmentsAsLines, 
    pointSegDistance, 
    euclideanDistance, 
    hilbertMetric, 
    matrix, 
    matrix3D,
    calculateHilbertDistance,
    pushOrCreateInObject,
    convexHull,
    thompsonMetric,
    computeBoundingBox,
    manhattanMetric,
    weakFunk,
    randomMetric,
    quasiMetric,
    getDistanceFromMetric,
    boundOfBounds,
    centroid,
    isZero,
    inBound,
    hilbertCentroid,
    hilbertFrechetMean} from "./utils.js";

class Pair {
  constructor(i, d) {
    this.index = i;
    this.dist = d;
  }
}

export class VoronoiCell {
    constructor(contained_sites,bisector_segments,bisector_data,boundary_points, bound){
        this.bisector_segments = bisector_segments
        this.bound = bound
        this.contained_sites = contained_sites
        this.bisector_data = bisector_data
        this.boundary_points = boundary_points
    }

    contains(boundary,sites,point){
        if(!inBound(point,this.bound)){
            return false
        }
        for(let i = 0; i < this.bisector_data.length; i++){
            let data = this.bisector_data[i]
            let dist0 = calculateHilbertDistance(boundary,point,sites[data[0]])
            let dist1 = calculateHilbertDistance(boundary,point,sites[data[1]])
            // data[0] not in cell
            // if
            if(isZero(dist0 - dist1)){
            
            }else if((this.contained_sites & (2**data[0])) === 0){
                if(dist0 < dist1){
                   return false 
                }
            }else{
                if(dist1 < dist0){
                   return false 
                }
            }
        }
        return true
    }
}

export function calculateVoronoiCellBounds(bisectors,boundary_points){
    // find the extremes of each of the bounds of the conic_segments

    
    let bisector_bound = bisectors.reduce(
        (current_bound,bisector_segment) => {
            const segment_bound = bisector_segment.bound
            current_bound.top = Math.max(current_bound.top,segment_bound.top)
            current_bound.bottom = Math.min(current_bound.bottom,segment_bound.bottom)
            current_bound.left = Math.min(current_bound.left,segment_bound.left)
            current_bound.right = Math.max(current_bound.right,segment_bound.right)
            return current_bound
        },
        new Bound(-Infinity,Infinity,Infinity,-Infinity),
    );

    let vertices = []
    if(boundary_points){
        for(let i = 0; i < boundary_points.length; i++){
            vertices.push(boundary_points[i])
        }
    }
    if(vertices.length > 0){
        let boundary_segment = convexHull(vertices)
        let polygon_bound  = computeBoundingBox(new Polygon(boundary_segment))
        return boundOfBounds(bisector_bound,polygon_bound)

    }else{
        return bisector_bound
    }
}

export function calculateVoronoiCellBoundary(boundary, sites, bisector_segments,bisector_data,contained_sites,debug=false){
    
    if(debug){
        console.log("DEBUG",bisector_segments,bisector_data)
    }
    let potential_points = []
    for(let b = 0; b < bisector_segments.length; b++){
        let b_s = bisector_segments[b]
        let bisector = b_s.bisector
        
        let data = bisector_data[b]
        let start_p = bisector.getPointFromT(0)
        let end_p = bisector.getPointFromT(bisector.conic_segments.length)
        let side_points = findPointsOnEitherSideOfBisector(boundary,bisector)
        if(side_points){
            let pos_point_order = []
            //let neg_point_order = []
            for(let i = 0; i < sites.length; i++){
                pos_point_order.push(i)
                //neg_point_order.push(i)
            }
            pos_point_order.sort((a,b) => {
                return calculateHilbertDistance(boundary,side_points[0],sites[a]) - calculateHilbertDistance(boundary,side_points[0],sites[b])
            })
            /**
            neg_point_order.sort((a,b) => {
                return calculateHilbertDistance(boundary,side_points[1],sites[a]) - calculateHilbertDistance(boundary,side_points[1],sites[b])
            })
            */
            if(debug){
                console.log("CELL",contained_sites)
                console.log("BISECTOR",data)
                console.log("POINT ORDER",pos_point_order)
            }
            let order = 1
            let done = false
            // if the first of the two sites is not in the cell, order is negative
            for(let i = 0; i < sites.length; i++){
                for(let j = 0; j < data.length; j++){
                    if(pos_point_order[i] === data[j]){
                        if(debug){
                            console.log("CHECK",pos_point_order[i],contained_sites & (2**pos_point_order[i]))
                        }
                        if((contained_sites & (2**pos_point_order[i])) === 0){
                            order = -1
                            done = true
                            break;
                        }else{
                            done = true
                            break;
                        }
                    }
                }
                if(done){
                    break;
                }
            }
            if(debug){
                console.log("ORDER",order)
            }
            let start_t = boundary.getTOfPoint(start_p)
            if(isZero(start_t%1)){
                start_t = Math.sign(start_t)*Math.floor(Math.abs(start_t))
            }
            if(isZero((start_t%1)-1)){
                start_t = Math.sign(start_t)*Math.ceil(Math.abs(start_t))
            }
            let end_t = boundary.getTOfPoint(end_p)
            if(isZero(end_t%1)){
                end_t = Math.sign(end_t)*Math.floor(Math.abs(end_t))
            }
            if(isZero((end_t%1)-1)){
                end_t = Math.sign(end_t)*Math.ceil(Math.abs(end_t))
            }

            let first = ((order === 1? Math.ceil(start_t): Math.floor(start_t) ) + boundary.points.length)% boundary.points.length
            let last = ((order === 1? Math.floor(end_t): Math.ceil(end_t)) + boundary.points.length)% boundary.points.length
            let boundary_points = []
            for(let i = first; i != last; i = (i + order + boundary.points.length) %(boundary.points.length)){
                if(i != start_t){
                    boundary_points.push(i)
                }
                
            }
            if(first != last && last != end_t){
                boundary_points.push(last)
            }
            potential_points.push(boundary_points)
            if(debug){
                console.log("BS",start_t,end_t,first,last,boundary_points)
            }
        }
    }
    let point_frequency = {}
    for(let i = 0; i < potential_points.length; i++){
        for(let j = 0; j < potential_points[i].length; j++){
            let index = potential_points[i][j]
            if(!(index in point_frequency)){
                point_frequency[index] = 0
            }
            point_frequency[index] += 1
        }
    }
    let included_polygon_points = []
    for(let index in point_frequency){
        if(point_frequency[index] ==  potential_points.length){
            included_polygon_points.push(boundary.points[index])
        }
    }
    if(debug){
        console.log("INC",point_frequency,included_polygon_points)
    }
    return included_polygon_points
}


export class VoronoiDiagram {
    constructor(boundary, cells = [],degree,partition_tree = []){
        this.boundary = boundary
        this.cells = cells
        this.degree = degree
        this.partition_tree = partition_tree
        this.metric = "hilbert"; // might make this an enum later idk
        this.mode = "k"; // can be "kth" or "k"
        this.p = 2; // for minkowski, defaults to euclidean
    }

    // just works for hilbert rn, needs cases for when metric isnt hilbert
    bruteForce(canvas) {

        let grid = matrix(1000,1000,[]); // defaults the grid to be null
        const height = 1000; // should be determined by absolute boundary/ resolution at some point
        const width = 1000;
        const sites = canvas.sites;
        const points = this.boundary.points;
        const sensitivity = 1e-3;

        let polygon_bound = computeBoundingBox(this.boundary)

        let low_x = Math.floor(Math.max(0,polygon_bound.left))
        let low_y = Math.floor(Math.max(0,polygon_bound.bottom))
        let high_x = Math.ceil(Math.min(width,polygon_bound.right))
        let high_y = Math.ceil(Math.max(height,polygon_bound.top))

        for (let x = low_x; x < high_x; x++) {
            for (let y = low_y; y < high_y; y++) {
                let pairs = [];
                const point = new Point(x,y);
                if(pointInPolygon(point,this.boundary) && !pointOnPolygon(point,this.boundary)) {
                    for (let s = 0; s < sites.length; s++) {
                        const site = sites[s];
                        const p = site.drawable_point.point; // this is the sites point idk what else to call it
                        if (p.x === x && p.y === y) {
                            pairs.push(new Pair(s, 0));
                            continue;
                        }
                        const mid = new Segment(p,point);
                        const ints = [];
                        let count = 0;
                        for (let p = 0; p < points.length; p++) {
                            const p2 = (p + 1) % points.length;
                            const seg = new Segment(points[p], points[p2]);
                            const i = intersectSegmentsAsLines(mid, seg);
                            if (i !== null) {
                            //println("GOOD",mid.start,mid.end,i,seg.start,seg.end,pointSegDistance(i,seg));
                                if (pointSegDistance(i, seg) <= sensitivity) {
                                    if (count > 0) {
                                        if (euclideanDistance(i, ints[0]) <= sensitivity) {
                                            // replace point as to not have
                                            count--;
                                        }
                                    }

                                    ints[count] = i;
                                    count++;
                                }
                            }

                            if (count > 1) break;
                        }

                        if (count === 2) {
                            if (count == 2) {
                                const first = euclideanDistance(p, ints[0]) < euclideanDistance(point, ints[0])? ints[0]:ints[1];
                                const last = euclideanDistance(p, ints[0]) < euclideanDistance(point, ints[0])? ints[1]:ints[0];
                                let distance = getDistanceFromMetric(this.metric,p,point,first,last,this.p);
                                pairs.push(new Pair(s, distance));
                            }
                        }
                    }
                }
                
                pairs.sort((a, b) => a.dist - b.dist);
                grid[x][y] = pairs;            
            }
        }
        return grid;
    }

    hilbertDelaunay(sites) {
        let segs = [];
        let centroids = [];

        let boundaries = {}

        for (let i = 0; i < this.cells.length; i++) {
            let c = this.cells[i]
            let contained = c.contained_sites
            let point_is = []
            while(contained > 0){
                let i = Math.floor(Math.log2(contained))
                contained -= 2**i
                point_is.push(i)
            }
            let points = []
            for(let i = 0; i < point_is.length; i++){
                points.push(sites[point_is[i]].drawable_point.point)
            }
            //centroids.push(centroid(points))
            if(points.length > 0){
                centroids.push(hilbertFrechetMean(this.boundary,points,5000))
            }
            
            
            for (let b in c.bisector_data) {
                let data = c.bisector_data[b]
                let b_s = c.bisector_segments[b]
                let key = [data[0],data[1],b_s.start,b_s.end]
                if(!boundaries[key]){
                    boundaries[key] = []
                }
                boundaries[key].push(i)
                
            }
        }
        for(let bs in boundaries){
            let bisectorCells = boundaries[bs]
            if(bisectorCells.length == 2){
                let p1 = centroids[bisectorCells[0]]
                let p2 = centroids[bisectorCells[1]]
                segs.push(new DrawableSegment(new Segment(p1,p2)))
            }
        }
        
        return segs;
    }

    
}


export function createVoronoiFromCanvas(canvas, first_degree = false){
    let boundary = canvas.boundary.polygon
    let points = []
    canvas.sites.forEach((site,i) => {
        points.push(site.drawable_point.point)
    })
    if (first_degree) {
        return firstDegreeHilbertVoronoi(boundary,points);
    } else {
        return n3lognVoronoi(boundary,points)
    }
}

export function n3lognVoronoi(boundary,points){

    const n = points.length

    console.time("spokes")
    // calculate spokes
    let h_points = []
    for(let i = 0; i < n; i++){
        h_points.push(calculateHilbertPoint(boundary,points[i]))
    }

    console.timeEnd("spokes")


    console.time("bisectors")
    // calculate bisectors
    let bisectors = matrix(n,n,null)
    for(let i = 0; i < n; i++){
        for(let j = i+1; j < n; j++){
            let bisector = calculateBisector(boundary,h_points[i],h_points[j])
            bisectors[i][j] = bisector
            bisectors[j][i] = bisector
        }
    }
    console.timeEnd("bisectors")

    //console.log("BISECTORS:",bisectors)

    console.time("point order")
    // get ordering of other points
    let point_orders = []
    let distances = matrix(n,n,0)
    for(let i = 0; i < n; i++){
        point_orders.push([])
        for(let j = 0; j < n; j++){
            if(j != i){
                const dist = calculateHilbertDistance(boundary,h_points[i].point,h_points[j].point)
                distances[i][j] = dist
                distances[j][i] = dist
                point_orders[i].push(j)
            }
        }
        // sort orderings of points
        const sort_orders = (a,b) => distances[i][a] - distances[i][b]
        point_orders[i].sort(sort_orders)
    }
    console.timeEnd("point order")

    //console.log("POINT ORDERS:",point_orders)
    
    console.time("circumcenters")
    // calculate circumcenters
    let circumcenter_data = matrix3D(n,n,n,false)
    let circumcenters = []
    for(let i = 0; i < n; i++){
        for(let j = i+1; j < n; j++){
            for(let k = j+1; k < n; k++){
                let c = calculateCircumcenter(boundary, bisectors[i][j],bisectors[j][k],bisectors[i][k])
                if(c){
                    circumcenters.push(c)
                    let data = {
                        i:i,
                        j:j,
                        k:k,
                        point: c,
                        [i]: {},
                        [j]:{},
                        [k]:{},
                    }
                    // calculate t's and orientation
                    let ps = [i,j,k]
                    for(let p = 0; p < ps.length; p++){
                        let i1 = ps[p]
                        for(let q = p+1; q < ps.length; q++){
                            let i2 = ps[q]
                            // calculate thrid point
                            let r = 0
                            while(p === r || q === r) r+=1;
                            let i3 = ps[r]
                            data[i1][i2] = {
                                t: bisectors[i1][i2].getTOfPoint(c),
                            }

                            if (!data[i1][i2].t){
                                console.log("NO T GOTTEN!",c,bisectors[i1][i2])
                                console.log("CIRC T",i1,i2,data[i1][i2].t)
                            }
                            
                            
                            let mid_t_start = data[i1][i2].t/2
                            let start_p = bisectors[i1][i2].getPointFromT(mid_t_start)
                            let less_dist = calculateHilbertDistance(boundary,start_p,points[i3])
                            
                            let mid_t_end = data[i1][i2].t + (bisectors[i1][i2].conic_segments.length-data[i1][i2].t )/2
                            let end_p = bisectors[i1][i2].getPointFromT(mid_t_end)
                            let more_dist = calculateHilbertDistance(boundary,end_p,points[i3]) 

                            /**
                            console.log("SANITY CHECK:",less_dist < more_dist,
                                calculateHilbertDistance(boundary,bisectors[i1][i2].getPointFromT(0),points[i3])
                                <
                                calculateHilbertDistance(boundary,bisectors[i1][i2].getPointFromT(bisectors[i1][i2].conic_segments.length),points[i3]) 
                            )
                            */

                            // higher degree is the side where the third point is closer
                            data[i1][i2].less = less_dist < more_dist?1:-1
                            data[i1][i2].more = less_dist < more_dist?-1:1
                            data[i2][i1] = data[i1][i2]
                        }
                    }


                    // set data
                    circumcenter_data[i][j][k] = data
                    circumcenter_data[i][k][j] = data
                    circumcenter_data[j][i][k] = data
                    circumcenter_data[j][k][i] = data
                    circumcenter_data[k][i][j] = data
                    circumcenter_data[k][j][i] = data
                }else{
                    //console.log("NO CIRCUMCENTER",i,j,k)
                }
            }
        }
    }
    console.timeEnd("circumcenters")

    //console.log("CIRCUMCENTERS:",circumcenter_data)

    console.time("bisector classification")
    // classify each segment of the bisectors
    let bisector_classifications = matrix(n,n,false)
    // this can be made a self-balancing binary search tree to guarentee lg(n)
    let voronoi_cell_map = {};
    for(let i = 0; i < n; i++){
        for(let j = i+1; j < n; j++){
            // order circumcenters
            let ordered_circumcenters = []
            for(let k = 0; k < n; k++){
                if(k != i && k != j){
                    if (circumcenter_data[i][j][k]){
                        ordered_circumcenters.push(circumcenter_data[i][j][k])
                    }
                }
            }
            const sort_centers = (a,b) => a[i][j].t - b[i][j].t
            ordered_circumcenters.sort(sort_centers)

            bisector_classifications[i][j] = []
            bisector_classifications[j][i] = bisector_classifications[i][j]
            // find degree of first segment
            let mid_t = ordered_circumcenters.length > 0?(ordered_circumcenters[0][i][j].t/2):bisectors[i][j].conic_segments.length/2
            let anchor = bisectors[i][j].getPointFromT(mid_t)
            let ordered_points = []
            for(let p = 0; p < n; p++){
                ordered_points.push(p)
            }
            ordered_points.sort((a,b) => {
                return calculateHilbertDistance(boundary,anchor,points[a]) - calculateHilbertDistance(boundary,anchor,points[b])
            })
            // calculate degree 
            let degree = 1
            // bitstring of which points are in the cell
            let hash = 0
            //console.log("making initial degree for",i,j,"orders:",ordered_points,"first circ:",ordered_circumcenters[0])

            for(let p = 0; p < ordered_points.length; p++){
                if(ordered_points[p] != i && ordered_points[p] != j){
                    degree += 1
                    hash += 2**ordered_points[p]
                }else{
                    break;
                }
            }
            //console.log("INITIAL HASH:",hash,"AND DEGREE",degree)            
            // put bisector segment in cell map with the hash
            let value = {
                    i:i,
                    j:j,
                    start: 0,
                    end: ordered_circumcenters.length===0?bisectors[i][j].conic_segments.length:ordered_circumcenters[0][i][j].t,
                    degree: degree
                }
            // in two cells, one with i and not j, and one with j and not i
            pushOrCreateInObject(voronoi_cell_map,hash + 2**i,value)
            pushOrCreateInObject(voronoi_cell_map,hash + 2**j,value)
            // put classification
            bisector_classifications[i][j].push(degree)
            // for each subsequent segment, change the degree by the circumcenter classification
            for(let c = 0; c < ordered_circumcenters.length; c++){
                let data = ordered_circumcenters[c]

                // get other point in the circumcenter
                let ps = [data.i,data.j,data.k]
                let r = 0
                while(i === ps[r] || j === ps[r]) r+= 1
                let k = ps[r]

                // if going up a degree, add the third point to the cells, otherwise, remove it 
                //console.log("BISECTOR",i,j,"CROSSING",k,"CHANGE:",data[i][j].more)


                let hash_contains = (hash & (2**k)) != 0
                let degree_change = hash_contains?-1:1
                //console.log("PREDICTED DEGREE CHANGE:",degree_change,"calculated degree change: ",data[i][j].more)
                hash += degree_change * (2**k)
                
                degree = degree + degree_change
                //console.log("NEW HASH:",hash,"AND DEGREE:",degree)
                bisector_classifications[i][j].push(degree)
                // put bisector segment in cell map with the hash
                let value = {
                    i:i,
                    j:j,
                    start: ordered_circumcenters[c][i][j].t,
                    end: c=== ordered_circumcenters.length-1?bisectors[i][j].conic_segments.length:ordered_circumcenters[c+1][i][j].t,
                    degree: degree
                }
                // in two cells, one with i and not j, and one with j and not i
                pushOrCreateInObject(voronoi_cell_map,hash + 2**i,value)
                pushOrCreateInObject(voronoi_cell_map,hash + 2**j,value)
            }
        }
    }
    console.timeEnd("bisector classification")

    //console.log("CLASSIFICATION",bisector_classifications)
    //console.log("CELL MAP",voronoi_cell_map)

    console.time("voronoi creation")
    // list of voronoi cells for each degree
    let voronoi_lists = []
    for(let i = 0; i < n; i++){
        voronoi_lists.push([])
    }
    // create the cells from the map
    for(let v in voronoi_cell_map){
        let bisector_segments_data = voronoi_cell_map[v]
        let degree = bisector_segments_data[0].degree
        let voronoi_cell = new VoronoiCell(v,[],[],[],null)
        for(let d = 0; d < bisector_segments_data.length; d++){
            let i = bisector_segments_data[d].i
            let j = bisector_segments_data[d].j
            let start = bisector_segments_data[d].start
            let end = bisector_segments_data[d].end
            let bound = calculateBisectorSegmentBounds(bisectors[i][j],start,end)
            let bisector_segment = new BisectorSegment(bisectors[i][j],start,end,bound)
            voronoi_cell.bisector_segments.push(bisector_segment)
            voronoi_cell.bisector_data.push([i,j])
        }
        voronoi_cell.boundary_points = calculateVoronoiCellBoundary(boundary,points,voronoi_cell.bisector_segments,voronoi_cell.bisector_data,voronoi_cell.contained_sites)
        voronoi_cell.bound = calculateVoronoiCellBounds(voronoi_cell.bisector_segments,voronoi_cell.boundary_points)
        voronoi_lists[degree-1].push(voronoi_cell)
    }

    //console.log("VORONOI CELLS",voronoi_lists)

    // combine the cells into diagrams
    let voronois = []
    for(let d = 1; d <= n; d++){
        let cells = voronoi_lists[d-1]
        if(!cells){
            cells = []
        }
        let voronoi = new VoronoiDiagram(boundary,cells,d,null)
        let partition_tree = new PartitionTree(voronoi,boundary)
        //console.log(partition_tree)
        voronoi.partition_tree = partition_tree
        voronois.push(voronoi)
    }
    console.timeEnd("voronoi creation")

    //console.log("VORONOIS",voronois)

    return {voronois: voronois,classification:bisector_classifications,circumcenters:circumcenters}
}

export function firstDegreeHilbertVoronoi(boundary,points) {
    
}
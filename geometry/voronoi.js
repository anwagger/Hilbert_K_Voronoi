import { BisectorSegment, calculateBisectorSegmentBounds, calculateCircumcenter } from "./bisectors.js";
import { calculateBisector, calculateHilbertPoint } from "./hilbert.js";
import { Point, Segment } from "./primitives.js";
import { pointInPolygon, 
    pointOnPolygon, 
    intersectSegmentsAsLines, 
    pointSegDistance, 
    euclideanDistance, 
    hilbertMetric, 
    matrix, 
    matrix3D,
    calculateHilbertDistance,
    pushOrCreateInObject} from "./utils.js";

class Pair {
  constructor(i, d) {
    this.index = i;
    this.dist = d;
  }
}

export class VoronoiCell {
    constructor(contained_sites,bisector_segments, bound){
        this.bisector_segments = bisector_segments
        this.bound = bound
        this.contained_sites = contained_sites
    }
}

export function calculateVoronoiCellBounds(bisectors){
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


export class VoronoiDiagram {
    constructor(boundary, cells = [],degree,partition_tree = []){
        this.boundary = boundary
        this.cells = cells
        this.degree = degree
        this.partition_tree = partition_tree
        this.metric = "hilbert"; // might make this an enum later idk
        this.mode = "kth"; // can be "kth" or "k"
    }

    // just works for hilbert rn, needs cases for when metric isnt hilbert
    bruteForce(canvas) {
        let grid = matrix(1000,1000,[]); // defaults the grid to be null
        const height = 1000; // should be determined by absolute boundary/ resolution at some point
        const width = 1000;
        const sites = canvas.sites;
        const points = this.boundary.points;
        const sensitivity = 1e-3;
        for (let x = 0; x < height; x++) {
            for (let y = 0; y < width; y++) {
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
                                let hilbert = 0;
                                hilbert = hilbertMetric(first, p, point, last);
                                pairs.push(new Pair(s, hilbert));
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

    
}

export function n3lognVoronoi(boundary,points){

    const n = points.length
    // calculate spokes
    let h_points = []
    for(let i = 0; i < n; i++){
        h_points.push(calculateHilbertPoint(boundary,points[i]))
    }


    // calculate bisectors
    let bisectors = matrix(n,n,null)
    for(let i = 0; i < n; i++){
        for(let j = i+1; j < n; j++){
            let bisector = calculateBisector(boundary,h_points[i],h_points[j])
            bisectors[i][j] = bisector
            bisectors[j][i] = bisector
        }
    }

    // get ordering of other points
    point_orders = []
    distances = matrix(n,n,0)
    for(let i = 0; i < n; i++){
        point_orders.push([])
        for(let j = 0; j < n; j++){
            if(j != i){
                const dist = calculateHilbertDistance(boundary,h_points[i].point,h_points[j].point)
                distances[i][j] = dist
                distances[j][i] = dist
                point_orders.push(j)
            }
        }
        // sort orderings of points
        const sort_orders = (a,b) => distances[i][a] - distances[i][b]
        point_orders[i].sort(sort_orders)
    }
    
    // calculate circumcenters
    let circumcenter_data = matrix3D(n,n,n,false)
    for(let i = 0; i < n; i++){
        for(let j = i+1; j < n; j++){
            for(let k = j+1; k < n; k++){
                let c = calculateCircumcenter(bisectors[i][j],bisectors[j][k],bisectors[i][k])
                if(c){
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
                    // higher degree is the side where the third point is closer
                    data[i][j] = {
                        t: bisectors[i][j].getTofPoint(c),
                    }
                    let ij_start_p = bisectors[i][j].getPointFromT(0)
                    let ij_less_dist = calculateHilbertDistance(boundary,ij_start_p,points[k])
                    let ij_end_p = bisectors[i][j].getPointFromT(bisectors[i][j].conic_segments.length)
                    let ij_more_dist = calculateHilbertDistance(boundary,ij_end_p,points[k]) 
                    data[i][j].less = ij_less_dist < ij_more_dist?1:-1
                    data[i][j].more = ij_less_dist < ij_more_dist?-1:1
                    data[j][i] = data[i][j]
                    
                    data[j][k] = {
                        t: bisectors[j][k].getTofPoint(c),
                    }
                    let jk_start_p = bisectors[j][k].getPointFromT(0)
                    let jk_less_dist = calculateHilbertDistance(boundary,jk_start_p,points[i])
                    let jk_end_p = bisectors[j][k].getPointFromT(bisectors[j][k].conic_segments.length)
                    let jk_more_dist = calculateHilbertDistance(boundary,jk_end_p,points[i]) 
                    data[j][k].less = jk_less_dist < jk_more_dist?1:-1
                    data[j][k].more = jk_less_dist < jk_more_dist?-1:1
                    data[k][j] = data[j][k]
                    
                    
                    data[k][i] = {
                        t: bisectors[k][i].getTofPoint(c),
                    }
                    let ki_start_p = bisectors[k][i].getPointFromT(0)
                    let ki_less_dist = calculateHilbertDistance(boundary,ki_start_p,points[j])
                    let ki_end_p = bisectors[k][i].getPointFromT(bisectors[k][i].conic_segments.length)
                    let ki_more_dist = calculateHilbertDistance(boundary,ki_end_p,points[j]) 
                    data[k][i].less = ki_less_dist < ki_more_dist?1:-1
                    data[k][i].more = ki_less_dist < ki_more_dist?-1:1
                    data[i][k] = data[k][i]

                    // set data
                    circumcenter_data[i][j][k] = data
                    circumcenter_data[i][k][j] = data
                    circumcenter_data[j][i][k] = data
                    circumcenter_data[j][k][i] = data
                    circumcenter_data[k][i][j] = data
                    circumcenter_data[k][j][i] = data
                }
            }
        }
    }

    // classify each segment of the bisectors
    let bisector_classifications = matrix(n,n,false)
    // this can be made a self-balancing binary search tree to guarentee lg(n)
    let voronoi_cell_map = {};
    for(let i = 0; i < n; i++){
        for(let j = i+1; j < n; j++){
            // order circumcenters
            let ordered_circumcenters = []
            for(let k = j+1; k < n; k++){
                ordered_circumcenters.push(circumcenter_data[i][j][k])
            }
            const sort_centers = (a,b) => a[i][j].t - b[i][j].t
            ordered_circumcenters.sort(sort_centers)

            bisector_classifications[i][j] = []
            bisector_classifications[j][i] = bisector_classifications[i][j]
            // find degree of first segment
            let anchor = bisectors[i][j].getPointFromT(0)
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
            for(let p = 0; p < n; p++){
                if(ordered_points[p] != i && ordered_points[p] != j){
                    degree += 1
                    hash += 2**ordered_points[p]
                }else{
                    break;
                }
            }
            
            // put bisector segment in cell map with the hash
            let value = {
                    i:i,
                    j:j,
                    start: 0,
                    end: ordered_circumcenters.length===0?bisectors[i][j].conic_segments.length:ordered_circumcenters[0].t,
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
                let k = (data.i === i?
                            (data.j === j?
                                data.k
                            :
                                data.j
                            )
                        :
                            (data.i === j?
                                (data.j === i?
                                    data.k
                                :
                                    data.j
                                )
                            :
                                data.i
                            )
                        )
                // if going up a degree, add the third point to the cells, otherwise, remove it 
                hash += data[i][j].more * (2**k)
                degree = degree + data[i][j].more
                bisector_classifications[i][j].push(degree)
                // put bisector segment in cell map with the hash
                let value = {
                    i:i,
                    j:j,
                    start: ordered_circumcenters[c].t,
                    end: c=== ordered_circumcenters.length-1?bisectors[i][j].conic_segments.length:ordered_circumcenters[c+1].t,
                    degree: degree
                }
                // in two cells, one with i and not j, and one with j and not i
                pushOrCreateInObject(voronoi_cell_map,hash + 2**i,value)
                pushOrCreateInObject(voronoi_cell_map,hash + 2**j,value)
            }
        }
    }

    // list of voronoi cells for each degree
    let voronoi_lists = []
    for(let i = 0; i < n; i++){
        voronoi_lists.push([])
    }
    for(v in voronoi_cell_map){
        let bisector_segments_data = voronoi_cell_map[v]
        let degree = bisector_segments_data[0].degree
        let voronoi_cell = new VoronoiCell(v,[],null)
        for(let d = 0; d < bisector_segments_data.length; d++){
            let i = bisector_segments_data[d].i
            let j = bisector_segments_data[d].j
            let start = bisector_segments_data[d].start
            let end = bisector_segments_data[d].end
            let bound = calculateBisectorSegmentBounds(bisectors[i][j],start,end)
            let bisector_segment = new BisectorSegment(bisectors[i][j],start,end,bound)
            voronoi_cell.bisector_segments.push(bisector_segment)
        }
        voronoi_cell.bound = calculateVoronoiCellBounds(voronoi_cell.bisector_segments)
        voronoi_lists[degree].push(voronoi_cell)
    }

    let voronois = []
    for(let i = 1; i < n; i++){
        // claculate partition tree?
        voronois.push(new VoronoiDiagram(boundary,voronoi_lists[i],i,null))
    }

    return {voronois: voronois,classification:bisector_classifications}
    // put it all together?
}
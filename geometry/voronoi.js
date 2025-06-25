import { Point, Segment } from "./primitives.js";
import { pointInPolygon, pointOnPolygon, matrix } from "./utils.js";

class Pair {
  constructor(i, d) {
    this.index = i;
    this.dist = d;
  }
  
  compareTo(other) {
    if (this.dist < other.dist) {
      return -1;
    } else if (this.dist > other.dist) {
      return 1;
    } else {
      return 0;
    }
  }
}

export class VoronoiCell {
    constructor(bisector_segments, bound){
        this.bisector_segments = bisector_segments
        this.bound = bound
    }
}

export function calculateVoronoiCellBounds(voronoi_cell){
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
        let grid = matrix(1000,1000,null); // defaults the grid to be null
        const height = 1000; // should be determined by absolute boundary/ resolution at some point
        const width = 1000;
        const sites = canvas.sites;
        const points = this.boundary.points;
        for (let x = 0; x < height; x++) {
            for (let y = 0; y < width; y++) {
                let pairs = [];
                const point = new Point(x,y);
                if(pointInPolygon(point,this.boundary) && !pointOnPolygon(point,this.boundary)) {
                    for (let s = 0; s < sites.length; s++) {
                        const site = sites[s];
                        if (site.x === x && site.y === y) {
                            pairs.add(new Pair(s, 0));
                            continue;
                        }
                        const mid = new Segment(site,point);
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
                                const first = euclideanDistance(site, ints[0]) < euclideanDistance(point, ints[0])? ints[0]:ints[1];
                                const last = euclideanDistance(site, ints[0]) < euclideanDistance(point, ints[0])? ints[1]:ints[0];
                                let hilbert = 0;
                                hilbert = hilbertMetric(first, site, point, last);
                                pairs.add(new Pair(s, hilbert));
                            }
                        }
                    }
                }
                
                pairs.sort((a,b) => a.compareTo(b));
                grid[x][y] = pairs;
            }
        }
        return grid;
    }
}
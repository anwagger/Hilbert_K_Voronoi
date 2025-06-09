import { createSegmentsFromPoints } from "./utils";

class Point {
    constructor(x,y){
        this.x = x;
        this.y = y;
    };
}
class Segment {
    constructor(start,end){
        this.start = start;
        this.end = end;
    };
}
class Polygon {
    constructor(points = []) {
        this.points = points;
        this.segments = createSegmentsFromPoints(this.points);
    }

    addPoint(p) {
        this.points.push(p);
        // this.points = convexHull(this.points);
        if (this.points.length > 1) { this.segments = createSegmentsFromVertices(this.points); }
    }

} 

class Bound {
    constructor(top,bottom,left,right){
        this.top = top;
        this.bottom = bottom;
        this.left = left;
        this.right=right;
    }
}

class Spoke {
    constructor(segment,front,back){
        this.segment = segment
        this.front = front // point
        this.back = back // segment from index - index+1
    }
}


class Sector {
    constructor(polygon, p1,p2,p1_enter,p1_exit,p2_enter,p2_exit,edge_spokes){
        this.polygon = polygon
        // points
        this.p1 = p1
        this.p2 = p2
        // numbers indexing
        this.p1_exit = p1_enter
        this.p1_end = p1_exit
        this.p2_exit = p2_enter
        this.p2_end = p2_exit
        /*
            {
                p1_spoke,p2_spoke: number
                p1_front,p2_front: bool: which part of the spoke is it
                }
        */
        this.edge_spokes = edge_spokes
    }
}

export {Point, 
        Segment, 
        Polygon, 
        Bound, 
        Spoke, 
        Sector}
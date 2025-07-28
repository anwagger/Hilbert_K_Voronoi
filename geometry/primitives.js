import { createSegmentsFromPoints,convexHull, pointSegDistance, computeBoundingBox, inBound, isZero, computeBoundingBoxOfSegment } from "./utils.js";
export class Point {
    constructor(x,y){
        this.x = x;
        this.y = y;
    };
}
export class Segment {
    constructor(start,end){
        this.start = start;
        this.end = end;
    };
}
export class Polygon {
    constructor(points = []) {
        this.points = points;
        this.segments = createSegmentsFromPoints(this.points);
    }

    addPoint(p) {
        this.points.push(p);
        this.points = convexHull(this.points);
        if (this.points.length > 1) { 
            this.segments = createSegmentsFromPoints(this.points); 
        }
    }

    includes(p) {
        this.points.forEach((p2) => {
            if (p.x === p2.x && p.y === p2.y) {
                return true;
            }
        })
        return false;
    }

    getTOfPoint(point){
        for(let i = 0; i < this.points.length; i++){
            let bound = computeBoundingBoxOfSegment(new Segment(this.points[i],this.points[(i+1)%this.points.length]))
            if(inBound(point,bound) && isZero(pointSegDistance(point,this.segments[i]))){
                let seg = this.segments[i]
                let dx = seg.end.x - seg.start.x
                if(isZero(dx)){
                    let dy = seg.end.y - seg.start.y
                    return i + ((point.y - seg.start.y)/dy)
                }else{
                    return i + ((point.x - seg.start.x)/dx)
                }
            }
        }
    }

    getPointFromT(t){
        t = t % this.points.length
        let start_i = Math.floor(t)
        let end_i = Math.ceil(t) % this.points.length
        let start_p = this.points[start_i]
        let end_p = this.points[end_i]
        let dx = end_p.x - start_p.x
        let dy = end_p.y - start_p.y

        let percentage = t % 1

        return new Point(start_p.x + dx * percentage,start_p.y + dy * percentage)
    }

} 

export class Bound {
    constructor(top,bottom,left,right){
        this.top = top;
        this.bottom = bottom;
        this.left = left;
        this.right=right;
    }
}
export class Spoke {
    constructor(segment,front,back, point, closest_intersection){
        this.segment = segment
        this.front = front // point
        this.back = back // segment from index - index+1
        this.point = point
    }
}

export class Sector {
    constructor(polygon, p1,p2,p1_enter,p1_exit,p2_enter,p2_exit,edge_spokes){
        this.polygon = polygon
        // points
        this.p1 = p1
        this.p2 = p2
        // numbers indexing
        this.p1_enter = p1_enter
        this.p1_exit = p1_exit
        this.p2_enter = p2_enter
        this.p2_exit = p2_exit
        /*
            {
                p1_spoke,p2_spoke: number
                p1_front,p2_front: bool: which part of the spoke is it
                }
        */
        this.edge_spokes = edge_spokes
    }
}

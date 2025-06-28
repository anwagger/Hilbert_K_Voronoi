import {intersectConicSegments } from "./conics.js"
import { Bound, Point } from "./primitives.js"
import { euclideanDistance, isLeZero, isZero } from "./utils.js"

export class Bisector {
    constructor(conic_segments){
        this.conic_segments = conic_segments
    }

    getPointFromT(t){
        if(t == this.conic_segments.length){
            let c_s = this.conic_segments[this.conic_segments.length-1]
            return c_s.parameterized_conic.getPointFromT(c_s.end)
        }
        let c_s = this.conic_segments[Math.floor(t)]
        let percentage = t - Math.floor(t)
        let range = c_s.getRange()
        return c_s.parameterized_conic.getPointFromT(c_s.start + range * percentage)
    }

    getTofPoint(point){
        let x = point.x
        let y = point.y
        for(let c = 0; c < this.conic_segments.length; c++){
            let c_s = this.conic_segments[c]
            let t = c_s.parameterized_conic.getTOfPoint(point)
            if(t){
                let range = c_s.getRange()
                // suspect ...
                let percentage = 1 - (c_s.start - t)/range
                if(isLeZero(percentage-1) && isLeZero(-percentage)){
                    return c + percentage
                }
            }
        }
    }
}

export class BisectorSegment {
    constructor(bisector,start,end,bound){
        this.bisector = bisector
        this.start = start
        this.end = end
        this.bound = bound
    }
}

export function calculateBisectorSegmentBounds(bisector,start,end){
    let conic_segments = bisector.conic_segments
    // find the extremes of each of the bounds of the conic_segments
    
    let bound = new Bound(Infinity,-Infinity,-Infinity,Infinity)

    for (let i = Math.floor(start); i < Math.ceil(end); i++){
        let conic_segment = conic_segments[i];
        let segment_bound = new Bound(Infinity,-Infinity,-Infinity,Infinity)
        
        if (i == Math.floor(start)) {
            let range = conic_segment.end - conic_segment.start
            let mid_t = conic_segment.start + range * (start % 1)
            let start_point = conic_segment.parameterized_conic.getPointFromT(mid_t); 
            segment_bound = new Bound(start_point.y,start_point.y,start_point.x,start_point.x)
        }else if (i == Math.ceil(end) - 1){
            let range = conic_segment.end - conic_segment.start
            let mid_t = conic_segment.end - range * (1- (start % 1))
            let end_point = conic_segment.parameterized_conic.getPointFromT(mid_t); 
            segment_bound = new Bound(end_point.y,end_point.y,end_point.x,end_point.x)
        }else{
            segment_bound = conic_segment.bound
        }

        bound.top = Math.max(bound.top,segment_bound.top)
        bound.bottom = Math.min(bound.bottom,segment_bound.bottom)
        bound.left = Math.min(bound.left,segment_bound.left)
        bound.right = Math.max(bound.right,segment_bound.right)
    }
    return bound
}

export function intersectBisectors(b1,b2){
    for(let i = 0; i < b1.conic_segments.length; i++){
        for(let j = 0; j < b2.conic_segments.length; j++){
            let intersection = intersectConicSegments(b1.conic_segments[i],b2.conic_segments[j])
            if (intersection){
                return intersection
            }
        }
    }
    return false
}


export function calculateCircumcenter(b1,b2,b3){
    let i12 = intersectBisectors(b1,b2)
    let i23 = intersectBisectors(b2,b3)
    let i13 = intersectBisectors(b1,b3)
    let sensitivity = 1e-2
    if (i12 && i23 && i13){
        let circumcenter = new Point((i12.x + i23.x + i13.x)/3,(i12.y + i23.y + i13.y)/3)
            console.log("CIRC:",i12,i23,i13,circumcenter,(euclideanDistance(i23,i12)**2), 
            (euclideanDistance(i13,i23)**2),
            (euclideanDistance(i12,i13)**2),euclideanDistance(i12,i23)**2 <= sensitivity, 
            euclideanDistance(i13,i23)**2 <= sensitivity, 
            euclideanDistance(i23,i13)**2 <= sensitivity)
        if(
            euclideanDistance(i12,i23)**2 <= sensitivity && 
            euclideanDistance(i13,i23)**2 <= sensitivity && 
            euclideanDistance(i23,i13)**2 <= sensitivity){
                return circumcenter
            }
    }

    
}
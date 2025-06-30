import {calculateConicSegmentBounds, intersectConicSegments } from "./conics.js"
import { Bound, Point } from "./primitives.js"
import { boundOfBounds, euclideanDistance, inBound, isBetween, isLeZero, isZero, pointInPolygon, pointOnPolygon } from "./utils.js"

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
        for(let c = 0; c < this.conic_segments.length; c++){
            let c_s = this.conic_segments[c]
            if(inBound(point,c_s.bound)){
                let t = c_s.parameterized_conic.getTOfPoint(point,true) // force point to be on
                if(t){
                    let range = c_s.getRange()
                    // suspect ...
                    if (t < 0){
                        t += 2*Math.PI
                    }
                    
                    if(range < 0){
                        if (t < c_s.start + range){
                            t += 2*Math.PI
                        }else if (t > c_s.start){
                            t -= 2*Math.PI
                        }
                    }else{
                        if (t > c_s.start + range){
                            t -= 2*Math.PI
                        }else if (t < c_s.start){
                            t += 2*Math.PI
                        }
                    }
                    // t = c_s.start + pct * range
                    let percentage = (t - c_s.start)/range//1 - (t - c_s.start)/range
                    if(isLeZero(percentage-1) && isLeZero(-percentage)){
                        return c + percentage
                    }else{
                        console.log("INVALID PERCENTAGE WHEN GETTING T OF POINT",percentage,t,c_s.start,range)
                    }
                }else{
                    console.log("Bisector Invalid t",t,point,this)
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

    // issue here!
    let bound = new Bound(-Infinity,Infinity,Infinity,-Infinity)

    for (let i = Math.floor(start); i < Math.ceil(end); i++){
        let conic_segment = conic_segments[i];
        let segment_bound = new Bound(-Infinity,Infinity,Infinity,-Infinity)
        
        // issues for sub-single segment bisectors :(
        if (i === Math.floor(start)) {

            let range = conic_segment.getRange()
            let percentage = (start % 1)
            let mid_t = conic_segment.start + range * percentage
            let new_bound = calculateConicSegmentBounds(conic_segment.parameterized_conic,mid_t,conic_segment.end,conic_segment.direction)
            segment_bound = boundOfBounds(segment_bound,new_bound)
        } 
        if (i === Math.ceil(end) - 1){
            let range = conic_segment.getRange()
            let percentage = (end % 1)
            if(end == conic_segments.length){
                percentage = 1
            }
            let mid_t = conic_segment.start + range * percentage
            let new_bound = calculateConicSegmentBounds(conic_segment.parameterized_conic,conic_segment.start,mid_t,conic_segment.direction)
            segment_bound = boundOfBounds(segment_bound,new_bound)
        }
        if(i != Math.floor(start) && i != Math.ceil(end) - 1){
            segment_bound = conic_segment.bound
        }

        bound = boundOfBounds(bound,segment_bound)
    }
    return bound
}

export function intersectBisectors(boundary,b1,b2){
    let intersections = []
    for(let i = 0; i < b1.conic_segments.length; i++){
        for(let j = 0; j < b2.conic_segments.length; j++){
            let intersection = intersectConicSegments(b1.conic_segments[i],b2.conic_segments[j])
            if (intersection){
                // return intersection
                intersections = intersections.concat(intersection) 
            }
        }
    }
    for(let i = 0; i < intersections.length; i++){
        let intersection = intersections[i]
        if(pointInPolygon(intersection,boundary) && !pointOnPolygon(intersection,boundary)){
            return intersection
        }   
    }
    return false
}


export function calculateCircumcenter(boundary,b1,b2,b3){
    let i12 = intersectBisectors(boundary,b1,b2)
    let i23 = intersectBisectors(boundary,b2,b3)
    let i13 = intersectBisectors(boundary,b1,b3)
    let sensitivity = 1e-2
    if (i12 && i23 && i13){
        let circumcenter = new Point((i12.x + i23.x + i13.x)/3,(i12.y + i23.y + i13.y)/3)
        if(
            euclideanDistance(i12,i23)**2 <= sensitivity && 
            euclideanDistance(i13,i23)**2 <= sensitivity && 
            euclideanDistance(i23,i13)**2 <= sensitivity){
                return circumcenter
            }else{
                console.log("TOOOOO FARRR",i12,i23,i13,euclideanDistance(i12,i23)**2, 
            euclideanDistance(i13,i23)**2,
            euclideanDistance(i23,i13)**2)
            }
    }    
}
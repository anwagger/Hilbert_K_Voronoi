import {calculateConicSegmentBounds, intersectConicSegments } from "./conics.js"
import { Bound, Point } from "./primitives.js"
import { boundOfBounds, convexHull, euclideanDistance, inBound, isBetween, isLeZero, isZero, pointInPolygon, pointOnPolygon } from "./utils.js"

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
        console.log("NOTING RETURNED!")
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

        let start_percentage = 0
        let end_percentage = 1
        let range = conic_segment.getRange()


        
        // issues for sub-single segment bisectors :(
        if (i < start) {

            start_percentage = (start % 1)
            
        } 
        if (i > (end-1)){
            end_percentage = (end % 1)
            
        }
        
        let start_t = conic_segment.start + range * start_percentage
        let end_t = conic_segment.start + range * end_percentage

        
        segment_bound = calculateConicSegmentBounds(conic_segment.parameterized_conic,start_t,end_t,conic_segment.direction)

        bound = boundOfBounds(bound,segment_bound)
    }
    return bound
}

export function checkIfBisectorsIntersect(b1,b2){
    let b1_start = b1.getPointFromT(0)
    let b1_end = b1.getPointFromT(b1.conic_segments.length)
    let b2_start = b2.getPointFromT(0)
    let b2_end = b2.getPointFromT(b2.conic_segments.length)

    if(
        isZero(euclideanDistance(b1_start,b2_start)) 
        || 
        isZero(euclideanDistance(b1_start,b2_end))
        ||
        isZero(euclideanDistance(b1_end,b2_start)) 
        || 
        isZero(euclideanDistance(b1_end,b2_end))
    ){
        return 0
    }

    let point_map = new Map()
    point_map.set(b1_start,1)
    point_map.set(b1_end,1)
    point_map.set(b2_start,2)
    point_map.set(b2_end,2)

    let bisector_ends = convexHull([b1_start,b1_end,b2_start,b2_end])
    if(point_map.get(bisector_ends[0]) != point_map.get(bisector_ends[1])){
        return 1
    }else{
        return -1
    }
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
    if (checkIfBisectorsIntersect(b1,b2) === -1){
        return false
    }
    let i12 = intersectBisectors(boundary,b1,b2)
    if (checkIfBisectorsIntersect(b1,b3) === -1){
        return false
    }
    let i13 = intersectBisectors(boundary,b1,b3)
    let sensitivity = 1e-2
    if (i12 && i13){
        let circumcenter = new Point((i12.x + i13.x)/2,(i12.y + i13.y)/2)
        if(
            euclideanDistance(i12,i13)**2 <= sensitivity
        ){
            return circumcenter
        }else{
            console.log("TOOOOO FARRR",i12,i13,euclideanDistance(i12,i13)**2)
        }
    }    
}

export function calculateCircumcenter3(boundary,b1,b2,b3){
    if (checkIfBisectorsIntersect(b1,b2) === -1){
        return false
    }
    let i12 = intersectBisectors(boundary,b1,b2)
    if (checkIfBisectorsIntersect(b2,b3) === -1){
        return false
    }
    let i23 = intersectBisectors(boundary,b2,b3)
    if (checkIfBisectorsIntersect(b2,b3) === -1){
        return false
    }
    let i13 = intersectBisectors(boundary,b1,b3)
    let sensitivity = 1e-2
    //console.log("CALCULATING CIRCUMCENRER!")
    if (i12 && i23 && i13){
        let circumcenter = new Point((i12.x + i23.x + i13.x)/3,(i12.y + i23.y + i13.y)/3)
        if(
            euclideanDistance(i12,i23)**2 <= sensitivity && 
            euclideanDistance(i13,i23)**2 <= sensitivity && 
            euclideanDistance(i12,i13)**2 <= sensitivity){
                return circumcenter
            }else{
                console.log("TOOOOO FARRR",i12,i23,i13,euclideanDistance(i12,i23)**2, 
            euclideanDistance(i13,i23)**2,
            euclideanDistance(i12,i13)**2)
            }
    }    
}
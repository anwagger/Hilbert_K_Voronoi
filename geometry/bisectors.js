import {calculateConicSegmentBounds, intersectConicSegments } from "./conics.js"
import { Bound, Point, Segment } from "./primitives.js"
import { boundOfBounds, convexHull, euclideanDistance, inBound, isBetween, isLeZero, isZero, pointInPolygon, pointOnPolygon } from "./utils.js"

// bisectors are just lists of conic segments
export class Bisector {
    constructor(conic_segments){
        this.conic_segments = conic_segments
    }

    // takes in a t, where t indexes into the conic segments
    // the integer part of t is the number of the conic segment
    // the decimal part is the percentage of the way through each conic segment
    getPointFromT(t){
        // edge case of the very end of the bisector
        if(t == this.conic_segments.length){
            let c_s = this.conic_segments[this.conic_segments.length-1]
            return c_s.parameterized_conic.getPointFromT(c_s.end)
        }
        // get conic segment to check
        let c_s = this.conic_segments[Math.floor(t)]
        // get the relative t for the conic segment
        let percentage = t - Math.floor(t)
        let range = c_s.getRange()
        return c_s.parameterized_conic.getPointFromT(c_s.start + range * percentage)
    }

    // takes in a point and returns the bisector t
    getTOfPoint(point){
        for(let c = 0; c < this.conic_segments.length; c++){
            let c_s = this.conic_segments[c]
            // simple bounds check initially
            if(inBound(point,c_s.bound)){
                // check if the point if valid for the segment
                let t = c_s.parameterized_conic.getTOfPoint(point,true) // force point to be on
                if(t){
                    // convert conic segment t to bisector t
                    let range = c_s.getRange()
                    // puts the t between 0 and 2PI
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
                    // turn the t into a percentage of the way through the conic segment
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
    
    getBoundaryDirection(boundary){
        let start_p = this.getPointFromT(0)
        let end_p = this.getPointFromT(this.conic_segments.length)
        let start_t = boundary.getTOfPoint(start_p)
        let end_t = boundary.getTOfPoint(end_p)
        
    }
}

// A bisector with t bounds put in place
export class BisectorSegment {
    constructor(bisector,start,end,bound){
        this.bisector = bisector
        this.start = start
        this.end = end
        this.bound = bound
    }
}
// get the bounding box for a bisector given t bounds
export function calculateBisectorSegmentBounds(bisector,start,end){
    let conic_segments = bisector.conic_segments
    // find the extremes of each of the bounds of the conic_segments

    let bound = new Bound(-Infinity,Infinity,Infinity,-Infinity)

    for (let i = Math.floor(start); i < Math.ceil(end); i++){
        let conic_segment = conic_segments[i];
        let segment_bound = new Bound(-Infinity,Infinity,Infinity,-Infinity)

        let start_percentage = 0
        let end_percentage = 1
        let range = conic_segment.getRange()

        if (i < start) {

            start_percentage = (start % 1)
            
        } 
        if (i > (end-1)){
            end_percentage = (end % 1)
            
        }

        // get start and end t for each conic segment
        let start_t = conic_segment.start + range * start_percentage
        let end_t = conic_segment.start + range * end_percentage

        
        segment_bound = calculateConicSegmentBounds(conic_segment.parameterized_conic,start_t,end_t,conic_segment.direction)

        // combine bounds
        bound = boundOfBounds(bound,segment_bound)
    }
    return bound
}

// A quick check to test if bisectors intersect
// if bisectors end at the same point, the result is inconclusive
// 1: they intersect
// -1: they don't intersect
// 0: inconclusive 
export function checkIfBisectorsIntersect(b1,b2){
    let b1_start = b1.getPointFromT(0)
    let b1_end = b1.getPointFromT(b1.conic_segments.length)
    let b2_start = b2.getPointFromT(0)
    let b2_end = b2.getPointFromT(b2.conic_segments.length)

    // one of the ends are identical between bisectors
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

    // get a convex hull of the end-points of the bisectors. 
    let bisector_ends = convexHull([b1_start,b1_end,b2_start,b2_end])
    // if adjacent points on the convex hull are from the same bisector, they don't intersect
    if(point_map.get(bisector_ends[0]) != point_map.get(bisector_ends[1])){
        return 1
    }else{
        return -1
    }
}

// calculate bisectors' intersection
export function intersectBisectors(boundary,b1,b2){
    let intersections = []
    // go through each conic segment
    // possible to narrow it down through binary search?
    for(let i = 0; i < b1.conic_segments.length; i++){
        for(let j = 0; j < b2.conic_segments.length; j++){
            let intersection = intersectConicSegments(b1.conic_segments[i],b2.conic_segments[j])
            if (intersection){
                // return intersection
                intersections = intersections.concat(intersection) 
            }
        }
    }
    // make sure intersections are valid!
    for(let i = 0; i < intersections.length; i++){
        let intersection = intersections[i]
        if(pointInPolygon(intersection,boundary) && !pointOnPolygon(intersection,boundary)){
            return intersection
        }   
    }
    return false
}

// calculate the circumcenter between 3 bisectors
export function calculateCircumcenter(boundary,b1,b2,b3){
    // quick check to avoid work if possible
    // only need to intersect twice to get the circumcenter
    if (checkIfBisectorsIntersect(b1,b2) === -1){
        return false
    }
    let i12 = intersectBisectors(boundary,b1,b2)
    if (checkIfBisectorsIntersect(b1,b3) === -1){
        return false
    }
    let i13 = intersectBisectors(boundary,b1,b3)
    let sensitivity = 1e-2
    // if both intersections exist, check if they're close enough and get the avg
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


// similar to above, but does all three intersections
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

export function findPointsOnEitherSideOfBisector(boundary,bisector){
    let start_p = bisector.getPointFromT(0)
    let end_p = bisector.getPointFromT(bisector.conic_segments.length)
    let start_t = boundary.getTOfPoint(start_p)
    let end_t = boundary.getTOfPoint(end_p)

    let range1 = (end_t - start_t)
    if (range1 < 0){
        range1 += boundary.points.length
    }
    let range2 = (start_t - end_t)
    if (range2 < 0){
        range2 += boundary.points.length
    }
    let pos_mid = null
    let neg_mid = null

    let percentage = 0.5
    let mid_int = null
    let count = 0
    do{
        let pos_t = (start_t + range1*percentage + boundary.points.length) % (boundary.points.length)
        let neg_t = (start_t - range2*percentage + boundary.points.length) % (boundary.points.length)

        pos_mid = boundary.getPointFromT(pos_t)
        neg_mid = boundary.getPointFromT(neg_t)
        let mid_seg = new Segment(pos_mid,neg_mid)
        
        mid_int = null
        for(let i = 0; i < bisector.conic_segments.length; i++){
            let c_s = bisector.conic_segments[i]
            let ints = c_s.parameterized_conic.conic.intersectSegment(mid_seg)
            for(let j = 0; j < ints.length; j++){
                if(c_s.isOn(ints[j])){
                    mid_int = ints[j]
                    break;
                }
            }
            if(mid_int){
                break;
            }
        }
        count += 1
        percentage += 0.05
    }while(!mid_int && count < 5)
    
    if(mid_int){
        let p1 = new Point((pos_mid.x + mid_int.x)/2,(pos_mid.y + mid_int.y)/2)
        let p2 = new Point((neg_mid.x + mid_int.x)/2,(neg_mid.y + mid_int.y)/2)
        return [p1,p2]
    }

    return null
    
}
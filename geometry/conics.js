import { Point, Segment,Bound } from "./primitives.js"
import { euclideanDistance, isBetween,isLeZero,isZero,lineEquation,solveQuadratic,intersectBounds, pointOnPolygon } from "./utils.js"

export class Conic {
    constructor(equation){
        const {A,B,C,D,E,F} = equation
        this.A = A
        this.B = B
        this.C = C
        this.D = D
        this.E = E
        this.F = F
    }

    getEquation(){
        return {A:this.A,B:this.B,C:this.C,D:this.D,E:this.E,F:this.F}
    }

    intersectLine(segment){
        // nithin's code
        let x1 = segment.start.x;
        let y1 = segment.start.y;
        let x2 = segment.end.x;
        let y2 = segment.end.y;
        let x_diff = x2 - x1;
        let y_diff = y2 - y1;

        let {A:A,B:B,C:C,D:D,E:E,F:F} = this.getEquation()

        // Coefficients of the quadratic equation
        let a = A * x_diff * x_diff + B * x_diff * y_diff + C * y_diff * y_diff;
        let b = x_diff * (2 * A * x1 + B * y1 + D) + y_diff * (B * x1 + 2 * C * y1 + E);
        let c = A * x1 * x1 + B * x1 * y1 + C * y1 * y1 + D * x1 + E * y1 + F;

        // Solve the quadratic equation
        let solutions = solveQuadratic(a, b, c);

        let intersections = []

        // Check if solutions are within the segment
        for (let t of solutions) {
            let x = x1 + t * x_diff;
            let y = y1 + t * y_diff;
            intersections.push(new Point(x, y));
        }
        return intersections
    }

    intersectSegment(segment){
        let intersections = this.intersectLine(segment)
        let valid_intersections = []
        for (let p of intersections){
            
            if (isBetween(segment.start.x,segment.end.x,p.x) 
                && 
                isBetween(segment.start.y,segment.end.y,p.y)
            ){
                valid_intersections.push(p)
            }
        }
        return valid_intersections 
    }

    intersectPolygon(polygon){
        let points = polygon.points
        let segment_intersections = []
        for (let i = 0; i < points.length; i++){
            let i2 = (i+1) % points.length
            let intersections = this.intersectSegment(new Segment(points[i],points[i2]))
            segment_intersections.push(intersections)
        }
        return segment_intersections
    }
}


export function conicToMatrix(conic){
    let {A,B,C,D,E,F} = conic.getEquation()
    return [
        [A,B/2,D/2]
        [B/2,C,E/2]
        [D/2,E/2,F]
    ]
}
/*
assume 

A B D
B C E
D E F

DET(f*C1 + g*C2) = 0

(fA+gA) * det(fC+gC,fE+gE,fE+gE,fF+gF)
-(fB+gB) * det(fB+gB,fE+gE,fD+gD,fF+gF)
+(fD+gD) * det(fB+gB,fC+gC,fD+gD,fE+gE) = 0

A' * det(C',E',E',F') - B' * det(B',E',D',F') + D' * det(B',C',D',E') = 0
A'*(C'E'-E'F') - B'(B'D'-E'F') + D'(B'D'-C'E') = 0
ACE - AEF - BBD + BEF + DBD - BCE = 0
(f1-g2)(f3-g4)(f5-g6)
fff*135 +(fgg)*146 +(gfg)*236 + (ggf)*245 - (gff)*235 - (fgf)*145 - (ffg)*136 - (ggg)*246
fff*135 + (fgg)*(146+236+245)  
*/

export function intersectConicSegments(c_s1,c_s2){
    return approximateConicSegmentIntersection(c_s1,c_s2);
}

export function approximateConicSegmentIntersection(c_s1,c_s2){

    if (!intersectBounds(c_s1.bound,c_s2.bound)){
        return false
    }
    let split = 2

    let range1 = c_s1.end - c_s1.start
    let range2 = c_s1.end - c_s1.start 

    let mid_point1 = c_s1.parameterized_conic.getPointFromT(c_s1.start+range1/2)
    let mid_point2 = c_s2.parameterized_conic.getPointFromT(c_s2.start+range2/2)

    let sensitivity = 1e-5

    if (euclideanDistance(mid_point1,mid_point2) <= sensitivity){
        return mid_point1
    }

    let sub_cs1 = []
    let sub_cs2 = []

    for (let i = 0; i < split; i++){
        let start1 = c_s1.start + range1*i/split
        let end1 = c_s1.start + range1*(i+1)/split
        let bound1 = calculateConicSegmentBounds(c_s1.parameterized_conic,start1,end1)
        sub_cs1.push(new ConicSegment(c_s1.parameterized_conic,start1,end1,bound1))
        let start2 = c_s2.start + range2*i/split
        let end2 = c_s2.start + range2*(i+1)/split
        let bound2 = calculateConicSegmentBounds(c_s2.parameterized_conic,start2,end2)
        sub_cs2.push(new ConicSegment(c_s2.parameterized_conic,start2,end2,bound2))
    }

    for (let i = 0; i < split; i++){
        for (let j = 0; j < split; j++){
            if (intersectBounds(sub_cs1[i].bound,sub_cs2[j].bound)){
                console.log("RECURSE",sub_cs1[i],sub_cs2[j])
                let intersection = approximateConicSegmentIntersection(sub_cs1[i],sub_cs2[j])
                if (intersection){
                    return intersection
                }
            }
        }
    }
    return false
}

export function parameterizeConic(conic){
    let {conic_p:straight_conic, theta:angle} = unrotateConic(conic)


    let type = getConicType(straight_conic)
    let orientation = Conic_Orientation.NONE
    let parameterization = {
        x_mult: 0, x_const: 0,
        y_mult: 0, y_const: 0
    }

    let {A:A,B:B,C:C,D:D,E:E,F:F} = straight_conic.getEquation()

    // A,C = 0
    // For this, the edge case is if the line is fully vertical or horizontal
    if (type == Conic_Type.DEGENERATE){
        
     let ver_parallel = (isZero(C) && isZero(E))
     let hor_parallel = (isZero(A) && isZero(D))
     let crossed = isZero((D*D/(4*A)) + (E*E/(4*C)) - F)
        let d = B*B-4*A*C
        if (crossed){ // intersecting lines
            
            orientation = Conic_Orientation.NONE
            // has a gap near the cross, but HOPEFULLY, shouldn't be an issue, otherwise I will cry (or more likely guarentee it works for positive X)
            // new formulation fills in the gaps?
            parameterization.x_mult = 1000
            parameterization.x_const = -D/(2*A)
            parameterization.y_mult = Math.sqrt(A/-C)
            parameterization.y_const = -E/(2*C)
        }else if (hor_parallel){ //parallel lines
            orientation = Conic_Orientation.HORIZONTAL
            // makes the lower-number ts much more reasonably compact, negative values are non-existant though...
            parameterization.x_mult = 100
            parameterization.x_const = 1
            parameterization.y_mult = Math.sqrt((-F+(E*E)/(4*C))/C)
            parameterization.y_const = -E/(2*C)
        }else if(ver_parallel){ 
            orientation = Conic_Orientation.VERTICAL
            // makes the lower-number ts much more reasonably compact, negative values are non-existant though...
            parameterization.y_mult = 100
            parameterization.y_const = 1
            parameterization.x_mult = Math.sqrt((-F+(D*D)/(4*A))/A)
            parameterization.x_const = -D/(2*A)
        }else{// point

        }

    }else if (type == Conic_Type.PARABOLA){
        // was A, switched
        if (C === 0){
            orientation = Conic_Orientation.VERTICAL
            //X(t) = E/(-2A)t - D/(2A)
            parameterization.x_mult = E/(-2*A)
            parameterization.x_const = -D/(2*A)
            //Y(t) = E/(-4A)t^2 - (F/E - D^2/(4AE))
            parameterization.y_mult = E/(-4*A)
            parameterization.y_const = -(F/E - D*D/(4*A*E))
        }else if (A === 0){
            orientation = Conic_Orientation.HORIZONTAL
            //X(t) = D/(-4C)t^2 - (F/D - E^2/(4CD))
            parameterization.x_mult = D/(-4*C)
            parameterization.x_const = - (F/D - E*E/(4*C*D))
            //Y(t) = D/(-2C)t - E/(2C)
            parameterization.y_mult = D/(-2*C)
            parameterization.y_const = -E/(2*C)
        }
    }else if (type == Conic_Type.ELLIPSE){
        //X(t) = sqrt(D^2/(4A^2) + E^2/(4CA)-F/(A))cos(t) - D/(2A)
        parameterization.x_mult = Math.sqrt(D*D/(4*A*A) + E*E/(4*C*A)-F/A) // didnt have F/A?
        parameterization.x_const = -D/(2*A)
        
        //Y(t) = sqrt(E^2/(4C^2) + D^2/(4CA)-F/(C))sin(t) - E/(2C)
        parameterization.y_mult = Math.sqrt(E*E/(4*C*C) + D*D/(4*A*C)-F/C)
        parameterization.y_const = -E/(2*C)
    }else if (type == Conic_Type.HYPERBOLA){
        // was (A < 0 && C > 0) 
        // all hyperbolas are horizontal?
        // NOOOOOO
        if (D*D/(4*A*A) + E*E/(4*A*C) - F/A >0){
            orientation = Conic_Orientation.HORIZONTAL
            //X(t) = sqrt(D^2/(4A^2) - E^2/(4AC) + F/A)sec(t)+D/(2A)
            // varified?
            parameterization.x_mult = Math.sqrt(D*D/(4*A*A) + E*E/(4*A*C) - F/A)
            parameterization.x_const = -D/(2*A)
            //Y(t) = sqrt(-E^2/(4C^2) + D^2/(4AC) + F/C)tan(t)+E/(2C)

            //-E*E/(4*C*C) + D*D/(4*A*C) + F/C
            parameterization.y_mult = Math.sqrt(-E*E/(4*C*C) - D*D/(4*A*C) + F/C)
            parameterization.y_const = -E/(2*C)

        }else {//if (A > 0 && C < 0){
            orientation = Conic_Orientation.VERTICAL
            //X(t) = sqrt(-D^2/(4A^2) + E^2/(4AC) + F/A)tan(t)+D/(2A)
            parameterization.x_mult = Math.sqrt(-D*D/(4*A*A) - E*E/(4*A*C) + F/A)//Math.sqrt(-D*D/(4*A*A) + E*E/(4*A*C) + F/A)
            
            parameterization.x_const = -D/(2*A)
            //Y(t) = sqrt(E^2/(4C^2) - D^2/(4AC) + F/C)sec(t)+E/(2C)
            parameterization.y_mult = Math.sqrt(E*E/(4*C*C) + D*D/(4*A*C) - F/C)//Math.sqrt(E*E/(4*C*C) - D*D/(4*A*C) + F/C)
            parameterization.y_const = -E/(2*C)
        }
    }

    // NaN fixes?
    if (parameterization.y_mult != parameterization.y_mult){
        parameterization.y_mult = 0
    }
        if (parameterization.x_mult != parameterization.x_mult){
        parameterization.x_mult = 0
    }

    return new ParameterizedConic(type,orientation,angle,conic,straight_conic,parameterization)
}

// still figuring this out
export class ParameterizedConic {
    constructor(type,orientation,angle,conic,straight_conic,parameterization){
        this.type = type
        this.orientation = orientation
        this.angle = angle
        this.conic = conic
        this.straight_conic = straight_conic
        this.x_mult = parameterization.x_mult
        this.x_const = parameterization.x_const
        this.y_mult = parameterization.y_mult
        this.y_const = parameterization.y_const

        let {x_func,y_func,xi_func,yi_func,dx_func,dy_func} = this.getVariableFunctions()
        this.x_func = x_func
        this.y_func = y_func
        this.xi_func = xi_func
        this.yi_func = yi_func
        this.dx_func = dx_func
        this.dy_func = dy_func

        this.getPointFromT = this.getPointFunction()
        this.getPointFromTStraight = this.getUnrotatedFunction()
    }

    // takes the culaculated parameterized conic and returns an x and y function for t
    getVariableFunctions(center = false){
        const sin = Math.sin(this.angle)
        const cos = Math.cos(this.angle)

        let x_off = this.x_const
        let y_off = this.y_const

        if (center){
            x_off = 0
            y_off = 0
        }

        let x_func = (t) => Infinity
        let y_func = (t) => Infinity

        let xi_func = (x) => [Infinity]
        let yi_func = (y) => [Infinity]

        let dx_func = () => [Infinity]
        let dy_func = () => [Infinity]
        // get x and y for 
        switch (this.type){
            
            case Conic_Type.DEGENERATE:
                switch (this.orientation){
                    case Conic_Orientation.HORIZONTAL:
                        // t/2 to turn 2*PI to PI
                        x_func = (t) => {
                            t = t/2
                            if (isLeZero(Math.abs(t) - Math.PI/2)){
                                return this.x_mult*((1/Math.sin(t))-x_off)
                            }else{
                                return this.x_mult*((1/Math.sin(t - Math.PI/2))-x_off)
                            }   
                        }
                        y_func = (t) => {
                            t = t/2
                            if (isLeZero(Math.abs(t) - Math.PI/2)){
                                return (-this.y_mult + y_off)
                            }else{
                                return (this.y_mult + y_off)
                            }
                        }
                        xi_func = (x) => {
                            let asin = 2*Math.asin(1/(x/this.x_mult + x_off))
                            return [
                                asin, asin + Math.PI/2
                            ]
                        }
                        yi_func = (y) => {
                            /**
                            if (isZero(y - (-this.y_mult + y_off))){
                                return [Math.PI]
                            }else{
                                return [2*Math.PI]
                            }
                                 */
                            return [Infinity]
                        }
                    break;
                    case Conic_Orientation.VERTICAL:
                        // t/2 to turn 2*PI to PI
                        
                        x_func = (t) => {
                            t = t/2
                            if (isLeZero(Math.abs(t) - Math.PI/2)){
                                return (-this.x_mult + x_off)
                            }else{
                                return (this.x_mult + x_off)
                            }
                        }
                        y_func = (t) => {
                            t = t/2
                            if (isLeZero(Math.abs(t) - Math.PI/2)){
                                return this.y_mult*((1/Math.sin(t))-y_off)
                            }else{
                                return this.y_mult*((1/Math.sin(t - Math.PI/2))-y_off)
                            }   
                        }
                        xi_func = (x) => {
                            /**
                            if (isZero(x - (-this.x_mult + x_off))){
                                return [0]
                            }else{
                                return [2*Math.PI]
                            }
                                 */
                            return [Infinity]
                        }
                        yi_func = (y) => {
                            let asin = 2*Math.asin(1/(y/this.y_mult + y_off))
                            return [
                                asin, asin + Math.PI
                            ]
                        }
                        
                    break;
                    case Conic_Orientation.NONE:
                        /*
                        x_func = (t) => {
                            if (isLeZero(Math.abs(t-Math.PI) - Math.PI/2)){
                                return (1/Math.sin(t) + x_off)
                            }else{
                                return (-1/Math.sin(t) + x_off)
                            }
                        }
                        y_func = (t) => {
                            if (isLeZero(Math.abs(t-Math.PI) - Math.PI/2)){
                                return this.y_mult*(1/Math.sin(t))+y_off
                            }else{
                                return -this.y_mult*(-1/Math.sin(t))+y_off
                            }   
                        }
                        xi_func = (x) => {
                            let asin = -Math.asin(1/(x - x_off))
                            return [asin < 0 ? asin+2*Math.PI: asin,asin+Math.PI]
                        }
                        yi_func = (y) => {
                            let asin = Math.asin(this.y_mult/(y - y_off))
                            return [
                                asin < 0 ? asin+2*Math.PI: asin,-asin+Math.PI
                            ]
                        }
                         */
                        x_func = (t) => {
                            if (isLeZero(Math.abs(t-Math.PI) - Math.PI/2)){
                                return (this.x_mult*Math.sin(t) + x_off)
                            }else{
                                return (-this.x_mult*Math.sin(t) + x_off)
                            }
                        }
                        y_func = (t) => {
                            if (isLeZero(Math.abs(t-Math.PI) - Math.PI/2)){
                                return this.y_mult*(this.x_mult*Math.sin(t))+y_off
                            }else{
                                return this.y_mult*(this.x_mult*Math.sin(t))+y_off
                            }   
                        }
                        xi_func = (x) => {
                            let asin = -Math.asin((x - x_off)/this.x_mult)
                            return [asin < 0 ? asin+2*Math.PI: asin,asin+Math.PI]
                        }
                        yi_func = (y) => {
                            let asin = Math.asin((y - y_off)/(this.x_mult*this.y_mult))
                            return [
                                asin < 0 ? asin+2*Math.PI: asin,-asin+Math.PI
                            ]
                        }
                    break;

                }
                
            break;
            case Conic_Type.PARABOLA:
                switch (this.orientation){
                    case Conic_Orientation.HORIZONTAL:
                        x_func = (t) => this.x_mult*t*t + x_off
                        y_func = (t) => this.y_mult*t + y_off

                        xi_func = (x) => {
                            let t = Math.sqrt((x-x_off)/this.x_mult)
                            return [t, -t]
                        }
                        yi_func = (y) => [(y - y_off)/this.y_mult]

                        /*
                        solving derivates
                        X:
                            0 = cos*2*x_mult*t - sin*y_mult
                            t = sin*y_mult/(cos*2*x_mult)
                        Y: 
                            0  = cos*y_mult + sin*2*x_mult*t
                            t = -cos*y_mult/(sin*2*x_mult)
                        */

                        dx_func = () => [sin*y_mult/(cos*2*x_mult)]
                        dy_func = () => [-cos*y_mult/(sin*2*x_mult)]

                    break;
                    case Conic_Orientation.VERTICAL:
                        x_func = (t) => this.x_mult*t + x_off
                        y_func = (t) => this.y_mult*t*t + y_off

                        xi_func = (x) => [(x - x_off)/this.x_mult]
                        yi_func = (y) => {
                            let t = Math.sqrt((y-y_off)/this.y_mult)
                            return [t,-t]
                        }

                        /*
                        solving derivates
                        X:
                            0 = cos*x_mult - sin*2*y_mult*t
                            t = cos*x_mult/(sin*2*y_mult)
                        Y: 
                            0  = cos*2*y_mult*t + sin*x_mult
                            t = -sin*x_mult/(cos*2*y_mult)
                        */

                        dx_func = () => [cos*x_mult/(sin*2*y_mult)]
                        dy_func = () => [-sin*x_mult/(cos*2*y_mult)]

                    break;
                }
            break;
            case Conic_Type.ELLIPSE:
                x_func = (t) => this.x_mult*Math.cos(t) + x_off
                y_func = (t) => this.y_mult*Math.sin(t) + y_off

                xi_func = (x) => {
                    let t = Math.acos((x - x_off)/this.x_mult)
                    return [t,-t]
                }
                yi_func = (y) => {
                    let t = Math.asin((y - y_off)/this.y_mult)
                    return [t, Math.PI - t]
                }

                /*
                solving derivates
                X:
                    0 = cos*x_mult*(-sin(t)) - sin*y_mult*cos(t)
                    tan(t) = -sin*y_mult/(cos*x_mult)
                    t = atan(-sin*y_mult/(cos*x_mult))
                Y: 
                    0 = cos * this.y_mult*cos(t) + sin * this.x_mult * (-sin(t))
                    tan(t) = cos*this.y_mult/(sin*this.x_mult)
                    t = atan(cos*this.y_mult/(sin*this.x_mult))
                */
                dx_func = () => {
                    let t = Math.atan(-sin*this.y_mult/(cos*this.x_mult))
                    return [t, t + Math.PI]
                }
                dy_func = () => {
                    let t = Math.atan(cos*this.y_mult/(sin*this.x_mult))
                    return [t, t + Math.PI]
                }
            break;
            case Conic_Type.HYPERBOLA:
                switch (this.orientation){
                    case Conic_Orientation.HORIZONTAL:
                        x_func = (t) => this.x_mult / Math.cos(t) + x_off
                        y_func = (t) => this.y_mult * Math.tan(t) + y_off

                        xi_func = (x) => {
                            // was Math.acos(this.x_mult/(x - x_off)
                            let t = Math.acos(this.x_mult/(x - x_off))
                            return [t,-t]
                        }
                        yi_func = (y) => {
                            let t = Math.atan((y-y_off)/this.y_mult)
                            return [t, t + Math.PI]
                        }

                        /*
                        solving derivates
                        X:
                            0 = cos*this.x_mult*sec(t)*tan(t) - sin*this.y_mult*sec(t)*sec(t)
                            0 = cos*this.x_mult*tan(t) - sin*this.y_mult*sec(t)
                            sin*this.y_mult*sec(t) = cos*this.x_mult*tan(t)
                            1 = sin(t)*(cos*this.x_mult)/(sin*this.y_mult)
                            sin(t) = (sin*this.y_mult)/(cos*this.x_mult)
                            t = asin((sin*this.y_mult)/(cos*this.x_mult))
                            
                        Y: 
                            0 = cos*this.y_mult*sec(t)*sec(t) + sin*this.x_mult*sec(t)*tan(t)
                            0 = cos*this.y_mult*sec(t) + sin*this.x_mult*tan(t)
                            -sin*this.x_mult*tan(t) = cos*this.y_mult*sec(t)
                            -sin*this.x_mult*sin(t) = cos*this.y_mult
                            sin(t) = -(cos*this.y_mult)/(sin*this.x_mult)
                            t = asin(-(cos*this.y_mult)/(sin*this.x_mult))
                        */
                        dx_func = () => {
                            //t = asin((sin*this.y_mult)/(cos*this.x_mult))
                            let t = Math.asin((sin*this.y_mult)/(cos*this.x_mult))
                            return [t,-t + Math.PI]
                        }
                        dy_func = () => {
                            //t = asin(-(cos*this.y_mult)/(sin*this.x_mult))
                            let t = Math.asin(-(cos*this.y_mult)/(sin*this.x_mult))
                            return [t,-t + Math.PI]
                        }
                    break;
                    case Conic_Orientation.VERTICAL:
                        x_func = (t) => this.x_mult * Math.tan(t) + x_off
                        y_func = (t) => this.y_mult / Math.cos(t) + y_off

                        xi_func = (x) => {
                            let t = Math.atan((x-x_off)/this.x_mult)
                            return [t, t + Math.PI] 
                        }
                        yi_func = (y) => {
                            //Math.acos(this.y_mult/(y - y_off))
                            let t = Math.acos(this.y_mult/(y - y_off))//1/Math.acos((y - y_off)/this.y_mult)
                            return [t,-t]
                        }
                        /*
                        solving derivates
                        X:
                            0 = cos*this.x_mult*sec(t)*sec(t) - sin*this.y_mult*sec(t)*tan(t)
                            sin*this.y_mult*tan(t) = cos*this.x_mult*sec(t)
                            sin*this.y_mult*sin(t) = cos*this.x_mult
                            sin(t) = (cos*this.x_mult)/(sin*this.y_mult)
                            t = asin((cos*this.x_mult)/(sin*this.y_mult))
                        Y: 
                            0 = cos*this.y_mult*sec(t)tan(t) + sin*this.x_mult*sec(t)*sec(t)
                            -sin*this.x_mult*sec(t) = cos*this.y_mult*tan(t)
                            -sin*this.x_mult = cos*this.y_mult*sin(t)
                            sin(t) = -(sin*this.x_mult)/(cos*this.y_mult)
                            t = asin(-(sin*this.x_mult)/(cos*this.y_mult))
                        */
                       dx_func = () => {
                        //Math.asin((cos*this.x_mult)/(sin*this.y_mult))
                            let t = Math.asin((cos*this.x_mult)/(sin*this.y_mult))
                            return [t,-t + Math.PI]
                       }
                       dy_func = () => {
                        //Math.asin((-sin*this.x_mult)/(cos*this.y_mult))
                            let t = Math.asin(-(sin*this.x_mult)/(cos*this.y_mult))
                            return [t,-t + Math.PI]
                       }
                    break;
                }
            break;
        }
        
        return {x_func, y_func,xi_func,yi_func,dx_func,dy_func}

    }
    // gets a function that gets the point of a given t on the conic
    getPointFunction(){
        // unrotate the conic
        let sin = Math.sin(this.angle)
        let cos = Math.cos(this.angle)
        return (t)=> {
            let x_t = this.x_func(t)
            let y_t = this.y_func(t)
            return new Point(cos*x_t - sin*y_t,cos*y_t + sin*x_t)
        }  
    }
    // gets the function that gets the point of a given t on the straight conic
    getUnrotatedFunction(){
        let x = this.x_func
        let y = this.y_func
        return (t)=> {return new Point(x(t),y(t))} 
    }

    // checks if equation is satisfies
    isOn(point){
        let x = point.x
        let y = point.y
        let {A:A,B:B,C:C,D:D,E:E,F:F} = this.conic.getEquation()
        return isZero(A *x*x + B *x*y + C *y*y + D *x  + E *y + F)
    }

    getTOfPoint(point){
        // TODO
        /*
            parameterize the unrotated conic
            rotate point to be in live with unrotated conic
            inverse should then be easy*
        */

        let parallel = false
       let sin = Math.sin(this.angle)
       let cos = Math.cos(this.angle)
       // reverse rotation?
       let x = cos* point.x + sin * point.y
       let y = cos*point.y - sin * point.x

        if (this.isOn(point)){

            let x_ts = this.xi_func(x)
            let y_ts = this.yi_func(y)
            

            if(parallel){
                console.log("PARA",point,x_ts,y_ts)
            }
            
            for (let i = 0; i < x_ts.length; i++){
                for (let j = 0; j < y_ts.length; j++){
                    let p_x = this.getPointFromT(x_ts[i])
                    let p_y = this.getPointFromT(y_ts[j])

                    if(parallel){
                        console.log("CHECK",p_x,p_y)
                    }

                    let is_valid = false
                    if(x_ts[i] != Infinity && y_ts[j] != Infinity){
                        is_valid = isZero(euclideanDistance(p_x,p_y))
                    }else if(x_ts[i] == Infinity){
                        is_valid = isZero(euclideanDistance(point,p_y))
                    }else if(y_ts[i] == Infinity){
                        is_valid = isZero(euclideanDistance(point,p_x))
                    }

                    //if (Math.abs(x_ts[i]- y_ts[j]) <= 1e-10){
                    if (is_valid){
                        return x_ts[i] != Infinity?x_ts[i]:y_ts[j]
                    }
                }
            }
        }else{
            console.log("INVALID POINT",point,this)
        }
        console.log("MISS?",this.type,this.orientation)
        return null
    }

}



/*


parameterize the unrotated conic
rotate point to be in live with unrotated conic (reverse the angle: [cx + sy , cy - sx])
inverse should then be easy
Parameterizing parabolas:

determine direction via if A == 0 or C == 0, assuming B == 0

vertical:

// for a rotated conic
X(t) = E/(-2A)t - D/(2A)
Y(t) = E/(-4A)t^2 - (F/E - D^2/(4AE))

horizontal:

X(t) = D/(-4C)t^2 - (F/D - E^2/(4CD))
Y(t) = D/(-2C)t - E/(2C)


Parameterizing ellipses:

// for a rotated conic
X(t) = sqrt(D^2/(4A^2) + E^2/(4CA)-F/(A))cos(t) - D/(2A)
Y(t) = sqrt(E^2/(4C^2) + D^2/(4CA)-F/(C))sin(t) - E/(2C)


Parameterizing hyperbolas

horizontal:

X(t) = sqrt(D^2/(4A^2) - E^2/(4AC) + F/A)sec(t)+D/(2A)


Y(t) = sqrt(-E^2/(4C^2) + D^2/(4AC) + F/C)tan(t)+E/(2C)

//sqrt(E^2/(4C^2) - D^2/(4AC) - F/C)tan(t)+E/(2C)


vertical: (CHECK)yeah?

X(t) = sqrt(-D^2/(4A^2) + E^2/(4AC) + F/A)tan(t)+D/(2A)
Y(t) = sqrt(E^2/(4C^2) - D^2/(4AC) + F/C)sec(t)+E/(2C)


rotating back - probably don't need vert/hor

X0(t) = cos(theta)*X(t)-sin(theta)*Y(t)
Y0(t) = cos(theta)*Y(t)+sin(theta)*X(t)
*/


const Conic_Type = {
    DEGENERATE: "D",
    PARABOLA: "P",
    ELLIPSE: "E",
    HYPERBOLA: "H",
}

const Conic_Orientation = {
    HORIZONTAL: "H",
    VERTICAL: "V",
    NONE: "N"
}

export function getConicType(conic){
    const {A:A,B:B,C:C,D:D,E:E,F:F} = conic.getEquation()
    
    const beta =  (A*C-B*B/4)*F + (B*E*D-C*D*D-A*E*E)/4

    // there's an issue here!
    // percision!
    // non-degen
    
    /**
     assume B=0
     If no Y or no X, parallel

     can get in form (x-a)^2-(y-b)^2=0
     */

     let parallel = (isZero(A) && isZero(D)) || (isZero(C) && isZero(E))
     let crossed = isZero((D*D/(4*A)) + (E*E/(4*C)) - F)

    if (isZero(beta) || parallel || crossed){
        return Conic_Type.DEGENERATE
    }else{
        const d = B*B - 4*A*C
        if (d === 0){            
            return Conic_Type.PARABOLA
        }else if (d > 0){
            return Conic_Type.HYPERBOLA
        }else{
            return Conic_Type.ELLIPSE
        }
    }
    
    
}

export function bisectorConicFromSector(boundary,sector){
    let points = boundary.points

    let seg = new Segment(points[sector.p1_enter],points[(sector.p1_enter+1) % points.length])
    const {a:a1,b:a2,c:a3} = lineEquation(new Segment(points[sector.p1_enter],points[(sector.p1_enter+1) % points.length]))
    const {a:b1,b:b2,c:b3} = lineEquation(new Segment(points[sector.p1_exit],points[(sector.p1_exit+1) % points.length]))
    const {a:c1,b:c2,c:c3} = lineEquation(new Segment(points[sector.p2_enter],points[(sector.p2_enter+1) % points.length]))
    const {a:d1,b:d2,c:d3} = lineEquation(new Segment(points[sector.p2_exit],points[(sector.p2_exit+1) % points.length]))

    const p1 = sector.p1
    const p2 = sector.p2

    const k = 
    ((b1*p1.x+b2*p1.y+b3)*(c1*p2.x+c2*p2.y+c3))
    /
    ((d1*p2.x+d2*p2.y+d3)*(a1*p1.x+a2*p1.y+a3))

    let conic = new Conic(0,0,0,0,0,0);

    conic.A = b1*c1 - a1*d1 * k
    conic.B = b2*c1 + b1*c2 - a1*d2*k - a2*d1*k
    conic.C = b2*c2 - a2*d2*k
    conic.D = b3*c1 + b1*c3 - a3*d1*k - a1*d3*k
    conic.E = b3*c2 + b2*c3 - a2*d3*k - a3*d2*k;
    conic.F = b3*c3 - a3*d3*k;

    return conic
}

export function getConicParameterBoundsInPolygon(parameterized_conic,polygon,start_point = null){

    let intersections = parameterized_conic.conic.intersectPolygon(polygon)

    if (parameterized_conic.type == Conic_Type.DEGENERATE && parameterized_conic.orientation == Conic_Orientation.NONE){
        console.log("DN INTS",intersections)
    }
    let ts = []

    //testing
    let points = []

    for (let segment_num = 0; segment_num < intersections.length; segment_num++){
        for (let i = 0; i < intersections[segment_num].length; i++) {
            let point = intersections[segment_num][i]
            points.push(point)
            // keep track of t and which segment it collided with
            ts.push([parameterized_conic.getTOfPoint(point),segment_num,point])
        }
    }



    let start = [Infinity,-1]
    let end = [-Infinity,-1] 


    /**
    for (let i = 0; i < ts.length; i++){
        let t = ts[i]
        if (t[0] < start[0]){
            start = t
        // used to be just if
        }else if(t[0] > end[0]){
            end = t
        }
    }
    */

    let t_sort = (a,b) =>{
        return a[0] - b[0]
    }

    

    if(start_point != null){
        t_sort = (a,b) => {
            let start_t = parameterized_conic.getTOfPoint(start_point)
            //return euclideanDistance(start_point,a[2]) - euclideanDistance(start_point,b[2])
            return Math.abs(start_t - a[0]) - Math.abs(start_t - b[0])
        }
    }

    ts = ts.sort(t_sort)

    if (ts.length != 2){
        console.log("TS",parameterized_conic.type,parameterized_conic.orientation,ts)
    }

    start = ts[0]
    let index = 1
    end = ts[index]
    while(isZero(ts[index][0]-start[0]) && index < ts.length){
        index += 1
        end = ts[index]
    }

    if (parameterized_conic.type ==Conic_Type.DEGENERATE && parameterized_conic.orientation == Conic_Orientation.NONE){
        console.log("HERE",ts.length)
        let center_point = parameterized_conic.getPointFromT(0)
        if(pointOnPolygon(center_point,polygon)){
            let poss_ts = [0,Math.PI,2*Math.PI]
            let start_t = parameterized_conic.getTOfPoint(start_point)
            poss_ts.sort((a,b) => {
                return Math.abs(start_t - a) - Math.abs(start_t - b)
            })
            end = [poss_ts[0],null,center_point]
        }
        
    }

    //end = ts[ts.length-1]

    // take shortest way around

    if(end[0] < 0){
        end[0] += 2*Math.PI
    }
    if(start[0] < 0){
        start[0] += 2*Math.PI
    }

    let direction = 1
    let first = start//start[0] < end[0]?start:end
    let last = end//start[0] < end[0]?end:start
    let change_direction = Math.abs(last[0]-first[0])>2*Math.PI-Math.abs(last[0]-first[0])
    if (change_direction){

        // come back to this!
        console.log("SWAP",Math.abs(last[0]-first[0]),2*Math.PI-Math.abs(last[0]-first[0]))
        //direction = -1
    }
        

         


    if (start[0] === Infinity || start[0] === -Infinity || end[0] === Infinity || end[0] === -Infinity){
        console.log("MISS")
        console.log("TS",ts)
        console.log("INTERSECTIONS",intersections)
    }

    // return boundign t's and their associated segments
    return {start_t: start[0],start_segment:start[1],start_point:start[2],end_t:end[0],end_segment:end[1],end_point:end[2],direction:direction,points:points}
}

export function unrotateConic(c){
    
    let conic_p = new Conic(0,0,0,0,0,0);

    const theta = 0.5 * Math.atan2(c.B,c.A-c.C)

    const c_t = Math.cos(theta)
    const s_t = Math.sin(theta)

    conic_p.A = c.A*(c_t*c_t) + c.B*c_t*s_t + c.C*(s_t*s_t)
    conic_p.B = 0
    conic_p.C = c.A * (s_t*s_t) - c.B * c_t * s_t + c.C*(c_t*c_t)
    conic_p.D = c.D * c_t + c.E * s_t
    conic_p.E = -c.D*s_t + c.E * c_t
    conic_p.F = c.F

    return {conic_p:conic_p,theta:theta}
}

export class ConicSegment {
    constructor(parameterized_conic,start,end,bound,direction = 0){
        this.parameterized_conic = parameterized_conic
        this.start = start
        this.end = end
        this.bound = bound
        this.direction = direction
    }
}

export function calculateConicSegmentBounds(parameterized_conic,start,end){   
    let start_p = parameterized_conic.getPointFromT(start)
    let end_p = parameterized_conic.getPointFromT(end)
    
    let bound = new Bound(Math.max(start_p.y,end_p.y),Math.min(start_p.y,end_p.y),Math.min(start_p.x,end_p.x),Math.max(start_p.x,end_p.x))
    
    let d0_x = parameterized_conic.dx_func()
    
    for (let i = 0; i < d0_x.length; i++){
        let t = d0_x[i]
        if (isBetween(start,end,t)){
            let p = parameterized_conic.getPointFromT(t)
            bound.left = Math.min(p.x,bound.left)
            bound.right = Math.max(p.x,bound.right)
        }
    }

    let d0_y = parameterized_conic.dy_func()

    for (let i = 0; i < d0_y.length; i++){
        let t = d0_y[i]
        if (isBetween(start,end,t)){
            let p = parameterized_conic.getPointFromT(t)
            bound.bottom = Math.min(p.y,bound.bottom)
            bound.top = Math.max(p.y,bound.top)
        }
    }
    
    return bound

}

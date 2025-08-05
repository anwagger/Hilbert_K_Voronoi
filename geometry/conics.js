import { Point, Segment,Bound } from "./primitives.js"
import { euclideanDistance, isBetween,isLeZero,isZero,lineEquation,solveQuadratic,intersectBounds, pointOnPolygon, boundArea, isColinear } from "./utils.js"
import {complex, crossProduct, makeMatrixComplex, multiplyMatrix, pointToVector, rowReduceMatrix, scaleVector, standardizePoint, transform, transposeSquare} from "./../math/linear.js"
// just stores the equation
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

    // checks where a conic intersects a line
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

    // intersects a conic with a line segment
    intersectSegment(segment){
        let intersections = this.intersectLine(segment)
        let valid_intersections = []
        // check if intersections with the line are valid for the segment
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

    // intersect a conic with a polygon
    intersectPolygon(polygon){
        let points = polygon.points
        let segment_intersections = []
        // compile segment intersections for each segment
        for (let i = 0; i < points.length; i++){
            let i2 = (i+1) % points.length
            let intersections = this.intersectSegment(new Segment(points[i],points[i2]))
            segment_intersections.push(intersections)
        }
        return segment_intersections
    }
}

// unused, but might be helpful in faster conic-conic intersection
export function conicToMatrix(conic){
    let {A,B,C,D,E,F} = conic.getEquation()
    return [
        [A,B/2,D/2]
        [B/2,C,E/2]
        [D/2,E/2,F]
    ]
}

// turns a conic equation into an equivalent shape but B = 0
// different rotation, same shape
// much easier to work with
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

// wrapper function for intersecting conic segments
export function intersectConicSegments(c_s1,c_s2){
    //console.log("INTERSECTING:",c_s1.parameterized_conic.type,c_s1.parameterized_conic.orientation,"AND",c_s2.parameterized_conic.type,c_s2.parameterized_conic.orientation)
    count = 0
    

    let approx = approximateConicSegmentIntersection(c_s1,c_s2);

    if(approx.count){
        console.log("STUCK")
        console.log("1",c_s1,approx.c_s1)
        console.log("2",c_s2,approx.c_s2)
    }
    if(false && approx){
        let matrix = matrixConicSegmentIntersection(c_s1,c_s2);
        console.log("MATRIX",matrix)
        console.log("APPROX",approx)
    }


    return approx 
}

// recursive brute force approach to intersecting conic segments
let count = 0
export function approximateConicSegmentIntersection(c_s1,c_s2,depth=0){

    count++

    
    // quick bounds check
    let intersections = [] 
    if (!intersectBounds(c_s1.bound,c_s2.bound)){
        return false
    }

    let bound_area1 = boundArea(c_s1.bound)
    let bound_area2 = boundArea(c_s2.bound)


    let split = 2

    // bad :(
    // calculate where to parameterize each conic
    let range1 = c_s1.getRange()
    let first1 = c_s1.start//Math.min(c_s1.start,c_s1.end)

    let range2 = c_s2.getRange()
    let first2 = c_s2.start//Math.min(c_s2.start,c_s2.end)

    let mid_point1 = c_s1.parameterized_conic.getPointFromT(first1+range1/2)
    let mid_point2 = c_s2.parameterized_conic.getPointFromT(first2+range2/2)

    let sensitivity = 1e-10


    // if the range for each conic is small enough, we found the intersection!
    if (Math.abs(range1) <= sensitivity && Math.abs(range2) <= sensitivity){
        intersections.push(new Point((mid_point1.x + mid_point2.x)/2,(mid_point1.y + mid_point2.y)/2))
        return intersections
        // return new Point((mid_point1.x + mid_point2.x)/2,(mid_point1.y + mid_point2.y)/2)
    }else if (Math.abs(range1) <= sensitivity*1e-2){
        intersections.push(new Point(mid_point1.x,mid_point1.y))
        return intersections
    }else if (Math.abs(range2) <= sensitivity*1e-2){
        intersections.push(new Point(mid_point2.x,mid_point2.y))
        return intersections
    }

    if(count > 100000){
        console.log("EHLLL{","Depth",depth,"count",count,"Ranges: ",range1,range2,"Areas: ",bound_area1,bound_area2,"TYPES",c_s1.parameterized_conic.type,c_s1.parameterized_conic.orientation,c_s2.parameterized_conic.type,c_s2.parameterized_conic.orientation)

        //if(c_s1.parameterized_conic.type === "D" && c_s1.parameterized_conic.orientation === "N"){
            console.log("CROSSED ISSUE 1","FIRST",first1,"RANGE",range1,"AREA",bound_area1,"BOUND",c_s1.bound,c_s1)
        //}
        //if(c_s2.parameterized_conic.type === "D" && c_s2.parameterized_conic.orientation === "N"){
            console.log("CROSSED ISSUE 2","FIRST",first2,"RANGE",range2,"AREA",bound_area2,"BOUND",c_s2.bound,c_s2)
        //}
        if(count > 110000){
            return false
        }
        return {count:count,c_s1:c_s1,c_s2:c_s2}
    }

    let sub_cs1 = []
    let sub_cs2 = []

    // split the conic into pieces and check if they can intersect 
    for (let i = 0; i < split; i++){
        let start1 = first1 + range1*i/split
        let end1 = first1 + range1*(i+1)/split
        let bound1 = calculateConicSegmentBounds(c_s1.parameterized_conic,start1,end1,c_s1.direction)
        
        sub_cs1.push(new ConicSegment(c_s1.parameterized_conic,start1,end1,bound1,c_s1.direction))
        

        
        let start2 = first2 + range2*i/split
        let end2 = first2 + range2*(i+1)/split
        let bound2 = calculateConicSegmentBounds(c_s2.parameterized_conic,start2,end2,c_s2.direction,depth)

        sub_cs2.push(new ConicSegment(c_s2.parameterized_conic,start2,end2,bound2,c_s2.direction))
    }


    for (let i = 0; i < split; i++){
        for (let j = 0; j < split; j++){
            // if the pieces intersect, recurse
            if (intersectBounds(sub_cs1[i].bound,sub_cs2[j].bound)){
                let intersection = approximateConicSegmentIntersection(sub_cs1[i],sub_cs2[j],depth+1)
                if (intersection){
                    intersections = intersections.concat(intersection)
                }
            }
        }
    }
    if (intersections.length > 0){
        return intersections
    }else{
        return false
    }
}

export function matrixConicSegmentIntersection(c_s1,c_s2){
    let p_c1 = c_s1.parameterized_conic
    let p_c2 = c_s2.parameterized_conic
    let intersections = matrixConicIntersection(p_c1,p_c2)
    if(intersections){
        let valid_ints = []
        for(let i = 0; i < intersections.length; i++){
            let point = intersections[i]
            if(c_s1.isOn(point) && c_s2.isOn(point)){
                valid_ints.push(point)
            }
        }
        return valid_ints
    }else{
        console.log("A=0")
    }
}

export function matrixConicIntersection(p_c1,p_c2){
    let c1 = p_c1.conic
    let c2 = p_c2.conic
    let {A:A1,B:B1,C:C1,D:D1,E:E1,F:F1} = c1.getEquation()
    let {A:A2,B:B2,C:C2,D:D2,E:E2,F:F2} = c2.getEquation()
    let m1 = makeMatrixComplex([
        [A1,B1/2,D1/2],
        [B1/2,C1,E1/2],
        [D1/2,E1/2,F1]
    ])
    let m2 = makeMatrixComplex([
        [A2,B2/2,D2/2],
        [B2/2,C2,E2/2],
        [D2/2,E2/2,F2]
    ])
    // get points!
    let p1,p2,p3;
    let rp1,rp2,rp3;

    do{
        rp1 = p_c1.getPointFromT(Math.random()*2*Math.PI)
        rp2 = p_c1.getPointFromT(Math.random()*2*Math.PI)
        rp3 = p_c1.getPointFromT(Math.random()*2*Math.PI)
    }while(isColinear(rp1,rp2,rp3))

    p1 = pointToVector(rp1)
    p2 = pointToVector(rp2)
    p3 = pointToVector(rp3)

    let l1 = transform(m1,p1)
    let l2 = transform(m1,p2)

    let p0 = standardizePoint(crossProduct(l1,l2))

    let pre_h = [
        [p0[0],p1[0],p2[0],p3[0]],
        [p0[1],p1[1],p2[1],p3[1]],
        [p0[2],p1[2],p2[2],p3[2]],
    ]

    let solved = rowReduceMatrix(pre_h)

    let lambda1 = solved[0][3]
    let lambda2 = solved[1][3]
    let lambda3 = solved[2][3]

    let H = transposeSquare([scaleVector(p0,lambda1),scaleVector(p1,lambda2),scaleVector(p2,lambda3)])

    console.log("H",H)

    let c1p = multiplyMatrix(multiplyMatrix(transposeSquare(H),m1),H)

    let c2p = multiplyMatrix(multiplyMatrix(transposeSquare(H),m2),H)

    let a = c2p[1][1]
    let b = 2*c2p[1][0]
    let c = (c2p[0][0] + 2*c2p[1][2])
    let d = 2*c2p[0][2]
    let e = c2p[2][2]

    if(isZero(a)){
        // check p1,p2,p3
        return false
    }

    let roots = [] // x values, y = x^2

    // solve the quartic!

    let p = complex((8*a*c - 3*b**2)/(8*a**2))
    let S = complex((8*a**2*d-4*a*b*c+b**3)/(8*a**3))
    let q = complex(12*a*e - 3*b*d + c**2)
    let s = complex(27*a*d**2 - 72*a*c*e + 27*b**2*e - 9*b*c*d + 2*c**3)    
    
    //let d0 = ((s + (s**2 - 4 *(q**3))**(1/2))/2)**(1/3)
    let d0 = q.pow(complex(3)).mul(complex(4)).neg().add(s.pow(complex(2))).sqrt().add(s).div(complex(2)).pow(complex(1/3))
    //let Q = (1/2)*(-(2/3)*p+(1/(3*a))*(d0 + q/d0))**(1/2)
    let Q = d0.add(q.div(d0)).mul(complex(a).mul(complex(3)).inverse()).add(p.mul(complex(2/3)).neg()).sqrt().div(complex(2))
    let n = 7
    while(isZero(Q.abs())){
        let power = complex(0,2*Math.PI*n/3)
        d0 = d0.mul(power.exp())
        Q = d0.add(q.div(d0)).mul(complex(a).mul(complex(3)).inverse()).add(p.mul(complex(2/3)).neg()).sqrt().div(complex(2))
        console.log("NEW Q",Q)
        n += 1
    }



    //let disc1 = (1/2)*(-4*(Q**2)-2*p+S/Q)**(1/2)
    let disc1 = (Q.pow(complex(2)).mul(complex(-4)).add(S.div(Q).add(p.mul(complex(-2))))).sqrt().mul(complex(1/2))
    //let const1 = -b/(4*a)-Q
    let const1 = complex(-b).div(complex(a).mul(complex(4))).sub(Q)
    roots.push(const1.add(disc1))
    roots.push(const1.sub(disc1))
    //let disc2 = (1/2)*(-4*Q**2-2*p-S/Q)**(1/2)
    let disc2 = (Q.pow(complex(2)).mul(complex(-4)).add(S.div(Q).neg().add(p.mul(complex(-2))))).sqrt().mul(complex(1/2))
    //let const2 = -b/(4*a)+Q
    let const2 = complex(-b).div(complex(a).mul(complex(4))).add(Q)
    roots.push(const2.add(disc2))
    roots.push(const2.sub(disc2))

    console.log("ROOTS",roots)


    let intersections = []

    for(let i = 0; i < roots.length; i++){
        let point = pointToVector(new Point(roots[i],roots[i]**2))

        let c_t_point = transform(H,point)
        let t_point = new Point(c_t_point[0].re/c_t_point[2].re,c_t_point[1].re/c_t_point[2].re)
        intersections.push(t_point)
        
    }

    console.log("MATRIX INTS",intersections)

    return intersections

}



// classify the conic type and get equation coefficients 
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
        let crossed = isZero(((D*D/(4*A)) + (E*E/(4*C)) - F)/10)
        if (hor_parallel){ //parallel lines
            orientation = Conic_Orientation.HORIZONTAL
            // makes the lower-number ts much more reasonably compact, negative values are non-existant though...
            parameterization.x_mult = 2000
            parameterization.x_const = 0
            parameterization.y_mult = Math.sqrt((-F+(E*E)/(4*C))/C)
            parameterization.y_const = -E/(2*C)
        }else if(ver_parallel){ 
            orientation = Conic_Orientation.VERTICAL
            // makes the lower-number ts much more reasonably compact, negative values are non-existant though...
            parameterization.y_mult = 2000
            parameterization.y_const = 0
            parameterization.x_mult = Math.sqrt((-F+(D*D)/(4*A))/A)
            parameterization.x_const = -D/(2*A)
        }else if (crossed){ // intersecting lines
            
            orientation = Conic_Orientation.NONE
            // has a gap near the cross, but HOPEFULLY, shouldn't be an issue, otherwise I will cry (or more likely guarentee it works for positive X)
            // new formulation fills in the gaps?
            parameterization.x_mult = 2000
            parameterization.x_const = -D/(2*A)
            parameterization.y_mult = Math.sqrt(A/-C)
            parameterization.y_const = -E/(2*C)
        }else{// point

        }

    }else if (type == Conic_Type.PARABOLA){
        // SHOULD BE USED! VERIFY
        // was A, switched
        if (C === 0){
            orientation = Conic_Orientation.VERTICAL
            //X(t) = E/(-2A)t - D/(2A)
            parameterization.x_mult = 1
            parameterization.x_const = -D/(2*A)
            //Y(t) = E/(-4A)t^2 - (F/E - D^2/(4AE))
            parameterization.y_mult = A/(-E)
            parameterization.y_const = -(F/E - D*D/(4*A*E))
        }else if (A === 0){
            orientation = Conic_Orientation.HORIZONTAL
            //X(t) = D/(-4C)t^2 - (F/D - E^2/(4CD))
            parameterization.x_mult = C/(-D)
            parameterization.x_const = - (F/D - E*E/(4*C*D))
            //Y(t) = D/(-2C)t - E/(2C)
            parameterization.y_mult = 1
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

// A conic with a lot more information to aid in calculating points and such
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

    // takes the culaculated parameterized conic and returns functions to go from point -> t and visa versa 
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

        let dx_func = () => []
        let dy_func = () => []
        // get x and y for 
        switch (this.type){
            
            case Conic_Type.DEGENERATE:
                switch (this.orientation){
                    case Conic_Orientation.HORIZONTAL:
                       x_func = (t) => {
                            if (isLeZero(Math.abs(t-Math.PI) - Math.PI/2)){
                                return (this.x_mult*Math.sin(t) - x_off)
                            }else{
                                return (-this.x_mult*Math.sin(t) - x_off)
                            }  
                        }
                        y_func = (t) => {
                            if (isLeZero(Math.abs(t-Math.PI) - Math.PI/2)){
                                return -this.y_mult+y_off
                            }else{
                                return this.y_mult+y_off
                            }   
                        }
                        xi_func = (x) => {
                            let asin = -Math.asin((x + x_off)/this.x_mult)
                            return [asin < 0 ? asin+2*Math.PI: asin,asin+Math.PI]
                        }
                        yi_func = (y) => {
                            return [Infinity]
                        }
                    break;
                    case Conic_Orientation.VERTICAL:
                        x_func = (t) => {
                            if (isLeZero(Math.abs(t-Math.PI) - Math.PI/2)){
                                return -this.x_mult+x_off
                            }else{
                                return this.x_mult+x_off
                            }   
                        }
                       y_func = (t) => {
                            if (isLeZero(Math.abs(t-Math.PI) - Math.PI/2)){
                                return (this.y_mult*Math.sin(t) - y_off)
                            }else{
                                return (-this.y_mult*Math.sin(t) - y_off)
                            }  
                        }
                        xi_func = (x) => {
                            return [Infinity]
                        }
                        yi_func = (y) => {
                            let asin = -Math.asin((y + y_off)/this.y_mult)
                            return [asin < 0 ? asin+2*Math.PI: asin,asin+Math.PI]
                        }

                        
                    break;
                    case Conic_Orientation.NONE:
                        /**
                         * // old way, breaks on near-squares
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
                        */
                       x_func = (t) => {
                            if (isLeZero(Math.abs(t) - Math.PI)){
                                return (this.x_mult*Math.tan(-t) + x_off)
                            }else{
                                return (this.x_mult*Math.tan(t) + x_off)
                            }
                        }
                        y_func = (t) => {
                            return this.x_mult*this.y_mult*(Math.tan(t))+y_off
                        }
                        xi_func = (x) => {
                            let atan = Math.atan((x - x_off)/this.x_mult)
                            if(isLeZero(atan)){
                                return [-atan, atan + 2*Math.PI]
                            }else{
                                return [atan+Math.PI,- atan + Math.PI]
                            }
                            
                        }
                        yi_func = (y) => {
                            let atan = Math.atan((y - y_off)/(this.x_mult*this.y_mult))
                            return [atan + Math.PI,isLeZero(atan)? atan + 2*Math.PI:atan]
                        }
                    break;

                }
                
            break;
            // need to verify still
            case Conic_Type.PARABOLA:
                switch (this.orientation){
                    case Conic_Orientation.HORIZONTAL:
                        x_func = (t) => this.x_mult*Math.tan(t)**2 + x_off
    
                        y_func = (t) => this.y_mult*Math.tan(t) + y_off

                        xi_func = (x) => {
                            let atan = Math.atan(Math.sqrt((x-x_off)/this.x_mult))
                            return [atan,atan + Math.PI]
                        }
                        yi_func = (y) => {
                            let atan = Math.atan((y - y_off)/this.y_mult)
                            return [atan,atan + Math.PI]
                        }
                        
                                                /*
                        solving derivates
                        X:
                            0 = cos*this.x_mult*2*sec(t)^2*tan(t) - sin * this.y_mult*sec(t)^2
                            t = atan((sin * this.y_mult)/(2*cos*this.x_mult))
                        Y: 
                            0 = cos*this.y_mult *sec(t)^2 + sin * this.x_mult * 2 * sec(t)^2 * tan(t)
                            -cos*this.y_mult = this.x_mult * 2 * tan(t)
                            t = atan((-cos*this.y_mult)/(this.x_mult * 2))
                        */

                        dx_func = () => [Math.atan((sin*this.y_mult)/(2*cos*this.x_mult))]
                        dy_func = () => [Math.atan((-cos*this.y_mult)/(2*this.x_mult))]

                    break;
                    case Conic_Orientation.VERTICAL:
                        x_func = (t) => this.x_mult*Math.tan(t) + x_off
                        y_func = (t) => this.y_mult*Math.tan(t)**2 + y_off

                        xi_func = (x) => {
                            let atan = Math.atan((x - x_off)/this.x_mult)
                            return [atan,atan + Math.PI]
                        }
                        yi_func = (y) => {
                            let atan = Math.atan(Math.sqrt((y-y_off)/this.y_mult))
                            return [atan,atan + Math.PI]
                        }

                        /*
                        solving derivates
                        X:
                            0 = cos*(x_mult*sec(t)^2) - sin*2*y_mult*sec(t)^2*tan(t)
                            sin*y_mult*2*sec(t)^2*tan(t) = cos*(x_mult*sec(t)^2)
                            (sin*y_mult*2)/(cos*x_mult)*tan(t) = 1
                            t = atan((cos*x_mult)/(sin*y_mult*2))
                        Y: 
                            0  = cos*2*y_mult*sec(t)^2*tan(t) + sin*(x_mult*sec(t)^2)
                            t = atan((sin*x_mult)/( -cos*2*y_mult))
                        */

                        dx_func = () => [Math.atan((cos*this.x_mult)/(2*sin*this.y_mult))]
                        dy_func = () => [Math.atan((sin*this.x_mult)/(-2*cos*this.y_mult))]

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
            // since the x_func is for the straight conic, we rotate it back
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
        let closeness = (A *x*x + B *x*y + C *y*y + D *x  + E *y + F) 
        return isZero(closeness**2)
    }

    // gets the t value of a given point 
    getTOfPoint(point,skipOn = false){

        // for debugging
        let parallel = false//(this.type == Conic_Type.DEGENERATE && this.orientation == Conic_Orientation.NONE)
        
        let sin = Math.sin(this.angle)
        let cos = Math.cos(this.angle)
        // reverse rotation to get equivalent point on straightened conic
        let x = cos* point.x + sin * point.y
        let y = cos*point.y - sin * point.x

        // sometimes we don't want the sanity check, since it has to be pretty exact
        if (this.isOn(point) || skipOn){

            // inverse 
            let x_ts = this.xi_func(x)
            let y_ts = this.yi_func(y)
            

            if(parallel){
                console.log("PARA",this.type,this.orientation,point,x_ts,y_ts)
            }
            
            // for each of the possible ts, check if the points match
            for (let i = 0; i < x_ts.length; i++){
                for (let j = 0; j < y_ts.length; j++){
                    let p_x = this.getPointFromT(x_ts[i])
                    let p_y = this.getPointFromT(y_ts[j])

                    if(parallel){
                        console.log("CHECK",p_x,x_ts[i],p_y,y_ts[j])
                    }

                    let is_valid = false
                    if(x_ts[i] != Infinity && y_ts[j] != Infinity){
                        is_valid = isZero(euclideanDistance(p_x,p_y)**2)
                    }else if(x_ts[i] === Infinity){

                        is_valid = isZero(euclideanDistance(point,p_y)**2)
                    }else if(y_ts[j] === Infinity){

                        is_valid = isZero(euclideanDistance(point,p_x)**2)
                    }else{
                    }

                    if (is_valid){
                        return x_ts[i] != Infinity?x_ts[i]:y_ts[j]
                    }
                }
            }
            console.log("NO HITS:",x_ts,y_ts,point)
        }else{
            console.log("INVALID POINT",point,this)
            let x = point.x
            let y = point.y
            let {A:A,B:B,C:C,D:D,E:E,F:F} = this.conic.getEquation()
            let closeness = (A *x*x + B *x*y + C *y*y + D *x  + E *y + F) 
            console.log("CLOSENESS:",closeness,isZero(closeness**2))
        }
        // TODO: FIX PARALLEL LIKE YOU DID WITH CROSSED

        console.log("MISS? Skip:",skipOn,this.type,this.orientation,point,this)
        return NaN
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

// classify the conic's type and orientation
export function getConicType(conic){
    const {A:A,B:B,C:C,D:D,E:E,F:F} = conic.getEquation()
    
    const beta =  (A*C-B*B/4)*F + (B*E*D-C*D*D-A*E*E)/4
    
    /**
     assume B=0
     If no Y or no X, parallel

     can get in form (x-a)^2-(y-b)^2=0
     */

     let parallel = (isZero(A) && isZero(D)) || (isZero(C) && isZero(E))
     let crossed = isZero(((D*D/(4*A)) + (E*E/(4*C)) - F)/10)

    if (isZero(beta) || parallel || crossed){
        return Conic_Type.DEGENERATE
    }else{
        const d = B*B - 4*A*C
        if (isZero(d)){            
            return Conic_Type.PARABOLA
        }else if (d > 0){
            return Conic_Type.HYPERBOLA
        }else{
            return Conic_Type.ELLIPSE
        }
    }
}

// get the conic representing a bisector between two sites within a certain sector
export function bisectorConicFromSector(boundary,sector){
    let points = boundary.points

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

// gets the bounding t values of a conic inside a polyogn
export function getConicParameterBoundsInSector(parameterized_conic,sector,start_point = null){

    let polygon = sector.polygon

    let intersections = parameterized_conic.conic.intersectPolygon(polygon)

    if (parameterized_conic.type == Conic_Type.DEGENERATE && parameterized_conic.orientation == Conic_Orientation.NONE){
        //console.log("DN INTS",intersections)
    }
    let ts = []

    //testing
    let points = []

    // for each intersection, get the t value
    for (let segment_num = 0; segment_num < intersections.length; segment_num++){
        for (let i = 0; i < intersections[segment_num].length; i++) {
            let point = intersections[segment_num][i]
            points.push(point)
            // keep track of t and which segment it collided with
            let t = parameterized_conic.getTOfPoint(point)
            ts.push([t,segment_num,point])
            if(isNaN(t)){
                console.log("NOT ON CONIC",polygon,intersections)
            }

        }
    }

    let start = [Infinity,-1]
    let end = [-Infinity,-1] 

    // sort the points by their t value if there is no start point
    let t_sort = (a,b) =>{
        return a[0] - b[0]
    }


    // if there is a start point, order them by distance to start point

    if(start_point != null){
        t_sort = (a,b) => {
            return euclideanDistance(start_point,a[2]) - euclideanDistance(start_point,b[2])
        }
    }

    ts = ts.sort(t_sort)

    if (ts.length != 2){
        //console.log("TS",parameterized_conic.type,parameterized_conic.orientation,ts)

    }

    // determine the start and end t values
    // might need a second look
    start = ts[0]
    let index = 1
    end = ts[index]
    // going over duplicates
    while(index < ts.length-1 && isZero(ts[index][0]-start[0])){
        index += 1
        end = ts[index]
    }

    // special case for crossed lines
    // specifically the case where the center-point is on the polygon
    if (parameterized_conic.type == Conic_Type.DEGENERATE && parameterized_conic.orientation == Conic_Orientation.NONE && start_point != null){
        
        let boundary_sector = false
        for(let i = 0; i < sector.edge_spokes.length; i++){
            let data = sector.edge_spokes[i]
            if(data.p1_spoke === -1 || data.p2_spoke === -1){
                boundary_sector = true
                break;
            }
        }
        
        let center_point = parameterized_conic.getPointFromT(0)

        if(pointOnPolygon(center_point,polygon)){
            let poss_ts = [0,Math.PI,2*Math.PI]
            let start_t = parameterized_conic.getTOfPoint(start_point)
            poss_ts.sort((a,b) => {
                return Math.abs(start_t - a) - Math.abs(start_t - b)
            })
            end = [poss_ts[0],null,center_point]
        }else{
            if(boundary_sector && (end[1] < 0 || start[1] < 0)){
                console.log("DN CENTER NOT ON:",center_point,polygon)
                console.log("USING",start,end)
                console.log("SECTOR",sector)
                let zero = parameterized_conic.getPointFromT(0)
                let pi = parameterized_conic.getPointFromT(Math.PI)
                let two_pi = parameterized_conic.getPointFromT(2*Math.PI)  
                console.log("ON CHECK",pointOnPolygon(zero,polygon),pointOnPolygon(pi,polygon),pointOnPolygon(two_pi,polygon))
             
            }
             
        }
    }

    //end = ts[ts.length-1]

    if(!end){
        console.log("NO END")
        console.log("START",start)
        console.log("END",end)
        console.log("TS",ts)
        console.log("POINTS",points)
        console.log("POLYGON",polygon)
        console.log(parameterized_conic)
    }

    // take shortest way around
    if(end[0] < 0){
        end[0] += 2*Math.PI
    }
    if(start[0] < 0){
        start[0] += 2*Math.PI
    }

    // calculate the final t bounds and if there direction to go is different than
    // just substracting the bounds
    let direction = 1
    let first = start//start[0] < end[0]?start:end
    let last = end//start[0] < end[0]?end:start

    let length = last[0]-first[0]
    if(length < 0){
        length += 2*Math.PI
    }

    let change_direction = length >Math.PI
    // not necessarily if the parameterization goes positive or negative, but if it is opposite
    // of the "normal" direction given the bounds
    if (change_direction){

        // come back to this!
        //console.log("SWAP",first,last,length,Math.PI )
        direction = -1
    }


    if (start[0] === Infinity || start[0] === -Infinity || end[0] === Infinity || end[0] === -Infinity){
        console.log("MISS")
        console.log("TS",ts)
        console.log("INTERSECTIONS",intersections)
    }

    // return boundign t's and their associated segments
    return {start_t: start[0],start_segment:start[1],start_point:start[2],end_t:end[0],end_segment:end[1],end_point:end[2],direction:direction,points:points}
}

// a parameterized conic with t bounds
export class ConicSegment {
    constructor(parameterized_conic,start,end,bound,direction = 0){
        this.parameterized_conic = parameterized_conic
        this.start = start
        this.end = end
        this.bound = bound
        this.direction = direction
    }

    // calculate the length of the parameterization
    // might need a second look
    getRange(){

        //let opposite = (this.direction == 1 && this.start > this.end) || (this.direction == -1 && this.start < this.end)

        length = (this.end - this.start)

        if(length < 0){
            length += 2*Math.PI
        }

        
        if(this.direction == -1){
        length -= 2*Math.PI
        }

        return length
    }

    isOn(point){
        let p_c = this.parameterized_conic
        let t = p_c.getTOfPoint(point,true)
        if(t){
            // convert conic segment t to bisector t
            let range = this.getRange()
            // puts the t between 0 and 2PI
            if (t < 0){
                t += 2*Math.PI
            }
            
            if(range < 0){
                if (t < this.start + range){
                    t += 2*Math.PI
                }else if (t > this.start){
                    t -= 2*Math.PI
                }
            }else{
                if (t > this.start + range){
                    t -= 2*Math.PI
                }else if (t < this.start){
                    t += 2*Math.PI
                }
            }
            // turn the t into a percentage of the way through the conic segment
            let percentage = (t - this.start)/range//1 - (t - c_s.start)/range
            if(isLeZero(percentage-1) && isLeZero(-percentage)){
                return true
            }else{
                return false
            }
        }
        return false
    }
}

// given a t-bounded conic, get bounding box
export function calculateConicSegmentBounds(parameterized_conic,start,end,direction = 0){   
    let start_p = parameterized_conic.getPointFromT(start)
    let end_p = parameterized_conic.getPointFromT(end)

    let opposite = (direction == 1 && start > end) || (direction == -1 && start < end)

    // intial bound guess is based on the start and end points
    let bound = new Bound(Math.max(start_p.y,end_p.y),Math.min(start_p.y,end_p.y),Math.min(start_p.x,end_p.x),Math.max(start_p.x,end_p.x))

    let d0_x = parameterized_conic.dx_func()
    
    // The only other possible extrema are when the x and y partial are 0
    for (let i = 0; i < d0_x.length; i++){
        let t = d0_x[i]
        // fix?
        t = (t + 2*Math.PI) % (2*Math.PI)
        let inside = isBetween(start,end,t)
        if(opposite){
            inside = !isBetween(start,end,t)            
        }
        if (inside && (t != Infinity && t == t)){
            let p = parameterized_conic.getPointFromT(t)
            bound.left = Math.min(p.x,bound.left)
            bound.right = Math.max(p.x,bound.right)
        }
    }

    let d0_y = parameterized_conic.dy_func()

    for (let i = 0; i < d0_y.length; i++){
        let t = d0_y[i]
        t = (t + 2*Math.PI) % (2*Math.PI)
        let inside = isBetween(start,end,t)
        if(opposite){
            inside = !isBetween(start,end,t)
        }
        if (inside && (t != Infinity && t == t)){
            let p = parameterized_conic.getPointFromT(t)
            bound.bottom = Math.min(p.y,bound.bottom)
            bound.top = Math.max(p.y,bound.top)
        }
    }

    return bound

}

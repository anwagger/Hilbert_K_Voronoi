import { Point, Segment } from "./primitives"
import { euclideanDistance, isBetween } from "./utils"

class Conic {
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
        return this.A,this.B,this.C,this.D,this.E,this.F,this.G
    }

    intersectLine(segment){
        // nithin's code
        let x1 = segment.start.x;
        let y1 = segment.start.y;
        let x2 = segment.end.x;
        let y2 = segment.end.y;
        let x_diff = x2 - x1;
        let y_diff = y2 - y1;

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


function conicToMatrix(conic){
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

function intersectConicSegments(c_s1,c_s2){
    return approximateConicSegmentIntersection(c_s1,c_s2);
}

function approximateConicSegmentIntersection(c_s1,c_s2){

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
        sub_cs1.push(new ConicSegment(c_s2.parameterized_conic,start2,end2,bound2))
    }

    for (let i = 0; i < split; i++){
        for (let j = 0; j < split; j++){
            if (intersectBounds(sub_cs1[i].bound,sub_cs2[j].bound)){
                let intersection = approximateConicSegmentIntersection(sub_cs1[i],sub_cs2[j])
                if (intersection){
                    return intersection
                }
            }
        }
    }
    return false
}

function parameterizeConic(conic){
    let {straight_conic, angle} = unrotateConic(conic)


    let type = getConicType(straight_conic)
    let orientation = Conic_Orientation.NONE
    let parameterization = {
        x_mult: 0, x_const: 0,
        y_mult: 0, y_const: 0
    }

    let {A,B,C,D,E,F} = straight_conic.getEquation()

    // A,C = 0
    // For this, the edge case is if the line is fully vertical or horizontal
    if (type == Conic_Type.DEGENERATE){
        if (D == 0){
            orientation = Conic_Orientation.VERTICAL
            parameterization.x_mult = -E
            parameterization.x_const = -F/D

            parameterization.y_mult = D
            parameterization.y_const = 0
        }else{
            orientation = Conic_Orientation.HORIZONTAL

            parameterization.x_mult = E
            parameterization.x_const = 0

            parameterization.y_mult = -D
            parameterization.y_const = -F/E
        }

    }else if (type == Conic_Type.PARABOLA){
        if (A === 0){
            orientation = Conic_Orientation.VERTICAL
            //X(t) = E/(-2A)t - D/(2A)
            parameterization.x_mult = E/(-2*A)
            parameterization.x_const = -D/(2*A)
            //Y(t) = E/(-4A)t^2 - (F/E - D^2/(4AE))
            parameterization.y_mult = E/(-4*A)
            parameterization.y_const = -(F/E - D*D/(4*A*E))
        }else if (C === 0){
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
        parameterization.x_mult = Math.sqrt(D*D/(4*A*A) + E*E/(4*C*A))
        parameterization.x_const = -D/(2*A)
        
        //Y(t) = sqrt(E^2/(4C^2) + D^2/(4CA)-F/(C))sin(t) - E/(2C)
        parameterization.y_mult = Math.sqrt(E*E/(4*C*C) + D*D/(4*A*C)-F/C)
        parameterization.y_const = -E/(2*C)
    }else if (type == Conic_Type.HYPERBOLA){
        if (A < 0 && C > 0){
            orientation = Conic_Orientation.HORIZONTAL
            //X(t) = sqrt(D^2/(4A^2) - E^2/(4AC) + F/A)sec(t)+D/(2A)
            parameterization.x_mult = Math.sqrt(D*D/(4*A*A) - E*E/(4*A*C) + F/A)
            parameterization.x_const = D/(2*A)
            //Y(t) = sqrt(-E^2/(4C^2) + D^2/(4AC) + F/C)tan(t)+E/(2C)
            parameterization.y_mult = Math.sqrt(-E*E/(4*C*C) + D*D/(4*A*C) + F/C)
            parameterization.y_const = E/(2*C)
        }else if (A > 0 && C < 0){
            orientation = Conic_Orientation.VERTICAL
            //X(t) = sqrt(-D^2/(4A^2) + E^2/(4AC) + F/A)tan(t)+D/(2A)
            parameterization.x_mult = Math.sqrt(-D*D/(4*A*A) + E*E/(4*A*C) + F/A)
            parameterization.x_const = D/(2*A)
            //Y(t) = sqrt(E^2/(4C^2) - D^2/(4AC) + F/C)sec(t)+E/(2C)
            parameterization.y_mult = Math.sqrt(E*E/(4*C*C) - D*D/(4*A*C) + F/C)
            parameterization.y_const = E/(2*C)
        }
    }

    return new ParameterizedConic(type,orientation,angle,conic,straight_conic,parameterization)
}

// still figuring this out
class ParameterizedConic {
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
                x_func = (t) => this.x_mult*t + x_off
                y_func = (t) => this.y_mult*t + y_off      
                
                xi_func = (x) => [(x - x_off)/this.x_mult]
                yi_func = (y) => [(y  - y_off)/this.y_mult]   
                
                /*
                solving derivatives
                X:
                    0 = cos*x_mult - sin*y_mult
                Y:
                    0 = cos*y_mult + sin*x_mult

                    not super helpful
                */
                
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
                x_func = (t) => this.x_mult*cos(t) + x_off
                y_func = (t) => this.y_mult*sin(t) + y_off

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
                    let t = Math.atan(-sin*y_mult/(cos*x_mult))
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
                            csc(x) = cos*this.x_mult/(sin*this.y_mult)
                            x = acsc(cos*this.x_mult/(sin*this.y_mult))
                        Y: 
                            0 = cos*this.y_mult*sec(t)*sec(t) + sin*this.x_mult*sec(t)*tan(t)
                            csc(x) = -cos*this.y_mult/(sin*this.x_mult)
                            x = acsc(-cos*this.y_mult/(sin*this.x_mult))
                        */
                        dx_func = () => {
                            let t = Math.asin((sin*this.x_mult)/(-cos*this.y_mult))
                            [t,-t + Math.PI]
                        }
                        dy_func = () => {
                            let t = Math.asin((sin*this.x_mult)/(-cos*this.y_mult))
                            [t,-t + Math.PI]
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
                            let t = Math.acos(this.y_mult/(y - y_off))
                            return [t,-t]
                        }
                        /*
                        solving derivates
                        X:
                            0 = cos*this.x_mult*sec(t)*sec(t) - sin*this.y_mult*sec(t)*tan(t)
                            sin(t) = (cos*this.x_mult)/(sin*this.y_mult)
                            t = asin(cos*this.x_mult)/(sin*this.y_mult)
                        Y: 
                            0 = cos*this.y_mult*sec(t)tan(t) + sin*this.x_mult*sec(t)*sec(t)
                            sin(t) = -sin*this.x_mult/(cos*this.y_mult)
                            t = asin(-sin*this.x_mult/(cos*this.y_mult))
                        */
                       dx_func = () => {
                            let t = Math.asin((cos*this.x_mult)/(sin*this.y_mult))
                            return [t,-t + Math.PI]
                       }
                       dy_func = () => {
                            let t = Math.asin((-sin*this.x_mult)/(cos*this.y_mult))
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
            new Point(cos*x_t - sin*y_t,cos*y_t + sin*x_t)
        }  
    }
    // gets the function that gets the point of a given t on the straight conic
    getUnrotatedFunction(){
        let {x,y} = this.getVariableFunctions()
        return (t)=> new Point(x(t),y(t)) 
    }

    // checks if equation is satisfies
    isOn(point){
        let x = point.x
        let y = point.y
        let {A,B,C,D,E,F} = this.conic.getEquation()
        return A *x*x + B *x*y + C *y*y + D *x  + E *y + F === 0
    }

    getTOfPoint(point){
        // TODO
        /*
            parameterize the unrotated conic
            rotate point to be in live with unrotated conic
            inverse should then be easy*
        */
       let sin = Math.sin(this.angle)
       let cos = Math.cos(this.angle)
       // reverse rotation?
       let x = cos* point.x + sin * point.y
       let y = cos*point.y - sin * point.x
        if (this.isOn(point)){
            let x_ts = this.xi_func(x,y)
            let y_ts = this.yi_func(x,y)
            for (let i = 0; i < x_ts.length; i++){
                for (let j = 0; j < y_ts.length; j++){
                    if (x_ts[i] === y_ts[j]){
                        return x_ts[i]
                    }
                }
            }
        }
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

vertical: (CHECK)yeah?

X(t) = sqrt(-D^2/(4A^2) + E^2/(4AC) + F/A)tan(t)+D/(2A)
Y(t) = sqrt(E^2/(4C^2) - D^2/(4AC) + F/C)sec(t)+E/(2C)


rotating back - probably don't need vert/hor

X0(t) = cos(theta)*X(t)-sin(theta)*Y(t)
Y0(t) = cos(theta)*Y(t)+sin(theta)*X(t)
*/


const Conic_Type = {
    DEGENERATE: 0,
    PARABOLA: 1,
    ELLIPSE: 2,
    HYPERBOLA: 3,
}

const Conic_Orientation = {
    HORIZONTAL: 1,
    VERTICAL: 2,
    NONE: 0
}

function getConicType(conic){
    const c = conic
    const d = c.B*c.B - 4*c.A*c.C
    if (d === 0){
        if (c.A === 0 && c.C === 0){
            return Conic_Type.DEGENERATE
        }else{
            return Conic_Type.PARABOLA
        }
    }else if (d > 0){
        return Conic_Type.HYPERBOLA
    }else{
        return Conic_Type.ELLIPSE
    }
}

function bisectorConicFromSector(boundary,sector){
    let points = boundary.points
    const [a1,a2,a3] = lineEquation(new Segment(points[sector.p1_enter],points[(sector.p1_enter+1) % points.length]))
    const [b1,b2,b3] = lineEquation(new Segment(points[sector.p1_exit],points[(sector.p1_exit+1) % points.length]))
    const [c1,c2,c3] = lineEquation(new Segment(points[sector.p2_enter],points[(sector.p2_enter+1) % points.length]))
    const [d1,d2,d3] = lineEquation(new Segment(points[sector.p2_exit],points[(sector.p2_exit+1) % points.length]))

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

function getConicParameterBoundsInPolygon(parameterized_conic,polygon){
    let intersections = parameterized_conic.conic.intersectPolygon(polygon)

    let ts = []
    for (let segment_num = 0; segment_num < intersections; segment_num++){
        for (let point in intersections[segment_num]) {
            // keep track of t and which segment it collided with
            ts.push([parameterized_conic.getTOfPoint(point),segment_num])
        }
    }
    let start = [Infinity,-1]
    let end = [-Infinity,-1]
    for (let t in ts){
        if (t[0] < start[0]){
            start = t
        }
        if(t[0] > end[0]){
            end = t
        }
        
    }
    // return boundign t's and their associated segments
    return start[0],start[1],end[0],end[1]
}

function unrotateConic(c){
    
    let conic_p = new Conic(0,0,0,0,0,0);

    const theta = 0.5 * Math.atan2(c.B,c.A-c.C)

    const c_t = Math.cos(theta)
    const s_t = Math.sin(theta)

    conic_p.A = c.A*(c_t*c_t) + c.B*s_t + c.C*(s_t*s_t)
    conic_p.B = 0
    conic_p.C = c.A * (s_t*s_t) - c.B * c_t * s_t + c.C*(c_t*c_t)
    conic_p.D = c.D * c_t + E * s_t
    conic_p.E = -c.D*s_t + c.E * c_t
    conic_p.F = c.F

    return {conic_p,theta}
}

class ConicSegment {
    constructor(parameterized_conic,start,end,bound){
        this.parameterized_conic = parameterized_conic
        this.start = start
        this.end = end
        this.bound = bound
    }
}

function calculateConicSegmentBounds(parameterized_conic,start,end){   
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

export {Conic, ConicSegment}
import { Point } from "./primitives"

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
        // get x and y for 
        switch (this.type){
            case Conic_Type.DEGENERATE:
                x_func = (t) => this.x_mult*t + x_off
                y_func = (t) => this.y_mult*t + y_off              
            break;
            case Conic_Type.PARABOLA:
                switch (this.orientation){
                    case Conic_Orientation.HORIZONTAL:
                        x_func = (t) => this.x_mult*t*t + x_off
                        y_func = (t) => this.y_mult*t + y_off
                    break;
                    case Conic_Orientation.VERTICAL:
                        x_func = (t) => this.x_mult*t + x_off
                        y_func = (t) => this.y_mult*t*t + y_off
                    break;
                }
            break;
            case Conic_Type.ELLIPSE:
                x_func = (t) => this.x_mult*cos(t) + x_off
                y_func = (t) => this.y_mult*sin(t) + y_off
            break;
            case Conic_Type.HYPERBOLA:
                switch (this.orientation){
                    case Conic_Orientation.HORIZONTAL:
                        x_func = (t) => this.x_mult / Math.cos(t) + x_off
                        y_func = (t) => this.y_mult * Math.tan(t) + y_off
                    break;
                    case Conic_Orientation.VERTICAL:
                        x_func = (t) => this.x_mult * Math.tan(t) + x_off
                        y_func = (t) => this.y_mult / Math.cos(t) + y_off
                    break;
                }
            break;
        }
        
        return {x_func, y_func}

    }
    // gets a function that gets the point of a given t on the conic
    getPointFunction(){
        let {x,y} = this.getVariableFunctions()
        // unrotate the conic
        let sin = Math.sin(this.angle)
        let cos = Math.cos(this.angle)
        return (t)=> {
            let x_t = x(t)
            let y_t = y(t)
            new Point(cos*x_t - sin*y_t,cos*y_t + sin*x_t)
        }  
    }
    // gets the function that gets the point of a given t on the straight conic
    getUnrotatedFunction(){
        let {x,y} = this.getVariableFunctions()
        return (t)=> new Point(x(t),y(t)) 
    }
    // gets the function that given a point gives the t where the point collides
    // NOT DONE????
    getUnrotatedInverseFunction(){
        const sin = Math.sin(this.angle)
        const cos = Math.cos(this.angle)

        let x_off = this.x_const
        let y_off = this.y_const

        if (center){
            x_off = 0
            y_off = 0
        }

        let t_func = (x,y) => Infinity
        // get x and y for 
        switch (this.type){
            case Conic_Type.DEGENERATE:
                t_func = (x,y) => (x - x_off)/this.x_mult
                //t_func(x,y) => (y  - y_off)/this.y_mult           
            break;
            case Conic_Type.PARABOLA:
                switch (this.orientation){
                    case Conic_Orientation.HORIZONTAL:

                        //x_func = (t) => this.x_mult*t*t + x_off
                        t_func = (x,y) => Math.sqrt((x-x_off)/this.x_mult)
                        //y_func = (t) => this.y_mult*t + y_off
                        //t_func = (x,y) => (y - y_off)/this.y_mult
                    break;
                    case Conic_Orientation.VERTICAL:
                        //x_func = (t) => this.x_mult*t + x_off
                        //t_func = (x,y) => (x - x_off)/this.x_mult
                        //y_func = (t) => this.y_mult*t*t + y_off
                        t_func = (x,y) => Math.sqrt((y-y_off)/this.y_mult)
                    break;
                }
            break;
            case Conic_Type.ELLIPSE:
                //x_func = (t) => this.x_mult*cos(t) + x_off
                t_func = (x,y) => Math.acos((x - x_off)/this.x_mult)
                //y_func = (t) => this.y_mult*sin(t) + y_off
                t_func = (x,y) => Math.asin((y - y_off)/this.y_mult)
            break;
            case Conic_Type.HYPERBOLA:
                switch (this.orientation){
                    case Conic_Orientation.HORIZONTAL:
                        //x_func = (t) => this.x_mult / Math.cos(t) + x_off
                        t_func = (x,y) => Math.acos(this.x_mult/(x - x_off))
                        //y_func = (t) => this.y_mult * Math.tan(t) + y_off
                        //t_func = (x,y) => Math.atan((y-y_off)/this.y_mult)
                    break;
                    case Conic_Orientation.VERTICAL:
                        //x_func = (t) => this.x_mult * Math.tan(t) + x_off
                        //t_func = (x,y) => Math.atan((x-x_off)/this.x_mult)
                        //y_func = (t) => this.y_mult / Math.cos(t) + y_off
                        t_func = (x,y) => Math.acos(this.y_mult/(y - y_off))
                    break;
                }
            break;
        }
        // unrotate the conic
        return t_func
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
            rotate point to be in live with unrotated conic (reverse the angle: [cx + sy , cy - sx])
            inverse should then be easy*
        */
    }

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
/*
Aside about conics!

can unrotate a conic, then keep the angle

parameterize the conic, then multiply it by the rotation matrix for the negative angle!

this is how we'll parameterize them?

more complex, but...

*/


function bisectorConicFromSector(boundary,sector){
    const [a1,a2,a3] = lineEquation(sector.p1_enter)
    const [b1,b2,b3] = lineEquation(sector.p1_exit)
    const [c1,c2,c3] = lineEquation(sector.p2_enter)
    const [d1,d2,d3] = lineEquation(sector.p2_exit)

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
    constructor(conic,start,end,bound){
        this.conic = conic
        this.start = start
        this.end = end
        this.bound = bound
    }
}

export {Conic, ConicSegment}
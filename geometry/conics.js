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
}


// still figuring this out
class ParameterizedConic {
    constructor(type,angle,conic){

    }
}

const Conic_Type = {
    DEGENERATE: 0,
    PARABOLA: 1,
    ELLIPSE: 2,
    HYPERBOLA: 3,
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

    return conic_p,theta
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
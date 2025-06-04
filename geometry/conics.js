class conic {
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

class conic_segment {
    constructor(conic,start,end,bound){
        this.conic = conic
        this.start = start
        this.end = end
        this.bound = bound
    }
}
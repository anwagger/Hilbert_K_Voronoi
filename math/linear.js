import c from "./complex.js"

let Complex = c.Complex

export function complex(re,im){
    return new Complex(re,im)
}

export function makeMatrixComplex(matrix){
    let c_matrix = []
    for(let i = 0; i < matrix.length; i++){
        c_matrix.push([])
        for(let j = 0; j < matrix[i].length; j++){
            c_matrix[i].push(new Complex(matrix[i][j]))
        }
    }
    return c_matrix
}

export function pointToVector(point){
    return [complex(point.x),complex(point.y),complex(1)]
}

export function scaleVector(v,s){
    let new_v = []
    for(let i = 0; i < v.length; i++){
        new_v.push(v[i].mul(new Complex(s)))
    }
    return new_v
}

export function standardizePoint(v){
    return scaleVector(v,complex(1).div(v[2]))
}

export function addVectors(v1,v2){
    let new_v = []
    for(let i = 0; i < v1.length; i++){
        new_v.push(v1[i].add(v2[i]))
    }
    return new_v
}

export function determinant2(m){
    return m[0][0].mul(m[1][1]).sub(m[1][0].mul(m[0][1]))
}

export function transform(matrix,vector){
    let new_vector = []
    for(let i = 0; i < matrix.length; i++){
        let value = new Complex(0)
        for(let j = 0; j < matrix[i].length; j++){
            value = value.add(vector[j].mul(matrix[i][j]))
        }
        new_vector.push(value)
    }
    return new_vector
}

export function dotProduct(v1,v2){
    let prod = complex(0)
    for(let i = 0; i < v1.length; i++){
        prod = prod.add(v1[i].mul(v2[i]))
    }
    return prod
}


export function crossProduct(l1,l2){
    return [
        l1[1].mul(l2[2]).sub(l1[2].mul(l2[1])),
        l1[2].mul(l2[0]).sub(l1[0].mul(l2[2])),
        l1[0].mul(l2[1]).sub(l1[1].mul(l2[0]))
    ]
}

export function rowReduceMatrix(m){
    let new_m = [...m]
    for(let i = 0; i < m.length; i++){
        for(let j = 0; j < m.length; j++){
            if(i != j){
                if(new_m[i][i] != 0){
                    let scale = new_m[j][i].div(new_m[i][i]).neg()
                    let scaled_vector = scaleVector(new_m[i],scale)
                    let changed = addVectors(new_m[j],scaled_vector)
                    new_m[j] = changed
                }
            }else{
                if(new_m[i][i] != 0){
                    let scale = (new Complex(1)).div(new_m[i][i])
                    let scaled_vector = scaleVector(new_m[i],scale)
                    new_m[i] = scaled_vector
                }
            }
        }
    }
    return new_m
}

export function invert33Matrix(m){
    let big_m = []
    for(let i = 0; i < m.length; i++){
        big_m.push([])
        for(let j = 0; j < m[i].length; j++){
            let copy = new Complex(m[i][j].re,m[i][j].im)
            big_m[i].push(copy)
        }
    }
    big_m[0].push(new Complex(1),new Complex(0),new Complex(0))
    big_m[1].push(new Complex(0),new Complex(1),new Complex(0))
    big_m[2].push(new Complex(0),new Complex(0),new Complex(1))

    for(let i = 0; i < m.length; i++){
        for(let j = 0; j < m.length; j++){
            if(i != j){
                if(big_m[i][i] != 0){
                    let scale = big_m[j][i].div(big_m[i][i]).neg()
                    let scaled_vector = scaleVector(big_m[i],scale)
                    let changed = addVectors(big_m[j],scaled_vector)
                    big_m[j] = changed
                }
            }else{
                if(big_m[i][i] != 0){
                    let scale = (new Complex(1)).div(big_m[i][i])
                    let scaled_vector = scaleVector(big_m[i],scale)
                    big_m[i] = scaled_vector
                }
            }
        }
    }
    let i_matrix = []
    for(let i = 0; i < big_m.length; i++){
        i_matrix.push([])
        for(let j = big_m.length; j < 2*big_m.length; j++){
            i_matrix[i].push(big_m[i][j])
        }
    }
    return i_matrix
}
export function transposeSquare(m){
    let new_m = []
    for(let i = 0; i < m.length; i++){
        new_m.push([])
        for(let j = 0; j < m.length; j++){
            new_m[i].push(m[j][i])
        }
    }
    return new_m
}

export function multiplyMatrix(m1,m2){
    let new_m = []
    for(let i = 0; i < m1.length; i++){
        let vec = []
        for(let j = 0; j < m1.length; j++){
            vec.push(m2[i][j])
        } 
        new_m.push(transform(m1,vec))
    }
    return (new_m)
}

export function multiplyMatrix2(m1,m2){
    let new_m = []
    for(let i = 0; i < m2[0].length; i++){
        new_m.push([])
    }
    for(let i = 0; i < m2[0].length; i++){
        let vec = []
        
        for(let j = 0; j < m1.length; j++){
            vec.push(m2[j][i])
        }
        for(let j = 0; j < m1.length; j++){
            new_m[j].push(dotProduct(m1[j],vec))
        }
    }
    return new_m
}
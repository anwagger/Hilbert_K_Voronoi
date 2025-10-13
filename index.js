import {CAMERA,DrawableBisector,DrawableConicSegment, DrawablePoint, DrawablePolygon, DrawableSegment} from "./drawing/drawable.js"
import {Canvas} from "./drawing/canvas/canvas.js"
import {Point, Polygon, Segment, Spoke} from "./geometry/primitives.js"
import { calculateBisector, calculateMidsector, calculateSector,calculateSectorTesting,testBisectorSector, calculateSpokes, HilbertPoint,getSectorNeighbors } from "./geometry/hilbert.js";
import { convexHull } from "./geometry/utils.js";
import { Conic, ConicSegment, parameterizeConic,bisectorConicFromSector,getConicParameterBoundsInSector, ParameterizedConic, matrixConicIntersection } from "./geometry/conics.js";
import { invert33Matrix, makeMatrixComplex, transform,complex, scaleVector, addVectors, multiplyMatrix } from "./math/linear.js";


let canvasElement = document.getElementById('canvas');
let canvas = new Canvas(canvasElement);
let ctx = canvas.ctx;
console.log(canvas);  

/*
let m = [[1,2,2],[4,5,6],[9,8,9]] 
let c_m = makeMatrixComplex(m)
console.log(c_m)
let c_vec  =[complex(1),complex(1),complex(2)]
console.log(c_vec)
console.log("SCALE",scaleVector(c_vec,10))
console.log("ADD",addVectors(c_vec,c_vec))
console.log("TRANS",transform(c_m,c_vec))

let i_c_m =  invert33Matrix(c_m)
console.log(i_c_m)
let i_i_c_m =  invert33Matrix(i_c_m)

console.log(c_m,i_c_m)
console.log("MATMULT",multiplyMatrix(c_m,i_c_m))
console.log(c_m)

console.log(i_i_c_m)

let id2 = makeMatrixComplex([[2,0,0],[0,2,0],[0,0,2]])
let m2 = multiplyMatrix(id2,c_m)
console.log("MATMULT I",m2)

let c1 = new Conic({A:2,B:0,C:-5,D:0,E:1,F:0})
let c2 = new Conic({A:-9,B:0,C:6,D:-3,E:3,F:0})
let p_c1 = parameterizeConic(c1)
let p_c2 = parameterizeConic(c2)
console.log("CONICS",p_c1,p_c2)
let ints = matrixConicIntersection(p_c1,p_c2)
 */
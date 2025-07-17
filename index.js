import {CAMERA,DrawableBisector,DrawableConicSegment, DrawablePoint, DrawablePolygon, DrawableSegment} from "./drawing/drawable.js"
import {Canvas} from "./drawing/canvas/canvas.js"
import {Point, Polygon, Segment, Spoke} from "./geometry/primitives.js"
import { calculateBisector, calculateMidsector, calculateSector,calculateSectorTesting,testBisectorSector, calculateSpokes, HilbertPoint,getSectorNeighbors } from "./geometry/hilbert.js";
import { convexHull } from "./geometry/utils.js";
import { Conic, ConicSegment, parameterizeConic,bisectorConicFromSector,getConicParameterBoundsInPolygon } from "./geometry/conics.js";
import { invert33Matrix, makeMatrixComplex, transform,complex, scaleVector, addVectors, multiplyMatrix } from "./math/linear.js";


let canvasElement = document.getElementById('canvas');
let canvas = new Canvas(canvasElement);
let ctx = canvas.ctx;
console.log(canvas);  

/**
let m = [[1,2,2],[4,5,6],[9,8,9]] 
let c_m = makeMatrixComplex(m)
console.log(c_m)
let c_vec  =[complex(1),complex(1),complex(1)]
console.log(c_vec)
console.log("SCALE",scaleVector(c_vec,10))
console.log("ADD",addVectors(c_vec,c_vec))
console.log("TRANS",transform(c_m,c_vec))

let i_c_m =  invert33Matrix(c_m)
console.log(i_c_m)
let i_i_c_m =  invert33Matrix(i_c_m)

console.log(i_i_c_m)

let id = makeMatrixComplex([[1,0,0],[0,1,0],[0,0,1]])
let m2 = multiplyMatrix(id,id)
console.log("MATMULT",m2)
 */
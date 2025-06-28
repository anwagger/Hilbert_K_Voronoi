import {Point, Segment} from "./primitives.js"

export function euclideanDistance(point1,point2){
    let dx = point1.x - point2.x
    let dy = point1.y - point2.y
    return Math.sqrt(dx * dx + dy * dy)
}

export function halfCrossRatio(point1,point2,edge_point){
    return euclideanDistance(point1,edge_point)/euclideanDistance(point2,edge_point)
}

export function weakFunk(point1, point2, edge_point){
    return Math.log(halfCrossRatio(point1,point2,edge_point))
}

export function crossRatio(edge1, point1, point2, edge2){
    return halfCrossRatio(point1,point2,edge2) * halfCrossRatio(point2,point1,edge1)
}  

export function hilbertMetric(edge1, point1, point2, edge2){
    return 0.5 * Math.log(crossRatio(edge1,point1,point2,edge2))
}

export function calculateHilbertDistance(boundary,point1,point2){
  const mid = new Segment(point1,point2);
  const points = boundary.points;
  const ints = [];
  let count = 0;
  for (let p = 0; p < points.length; p++) {
      const p2 = (p + 1) % points.length;
      const seg = new Segment(points[p], points[p2]);
      const i = intersectSegmentsAsLines(mid, seg);
      if (i !== null) {
      //println("GOOD",mid.start,mid.end,i,seg.start,seg.end,pointSegDistance(i,seg));
          if (pointSegDistance(i, seg) <= sensitivity) {
              if (count > 0) {
                  if (euclideanDistance(i, ints[0]) <= sensitivity) {
                      // replace point as to not have
                      count--;
                  }
              }
              ints[count] = i;
              count++;
          }
      }

      if (count > 1) break;
  }

  if (count === 2) {
    const first = euclideanDistance(p, ints[0]) < euclideanDistance(point, ints[0])? ints[0]:ints[1];
    const last = euclideanDistance(p, ints[0]) < euclideanDistance(point, ints[0])? ints[1]:ints[0];
    let hilbert = 0;
    return hilbertMetric(first, p, point, last);
  }
  return NaN
}

export function lineEquation(segment){
    const p1 = segment.start
    const p2 = segment.end
    const a = p2.y - p1.y
    const b = p1.x - p2.x
    const c = p2.x * p1.y - p1.x * p2.y

    return {a:a, b:b, c:c}
}


export function pointSegDistance(point, segment) {
  // projection parameter t of 'point' onto the line AB
  const {x: px, y: py} = point;
  const {start: {x: x1, y: y1}, end: {x: x2, y: y2}} = segment;
  const seg_len = (x2 - x1) ** 2 + (y2 - y1) ** 2;

  if (seg_len === 0) return Math.hypot(px - x1, py - y1); 

  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / seg_len;
  t = Math.max(0, Math.min(1, t));                       

  const qx = x1 + t * (x2 - x1);                          
  const qy = y1 + t * (y2 - y1);

  return Math.hypot(px - qx, py - qy);                    
}

export function intersectSegmentsAsLines(s1, s2) {
  const {a:a1, b:b1, c:c1} = lineEquation(s1)
  const {a:a2, b:b2, c:c2} = lineEquation(s2)

  const denominator = (a1 * b2) - (a2 * b1)

  if (isZero(denominator)) {
    return null; 
  }

  const x = ((b1 * c2) - (b2 * c1)) / denominator
  const y = ((c1 * a2) - (c2 * a1)) / denominator
  return new Point(x, y)
}

export function isBetween(a, b, c){
  return (isLeZero(a-c) && isLeZero(c-b)) || (isLeZero(b-c) && isLeZero(c-a));
}

// copied from nithins code, might need to be changed
export function intersectSegments(s1, s2) {
  let point = intersectSegmentsAsLines(s1, s2)

  
  if (point) {


    // only want to make sure it lands on seg_2?
    const is_on_seg1 = isBetween(s1.start.x, s1.end.x, point.x) && isBetween(s1.start.y, s1.end.y, point.y);
    const is_on_seg2 = isBetween(s2.start.x, s2.end.x, point.x) && isBetween(s2.start.y, s2.end.y, point.y);

    if (is_on_seg2 && is_on_seg1) {
      return point;
    }    
  }
  return null;
}


// polygon is made up of a list of points, can use that list of points to define segments 
// and see if the segment param intersects with any
export function segmentIntersectsPolygon(segment, polygon) {
    const points = polygon.points;
    const n = points.length;

    for (let i = 0; i < n; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % n]; 
        const poly_seg = new Segment(p1, p2);

        if (intersectSegments(segment, poly_seg)) {
            return true;
        }
    }

    return false;
}

export function pointOnPolygon(point,polygon){
    const points = polygon.points;
    const n = points.length;

    for (let i = 0; i < n; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % n];
        if (isZero(pointSegDistance(point,new Segment(p1,p2)))){
          return true
        }
    }
    return false
}

// uses ray casting to determine if a point is in a polygon
// not correct?
export function pointInPolygon(point, polygon) {
    const {x, y} = point;
    const points = polygon.points;
    const n = points.length;
    let intersections = 0;

    for (let i = 0; i < n; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % n];

        // added later...
        if (isZero(pointSegDistance(point,new Segment(p1,p2)))){
          return true
        }

        if (Math.min(p1.y, p2.y) < y && y <= Math.max(p1.y, p2.y) &&
            x < (p2.x - p1.x) * (y - p1.y) / (p2.y - p1.y) + p1.x){
                intersections += 1
            }
    }

    if (intersections % 2 === 0) {
        return false;
    }

    return true;
}

export function solveQuadratic(a, b, c) {
  const discriminant = b * b - 4 * a * c;
  
  if (discriminant > 0) {
    const sqrtDiscriminant = Math.sqrt(discriminant);
    return [
      (-b + sqrtDiscriminant) / (2 * a),
      (-b - sqrtDiscriminant) / (2 * a)
    ];
  } else if (discriminant === 0) {
      return [-b / (2 * a)];
  } else {
      return [];
  }
}

export function createSegmentsFromPoints(points) {
  let n = points.length;
  if (n === 0) { return []; } 
  else {
      const segments = [];
      for (let i = 0; i < n; i++) {
        const start = points[i];
        const end = points[(i + 1) % n];
        segments.push(new Segment(start,end));
      }
      return segments;
  }
}

export function convexHull(points) {
  if (points.length === 0) {
      console.warn('convexHull called with an empty array.');
      return [];
  }
  if (points.length === 1) {
      return [points[0]];
  }
  if (points.length === 2) {
      return points;
  }

  // Clone and sort the points
  let sortedPoints = points.slice().sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      return a.y - b.y;
  });

  const cross = (o, a, b) => {
      return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  };

  let lower = [];
  for (let p of sortedPoints) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
          lower.pop();
      }
      lower.push(p);
  }

  let upper = [];
  for (let i = sortedPoints.length - 1; i >= 0; i--) {
      let p = sortedPoints[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
          upper.pop();
      }
      upper.push(p);
  }

  // Concatenate lower and upper to get full hull, excluding last point of each (duplicates)
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}


export function intersectBounds(b1,b2){
    return b1.top >= b2.bottom && b1.bottom <= b2.top && b1.left <= b2.right && b1.right >= b2.left
}

export function computeBoundingBox(polygon) {
        let min_x = Infinity;
        let max_x = -Infinity;
        let min_y = Infinity;
        let max_y = -Infinity;
        for (p in polygon.points) {
            min_x = Math.min(min_x,p.x);
            max_x = Math.max(max_x, p.x);
            min_y = Math.min(min_y, p.y);
            max_y = Math.max(max_y, p.y);
        }
        return Bound(min_x,max_x,min_y,max_y);
    }

export function computeClosestBound(bounds, point) {
    curr = 0;
    
    for (b in bounds) {
      curr = Math.min(Math.abs(curr - point), Math.abs(b.left - point), Math.abs(b.right - point));
    }

    return curr;
}

export function cleanArray(arr){
  let new_arr = []
  for(let i = 0; i < arr.length; i++){
    if(arr[i] != null){
      new_arr.push(arr[i])
    }
  }
  return new_arr
}

export function isZero(num){
  return (Math.abs(num) <= 1e-4)
}

export function hasSign(num){
  if (isZero(num)){
    return 0
  }else if( num > 0){
    return 1
  }else{
    -1
  }
}

export function isLeZero(num){
  return num <= 1e-10
}

// credit https://stackoverflow.com/questions/966225/how-can-i-create-a-two-dimensional-array-in-javascript/966938#966938
export function matrix( rows, cols, defaultValue){

  var arr = [];

  // Creates all lines:
  for(var i=0; i < rows; i++){

      // Creates an empty line
      arr.push([]);

      // Adds cols to the empty line:
      arr[i].push( new Array(cols));

      for(var j=0; j < cols; j++){
        // Initializes:
        arr[i][j] = defaultValue;
      }
  }

return arr;
}

export function matrix3D( rows, cols,height, defaultValue){
  let arr = []
  for(let i = 0; i < rows; i++){
    arr.push(matrix(cols,height,defaultValue))
  }
  return arr
}


// credit: https://stackoverflow.com/questions/1573053/javascript-function-to-convert-color-names-to-hex-codes
// wont need this if we standardize color names but andrew started with text so its just convenient to use this rn lowkey
export function colorNameToHex(colour)
{
    const colours = {"aliceblue":"#f0f8ff","antiquewhite":"#faebd7","aqua":"#00ffff","aquamarine":"#7fffd4","azure":"#f0ffff",
    "beige":"#f5f5dc","bisque":"#ffe4c4","black":"#000000","blanchedalmond":"#ffebcd","blue":"#0000ff","blueviolet":"#8a2be2","brown":"#a52a2a","burlywood":"#deb887",
    "cadetblue":"#5f9ea0","chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed","cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff",
    "darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b","darkgray":"#a9a9a9","darkgreen":"#006400","darkkhaki":"#bdb76b","darkmagenta":"#8b008b","darkolivegreen":"#556b2f",
    "darkorange":"#ff8c00","darkorchid":"#9932cc","darkred":"#8b0000","darksalmon":"#e9967a","darkseagreen":"#8fbc8f","darkslateblue":"#483d8b","darkslategray":"#2f4f4f","darkturquoise":"#00ced1",
    "darkviolet":"#9400d3","deeppink":"#ff1493","deepskyblue":"#00bfff","dimgray":"#696969","dodgerblue":"#1e90ff",
    "firebrick":"#b22222","floralwhite":"#fffaf0","forestgreen":"#228b22","fuchsia":"#ff00ff",
    "gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700","goldenrod":"#daa520","gray":"#808080","green":"#008000","greenyellow":"#adff2f",
    "honeydew":"#f0fff0","hotpink":"#ff69b4",
    "indianred ":"#cd5c5c","indigo":"#4b0082","ivory":"#fffff0","khaki":"#f0e68c",
    "lavender":"#e6e6fa","lavenderblush":"#fff0f5","lawngreen":"#7cfc00","lemonchiffon":"#fffacd","lightblue":"#add8e6","lightcoral":"#f08080","lightcyan":"#e0ffff","lightgoldenrodyellow":"#fafad2",
    "lightgrey":"#d3d3d3","lightgreen":"#90ee90","lightpink":"#ffb6c1","lightsalmon":"#ffa07a","lightseagreen":"#20b2aa","lightskyblue":"#87cefa","lightslategray":"#778899","lightsteelblue":"#b0c4de",
    "lightyellow":"#ffffe0","lime":"#00ff00","limegreen":"#32cd32","linen":"#faf0e6",
    "magenta":"#ff00ff","maroon":"#800000","mediumaquamarine":"#66cdaa","mediumblue":"#0000cd","mediumorchid":"#ba55d3","mediumpurple":"#9370d8","mediumseagreen":"#3cb371","mediumslateblue":"#7b68ee",
    "mediumspringgreen":"#00fa9a","mediumturquoise":"#48d1cc","mediumvioletred":"#c71585","midnightblue":"#191970","mintcream":"#f5fffa","mistyrose":"#ffe4e1","moccasin":"#ffe4b5",
    "navajowhite":"#ffdead","navy":"#000080",
    "oldlace":"#fdf5e6","olive":"#808000","olivedrab":"#6b8e23","orange":"#ffa500","orangered":"#ff4500","orchid":"#da70d6",
    "palegoldenrod":"#eee8aa","palegreen":"#98fb98","paleturquoise":"#afeeee","palevioletred":"#d87093","papayawhip":"#ffefd5","peachpuff":"#ffdab9","peru":"#cd853f","pink":"#ffc0cb","plum":"#dda0dd","powderblue":"#b0e0e6","purple":"#800080",
    "rebeccapurple":"#663399","red":"#ff0000","rosybrown":"#bc8f8f","royalblue":"#4169e1",
    "saddlebrown":"#8b4513","salmon":"#fa8072","sandybrown":"#f4a460","seagreen":"#2e8b57","seashell":"#fff5ee","sienna":"#a0522d","silver":"#c0c0c0","skyblue":"#87ceeb","slateblue":"#6a5acd","slategray":"#708090","snow":"#fffafa","springgreen":"#00ff7f","steelblue":"#4682b4",
    "tan":"#d2b48c","teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347","turquoise":"#40e0d0",
    "violet":"#ee82ee",
    "wheat":"#f5deb3","white":"#ffffff","whitesmoke":"#f5f5f5",
    "yellow":"#ffff00","yellowgreen":"#9acd32"};

    if (typeof colours[colour.toLowerCase()] != 'undefined')
        return colours[colour.toLowerCase()];

    return false;
}

// credit: https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
export function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function avgColor(c1,c2){
      let h1 = colorNameToHex(c1)
      let rgb1 = hexToRgb(h1?h1:c1) 
      let h2 = colorNameToHex(c2)
      let rgb2 = hexToRgb(h2?h2:c2)
      let r = Math.floor((rgb1.r + rgb2.r)/2).toString(16)
      if(r.length === 1){
        r = "0" + r
      }
      let g = Math.floor((rgb1.g + rgb2.g)/2).toString(16) 
      if(g.length === 1){
        g = "0" + g
      }
      let b = Math.floor((rgb1.b + rgb2.b)/2).toString(16)
      if(b.length === 1){
        b = "0" + b
      }
      let new_color = "#" + r + g + b
      console.log("COLOR",c1,c2,new_color)
      return new_color

}

export function pushOrCreateInObject(obj,index,value){
  if (!obj[index]){
    obj[index] = []
  }
  obj[index].push(value)
}
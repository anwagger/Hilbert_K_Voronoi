import { getPointOnSpoke } from "./balls.js";
import { calculateHilbertPoint, calculateMidsector } from "./hilbert.js";
import {Bound, Point, Segment, Polygon} from "./primitives.js"

export const colors = {"aqua":"#00ffff","aquamarine":"#7fffd4",
    "black":"#000000","blue":"#0000ff","blueviolet":"#8a2be2","brown":"#a52a2a","burlywood":"#deb887",
    "cadetblue":"#5f9ea0","chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed","crimson":"#dc143c","cyan":"#00ffff",
    "darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b","darkgray":"#a9a9a9","darkgreen":"#006400","darkkhaki":"#bdb76b","darkmagenta":"#8b008b","darkolivegreen":"#556b2f",
    "darkorange":"#ff8c00","darkorchid":"#9932cc","darkred":"#8b0000","darksalmon":"#e9967a","darkseagreen":"#8fbc8f","darkslateblue":"#483d8b","darkslategray":"#2f4f4f","darkturquoise":"#00ced1",
    "darkviolet":"#9400d3","deeppink":"#ff1493","deepskyblue":"#00bfff","dimgray":"#696969","dodgerblue":"#1e90ff",
    "firebrick":"#b22222","forestgreen":"#228b22","fuchsia":"#ff00ff",
    "gainsboro":"#dcdcdc","gold":"#ffd700","goldenrod":"#daa520","gray":"#808080","green":"#008000","greenyellow":"#adff2f",
    "hotpink":"#ff69b4","indianred ":"#cd5c5c","indigo":"#4b0082","khaki":"#f0e68c",
    "lavender":"#e6e6fa","lawngreen":"#7cfc00","lightblue":"#add8e6","lightcoral":"#f08080",
    "lightgrey":"#d3d3d3","lightgreen":"#90ee90","lightpink":"#ffb6c1","lightsalmon":"#ffa07a","lightseagreen":"#20b2aa","lightskyblue":"#87cefa","lightslategray":"#778899","lightsteelblue":"#b0c4de",
    "lime":"#00ff00","limegreen":"#32cd32","magenta":"#ff00ff","maroon":"#800000","mediumaquamarine":"#66cdaa","mediumblue":"#0000cd","mediumorchid":"#ba55d3","mediumpurple":"#9370d8","mediumseagreen":"#3cb371","mediumslateblue":"#7b68ee",
    "mediumspringgreen":"#00fa9a","mediumturquoise":"#48d1cc","mediumvioletred":"#c71585","midnightblue":"#191970","moccasin":"#ffe4b5",
    "navy":"#000080","olive":"#808000","olivedrab":"#6b8e23","orange":"#ffa500","orangered":"#ff4500","orchid":"#da70d6",
    "palegoldenrod":"#eee8aa","palegreen":"#98fb98","paleturquoise":"#afeeee","palevioletred":"#d87093","peachpuff":"#ffdab9","peru":"#cd853f","pink":"#ffc0cb","plum":"#dda0dd","powderblue":"#b0e0e6","purple":"#800080",
    "rebeccapurple":"#663399","red":"#ff0000","rosybrown":"#bc8f8f","royalblue":"#4169e1",
    "saddlebrown":"#8b4513","salmon":"#fa8072","sandybrown":"#f4a460","seagreen":"#2e8b57","sienna":"#a0522d","silver":"#c0c0c0","skyblue":"#87ceeb","slateblue":"#6a5acd","slategray":"#708090","springgreen":"#00ff7f","steelblue":"#4682b4",
    "tan":"#d2b48c","teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347","turquoise":"#40e0d0",
    "violet":"#ee82ee",
    "wheat":"#f5deb3",
    "yellowgreen":"#9acd32"};

export const colorNames = Array.from(Object.keys(colors))

export const fieldsToIgnore = ["canvas","ctx","dpr","absolute_border","mode","activeManager", "voronois", 
                               "voronoi_image", "hilbert_image", "draw_hilbert_image", "draggingPoint",
                               "selectionAnchor", "selectionPointer", "selecting", "delaunay_degree", "voronoi_diagram", "space", "clusters"];

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

export function randomMetric(edge1,point1,point2,edge2) {
  const rand = Math.round(Math.random() * 3);
  if (rand === 0) {
    return hilbertMetric(edge1, point1, point2, edge2);
  } else if (rand === 1) {
    return euclideanDistance(point1, point2);
  } else if (rand === 2) {
    return thompsonMetric(edge1, point1, point2, edge2);
  } else {
    return manhattanMetric(point1,point2);
  } 
}

export function manhattanMetric(point1, point2) {
  return Math.abs(point1.x - point2.x) + Math.abs(point1.y - point2.y);
}


// this is lowk made up it looks fun tho
export function quasiMetric(edge1,point1,point2,edge2) {
  if ((point1.x + point2.y) > (point2.x + point1.y)) {
    return euclideanDistance(point1,point2);
  } else {
    return hilbertMetric(edge1,point1,point2,edge2);
  }
}

export function chebyshevMetric(point1,point2) {
  return Math.max(Math.abs(point2.x - point1.x), Math.abs(point2.y - point1.y))
}


// yes i know p should be only an integer and anything less than 1 doesnt make it a valid metric space but shhhhh 
export function minkowskiMetric(point1, point2, p) {
    return (((Math.abs(point2.x - point1.x)**p) + (Math.abs(point2.y - point1.y)**p))**(1/p))
}

export function randomMinkowski(point1, point2) {
    const p = (Math.random() + 1) * 5
    return (((Math.abs(point2.x - point1.x)**p) + (Math.abs(point2.y - point1.y)**p))**(1/p))  
}

export function calculateHilbertDistance(boundary,point1,point2){
  const mid = new Segment(point1,point2);
  const points = boundary.points;
  const ints = [null,null];
  let count = 0;
  let euclidean = euclideanDistance(point1,point2)
  if(isZero(euclidean)){
    return 0
  }
  for (let p = 0; p < points.length; p++) {
      const p2 = (p + 1) % points.length;
      const seg = new Segment(points[p], points[p2]);
      const i = intersectSegmentsAsLines(mid, seg);
      if (i !== null) {
      //println("GOOD",mid.start,mid.end,i,seg.start,seg.end,pointSegDistance(i,seg));
          if (isZero(pointSegDistance(i, seg))) {
              if (count > 0) {
                  if (isZero(euclideanDistance(i, ints[0]))) {
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
    const first = euclideanDistance(point1, ints[0]) < euclideanDistance(point2, ints[0])? ints[0]:ints[1];
    const last = euclideanDistance(point1, ints[0]) < euclideanDistance(point2, ints[0])? ints[1]:ints[0];
    return hilbertMetric(first, point1, point2, last);
  }
  return NaN
}

export function thompsonMetric(edge1, point1, point2, edge2) {
  let funk1 = halfCrossRatio(point1, point2, edge2);
  let funk2 = halfCrossRatio(point2, point1, edge1);
  return Math.log((funk1 > funk2? funk1:funk2));
}

export function calculateThompsonDistance(boundary,point1,point2){
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
          if (isZero(pointSegDistance(i, seg))) {
              if (count > 0) {
                  if (isZero(euclideanDistance(i, ints[0]))) {
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
    const first = euclideanDistance(point1, ints[0]) < euclideanDistance(point2, ints[0])? ints[0]:ints[1];
    const last = euclideanDistance(point1, ints[0]) < euclideanDistance(point2, ints[0])? ints[1]:ints[0];
    return thompsonMetric(first, point1, point2, last);
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

export function areParallel(segment1, segment2) {
  let deltaX1 = segment1.end.x - segment1.start.x;
  let deltaY1 = segment1.end.y - segment1.start.y;
  let deltaX2 = segment2.end.x - segment2.start.x;
  let deltaY2 = segment2.end.y - segment2.start.y;
    
  // Check if both segments are vertical
  if (deltaX1 === 0 && deltaX2 === 0) return true;
    
  // Check if one segment is vertical and the other is not
  if ((deltaX1 === 0 && deltaX2 !== 0) || (deltaX1 !== 0 && deltaX2 === 0)) return false;
    
  // Calculate slopes
  let slope1 = deltaY1 / deltaX1;
  let slope2 = deltaY2 / deltaX2;
    
  return Math.abs(slope1 - slope2) < 1e-9; // Consider slopes equal if difference is less than a small epsilon
}

export function arePointsEqual(point1, point2, epsilon = 1e-9) {
      return Math.abs(point1.x - point2.x) < epsilon && Math.abs(point1.y - point2.y) < epsilon;
}

export function intersectPolygonWithLine(polygon,seg){
  let intersections = [];
    
  for (let i = 0; i < polygon.points.length; i++) {
    let edge1 = new Segment(polygon.points[i],polygon.points[(i+1)%polygon.points.length])
    if (areParallel(edge1, seg)) continue;
    let new_point = intersectSegmentsAsLines(edge1,seg)
    if(new_point){
      let new_seg = new Segment(seg.start,new_point)
      
      let intersection = intersectSegments(edge1, new_seg);
      if (intersection) {
        if (!intersections.some(point => arePointsEqual(point, intersection))) {
          intersections.push(intersection);
        }
      }
    }
    
  }


  return intersections;
}

export function intersectWithPolygon(polygon1, polygon2) {
  let intersections = [];
    
  for (let edge1 of polygon1.segments) {
    for (let edge2 of polygon2.segments) {
      if (areParallel(edge1, edge2)) continue;
      let intersection = intersectSegments(edge1, edge2);
      if (intersection) {
        if (!intersections.some(point => arePointsEqual(point, intersection))) {
          intersections.push(intersection);
        }
      }
    }
  }

  return intersections;
}

export function createPolygonIntersection(polygon1, polygon2) {
  let intersectionPoints = intersectWithPolygon(polygon1, polygon2);

  polygon1.points.forEach(p => {
  // if .includes doesnt compare structural equality then i need to change that
    if (polygon2.includes(p) || pointOnPolygon(p, polygon2) || pointInPolygon(p,polygon2)) {
      if (!intersectionPoints.some(point => arePointsEqual(point, p))) {
        intersectionPoints.push(p);
      }
    }
  });
      
  polygon2.points.forEach(p => {
    if (polygon1.includes(p) || pointOnPolygon(p,polygon1) || pointInPolygon(p,polygon1)) {
      if (!intersectionPoints.some(point => arePointsEqual(point, p))) {
        intersectionPoints.push(p);
      }
    }
  });
      
  if (intersectionPoints.length < 3) return null;
  intersectionPoints = convexHull(intersectionPoints);
  let newPolygon = new Polygon(intersectionPoints)
      
  return newPolygon;
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

export function pointNearPolygonBorder(point,polygon){
    const points = polygon.points;
    const n = points.length;

    for (let i = 0; i < n; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % n];
        if (pointSegDistance(point,new Segment(p1,p2)) < 10){
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


export function convexHullIndex(points) {
  if (points.length === 0) {
      console.warn('convexHull called with an empty array.');
      return {points: [],indices:[]};
  }
  if (points.length === 1) {
      return {points: [points[0]],indices:[0]};
  }
  if (points.length === 2) {
      return {points: points,indices:[0,1]};
  }

  // Clone and sort the points
  let sortedPoints = points.slice().sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      return a.y - b.y;
  });
  let indices = []
  for(let i = 0; i < points.length; i++){
    indices.push(i)
  }
  let sortedIndices = indices.slice().sort((a, b) => {
      if (points[a].x !== points[b].x) return points[a].x - points[b].x;
      return points[a].y - points[b].y;
  });

  const cross = (o, a, b) => {
      return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  };

  let lower_index = []
  let lower = [];
  for (let i in sortedPoints) {
      let p = sortedPoints[i]
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
          lower.pop();
          lower_index.pop();
      }
      lower_index.push(sortedIndices[i]);
      lower.push(p);
  }

  let upper_index = []
  let upper = [];
  for (let i = sortedPoints.length - 1; i >= 0; i--) {
      let p = sortedPoints[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
          upper.pop();
          upper_index.pop();
      }
      upper.push(p);
      upper_index.push(sortedIndices[i])
  }

  // Concatenate lower and upper to get full hull, excluding last point of each (duplicates)
  lower.pop();
  lower_index.pop();
  upper.pop();
  upper_index.pop();
  return {points: lower.concat(upper),indices:lower_index.concat(upper_index)}
}

export function centroid(points) {
  let x = 0;
  let y = 0;

  points.forEach(point => {
    x += point.x;
    y += point.y;
  });

  return new Point(x / points.length, y / points.length);
}

export function boundArea(bound){
  return (bound.right - bound.left) * (bound.top - bound.bottom)
}


export function intersectBounds(b1,b2){
    return b1.top >= b2.bottom && b1.bottom <= b2.top && b1.left <= b2.right && b1.right >= b2.left
}

export function intersectBoundsNoEquals(b1,b2){
    return !isLeZero(b1.top - b2.bottom) && !isLeZero(b2.top - b1.bottom) && !isLeZero(b2.right - b1.left) && !isLeZero(b1.right - b2.left)
}

export function inBound(point,bound){
  let inside = isLeZero(point.x - bound.right) && isLeZero(bound.left - point.x) && isLeZero(point.y - bound.top) && isLeZero(bound.bottom - point.y)
  if(inside){
    return true
  }else{
    // helps in an edge case!
    let emptyX = isZero(bound.left - bound.right)
    let emptyY = isZero(bound.top - bound.bottom)
    if(emptyX || emptyY){
      let onDegen = (
        (emptyX && (isZero(point.x - bound.left) || isZero(point.x - bound.left)))
          ||
        (emptyY && (isZero(point.y - bound.top) || isZero(point.y - bound.bottom)))
      )
      return onDegen
    }else{
      return false
    }
    
  }
  
}

export function boundOfBounds(b1,b2){
  return new Bound(
    Math.max(b1.top,b2.top),
    Math.min(b1.bottom,b2.bottom),
    Math.min(b1.left,b2.left),
    Math.max(b1.right,b2.right),
  )
}

export function computeBoundingBox(polygon) {
        let min_x = Infinity;
        let max_x = -Infinity;
        let min_y = Infinity;
        let max_y = -Infinity;
        for (let i = 0; i < polygon.points.length; i++) {
            let p = polygon.points[i]
            min_x = Math.min(min_x,p.x);
            max_x = Math.max(max_x, p.x);
            min_y = Math.min(min_y, p.y);
            max_y = Math.max(max_y, p.y);
        }
        return new Bound(max_y,min_y,min_x,max_x);
    }

export function computeBoundingBoxOfSegment(segment){
  let s = segment.start
  let e = segment.end
  let min_x = Math.min(s.x,e.x);
  let max_x = Math.max(s.x,e.x);
  let min_y = Math.min(s.y, e.y);
  let max_y = Math.max(s.y, e.y);
  return new Bound(max_y,min_y,min_x,max_x);
}

export function computeClosestBound(bounds, point, vertical = false) {
    let minDistance = Infinity;
    let closestCoord = point; 

    for (const b of bounds) {
        if (vertical) {
            const distTop = Math.abs(b.top - point);
            if (distTop < minDistance) {
                minDistance = distTop;
                closestCoord = b.top;
            }
            const distBottom = Math.abs(b.bottom - point);
            if (distBottom < minDistance) {
                minDistance = distBottom;
                closestCoord = b.bottom;
            }
        } else { 
            const distLeft = Math.abs(b.left - point);
            if (distLeft < minDistance) {
                minDistance = distLeft;
                closestCoord = b.left;
            }
            const distRight = Math.abs(b.right - point);
            if (distRight < minDistance) {
                minDistance = distRight;
                closestCoord = b.right;
            }
        }
    }
    return closestCoord;
}

export function computeMedianBound(bounds, vertical = false) {
    let bs = [];
    for (let b of bounds) {
      if (vertical) {
        bs.push(b.bottom);
        bs.push(b.top)
      } else {
        bs.push(b.left);
        bs.push(b.right);
      }
    }

    bs.sort();
    if (bs.length % 2 === 0) {
      return (bs[Math.floor((bs.length - 1) / 2)] + bs[Math.ceil((bs.length - 1) / 2)]) / 2;
    } 
    
    return bs[Math.floor((bs.length - 1) / 2)];
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
export function colorNameToHex(color)
{
    const colors = {"aliceblue":"#f0f8ff","antiquewhite":"#faebd7","aqua":"#00ffff","aquamarine":"#7fffd4","azure":"#f0ffff",
    "beige":"#f5f5dc","bisque":"#ffe4c4","black":"#000000","blanchedalmond":"#ffebcd","blue":"#0000ff","blueviolet":"#8a2be2","brown":"#a52a2a","burlywood":"#deb887",
    "cadetblue":"#5f9ea0","chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed","cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff",
    "darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b","darkgray":"#a9a9a9","darkgreen":"#006400","darkkhaki":"#bdb76b","darkmagenta":"#8b008b","darkolivegreen":"#556b2f",
    "darkorange":"#ff8c00","darkorchid":"#9932cc","darkred":"#8b0000","darksalmon":"#e9967a","darkseagreen":"#8fbc8f","darkslateblue":"#483d8b","darkslategray":"#2f4f4f","darkturquoise":"#00ced1",
    "darkviolet":"#9400d3","deeppink":"#ff1493","deepskyblue":"#00bfff","dimgray":"#696969","dodgerblue":"#1e90ff",
    "firebrick":"#b22222","floralwhite":"#fffaf0","forestgreen":"#228b22","fuchsia":"#ff00ff",
    "gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700","goldenrod":"#daa520","gray":"#808080","green":"#008000","greenyellow":"#adff2f",
    "hotpink":"#ff69b4",
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

    if (typeof colors[color.toLowerCase()] != 'undefined'){
      return colors[color.toLowerCase()];
    }
    if (color.substring(0,1) === "#"){
      return color
    }
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

export function getVoronoiColor(canvas,cell,degree) {
  let r = 0;
  let g = 0;
  let b = 0;
  switch(canvas.brute_force_voronoi.voronoi.mode) {
    case "kth":
      const s = cell[degree - 1].index;
      const site = canvas.sites[s];
      if (site) {
        const hex = colorNameToHex(site.color);
        let { r, g, b } = hexToRgb(hex);
        return {r:r,g:g,b:b};
      } else {
        return{r:0,g:0,b:0};
      }
    break;
    case "k":
      
      for (let d = 0; d < degree; d++) {
        const s = cell[d].index;
        const site = canvas.sites[s];
        if(site) {
          const hex = colorNameToHex(site.color);
          const { r:r1, g:g1, b:b1 } = hexToRgb(hex);
          r += r1;
          g += g1;
          b += b1;
        }
      }
      r = r/degree;
      g = g/degree;
      b = b/degree;
      return {r:r,g:g,b:b};
    break;
    case "variance":
      
      let variance = 0
      for (let d = 0; d < cell.length; d++) {
        const dist = cell[d].dist;
        variance += dist**(2)
      }

      let r_thresh = 5/cell.length
      let g_thresh = 1/cell.length
      if(variance > r_thresh){
        r = 5/ variance
      }else if(variance > g_thresh){
        g = 1/ variance
      }else{
        b = 1/(variance)
      } 
      return {r:255*r,g:255*g,b:255*b}

    break;
    case "minmax":
      
      let max_dist = 0
      for (let d = 0; d < cell.length; d++) {
        const dist = cell[d].dist;
        max_dist = Math.max(dist,max_dist)
      }
      let thresh = 10
      r = max_dist/thresh;
      g = 0;
      b = 0;

      
      return {r:255*r,g:255*g,b:255*b}

    break;
  }     
} 

export function getDistanceFromMetric(metric,p,point,first,last,minkowski_p=2){
  // order: first p point last
  let distance = 0
  switch(metric){
    case "hilbert":
        distance = hilbertMetric(first, p, point, last);
    break;
    case "euclidean":
        distance = euclideanDistance(p, point);
    break;
    case "thompson":
        distance = thompsonMetric(first, p, point, last);
    break;
    case "manhattan":
        distance = manhattanMetric(p,point);
    break;
    case "chebyshev":
        distance = chebyshevMetric(p,point);
    break;
    case "minkowski":
        distance = minkowskiMetric(p,point,minkowski_p);
    break;
    case "funk":
        distance = weakFunk(p,point,first);
    break;
    case "reverse funk":
        distance = weakFunk(point,p,last);
    break;
    case "quasi":
        distance = quasiMetric(first,p,point,last);
    break;    
    case "random":
        distance = randomMetric(first,p,point,last);
    break;
    case "random minkowski":
        distance = randomMinkowski(p,point);
  }
  return distance
}


export function isColinear(p1,p2,p3){
  return isZero(pointSegDistance (p1,new Segment(p2,p3)))
}

// gets rid of unnecessary data from canvas clone json file for user to save :D
export function cleanJason(canvas_clone) {
  for (let i of Object.keys(canvas_clone)) {
    if (fieldsToIgnore.includes(i)) {
      delete canvas_clone[i];
    }
  }

  // gets rid of the brute force grid in the json so itll be wayway smaller lol
  if (canvas_clone["brute_force_voronoi"]) {
    canvas_clone["brute_force_voronoi"] = true;
  }

  if (canvas_clone["delaunay"]) {
   canvas_clone["delaunay"] = true;
  }

  // we recalculate these on load so we dont need them, we just need which points to draw the bisectors between
  for (let b of canvas_clone["bisectors"]) {
    delete b["bisector"];
    delete b["drawable_conic_segments"];
  }

  for (let z of canvas_clone["z_regions"]) {
    delete z["polygon"];
  }
}

export function moveInHilbert(boundary,point,r,theta){
  // x  = point.x + dist * Math.cos(theta) 
  // y  = point.y + dist * Math.sin(theta)
  // r = (1/2) * Math.log(crossRatio())
  // Math.exp(2*r) = crossRatio 
  // arbitrary point along line
  let new_point = new Point(point.x + 1 * Math.cos(theta),point.y + 1 * Math.sin(theta)) 
  let ints = intersectPolygonWithLine(boundary,new Segment(point,new_point))
  if(ints.length === 2){
    let rs = []
    for(let i = 0; i < ints.length; i++){
      let center = new Point(point.x - ints[i].x,point.y - ints[i].y)
      let theta_p = (Math.atan2(center.y,center.x) + 2*Math.PI) % (2*Math.PI)
      if(isZero(theta- theta_p)){
        rs.push(r)
      }else{
        rs.push(-r)
      }
    }

    let edge1 = rs[0] > rs[1]? ints[0]:ints[1]
    let edge2 = rs[0] > rs[1]? ints[1]:ints[0]

    
    let new_p = getPointOnSpoke(edge1,point,edge2,r)


    return new_p

  }
}


export function hilbertMidpoint(boundary,p1,p2){
    if(isZero(euclideanDistance(p1,p2)**2)){
        return p1
    }
    let dist = calculateHilbertDistance(boundary,p1,p2)    
    let angle = Math.atan2(p1.y-p2.y,p1.x-p2.x)

    let start = p1

    if(isLeZero(euclideanDistance(p1,p2)-euclideanDistance(p2,moveInHilbert(boundary,p1,dist/2,angle)))){
      start = p2
    }
    
    let mid = moveInHilbert(boundary,start,dist/2,angle)
    if(!mid){
      mid = centroid([p1,p2])
    }
    return mid
}

export function hilbertPercentagePoint(boundary,p1,p2,percentage){
    if(isZero(euclideanDistance(p1,p2)**2)){
        return p1
    }
    let dist = calculateHilbertDistance(boundary,p1,p2)
    let angle = Math.atan2(p1.y-p2.y,p1.x-p2.x)

    let start = p1

    if(isLeZero(euclideanDistance(p1,p2)-euclideanDistance(p2,moveInHilbert(boundary,p1,dist*percentage,angle)))){
      start = p2
      percentage = 1-percentage
    }
    
    let mid = moveInHilbert(boundary,start,dist*percentage,angle)
    if(!mid){
      mid = centroid([p1,p2])
    }
    return mid
}

export function hilbertCentroid(boundary,points,min = 0,max=-1,count = 0){
    if(points.length == 1){
        return points[0]
    }
    if(points.length == 0){
      return null
    }
    if(max >= 0 && count > max){
      return centroid(points)
    }
    if(min < 0 || count > min){
        let euclidean_centroid = centroid(points)
        let converged = true
        for(let i = 0; i < points.length; i++){
          if(!isLeZero(euclideanDistance(euclidean_centroid,points[i]) - 0.1)){
            converged = false
            break;
          }
        }
        if(converged){
          return euclidean_centroid
        }
    }
    let convex = convexHullIndex(points)
    let convex_indices = convex.indices
    let new_points = []
    for(let i = 0; i < convex_indices.length; i++){
        let p1 = points[convex_indices[i]]
        let p2 = points[convex_indices[(i+1) % convex_indices.length]]
        let mid = hilbertMidpoint(boundary,p1,p2)
        new_points.push(mid)
    }
    let used = {}
    for(let i = 0; i < convex_indices.length; i++){
        used[convex_indices[i]] = true
    }
    for(let i = 0; i < points.length; i++){
        if(!used[i]){
            new_points.push(points[i])
        }
    }
    return hilbertCentroid(boundary,new_points,min,max,count+1)
}
  
export function hilbertCentroidList(boundary,points,min = 0,max=-1,count = 0){
    if(points.length == 1){
        return points
    }
    if(points.length == 0){
      return []
    }
    if(max >= 0 && count > max){
      return points
    }
    if(min < 0 || count > min){
        let euclidean_centroid = centroid(points)
        let converged = true
        for(let i = 0; i < points.length; i++){
          if(!isLeZero(euclideanDistance(euclidean_centroid,points[i]) - 0.1)){
            converged = false
            break;
          }
        }
        if(converged){
          return points
        }
    }
    let convex = convexHullIndex(points)
    let convex_indices = convex.indices
    let new_points = []
    for(let i = 0; i < convex_indices.length; i++){
        let p1 = points[convex_indices[i]]
        let p2 = points[convex_indices[(i+1) % convex_indices.length]]
        let mid = hilbertMidpoint(boundary,p1,p2)
        new_points.push(mid)
    }
    let used = {}
    for(let i = 0; i < convex_indices.length; i++){
        used[convex_indices[i]] = true
    }
    for(let i = 0; i < points.length; i++){
        if(!used[i]){
            new_points.push(points[i])
        }
    }
    return hilbertCentroidList(boundary,new_points,min,max,count+1)
}

export function hilbertCentroidHarmonic(boundary,points,offset=0){
  let n = points.length

  if(n === 1){
    return points[0]
  }
  let end_points = []
  let current_centroid = points[(0+offset)%n]
  end_points.push(current_centroid)
  for(let i = 1; i < n; i++){
    current_centroid = hilbertPercentagePoint(boundary,current_centroid,points[(i+offset)%n],1/(i+1))
    end_points.push(current_centroid)
  }
  return current_centroid
}

// doesnt work
export function testCentroidRegion(boundary,points,offset=0){
  let n = points.length

  if(n === 1){
    return points[0]
  }
  let current_centroids = [points[(0+offset)%n]]
  for(let i = 1; i < n; i++){
    let end_points = []
    let h_p2 = calculateHilbertPoint(boundary,points[(i+offset)%n])

    current_centroids.forEach((p) => {
      let h_p1 = calculateHilbertPoint(boundary,p)
      let midsector = calculateMidsector(boundary,h_p1,h_p2)
      for(let j = 0; j < midsector.polygon.points.length; j++){
        let point = midsector.polygon.points[j]
        if(!isZero(euclideanDistance(point,p)) && !isZero(euclideanDistance(point,points[(i+offset)%n]))){
          end_points.push(point)
        }
      }
    })
    current_centroids = []
    end_points.forEach((p,i) => {
      current_centroids.push(hilbertPercentagePoint(boundary,p,points[(i+offset)%n],1/(i+1)))
    })
  }
  console.log("TROIDS",current_centroids)
  return current_centroids
}

export function orderByAngle(points){
  let bound = computeBoundingBox(new Polygon(points))
  let euclidean_centroid = new Point((bound.left + bound.right)/2,(bound.top + bound.bottom)/2)//centroid(points)
  let point_data = []
  for(let i = 0; i < points.length; i++){
    point_data.push({index:i,angle:(Math.atan2(euclidean_centroid.y - points[i].y,euclidean_centroid.x - points[i].x))})
  }
  point_data.sort((a,b) => {
    return a.angle - b.angle
  })
  let final_points = []
  for(let i = 0; i < points.length; i++){
    final_points.push(points[point_data[i].index])
  }
  return final_points
}

export function orderByAngleIndex(points){
  let bound = computeBoundingBox(new Polygon(points))
  let euclidean_centroid = new Point((bound.left + bound.right)/2,(bound.top + bound.bottom)/2)//centroid(points)
  let point_data = []
  for(let i = 0; i < points.length; i++){
    point_data.push({index:i,angle:(Math.atan2(euclidean_centroid.y - points[i].y,euclidean_centroid.x - points[i].x))})
  }
  point_data.sort((a,b) => {
    return a.angle - b.angle
  })
  let final_points = []
  let point_indices = []

  for(let i = 0; i < points.length; i++){
    final_points.push(points[point_data[i].index])
    point_indices.push(point_data[i].index)
  }
  return {points:final_points,indices:point_indices}
}

export function hilbertFrechetMean(boundary,points,max=100){
  let centroid_points = []
  let current_centroid = centroid(points)
  let weight = 0.02
  let count = 0
  while(count < max){
    let dists = []
    let angles = []
    for(let i = 0; i < points.length; i++){  
      dists.push(calculateHilbertDistance(boundary,points[i],current_centroid)**2)
      let angle = Math.atan2(points[i].y-current_centroid.y,points[i].x-current_centroid.x)
      angles.push(angle)

    }
    for(let i = 0; i < points.length; i++){
      

      let dist = dists[i]
      let angle = angles[i] + Math.PI
      let new_centroid = moveInHilbert(boundary,current_centroid,dist*weight,angle)
      if(!new_centroid){
        console.log("HELP",current_centroid,angle,dist)
      }else{
        //console.log("MOVE",current_centroid,new_centroid,dist*weight,angle)
      }
      current_centroid = new_centroid
    }
    //console.log("LAST MOVE",old_centroid,current_centroid)

    centroid_points.push(current_centroid)
    count++
  }
  return centroid_points
}

export function hilbertPull(boundary,points,point){
  let current_centroid = point
  let weight = 0.02
    let dists = []
    let angles = []
    for(let i = 0; i < points.length; i++){  
      dists.push(calculateHilbertDistance(boundary,points[i],current_centroid)**2)
      let angle = Math.atan2(points[i].y-current_centroid.y,points[i].x-current_centroid.x)
      angles.push(angle)

    }
    for(let i = 0; i < points.length; i++){
      

      let dist = dists[i]
      let angle = angles[i] + Math.PI
      let new_centroid = moveInHilbert(boundary,current_centroid,dist*weight,angle)
      if(!new_centroid){
        console.log("HELP",current_centroid,angle,dist)
      }else{
        //console.log("MOVE",current_centroid,new_centroid,dist*weight,angle)
      }
      current_centroid = new_centroid
    }
    //console.log("LAST MOVE",old_centroid,current_centroid)

  return current_centroid
}

export function hilbertGradient(boundary,sites,p){
  let gradient = new Point(0,0)
  for(let i = 0; i < sites.length; i++){

    let s = sites[i]
    const mid = new Segment(p,s);
    const points = boundary.points;
    const ints = [null,null];
    const ints_seg = [null,null];
    let count = 0;
    let euclidean = euclideanDistance(p,s)
    if(isZero(euclidean)){
      continue;
    }
    for (let j = 0; j < points.length; j++) {
        const p2 = (j + 1) % points.length;
        const seg = new Segment(points[j], points[p2]);
        const int = intersectSegmentsAsLines(mid, seg);
        if (int !== null) {
        //println("GOOD",mid.start,mid.end,i,seg.start,seg.end,pointSegDistance(i,seg));
            if (isZero(pointSegDistance(int, seg))) {
                if (count > 0) {
                    if (isZero(euclideanDistance(int, ints[0]))) {
                        // replace point as to not have
                        count--;
                    }
                }
                ints[count] = int;
                ints_seg[count] = seg
                count++;
            }
        }

        if (count > 1) break;
    }

    if (count === 2) {
      const F = euclideanDistance(p, ints[0]) < euclideanDistance(s, ints[0])? ints_seg[0]:ints_seg[1];
      const E = euclideanDistance(p, ints[0]) < euclideanDistance(s, ints[0])? ints_seg[1]:ints_seg[0];
      //return hilbertMetric(F, p, s, E);
      let {a:f1,b:f2,c:f3} = lineEquation(F)
      let {a:e1,b:e2,c:e3} = lineEquation(E)
      let log_term = (1/2)*Math.log(
          ((p.x*e1+p.y*e2+e3)/(s.x*e1+s.y*e2+e3))*((s.x*f1+s.y*f2+f3)/(p.x*f1+p.y*f2+f3))
        )
      let x = log_term
        *
        (e1/(p.x*e1+p.y*e2+e3)-f1/(p.x*f1+p.y*f2+f3))
      let y = log_term
        *
        (e2/(p.x*e1+p.y*e2+e3)- f2/(p.x*f1+p.y*f2+f3))
      gradient = new Point(gradient.x + x,gradient.y + y)
    }
  }
  return gradient
}

export function hilbertGradientDescent(boundary,points,max=100){
  let centroid_points = []
  let current_centroid = centroid(points)
  let count = 0
  let prev_grad = false
  let exit = false

  let near = false
  while(!exit){
    
      let gradient = hilbertGradient(boundary,points,current_centroid)

      
      let dist = Math.sqrt(gradient.x**2+gradient.y**2)
      let angle = Math.atan2(gradient.y,gradient.x)

      let dot = Math.acos((gradient.x*prev_grad.x + gradient.y*prev_grad.y)/(dist * Math.sqrt(prev_grad.x**2+prev_grad.y**2)))



      if (isZero(dist)){
        exit = true
      }

      if(isLeZero((17*Math.PI/20 - dot))){
        near = true
      }

      //console.log("INITIAL",dist,angle,count,dot)

      let old_centroid = current_centroid

      let mag =  -Math.sqrt(dist)

      if(!near){
        mag = -1
      }

      current_centroid = new Point(current_centroid.x + mag*Math.cos(angle),current_centroid.y + mag*Math.sin(angle)) //moveInHilbert(boundary,current_centroid,weight*dist,angle)

      prev_grad = gradient



    centroid_points.push(current_centroid)
    count++

    if(count > 5000){
      console.log("EJECT")
      exit = true
    }
  }
  return centroid_points
}
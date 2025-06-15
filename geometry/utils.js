import {Point, Segment} from "./primitives.js"

export function euclideanDistance(point1,point2){
    let dx = point1.x - point2.x
    let dy = point1.y - point1.y
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

  if (Math.abs(denominator) < 1e-10) {
    return null; 
  }

  const x = ((b1 * c2) - (b2 * c1)) / denominator
  const y = ((c1 * a2) - (c2 * a1)) / denominator
  return new Point(x, y)
}

export function isBetween(a, b, c){
  return ((a-c) <= 1e-10 && (c-b) <= 1e-10) || ((b-c) <= 1e-10 && (c-a) <= 1e-10);
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
        if (pointSegDistance(point,new Segment(p1,p2)) <= 1e-10){
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
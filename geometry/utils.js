function euclideanDistance(point1,point2){
    let dx = point1.x - point2.x
    let dy = point1.y - point1.y
    return Math.sqrt(dx * dx + dy * dy)
}

function halfCrossRatio(point1,point2,edge_point){
    return euclideanDistance(point1,edge_point)/euclideanDistance(point2,edge_point)
}

function weakFunk(point1, point2, edge_point){
    return Math.log(halfCrossRatio(point1,point2,edge_point))
}

function crossRatio(edge1, point1, point2, edge2){
    return halfCrossRatio(point1,point2,edge2) * halfCrossRatio(point2,point1,edge1)
}  

function hilbertMetric(edge1, point1, point2, edge2){
    return 0.5 * Math.log(crossRatio(edge1,point1,point2,edge2))
}

function lineEquation(segment){
    const p1 = segment.start
    const p2 = segment.end
    const a = p2.y - p1.y
    const b = p1.x - p2.x
    const c = p2.x * p1.y - p1.x * p2.y

    return {a, b, c}
}


function pointSegDistance(point, segment) {
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

function intersectSegmentsAsLines(s1, s2) {
  const {a1, b1, c1} = lineEquation(s1)
  const {a2, b2, c2} = lineEquation(s2)
  const denominator = (a1 * b2) - (a2 * b1)

  if (Math.abs(denominator) < 1e-10) {
    return null; 
  }

  x = ((b1 * c2) - (b2 * c1)) / denominator
  y = ((c1 * a2) - (c2 * a1)) / denominator
  return new Point(x, y)
}

function isBetween(a, b, c){
  return a <= c && c <= b || b <= c && c <= a;
}

// copied from nithins code, might need to be changed
function intersectSegments(s1, s2) {
  let point = intersectSegmentsAsLines(s1, s2)

  if (point) {
    const is_on_seg1 = isBetween(s1.start.x, s1.end.x, point.x) && isBetween(s1.start.y, s1.end.y, point.y);
    const is_on_seg2 = isBetween(s2.start.x, s2.end.x, point.x) && isBetween(s2.start.y, s2.end.y, point.y);

    if (is_on_seg1 && is_on_seg2) {
      return point;
    }    
  }
  return null;
}


// polygon is made up of a list of points, can use that list of points to define segments 
// and see if the segment param intersects with any
function segmentIntersectsPolygon(segment, polygon) {
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
function pointInPolygon(point, polygon) {
    const {x, y} = point;
    const points = polygon.points;
    const n = points.length;
    let intersections = 0;

    for (let i = 0; i < n; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % n];
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

function solveQuadratic(a, b, c) {
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


export {euclideanDistance, 
        halfCrossRatio, 
        weakFunk, 
        crossRatio, 
        hilbertMetric, 
        lineEquation, 
        pointSegDistance, 
        intersectSegmentsAsLines,
        intersectSegments,
        segmentIntersectsPolygon,
        pointInPolygon,
        isBetween,
        solveQuadratic}
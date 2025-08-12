import { Canvas } from "../drawing/canvas/canvas.js";
import { calculateCircumcenter } from "./bisectors.js";
import { bisectorConicFromSector, calculateConicSegmentBounds, getConicParameterBoundsInSector, parameterizeConic } from "./conics.js";
import { calculateBisector, calculateHilbertPoint, calculateMidsector, HilbertPoint } from "./hilbert.js";
import { Point, Polygon } from "./primitives.js";
import { calculateHilbertDistance, convexHull, createPolygonIntersection, crossProduct, euclideanDistance, isZero, pointInPolygon, pointOnPolygon, shuffledArray } from "./utils.js";

export const Ball_Types = {
    HILBERT: 0,
    WEAK_FUNK: 1,
    REVERSE_FUNK: 2,
    THOMPSON: 3
};

export class Ball {
    constructor(hilbert_point, type, boundary, radius = 1) {
        this.point = hilbert_point;
        this.type = type;
        this.radius = radius;
        this.boundary = boundary;
        this.polygon = this.getPointsOnBall();
    }

    getPointsOnBall() {
        switch(this.type) {
            case Ball_Types.HILBERT:
                return new Polygon(getPointsOnHilbertBall(this.point,this.radius, this.boundary));
            case Ball_Types.WEAK_FUNK:
                return new Polygon(getPointsOnForwardFunkBall(this.point, this.radius, this.boundary));
            case Ball_Types.REVERSE_FUNK:
                return new Polygon(getPointsOnReverseFunkBall(this.point, this.radius, this.boundary));
            case Ball_Types.THOMPSON:
                let pointsOnBall1 = getPointsOnReverseFunkBall(this.point, this.radius, this.boundary);
                let polygon1 = new Polygon(pointsOnBall1)

                let pointsOnBall2 = getPointsOnForwardFunkBall(this.point, this.radius, this.boundary);    
                let polygon2 = new Polygon(pointsOnBall2);

                return createPolygonIntersection(polygon1, polygon2);
        }
    }
}

// Following spoke and ball functions were from Nithins code
export function getPointOnSpoke(A, C, D, r) {
    const scalar = 1 / (1 + (euclideanDistance(C, D) / euclideanDistance(A, C)) * Math.exp(2 * r));
    const dx = D.x - A.x;
    const dy = D.y - A.y;
    return new Point(scalar * dx + A.x, scalar * dy + A.y)
}

export function getPointsOnHilbertBall(center, radius, polygon) {
  let points = [];
  center.spokes.forEach(({ segment:segment, point:point }) => {
    points.push(getPointOnSpoke(segment.start, point, segment.end, radius));
    points.push(getPointOnSpoke(segment.end, point, segment.start, radius));
  });
  return convexHull(points);
}

export function getPointOnSpokeForward(C, A, r) {
  const scalar = 1 / Math.exp(r);
  const dx = C.x - A.x;
  const dy = C.y - A.y;
  return new Point(scalar * dx + A.x, scalar * dy + A.y)
}

export function getPointOnSpokeReverse(C, A, r) {
  const scalar = Math.exp(r);
  const dx = C.x - A.x;
  const dy = C.y - A.y;
  return new Point(scalar * dx + A.x, scalar * dy + A.y)
}

export function getPointsOnForwardFunkBall(center, radius, polygon) {
  let points = [];
  center.spokes.forEach(({ segment:segment, point:point }) => {
    // points.push(getPointOnSpokeForward(C, A, radius));
    points.push(getPointOnSpokeForward(point, segment.start, radius));

  });
  return convexHull(points);
}

export function getPointsOnReverseFunkBall(center, radius, polygon) {
  let points = [];
  center.spokes.forEach(({ segment:segment, point:point }) => {
    points.push(getPointOnSpokeReverse(point, segment.start, radius));
  });
  return convexHull(points);
}

export function calculateZRegion(boundary,h_p1,h_p2,bisector){
    let {ball1, ball2} = calculateInfiniteBalls(boundary,h_p1,h_p2,bisector)

    let z = createPolygonIntersection(ball1.polygon,ball2.polygon)
    return z
}

export function calculateInfiniteBalls(boundary,h_p1,h_p2,bisector) {

  // iterative approach is slower but in theory produces more accurate results?
  let dt = 1e-10
  let end_point_1 = null
  let end_point_2 = null
  let dist11 = null
  let dist12 = null
  let dist21 = null
  let dist22 = null
  let ball1 = null
  let ball2 = null
  do{
    end_point_1 = bisector.getPointFromT(dt)
    end_point_2 = bisector.getPointFromT(bisector.conic_segments.length-dt)
    dist11 = calculateHilbertDistance(boundary,end_point_1,h_p1.point)
    dist12 = calculateHilbertDistance(boundary,end_point_1,h_p2.point)
    dist21 = calculateHilbertDistance(boundary,end_point_2,h_p1.point)
    dist22 = calculateHilbertDistance(boundary,end_point_2,h_p2.point)

    let dist1 = (dist11 + dist12)/2

    ball1 = new Ball(calculateHilbertPoint(boundary,end_point_1),Ball_Types.HILBERT,boundary,dist1)

    let dist2 = (dist21 + dist22)/2

    ball2 = new Ball(calculateHilbertPoint(boundary,end_point_2),Ball_Types.HILBERT,boundary,dist2)


    dt *= 10
  }while(dt < 0.1 &&  (!pointOnPolygon(h_p1.point,ball1.polygon) || !pointOnPolygon(h_p2.point,ball2.polygon)))
  
    //console.log("DT",dt,"1",dist11,dist12,"2",dist21,dist22)

  
  return {ball1: ball1, ball2: ball2}
}


export function makeEnclosingBall(boundary,points){
  let shuffled = shuffledArray(points)

  let ball = null;
  shuffled.forEach((p, i) => {
    //console.log("Checking point p: (", p.x, ",", p.y, ")");
    if (ball === null || !pointInPolygon(p,ball.polygon)) {
      // console.log("Calling makeBallOnepoint for point (", p.x, ",", p.y, ")");
      // console.log("points:", shuffled.slice(0, i));
      ball = makeBallOnePoint(boundary,shuffled.slice(0, i), p);
      //console.log("Ball enclosing p: ", ball);
    }
  });
  return ball;
}

export function makeBallOnePoint(boundary,points, p) {
    // Create Hilbert Ball of radius 0 centered at point p.
    let ball = new Ball(calculateHilbertPoint(boundary,p),Ball_Types.HILBERT,boundary,0);
    // console.log("makeBallOnePoint parameter p: ", p);
    // console.log("makeBallOnePoint initial ball:", ball.x, ball.y, ball.ballRadius);
    points.forEach((q, i) => {
      // console.log("Checking point q: (", q.x, ",", q.y, ")");
      if (!pointInPolygon(q,ball.polygon)) {
        /* If site q is not contained within our current MEB, call necessary functions
        to recompute MEB to contain both p and q on its boundary. */
        // console.log("q is not contained in current meb.")
        if (ball.radius == 0) {
          // console.log("Calling makeBottomLeftMost for point q (", q.x, ",", q.y, ")");
          ball = makeBottomLeftMost(boundary,p, q);
        } else {
          // console.log("Calling makeBallTwoPoints for point q (", q.x, ",", q.y, ")");
          ball = makeBallTwoPoints(boundary,points.slice(0, i), p, q);
        }
      }
    });
    return ball;
  }

export function makeBottomLeftMost(boundary,p, q) {
    /* Return Hilbert Ball whose radius is equivalent to H(p,q)/2 and whose center
    is at the left-bottommost point of the two sites' geodesic region. */
    let middleSectorPQ = calculateMidsector(boundary,calculateHilbertPoint(boundary,p),calculateHilbertPoint(boundary,q))
    let conic = bisectorConicFromSector(boundary,middleSectorPQ)
    let p_c = parameterizeConic(conic)
    let p_c_b = getConicParameterBoundsInSector(p_c,middleSectorPQ)
    let center;
    let firstEndpoint = p_c_b.start_point;
    // console.log("firstEndpoint:", firstEndpoint.x, firstEndpoint.y);
    let secondEndpoint = p_c_b.end_point;
    // console.log("secondEndpoint:", secondEndpoint.x, secondEndpoint.y);
    if (firstEndpoint.y < secondEndpoint.y) {
      center = firstEndpoint;
    } else if (firstEndpoint.y == secondEndpoint.y) {
      if (firstEndpoint.x < secondEndpoint.x) {
        center = firstEndpoint;
      } else {
        center = secondEndpoint;
      }
    } else {
      center = secondEndpoint;
    }
    // console.log("center has been updated for bottom-leftmost: ", center.x, center.y);
    let radius = calculateHilbertDistance(boundary, center, p);
    // console.log("radius has been udpated for bottom-leftmost: ", radius);
    let ball = new Ball(calculateHilbertPoint(boundary,center),Ball_Types.HILBERT,boundary,radius);
    return ball;
  }
  export function makeBallTwoPoints(boundary, points, p, q) {
    // console.log("calling makeBallTwoPoints...");
    const centerBall = makeBottomLeftMost(boundary, p, q);
    // console.log("centerBall:", centerBall);
    let left = null;
    let right = null;
    for (const r of points) {
      // console.log("Checking point r: ", r);
      if (!pointInPolygon(r,centerBall.polygon)) {
        // console.log("r is not contained in centerBall.");
        let cross = crossProduct(p.x, p.y, q.x, q.y, r.x, r.y);
        //console.log("cross:", cross);
        let circum = makeCircumcircle(boundary,p, q, r);
        if (circum === null) {
          continue;
        } else if (cross > 0 && (left === null || crossProduct(p.x, p.y, q.x, q.y, circum.x, circum.y) > crossProduct(p.x, p.y, q.x, q.y, left.x, left.y))) {
          left = circum;
          //console.log("left has been updated: ", left);
        } else if (cross < 0 && (right === null || crossProduct(p.x, p.y, q.x, q.y, circum.x, circum.y) < crossProduct(p.x, p.y, q.x, q.y, right.x, right.y))) {
          right = circum;
          //console.log("right has been updated: ", right);
        }
      }
    }
    if (left === null && right === null)
      return centerBall;
    else if (left === null && right !== null)
      return right;
    else if (left !== null && right === null)
      return left;
    else if (left !== null && right !== null)
      return left.r <= right.r ? left : right;
  }
export function makeCircumcircle(boundary, p, q, r) {
    /* Return Hilbert circumcircle, in which sites p, q, and r lie on its boundary. */
    let h_p = calculateHilbertPoint(boundary,p)
    let h_q = calculateHilbertPoint(boundary,q)
    let h_r = calculateHilbertPoint(boundary,r)
    let b_pq = calculateBisector(boundary,h_p,h_q)
    let b_pr = calculateBisector(boundary,h_p,h_r)
    let b_qr = calculateBisector(boundary,h_q,h_r)
    let centers = calculateCircumcenter(boundary,b_pq, b_pr, b_qr);
    let center = centers.circumcenter
      if (center === null || center === undefined) {
        return null;
      }
    let radius = calculateHilbertDistance(boundary,center, p);
    return new Ball(calculateHilbertPoint(boundary,center),Ball_Types.HILBERT,boundary,radius);
  }
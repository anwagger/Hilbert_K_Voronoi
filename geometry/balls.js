import { Canvas } from "../drawing/canvas/canvas.js";
import { calculateHilbertPoint, HilbertPoint } from "./hilbert.js";
import { Point, Polygon } from "./primitives.js";
import { calculateHilbertDistance, convexHull, createPolygonIntersection, euclideanDistance } from "./utils.js";

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
  let dt = 1e-4
  let end_point_1 = bisector.getPointFromT(dt)
  let end_point_2 = bisector.getPointFromT(bisector.conic_segments.length-dt)
  let dist11 = calculateHilbertDistance(boundary,end_point_1,h_p1.point)
  let dist12 = calculateHilbertDistance(boundary,end_point_1,h_p2.point)

  let dist1 = (dist11 + dist12)/2

  let ball1 = new Ball(calculateHilbertPoint(boundary,end_point_1),Ball_Types.HILBERT,boundary,dist1)

  let dist21 = calculateHilbertDistance(boundary,end_point_2,h_p1.point)
  let dist22 = calculateHilbertDistance(boundary,end_point_2,h_p2.point)

  let dist2 = (dist21 + dist22)/2

  let ball2 = new Ball(calculateHilbertPoint(boundary,end_point_2),Ball_Types.HILBERT,boundary,dist2)

  return {ball1: ball1, ball2: ball2}
}
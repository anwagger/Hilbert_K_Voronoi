import { Bisector } from "../../geometry/bisectors.js";
import { VoronoiDiagram, createVoronoiFromCanvas } from "../../geometry/voronoi.js"
import {calculateSpokes, calculateHilbertPoint, calculateBisector} from  "../../geometry/hilbert.js"
import { Point, Polygon, Segment, Spoke } from "../../geometry/primitives.js";
import { DrawablePoint, DrawablePolygon, DrawableSegment, DrawableSpoke, Site, DrawableBruteForceVoronoi, DrawableVoronoiDiagram, DrawableBall} from "../drawable.js";
import { Ball, calculateInfiniteBalls, calculateZRegion } from "../../geometry/balls.js";

export function loadBoundary(data, canvas) {
   let points = []
   for (let p of data.polygon.points) {
      points.push(new Point(p.x,p.y))
   }

   const polygon = new Polygon(points);
   canvas.boundary = new DrawablePolygon(polygon);
   canvas.boundary.color = data.color;
}

export function loadSites(data, canvas) {
   canvas.sites = [];

   for (let s of data) {
      const point = new Point(s["drawable_point"]["point"]["x"], s["drawable_point"]["point"]["y"]);
      const dP = new DrawablePoint(point);
      dP.radius = s["drawable_point"]["radius"]
      dP.label = s["drawable_point"]["label"]
      let site = new Site(dP,[], dP.radius);
      site.color = s["color"];
      site.drawable_point.color = s["color"];

      calculateSpokes(canvas.boundary.polygon,point).forEach((spoke) => {
         site.drawable_spokes.push(new DrawableSpoke(spoke))
         site.drawable_spokes[site.drawable_spokes.length-1].color = site.color
      })

      for (let b of s["balls"]) {
         const hP = calculateHilbertPoint(canvas.boundary.polygon, point);
         const ball = new Ball(hP, b["ball"]["type"], canvas.boundary.polygon, b["ball"]["radius"])
         site.balls.push(new DrawableBall(ball, s["color"]));
      }

      canvas.sites.push(site);
   }
}

export function loadSegments(data,canvas) {
   canvas.segments = [];

   for (let s of data) {
      const start = new Point(s["segment"]["start"]["x"], s["segment"]["start"]["y"]);
      const end = new Point(s["segment"]["end"]["x"], s["segment"]["end"]["y"]);
      const seg = new Segment(start, end);
      let drawable_seg = new DrawableSegment(seg);
      drawable_seg.color = s.color;

      canvas.segments.push(drawable_seg);
   }
}

export function loadBisectors(data,canvas) {
   canvas.bisectors = [];
   for (let b of data) {
      // these are indices
      const p1 = b.p1;
      const p2 = b.p2;

      let boundary = canvas.boundary.polygon;
      let point1 = canvas.sites[p1].drawable_point.point;
      let point2 = canvas.sites[p2].drawable_point.point;
      let h_p1 = calculateHilbertPoint(boundary,point1);
      let h_p2 = calculateHilbertPoint(boundary,point2);
      let bisector = calculateBisector(boundary,h_p1,h_p2);
      canvas.addBisector(bisector,p1,p2);

   }
}

export function loadBruteForceVoronoi(data, canvas) {
   if(data) {
      const voronoi = new DrawableBruteForceVoronoi(new VoronoiDiagram(canvas.boundary.polygon,[],1));
      canvas.brute_force_voronoi = voronoi;
      canvas.recalculateBruteForceVoronoi();
   }  
}

export function loadFastVoronoi(data, canvas, delaunay) {
   if(data) {
      let {voronois:voronois} = createVoronoiFromCanvas(canvas);
      canvas.voronois = voronois;
      canvas.voronoi_diagram = new DrawableVoronoiDiagram(canvas.voronois[0])

      if(delaunay) {
         canvas.delaunay = canvas.voronois[0].hilbertDelaunay(canvas.sites);
      }
      canvas.calculate_fast_voronoi = true;
   }
}

export function loadZRegions(data, canvas) {
   canvas.z_regions = [];
   for (let z of data) {
      const p1 = z.p1;
      const p2 = z.p2;

      let boundary = canvas.boundary.polygon
      let point1 = canvas.sites[p1].drawable_point.point
      let point2 = canvas.sites[p2].drawable_point.point
      let h_p1 = calculateHilbertPoint(boundary,point1)
      let h_p2 = calculateHilbertPoint(boundary,point2)
      let bisector = calculateBisector(boundary,h_p1,h_p2)
      let z_r = calculateZRegion(boundary,h_p1,h_p2,bisector)

      canvas.addZRegion(z_r,p1,p2)
   }
}

export function loadInfiniteBalls(data, canvas) {
   canvas.infinite_balls = [];
   for (let i of data) {
      const p1 = i.p1;
      const p2 = i.p2;

      let boundary = canvas.boundary.polygon
      let point1 = canvas.sites[p1].drawable_point.point
      let point2 = canvas.sites[p2].drawable_point.point
      let h_p1 = calculateHilbertPoint(boundary,point1)
      let h_p2 = calculateHilbertPoint(boundary,point2)
      let bisector = calculateBisector(boundary,h_p1,h_p2)
      let {ball1, ball2} = calculateInfiniteBalls(boundary,h_p1,h_p2,bisector)

      canvas.addInfiniteBalls(ball1,ball2,p1,p2)
   }
}
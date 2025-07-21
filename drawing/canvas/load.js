import { Bisector } from "../../geometry/bisectors.js";
import { VoronoiDiagram } from "../../geometry/voronoi.js"
import { Polygon, Segment, Spoke } from "../../geometry/primitives.js";
import { DrawablePoint, DrawablePolygon, DrawableSegment, DrawableSpoke, Site } from "../drawable.js";

export function loadBoundary(data, canvas) {
   const polygon = new Polygon(data.polygon.points);
   canvas.boundary = new DrawablePolygon(polygon);
   canvas.boundary.color = data.color;
}

export function loadSites(data, canvas) {
   canvas.sites = [];

   for (let s of data) {
      const dP = new DrawablePoint(s.drawable_point);
      const spokes = getDrawableSpokes(s.drawableSpokes);

      let site = new Site(dP,spokes, s.radius);
      site.color = s.color;

      // deal with balls here

      canvas.sites.push(site);
   }
}

function getDrawableSpokes(spokeInfo) {
   let result = [];

   for (let s of spokeInfo) {
      const spoke = new Spoke(s.spoke);

      let drawable_spoke = new DrawableSpoke(spoke);
      drawable_spoke.color = s.color;

      result.push(drawable_spoke);
   }
}

export function loadSegments(data,canvas) {
   canvas.segments = [];

   for (let s of data) {
      const seg = new Segment(s.segment);
      let drawable_seg = new DrawableSegment(seg);
      drawable_seg.color = s.color;

      canvas.segments.push(drawable_seg);
   }
}

export function loadBisectors(data,canvas) {
   for (let b of data) {
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
   const voronoi = new VoronoiDiagram(canvas.boundary.polygon,[],data.voronoi.degree)
   canvas.brute_force_voronoi = voronoi;
   canvas.recalculateBruteForceVoronoi();  
}

export function loadZRegions(data, canvas) {
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
      this.addZRegion(z_r,p1,p2)
   }
}

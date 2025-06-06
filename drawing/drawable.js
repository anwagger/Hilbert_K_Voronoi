import { Polygon } from "../geometry/primitives";
import { intersectSegments, intersectSegmentsAsLines } from "../geometry/utils";

class DrawablePolygon {
   constructor(polygon = new Polygon(), color = "blue", stroke_style = "black", show_vertices = true) {
      this.points = polygon.points.forEach((p) => new DrawablePoint(p));
      this.segments = polygon.segments.forEach((s) => new DrawableSegment(s));
      this.color = color;
      this.stroke_style = stroke_style;
      this.show_vertices = show_vertices;
   }

   // from nithins
   draw(ctx) {
      if (this.points.length > 0) {
          this.segments.forEach((segment) => {
            segment.setPenWidth(this.penWidth);
            segment.setColor(this.color);
            segment.draw(ctx);
          });

          if (this.show_vertices) {
            this.points.forEach((point) => {
              if (!(point instanceof Site)) point.setColor(this.color);
              point.setRadius(this.radius);
              if (this.showInfo) { 
                point.setShowInfo(true); 
              }
              else { 
                point.setShowInfo(false); 
              }
              point.draw(ctx); 
            });
          }
      }
    }
}

class DrawableSegment {
  constructor(segment, locked = false, color = "black", stroke_style = "black") {
    this.segment = segment;
    this.locked = locked;
    this.color = color;
    this.stroke_style = stroke_style;
  }
}

class DrawablePoint {
  constructor(point) {
    this.point = point;
    this.locked = locked;
    this.color = "black";
    this.stroke_style = "black";
  }

}

class Site {
  constructor(drawable_point, radius = 3) {
    this.drawable_point = drawable_point;
    this.drawable_point.color = "blue";
    this.radius = radius;
  }
}
import { Polygon } from "../geometry/primitives.js";
import { createSegmentsFromPoints, intersectSegments, intersectSegmentsAsLines } from "../geometry/utils.js";

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

class DrawableSpoke {
  constructor(spoke) {
    this.spoke = spoke;
  }
}

export class DrawablePoint {
  constructor(point) {
    this.point = point;
    this.locked = locked;
    this.color = "black";
    this.stroke_style = "black";
  }

  setDraw(draw) {
      this.drawPoint = draw;
    }

  draw(ctx) {
      if (this.drawPoint) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
        ctx.fill();
      }
  }

  drawWithRing(ctx, ringColor = "red", ringRadius = 8) {
    // outer ring
    ctx.beginPath();
    ctx.arc(this.x, this.y, ringRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // inner ring
    this.draw(ctx);
  }

}

class DrawableBisector {
  constructor(bisector) {
    this.drawable_point = drawable_point;
    this.drawable_point.color = "blue";
    this.radius = radius;
  }

}

class DrawableConicSegment {
  constructor(conic_segment) {
    this.conic_segment = conic_segment;
  }

  draw(ctx,num_of_points) {
    // we do a for loop from start to end
    // end - start / num_of_points is our dt (dt could be negative)
    // for i from 0 to number of points, start + dt * i = t
    // this.paramaterizedConic.getPointFromT(t) gets us the point
    // then we can draw a line between the points
    // yay

    let dt = (this.conic_segment.end - this.conic_segment.start) / num_of_points;
    let segments = [];

    for (let i = 0; i < num_of_points - 1; i++) {
      let t1 = start + dt * i;
      let t2 = start + dt * (i + 1);
      let p1 = this.conic_segment.paramaterized_conic.getPointFromT(t1);
      let p2 = this.conic_segment.paramaterized_conic.getPointFromT(t2);
      segments.push(createSegmentsFromPoints([p1, p2]));
    }

    segments.forEach((s) => s.draw(ctx));
  }
}

class Site {
  constructor(drawable_point, radius = 3) {
    this.drawable_point = drawable_point;
    this.drawable_point.color = "blue";
    this.radius = radius;

  }

  draw(ctx) {
        if (this.drawSpokes) { this.spokes.forEach((spoke) => {
          spoke.setColor(this.color);
          spoke.draw(ctx);
        }); }
        if (this.selected) {
          this.drawSelectionRing(ctx);
        }
        this.drawable_point.draw(ctx);
    }
}
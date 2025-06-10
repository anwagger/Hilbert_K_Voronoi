import { Polygon, Segment } from "../geometry/primitives.js";
import { createSegmentsFromPoints, intersectSegments, intersectSegmentsAsLines } from "../geometry/utils.js";

export class DrawablePolygon {
   constructor(polygon = new Polygon(), color = "blue", stroke_style = "black", show_vertices = true) {
      this.polygon = polygon;
      this.points = [];
      for (let i = 0; i < polygon.points.length; i++) {
        this.points.push(new DrawablePoint(polygon.points[i]));
      }

      let segs = createSegmentsFromPoints(this.polygon.points);

      this.segments = [];
      for (let i = 0; i < segs.length; i++) {
        this.segments.push(new DrawableSegment(segs[i]));
      }
      this.color = color;
      this.stroke_style = stroke_style;
      this.show_vertices = show_vertices;
   }

   // from nithins
   draw(ctx) {
      if (this.polygon.points.length > 0) {
          this.segments.forEach((segment) => {
            //segment.setPenWidth(this.penWidth);
            segment.color = this.color
            segment.draw(ctx);
          });

          if (this.show_vertices) {
            this.points.forEach((point) => {
              // point.setRadius(this.radius);
              if (this.showInfo) { 
                //point.setShowInfo(true); 
              }
              else { 
                //point.setShowInfo(false); 
              }
              point.draw(ctx); 
            });
          }
      }
    }


}

export class DrawableSegment {
  constructor(segment) {
    this.segment = segment;
    this.locked = false;
    this.color = "black";
    this.width = 2;
    this.stroke_style = "black";
  }

  draw(ctx) {
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.width;
    ctx.beginPath();
    ctx.moveTo(this.segment.start.x, this.segment.start.y);
    ctx.lineTo(this.segment.end.x, this.segment.end.y);
    ctx.stroke();
  }
}

export class DrawableSpoke {
  constructor(spoke) {
    this.spoke = spoke;
  }
}

export class DrawablePoint {
  constructor(point) {
    this.point = point;
    this.locked = false;
    this.color = "black";
    this.stroke_style = "black";
    this.radius = 3;
    this.drawPoint = true;
  }

  setDraw(draw) {
      this.drawPoint = draw;
    }

  draw(ctx) {
      if (this.drawPoint) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.point.x, this.point.y, this.radius, 0, 2 * Math.PI);
        ctx.fill();
      }
  }

  drawWithRing(ctx, ringColor = "red", ringRadius = 8) {
    // outer ring
    ctx.beginPath();
    ctx.arc(this.point.x, this.point.y, ringRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // inner ring
    this.draw(ctx);
  }

}

export class DrawableBisector {
  constructor(bisector) {
    this.drawable_point = drawable_point;
    this.drawable_point.color = "blue";
    this.radius = radius;
  }

}

export class DrawableConicSegment {
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

    let start = this.conic_segment.start

    for (let i = 0; i <= num_of_points - 1; i++) {
      let t1 = start + dt * i;
      let t2 = start + dt * ((i + 1)%num_of_points);
      let p1 = this.conic_segment.parameterized_conic.getPointFromT(t1);
      let p2 = this.conic_segment.parameterized_conic.getPointFromT(t2);
      console.log(p1,p2)
      segments.push(new DrawableSegment(new Segment(p1, p2)));
    }

    segments.forEach((s) => s.draw(ctx));
  }
}

export class Site {
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
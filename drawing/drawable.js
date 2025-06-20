import { Polygon, Segment } from "../geometry/primitives.js";
import { createSegmentsFromPoints,
  convexHull, 
  intersectSegments, 
  intersectSegmentsAsLines } from "../geometry/utils.js";

export let CAMERA =  {
  move_lock: true,
  offset: {
    x:0,y:0
  },
  scale: {
    x:1,y:1
  },
  x: function(x){
    return this.scale.x * (x - this.offset.x)
  },
  ix: function(x){
    return x/this.scale.x + this.offset.x
  },
  y: function(y){
    return this.scale.y * (y - this.offset.y)
  },
  iy: function(y){
    return y/this.scale.y + this.offset.y
  },
  changeOffset: function (dx,dy){
    this.offset.x -= dx/this.scale.x
    this.offset.y -= dy/this.scale.y
  },
  changeScale: function (d){
    this.scale.x -= this.scale.x * d/10
    this.scale.y -= this.scale.y * d/10
  },
}

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

   addPoint(point){
    this.polygon.addPoint(point)
    this.points = []
    this.segments = []
    for(let i = 0; i < this.polygon.points.length; i++){
      let p = this.polygon.points[i]
      this.points.push(new DrawablePoint(p))
      let s = this.polygon.segments[i]
      if (s){
        this.segments.push(new DrawableSegment(s))
      }
    }
   }

   // from nithins
  draw(ctx) {
    this.segments.forEach((segment) => {
      //segment.setPenWidth(this.penWidth);
      segment.color = this.color
      segment.draw(ctx);
    });
    if (this.show_vertices) {
      this.points.forEach((point) => {
        // point.setRadius(this.radius);
        if (this.showInfo) { 
          point.showInfo = true; 
        }
        else { 
          point.showInfo = false; 
          point.deleteInfoBox()
        }
        point.draw(ctx); 
      });
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
    ctx.moveTo(CAMERA.x(this.segment.start.x), CAMERA.y(this.segment.start.y));
    ctx.lineTo(CAMERA.x(this.segment.end.x), CAMERA.y(this.segment.end.y));
    ctx.stroke();
  }
}

export class DrawableSpoke {
  constructor(spoke) {
    this.spoke = spoke;
    this.segment = new DrawableSegment(spoke.segment)
    this.color = "blue"
  }
  draw(ctx){
    this.segment.color = this.color
    this.segment.draw(ctx)
  }
}

export class DrawablePoint {
  constructor(point) {
    this.point = point;
    this.locked = false;
    this.color = "black";
    this.stroke_style = "black";
    this.label = "";
    this.radius = 3;
    this.drawPoint = true;
    this.defaultInfoBoxPosition = false;
    this.infoBoxPosition = false;
    this.infoBox = null;
  }

  setDraw(draw) {
      this.drawPoint = draw;
    }

  draw(ctx) {
      if (this.drawPoint) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(CAMERA.x(this.point.x), CAMERA.y(this.point.y), this.radius, 0, 2 * Math.PI);
        ctx.fill();
      }
  }

  drawWithRing(ctx, ringColor = "red", ringRadius = 8) {
    // outer ring
    ctx.beginPath();
    ctx.arc(CAMERA.x(this.point.x), CAMERA.y(this.point.y), ringRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // inner ring
    this.draw(ctx);
  }

  drawInfoBox(canvas, dpr) {
    let canvasElement = canvas.canvas
    const container = document.getElementById('infoBoxContainer');
    const rect = canvasElement.getBoundingClientRect();

    // Create the infoBox element only if it doesn't already exist
    if (!this.infoBox) {
        this.infoBox = document.createElement('div');
        this.infoBox.className = 'infoBox';
        container.appendChild(this.infoBox);
        
    }

    this.infoBox.style.display = "block"

    const mathExpression = 
      this.label 
      ? `\\textcolor{${this.color}}{${this.label}: (${this.point.x.toFixed(0)}, ${this.point.y.toFixed(0)})}` 
      : `\\textcolor{${this.color}}{(${this.point.x.toFixed(0)}, ${this.point.y.toFixed(0)})}`;
    
    this.infoBox.dataset.math = mathExpression;
    this.infoBox.textContent = 
      this.label 
      ? `${this.label}: (${this.point.x.toFixed(0)}, ${this.point.y.toFixed(0)})` 
      : `(${this.point.x.toFixed(0)}, ${this.point.y.toFixed(0)})`;

    this.infoBox.style.borderColor = this.color;
    this.infoBox.style.zIndex = 999;

    const canvasX = CAMERA.x(this.point.x) * (rect.width / canvasElement.width) * dpr;
    const canvasY = CAMERA.y(this.point.y) * (rect.height / canvasElement.height) * dpr;

    const newLeft = rect.left + canvasX;
    const newTop = rect.top + canvasY - 10;
    
    this.infoBox.style.left = `${newLeft}px`;
    this.infoBox.style.top = `${newTop}px`;

    canvas.makeDraggableAroundPoint(this.infoBox, this, rect);
  }

  deleteInfoBox() {
      if (this.infoBox) {
          this.infoBox.remove()
          this.infoBox = null
        }
  }

}

export class DrawableBisector {
  constructor(bisector,p1_index,p2_index) {
    this.p1 = p1_index
    this.p2 = p2_index
    this.bisector = bisector;
    this.drawable_conic_segments = [];
    this.color = "blue"
    bisector.conic_segments.forEach((c_s) => {
      let d_c_s = new DrawableConicSegment(c_s)
      d_c_s.color = this.color
      this.drawable_conic_segments.push(d_c_s)
    })
  }

  draw(ctx){
    this.drawable_conic_segments.forEach((d_c_s) => {
      d_c_s.draw(ctx,50)
    })
  }

}

export class DrawableConicSegment {
  constructor(conic_segment) {
    this.conic_segment = conic_segment;
    this.color = "black"
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
      let t2 = start + dt * ((i + 1));
      let p1 = this.conic_segment.parameterized_conic.getPointFromT(t1);
      let p2 = this.conic_segment.parameterized_conic.getPointFromT(t2);
      segments.push(new DrawableSegment(new Segment(p1, p2)));
    }

    segments.forEach((s) => {
      s.color = this.color 
      s.draw(ctx)
    });
  }
  drawStraight(ctx,num_of_points) {
    // we do a for loop from start to end
    // end - start / num_of_points is our dt (dt could be negative)
    // for i from 0 to number of points, start + dt * i = t
    // this.paramaterizedConic.getPointFromT(t) gets us the point
    // then we can draw a line between the points
    // yay

    let dt = Math.abs(this.conic_segment.end - this.conic_segment.start) / num_of_points;
    let segments = [];

    let start = this.conic_segment.start


    for (let i = 0; i < num_of_points - 1; i++) {
      let t1 = (start + dt * i);
      let t2 = start + dt * ((i + 1)%num_of_points);
      let p1 = this.conic_segment.parameterized_conic.getPointFromTStraight(t1);
      let p2 = this.conic_segment.parameterized_conic.getPointFromTStraight(t2);
      segments.push(new DrawableSegment(new Segment(p1, p2)));
    }

    segments.forEach((s) => {
      s.color = this.color 
      s.draw(ctx)
    });
  }
}

export class Site {
  constructor(drawable_point, drawable_spokes, radius = 8) {
    this.draw_spokes = false
    this.drawable_point = drawable_point;
    this.drawable_point.color = "blue";
    this.color = "blue";
    this.drawable_spokes = drawable_spokes
    this.radius = radius;
    this.selected = false

  }

  setColor(color){
    this.color = color
    this.drawable_point.color = color
    if(this.drawable_spokes){
    this.drawable_spokes.forEach((spoke) => {
      spoke.color = color
    })
    }

  }

  draw(ctx) {
        if (this.selected) {
          this.drawSelectionRing(ctx);
        }
        this.drawable_point.draw(ctx);
    }

  drawSelectionRing(ctx){
    ctx.strokeStyle = this.color;
    ctx.beginPath();
    ctx.arc(CAMERA.x(this.drawable_point.point.x), CAMERA.y(this.drawable_point.point.y), this.radius, 0, 2 * Math.PI);
    ctx.stroke();
}
}
import { ConicSegment,calculateConicSegmentBounds } from "../geometry/conics.js";
import { calculateHilbertPoint } from "../geometry/hilbert.js";
import {Point, Polygon, Segment } from "../geometry/primitives.js";
import {Ball} from "../geometry/balls.js";

import { createSegmentsFromPoints,
  convexHull, 
  intersectSegments, 
  intersectSegmentsAsLines,
colorNameToHex,
hexToRgb, 
computeBoundingBox,
calculateHilbertDistance,
isBetween,
pointInPolygon,
getVoronoiColor,
colors} from "../geometry/utils.js";

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
  setScale: function(v) {
    this.scale.x = v;
    this.scale.y = v;
  }
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
      this.dashes = null
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
    if (this.dashes){
        ctx.setLineDash(this.dashes) 
    }
    this.segments.forEach((segment) => {
      //segment.setPenWidth(this.penWidth);
      segment.color = this.color

      segment.draw(ctx);
      
    });
    ctx.setLineDash([]) 
    if (this.show_vertices) {
      this.points.forEach((point) => {
        point.draw(ctx); 
      });
    }
  }
  drawFill(ctx){
    let points = this.polygon.points
    
    if(points.length > 0){
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(CAMERA.x(points[0].x), CAMERA.y(points[0].y));
      for(let i = 1; i < points.length; i++){
        ctx.lineTo(CAMERA.x(points[i].x),CAMERA.y(points[i].y));
      }
      ctx.closePath();
      ctx.fill();
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

  drawDotted(ctx) {
    ctx.beginPath();
    ctx.setLineDash([1, 3]); 
    ctx.moveTo(CAMERA.x(this.segment.start.x), CAMERA.y(this.segment.start.y));
    ctx.lineTo(CAMERA.x(this.segment.end.x), CAMERA.y(this.segment.end.y));
    ctx.stroke(); 
    ctx.setLineDash([]); 
    
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

export class DrawableBisectorSegment {
  constructor(bisector_segment,p1_index,p2_index){
    this.bisector_segment = bisector_segment
    this.p1 = p1_index
    this.p2 = p2_index 
    this.drawable_conic_segments = []
    this.color = "blue"
    let start = bisector_segment.start
    let end = bisector_segment.end
    let conic_segments = bisector_segment.bisector.conic_segments
    for (let i = Math.floor(start); i < Math.ceil(end); i++){
        let conic_segment = conic_segments[i];
        let p_conic = conic_segment.parameterized_conic

        let start_percentage = 0
        let end_percentage = 1
        let range = conic_segment.getRange()

        if (i < start) {

            start_percentage = (start % 1)
            
        } 
        if (i > (end-1)){
            end_percentage = (end % 1)
            
        }
        
        let start_t = conic_segment.start + range * start_percentage
        let end_t = conic_segment.start + range * end_percentage

        let new_bound = calculateConicSegmentBounds(p_conic,start_t,end_t,conic_segment.direction)
        let partial_c_s = new ConicSegment(p_conic,start_t,end_t,new_bound,conic_segment.direction)
        this.drawable_conic_segments.push(new DrawableConicSegment(partial_c_s))
        
    }
  }

  draw(ctx){
    const debug_colors = ["red","orange","yellow","green","blue","purple","pink","brown","grey"]
    const segment_num_map = {
      D: 5,
      E: 30,
      H: 30,
      P: 30,
    }

    this.drawable_conic_segments.forEach((d_c_s,i) => {
      //d_c_s.color = debug_colors[i % debug_colors.length]
      d_c_s.draw(ctx,segment_num_map[d_c_s.conic_segment.parameterized_conic.type])
    })

     // bisector bounding box
    
    
     /*
    let b_s = this.bisector_segment
    ctx.beginPath();
    ctx.setLineDash([5, 5]); 
    ctx.rect(CAMERA.x(b_s.bound.left),CAMERA.y(b_s.bound.top),CAMERA.x(b_s.bound.right) - CAMERA.x(b_s.bound.left),CAMERA.y(b_s.bound.bottom) - CAMERA.y(b_s.bound.top))
    ctx.stroke(); 
    ctx.setLineDash([]); 
    */
  }
}

export class DrawableBisector {
  constructor(bisector,p1_index,p2_index,color = "black") {
    this.p1 = p1_index
    this.p2 = p2_index
    this.bisector = bisector;
    this.drawable_conic_segments = [];
    this.color = color
    bisector.conic_segments.forEach((c_s) => {
      let d_c_s = new DrawableConicSegment(c_s)
      d_c_s.color = this.color
      this.drawable_conic_segments.push(d_c_s)
    })
  }

  draw(ctx){
    //const debug_colors = ["red","orange","yellow","green","blue","purple","pink","brown","grey"]
    this.drawable_conic_segments.forEach((d_c_s,i) => {
      //d_c_s.color = debug_colors[i % debug_colors.length]
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

    let length = this.conic_segment.getRange()

    let dt = length / num_of_points;
    let segments = [];

    let start = this.conic_segment.start
    
    // for debugging!
    
    /**
    let degen = this.conic_segment.parameterized_conic.type === "D" && this.conic_segment.parameterized_conic.orientation === "N"
    if (degen){
      start = 0
      dt = 2*Math.PI/num_of_points//2*Math.PI/num_of_points
    }
        */
    
    let c_s = this.conic_segment

    for (let i = 0; i <= num_of_points - 1; i++) {
      let t1 = start + dt * i;
      
      let t2 = start + dt * ((i + 1));
      
      let p1 = c_s.parameterized_conic.getPointFromT(t1);
      let p2 = c_s.parameterized_conic.getPointFromT(t2);
      segments.push(new DrawableSegment(new Segment(p1, p2)));
    }

    segments.forEach((s) => {
      s.color = this.color 
      s.draw(ctx)
    });

    /**
    // bisector sector intersection points
    let p1 = new DrawablePoint(c_s.parameterized_conic.getPointFromT(c_s.start))
    p1.color = this.color
    p1.draw(ctx)
    let p2 = new DrawablePoint(c_s.parameterized_conic.getPointFromT(c_s.end))
    p2.color = this.color
    p2.draw(ctx)
     */

    
    // bisector bounding box
    

    /**
    
    ctx.beginPath();
    ctx.setLineDash([1, 3]); 
    ctx.rect(CAMERA.x(c_s.bound.left),CAMERA.y(c_s.bound.top),CAMERA.x(c_s.bound.right) - CAMERA.x(c_s.bound.left),CAMERA.y(c_s.bound.bottom) - CAMERA.y(c_s.bound.top))
    ctx.stroke(); 
    ctx.setLineDash([]); 
     */

  }
  /*
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
     **/
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
    this.balls = []
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
        this.balls.forEach((b) => {
          b.draw(ctx);
        })
    }

  drawSelectionRing(ctx){
    ctx.strokeStyle = this.color;
    ctx.beginPath();
    ctx.arc(CAMERA.x(this.drawable_point.point.x), CAMERA.y(this.drawable_point.point.y), this.radius, 0, 2 * Math.PI);
    ctx.stroke();
}
}

export class DrawableBruteForceVoronoi {
  constructor(voronoi) {
    this.brute_force = true;
    this.voronoi = voronoi;
    this.grid = [];
    this.update = false;
  }

  calculateBruteForce(canvas){
    this.voronoi.boundary = canvas.boundary.polygon
    const grid = this.voronoi.bruteForce(canvas);
    this.grid = grid;
    this.calculateBruteForceImage(canvas)
    this.update = true
  }

  calculateBruteForceImage(canvas){
    const width = 1000;
    const height = 1000;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    const degree = this.voronoi.degree;
    let grid = this.grid;

    let image_data = tempCtx.createImageData(width, height);

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const cell = grid[x]?.[y];
            if (Array.isArray(cell) && cell.length > degree - 1) {
              let {r:r,g:g,b:b} = getVoronoiColor(canvas,cell,degree);
              const i = (y * width + x) * 4;
              image_data.data[i] = r;
              image_data.data[i + 1] = g;
              image_data.data[i + 2] = b;
              image_data.data[i + 3] = 150;
            }   
        }
      canvas.voronoi_image = image_data;
    }
  }



  // andrew im ngl i vibecoded part of this because i was confused abt the camera it makes sense to me though
    drawBruteForce(canvas) {
        // temp canvas stuff gemini suggested for drawing to scale, might be a better way this is p slow rn
        const width = 1000;
        const height = 1000;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        const ctx = canvas.ctx; // This is the main canvas context

        tempCtx.putImageData(canvas.voronoi_image, 0, 0);

        ctx.globalAlpha = 0.6;

        const drawWidth = CAMERA.x(canvas.absolute_border.polygon.points[1].x) - CAMERA.x(canvas.absolute_border.polygon.points[0].x);
        const drawHeight = CAMERA.y(canvas.absolute_border.polygon.points[2].y) - CAMERA.y(canvas.absolute_border.polygon.points[0].y);

        ctx.drawImage(
            tempCanvas,               
            CAMERA.x(0),              
            CAMERA.y(0),          
            drawWidth,                
            drawHeight              
        );
        ctx.globalAlpha = 1.0; 
    }
}

export class DrawableVoronoiCell {
  constructor(voronoi_cell){
    this.voronoi_cell = voronoi_cell
    this.drawable_bisector_segments = []
    this.voronoi_cell.bisector_segments.forEach((b_s,i) =>{
      // don't care about p2 and p2 for this!
      let d_b_s = new DrawableBisectorSegment(b_s,null,null)
      d_b_s.color = "black"
      this.drawable_bisector_segments.push(d_b_s)
    })
  }

  draw(ctx){
    this.drawable_bisector_segments.forEach((b_s,i) =>{
      b_s.draw(ctx)
    })
    /*
    let v_c = this.voronoi_cell
    ctx.beginPath();
    ctx.setLineDash([5, 5]); 
    ctx.rect(CAMERA.x(v_c.bound.left),CAMERA.y(v_c.bound.top),CAMERA.x(v_c.bound.right) - CAMERA.x(v_c.bound.left),CAMERA.y(v_c.bound.bottom) - CAMERA.y(v_c.bound.top))
    ctx.stroke(); 
    ctx.setLineDash([]); 
    */
  }
}

export class DrawableVoronoiDiagram {
  constructor(voronoi){
    this.voronoi = voronoi
    this.drawable_cells = []
    this.voronoi.cells.forEach((cell,i) => {
      let d_c = new DrawableVoronoiCell(cell)
      this.drawable_cells.push(d_c)
    })
  }

  draw(ctx){
    this.drawable_cells.forEach((cell,i) => {
      cell.draw(ctx)
    })
  }
}

export class HilbertImage {
  constructor(boundary, image, scale = 100,looping = true){
    this.boundary = boundary
    this.image = image
    this.scale = scale
    this.looping = looping
    this.pointer = new Point(0,0)
    this.loadImageData()
  }

  loadImageData(){
    let polygon_bound = computeBoundingBox(this.boundary)

    //this.image.style.objectFit = "fill"
    this.image.width = polygon_bound.right - polygon_bound.left 
    this.image.height = polygon_bound.top - polygon_bound.bottom
    const imgCanvas = document.createElement('canvas');
    imgCanvas.width = this.image.width;
    imgCanvas.height = this.image.height;
    const imgCtx = imgCanvas.getContext('2d',{willReadFrequently:true,desynchronized:true,preserveDrawingBuffer:true});
    console.log("IMAGE",this.image)

    let img_sum = 0
    imgCtx.drawImage(this.image,0,0,this.image.width,this.image.height)
    this.image_data = imgCtx.getImageData(0,0,this.image.width, this.image.height);
    img_sum = this.image_data.data.reduce((accumulator, currentValue) => accumulator + currentValue,
    0)
    console.log("SUM",img_sum)
    console.log("DATA",this.image_data.data)
    

    

  }

  renderHilbertImage(){
    
    const width = 1000;
    const height = 1000;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    let image_data = tempCtx.createImageData(width, height);

    let polygon_bound = computeBoundingBox(this.boundary)
    
    let low_x = Math.floor(Math.max(0,polygon_bound.left))
    let low_y = Math.floor(Math.max(0,polygon_bound.bottom))
    let high_x = Math.ceil(Math.min(width,polygon_bound.right))
    let high_y = Math.ceil(Math.min(height,polygon_bound.top))
    for (let x = low_x; x < high_x; x++) {
      for (let y = low_y; y < high_y; y++) {
        let point = new Point(x, y);
        if (pointInPolygon(point, this.boundary)) {
          
          let hilbert = this.scale*calculateHilbertDistance(this.boundary, this.pointer, point);
          let angle = Math.atan2(y-this.pointer.y, x-this.pointer.x);
          let newX = ((this.pointer.x-low_x) + Math.cos(angle) * hilbert);
          let newY = ((this.pointer.y-low_y) + Math.sin(angle) * hilbert);
          if (this.looping) {
            newX = Math.abs((newX + Math.ceil(this.scale)*this.image.width) % this.image.width);
            newY = Math.abs((newY + Math.ceil(this.scale)*this.image.height) % this.image.height);
          }
          if (isBetween(0, this.image.width-1, newX) && isBetween(0, this.image.height-1, newY)) {
            const i = (y * width + x) * 4;
            const new_i = (Math.floor(newY) * this.image.width + Math.floor(newX)) * 4

            image_data.data[i] = this.image_data.data[new_i];
            image_data.data[i + 1] = this.image_data.data[new_i+1];
            image_data.data[i + 2] = this.image_data.data[new_i+2];
            image_data.data[i + 3] = this.image_data.data[new_i+3];
          }
        }
      }
    }
    this.hilbert_image_data = image_data
  }

  draw(ctx){
    const width = 1000;
    const height = 1000;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(this.hilbert_image_data, 0, 0);
    const drawWidth = CAMERA.x(width) - CAMERA.x(0);
    const drawHeight = CAMERA.y(height) - CAMERA.y(0);
    console.log(this.image_data,this.image.width,this.image.height)
    ctx.drawImage(
        tempCanvas,               
        CAMERA.x(0),              
        CAMERA.y(0),          
        drawWidth,                
        drawHeight              
    );
  }
}

export class DrawableBall {
  constructor(ball, color = "black") {
    this.ball = ball;
    this.color = color;
    this.polygon = new DrawablePolygon(this.ball.polygon,this.color);
    this.polygon.show_vertices = false;
  }

  draw(ctx) {
    this.polygon.draw(ctx);
  }

  recalculateBall(p) {
    let pointWithSpokes = calculateHilbertPoint(this.ball.boundary, p);
    this.ball = new Ball(pointWithSpokes, this.ball.type, this.ball.boundary, this.ball.radius);
    this.polygon = new DrawablePolygon(this.ball.polygon,this.color);
    this.polygon.show_vertices = false;
  }

  recalculateRadius(radius) {
    this.ball = new Ball(this.ball.point, this.ball.type, this.ball.boundary, radius);
    this.polygon = new DrawablePolygon(this.ball.polygon,this.color);
    this.polygon.show_vertices = false;
  }

  // draw should be dif types of lines/transparency for different types of balls. 
  // solid for hilbert, dashed for forward, more opaque for reverse, idk for thompson mayb inverse color?
}

export class DrawableZRegion{
  constructor(polygon,p1,p2,color){
    this.polygon = new DrawablePolygon(polygon)
    this.polygon.show_vertices = false
    this.p1 = p1
    this.p2 = p2
    this.color = color
    
  }
  draw(ctx){
    this.polygon.color = this.color
    this.polygon.draw(ctx)
  }
}
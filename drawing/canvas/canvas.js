import { CAMERA, DrawablePolygon,DrawablePoint,Site, DrawableSegment, DrawableSpoke, DrawableBisector, DrawableBisectorSegment, DrawableVoronoiDiagram, DrawableBall, DrawableZRegion, DrawableInfiniteBalls, DrawableDistance } from "../drawable.js"
import { calculateBisector, calculateSpokes, calculateHilbertPoint, calculateMidsector} from "../../geometry/hilbert.js"
import { initEvents } from "./canvas-events.js";
import { Polygon,Point} from "../../geometry/primitives.js";
import { Ball_Types, Ball, calculateZRegion, calculateInfiniteBalls} from "../../geometry/balls.js";

import {pointInPolygon,isBetween, euclideanDistance, cleanArray, hexToRgb, colorNameToHex, avgColor, pointOnPolygon, colors, colorNames, computeBoundingBox, calculateThompsonDistance, hilbertMidpoint, hilbertCentroid,pointNearPolygonBorder, centroid, hilbertCentroidList, convexHull, hilbertCentroidHarmonic, testCentroidRegion, calculateHilbertDistance, isZero, isLeZero, hilbertFrechetMean, hilbertGradientDescent} from "../../geometry/utils.js"
import { BisectorSegment, findPointsOnEitherSideOfBisector, intersectBisectors } from "../../geometry/bisectors.js";
import { createVoronoiFromCanvas, VoronoiDiagram } from "../../geometry/voronoi.js";

import { loadBoundary, loadSites, loadBisectors, loadSegments, loadBruteForceVoronoi, loadFastVoronoi, loadZRegions, loadInfiniteBalls} from "./load.js";
export class Canvas {
   constructor(canvasElement) {
      this.canvas = canvasElement;
      this.ctx = this.canvas.getContext('2d');

      // Init device stuff
      const dpr = window.devicePixelRatio;
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.scale(dpr, dpr);
      this.canvas.style.width = `${rect.width}px`;
      this.canvas.style.height = `${rect.height}px`;
      this.dpr = dpr;
      this.deleteBoundaryPoints()
      
      // domain of the hilbert simulation
      this.absolute_border = new DrawablePolygon(new Polygon([new Point(0,0),new Point(1000,0),new Point(1000,1000),new Point(0,1000)]))
      this.absolute_border.color = "black"
      this.absolute_border.dashes = [3,3]
      
      this.boundary = new DrawablePolygon(new Polygon([]),"black");
      this.mode = 'boundary';
      
      initEvents(this);
      
      // for collapsible menus
      this.activeManager = '';
      
      this.boundaryType = 'freeDraw';

      this.sites = [];
      this.site_radius = 3
      this.clusters = null;
      this.segments = [];
      this.bisectors = [];
      this.bisector_intersections = [];
      this.z_regions = [];
      this.infinite_balls = [];
      this.brute_force_voronoi = null;
      this.voronoi_image = null;

      this.calculate_fast_voronoi = false;
      this.voronois = null
      this.voronoi_diagram = null;
      this.current_voronoi_cell_index = -1
      this.delaunay = null;
      this.delaunay_degree = 1

      this.hilbert_image = null;
      this.draw_hilbert_image = false;

      this.space = null;

      this.draggingPoint = null;

      this.usedColors = [];

      this.selectionAnchor = new Point(0,0);
      this.selectionPointer = new Point(0,0);
      this.selecting = false

      this.draw_hilbert_rose = false
      this.hilbert_rose = []
      this.hilbert_rose_depth = 0
      this.draw_hilbert_centroid = false
      this.hilbert_centroid = null

      this.distances = []

   }

    load(data) {
      for (let d in data) {
         let val = data[d];
         switch(d) {
            case "boundary":
               loadBoundary(val, this);
            break;
            case "sites":
               loadSites(val, this);
            break;
            case "segments":
               loadSegments(val, this);
            break;
            case "bisectors":
               loadBisectors(val, this);
            break;
            case "brute_force_voronoi":
               loadBruteForceVoronoi(val, this);
            break;
            case "calculate_fast_voronoi":
               loadFastVoronoi(val, this, data["delaunay"]);
            break;
            case "z_regions":
               loadZRegions(val, this);
            break;
            case "infinite_balls":
               loadInfiniteBalls(val, this);
            break;
            case "delaunay":
            case "delaunay_degree":
            break;
            default:
               this[d] = val;
         }
      }
   }

   setPolygonType(type) {
         this.boundary = new DrawablePolygon(new Polygon([]),this.boundary.color, this.boundary.penWidth, this.boundary.showInfo, this.boundary.show_vertices, this.boundary.vertexRadius);
        this.boundaryType = type;
        if (type === 'customNgon') {
            const n = parseInt(this.customNgonInput);
            if (n >= 3) {
                this.createNgon(n);
            } else {
                alert('Please enter a number greater than or equal to 3.');
                return;
            }
        } else if (type !== 'freeDraw') {
            this.createNgon(parseInt(type));
        } else {
            //this.resetCanvas();

        }
        let deleteSiteIndex = []
        this.sites.forEach((site,i) => {
         if(pointOnPolygon(site.drawable_point.point,this.boundary.polygon) || !pointInPolygon(site.drawable_point.point,this.boundary.polygon) || !pointInPolygon(site.drawable_point.point,this.absolute_border.polygon)){
            deleteSiteIndex.push(i)
         }
        });
        for (let i = 0; i < deleteSiteIndex.length; i++){
            this.deleteSite(deleteSiteIndex[i])
        }
        this.reindexBisectors()
        this.reindexZRegions()
        this.reindexInfiniteBalls();
        this.reindexDistances();

        this.sites = cleanArray(this.sites)
        this.recalculateAll()
        this.drawAll();
    }
    
   drawSegments() {
         this.sites.forEach(site => {
            if (site.draw_spokes){
               site.drawable_spokes.forEach((d_s) => {
                  d_s.draw(this.ctx)
               })
            }
            
        });
   }
   drawBisectors() {
      this.bisectors.forEach((bisector,i) => {
         bisector.draw(this.ctx)

         /*
         let sites = findPointsOnEitherSideOfBisector(this.boundary.polygon,bisector.bisector)
         if(sites){
            let d_p = new DrawablePoint(sites[0])
            d_p.color = bisector.color
            d_p.draw(this.ctx)
         }
            */
      });
      this.bisector_intersections.forEach((d_p,i) => {
         d_p.draw(this.ctx)
      })
   }

   drawZRegions() {
      this.z_regions.forEach((z_r,i) => {
         z_r.draw(this.ctx)
      });
   }

   drawInfiniteBalls() {
      this.infinite_balls.forEach((inf ) => {
         inf.draw(this.ctx)
      });
   }

   drawVoronoi(){
      if(this.brute_force_voronoi){
         this.brute_force_voronoi.drawBruteForce(this,false);  
         this.brute_force_voronoi.update = false
      }

      if (this.calculate_fast_voronoi){
         if(this.current_voronoi_cell_index >= 0){
            if(this.voronoi_diagram.drawable_cells[this.current_voronoi_cell_index]){
               this.voronoi_diagram.drawable_cells[this.current_voronoi_cell_index].drawFill(this.ctx)
            }
         }
         this.voronoi_diagram.draw(this.ctx)
         
      }
   }

   drawCentroids(){
      if(this.draw_hilbert_rose){
         this.hilbert_rose.forEach((d_p) => {
            d_p.draw(this.ctx)
         })
      }
      if(this.draw_hilbert_centroid){
         if(this.hilbert_centroid){
            this.hilbert_centroid.draw(this.ctx)
         }
      }
   }

   createNgon(n) {
      const canvasCenterX = Math.min(this.canvas.width,1000) / (2 * this.dpr);
      const canvasCenterY = Math.min(this.canvas.height,1000) / (2 * this.dpr);
        
      const radius = Math.min(this.canvas.width, this.canvas.height) / (2.5 * this.dpr);
      
      this.deleteBoundaryPoints()
      this.boundary = new DrawablePolygon(new Polygon([]),this.boundary.color, this.boundary.penWidth, this.boundary.showInfo, this.boundary.show_vertices, this.boundary.vertexRadius);
        
      const tempVertices = [];
      for (let i = 0; i < n; i++) {
            const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            tempVertices.push({x, y});
      }
        
      const centroidX = tempVertices.reduce((sum, v) => sum + v.x, 0) / n;
      const centroidY = tempVertices.reduce((sum, v) => sum + v.y, 0) / n;
        
      for (const vertex of tempVertices) {
         const adjustedX = canvasCenterX + (vertex.x - centroidX);
         const adjustedY = canvasCenterY + (vertex.y - centroidY);
         this.boundary.addPoint(new Point(adjustedX, adjustedY));
      }
   }

   generateRandomGon(canvas) {
      const vertices = Math.round(Math.random() * 5) + 3;
      this.createNgon(vertices);
   }

   generateRandomSites(amt) {
      this.delaunay = null;
      this.brute_force_voronoi = null;
      this.voronois = null;
      this.voronoi_diagram = null; 
      this.calculate_fast_voronoi = false;


      if (this.boundary) {
         const boundary = this.boundary.polygon;
         const border = computeBoundingBox(boundary);

         while (amt > 0) {
            let point = new Point(-1, -1);

            while(!pointInPolygon(point, boundary) || pointNearPolygonBorder(point, boundary)) {
               let x = Math.random() * (border.right - border.left) + border.left
               let y = Math.random() * (border.top - border.bottom) + border.bottom
               point = new Point(x,y);
            }

            let site = new Site(new DrawablePoint(point),[],this.site_radius);
            site.drawable_point.color = this.getNewColor();
            site.color = site.drawable_point.color;
            this.sites.push(site);

            amt -= 1;
         }

         this.drawAll();
      }
   }

   getMousePos(event) {
      const rect = this.canvas.getBoundingClientRect();
      const rawX = event.clientX - rect.left;
      const rawY = event.clientY - rect.top;
      
      let sceneX = rawX;
      let sceneY = rawY;
      
      return { x: sceneX, y: sceneY };
   }

   getNewColor(){
      // gets random color, converts Math.random to an index of the colours map
      let idx = Math.floor(Math.random() * colorNames.length);
      if (this.usedColors.length == colorNames.length) {
         this.usedColors = [];
      }
      while(this.usedColors.includes(colorNames[idx])) {
         idx = Math.floor(Math.random() * colorNames.length);
      }
      return colorNames[idx];
   }

   resetUsedColors() {
      this.usedColors = [];
   }

   addSite(event){
      const {x, y} = this.getMousePos(event);
      
      let point = new Point(CAMERA.ix(x), CAMERA.iy(y))

      if (!pointOnPolygon(point,this.boundary.polygon) && pointInPolygon(point,this.boundary.polygon) && pointInPolygon(point,this.absolute_border.polygon)){
         let site = new Site(new DrawablePoint(point),[],this.site_radius)
         site.drawable_point.label = this.sites.length  + ""
         this.sites.push(site);
         let color = this.getNewColor(this.sites)
         console.log("COLOR: ",color)
         site.setColor(color)
         // calculate the new point
         this.recalculateSite(this.sites.length-1)
         this.recalculateFastVoronoi()
         this.recalculateHilbertDelaunay()
         this.recalculateBruteForceVoronoi()
         this.recalculateHilbertCentroid()
         this.recalculateHilbertRose()

         this.drawAll()
      }      
   }

   addBalls(siteIdx,balls, radius) {
      let s = this.sites[siteIdx];
      let pointWithSpokes = calculateHilbertPoint(this.boundary.polygon,s.drawable_point.point);
      
      if (balls.hilbert) {
         const ball = new Ball(pointWithSpokes,Ball_Types.HILBERT, this.boundary.polygon, radius);
         s.balls.push(new DrawableBall(ball,s.color));
      }
      
      if (balls.funk) {
         const ball = new Ball(pointWithSpokes,Ball_Types.WEAK_FUNK, this.boundary.polygon, radius);
         s.balls.push(new DrawableBall(ball,s.color));
      }
      
      if (balls.reverse) {
         const ball = new Ball(pointWithSpokes,Ball_Types.REVERSE_FUNK, this.boundary.polygon, radius);
         s.balls.push(new DrawableBall(ball,s.color));
      }
      
      if (balls.thompson) {
         const ball = new Ball(pointWithSpokes,Ball_Types.THOMPSON, this.boundary.polygon, radius);
         s.balls.push(new DrawableBall(ball,s.color));
      }
   }

   deleteBalls(siteIdx,balls){
      let s = this.sites[siteIdx];
      s.balls.forEach((d_b,b) => {
         let ball = d_b.ball
         if (ball.type === Ball_Types.HILBERT && balls.hilbert){
            s.balls[b] = null
         }else if (ball.type === Ball_Types.THOMPSON && balls.thompson){
            s.balls[b] = null
         }else if (ball.type === Ball_Types.WEAK_FUNK && balls.funk){
            s.balls[b] = null
         }else if (ball.type === Ball_Types.REVERSE_FUNK && balls.reverse){
            s.balls[b] = null
         }
      })
      s.balls = cleanArray(s.balls)
   }

   addPolygonPoint(event) {
      if (this.boundaryType === 'freeDraw') {

         const {x, y} = this.getMousePos(event);
         let point = new Point(CAMERA.ix(x), CAMERA.iy(y))
         if (pointInPolygon(point,this.absolute_border.polygon)){
            this.boundary.addPoint(point);
            this.recalculateAll()
            this.drawAll()
         }

      }
   }
   deleteBoundaryPoints(){
      if (this.boundary && this.boundary.points){
         this.boundary.points.forEach((point) => {
            point.deleteInfoBox()
         })
      }
   }

   setPolygonColor(event) {
        this.boundary.color = event.target.value;
        this.drawAll();
   }

   setSiteColor(event) {
      this.sites.forEach((site) =>{
         if (site.selected){
            site.setColor(event.target.value)
         }
      })
      this.drawAll();
   }

   setSiteSpokes(event) {
      this.sites.forEach((site) =>{
         if (site.selected){

            site.draw_spokes = event.target.checked
         }
      })
      this.drawAll();
   }



   setPolygonShowInfo(event) {
      this.boundary.showInfo = event.target.checked;
      this.boundary.points.forEach((point,i) => {
         if (this.boundary.showInfo) { 
            point.showInfo = true; 
            point.label = i+""
         }else { 
            point.showInfo = false; 
            point.deleteInfoBox()
         }
      });
      this.drawAll();
   }

   setSiteShowInfo(event, idx) {
      let site = this.sites[idx]
      site.drawable_point.showInfo = event.target.checked;
      if (!site.drawable_point.showInfo){
         site.drawable_point.deleteInfoBox();
      }
      this.drawAll();
   }


   addBisector(bisector,p1,p2) {
      let c1 = this.sites[p1].color 
      let c2 = this.sites[p2].color
      let c3 = avgColor(c1,c2)

      let d_b = new DrawableBisector(bisector,p1,p2,c3)
      this.bisectors.push(d_b);
      this.drawAll();
   }

   setBisectors(event) {
      let selectedSites = []
      this.sites.forEach((site,i) =>{
         if (site.selected){

            selectedSites.push(i)
         }
      })      
      for(let i = 0; i < selectedSites.length; i++){
         let p1 = selectedSites[i]
         for(let j = i+1; j < selectedSites.length; j++){
            let p2 = selectedSites[j]
            if (event.target.checked){
               let needNew = true
               this.bisectors.forEach((bisector,b) => {
                  if ((bisector.p1 === p1 && bisector.p2 === p2) || (bisector.p1 === p2 && bisector.p2 === p1)){
                     needNew = false
                     this.recalculateBisector(b)
                  }
               })
               if(needNew){
                  let boundary = this.boundary.polygon
                  let point1 = this.sites[selectedSites[i]].drawable_point.point
                  let point2 = this.sites[selectedSites[j]].drawable_point.point
                  let h_p1 = calculateHilbertPoint(boundary,point1)
                  let h_p2 = calculateHilbertPoint(boundary,point2)
                  let bisector = calculateBisector(boundary,h_p1,h_p2)
                  this.addBisector(bisector,p1,p2)

               }
            }else{
               this.deleteBisector(p1,p2)
            }
            
            
         }
      }
      this.calculateBisectorIntersections()
      this.drawAll();
   }

   // run after deleting sites, but before cleaning!
   reindexBisectors(){
      let indexMap = []
      let index = 0
      for(let i = 0; i < this.sites.length; i++){
         if(this.sites[i]){
            indexMap.push(index)
            index ++
         }else{
            indexMap.push(-1)
         }
      }
      for(let b = 0; b < this.bisectors.length; b++){
         let draw_bisector = this.bisectors[b]
         draw_bisector.p1 = indexMap[draw_bisector.p1]
         draw_bisector.p2 = indexMap[draw_bisector.p2]
         if(draw_bisector.p1 === -1 || draw_bisector.p2 === -1){
            this.bisectors[b] = null
         }
      }
      this.bisectors = cleanArray(this.bisectors)
   }

   recalculateBisector(b){
      let draw_bisector = this.bisectors[b]
      let boundary = this.boundary.polygon
      let point1 = this.sites[draw_bisector.p1].drawable_point.point
      let point2 = this.sites[draw_bisector.p2].drawable_point.point
      let h_p1 = calculateHilbertPoint(boundary,point1)
      let h_p2 = calculateHilbertPoint(boundary,point2)
      let new_bisector = new DrawableBisector(calculateBisector(boundary,h_p1,h_p2),draw_bisector.p1,draw_bisector.p2,draw_bisector.color)
      this.bisectors[b] = new_bisector
      
   }

   deleteBisector(p1,p2){
      this.bisectors.forEach((bisector,b) => {
         if ((bisector.p1 === p1 && bisector.p2 === p2) || (bisector.p1 === p2 && bisector.p2 === p1)){
            this.bisectors[b] = null
         }
      })
      this.bisectors = cleanArray(this.bisectors)
   }
   
   addZRegion(z_r,p1,p2) {
      let c1 = this.sites[p1].color 
      let c2 = this.sites[p2].color
      let c3 = avgColor(c1,c2)

      let d_z_r = new DrawableZRegion(z_r,p1,p2,c3)
      this.z_regions.push(d_z_r);
      this.drawAll();
   }

   setZRegions(event) {
      let selectedSites = []
      this.sites.forEach((site,i) =>{
         if (site.selected){

            selectedSites.push(i)
         }
      })      
      for(let i = 0; i < selectedSites.length; i++){
         let p1 = selectedSites[i]
         for(let j = i+1; j < selectedSites.length; j++){
            let p2 = selectedSites[j]
            if (event.target.checked){
               let needNew = true
               this.z_regions.forEach((z_r,z) => {
                  if ((z_r.p1 === p1 && z_r.p2 === p2) || (z_r.p1 === p2 && z_r.p2 === p1)){
                     needNew = false
                     this.recalculateZRegion(z)
                  }
               })
               if(needNew){
                  let boundary = this.boundary.polygon
                  let point1 = this.sites[selectedSites[i]].drawable_point.point
                  let point2 = this.sites[selectedSites[j]].drawable_point.point
                  let h_p1 = calculateHilbertPoint(boundary,point1)
                  let h_p2 = calculateHilbertPoint(boundary,point2)
                  let bisector = calculateBisector(boundary,h_p1,h_p2)
                  let z_r = calculateZRegion(boundary,h_p1,h_p2,bisector)
                  this.addZRegion(z_r,p1,p2)

               }
            }else{
               this.deleteZRegion(p1,p2)
            }
         }
      }
      this.drawAll();
   }

   // run after deleting sites, but before cleaning!
   reindexZRegions(){
      let indexMap = []
      let index = 0
      for(let i = 0; i < this.sites.length; i++){
         if(this.sites[i]){
            indexMap.push(index)
            index ++
         }else{
            indexMap.push(-1)
         }
      }
      for(let z = 0; z < this.z_regions.length; z++){
         let d_z_r = this.z_regions[z]
         d_z_r.p1 = indexMap[d_z_r.p1]
         d_z_r.p2 = indexMap[d_z_r.p2]
         if(d_z_r.p1 === -1 || d_z_r.p2 === -1){
            this.z_regions[z] = null
         }
      }
      this.z_regions = cleanArray(this.z_regions)
   }

   recalculateZRegion(z){
      let d_z_r = this.z_regions[z]
      let boundary = this.boundary.polygon
      let point1 = this.sites[d_z_r.p1].drawable_point.point
      let point2 = this.sites[d_z_r.p2].drawable_point.point
      let h_p1 = calculateHilbertPoint(boundary,point1)
      let h_p2 = calculateHilbertPoint(boundary,point2)
      let bisector = calculateBisector(boundary,h_p1,h_p2)
      let new_z_r = new DrawableZRegion(calculateZRegion(boundary,h_p1,h_p2,bisector),d_z_r.p1,d_z_r.p2,d_z_r.color)
      this.z_regions[z] = new_z_r
      
   }

   deleteZRegion(p1,p2){
      this.z_regions.forEach((z_r,z) => {
         if ((z_r.p1 === p1 && z_r.p2 === p2) || (z_r.p1 === p2 && z_r.p2 === p1)){
            this.z_regions[z] = null
         }
      })
      this.z_regions = cleanArray(this.z_regions)
   }

   addInfiniteBalls(ball1, ball2, p1,p2) {
      const d_ball1 = new DrawableBall(ball1, this.sites[p1].color);
      const d_ball2 = new DrawableBall(ball2, this.sites[p2].color);

      let inf_ball = new DrawableInfiniteBalls(d_ball1, d_ball2, p1, p2);
      this.infinite_balls.push(inf_ball);
      this.drawAll();
   }

   setInfiniteBalls(event) {
      let selectedSites = []
      this.sites.forEach((site,i) =>{
         if (site.selected){

            selectedSites.push(i)
         }
      })      
      for(let i = 0; i < selectedSites.length; i++){
         let p1 = selectedSites[i]
         for(let j = i+1; j < selectedSites.length; j++){
            let p2 = selectedSites[j]
            if (event.target.checked){
               let needNew = true
               this.infinite_balls.forEach((inf,i) => {
                  if ((inf.p1 === p1 && inf.p2 === p2) || (inf.p1 === p2 && inf.p2 === p1)){
                     needNew = false
                     this.recalculateInfiniteBalls(i)
                  }
               })
               if(needNew){
                  let boundary = this.boundary.polygon
                  let point1 = this.sites[selectedSites[i]].drawable_point.point
                  let point2 = this.sites[selectedSites[j]].drawable_point.point
                  let h_p1 = calculateHilbertPoint(boundary,point1)
                  let h_p2 = calculateHilbertPoint(boundary,point2)
                  let bisector = calculateBisector(boundary,h_p1,h_p2)
                  let {ball1, ball2} = calculateInfiniteBalls(boundary,h_p1,h_p2,bisector)
                  this.addInfiniteBalls(ball1, ball2, p1, p2);
               }
            }else{
               this.deleteInfiniteBalls(p1,p2)
            }
         }
      }
      this.drawAll();
   }

   // run after deleting sites, but before cleaning!
   reindexInfiniteBalls(){
      let indexMap = []
      let index = 0
      for(let i = 0; i < this.sites.length; i++){
         if(this.sites[i]){
            indexMap.push(index)
            index ++
         }else{
            indexMap.push(-1)
         }
      }

      for(let i = 0; i < this.infinite_balls.length; i++){
         let inf_ball = this.infinite_balls[i]
         inf_ball.p1 = indexMap[inf_ball.p1]
         inf_ball.p2 = indexMap[inf_ball.p2]
         if(inf_ball.p1 === -1 || inf_ball.p2 === -1){
            this.infinite_balls[i] = null
         }
      }
      this.infinite_balls = cleanArray(this.infinite_balls)
   }

   recalculateInfiniteBalls(i){
      let inf_ball = this.infinite_balls[i]
      let boundary = this.boundary.polygon
      let point1 = this.sites[inf_ball.p1].drawable_point.point
      let point2 = this.sites[inf_ball.p2].drawable_point.point
      let h_p1 = calculateHilbertPoint(boundary,point1)
      let h_p2 = calculateHilbertPoint(boundary,point2)
      let bisector = calculateBisector(boundary,h_p1,h_p2)
      let {ball1, ball2} = calculateInfiniteBalls(boundary,h_p1,h_p2,bisector);

      const d_ball1 = new DrawableBall(ball1, this.sites[inf_ball.p1].color);
      const d_ball2 = new DrawableBall(ball2, this.sites[inf_ball.p2].color);

      let new_inf_ball = new DrawableInfiniteBalls(d_ball1, d_ball2, inf_ball.p1,inf_ball.p2);
      this.infinite_balls[i] = new_inf_ball;  
   }

   deleteInfiniteBalls(p1,p2){
      this.infinite_balls.forEach((inf_ball,i) => {
         if ((inf_ball.p1 === p1 && inf_ball.p2 === p2) || (inf_ball.p1 === p2 && inf_ball.p2 === p1)){
            this.infinite_balls[i] = null
         }
      })
      this.infinite_balls = cleanArray(this.infinite_balls)
   }



   calculateBisectorIntersections(){
   }

   recalculateHilbertRose(){
      if(!this.draw_hilbert_rose){
         return 
      }
      let points = []
      for(let i = 0; i < this.sites.length; i++){
         points.push(this.sites[i].drawable_point.point)
      }
      this.hilbert_rose = []

   
      for(let i = 0; i < this.hilbert_rose_depth; i++){
         
         let hilbert_centroid = hilbertCentroidList(this.boundary.polygon,points,Infinity,i)
        let color = 255*i / this.hilbert_rose_depth
        this.hilbert_rose.push(new DrawablePolygon(new Polygon(convexHull(hilbert_centroid)),"rgb("+color+","+color+","+color+")","black",false))
      }     

      /**
      let n = points.length
      let all_orders = []
      for(let i = 0; i < n**n; i++){
         all_orders.push([])
         let exists = {}
         for(let j = 0; j < n; j++){
            exists[j] = false
            all_orders[i].push(Math.floor(i/(n**j)) % n )
         }
         let use = true
         for(let j = 0; j < n; j++){
            if(exists[all_orders[i][j]]){
               use = false
               break;
            }
            exists[all_orders[i][j]] = true
         }
         if(!use){
            all_orders[i] = false
         }
      }
      
      let troids = []
      for(let i = 0; i < all_orders.length; i++){
         if(all_orders[i]){
            let new_points = []
            for(let j = 0; j < all_orders[i].length; j++){
               new_points.push(points[all_orders[i][j]])
            }
            troids.push(hilbertCentroidHarmonic(this.boundary.polygon,new_points))
         }
         
      }
      troids.push(new DrawablePolygon(new Polygon(convexHull(troids)),"red",null,false))
      troids.forEach((p,i) => {
         if(p.x){
            let d_p = new DrawablePoint(p)
            d_p.color = "red"
            //this.hilbert_rose.push(d_p)
         }else{
            this.hilbert_rose.push(p)
         }
         
      })
       */

      

   }
   recalculateHilbertCentroid(){
      if(!this.draw_hilbert_centroid){
         return 
      }
      let points = []
      for(let i = 0; i < this.sites.length; i++){
         points.push(this.sites[i].drawable_point.point)
      }
      //let hilbert_centroid = hilbertCentroid(this.boundary.polygon,points)
      let hilbert_centroids = hilbertGradientDescent(this.boundary.polygon,points,1000)
      if(hilbert_centroids){
         this.hilbert_centroid = new DrawablePoint(hilbert_centroids[hilbert_centroids.length-1])
      }

      this.bisector_intersections = []
      if(this.brute_force_voronoi){
         
         if(this.brute_force_voronoi.voronoi.mode === "minmax"){
            let grid = this.brute_force_voronoi.grid
            let boundary = this.brute_force_voronoi.voronoi.boundary

            let polygon_bound = computeBoundingBox(boundary)

            let width = 1000
            let height = 1000
            let low_x = Math.floor(Math.max(0,polygon_bound.left))
            let low_y = Math.floor(Math.max(0,polygon_bound.bottom))
            let high_x = Math.ceil(Math.min(width,polygon_bound.right))
            let high_y = Math.ceil(Math.max(height,polygon_bound.top))

            let curr_max_dist = {
               point: new Point(0,0),
               dist: Infinity,
            }
            let min_points = []
            for (let x = low_x; x < high_x; x++) {
               for (let y = low_y; y < high_y; y++) {
                  if(pointInPolygon(new Point(x,y),boundary) && !pointOnPolygon(new Point(x,y),boundary)){
                     let cell = grid[x][y]
                     let max_dist = 0
                        for (let d = 0; d < cell.length; d++) {
                        const dist = cell[d].dist**2;
                        max_dist = Math.max(dist,max_dist)
                     }
                     if(max_dist < curr_max_dist.dist){
                        curr_max_dist.point = new Point(x,y)
                        min_points = [curr_max_dist.point]
                        curr_max_dist.dist = max_dist 
                     }
                  }
                  
               }
            }
            this.bisector_intersections = []
            min_points.forEach((p,i) => {
               let d_p = new DrawablePoint(p)
               d_p.color = "red"
               this.bisector_intersections.push(d_p)
            })
            
         }
         if(this.brute_force_voronoi.voronoi.mode === "variance"){
            let grid = this.brute_force_voronoi.grid
            let boundary = this.brute_force_voronoi.voronoi.boundary

            let polygon_bound = computeBoundingBox(boundary)

            let width = 1000
            let height = 1000
            let low_x = Math.floor(Math.max(0,polygon_bound.left))
            let low_y = Math.floor(Math.max(0,polygon_bound.bottom))
            let high_x = Math.ceil(Math.min(width,polygon_bound.right))
            let high_y = Math.ceil(Math.max(height,polygon_bound.top))

            let min_variance = {
               point: new Point(0,0),
               variance: Infinity,
            }
            let min_points = []
            for (let x = low_x; x < high_x; x++) {
               for (let y = low_y; y < high_y; y++) {
                  if(pointInPolygon(new Point(x,y),boundary) && !pointOnPolygon(new Point(x,y),boundary)){
                     let cell = grid[x][y]
                     let variance = 0
                        for (let d = 0; d < cell.length; d++) {
                        const dist = cell[d].dist;
                        variance += dist**(2)
                     }

                     if(variance < min_variance.variance){
                        min_variance.point = new Point(x,y)
                        min_points = [min_variance.point]
                        min_variance.variance = variance 
                     }
                  }
                  
               }
            }
            this.bisector_intersections = []
            min_points.forEach((p,i) => {
               let d_p = new DrawablePoint(p)
               d_p.color = "red"
               this.bisector_intersections.push(d_p)
            })
         
          
         }
      }
      /**
      let centroid_points = hilbertGradientDescent(this.boundary.polygon,points,1000)
      centroid_points.forEach((p,i) => {
            let d_p = new DrawablePoint(p)
            d_p.color = "green"
            this.bisector_intersections.push(d_p)
         })
         
      let d_p = new DrawablePoint(centroid_points[centroid_points.length-1])
      d_p.color = "blue"
      this.bisector_intersections.push(d_p)
       */
          
      

   }

   
   addDistance(p1,p2) {
      let c1 = this.sites[p1].color 
      let c2 = this.sites[p2].color
      let c3 = avgColor(c1,c2)

      let d = calculateHilbertDistance(this.boundary.polygon,this.sites[p1].drawable_point.point,this.sites[p2].drawable_point.point)
      let dist = new DrawableDistance(this,p1,p2,d,c3)
      this.distances.push(dist);
   }

   setDistances(event) {
      let selectedSites = []
      this.sites.forEach((site,i) =>{
         if (site.selected){

            selectedSites.push(i)
         }
      })      
      for(let i = 0; i < selectedSites.length; i++){
         let p1 = selectedSites[i]
         for(let j = i+1; j < selectedSites.length; j++){
            let p2 = selectedSites[j]
            if (event.target.checked){
               let needNew = true
               this.distances.forEach((distance,d) => {
                  if ((distance.p1 === p1 && distance.p2 === p2) || (distance.p1 === p2 && distance.p2 === p1)){
                     needNew = false
                     this.recalculateDistance(d)
                  }
               })
               if(needNew){
                  this.addDistance(p1,p2)
               }
            }else{
               this.deleteDistance(p1,p2)
            }            
         }
      }
   }

   // run after deleting sites, but before cleaning!
   reindexDistances(){
      let indexMap = []
      let index = 0
      for(let i = 0; i < this.sites.length; i++){
         if(this.sites[i]){
            indexMap.push(index)
            index ++
         }else{
            indexMap.push(-1)
         }
      }
      for(let b = 0; b < this.distances.length; b++){
         let distance = this.distances[b]
         distance.p1 = indexMap[distance.p1]
         distance.p2 = indexMap[distance.p2]
         distance.changeDistance(distance.distance)
         if(distance.p1 === -1 || distance.p2 === -1){
            this.distances[b].box.remove()
            this.distances[b] = null
         }
      }
      this.distances = cleanArray(this.distances)
   }

   recalculateDistance(b){
      let distance = this.distances[b]
      let boundary = this.boundary.polygon
      let point1 = this.sites[distance.p1].drawable_point.point
      let point2 = this.sites[distance.p2].drawable_point.point
      let d = calculateHilbertDistance(boundary,point1,point2)
      distance.changeDistance(d)
   }

   deleteDistance(p1,p2){
      this.distances.forEach((distance,b) => {
         if ((distance.p1 === p1 && distance.p2 === p2) || (distance.p1 === p2 && distance.p2 === p1)){
            this.distances[b].box.remove()
            this.distances[b] = null
         }
      })
      this.distances = cleanArray(this.distances)
   }

   setFastVoronoi(event,degree){
      if (!event.target.checked){
         this.calculate_fast_voronoi = false
      }
      if(degree >= 1 && degree <= this.sites.length){
         if(event.target.checked){
            this.calculate_fast_voronoi = true
            let {voronois:voronois,circumcenters:circumcenters} = createVoronoiFromCanvas(this)
            this.voronois = voronois
            this.bisector_intersections = []
            this.changeFastVoronoiDegree(degree)
         }
      }
      this.drawAll()
   }

   changeFastVoronoiDegree(degree){
      if(this.calculate_fast_voronoi){
         if (this.voronois[degree-1]){
            this.voronoi_diagram = new DrawableVoronoiDiagram(this.voronois[degree-1])
         }else{
            this.voronoi_diagram = new DrawableVoronoiDiagram(new VoronoiDiagram(this.boundary.polygon,[],1))
         }
      }
      this.current_voronoi_cell_index = -1
   }

   recalculateFastVoronoi(degree = null){

      if (this.calculate_fast_voronoi){
         let {voronois:voronois,circumcenters:circumcenters} = createVoronoiFromCanvas(this)
         // change for degree!
         this.voronois = voronois
         if(!degree){
            degree = this.voronoi_diagram.voronoi.degree
         }
         this.changeFastVoronoiDegree(degree)
      }
   }

   recalculateHilbertDelaunay(degree) {
      if (this.voronois && this.delaunay) {
         if(degree){
            this.delaunay_degree = degree
         }
         this.delaunay = this.voronois[this.delaunay_degree-1].hilbertDelaunay(this.sites);
      }
   }

   recalculateBruteForceVoronoi(){
      if (this.brute_force_voronoi){
         this.brute_force_voronoi.calculateBruteForce(this)
      }
   }

   recalculateHilbertImage(){
      if(this.hilbert_image){
         if(!this.hilbert_image.image_data){
            this.hilbert_image.loadImageData()
         }
         this.hilbert_image.renderHilbertImage()
      }
   }

   setHilbertImagePoint(event){
      const {x,y} = this.getMousePos(event)
      if(this.hilbert_image){
         let pointer = new Point(CAMERA.ix(x),CAMERA.iy(y))
         this.hilbert_image.pointer = pointer
         this.recalculateHilbertImage()
      }
   }


   deselectSites(){
      this.draggingPoint = null
      for(let s = 0; s < this.sites.length; s++){
         let site = this.sites[s]
         site.selected = false
      }
   }

   selectSingleSite(event){
      const {x, y} = this.getMousePos(event);
      const mouse = new Point(CAMERA.ix(x),CAMERA.iy(y))
      this.sites.forEach((site) =>{
               if (euclideanDistance(mouse,site.drawable_point.point) <= site.radius){
                  site.selected = !site.selected

               }

      })
   }

   selectSites(){
      for(let s = 0; s < this.sites.length; s++){
         let site = this.sites[s]
         if(isBetween(this.selectionAnchor.x,this.selectionPointer.x,site.drawable_point.point.x)
            &&
         isBetween(this.selectionAnchor.y,this.selectionPointer.y,site.drawable_point.point.y)
         ){
            site.selected = true
         }
      }
   }

   selectDragSite(event){
      const {x, y} = this.getMousePos(event);
      const mouse = new Point(CAMERA.ix(x),CAMERA.iy(y))
      this.draggingPoint = null
      for(let s = 0; s < this.sites.length; s++){
         let site = this.sites[s]
         if (euclideanDistance(mouse,site.drawable_point.point) <= site.radius){
            this.draggingPoint = s
         }
      }
      if(this.draggingPoint != null){
         this.sites[this.draggingPoint].selected = true
      }
   }

   dragSite(event){
      const {x, y} = this.getMousePos(event);
      const mouse = new Point(CAMERA.ix(x),CAMERA.iy(y))
      if(this.draggingPoint != null){
         if(!pointOnPolygon(mouse,this.boundary.polygon) && pointInPolygon(mouse,this.boundary.polygon) && pointInPolygon(mouse,this.absolute_border.polygon)){
            let site = this.sites[this.draggingPoint]
            site.drawable_point.point.x = mouse.x
            site.drawable_point.point.y = mouse.y
            this.recalculateSite(this.draggingPoint);
            this.recalculateFastVoronoi()
            this.recalculateHilbertDelaunay()
            this.recalculateHilbertCentroid()
            this.recalculateHilbertRose()
            // DONT RECALCULATE BRUTE FORCE HERE!
         }
         this.drawAll()
      }
   }

/*
   for if we want to implement reshaping the boundary through dragging its points, need to change the object design slightly
   by adding a selected field to points 
   selectDragPoint(event) {
      const {x, y} = this.getMousePos(event);
      const mouse = new Point(CAMERA.ix(x),CAMERA.iy(y))
      this.draggingPoint = null
      for(let p = 0; p < this.boundary.points.length; p++){
         let point = this.boundary.points[p];
         if (euclideanDistance(mouse,point) <= 3){ // radius of a site by default is 3, just using that value here since points dont have a radius field 
            this.draggingPoint = p
         }
      }
   }

   dragPoint(event) {

   }
*/
   drawSelectBox(){
      if(this.selecting){
         this.ctx.beginPath();
         this.ctx.strokeStyle = "black"
         this.ctx.setLineDash([5, 3]);
         let anchor_x = CAMERA.x(this.selectionAnchor.x)
         let anchor_y = CAMERA.y(this.selectionAnchor.y)
         let pointer_x = CAMERA.x(this.selectionPointer.x)
         let pointer_y = CAMERA.y(this.selectionPointer.y)
         let w = (pointer_x-anchor_x)
         let h = (pointer_y-anchor_y)

         this.ctx.rect(anchor_x, anchor_y, w, h);
         this.ctx.stroke();
         this.ctx.setLineDash([]);
      }
   }
   deleteSelectedSites(){
      this.sites.forEach((s,idx) => {
         if (s.selected) {
            this.deleteSite(idx)
         }
      });
      this.reindexBisectors()
      this.reindexZRegions()
      this.reindexInfiniteBalls();
      this.reindexDistances();

      this.sites = cleanArray(this.sites) // removes any null elts from array
      this.recalculateAll()
      this.drawAll();
   }

   deleteSite(idx){
      let site = this.sites[idx]
      for(let b = 0; b < this.bisectors.length; b++ ){
         let bisector = this.bisectors[b]
         if(bisector.p1 === idx || bisector.p2 === idx){
            this.bisectors[b] = null
         }
      }
      this.bisectors = cleanArray(this.bisectors)

      for(let b = 0; b < this.distances.length; b++ ){
         let distance = this.distances[b]
         if(distance.p1 === idx || distance.p2 === idx){
            this.distances[b].box.remove()
            this.distances[b] = null
         }
      }
      this.distances = cleanArray(this.distances)

      for(let z = 0; z < this.z_regions.length; z++ ){
         let z_r = this.z_regions[z]
         if(z_r.p1 === idx || z_r.p2 === idx){
            this.z_regions[z] = null
         }
      }
      this.z_regions = cleanArray(this.z_regions)

      site.drawable_point.deleteInfoBox();
      this.sites[idx] = null;
   }


   recalculateSite(index){
      let boundary = this.boundary.polygon

      let site = this.sites[index]

      site.drawable_spokes = [] 
      let point = site.drawable_point.point
      calculateSpokes(boundary,point).forEach((spoke) => {
         site.drawable_spokes.push(new DrawableSpoke(spoke))
         site.drawable_spokes[site.drawable_spokes.length-1].color = site.color
      })

      let change_bisector = false
      for(let b = 0; b < this.bisectors.length; b++){
         let bisector = this.bisectors[b]
         if(bisector.p1 == index || bisector.p2 == index){
            change_bisector = true
            this.recalculateBisector(b)
         }
      }
      
      //if (change_bisector){
         this.calculateBisectorIntersections()
      //}

      for(let b = 0; b < this.distances.length; b++){
         let distance = this.distances[b]
         if(distance.p1 == index || distance.p2 == index){
            this.recalculateDistance(b)
         }
      }

      let change_z_region = false
      for(let z = 0; z < this.z_regions.length; z++){
         let z_r = this.z_regions[z]
         if(z_r.p1 == index || z_r.p2 == index){
            change_z_region = true
            this.recalculateZRegion(z)
         }
      }

      for(let i = 0; i < this.infinite_balls.length; i++){
         let inf_ball = this.infinite_balls[i]
         if(inf_ball.p1 == index || inf_ball.p2 == index){
            this.recalculateInfiniteBalls(i)
         }
      }
      

      site.balls.forEach((b) => {
         b.recalculateBall(point);
      })

      
      let points = []
      for(let i = 0; i < this.sites.length; i++){
         points.push(this.sites[i].drawable_point.point)
      }
      
   }

   recalculateAll(){

      let boundary = this.boundary.polygon
      // calculate points and spokes!
      for(let i = 0; i < this.sites.length; i++){
         this.recalculateSite(i)
      }

      // might not want to auto-do
      
      for(let b = 0; b < this.bisectors.length; b++){
         this.recalculateBisector(b)
      }
      for(let b = 0; b < this.distances.length; b++){
         this.recalculateDistance(b)
      }

      this.calculateBisectorIntersections()

      this.recalculateFastVoronoi()
      this.recalculateHilbertDelaunay()
      this.recalculateBruteForceVoronoi()
      this.recalculateHilbertImage()
      this.recalculateHilbertCentroid()
      this.recalculateHilbertRose()

   }

   
makeDraggableAroundPoint(element, drawable_point, canvasRect) {
  let isDragging = false;
  const point = drawable_point.point;
  let startX, startY;
  const maxDistance = 50; // Maximum distance from the point
  const dpr = window.devicePixelRatio;

  // Calculate initial top and bottom bounds
  const scale = canvasRect.width / this.canvas.width;
  const pointX = point.x * scale * dpr + canvasRect.left;
  const pointY = point.y * scale * dpr + canvasRect.top;
  const initialTop = drawable_point.defaultInfoBoxPosition.top;
  const initialBottom = initialTop + maxDistance;

  element.addEventListener('mousedown', startDragging);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', stopDragging);

  function startDragging(e) {
    isDragging = true;
    startX = e.clientX - parseInt(element.style.left);
    startY = e.clientY - parseInt(element.style.top);
    e.preventDefault();
  }

  function drag(e) {
    if (!isDragging) return;

    let newX = e.clientX - startX;
    let newY = e.clientY - startY;

    const dx = newX - pointX;
    const dy = newY - pointY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxDistance) {
      const angle = Math.atan2(dy, dx);
      newX = pointX + maxDistance * Math.cos(angle);
      newY = pointY + maxDistance * Math.sin(angle);
    }
    
    newY = Math.max(initialTop, Math.min(newY, initialBottom));

    element.style.left = `${newX}px`;
    element.style.top = `${newY}px`;
  }

  function stopDragging() {
    isDragging = false;
    drawable_point.infoBoxPosition = {
      left: parseInt(element.style.left),
      top: parseInt(element.style.top)
    };
  }
}

   drawAll() {
      
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      this.absolute_border.draw(this.ctx);

      

      if(this.draw_hilbert_image && this.hilbert_image){
         this.hilbert_image.draw(this.ctx)
         //let pointer = new DrawablePoint(this.hilbert_image.pointer)
         //pointer.draw(ctx)
      }

      this.drawVoronoi()

      this.drawSegments()

      this.drawCentroids()

      this.drawBisectors()

      this.drawZRegions()

      this.drawInfiniteBalls();

      this.boundary.points.forEach((point) => {
         if (point.showInfo){
            point.drawInfoBox(this, this.dpr); 
         }
      })
      this.boundary.draw(this.ctx);

      const degree = parseInt(document.getElementById('voronoiDegree').value);

      if (this.delaunay) {
         for (let s of this.delaunay) {
            s.drawDotted(this.ctx);
         }
      }

      // dont draw sites if in cluster mode exist (which would draw sites twice)
      if (!this.hide_sites && (this.mode !== 'clusters' || !this.clusters)) {
         this.sites.forEach((site) => {
            site.draw(this.ctx)
            if (site.drawable_point.showInfo){
               site.drawable_point.drawInfoBox(this, this.dpr); 
            } 
         })
      }

      if (this.clusters) {
         this.clusters.forEach((c) => {
            c.draw(this);
         });
      }

      this.drawSelectBox()
 
   }

   resetSites() {
      this.sites = [];
   }
   resetCanvas() {
        this.resetSites()
        this.deleteBoundaryPoints()
        this.boundary = new DrawablePolygon(new Polygon([]), this.boundary.color, this.boundary.penWidth, this.boundary.showInfo, this.boundary.show_vertices, this.boundary.vertexRadius);
        this.delaunay = null;
        this.boundaryType = 'freeDraw';
        document.querySelector('input[name="polygonType"][value="freeDraw"]').checked = true;

        this.drawAll();
    }

   saveCanvas(){
      let canvas = {}
      canvas.boundary = this.boundary
      canvas.sites = this.sites
      canvas.CAMERA = CAMERA

      
   
      return canvas
   }
   loadCanvas(canvas){

   }
}
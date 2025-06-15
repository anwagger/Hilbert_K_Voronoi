import { CAMERA, DrawablePolygon,DrawablePoint,Site, DrawableSegment, DrawableSpoke, DrawableBisector } from "../drawable.js"
import { calculateBisector, calculateSpokes, calculateHilbertPoint, calculateMidsector} from "../../geometry/hilbert.js"
import { initEvents } from "./canvas-events.js";
import { Polygon,Point } from "../../geometry/primitives.js";
import {pointInPolygon,isBetween, euclideanDistance} from "../../geometry/utils.js"
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

      this.boundary = new DrawablePolygon(new Polygon([]),"black");
      this.mode = 'boundary';
      
      initEvents(this);
      
      // for collapsible menus
      this.activeManager = '';
      
      //this.hilbertDistanceManager = null;

      this.boundaryType = 'freeDraw';
      this.canvasWidth = 1500;
      this.canvasHeight = 850;

      this.sites = [];
      this.segments = [];
      this.bisectors = [];

      this.draggingPoint = null;

      this.globalScale = 1.0;

      this.showCentroid = false;
      this.boundaryLocked = false;

      this.colorPool = [
         "red","orange","gold","green","blue","purple",
         "pink","brown","black","gray","cyan","lime"
      ];

      this.selectionAnchor = new Point(0,0);
      this.selectionPointer = new Point(0,0);
      this.selecting = false

   }

   setPolygonType(type) {
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
            this.resetCanvas();
        }
        this.sites = this.sites.filter(site => !pointInPolygon(site,this.boundary.polygon));
        
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
         this.bisectors.forEach((bisector) => {
            bisector.draw(this.ctx)
            
        });
   }

   createNgon(n) {
      const canvasCenterX = this.canvas.width / (2 * this.dpr);
      const canvasCenterY = this.canvas.height / (2 * this.dpr);
        
      const radius = Math.min(this.canvas.width, this.canvas.height) / (2.5 * this.dpr);
        
      this.boundary = new DrawablePolygon(new Polygon([]),"black");
        
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

   getMousePos(event) {
      const rect = this.canvas.getBoundingClientRect();
      const rawX = event.clientX - rect.left;
      const rawY = event.clientY - rect.top;
      
      let sceneX = rawX;
      let sceneY = rawY;
    
      sceneX /= this.globalScale;
      sceneY /= this.globalScale;
      
      return { x: sceneX, y: sceneY };
   }

   getNewColor(list){
      let colors = this.colorPool.filter((c) => {
         return list.filter((s) => s.color === c).length == 0
      })
      if (colors.length === 0){
         colors = [...this.colorPool]
      }
      let i = Math.floor(colors.length * Math.random())
      return colors[i]
   }

   addSite(event){
      const {x, y} = this.getMousePos(event);
      
      let point = new Point(CAMERA.ix(x), CAMERA.iy(y))

      if (pointInPolygon(point,this.boundary.polygon)){
         let site = new Site(new DrawablePoint(point))
         this.sites.push(site);
         site.setColor(this.getNewColor(this.sites))
         // calculate the new point
         this.recalculateSite(this.sites.length-1)
         this.drawAll()
      }

      

      
   }

   addPolygonPoint(event) {
      if (this.boundaryType === 'freeDraw') {

         const {x, y} = this.getMousePos(event);
         this.boundary.addPoint(new Point(CAMERA.ix(x), CAMERA.iy(y)));
         this.boundary.showInfo = document.getElementById('polygonShowInfo').checked;
         this.recalculateAll()
         this.drawAll()
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
        this.drawAll();
   }

   setPolygonShowCentroid() {
        this.showCentroid = true;
        this.drawAll();
   }

   addBisector(bisector,p1,p2) {
         let d_b = new DrawableBisector(bisector,p1,p2)
        this.bisectors.push(d_b);
        this.drawAll();
   }

   setBisectors() {
      let selectedSites = []
      this.sites.forEach((site) =>{
         if (site.selected){

            selectedSites.push(site)
         }
      })
      for(let i = 0; i < selectedSites.length; i++){
         for(let j = i+1; j < selectedSites.length; j++){
            let needNew = true
            this.bisectors.forEach((bisector) => {
               if (bisector.p1 === i && bisector.p2 === j || bisector.p1 === j && bisector.p2 === i){
                  needNew = false
               }
            })
            if(needNew){
               let boundary = this.boundary.polygon
               let point1 = selectedSites[i].drawable_point.point
               let point2 = selectedSites[j].drawable_point.point
               let h_p1 = calculateHilbertPoint(boundary,point1)
               let h_p2 = calculateHilbertPoint(boundary,point2)
               console.log(h_p1,h_p2)
               let bisector = calculateBisector(boundary,h_p1,h_p2)
               this.addBisector(bisector)
            }
         }
      }
      this.drawAll();
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
         if(pointInPolygon(mouse,this.boundary.polygon)){
            let site = this.sites[this.draggingPoint]
            site.drawable_point.point.x = mouse.x
            site.drawable_point.point.y = mouse.y
            this.recalculateSite(this.draggingPoint);
         }
         
      }

      

   }

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


   recalculateSite(index){
      let boundary = this.boundary.polygon

      let site = this.sites[index]

      site.drawable_spokes = [] 
      let point = site.drawable_point.point
      calculateSpokes(boundary,point).forEach((spoke) => {
         site.drawable_spokes.push(new DrawableSpoke(spoke))
         site.drawable_spokes[site.drawable_spokes.length-1].color = site.color
      })

   }

   recalculateAll(){

      let boundary = this.boundary.polygon
      // calculate points and spokes!
      for(let i = 0; i < this.sites.length; i++){
         this.recalculateSite(i)
      }

      // might not want to auto-do
      /**
      let bisectors = []

      // pairs
      for(let i = 0; i < points.length-1; i++){
         for(let j = i + 1; j < points.length; j++){
            
         }
      }
      */
   }

   drawAll() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      this.boundary.draw(this.ctx);

      this.drawSegments()

      this.drawBisectors()


      this.sites.forEach((site) => {
         site.draw(this.ctx)
      })

      this.drawSelectBox()
 
   }

   resetSites() {
      this.sites = [];
   }
   resetCanvas() {
        this.resetSites()
        
        this.boundary = new DrawablePolygon(new Polygon([]), this.boundary.color, this.boundary.penWidth, this.boundary.showInfo, this.boundary.showVertices, this.boundary.vertexRadius);

        this.boundaryType = 'freeDraw';
        document.querySelector('input[name="polygonType"][value="freeDraw"]').checked = true;

        this.drawAll();
    }
}
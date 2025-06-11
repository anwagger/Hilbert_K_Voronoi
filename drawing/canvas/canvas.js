import { CAMERA, DrawablePolygon,DrawablePoint,Site, DrawableSegment, DrawableSpoke } from "../drawable.js"
import { calculateSpokes, HilbertSpace} from "../../geometry/hilbert.js"
import { initEvents } from "./canvas-events.js";
import { Polygon,Point } from "../../geometry/primitives.js";
import {pointInPolygon} from "../../geometry/utils.js"
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
      this.selectionOrder = [];
      this.segments = [];
      this.bisectors = [];

      this.globalScale = 1.0;

      this.showCentroid = false;
      this.boundaryLocked = false;

      this.colorPool = [
         "red","orange","yellow","green","blue","purple",
         "pink","brown","black","gray","cyan","lime"
      ]
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
        this.sites = this.sites.filter(site => this.boundary.polygon.contains(site));
        
        this.drawAll();
    }
    
   drawSegments() {
         this.sites.forEach(site => {
            if (true || site.draw_spokes){
               site.drawable_spokes.forEach((d_s) => {
                  d_s.draw(this.ctx)
               })
            }
            
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
         console.log("ngon",vertex)
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
      let colors = [...this.colorPool]
      colors.filter((c) => {list.find((s) => s.color === c)})
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

   setPolygonShowInfo(event) {
        this.boundary.showInfo = event.target.checked;
        this.drawAll();
   }

   setPolygonShowCentroid() {
        this.showCentroid = true;
        this.drawAll();
   }

   addBisector(bisector) {
        this.bisectors.push(bisector);
        this.drawAll();
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

      this.sites.forEach((site) => {
         site.draw(this.ctx)
      })
 
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
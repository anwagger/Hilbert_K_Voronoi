import { DrawablePolygon } from "../drawable.js"
import { initEvents } from "./canvas-events.js";
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

      this.polygon = new DrawablePolygon();
      this.mode = 'Convex';
      this.selectedProgram = 'Site';
      //initEvents(this);
      this.activeManager = 'SiteManager';
      this.hilbertDistanceManager = null;

      this.polygonType = 'freeDraw';
      this.canvasWidth = 1500;
      this.canvasHeight = 850;

      this.sites = [];
      this.selectionOrder = [];
      this.segments = [];
      this.bisectors = [];

      this.globalScale = 1.0;

      this.showCentroid = false;
      this.polygonLocked = false;
   }

   setPolygonType(type) {
        this.polygonType = type;
        if (type === 'customNgon') {
            const n = parseInt(this.customNgonInput.value);
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
        this.sites = this.sites.filter(site => this.polygon.contains(site));
        this.sites.forEach(site => {
            site.setPolygon(this.polygon);
            site.computeSpokes();
            site.computeHilbertBall?.();
        });
        this.drawAll();
    }
    
   drawSegments() {
        this.segments.forEach(segment => {
            segment.draw(this.ctx);
        });
   }

   createNgon(n) {
      const canvasCenterX = this.canvas.width / (2 * this.dpr);
      const canvasCenterY = this.canvas.height / (2 * this.dpr);
        
      const radius = Math.min(this.canvas.width, this.canvas.height) / (2.5 * this.dpr);
        
      this.polygon = new drawable.DrawablePolygon();
        
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
         this.polygon.addPoint(new Point(adjustedX, adjustedY));
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

   addPolygonPoint(event) {
      if (this.polygonType === 'freeDraw') {
         const {x, y} = this.getMousePos(event);
         this.polygon.addPoint(new Point(x, y));
         this.polygon.showInfo = document.getElementById('polygonShowInfo').checked;
         this.drawAll();
      }
   }

   setPolygonColor(event) {
        this.polygon.setColor(event.target.value);
        this.drawAll();
   }

   setPolygonShowInfo(event) {
        this.polygon.setShowInfo(event.target.checked);
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

   drawAll() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      //this.polygon.draw(this.ctx);

      /*
      this.sites.forEach(site => {
         site.computeSpokes();
         site.computeHilbertBall?.();
         site.computeMultiBall?.();
         site.draw(this.ctx);
      });
    
      this.bisectors.forEach(bisector => {
         bisector.computeBisector(bisector.s1, bisector.s2);
         bisector.draw(this.ctx);
      }); 
    
      this.drawSegments();
    
      clearInfoBoxes();
    
      if (this.polygon.showInfo) {
            this.polygon.vertices.forEach(vertex => {
               if (vertex.showInfo) drawInfoBox(vertex, this.canvas, this.dpr);
            });
      }
    
      this.sites.forEach(site => {if (site.showInfo) drawInfoBox(site, this.canvas, this.dpr);});
    */
      renderAllKaTeX();     
   }
}
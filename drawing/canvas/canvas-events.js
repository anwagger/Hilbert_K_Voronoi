import { Point } from "../../geometry/primitives.js";
import { cleanArray, pointInPolygon } from "../../geometry/utils.js";
import { VoronoiDiagram as Voronoi } from "../../geometry/voronoi.js";
import { CAMERA, DrawableBruteForceVoronoi } from "../drawable.js";

// from nithins
export function initEvents(canvas) {

   document.getElementById('mode-select').addEventListener('change', (event) => {
      canvas.mode = event.target.value
      toggleContainers(canvas);
   });

   function toggleContainers(canvas) {
      
      document.getElementById('polygonContainer').style.display = (canvas.mode === "boundary") ? 'block' : 'none';
      document.getElementById('siteContainer').style.display = canvas.mode === "site" ? 'block' : 'none';
      document.getElementById('zoomContainer').style.display = canvas.mode === "view" ? 'block' : 'none';
      document.getElementById('voronoiContainer').style.display = canvas.mode === "voronoi" ? 'block' : 'none';
   }



   toggleContainers(canvas)

   function toggleCollapsible(canvas){
      let collapsibles =  document.getElementsByClassName("collapsible")
      for(let i = 0; i < collapsibles.length; i++){
         let collapse = collapsibles[i]
         let elem = collapse.getElementsByClassName("content")[0]
         elem.style.display = (canvas.activeManager === collapse.id) ? 'block' : 'none';
      }
   }

   document.getElementById('siteHeader').addEventListener('click', (event) => {
      canvas.activeManager = (canvas.activeManager != "siteCollapsible") ?"siteCollapsible":""
      toggleCollapsible(canvas)
   })

   document.getElementById('pairHeader').addEventListener('click', (event) => {
      canvas.activeManager = (canvas.activeManager != "pairCollapsible") ?"pairCollapsible":""
      toggleCollapsible(canvas)
   })

     
   document.getElementById('polygonColor').addEventListener('input', (event) => {
      canvas.setPolygonColor(event);
    });

   document.getElementById('siteColor').addEventListener('input', (event) => {
      canvas.setSiteColor(event);
    });
   document.getElementById('siteDrawSpokes').addEventListener('input', (event) => {
      canvas.setSiteSpokes(event);
    });

   document.getElementById('siteDrawBisector').addEventListener('input', (event) => {
      canvas.setBisectors(event);
    });

   document.getElementById('polygonShowInfo').addEventListener('change', (event) => {
      canvas.setPolygonShowInfo(event);
   });

   document.getElementById('siteShowInfo').addEventListener('change', (event) => {
      if (event.target.checked){
         canvas.sites.forEach((site, idx) =>{
            if (site.selected) {
               canvas.setSiteShowInfo(event, idx);
            }
         });
      }else{
         canvas.sites.forEach((site) =>{
            if (site.selected) {
               site.drawable_point.deleteInfoBox();
            }
         });
      }
      
   });

   document.querySelectorAll('input[name="polygonType"]').forEach(radio => {
      radio.addEventListener('change', (event) => {
         if (event.target.value === 'customNgon') {
            document.getElementById('createCustomNgon').style.display = 'block';
            document.getElementById('customNgonInput').style.display = 'block';
         } else {
            canvas.setPolygonType(event.target.value);
            document.getElementById('createCustomNgon').style.display = 'none';
            document.getElementById('customNgonInput').style.display = 'none';
         }
      });
   });

   // Keep the existing double-click event listener
   canvas.canvas.addEventListener('dblclick', (event) => {
      if (canvas.mode === 'boundary' && canvas.boundaryType === 'freeDraw'){
            canvas.addPolygonPoint(event);
      }else if(canvas.mode === 'site'){
         if(!event.shiftKey){
            canvas.addSite(event)
            if (canvas.brute_force_voronoi !== null) {
               canvas.brute_force_voronoi.drawBruteForce(canvas);
            }
         }
      } 
   });

   // changes position of all selected sites
   // regex not working rn i think :(
   document.getElementById('insertPosition').addEventListener('click', () => {
      const input = document.getElementById('sitePos');
      const re = /^\s*\(?\s*([0-9]+)\s*,\s*([0-9]+)\s*\)?\s*$/;      
      const matches = input.value.match(re);
      if (matches != null) {
         const p = new Point( matches[1],matches[2]);
         console.log(p)
         console.log(pointInPolygon(p, canvas.boundary.polygon))

         if (pointInPolygon(p, canvas.boundary.polygon)) {
            canvas.sites.forEach((site, idx) =>{
               if (site.selected) {
                  site.drawable_point.point.x = parseInt(p.x);
                  site.drawable_point.point.y = parseInt(p.y);
                  console.log(idx);
                  canvas.recalculateSite(idx);
               }
            });
            canvas.drawAll();
         } else {
            alert('Input is not in polygon, please input coordinates within the polygon.');
         }
      } else {
          alert('Invalid input. Please follow format (x,y) or x,y');
      }
      
   });

   document.getElementById('createCustomNgon').addEventListener('click', () => {
      const input = document.getElementById('customNgonInput');
      const n = parseInt(input.value);
      canvas.customNgonInput = n
      if (n >= 3) {
        document.getElementById('customNgon').checked = true;
        canvas.setPolygonType('customNgon');
      } else {
        alert('Please enter a number greater than or equal to 3.');
      }
   });

   document.addEventListener('keydown', (event) => {
         if (event.key === 'Delete') {
            canvas.deleteSelectedSites()
         } else if (canvas.mode === "voronoi") {
            let int = parseInt(event.key);
            console.log(int);
            if (int !== NaN && int <= canvas.sites.length && int >= 1) {
               canvas.brute_force_voronoi.voronoi.degree = int;
               console.log(canvas.brute_force_voronoi.voronoi.degree);
               canvas.drawAll();
               canvas.brute_force_voronoi.drawBruteForce(canvas,false);
            }
         }
   });

   document.getElementById('zoomRange').addEventListener('change', (event) => {
      CAMERA.setScale(event.target.value);
      canvas.drawAll();
      if (canvas.brute_force_voronoi !== null && canvas.brute_force_voronoi.brute_force) {
         canvas.brute_force_voronoi.drawBruteForce(canvas,false,false);
      }
   })

   document.getElementById('resetZoom').addEventListener('click', (event) => {
      CAMERA.setScale(1);
      CAMERA.offset.x = 0;
      CAMERA.offset.y = 0;
      canvas.drawAll();
   })

   document.getElementById('bruteForceVoronoi').addEventListener('click', (event) => {
      const input = document.getElementById('voronoiDegree').value;
      const degree = parseInt(input);
      console.log(degree);
      if (degree >= 1 && degree <= canvas.sites.length) {
         const voronoi = new DrawableBruteForceVoronoi(new Voronoi(canvas.boundary.polygon,[],degree));
         canvas.brute_force_voronoi = voronoi;
         voronoi.drawBruteForce(canvas);

         canvas.calculate_fast_voronoi = true
      } else {
         alert("Invalid degree :((((");
      }
   })
   

   let canvasElement = canvas.canvas
   
   canvasElement.onmousedown = (event) => {
       CAMERA.move_lock = false

       if (canvas.mode === "site" || canvas.mode === "voronoi"){
         if (event.shiftKey){
            canvas.selecting = true;
            const {x,y} = canvas.getMousePos(event)
            canvas.selectionAnchor.x = CAMERA.ix(x)
            canvas.selectionAnchor.y = CAMERA.iy(y)
            canvas.selectionPointer.x = CAMERA.ix(x)
            canvas.selectionPointer.y = CAMERA.iy(y)

            //canvas.drawAll()
         }else{
            canvas.selectDragSite(event)
         }
         
         
       }
       /* 
       else if (canvas.mode === "boundary") {
         if (event.shiftKey){
            canvas.selecting = true;
            const {x,y} = canvas.getMousePos(event)
            canvas.selectionAnchor.x = CAMERA.ix(x)
            canvas.selectionAnchor.y = CAMERA.iy(y)
            canvas.selectionPointer.x = CAMERA.ix(x)
            canvas.selectionPointer.y = CAMERA.iy(y)

            canvas.drawAll()
         }else{
            canvas.selectDragPoint(event)
         }
       }
      */
   }
   canvasElement.onmouseup = (event) => {
       CAMERA.move_lock = true

       if (canvas.mode === "site" || canvas.mode === "voronoi"){
         if (event.shiftKey){
            canvas.selectSites()
         }else{
            canvas.deselectSites()
         }
         canvas.selectSingleSite(event)
         canvas.selecting = false;
         canvas.drawAll()

         if (canvas.brute_force_voronoi !== null) {
         canvas.brute_force_voronoi.drawBruteForce(canvas);
         }
       }
   }

   
   canvasElement.onscroll = (event) => {
       CAMERA.changeScale(event.movementY)
   
   }
   
   canvasElement.onmousemove = (event) => {

      if (canvas.mode === "site" || canvas.mode === "voronoi"){
         if(event.shiftKey){
            if (canvas.selecting){
               const {x, y} = canvas.getMousePos(event);
               canvas.selectionPointer.x = CAMERA.ix(x)
               canvas.selectionPointer.y = CAMERA.iy(y)
               canvas.drawAll()
            }
         }else{
            canvas.dragSite(event)
            canvas.selecting = false;
         }
         
      }

      if(canvas.mode === "view"){
         if (!CAMERA.move_lock){

            if (event.shiftKey){
                  CAMERA.changeScale(event.movementY)
                  canvas.drawAll()
                  if (canvas.brute_force_voronoi !== null && canvas.brute_force_voronoi.brute_force) {
                     canvas.brute_force_voronoi.drawBruteForce(canvas,false,false);
                  }
            }else{
               CAMERA.changeOffset(event.movementX,event.movementY)
               canvas.drawAll()
               if (canvas.brute_force_voronoi !== null && canvas.brute_force_voronoi.brute_force) {
                  canvas.brute_force_voronoi.drawBruteForce(canvas,false,false);
               }
            }
         }
      }else{
         if (!CAMERA.move_lock){
            if (!event.shiftKey && (canvas.draggingPoint == null)){
               CAMERA.changeOffset(event.movementX,event.movementY)
               canvas.drawAll()
               if (canvas.brute_force_voronoi !== null && canvas.brute_force_voronoi.brute_force) {
                  canvas.brute_force_voronoi.drawBruteForce(canvas,false,false);
               }
            }
         }
      } 

      //test_render()
      //canvas.drawAll()
   }
   
   canvasElement.onscroll = (event) => {
       CAMERA.changeOffset(event.movementX,event.movementY)
   }
   
  
   /**
   document.getElementById('reset').addEventListener('click', () => {
      canvas.resetCanvas();
   });
    

  


   document.getElementById('polygonShowCentroid').addEventListener('change', (event) => {
      canvas.setPolygonShowCentroid(event);
   });


   

   
  
   document.addEventListener('keydown', (event) => {
      if (!isAnyModalOpen()) {
        if (event.key === 't') {
          const modeSwitch = document.getElementById('modeSwitch');
          modeSwitch.checked = !modeSwitch.checked;
          canvas.mode = modeSwitch.checked ? 'site' : 'boundary';
          if (modeSwitch.checked) {
            canvas.drawAll();
          }
          toggleContainers({ target: modeSwitch });
        }
      } 
   });

   */
}
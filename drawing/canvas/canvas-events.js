import { CAMERA } from "../drawable.js";

// from nithins
export function initEvents(canvas) {

   document.getElementById('mode-select').addEventListener('change', (event) => {
      canvas.mode = event.target.value
      toggleContainers(canvas);
   });

   function toggleContainers(canvas) {
      
      document.getElementById('polygonContainer').style.display = (canvas.mode === "boundary") ? 'block' : 'none';
      document.getElementById('siteContainer').style.display = canvas.mode === "site" ? 'block' : 'none';
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
         }
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


   let canvasElement = canvas.canvas
   
   canvasElement.onmousedown = (event) => {
       CAMERA.move_lock = false

       if (canvas.mode === "site"){
         if (event.shiftKey){
            canvas.selecting = true;
            const {x,y} = canvas.getMousePos(event)
            canvas.selectionAnchor.x = CAMERA.ix(x)
            canvas.selectionAnchor.y = CAMERA.iy(y)
            canvas.selectionPointer.x = CAMERA.ix(x)
            canvas.selectionPointer.y = CAMERA.iy(y)

            canvas.drawAll()
         }else{
            canvas.selectDragSite(event)
         }
         

       }
   }
   canvasElement.onmouseup = (event) => {
       CAMERA.move_lock = true

       if (canvas.mode === "site"){
         if (event.shiftKey){
            canvas.selectSites()
         }else{
            canvas.deselectSites()
         }
         canvas.selectSingleSite(event)
         canvas.selecting = false;
         canvas.drawAll()
       }
   }

   
   canvasElement.onscroll = (event) => {
       CAMERA.changeScale(event.movementY)
   
   }
   
   canvasElement.onmousemove = (event) => {

      if (canvas.mode === "site"){
         if(event.shiftKey){
            if (canvas.selecting){
            const {x, y} = canvas.getMousePos(event);
            canvas.selectionPointer.x = CAMERA.ix(x)
            canvas.selectionPointer.y = CAMERA.iy(y)
            }
         }else{
            canvas.dragSite(event)
            canvas.selecting = false;
            canvas.drawAll()
         }
         
      }

      if(canvas.mode === "view"){
         if (!CAMERA.move_lock){

            if (event.shiftKey){
                  CAMERA.changeScale(event.movementY)
            }else{
               CAMERA.changeOffset(event.movementX,event.movementY)
            }
         }
      }else{
         if (!CAMERA.move_lock){
            if (!event.shiftKey && (canvas.draggingPoint == null)){
               CAMERA.changeOffset(event.movementX,event.movementY)
            }
         }
      } 

      //test_render()
      canvas.drawAll()
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
import { Space } from "../../asteroids/space.js";
import { calculateBisector, calculateHilbertPoint, HilbertPoint } from "../../geometry/hilbert.js";
import {Point } from "../../geometry/primitives.js";
import { cleanArray, cleanJason, fieldsToIgnore, pointInPolygon } from "../../geometry/utils.js";
import { VoronoiDiagram as Voronoi } from "../../geometry/voronoi.js";
import { CAMERA, DrawableBruteForceVoronoi, HilbertImage } from "../drawable.js";

// from nithins
export function initEvents(canvas) {

   document.getElementById('mode-select').addEventListener('change', (event) => {
      canvas.mode = event.target.value
      toggleContainers(canvas);
   });

   function toggleContainers(canvas) {
      
      document.getElementById('polygonContainer').style.display = (canvas.mode === "boundary") ? 'block' : 'none';
      document.getElementById('siteContainer').style.display = canvas.mode === "site" ? 'block' : 'none';
      document.getElementById('ballContainer').style.display = canvas.mode === "balls" ? 'block' : 'none';
      document.getElementById('zoomContainer').style.display = canvas.mode === "view" ? 'block' : 'none';
      document.getElementById('voronoiContainer').style.display = canvas.mode === "voronoi" ? 'block' : 'none';
      document.getElementById('imageContainer').style.display = canvas.mode === "image" ? 'block' : 'none';
      document.getElementById('spaceContainer').style.display = canvas.mode === "space" ? 'block' : 'none';

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

   document.getElementById('siteDrawZRegion').addEventListener('input', (event) => {
      canvas.setZRegions(event);
    });

   document.getElementById('polygonShowInfo').addEventListener('change', (event) => {
      canvas.setPolygonShowInfo(event);
   });

   document.getElementById('siteShowInfo').addEventListener('change', (event) => {
      canvas.sites.forEach((site, idx) =>{
         if (site.selected) {
            canvas.setSiteShowInfo(event, idx);
         }
      });
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
      }else if(canvas.mode === 'site' || canvas.mode === 'voronoi'){
         if(!event.shiftKey){
            canvas.addSite(event)
         }
      } else if (canvas.mode === "balls") {
         const radius = document.getElementById('ballRadius').value
         canvas.addSite(event);
         let selectedBalls = getCheckedBalls()
         canvas.addBalls(canvas.sites.length - 1, selectedBalls, radius);
         console.log(canvas.sites[canvas.sites.length - 1].balls)
         canvas.drawAll();
      } else if(canvas.mode == 'image'){
         if(canvas.hilbert_image){

            canvas.setHilbertImagePoint(event)
            canvas.drawAll()
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
         if (pointInPolygon(p, canvas.boundary.polygon)) {
            canvas.sites.forEach((site, idx) =>{
               if (site.selected) {
                  site.drawable_point.point.x = parseInt(p.x);
                  site.drawable_point.point.y = parseInt(p.y);
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

   document.getElementById('saveData').addEventListener('click', (event) => {
      const name = "MyVoronoiData.txt";

      let canvas_clone = JSON.parse(JSON.stringify(canvas));

      // gets rid of unnecessary fields
      cleanJason(canvas_clone);

      const contents = JSON.stringify(canvas_clone);
      console.log(contents);
      const file = new Blob([contents], {type: 'text/plain'});

      window.URL = window.URL || window.webkitURL;
      event.target.setAttribute("href", window.URL.createObjectURL(file));
      event.target.setAttribute("download", name);
   })

   document.getElementById('loadData').addEventListener('click', (event) => {
      // i just have this here to show it works, itll be replaced by user input tmrw prob
      const text = `{"boundary":{"polygon":{"points":[{"x":222.92666666666668,"y":376.55},{"x":524.1666666666666,"y":75.31000000000006},{"x":825.4066666666665,"y":376.55},{"x":524.1666666666666,"y":677.79}],"segments":[{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":524.1666666666666,"y":75.31000000000006}},{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":825.4066666666665,"y":376.55}},{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":524.1666666666666,"y":677.79}},{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":222.92666666666668,"y":376.55}}]},"points":[{"point":{"x":222.92666666666668,"y":376.55},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":524.1666666666666,"y":75.31000000000006},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":825.4066666666665,"y":376.55},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":524.1666666666666,"y":677.79},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null}],"segments":[{"segment":{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":524.1666666666666,"y":75.31000000000006}},"locked":false,"color":"black","width":2,"stroke_style":"black"},{"segment":{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":825.4066666666665,"y":376.55}},"locked":false,"color":"black","width":2,"stroke_style":"black"},{"segment":{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":524.1666666666666,"y":677.79}},"locked":false,"color":"black","width":2,"stroke_style":"black"},{"segment":{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":222.92666666666668,"y":376.55}},"locked":false,"color":"black","width":2,"stroke_style":"black"}],"color":"black","stroke_style":"black","show_vertices":true,"dashes":null},"boundaryType":"4","sites":[{"draw_spokes":false,"drawable_point":{"point":{"x":419.29998779296875,"y":366.43333435058594},"locked":false,"color":"peru","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},"color":"peru","drawable_spokes":[{"spoke":{"segment":{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":795.889067214838,"y":347.03240054817144}},"front":0,"back":1,"point":{"x":419.29998779296875,"y":366.43333435058594}},"segment":{"segment":{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":795.889067214838,"y":347.03240054817144}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"peru"},{"spoke":{"segment":{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":364.6169947610747,"y":518.240328094408}},"front":1,"back":3,"point":{"x":419.29998779296875,"y":366.43333435058594}},"segment":{"segment":{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":364.6169947610747,"y":518.240328094408}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"peru"},{"spoke":{"segment":{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":237.57046019882046,"y":361.9062064678462}},"front":2,"back":0,"point":{"x":419.29998779296875,"y":366.43333435058594}},"segment":{"segment":{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":237.57046019882046,"y":361.9062064678462}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"peru"},{"spoke":{"segment":{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":372.37297820785585,"y":227.10368845881078}},"front":3,"back":0,"point":{"x":419.29998779296875,"y":366.43333435058594}},"segment":{"segment":{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":372.37297820785585,"y":227.10368845881078}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"peru"}],"radius":8,"selected":true,"balls":[]},{"draw_spokes":false,"drawable_point":{"point":{"x":511.29998779296875,"y":309.43333435058594},"locked":false,"color":"mediumseagreen","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},"color":"mediumseagreen","drawable_spokes":[{"spoke":{"segment":{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":711.6581780321022,"y":262.80151136543566}},"front":0,"back":1,"point":{"x":511.29998779296875,"y":309.43333435058594}},"segment":{"segment":{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":711.6581780321022,"y":262.80151136543566}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"mediumseagreen"},{"spoke":{"segment":{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":492.7811195887522,"y":646.4044529220855}},"front":1,"back":3,"point":{"x":511.29998779296875,"y":309.43333435058594}},"segment":{"segment":{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":492.7811195887522,"y":646.4044529220855}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"mediumseagreen"},{"spoke":{"segment":{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":328.99689898951306,"y":270.47976767715363}},"front":2,"back":0,"point":{"x":511.29998779296875,"y":309.43333435058594}},"segment":{"segment":{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":328.99689898951306,"y":270.47976767715363}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"mediumseagreen"},{"spoke":{"segment":{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":503.83234874203197,"y":95.64431792463472}},"front":3,"back":0,"point":{"x":511.29998779296875,"y":309.43333435058594}},"segment":{"segment":{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":503.83234874203197,"y":95.64431792463472}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"mediumseagreen"}],"radius":8,"selected":true,"balls":[]}],"segments":[],"bisectors":[{"p1":0,"p2":1,"color":"#849c58"}],"bisector_intersections":[],"z_regions":[{"p1":0,"p2":1,"color":"#849c58"}],"brute_force_voronoi":null,"calculate_fast_voronoi":false,"delaunay":null,"usedColors":[]}`
      let obj = JSON.parse(text);
      canvas.load(obj);
      canvas.drawAll();
   })

   document.addEventListener('keydown', (event) => {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName !== 'INPUT') {
         if (event.key === 'Delete') {
            canvas.deleteSelectedSites()
         } else if (canvas.mode === "voronoi") {
            let int = parseInt(event.key);
            if (int !== NaN && int <= canvas.sites.length && int >= 1) {
               if(canvas.brute_force_voronoi){
                  canvas.brute_force_voronoi.voronoi.degree = int;
                  canvas.brute_force_voronoi.calculateBruteForceImage(canvas)
               }
                  
               canvas.changeFastVoronoiDegree(int)
               canvas.recalculateHilbertDelaunay(int)

               const degree_input = document.getElementById('voronoiDegree');
               degree_input.value = int
                  
               canvas.drawAll();
            } else {
               if (event.key === "k") {
                  if (canvas.brute_force_voronoi.voronoi.mode === "kth") {
                     canvas.brute_force_voronoi.voronoi.mode = "k";
                  } else if (canvas.brute_force_voronoi.voronoi.mode === "k") {
                     canvas.brute_force_voronoi.voronoi.mode = "kth";
                  }
                  canvas.brute_force_voronoi.calculateBruteForceImage(canvas);
                  canvas.drawAll();
                  }
               }
            }else if (canvas.mode === "space"){
               if(canvas.space){
                  canvas.space.manageInput(event)
               }
            }
        }
   });
   document.addEventListener('keyup', (event) => {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName !== 'INPUT') {
         if (canvas.mode === "space"){
            if(canvas.space){
               canvas.space.manageInput(event)
            }
         }
      }
   });

   function getCheckedBalls() {
      const hilbert = document.getElementById('hilbertBall');
      const funk = document.getElementById('weakFunkBall');
      const reverse = document.getElementById('reverseFunkBall');
      const thompson = document.getElementById('thompsonBall');
      return {
               hilbert: hilbert.checked,
               funk: funk.checked,
               reverse: reverse.checked,
               thompson: thompson.checked,
            }
   }

   document.getElementById('addBalls').addEventListener('click', () => { 
      const radius = document.getElementById('ballRadius').value
      let selectedBalls = getCheckedBalls()
      for (let i in canvas.sites) {
         const s = canvas.sites[i];
         if (s.selected) {
            canvas.addBalls(i,selectedBalls, radius);
         }
      }

      canvas.drawAll();

   });

   document.getElementById('deleteBalls').addEventListener('click', () => {
      const radius = document.getElementById('ballRadius').value
      let selectedBalls = getCheckedBalls()
      for (let i in canvas.sites) {
         const s = canvas.sites[i];
         if (s.selected) {
            canvas.deleteBalls(i,selectedBalls);
         }
      }

      canvas.drawAll();
   });



   document.getElementById('zoomRange').addEventListener('input', (event) => {
      CAMERA.setScale(event.target.value);
      canvas.drawAll();
   })

   document.getElementById('resetZoom').addEventListener('click', (event) => {
      CAMERA.setScale(1);
      CAMERA.offset.x = 0;
      CAMERA.offset.y = 0;
      canvas.drawAll();
   })

   document.getElementById('ballRadius').addEventListener('input', (event) => {
      for (let s of canvas.sites) {
         if (s.selected) {
            for (let b of s.balls) {
               b.recalculateRadius(event.target.value);
            }
         }
      }
      canvas.drawAll();
   });

   document.getElementById('ballRadiusAmt').addEventListener('change', (event) => {
      for (let s of canvas.sites) {
         if (s.selected) {
            for (let b of s.balls) {
               b.recalculateRadius(event.target.value);
            }
         }
      }
      document.getElementById('ballRadius').value = event.target.value;
      canvas.drawAll();
   })

   document.getElementById('bruteForceVoronoi').addEventListener('change', (event) => {
      if(event.target.checked){
         const input = document.getElementById('voronoiDegree').value;
         const degree = parseInt(input);
         if (degree >= 1 && degree <= canvas.sites.length) {
            const voronoi = new DrawableBruteForceVoronoi(new Voronoi(canvas.boundary.polygon,[],degree));
            canvas.brute_force_voronoi = voronoi;
            canvas.recalculateBruteForceVoronoi()
            canvas.drawAll()
         } else {
            alert("Invalid degree :((((");
         }
      }else{
         canvas.brute_force_voronoi = null
         canvas.drawAll()
      }
      
   })

   document.getElementById("calculateFastVoronoi").addEventListener('change', (event) => {
      const input = document.getElementById('voronoiDegree').value;
      const degree = parseInt(input);
      canvas.setFastVoronoi(event,degree);
   });

    document.getElementById("calculateHilbertDelaunay").addEventListener('change', (event) => {
      const degree_input = document.getElementById('voronoiDegree');
      const input = degree_input.value;
      const degree = parseInt(input);
      if (event.target.checked && canvas.voronois !== null) {
         canvas.delaunay = true
         canvas.recalculateHilbertDelaunay(degree)
      } else {
         canvas.delaunay = null;
      }

      canvas.drawAll();
   });

   document.getElementById('voronoiDegree').addEventListener('change', (event) => {
      const input = event.target.value;
      const degree = parseInt(input);
      if (degree > canvas.sites.length) {
         alert("Invalid degree :((((");
      } else {
         canvas.brute_force_voronoi.voronoi.degree = degree;
         canvas.brute_force_voronoi.calculateBruteForceImage(canvas)
         canvas.changeFastVoronoiDegree(degree)
         canvas.recalculateHilbertDelaunay(degree)
         canvas.drawAll();
      }
   });

   document.getElementById('brute-force-metric-select').addEventListener('change', (event) => {
      if(canvas.brute_force_voronoi){
         if (event.target.value === 'minkowski') {
            document.getElementById('minkowskiDiv').style.display = 'block';
            canvas.brute_force_voronoi.voronoi.p = document.getElementById('minkowskiVal').value;
         } else {
            document.getElementById('minkowskiDiv').style.display = 'none';
         }
         canvas.brute_force_voronoi.voronoi.metric = event.target.value
         canvas.recalculateBruteForceVoronoi()
         canvas.drawAll()
      }
      
   });

   document.getElementById('minkowskiVal').addEventListener('change', (event) => {
      if (canvas.brute_force_voronoi.voronoi) {
         canvas.brute_force_voronoi.voronoi.p = event.target.value;
         canvas.recalculateBruteForceVoronoi();
         canvas.drawAll();
      }
   })

   document.getElementById('minkowskiAmount').addEventListener('change', (event) => {
      if (canvas.brute_force_voronoi.voronoi) {
         canvas.brute_force_voronoi.voronoi.p = event.target.value;
         document.getElementById('minkowskiVal').value = event.target.value;
         canvas.recalculateBruteForceVoronoi();
         canvas.drawAll();
      }
   })

   document.getElementById('hilbert-image-select').addEventListener('change', (event) => {
      let files = event.target.files
      if(files.length > 0){
         const file = files[0];
         const reader = new FileReader();
         let img = new Image();
         reader.addEventListener(
            "load",
            () => {
               // convert image file to base64 string
               img.src = reader.result;
               canvas.hilbert_image = new HilbertImage(canvas.boundary.polygon,img,300,true)
               canvas.recalculateHilbertImage()
            },
            false,
         );

         if (file) {
            reader.readAsDataURL(file);
         }else{
         }
      }
   });

   document.getElementById('drawHilbertImage').addEventListener('change', (event) => {
      if(event.target.checked){
         canvas.draw_hilbert_image = true
         if (canvas.hilbert_image) {
            if(!canvas.hilbert_image.image_data){
               canvas.hilbert_image.loadImageData()
            }
            canvas.drawAll()
         }
      }else{
         canvas.draw_hilbert_image = false
         canvas.drawAll()
      }
      
   })
   

   let canvasElement = canvas.canvas
   
   canvasElement.onmousedown = (event) => {
       CAMERA.move_lock = false

       if (canvas.mode === "site" || canvas.mode === "voronoi" || canvas.mode === "balls"){
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

       if (canvas.mode === "site" || canvas.mode === "voronoi" || canvas.mode === "balls"){
         if (event.shiftKey){
            canvas.selectSites()
         }else{
            canvas.deselectSites()
         }
         canvas.selectSingleSite(event)
         canvas.selecting = false;
         canvas.recalculateBruteForceVoronoi()
         canvas.drawAll()
       }
   }

   
   canvasElement.onscroll = (event) => {
       CAMERA.changeScale(event.movementY)
   
   }
   
   canvasElement.onmousemove = (event) => {

      if (canvas.mode === "site" || canvas.mode === "voronoi" || canvas.mode === "balls"){
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
            }else{
               CAMERA.changeOffset(event.movementX,event.movementY)
               canvas.drawAll()
            }
         }
      }else{
         if (!CAMERA.move_lock){
            if (!event.shiftKey && (canvas.draggingPoint == null)){
               CAMERA.changeOffset(event.movementX,event.movementY)
               canvas.drawAll()
            }
         }
      } 

      //test_render()
      //canvas.drawAll()
   }
   
   canvasElement.onscroll = (event) => {
       CAMERA.changeOffset(event.movementX,event.movementY)
   }

   document.getElementById('createSpace').addEventListener('click', (event) => {
      if(canvas.boundary && canvas.boundary.polygon.points.length > 2){
         canvas.space = new Space(canvas.boundary.polygon)
         canvas.space.storeOriginalOriginalGeometry()
         canvas.space.storeOriginalGeometry()

         canvas.space.runSpace(canvas)
      }
      
   })
}
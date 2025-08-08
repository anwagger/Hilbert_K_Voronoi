import { Space } from "../../asteroids/space.js";
import { calculateBisector, calculateHilbertPoint, HilbertPoint } from "../../geometry/hilbert.js";
import {Point, Polygon } from "../../geometry/primitives.js";
import { calculateHilbertDistance, cleanArray, cleanJason, convexHull, euclideanDistance, fieldsToIgnore, hilbertFrechetMean, hilbertPull, pointInPolygon } from "../../geometry/utils.js";
import { calculateVoronoiCellBoundary, VoronoiDiagram as Voronoi } from "../../geometry/voronoi.js";
import { CAMERA, DrawableBruteForceVoronoi, DrawableVoronoiDiagram, HilbertImage } from "../drawable.js";
import { kmeans, singleLinkKHilbert, singleLinkThresholdHilbert } from "../../geometry/clustering.js";
import { pointToVector } from "../../math/linear.js";

// from nithins
export function initEvents(canvas) {

   document.getElementById('mode-select').addEventListener('change', (event) => {
      canvas.mode = event.target.value
      toggleContainers(canvas);
      if (canvas.mode !== 'clusters') {
         canvas.clusters = null;
      }
      canvas.drawAll();
   });

   function toggleContainers(canvas) {
      
      document.getElementById('polygonContainer').style.display = (canvas.mode === "boundary") ? 'block' : 'none';
      document.getElementById('siteContainer').style.display = canvas.mode === "site" ? 'block' : 'none';
      document.getElementById('ballContainer').style.display = canvas.mode === "balls" ? 'block' : 'none';
      document.getElementById('clustersContainer').style.display = canvas.mode === "clusters" ? 'block' : 'none';
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

   document.getElementById('allHeader').addEventListener('click', (event) => {
      canvas.activeManager = (canvas.activeManager != "allCollapsible") ?"allCollapsible":""
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

   document.getElementById('siteDrawInfiniteBalls').addEventListener('input', (event) => {
      canvas.setInfiniteBalls(event);
    });

   document.getElementById('polygonShowInfo').addEventListener('change', (event) => {
      canvas.setPolygonShowInfo(event);
   });
   
   document.getElementById('showDistance').addEventListener('input', (event) => {
      canvas.setDistances(event);
    });

   document.getElementById('siteShowInfo').addEventListener('change', (event) => {
      canvas.sites.forEach((site, idx) =>{
         if (site.selected) {
            canvas.setSiteShowInfo(event, idx);
         }
      });
   });
   document.getElementById('siteSizeAmt').addEventListener('input', (event) => {
      let radius = parseFloat(event.target.value);
      canvas.sites.forEach((site, idx) =>{
         if (site.selected && radius >= 0) {
            site.radius = radius + 5
            site.drawable_point.radius = radius
         }
      });
      canvas.site_radius = radius
      canvas.drawAll()
   })

   document.getElementById('siteSizeRange').addEventListener('input', (event) => {
      let radius = parseFloat(event.target.value);
      canvas.sites.forEach((site, idx) =>{
         if (site.selected && radius >= 0) {
            site.radius = radius + 5
            site.drawable_point.radius = radius
         }
      });
      canvas.site_radius = radius
      canvas.drawAll()
   })

   document.getElementById('hideSites').addEventListener('change', (event) => {
            canvas.hide_sites = event.target.checked
            canvas.drawAll()
   });

   document.getElementById('siteDrawCentroid').addEventListener('change', (event) => {
            canvas.draw_hilbert_centroid = event.target.checked

            canvas.recalculateHilbertCentroid();
            canvas.drawAll()
   });
   document.getElementById('siteDrawHilbertRose').addEventListener('change', (event) => {
            canvas.draw_hilbert_rose = event.target.checked
            let k = document.getElementById('roseDepthRange').value;
            if(k >= 0){
               canvas.hilbert_rose_depth = Math.floor(k)
            }
            canvas.recalculateHilbertRose();
            canvas.drawAll()
   });
   document.getElementById('roseDepthRange').addEventListener('input', (event) => {
      let k = parseInt(event.target.value);
      if(k >= 0){
         canvas.hilbert_rose_depth = Math.floor(k)
      }
      canvas.recalculateHilbertRose()
      canvas.drawAll()
   })

   document.getElementById('roseDepthAmt').addEventListener('input', (event) => {
      let k = parseInt(event.target.value);
      if(k >= 0){
         canvas.hilbert_rose_depth = Math.floor(k)
      }
      canvas.recalculateHilbertRose()
      canvas.drawAll()
   })

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
      }else if(canvas.mode === 'site' || canvas.mode === 'voronoi' || canvas.mode === "clusters"){
         if(!event.shiftKey){
            canvas.addSite(event) 
         }
      } else if (canvas.mode === "balls") {
         console.log("yay!");
         const radius = document.getElementById('ballRadius').value
         canvas.addSite(event);
         let selectedBalls = getCheckedBalls()
         canvas.addBalls(canvas.sites.length - 1, selectedBalls, radius);
         canvas.drawAll();
      } else if(canvas.mode == 'image'){
         if(canvas.hilbert_image){

            canvas.setHilbertImagePoint(event)
            canvas.drawAll()
         }
      }
   });

   document.getElementById('generateRandomSites').addEventListener('click', () => {
      if(!canvas.boundary || canvas.boundary.polygon.points.length < 3){
            canvas.generateRandomGon();
      }
      let amt = parseInt(document.getElementById('randomSitesAmt').value);
      if (amt > 0) {
         canvas.generateRandomSites(amt);
      } else {
         alert("Amount must be positive");
      }
   })

   document.getElementById('kmeans').addEventListener('input', (event) => {
      if (event.target.checked) {
         canvas.clusters = null;
         document.getElementById("kmeansClustering").style.display = "block";
         document.getElementById("minLinkageClustering").style.display = "none";
         canvas.resetUsedColors();

         let k = parseInt(document.getElementById('kmeansAmt').value);

         // gets the actual coords in each site on canvas
         let points = [];
         canvas.sites.forEach((s) => {
            points.push(s.drawable_point.point);
         })

         canvas.clusters = kmeans(k, points, canvas.boundary.polygon, canvas);
         console.log(canvas.clusters);
         canvas.drawAll();
      } else {
         canvas.clusters = null;
      }
   });

   document.getElementById('kmeansAmt').addEventListener('input', (event) => {
      document.getElementById("kmeansAmtRange").max = canvas.sites.length;
      let k = event.target.value;

      if (k <= canvas.sites.length && k > 0) {
         let points = [];
         canvas.sites.forEach((s) => {
            points.push(s.drawable_point.point);
         })

         canvas.clusters = kmeans(k, points, canvas.boundary.polygon, canvas);
         canvas.drawAll();
      } else {
         alert("k must be > 0 and no more than the total amount of sites!")
      }
   })

   document.getElementById('minLinkage').addEventListener('input', (event) => {
      canvas.clusters = null;
      document.getElementById("kmeansClustering").style.display = "none";
      document.getElementById("minLinkageClustering").style.display = "block";
      canvas.resetUsedColors();
   })

   document.getElementById('generateKClusters').addEventListener('input', (event) => {
      if (event.target.checked) {
         canvas.clusters = null;
         document.getElementById("kDiv").style.display = "block";
         document.getElementById("threshDiv").style.display = "none";
         canvas.resetUsedColors();

         let k = document.getElementById('clusterAmt').value;

         let points = [];
         canvas.sites.forEach((s) => {
            points.push(s.drawable_point.point);
         })

         canvas.clusters = singleLinkKHilbert(canvas.boundary.polygon, points, k, canvas);
         canvas.drawAll();
      } else {
         canvas.clusters = null;
      }
   });

   document.getElementById('clusterAmt').addEventListener('input', (event) => {
      document.getElementById("clusterAmtRange").max = canvas.sites.length;
      let k = event.target.value;

      if (k <= canvas.sites.length && k > 0) {
         let points = [];
         canvas.sites.forEach((s) => {
            points.push(s.drawable_point.point);
         })

         canvas.clusters = singleLinkKHilbert(canvas.boundary.polygon, points, k, canvas);
         canvas.drawAll();
      } else {
         alert("k must be > 0 and no more than the total amount of sites!")
      }
   })

   document.getElementById('clusterAmtRange').addEventListener('input', (event) => {
      document.getElementById("clusterAmtRange").max = canvas.sites.length;
      let k = event.target.value;

      if (k <= canvas.sites.length && k > 0) {
         let points = [];
         canvas.sites.forEach((s) => {
            points.push(s.drawable_point.point);
         })

         canvas.clusters = singleLinkKHilbert(canvas.boundary.polygon, points, k, canvas);
         canvas.drawAll();
      } else {
         alert("k must be > 0 and no more than the total amount of sites!")
      }
   })

   document.getElementById('generateThresholdClusters').addEventListener('change', (event) => {
      if (event.target.checked) {
         canvas.clusters = null;
         document.getElementById("kDiv").style.display = "none";
         document.getElementById("threshDiv").style.display = "block";
         canvas.resetUsedColors();

         let thresh = document.getElementById('thresholdAmt').value;

         let points = [];
         canvas.sites.forEach((s) => {
            points.push(s.drawable_point.point);
         })

         canvas.clusters = singleLinkThresholdHilbert(canvas.boundary.polygon, points, thresh, canvas);
         canvas.drawAll();
      }
   });

   document.getElementById('thresholdAmt').addEventListener('input', (event) => {
      let thresh = event.target.value;
      let points = [];
      canvas.sites.forEach((s) => {
         points.push(s.drawable_point.point);
      })

      canvas.clusters = singleLinkThresholdHilbert(canvas.boundary.polygon, points, thresh, canvas);
      canvas.drawAll();
   })

   document.getElementById('thresholdAmtRange').addEventListener('input', (event) => {
      let thresh = event.target.value;

      if (thresh > 0) {
         let points = [];
         canvas.sites.forEach((s) => {
            points.push(s.drawable_point.point);
         })
         canvas.clusters = singleLinkThresholdHilbert(canvas.boundary.polygon, points, thresh, canvas);
         canvas.drawAll();
      } else {
         alert("thresh must be > 0")
      }
   })


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
                  canvas.recalculateFastVoronoi()
                  canvas.recalculateHilbertDelaunay()
                  canvas.recalculateHilbertCentroid()
                  canvas.recalculateHilbertRose()
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
      let canvas_clone = JSON.parse(JSON.stringify(canvas));

      // gets rid of unnecessary fields
      cleanJason(canvas_clone);

      const contents = JSON.stringify(canvas_clone);

      let downloadElt = document.getElementById('downloadData');
      downloadElt.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(contents));
      downloadElt.click();
   })

   document.getElementById('loadFile').addEventListener('change', (event) => {
      const file = event.target.files[0]; 
      console.log(file);
      if (file) {
         const reader = new FileReader(); 

         reader.readAsText(file);

         reader.onload = function(e) {
               try {
                  const fileContent = e.target.result;
                  const obj = JSON.parse(fileContent);

                  canvas.load(obj);
                  canvas.drawAll();

               } catch (error) {
                  console.log(error)
                  alert("Failed to load data. Make sure the file is a valid JSON format.");
               }
         };

        reader.onerror = function(e) {
            console.error("Error reading file:", e.target.error);
            alert("Error reading the file.");
        };
      }
   });


   document.getElementById('loadData').addEventListener('click', (event) => {
      // i just have this here to show it works, itll be replaced by user input tmrw prob
      
      document.getElementById('loadFile').click();
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


   function setCameraUI(){
      const zoomRange = document.getElementById('zoomRange')
      zoomRange.value = CAMERA.scale.x
      const zoomAmt = document.getElementById('zoomAmt')
      zoomAmt.value = CAMERA.scale.x
      const xAmt = document.getElementById('xAmt')
      xAmt.value = CAMERA.offset.x
      const yAmt = document.getElementById('yAmt')
      yAmt.value = CAMERA.offset.y
   }

   document.getElementById('zoomRange').addEventListener('input', (event) => {
      CAMERA.setScale(event.target.value);
      canvas.drawAll();
   })
   document.getElementById('zoomAmt').addEventListener('input', (event) => {
      CAMERA.setScale(event.target.value);
      canvas.drawAll();
   })
   document.getElementById('xAmt').addEventListener('input', (event) => {
      CAMERA.offset.x = event.target.value;
      canvas.drawAll();
   })
   document.getElementById('yAmt').addEventListener('input', (event) => {
      CAMERA.offset.y = event.target.value;
      canvas.drawAll();
   })

   document.getElementById('resetZoom').addEventListener('click', (event) => {
      CAMERA.setScale(1);
      CAMERA.offset.x = 0;
      CAMERA.offset.y = 0;
      setCameraUI()
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

       if (canvas.mode === "site" || canvas.mode === "voronoi" || canvas.mode === "balls" || canvas.mode === "clusters"){
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
         
         if(canvas.mode === "voronoi"){

            if(canvas.calculate_fast_voronoi){
               const {x,y} = canvas.getMousePos(event)
               let point = new Point(CAMERA.ix(x),CAMERA.iy(y))
               let points = []
               canvas.sites.forEach((site,i) => {
                  points.push(site.drawable_point.point)
               })
               let voronoi = canvas.voronoi_diagram.voronoi
               canvas.current_voronoi_cell_index = voronoi.partition_tree.findCurrentCell(voronoi,points,point)
            }
            
         }
         
       }else if (canvas.mode === "boundary") {
         const {x,y} = canvas.getMousePos(event)
         let point = new Point(CAMERA.ix(x),CAMERA.iy(y))
         if(canvas.boundary){
            canvas.selected_boundary = -1
            canvas.boundary.polygon.points.forEach((p,i) => {
               if (euclideanDistance(point,p) <= 5){
                  CAMERA.move_lock = true
                  canvas.selected_boundary = i
               }
            })
         }
       }

   }
   canvasElement.onmouseup = (event) => {
       CAMERA.move_lock = true

       canvas.selected_boundary = -1

       if (canvas.mode === "site" || canvas.mode === "voronoi" || canvas.mode === "balls" || canvas.mode === "clusters"){
         if (event.shiftKey){
            canvas.selectSites()
         }else{
            canvas.deselectSites()
         }
         canvas.selectSingleSite(event)
         canvas.selecting = false;
         canvas.recalculateBruteForceVoronoi()
         canvas.recalculateHilbertCentroid()
         canvas.drawAll()
       }
         
       
   }

   
   canvasElement.onscroll = (event) => {
       CAMERA.changeScale(event.movementY)
      setCameraUI()
   }
   
   canvasElement.onmousemove = (event) => {
      
      /**
      const {x,y} = canvas.getMousePos(event)
      let point = new Point(CAMERA.ix(x),CAMERA.iy(y))
      let dists = []
      canvas.sites.forEach((site,i) => {
         dists.push(calculateHilbertDistance(canvas.boundary.polygon,point,site.drawable_point.point)**2)
      })
      
      let max = 0
      dists.forEach((d) => {
         max += d
      })
      //console.log("VAR ",x,y,":",max)
      
      let points = []
      for(let i = 0; i < canvas.sites.length; i++){
         points.push(canvas.sites[i].drawable_point.point)
      }
      let new_p = hilbertPull(canvas.boundary.polygon,points,point)

      //console.log("PULL",calculateHilbertDistance(canvas.boundary.polygon,point,new_p))

       */

      if(canvas.mode === "boundary"){
         const {x,y} = canvas.getMousePos(event)
         let point = new Point(CAMERA.ix(x),CAMERA.iy(y))
         canvas.dragBoundaryPoint(point)
      }
      
      if (canvas.mode === "site" || canvas.mode === "voronoi" || canvas.mode === "balls" || canvas.mode === "clusters"){
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
            setCameraUI()
         }
      }else{
         if (!CAMERA.move_lock){
            if (!event.shiftKey && (canvas.draggingPoint == null)){
               CAMERA.changeOffset(event.movementX,event.movementY)
               canvas.drawAll()
            }
            setCameraUI()
         }
      } 
      if(canvas.mode === "voronoi"){

         if(canvas.calculate_fast_voronoi){
            const {x,y} = canvas.getMousePos(event)
            let point = new Point(CAMERA.ix(x),CAMERA.iy(y))
            let points = []
            canvas.sites.forEach((site,i) => {
               points.push(site.drawable_point.point)
            })
            let voronoi = canvas.voronoi_diagram.voronoi
            let last_index = canvas.current_voronoi_cell_index 
            canvas.current_voronoi_cell_index = voronoi.partition_tree.findCurrentCell(voronoi,points,point)
            //console.log("CHAN",canvas.current_voronoi_cell_index)
            if(last_index != canvas.current_voronoi_cell_index){
               canvas.drawAll()
               /**
               if(canvas.current_voronoi_cell_index >= 0){
                  let cell = voronoi.cells[canvas.current_voronoi_cell_index]
                  console.log("BOUNDARY",calculateVoronoiCellBoundary(voronoi.boundary,points,cell.bisector_segments,cell.bisector_data,cell.contained_sites,true))
               }
               */
            }
            
         }
         
      }



      //test_render()
      //canvas.drawAll()
   }
   
   canvasElement.onscroll = (event) => {
      CAMERA.changeOffset(event.movementX,event.movementY)
      setCameraUI()
   }

   document.getElementById('createSpace').addEventListener('click', (event) => {
      if (!canvas.space) {
         if(!canvas.boundary || canvas.boundary.polygon.points.length < 3){
            canvas.generateRandomGon();
         }

         canvas.space = new Space(canvas.boundary.polygon)
         
         canvas.space.runSpace(canvas)
      }else{
         canvas.space.reset()
      }
   })
   document.getElementById('projectPoints').addEventListener('change', (event) => {
      if (canvas.space) {
         canvas.space.useProjection = event.target.checked
      }
   })
   document.getElementById('showAsteroids').addEventListener('change', (event) => {
      if (canvas.space) {
         canvas.space.showAsteroids = !event.target.checked
      }
   })
   document.getElementById('makeInvulnerable').addEventListener('change', (event) => {
      if (canvas.space) {
         canvas.space.invulnerable = event.target.checked
      }
   })
}
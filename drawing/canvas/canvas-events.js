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
      const text = `{"boundary":{"polygon":{"points":[{"x":222.92666666666668,"y":376.55},{"x":524.1666666666666,"y":75.31000000000006},{"x":825.4066666666665,"y":376.55},{"x":524.1666666666666,"y":677.79}],"segments":[{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":524.1666666666666,"y":75.31000000000006}},{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":825.4066666666665,"y":376.55}},{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":524.1666666666666,"y":677.79}},{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":222.92666666666668,"y":376.55}}]},"points":[{"point":{"x":222.92666666666668,"y":376.55},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":524.1666666666666,"y":75.31000000000006},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":825.4066666666665,"y":376.55},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":524.1666666666666,"y":677.79},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null}],"segments":[{"segment":{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":524.1666666666666,"y":75.31000000000006}},"locked":false,"color":"black","width":2,"stroke_style":"black"},{"segment":{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":825.4066666666665,"y":376.55}},"locked":false,"color":"black","width":2,"stroke_style":"black"},{"segment":{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":524.1666666666666,"y":677.79}},"locked":false,"color":"black","width":2,"stroke_style":"black"},{"segment":{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":222.92666666666668,"y":376.55}},"locked":false,"color":"black","width":2,"stroke_style":"black"}],"color":"black","stroke_style":"black","show_vertices":true,"dashes":null},"boundaryType":"4","sites":[{"draw_spokes":false,"drawable_point":{"point":{"x":385.29998779296875,"y":434.43333435058594},"locked":false,"color":"lightskyblue","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},"color":"lightskyblue","drawable_spokes":[{"spoke":{"segment":{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":667.0752364357179,"y":534.8814302309487}},"front":0,"back":2,"point":{"x":385.29998779296875,"y":434.43333435058594}},"segment":{"segment":{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":667.0752364357179,"y":534.8814302309487}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"lightskyblue"},{"spoke":{"segment":{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":356.16250098845876,"y":509.78583432179204}},"front":1,"back":3,"point":{"x":385.29998779296875,"y":434.43333435058594}},"segment":{"segment":{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":356.16250098845876,"y":509.78583432179204}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"lightskyblue"},{"spoke":{"segment":{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":292.95528240887586,"y":446.5786157422092}},"front":2,"back":3,"point":{"x":385.29998779296875,"y":434.43333435058594}},"segment":{"segment":{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":292.95528240887586,"y":446.5786157422092}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"lightskyblue"},{"spoke":{"segment":{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":305.2778994402406,"y":294.198767226426}},"front":3,"back":0,"point":{"x":385.29998779296875,"y":434.43333435058594}},"segment":{"segment":{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":305.2778994402406,"y":294.198767226426}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"lightskyblue"}],"radius":8,"selected":false,"balls":[{"ball":{"point":{"point":{"x":385.29998779296875,"y":434.43333435058594},"spokes":[{"segment":{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":667.0752364357179,"y":534.8814302309487}},"front":0,"back":2,"point":{"x":385.29998779296875,"y":434.43333435058594}},{"segment":{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":356.16250098845876,"y":509.78583432179204}},"front":1,"back":3,"point":{"x":385.29998779296875,"y":434.43333435058594}},{"segment":{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":292.95528240887586,"y":446.5786157422092}},"front":2,"back":3,"point":{"x":385.29998779296875,"y":434.43333435058594}},{"segment":{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":305.2778994402406,"y":294.198767226426}},"front":3,"back":0,"point":{"x":385.29998779296875,"y":434.43333435058594}}]},"type":1,"radius":"1","boundary":{"points":[{"x":222.92666666666668,"y":376.55},{"x":524.1666666666666,"y":75.31000000000006},{"x":825.4066666666665,"y":376.55},{"x":524.1666666666666,"y":677.79}],"segments":[{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":524.1666666666666,"y":75.31000000000006}},{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":825.4066666666665,"y":376.55}},{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":524.1666666666666,"y":677.79}},{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":222.92666666666668,"y":376.55}}]},"polygon":{"points":[{"x":282.6604733037618,"y":397.8440886940333},{"x":473.08047044527655,"y":207.42409155251863},{"x":663.5004675867912,"y":397.8440886940333},{"x":473.08047044527655,"y":588.264085835548}],"segments":[{"start":{"x":282.6604733037618,"y":397.8440886940333},"end":{"x":473.08047044527655,"y":207.42409155251863}},{"start":{"x":473.08047044527655,"y":207.42409155251863},"end":{"x":663.5004675867912,"y":397.8440886940333}},{"start":{"x":663.5004675867912,"y":397.8440886940333},"end":{"x":473.08047044527655,"y":588.264085835548}},{"start":{"x":473.08047044527655,"y":588.264085835548},"end":{"x":282.6604733037618,"y":397.8440886940333}}]}},"color":"lightskyblue","polygon":{"polygon":{"points":[{"x":282.6604733037618,"y":397.8440886940333},{"x":473.08047044527655,"y":207.42409155251863},{"x":663.5004675867912,"y":397.8440886940333},{"x":473.08047044527655,"y":588.264085835548}],"segments":[{"start":{"x":282.6604733037618,"y":397.8440886940333},"end":{"x":473.08047044527655,"y":207.42409155251863}},{"start":{"x":473.08047044527655,"y":207.42409155251863},"end":{"x":663.5004675867912,"y":397.8440886940333}},{"start":{"x":663.5004675867912,"y":397.8440886940333},"end":{"x":473.08047044527655,"y":588.264085835548}},{"start":{"x":473.08047044527655,"y":588.264085835548},"end":{"x":282.6604733037618,"y":397.8440886940333}}]},"points":[{"point":{"x":282.6604733037618,"y":397.8440886940333},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":473.08047044527655,"y":207.42409155251863},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":663.5004675867912,"y":397.8440886940333},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":473.08047044527655,"y":588.264085835548},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null}],"segments":[{"segment":{"start":{"x":282.6604733037618,"y":397.8440886940333},"end":{"x":473.08047044527655,"y":207.42409155251863}},"locked":false,"color":"lightskyblue","width":2,"stroke_style":"black"},{"segment":{"start":{"x":473.08047044527655,"y":207.42409155251863},"end":{"x":663.5004675867912,"y":397.8440886940333}},"locked":false,"color":"lightskyblue","width":2,"stroke_style":"black"},{"segment":{"start":{"x":663.5004675867912,"y":397.8440886940333},"end":{"x":473.08047044527655,"y":588.264085835548}},"locked":false,"color":"lightskyblue","width":2,"stroke_style":"black"},{"segment":{"start":{"x":473.08047044527655,"y":588.264085835548},"end":{"x":282.6604733037618,"y":397.8440886940333}},"locked":false,"color":"lightskyblue","width":2,"stroke_style":"black"}],"color":"lightskyblue","stroke_style":"black","show_vertices":false,"dashes":null}}]},{"draw_spokes":false,"drawable_point":{"point":{"x":663.2999877929688,"y":283.43333435058594},"locked":false,"color":"indigo","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},"color":"indigo","drawable_spokes":[{"spoke":{"segment":{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":720.2483129747455,"y":271.3916463080791}},"front":0,"back":1,"point":{"x":663.2999877929688,"y":283.43333435058594}},"segment":{"segment":{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":720.2483129747455,"y":271.3916463080791}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"indigo"},{"spoke":{"segment":{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":765.5588530800774,"y":436.3978135865893}},"front":1,"back":2,"point":{"x":663.2999877929688,"y":283.43333435058594}},"segment":{"segment":{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":765.5588530800774,"y":436.3978135865893}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"indigo"},{"spoke":{"segment":{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":442.7377847494748,"y":156.73888191719186}},"front":2,"back":0,"point":{"x":663.2999877929688,"y":283.43333435058594}},"segment":{"segment":{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":442.7377847494748,"y":156.73888191719186}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"indigo"},{"spoke":{"segment":{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":681.2924710679689,"y":232.43580440130242}},"front":3,"back":1,"point":{"x":663.2999877929688,"y":283.43333435058594}},"segment":{"segment":{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":681.2924710679689,"y":232.43580440130242}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"indigo"}],"radius":8,"selected":false,"balls":[{"ball":{"point":{"point":{"x":663.2999877929688,"y":283.43333435058594},"spokes":[{"segment":{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":720.2483129747455,"y":271.3916463080791}},"front":0,"back":1,"point":{"x":663.2999877929688,"y":283.43333435058594}},{"segment":{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":765.5588530800774,"y":436.3978135865893}},"front":1,"back":2,"point":{"x":663.2999877929688,"y":283.43333435058594}},{"segment":{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":442.7377847494748,"y":156.73888191719186}},"front":2,"back":0,"point":{"x":663.2999877929688,"y":283.43333435058594}},{"segment":{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":681.2924710679689,"y":232.43580440130242}},"front":3,"back":1,"point":{"x":663.2999877929688,"y":283.43333435058594}}]},"type":3,"radius":"1","boundary":{"points":[{"x":222.92666666666668,"y":376.55},{"x":524.1666666666666,"y":75.31000000000006},{"x":825.4066666666665,"y":376.55},{"x":524.1666666666666,"y":677.79}],"segments":[{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":524.1666666666666,"y":75.31000000000006}},{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":825.4066666666665,"y":376.55}},{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":524.1666666666666,"y":677.79}},{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":222.92666666666668,"y":376.55}}]},"polygon":{"points":[{"x":494.2738092002576,"y":232.95144182631074},{"x":575.3509550909375,"y":151.87429593563084},{"x":765.7709522324521,"y":342.29429307714554},{"x":684.6938063417722,"y":423.3714389678252}],"segments":[{"start":{"x":494.2738092002576,"y":232.95144182631074},"end":{"x":575.3509550909375,"y":151.87429593563084}},{"start":{"x":575.3509550909375,"y":151.87429593563084},"end":{"x":765.7709522324521,"y":342.29429307714554}},{"start":{"x":765.7709522324521,"y":342.29429307714554},"end":{"x":684.6938063417722,"y":423.3714389678252}},{"start":{"x":684.6938063417722,"y":423.3714389678252},"end":{"x":494.2738092002576,"y":232.95144182631074}}]}},"color":"indigo","polygon":{"polygon":{"points":[{"x":494.2738092002576,"y":232.95144182631074},{"x":575.3509550909375,"y":151.87429593563084},{"x":765.7709522324521,"y":342.29429307714554},{"x":684.6938063417722,"y":423.3714389678252}],"segments":[{"start":{"x":494.2738092002576,"y":232.95144182631074},"end":{"x":575.3509550909375,"y":151.87429593563084}},{"start":{"x":575.3509550909375,"y":151.87429593563084},"end":{"x":765.7709522324521,"y":342.29429307714554}},{"start":{"x":765.7709522324521,"y":342.29429307714554},"end":{"x":684.6938063417722,"y":423.3714389678252}},{"start":{"x":684.6938063417722,"y":423.3714389678252},"end":{"x":494.2738092002576,"y":232.95144182631074}}]},"points":[{"point":{"x":494.2738092002576,"y":232.95144182631074},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":575.3509550909375,"y":151.87429593563084},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":765.7709522324521,"y":342.29429307714554},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":684.6938063417722,"y":423.3714389678252},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null}],"segments":[{"segment":{"start":{"x":494.2738092002576,"y":232.95144182631074},"end":{"x":575.3509550909375,"y":151.87429593563084}},"locked":false,"color":"indigo","width":2,"stroke_style":"black"},{"segment":{"start":{"x":575.3509550909375,"y":151.87429593563084},"end":{"x":765.7709522324521,"y":342.29429307714554}},"locked":false,"color":"indigo","width":2,"stroke_style":"black"},{"segment":{"start":{"x":765.7709522324521,"y":342.29429307714554},"end":{"x":684.6938063417722,"y":423.3714389678252}},"locked":false,"color":"indigo","width":2,"stroke_style":"black"},{"segment":{"start":{"x":684.6938063417722,"y":423.3714389678252},"end":{"x":494.2738092002576,"y":232.95144182631074}},"locked":false,"color":"indigo","width":2,"stroke_style":"black"}],"color":"indigo","stroke_style":"black","show_vertices":false,"dashes":null}}]},{"draw_spokes":false,"drawable_point":{"point":{"x":639.2999877929688,"y":489.43333435058594},"locked":false,"color":"rebeccapurple","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},"color":"rebeccapurple","drawable_spokes":[{"spoke":{"segment":{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":696.9057766433556,"y":505.05089002331096}},"front":0,"back":2,"point":{"x":639.2999877929688,"y":489.43333435058594}},"segment":{"segment":{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":696.9057766433556,"y":505.05089002331096}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"rebeccapurple"},{"spoke":{"segment":{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":655.2288320534627,"y":546.7278346132036}},"front":1,"back":2,"point":{"x":639.2999877929688,"y":489.43333435058594}},"segment":{"segment":{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":655.2288320534627,"y":546.7278346132036}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"rebeccapurple"},{"spoke":{"segment":{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":450.3922951875903,"y":604.0156285209237}},"front":2,"back":3,"point":{"x":639.2999877929688,"y":489.43333435058594}},"segment":{"segment":{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":450.3922951875903,"y":604.0156285209237}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"rebeccapurple"},{"spoke":{"segment":{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":752.7261787913176,"y":303.8695121246511}},"front":3,"back":1,"point":{"x":639.2999877929688,"y":489.43333435058594}},"segment":{"segment":{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":752.7261787913176,"y":303.8695121246511}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"rebeccapurple"}],"radius":8,"selected":false,"balls":[{"ball":{"point":{"point":{"x":639.2999877929688,"y":489.43333435058594},"spokes":[{"segment":{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":696.9057766433556,"y":505.05089002331096}},"front":0,"back":2,"point":{"x":639.2999877929688,"y":489.43333435058594}},{"segment":{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":655.2288320534627,"y":546.7278346132036}},"front":1,"back":2,"point":{"x":639.2999877929688,"y":489.43333435058594}},{"segment":{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":450.3922951875903,"y":604.0156285209237}},"front":2,"back":3,"point":{"x":639.2999877929688,"y":489.43333435058594}},{"segment":{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":752.7261787913176,"y":303.8695121246511}},"front":3,"back":1,"point":{"x":639.2999877929688,"y":489.43333435058594}}]},"type":1,"radius":"1","boundary":{"points":[{"x":222.92666666666668,"y":376.55},{"x":524.1666666666666,"y":75.31000000000006},{"x":825.4066666666665,"y":376.55},{"x":524.1666666666666,"y":677.79}],"segments":[{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":524.1666666666666,"y":75.31000000000006}},{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":825.4066666666665,"y":376.55}},{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":524.1666666666666,"y":677.79}},{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":222.92666666666668,"y":376.55}}]},"polygon":{"points":[{"x":376.10185136130815,"y":418.0774579584627},{"x":566.5218485028229,"y":227.65746081694797},{"x":756.9418456443375,"y":418.0774579584627},{"x":566.5218485028229,"y":608.4974550999773}],"segments":[{"start":{"x":376.10185136130815,"y":418.0774579584627},"end":{"x":566.5218485028229,"y":227.65746081694797}},{"start":{"x":566.5218485028229,"y":227.65746081694797},"end":{"x":756.9418456443375,"y":418.0774579584627}},{"start":{"x":756.9418456443375,"y":418.0774579584627},"end":{"x":566.5218485028229,"y":608.4974550999773}},{"start":{"x":566.5218485028229,"y":608.4974550999773},"end":{"x":376.10185136130815,"y":418.0774579584627}}]}},"color":"rebeccapurple","polygon":{"polygon":{"points":[{"x":376.10185136130815,"y":418.0774579584627},{"x":566.5218485028229,"y":227.65746081694797},{"x":756.9418456443375,"y":418.0774579584627},{"x":566.5218485028229,"y":608.4974550999773}],"segments":[{"start":{"x":376.10185136130815,"y":418.0774579584627},"end":{"x":566.5218485028229,"y":227.65746081694797}},{"start":{"x":566.5218485028229,"y":227.65746081694797},"end":{"x":756.9418456443375,"y":418.0774579584627}},{"start":{"x":756.9418456443375,"y":418.0774579584627},"end":{"x":566.5218485028229,"y":608.4974550999773}},{"start":{"x":566.5218485028229,"y":608.4974550999773},"end":{"x":376.10185136130815,"y":418.0774579584627}}]},"points":[{"point":{"x":376.10185136130815,"y":418.0774579584627},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":566.5218485028229,"y":227.65746081694797},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":756.9418456443375,"y":418.0774579584627},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":566.5218485028229,"y":608.4974550999773},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null}],"segments":[{"segment":{"start":{"x":376.10185136130815,"y":418.0774579584627},"end":{"x":566.5218485028229,"y":227.65746081694797}},"locked":false,"color":"rebeccapurple","width":2,"stroke_style":"black"},{"segment":{"start":{"x":566.5218485028229,"y":227.65746081694797},"end":{"x":756.9418456443375,"y":418.0774579584627}},"locked":false,"color":"rebeccapurple","width":2,"stroke_style":"black"},{"segment":{"start":{"x":756.9418456443375,"y":418.0774579584627},"end":{"x":566.5218485028229,"y":608.4974550999773}},"locked":false,"color":"rebeccapurple","width":2,"stroke_style":"black"},{"segment":{"start":{"x":566.5218485028229,"y":608.4974550999773},"end":{"x":376.10185136130815,"y":418.0774579584627}},"locked":false,"color":"rebeccapurple","width":2,"stroke_style":"black"}],"color":"rebeccapurple","stroke_style":"black","show_vertices":false,"dashes":null}}]},{"draw_spokes":false,"drawable_point":{"point":{"x":268.29998779296875,"y":372.43333435058594},"locked":false,"color":"olive","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},"color":"olive","drawable_spokes":[{"spoke":{"segment":{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":775.291302286008,"y":326.4346356193415}},"front":0,"back":1,"point":{"x":268.29998779296875,"y":372.43333435058594}},"segment":{"segment":{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":775.291302286008,"y":326.4346356193415}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"olive"},{"spoke":{"segment":{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":245.40113202526092,"y":399.0244653585943}},"front":1,"back":3,"point":{"x":268.29998779296875,"y":372.43333435058594}},"segment":{"segment":{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":245.40113202526092,"y":399.0244653585943}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"olive"},{"spoke":{"segment":{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":227.34595667778777,"y":372.1307099888789}},"front":2,"back":0,"point":{"x":268.29998779296875,"y":372.43333435058594}},"segment":{"segment":{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":227.34595667778777,"y":372.1307099888789}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"olive"},{"spoke":{"segment":{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":249.49071422777587,"y":349.98595243889076}},"front":3,"back":0,"point":{"x":268.29998779296875,"y":372.43333435058594}},"segment":{"segment":{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":249.49071422777587,"y":349.98595243889076}},"locked":false,"color":"black","width":2,"stroke_style":"black"},"color":"olive"}],"radius":8,"selected":true,"balls":[{"ball":{"point":{"point":{"x":268.29998779296875,"y":372.43333435058594},"spokes":[{"segment":{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":775.291302286008,"y":326.4346356193415}},"front":0,"back":1,"point":{"x":268.29998779296875,"y":372.43333435058594}},{"segment":{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":245.40113202526092,"y":399.0244653585943}},"front":1,"back":3,"point":{"x":268.29998779296875,"y":372.43333435058594}},{"segment":{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":227.34595667778777,"y":372.1307099888789}},"front":2,"back":0,"point":{"x":268.29998779296875,"y":372.43333435058594}},{"segment":{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":249.49071422777587,"y":349.98595243889076}},"front":3,"back":0,"point":{"x":268.29998779296875,"y":372.43333435058594}}]},"type":0,"radius":"1","boundary":{"points":[{"x":222.92666666666668,"y":376.55},{"x":524.1666666666666,"y":75.31000000000006},{"x":825.4066666666665,"y":376.55},{"x":524.1666666666666,"y":677.79}],"segments":[{"start":{"x":222.92666666666668,"y":376.55},"end":{"x":524.1666666666666,"y":75.31000000000006}},{"start":{"x":524.1666666666666,"y":75.31000000000006},"end":{"x":825.4066666666665,"y":376.55}},{"start":{"x":825.4066666666665,"y":376.55},"end":{"x":524.1666666666666,"y":677.79}},{"start":{"x":524.1666666666666,"y":677.79},"end":{"x":222.92666666666668,"y":376.55}}]},"polygon":{"points":[{"x":229.53677282876984,"y":375.9502731935632},{"x":233.23731251916254,"y":372.17424337869517},{"x":252.19648263867202,"y":353.21507325918566},{"x":356.36556852103706,"y":270.16781426557054},{"x":442.79900709260875,"y":356.6012528371423},{"x":437.8569179234381,"y":373.6862527167764},{"x":346.1737061267934,"y":465.3694645134211},{"x":248.7370982683732,"y":395.15059863316657}],"segments":[{"start":{"x":229.53677282876984,"y":375.9502731935632},"end":{"x":233.23731251916254,"y":372.17424337869517}},{"start":{"x":233.23731251916254,"y":372.17424337869517},"end":{"x":252.19648263867202,"y":353.21507325918566}},{"start":{"x":252.19648263867202,"y":353.21507325918566},"end":{"x":356.36556852103706,"y":270.16781426557054}},{"start":{"x":356.36556852103706,"y":270.16781426557054},"end":{"x":442.79900709260875,"y":356.6012528371423}},{"start":{"x":442.79900709260875,"y":356.6012528371423},"end":{"x":437.8569179234381,"y":373.6862527167764}},{"start":{"x":437.8569179234381,"y":373.6862527167764},"end":{"x":346.1737061267934,"y":465.3694645134211}},{"start":{"x":346.1737061267934,"y":465.3694645134211},"end":{"x":248.7370982683732,"y":395.15059863316657}},{"start":{"x":248.7370982683732,"y":395.15059863316657},"end":{"x":229.53677282876984,"y":375.9502731935632}}]}},"color":"olive","polygon":{"polygon":{"points":[{"x":229.53677282876984,"y":375.9502731935632},{"x":233.23731251916254,"y":372.17424337869517},{"x":252.19648263867202,"y":353.21507325918566},{"x":356.36556852103706,"y":270.16781426557054},{"x":442.79900709260875,"y":356.6012528371423},{"x":437.8569179234381,"y":373.6862527167764},{"x":346.1737061267934,"y":465.3694645134211},{"x":248.7370982683732,"y":395.15059863316657}],"segments":[{"start":{"x":229.53677282876984,"y":375.9502731935632},"end":{"x":233.23731251916254,"y":372.17424337869517}},{"start":{"x":233.23731251916254,"y":372.17424337869517},"end":{"x":252.19648263867202,"y":353.21507325918566}},{"start":{"x":252.19648263867202,"y":353.21507325918566},"end":{"x":356.36556852103706,"y":270.16781426557054}},{"start":{"x":356.36556852103706,"y":270.16781426557054},"end":{"x":442.79900709260875,"y":356.6012528371423}},{"start":{"x":442.79900709260875,"y":356.6012528371423},"end":{"x":437.8569179234381,"y":373.6862527167764}},{"start":{"x":437.8569179234381,"y":373.6862527167764},"end":{"x":346.1737061267934,"y":465.3694645134211}},{"start":{"x":346.1737061267934,"y":465.3694645134211},"end":{"x":248.7370982683732,"y":395.15059863316657}},{"start":{"x":248.7370982683732,"y":395.15059863316657},"end":{"x":229.53677282876984,"y":375.9502731935632}}]},"points":[{"point":{"x":229.53677282876984,"y":375.9502731935632},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":233.23731251916254,"y":372.17424337869517},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":252.19648263867202,"y":353.21507325918566},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":356.36556852103706,"y":270.16781426557054},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":442.79900709260875,"y":356.6012528371423},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":437.8569179234381,"y":373.6862527167764},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":346.1737061267934,"y":465.3694645134211},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null},{"point":{"x":248.7370982683732,"y":395.15059863316657},"locked":false,"color":"black","stroke_style":"black","label":"","radius":3,"drawPoint":true,"defaultInfoBoxPosition":false,"infoBoxPosition":false,"infoBox":null}],"segments":[{"segment":{"start":{"x":229.53677282876984,"y":375.9502731935632},"end":{"x":233.23731251916254,"y":372.17424337869517}},"locked":false,"color":"olive","width":2,"stroke_style":"black"},{"segment":{"start":{"x":233.23731251916254,"y":372.17424337869517},"end":{"x":252.19648263867202,"y":353.21507325918566}},"locked":false,"color":"olive","width":2,"stroke_style":"black"},{"segment":{"start":{"x":252.19648263867202,"y":353.21507325918566},"end":{"x":356.36556852103706,"y":270.16781426557054}},"locked":false,"color":"olive","width":2,"stroke_style":"black"},{"segment":{"start":{"x":356.36556852103706,"y":270.16781426557054},"end":{"x":442.79900709260875,"y":356.6012528371423}},"locked":false,"color":"olive","width":2,"stroke_style":"black"},{"segment":{"start":{"x":442.79900709260875,"y":356.6012528371423},"end":{"x":437.8569179234381,"y":373.6862527167764}},"locked":false,"color":"olive","width":2,"stroke_style":"black"},{"segment":{"start":{"x":437.8569179234381,"y":373.6862527167764},"end":{"x":346.1737061267934,"y":465.3694645134211}},"locked":false,"color":"olive","width":2,"stroke_style":"black"},{"segment":{"start":{"x":346.1737061267934,"y":465.3694645134211},"end":{"x":248.7370982683732,"y":395.15059863316657}},"locked":false,"color":"olive","width":2,"stroke_style":"black"},{"segment":{"start":{"x":248.7370982683732,"y":395.15059863316657},"end":{"x":229.53677282876984,"y":375.9502731935632}},"locked":false,"color":"olive","width":2,"stroke_style":"black"}],"color":"olive","stroke_style":"black","show_vertices":false,"dashes":null}}]}],"segments":[],"bisectors":[],"bisector_intersections":[],"z_regions":[],"brute_force_voronoi":true,"calculate_fast_voronoi":true,"delaunay":true,"usedColors":[]}`
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
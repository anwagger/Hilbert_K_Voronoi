// from nithins
export function initEvents(canvas) {
   document.getElementById('reset').addEventListener('click', () => {
      canvas.resetCanvas();
   });
  
   document.getElementById('polygonColor').addEventListener('input', (event) => {
      canvas.setPolygonColor(event);
    });
  
   document.getElementById('polygonShowInfo').addEventListener('change', (event) => {
      canvas.setPolygonShowInfo(event);
   });


   document.getElementById('polygonShowCentroid').addEventListener('change', (event) => {
      canvas.setPolygonShowCentroid(event);
   });
  
   document.getElementById('modeSwitch').addEventListener('change', (event) => {
      canvas.mode = event.target.checked ? 'Hilbert' : 'Convex';
      toggleContainers(event);
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
  
   document.getElementById('createCustomNgon').addEventListener('click', () => {
      const input = document.getElementById('customNgonInput');
      const n = parseInt(input.value);
      if (n >= 3) {
        document.getElementById('customNgon').checked = true;
        canvas.setPolygonType('customNgon');
      } else {
        alert('Please enter a number greater than or equal to 3.');
      }
   });

    // Keep the existing double-click event listener
   canvas.canvas.addEventListener('dblclick', (event) => {
        if (canvas.mode === 'Convex' && canvas.polygonType === 'freeDraw') canvas.addPolygonPoint(event);
   });
  
   function toggleContainers(event) {
      document.getElementById('polygonContainer').style.display = event.target.checked ? 'none' : 'block';
      document.getElementById('hilbertContainer').style.display = event.target.checked ? 'block' : 'none';
   }
  
   document.addEventListener('keydown', (event) => {
      if (!isAnyModalOpen()) {
        if (event.key === 't') {
          const modeSwitch = document.getElementById('modeSwitch');
          modeSwitch.checked = !modeSwitch.checked;
          canvas.mode = modeSwitch.checked ? 'Hilbert' : 'Convex';
          if (modeSwitch.checked) {
            canvas.drawAll();
          }
          toggleContainers({ target: modeSwitch });
        }
      } 
   });

}
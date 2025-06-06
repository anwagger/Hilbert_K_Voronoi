class Canvas {
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
      initEvents(this);
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
   }
}
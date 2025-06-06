class DrawablePolygon {
   constructor(polygon, color = "blue", stroke_style = "black") {
      this.polygon = polygon;
      this.color = color;
      this.stroke_style = stroke_style;
   }

   draw(ctx) {
      let points = this.polygon.points;
      if (points.length > 0) {
          this.segments.forEach((segment) => {
            segment.setPenWidth(this.penWidth);
            segment.setColor(this.color);
            segment.draw(ctx);
          });

          if (this.showVertices) {
            this.vertices.forEach((vertex) => {
              if (!(vertex instanceof Site)) vertex.setColor(this.color);
              vertex.setRadius(this.vertexRadius);
              if (this.showInfo) { vertex.setShowInfo(true); }
              else { vertex.setShowInfo(false); }
              vertex.draw(ctx); 
            });
          }

          if (this.showDiag) {

            if (this.segments.length > 3) {

              let newSegments = [];

              for (let i = 0; i < this.segments.length; i++) {
                let s1 = this.segments[i];
                for (let j = 1; j < this.segments.length - 1; j++) {
                  let s2 = this.segments[(j + 2) % this.segments.length];
                  let intersection = lineIntersection(s1.start, s1.end, s2.start, s2.end);

                  let newSegment1 = new Segment (s1.end, intersection, this.color);
                  let newSegment2 = new Segment (intersection, s2.start, this.color);
                  newSegments.push(newSegment1);
                  newSegments.push(newSegment2);

                  this.vertices.forEach(omegaVertex => {
                    if (
                      !( 
                        omegaVertex.isEqual(s1.start) || 
                        omegaVertex.isEqual(s1.end) ||
                        omegaVertex.isEqual(s2.start) ||
                        omegaVertex.isEqual(s2.end)
                      ) 
                    ) {
                      let hiddenDiagonal = new Segment(intersection, omegaVertex, 'gray',1);
                      hiddenDiagonal.draw(ctx);
                    }
                  });
                }
              }

              newSegments.forEach(newSegment => { newSegment.draw(ctx); });


              if (this.vertices.length > 2) {
              for (let i = 0; i < this.vertices.length; i++) {
                let v1 = this.vertices[i];
                for (let j = 1; j < this.vertices.length-1; j++) {
                  let v2 = this.vertices[(j + 1) % this.vertices.length];
                  let newSegment = new Segment(v1,v2,this.color, 1);
                  newSegment.draw(ctx);
                }
              }
            }

            }
          }
          
      }
    }



}
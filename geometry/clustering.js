import { Point } from "./primitives.js"
import { calculateHilbertDistance, computeBoundingBox, euclideanDistance, isZero, pointInPolygon, pointOnPolygon } from "./utils.js"

export class KCluster{
    constructor(boundary,k,points){
        this.boundary = boundary
        this.k = k
        this.points = points
        this.calculateCentroids()
    }

    setStartingCentroids(){
        let bound = computeBoundingBox(this.boundary)
        this.centroids = []
        for(let i = 0; i < this.k; i++){
            
            let point = null
            do{
                point = new Point(bound.left+(bound.right-bound.left)*Math.random(),bound.bottom+(bound.top-bound.bottom)*Math.random())

            }while(!pointInPolygon(point,this.boundary) || pointOnPolygon(point,this.boundary))

            this.centroids.push(point)
        }
    }

    getNewCentroids(){
        let oldCentroids = this.centroids
        this.centroids = []
        for(let i = 0; i < this.k; i++){
            if(this.clusters[i].length == 0){
                this.centroids.push(oldCentroids[i])
            }else{
                let meanX = 0
                let meanY = 0
                for(let j = 0; j < this.clusters[i].length; j++){
                    let point = this.points[this.clusters[i][j]]
                    meanX += point.x
                    meanY += point.y
                }
                meanX /= this.clusters[i].length
                meanY /= this.clusters[i].length
                this.centroids.push(new Point(meanX,meanY))
            } 
        }
    }

    calculateCentroids(){
        this.setStartingCentroids()
        
        let converged = false

        while(!converged){
            this.clusterMap = []
            this.clusters = []
            for(let i = 0; i < this.k; i++){
                this.clusters.push([])
            }

            for(let p = 0; p < this.points.length; p++){
                let point = this.points[p]
                let minDist = Infinity
                let minIndex = -1
                for(let i = 0; i < this.k; i++){
                    let centroid = this.centroids[i]
                    let distance = calculateHilbertDistance(this.boundary,point,centroid)
                    if(distance < minDist){
                        minDist = distance;
                        minIndex = i
                    }
                }
                if(minIndex >= 0){
                    this.clusters[minIndex].push(p)
                    this.clusterMap.push(minIndex)
                }
                
            }
            let oldCentroids = this.centroids
            this.getNewCentroids()
            
            converged = true
            for(let i = 0; i < this.k; i++){
                if(!isZero(euclideanDistance(this.centroids[i],oldCentroids[i]))){
                    converged = false
                    break;
                }
            }
        }
    }
}
import { Polygon, Point } from "../geometry/primitives.js";
import { centroid, computeBoundingBox, pointInPolygon, pointOnPolygon} from "../geometry/utils.js";
import { DrawableBall, DrawablePoint, DrawablePolygon } from "../drawing/drawable.js";
import { calculateHilbertPoint } from "../geometry/hilbert.js";
import { Ball, Ball_Types } from "../geometry/balls.js";

// Class for a 2d matrix
class Matrix {
    constructor(matrix) {
        this.matrix = matrix;
    }

    apply(point) {
        const x = this.matrix[0][0] * point.x + this.matrix[0][1] * point.y;
        const y = this.matrix[1][0] * point.x + this.matrix[1][1] * point.y;
        return new Point(x, y);
    }

    inv() {
        let A = this.matrix;
        const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
        return new Matrix([
            [A[1][1] / det, -A[0][1] / det],
            [-A[1][0] / det, A[0][0] / det]
        ]);
    } 

    // cholesky factorization: https://www.geeksforgeeks.org/cholesky-factorization/
    cholesky() {
        let A = this.matrix;
        const L = [[0, 0], [0, 0]];
        L[0][0] = Math.sqrt(A[0][0]);
        L[1][0] = A[1][0] / L[0][0];
        L[1][1] = Math.sqrt(A[1][1] - L[1][0] * L[1][0]);
        return new Matrix(L);
    }
}

// algorithms for ellipsoids: https://tcg.mae.cornell.edu/pubs/Pope_FDA_08.pdf
function computeJohnEllipsoid(points) {
    // Find the centroid of the polygon.
    let centroid_ = centroid(points);
    const cx = centroid_.x;
    const cy = centroid_.y;

    // Find the Covariance matrix
    let covarianceMatrix = new Matrix([
        [0, 0], // Sxx, Sxy
        [0, 0]  // Sxy, Syy
    ]);
    for (let point of points) {
        covarianceMatrix.matrix[0][0] += (point.x - cx) * (point.x - cx);
        covarianceMatrix.matrix[0][1] += (point.x - cx) * (point.y - cy);
        covarianceMatrix.matrix[1][0] += (point.y - cy) * (point.x - cx);
        covarianceMatrix.matrix[1][1] += (point.y - cy) * (point.y - cy);
    }

    covarianceMatrix.matrix[0][0] /= points.length;
    covarianceMatrix.matrix[0][1] /= points.length;   
    covarianceMatrix.matrix[1][0] /= points.length;
    covarianceMatrix.matrix[1][1] /= points.length;

    
    // Find the inverse covariance matrix
    let inverseCovarianceMatrix = covarianceMatrix.inv().matrix;

    // mahanobolis distance: https://math.stackexchange.com/questions/428064/distance-of-a-test-point-from-the-center-of-an-ellipsoid
    // find the Scaling factor - take the point furthest away from the centroid
    let scalingFactor = 0;
    for (let point of points) {
        // mahalanobis distance
        let x = point.x - cx;
        let y = point.y - cy;

        // [x,y]^T * S^-1 * [x,y] <- no square root (scaling wasn't enough)
        let dist = (x**2) * inverseCovarianceMatrix[0][0] + 2 * x * y * inverseCovarianceMatrix[0][1] + (y ** 2) * inverseCovarianceMatrix[1][1];

        if (dist > scalingFactor) {
            scalingFactor = dist;
        }
    }

    inverseCovarianceMatrix[0][0] /= scalingFactor;
    inverseCovarianceMatrix[0][1] /= scalingFactor; 
    inverseCovarianceMatrix[1][0] /= scalingFactor; 
    inverseCovarianceMatrix[1][1] /= scalingFactor; 

    return {
        center: new Point(cx, cy),
        matrix: new Matrix(inverseCovarianceMatrix)
    };
    
}

// credit: https://www.mathworks.com/matlabcentral/answers/566250-how-to-transform-a-ellipse-to-circle
function mapJohnToUnitCircle(point, ellipsoid) {
    // y = L(x-c) <-- change of variables
    const L = ellipsoid.matrix.cholesky();
    const diff = new Point(point.x - ellipsoid.center.x, point.y - ellipsoid.center.y);
    return L.apply(diff);
}

function mapUnitCircleToJohn(y, ellipsoid) {
    // x = L^{-1}y + c 
    const L = ellipsoid.matrix.cholesky();
    const mappedDifference = L.inv().apply(y);
    const a = mappedDifference.x + ellipsoid.center.x;
    const b = mappedDifference.y + ellipsoid.center.y;
    return new Point(a,b);
}

function projectPoint(point, velocity) {

    const px = point.x;
    const py = point.y;

    const dot = px * velocity.x + py * velocity.y;
    let denom = 1 + dot;

    if (Math.abs(denom) < 1e-5) {
        denom = (denom < 0) ? -1e-3 : 1e-3;
    }

    const factor = 1 / denom;
    const newX = px * factor;
    const newY = py * factor;

    return new Point(newX, newY);
}

function unNormalizePoint(pt, info) {
    const { cx, cy, scale } = info;
    return new Point(
        (pt.x / scale) + cx,
        (pt.y / scale) + cy
    );
}

export class Asteroid{
    constructor(point,radius = 1,color = "gray"){
        this.point = point
        this.radius = radius
        this.color = color
    }

    draw(ctx,boundary){
        let pointWithSpokes = calculateHilbertPoint(boundary,this.point);
        const ball = new Ball(pointWithSpokes,Ball_Types.HILBERT, boundary, this.radius);
        const d_ball = new DrawableBall(ball,this.color);

        console.log("DRAW STROID")
        d_ball.draw(ctx)
        let d_p = new DrawablePoint(this.point)
        d_p.color = "gray"
        d_p.draw(ctx)
    }

}

export class Ship{
    constructor(point){
        this.anchor = new Point(point.x,point.y)
        this.pos = point//new Point(0,0)
        this.angle = 0
        this.speed = 0
        this.maxSpeed = 0.2;
        this.vel = new Point(0,0)
        this.radius = 15;

        this.up = false
        this.down = false
        this.left = false
        this.right = false

        this.dtheta = 0.01 //change when turning 
        this.dpos = 0.01 //change when moving
    }

    update(){
        
        if(this.left){
            this.angle -= this.dtheta
        }
        if(this.right){
            this.angle += this.dtheta
        }
        if(this.up){
            this.speed += this.dpos
        }
        if(this.down){
            this.speed -= this.dpos
        }

        this.speed = Math.min(this.speed,this.maxSpeed)

        let angle = this.angle + Math.PI

        this.vel = new Point(Math.cos(angle)*this.speed,Math.sin(angle)*this.speed)
        this.pos.x += this.vel.x
        this.pos.y += this.vel.y
    }

    draw(ctx){
        let points = []

        let angle = this.angle

        points.push(new Point(this.anchor.x + Math.cos(angle)*this.radius,this.anchor.y + Math.sin(angle)*this.radius))

        angle = this.angle - 4*Math.PI/5
        points.push(new Point(this.anchor.x + Math.cos(angle)*this.radius,this.anchor.y + Math.sin(angle)*this.radius))

        angle = this.angle - Math.PI
        points.push(new Point(this.anchor.x + Math.cos(angle)*this.radius/3,this.anchor.y + Math.sin(angle)*this.radius/3))

        angle = this.angle + 4*Math.PI/5
        points.push(new Point(this.anchor.x + Math.cos(angle)*this.radius,this.anchor.y + Math.sin(angle)*this.radius))

        let shipPolygon = new DrawablePolygon(new Polygon([]))
        shipPolygon.color = "white"
        shipPolygon.polygon.points = points // manually set it

        shipPolygon.drawFill(ctx)

    }

}

export class Space {
    constructor(polygon){
        this.boundary = new DrawablePolygon(polygon,"black")
        this.asteroids = []
        this.showAsteroids = true

        this.ship = new Ship(centroid(this.boundary.polygon.points))

        this._listenersAttached = false;

        this._normOriginalPolygonVertices = [];
        this._normInfo = null;

        this._origJohn = null;

        let bound = computeBoundingBox(this.boundary.polygon)
        
        for(let i = 0; i < 4; i++){
            let point = null
            do{
                point = new Point(bound.left+(bound.right-bound.left)*Math.random(),bound.bottom+(bound.top-bound.bottom)*Math.random())
            }while(!pointInPolygon(point,this.boundary.polygon) || pointOnPolygon(point,this.boundary.polygon))

            this.asteroids.push(new Asteroid(point,0.5,"gray"))
        }
    }
    storeOriginalGeometry() {
        const vertices = this.boundary.polygon.points;

        let { x: cx, y: cy } = centroid(vertices);

        let xMin = Infinity, xMax = -Infinity;
        let yMin = Infinity, yMax = -Infinity;

        vertices.forEach(v => {
            if (v.x < xMin) xMin = v.x;
            if (v.x > xMax) xMax = v.x;
            if (v.y < yMin) yMin = v.y;
            if (v.y > yMax) yMax = v.y;
        });

        const width = xMax - xMin;
        const height = yMax - yMin;
        const scale = 2 / Math.max(width, height);

        this._normInfo = { cx,cy, scale };

        this._normOriginalPolygonVertices = vertices.map(v => {
            return {
                x: (v.x - cx) * scale,
                y: (v.y - cy) * scale
            };
        });

        this._normOriginalAsteroids = this.asteroids.map(asteroid => {
            return {
                x: (asteroid.point.x - cx) * scale,
                y: (asteroid.point.y - cy) * scale
            };
        });
    }
    storeOriginalOriginalGeometry() {
        this._origJohn = computeJohnEllipsoid(this.boundary.polygon.points);
    }

    manageInput(event){
        let keyDown = event.type === "keydown"
        let ship = this.ship
        switch(event.key){
            case "ArrowUp":
                ship.up = keyDown
            break;
            case "ArrowDown":
                ship.down = keyDown
            break;
            case "ArrowLeft":
                ship.left = keyDown
            break;
            case "ArrowRight":
                ship.right = keyDown
            break;
        }
    }
    projectPoints(v) {

        if (!this._normInfo || !this._origJohn) return;

        const velocityFactor = 0.001;
        const scaledV = { x: v.x * velocityFactor, y: v.y * velocityFactor };

        const projectedVertices = this._normOriginalPolygonVertices.map(vertex => { return projectPoint(vertex, scaledV); });

        const unNormalizedVertices = projectedVertices.map(vtx => { return unNormalizePoint(vtx, this._normInfo);});

        const newAsteroidPositions = this._normOriginalAsteroids.map(siteNorm => projectPoint(siteNorm, scaledV))

        const newJohnEllipsoid = computeJohnEllipsoid(unNormalizedVertices);
        const finalVertices = unNormalizedVertices.map(vertex => {
            const y = mapJohnToUnitCircle(vertex, newJohnEllipsoid);
            const newMappedPt = mapUnitCircleToJohn(y, this._origJohn); // original shape, original john ellipsoid
            return newMappedPt;
        });

        const newPolygon = new DrawablePolygon(
            new Polygon(finalVertices),
            "black",
        );
        this.boundary = newPolygon;

        if (this.showAsteroids) {
            for (let i = 0; i < this.asteroids.length; i++) {
                const asteroid = this.asteroids[i];
                const y = mapJohnToUnitCircle(newAsteroidPositions[i], newJohnEllipsoid);
                const mappedPt = mapUnitCircleToJohn(y, this._origJohn);


                asteroid.point = mappedPt;

    
                // DRAW ELSEWHERE
                /**
                if (pointInPolygon(a.x, a.y, newPolygon)) {
                    a.convexPolygon = this.boundary;
                    a.computeSpokes?.();
                    a.computeHilbertBall?.();
                    a.computeMultiBall?.();
                }
                */
            }
        }
    }

    runSpace(canvas){
        this.updateSpace()
        this.drawSpace(canvas)

        if(canvas.mode === "space"){
            setInterval(() => {this.runSpace(canvas)},1000/10)
        }
    }

    updateSpace(){

        //this.storeOriginalGeometry()
        this.ship.update()

        this.projectPoints(this.ship.pos)
    }

    drawSpace(canvas){
        let ctx = canvas.ctx


        let background = new DrawablePolygon(canvas.absolute_border.polygon,"white")

        background.drawFill(canvas.ctx)


        this.boundary.draw(ctx)
        this.boundary.drawFill(ctx)

        if (this.showAsteroids) {
            for (let i = 0; i < this.asteroids.length; i++) {
                const asteroid = this.asteroids[i];
                let a = asteroid.point
                console.log("ASTER",a,this.boundary.polygon,asteroid,pointInPolygon(a, this.boundary.polygon))
                //if (pointInPolygon(a, this.boundary.polygon)) {
                    asteroid.draw(ctx,this.boundary.polygon)  
                //}
            }
        }

        this.ship.draw(ctx)
    }
}
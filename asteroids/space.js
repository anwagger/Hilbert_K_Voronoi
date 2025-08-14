import { Polygon, Point } from "../geometry/primitives.js";
import { calculateHilbertDistance, centroid, cleanArray, computeBoundingBox, euclideanDistance, hilbertMetric, moveInHilbert, pointInPolygon, pointOnPolygon} from "../geometry/utils.js";
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
    constructor(point,radius = 0.1,color = "gray"){
        this.point = point
        this.projected_point = point
        this.radius = radius +  radius*(Math.random() - 0.5)
        this.color = color

        this.angle = Math.random()*2*Math.PI
        this.speed = 1/100 + Math.random()/100
    }

    update(space){

        let boundary = space.original_boundary.polygon

        let ship_pos = space.ship.pos

        let distance = calculateHilbertDistance(boundary,this.point,ship_pos)

        if(distance >= 4 && this.point || pointOnPolygon(this.point,boundary)){
            let angle_to_player = (Math.atan2(this.point.y - ship_pos.y,this.point.x - ship_pos.x) + 2*Math.PI) % (2*Math.PI)
            this.angle = (angle_to_player + Math.random()*Math.PI/2)  % (2*Math.PI)
            this.speed = 1/100 + Math.random()/100
            let new_pos = null
            do{
                new_pos = moveInHilbert(boundary,ship_pos,3,Math.random()*2*Math.PI)
            }while(!new_pos)

            this.point = new_pos
        }

        let new_position = moveInHilbert(boundary,this.point,this.speed,this.angle)
        if(new_position){
            this.point = new_position
        }
    }

    draw(ctx,space){
        if(space.useProjection){
            let boundary = space.boundary.polygon
            let pointWithSpokes = calculateHilbertPoint(boundary,this.projected_point);
            const ball = new Ball(pointWithSpokes,Ball_Types.HILBERT, boundary, this.radius);
            const d_ball = new DrawableBall(ball,this.color);
            d_ball.polygon.drawFill(ctx)
        }else{
            let boundary = space.original_boundary.polygon
            let pointWithSpokes = calculateHilbertPoint(boundary,this.point);
            const ball = new Ball(pointWithSpokes,Ball_Types.HILBERT, boundary, this.radius);
            const d_ball = new DrawableBall(ball,this.color);
            d_ball.polygon.drawFill(ctx)
        }
    }

    split() {
        if (this.radius < 0.1) {
            return false;
        }

        let newAstr = new Asteroid(this.point, this.radius * 0.7);
        newAstr.angle = (this.angle + Math.PI/2) % (2*Math.PI);
        this.radius = this.radius * 0.7;
        this.angle =  (this.angle - Math.PI/2) % (2*Math.PI);
        return newAstr;
    }

    laserHitsAsteroid(lasers, boundary) {
        for (let l = 0; l < lasers.length; l ++) {
            
            if (((this.radius + lasers[l].radius) - calculateHilbertDistance(boundary, this.point, lasers[l].point)) > 1e-4) {
                lasers[l] = null;
                return true;
            }  
        }

        return false;
    }

}

export class Laser{
    constructor(point,angle,radius = 0.01,color = "cyan"){
        this.point = point
        this.projected_point = point
        this.radius = radius
        this.color = color 

        this.angle = angle;
        this.speed = 0.1;
        this.time = 0;
    }

     update(space){
        let angle = (this.angle + Math.PI) % (2*Math.PI)
        let boundary = space.original_boundary.polygon

        let new_position = moveInHilbert(boundary,this.point,this.speed,angle)
        if(new_position){
            this.point = new_position
        }

        this.time += 1000/60; // current fps
    }
    
    draw(ctx, space) {

        if(space.useProjection){
            let boundary = space.boundary.polygon
            let pointWithSpokes = calculateHilbertPoint(boundary,this.projected_point);
            const ball = new Ball(pointWithSpokes,Ball_Types.HILBERT, boundary, this.radius);
            const d_ball = new DrawableBall(ball,this.color);
            d_ball.polygon.drawFill(ctx);
        }else{
            let boundary = space.original_boundary.polygon
            let pointWithSpokes = calculateHilbertPoint(boundary,this.point);
            const ball = new Ball(pointWithSpokes,Ball_Types.HILBERT, boundary, this.radius);
            const d_ball = new DrawableBall(ball,this.color);
            d_ball.polygon.drawFill(ctx);
        }
        
    }
}

export class Ship{
    constructor(point){
        this.anchor = new Point(point.x,point.y);
        this.pos = new Point(point.x,point.y);
        this.angle = 0;
        this.speed = 0;
        this.maxSpeed = 0.05;
        this.vel = new Point(0,0)
        this.radius = 15;
        this.lasers = [];
        this.firing_ratelimit = 50;
        this.laser_cooldown = 100;

        this.up = false
        this.down = false
        this.left = false
        this.right = false

        this.dtheta = 0.1 //change when turning 
        this.dpos = 0.001 //change when moving

        this.score = 0
    }

    shipHitsAsteroid(asteroids, boundary) {
        let pointWithSpokes = calculateHilbertPoint(boundary,this.pos);
        const ball = new Ball(pointWithSpokes,Ball_Types.HILBERT, boundary, 0.01);  
        for (let a of asteroids) {
            if ((ball.radius + a.radius) - calculateHilbertDistance(boundary, this.pos, a.point) > 1e-4) {
                return true;
            }
        }

        return false;

    }

    update(space){
        
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

        if(this.fire){
            if ((this.laser_cooldown >= 10) && (this.firing_ratelimit < 0)) {
                this.lasers.push(new Laser(this.pos,this.angle));
                this.laser_cooldown -= 10;
                this.firing_ratelimit = 50;
            }
        }

        this.speed = Math.min(this.speed,this.maxSpeed)
        if(this.speed < 0){
            this.speed = 0
        }

        if(this.angle < 0){
            this.angle += 2*Math.PI
        }
        if(this.angle > 2*Math.PI){
            this.angle -= 2*Math.PI
        }
        let boundary = space.original_boundary.polygon
        let angle = (this.angle + Math.PI) % (2*Math.PI)
        
        let new_position = moveInHilbert(boundary,this.pos,this.speed,angle)
        if(new_position){
            this.pos = new_position
        }

        this.lasers.forEach((l,i) => {
            l.update(space);

            // if a laser has existed for more then 2 secs
            if (l.time > 2000) {
                this.lasers[i] = null;
            }
        })

        this.laser_cooldown += .5;
        this.laser_cooldown = Math.min(100,this.laser_cooldown)

        this.firing_ratelimit -= 10;

        this.lasers = cleanArray(this.lasers);

    }

    draw(ctx, space){
        let points = []

        let angle = this.angle
        
        let position = this.pos
        if(space.useProjection){
            position = this.anchor
        }
        
        points.push(new Point(position.x + Math.cos(angle)*this.radius,position.y + Math.sin(angle)*this.radius))

        angle = this.angle - 4*Math.PI/5
        points.push(new Point(position.x + Math.cos(angle)*this.radius,position.y + Math.sin(angle)*this.radius))

        angle = this.angle - Math.PI
        points.push(new Point(position.x + Math.cos(angle)*this.radius/3,position.y + Math.sin(angle)*this.radius/3))

        angle = this.angle + 4*Math.PI/5
        points.push(new Point(position.x + Math.cos(angle)*this.radius,position.y + Math.sin(angle)*this.radius))

        let shipPolygon = new DrawablePolygon(new Polygon([]))
        shipPolygon.color = "white"
        shipPolygon.polygon.points = points // manually set it

        shipPolygon.drawFill(ctx)

        this.lasers.forEach((l) => {
            l.draw(ctx,space);
        });

        document.getElementById('score').textContent = "Score: " + this.score
        document.getElementById('energy').style.width = this.laser_cooldown+"%"

    }

}

export class Space {
    constructor(polygon,useProjection = false){
        this.boundary = new DrawablePolygon(polygon,"black")
        this.original_boundary = new DrawablePolygon(polygon,"black")
        this.asteroids = []
        this.showAsteroids = true
        this.invulnerable = false

        this.ship = new Ship(centroid(this.original_boundary.polygon.points))

        this._listenersAttached = false;

        this._normOriginalPolygonVertices = [];
        this._normInfo = null;

        this._origJohn = null;

        this.useProjection = useProjection
        
        this.gameover = false

        let ship_pos = this.ship.pos


        for(let i = 0; i < 10; i++){
            let point = null
            do{
                point = moveInHilbert(this.original_boundary.polygon,ship_pos,3,Math.random()*2*Math.PI)
            }while(!point)
            this.asteroids.push(new Asteroid(point,0.3,"gray"))
            
        }
        this.storeOriginalOriginalGeometry()
        this.storeOriginalGeometry()
    }

    reset() {
        this.boundary = new DrawablePolygon(this.original_boundary.polygon,"black")
        this.original_boundary = new DrawablePolygon(this.original_boundary.polygon,"black")
        
        this.asteroids = []
        //this.showAsteroids = true

        this.ship = new Ship(centroid(this.original_boundary.polygon.points))

        this._listenersAttached = false;

        this._normOriginalPolygonVertices = [];
        this._normInfo = null;

        this._origJohn = null;

        this.gameover = false
        
        let ship_pos = this.ship.pos

        for(let i = 0; i < 10; i++){
            let point = null
            do{
                point = moveInHilbert(this.original_boundary.polygon,ship_pos,3,Math.random()*2*Math.PI)
            }while(!point)
            this.asteroids.push(new Asteroid(point,0.3,"gray"))
            
        }
        this.storeOriginalOriginalGeometry()
        this.storeOriginalGeometry()
    }
    storeOriginalGeometry() {
        const vertices = this.original_boundary.polygon.points;

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

        
    }
    storeOriginalOriginalGeometry() {
        this._origJohn = computeJohnEllipsoid(this.original_boundary.polygon.points);
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
            case " ":
                ship.fire = keyDown;
            break;
        }
    }
    projectPoints(v) {

        if (!this._normInfo || !this._origJohn) return;

        const velocityFactor = 0.008;
        const scaledV = { x: v.x * velocityFactor, y: v.y * velocityFactor };

        const projectedVertices = this._normOriginalPolygonVertices.map(vertex => { return projectPoint(vertex, scaledV); });

        const unNormalizedVertices = projectedVertices.map(vtx => { return unNormalizePoint(vtx, this._normInfo);});


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

        this._normOriginalAsteroids = this.asteroids.map(asteroid => {
            return {
                x: (asteroid.point.x - this.ship.anchor.x) * this._normInfo.scale,
                y: (asteroid.point.y - this.ship.anchor.y) * this._normInfo.scale
            };
        });

        console.log("ASTEROIDS",scaledV)

        const newAsteroidPositions = this._normOriginalAsteroids.map((asteroid) => projectPoint(asteroid, scaledV))

        if (this.showAsteroids) {
            for (let i = 0; i < this.asteroids.length; i++) {
                const asteroid = this.asteroids[i];
                const y = mapJohnToUnitCircle(newAsteroidPositions[i], newJohnEllipsoid);
                const mappedPt = mapUnitCircleToJohn(y, this._origJohn);
                asteroid.projected_point = mappedPt;
                console.log("ASTEROID",i,this.asteroids[i].point,this._normOriginalAsteroids[i],newAsteroidPositions[i],mappedPt)

            }
        }

        const newLaserPositions = this.ship.lasers.map((laser) => projectPoint(laser.point, scaledV))

        for (let i = 0; i < this.ship.lasers.length; i++) {
            const laser = this.ship.lasers[i];
            const y = mapJohnToUnitCircle(newLaserPositions[i], newJohnEllipsoid);
            const mappedPt = mapUnitCircleToJohn(y, this._origJohn);
            laser.projected_point = mappedPt;
        }
    }

    runSpace(canvas){
        if (!this.gameover){
            this.updateSpace()
        }
        this.drawSpace(canvas)

        if(canvas.mode === "space"){
            setTimeout(() => {this.runSpace(canvas)},1000/60)
        }
    }

    updateSpace(){

        this.ship.update(this)

       
        if(this.showAsteroids){
            if ((!this.invulnerable) && this.ship.shipHitsAsteroid(this.asteroids, this.original_boundary.polygon)) {
                this.gameover = true
                //this.reset();
                return true;
            }

            for(let i = 0; i < this.asteroids.length; i++){
                this.asteroids[i].update(this)
            }

            // check if a laser interacts with an asteroid

            this.asteroids.forEach((a,i) => {
                if(a.laserHitsAsteroid(this.ship.lasers, this.original_boundary.polygon)) {
                    this.ship.lasers = cleanArray(this.ship.lasers);
                    this.ship.score += 100
                    let res = a.split();
                    if (res) {
                        this.asteroids.push(res);
                    } else { // happens when split returns false, indicating that the asteroids radius is too small
                        this.asteroids[i] = null;
                    }
                }
                
            });

            this.asteroids = cleanArray(this.asteroids);
        }


        if(this.useProjection){
            this.projectPoints(new Point(this.ship.pos.x-this.ship.anchor.x,this.ship.pos.y-this.ship.anchor.y))
        }
    }

    drawSpace(canvas){

        let ctx = canvas.ctx


        let background = new DrawablePolygon(canvas.absolute_border.polygon,"white")

        background.drawFill(canvas.ctx)

        let boundary = this.original_boundary
        
        if(this.useProjection){
            boundary = this.boundary
        }


        //this.boundary.draw(ctx)
        boundary.drawFill(ctx)

        if (this.showAsteroids) {
            for (let i = 0; i < this.asteroids.length; i++) {
                const asteroid = this.asteroids[i];
                let a = asteroid.point
                let polygon = this.original_boundary.polygon
                if (pointInPolygon(a, polygon)) {
                    asteroid.draw(ctx,this)  
                }
            }
        }

        this.ship.draw(ctx,this)
    }
}
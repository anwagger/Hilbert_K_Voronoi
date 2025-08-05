import { Bound } from "./primitives.js";
import { boundArea, computeBoundingBox, computeClosestBound, inBound, intersectBounds,intersectBoundsNoEquals, isZero, pointInPolygon } from "./utils.js";
import { calculateVoronoiCellBounds, VoronoiCell } from "./voronoi.js";

const Partition_Node_Type = {
    X: 0,
    Y: 1,
    CELL: 2,
};

export class PartitionTreeNode {
    constructor(type, data){
        // this shouldnt be in initial constructor imo, we should make a recursive function that builds the subtrees.
        // though if data is the already built subtrees that also works, mainly just confused what data passed in would be rn
        switch (type) {
            case Partition_Node_Type.X:
                this.x = data.x;
                this.left = null;
                this.right = null;
                this.type = Partition_Node_Type.X;
            break;
            case Partition_Node_Type.Y:
                this.y = data.y;
                this.above = null;
                this.below = null;
                this.type = Partition_Node_Type.Y;
            break;
            case Partition_Node_Type.CELL:
                this.outside = data.outside;
                this.type = Partition_Node_Type.CELL;
            break;
        }
    }
    
}

export class PartitionTree {
    constructor(voronoi,polygon) {
        let bound = computeBoundingBox(polygon);
        let voronoi_bounds = new Map(); // map will store indices as keys and corresponding bounds as values
        
        // gets all of the voronoi bounds and puts them into a hashmap corresponding to their index
        for (let i = 0; i < voronoi.cells.length; i++) {
            let c = voronoi.cells[i]
            // each cell made of bisector segments
            // each bisector segment has a bisector, start, end and bound
            voronoi_bounds.set(i, c.bound);
        }
        this.root = this.createTree(Partition_Node_Type.X,voronoi_bounds,bound)
    }

    // right now im writing it in a non random order, so i dont know how balanced the tree will be
    // i dont think we can really use the randomized method that regular trapmaps use anyway, since we want the bounding box to shrink

    createTree(type,voronoi_bounds,bound) {

        //console.log("BOUND",type,voronoi_bounds,bound)

        // get how many cells the left and right bounds intersect with
        let keys = voronoi_bounds.keys();
        let voronoi_bounds_1 = new Map();
        let voronoi_bounds_2 = new Map();
        let bound_1 = null
        let bound_2 = null
        let bound_arr = Array.from(voronoi_bounds.values());
        bound_arr.push(bound);

        let node = null

        if (type === Partition_Node_Type.X) {
            // see what bisector has the most median x in the current bound
            let middle_x = Math.floor((bound.left + bound.right) / 2);
            let x = computeClosestBound(bound_arr, middle_x);

            node = new PartitionTreeNode(Partition_Node_Type.X, {x: x});

            // splits bounding box up into a left and right
            bound_1 = new Bound(bound.top,bound.bottom,bound.left, x);
            bound_2 = new Bound(bound.top,bound.bottom,x, bound.right);

            for (let k of keys) {
                let b = voronoi_bounds.get(k);
                if (intersectBoundsNoEquals(voronoi_bounds.get(k),bound_1)) {
                    voronoi_bounds_1.set(k,b);
                }
                
                if (intersectBoundsNoEquals(voronoi_bounds.get(k), bound_2)) {
                    voronoi_bounds_2.set(k,b);
                }
            }

            // nearly identical to the x case, just shrinks the bound vertically instead of horizontally
        } else if (type === Partition_Node_Type.Y) {
            let middle_y = Math.floor((bound.top + bound.bottom) / 2);
            let y = computeClosestBound(bound_arr, middle_y, true);


            node = new PartitionTreeNode(Partition_Node_Type.Y, {y: y});
            bound_1 = new Bound(y, bound.bottom, bound.left, bound.right);
            bound_2 = new Bound(bound.top, y, bound.left, bound.right);
           
            // get how many cells the left and right bounds intersect with

            for (let k of keys) {
                let b = voronoi_bounds.get(k);
                if (intersectBoundsNoEquals(voronoi_bounds.get(k),bound_1)) {
                    voronoi_bounds_1.set(k,b);
                }
                
                if (intersectBoundsNoEquals(voronoi_bounds.get(k), bound_2)) {
                    voronoi_bounds_2.set(k,b);
                }
            }
        // cell case
        } else {
            let k = [...voronoi_bounds.keys()]; // turns cell indexes into an array
            let data = {outside: k};
            return new PartitionTreeNode(Partition_Node_Type.CELL,data);
        }

        let bound_area = boundArea(bound)
        let bound_area_1 = boundArea(bound_1)
        let bound_area_2 = boundArea(bound_2)
        let sub_nodes = [
            type === Partition_Node_Type.X?"left":"below",
            type === Partition_Node_Type.X?"right":"above",
        ]

        let next_type = type === Partition_Node_Type.X?Partition_Node_Type.Y:Partition_Node_Type.X

        // we now know there are only 3 or less cells a point can be in if its left to the median
        if (voronoi_bounds_1.size <= 1 || isZero(bound_area_1) || isZero(bound_area-bound_area_1)) {

            node[sub_nodes[0]] = this.createTree(Partition_Node_Type.CELL, voronoi_bounds_1, bound_1);
        } else {
            node[sub_nodes[0]] = this.createTree(next_type, voronoi_bounds_1, bound_1);
        }

        // same with right
        if (voronoi_bounds_2.size <= 1 || isZero(bound_area_2) || isZero(bound_area-bound_area_2)) {
            node[sub_nodes[1]] = this.createTree(Partition_Node_Type.CELL, voronoi_bounds_2, bound_2);
        } else {
            node[sub_nodes[1]] = this.createTree(next_type, voronoi_bounds_2, bound_2);
        }
        return node;
    }

    findCurrentCell(voronoi,sites,point) {
        let boundary = voronoi.boundary
        let x = point.x;
        let y = point.y;
        let bound = computeBoundingBox(boundary);
        let curr = this.root; // assuming we have a proper root

        // if point isnt in voronoi
        if (!inBound(point,bound) || !pointInPolygon(point,boundary)) {
            return -1;
        }
        while (curr.type !== Partition_Node_Type.CELL) {
            if (curr.type === Partition_Node_Type.X) {
                if (x < curr.x) {
                    curr = curr.left;
                } else {
                    curr = curr.right;
                }
            } else if (curr.type === Partition_Node_Type.Y) {
                if (y < curr.y) {
                    curr = curr.below;
                } else {
                    curr = curr.above;
                }
            }
        }

        // at this point we have that curr is a cell, 
        // we just need to do smth with the point to check if its actually in that cell
        // if point isn't in curr.index do we just loop through curr.outsides (assuming they also point to another cell)
        // until we find one?

        // effectively pseudocode because we dont have an exact .contains function
        // if this is also just checking the bounding box of that cell then


        for (let i = 0; i < curr.outside.length; i++) {
            let index = curr.outside[i]
            if (voronoi.cells[index].contains(boundary,sites,point)) {
                return index;
            }
        }   
        return -1
    }
}


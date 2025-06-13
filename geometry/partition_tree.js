import { useInsertionEffect } from "react";
import { Bound } from "./primitives";
import { computeBoundingBox, computeClosestBound, intersectBounds } from "./utils";
import { calculateVoronoiCellBounds, VoronoiCell } from "./voronoi";

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
                this.index = data.index;
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
            voronoi_bounds.set(i, c.calculateVoronoiCellBounds);
        }

        // we use this to find which bound has the closest 
        let middle_x = Math.floor((bound.right + bound.left) / 2);4
        let x = computeClosestBound(voronoi_bounds, middle_x);

        this.root = new PartitionTreeNode(Partition_Node_Type.X, {x: x});
        let left_bound = new Bound(bound.left,x,bound.top,bound.bottom);
        let right_bound = new Bound(x,bound.right,bound.top,bound.bottom);

        let keys = voronoi_bounds.keys();
        let left_voronoi_bounds = new Map();
        let right_voronoi_bounds = new Map();

        for (k in keys) {
            let b = voronoi_bounds.get(k);
            if (intersectBounds(voronoi_bounds.get(k),left_bound)) {
                left_voronoi_bounds.set(k,b);
            }

            if (intersectBounds(voronoi_bounds.get(k), right_bound)) {
                right_voronoi_bounds.set(k,b);
            }
        }


        this.root.left = this.createTree(Partition_Node_Type.X, left_voronoi_bounds, left_bound);
        this.root.right = this.createTree(Partition_Node_Type.X, right_voronoi_bounds, right_bound);
    }

    // right now im writing it in a non random order, so i dont know how balanced the tree will be
    // i dont think we can really use the randomized method that regular trapmaps use anyway, since we want the bounding box to shrink

    createTree(type,voronoi_bounds,bound) {
        if (type === Partition_Node_Type.X) {
            // see what bisector has the most median x in the current bound
            let middle_x = Math.floor((bound.left + bound.right) / 2);
            let x = computeClosestBound(voronoi_bounds, middle_x);

            let node = new PartitionTreeNode(Partition_Node_Type.X, {x: x});

            // splits bounding box up into a left and right
            let left_bound = new Bound(bound.left,x,bound.top,bound.bottom);
            let right_bound = new Bound(x,bound.right,bound.top,bound.bottom);
           
            // get how many cells the left and right bounds intersect with
            let keys = voronoi_bounds.keys();
            let left_voronoi_bounds = new Map();
            let right_voronoi_bounds = new Map();

            for (k in keys) {
                let b = voronoi_bounds.get(k);
                if (intersectBounds(voronoi_bounds.get(k),left_bound)) {
                    left_voronoi_bounds.set(k,b);
                }
                
                if (intersectBounds(voronoi_bounds.get(k), right_bound)) {
                    right_voronoi_bounds.set(k,b);
                }
            }

            // we now know there are only 3 or less cells a point can be in if its left to the median
            if (left_voronoi_bounds.size() <= 3) {
                node.left = this.createTree(Partition_Node_Type.CELL, left_voronoi_bounds, left_bound);
            } else {
                node.left = this.createTree(Partition_Node_Type.Y, left_voronoi_bounds, left_bound);
            }

            // same with right
            if (right_voronoi_bounds.size() <= 3) {
                node.left = this.createTree(Partition_Node_Type.CELL, right_voronoi_bounds, right_bound);
            } else {
                node.left = this.createTree(Partition_Node_Type.Y, right_voronoi_bounds, right_bound);
            }

            // nearly identical to the x case, just shrinks the bound vertically instead of horizontally
        } else if (type === Partition_Node_Type.Y) {
            let middle_y = Math.floor((bound.top + bound.bottom) / 2);
            let y = computeClosestBound(voronoi_bounds, middle_y);

            let node = new PartitionTreeNode(Partition_Node_Type.Y, {y: y});
            let top_bound = new Bound(bound.left,bound.right,y,bound.bottom);
            let bottom_bound = new Bound(bound.left,bound.right,bound.top,y);
           
            // get how many cells the left and right bounds intersect with
            let keys = voronoi_bounds.keys();
            let top_voronoi_bounds = new Map();
            let bottom_voronoi_bounds = new Map();

            for (k in keys) {
                let b = voronoi_bounds.get(k);
                if (intersectBounds(voronoi_bounds.get(k),top_bound)) {
                    top_voronoi_bounds.set(k,b);
                }
                
                if (intersectBounds(voronoi_bounds.get(k), bottom_bound)) {
                    bottom_voronoi_bounds.set(k,b);
                }
            }

            // we now know there are only 3 cells a point can be in if its above our current median
            if (top_voronoi_bounds.size() <= 3) {
                node.above = this.createTree(Partition_Node_Type.CELL, top_voronoi_bounds, top_bound);
            } else {
                node.above = this.createTree(Partition_Node_Type.X, top_voronoi_bounds, top_bound);
            }

            // same with right
            if (bottom_voronoi_bounds.size() <= 3) {
                node.below = this.createTree(Partition_Node_Type.CELL, bottom_voronoi_bounds, bottom_bound);
            } else {
                node.below = this.createTree(Partition_Node_Type.X, bottom_voronoi_bounds, bottom_bound);
            }
        // cell case
        } else {
            let k = [...voronoi_bounds.keys]; // turns cell indexes into an array
            let outside = k.length > 1 ? k.slice(1) : null;
            let data = {index: k[0], outside: outside};
            return new PartitionTreeNode(Partition_Node_Type.CELL,data);
        }
    }

    findCurrentCell(point) {
        let x = point.x;
        let y = point.y;
        let bound = computeBoundingBox(polygon);
        let curr = this.root; // assuming we have a proper root

        // if point isnt in voronoi
        if (x > bound.right || x < bound.left || y > bound.top || y < bound.bottom) {
            return null;
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

        for (i in curr.outside) {
            if (voronoi.cells[i].calculateVoronoiCellBounds.contains(point)) {
                return i;
            }
        }

        // for the case where curr.outside is null, meaning the only possible cell we can be in is the current
        return curr.index;
    }
}


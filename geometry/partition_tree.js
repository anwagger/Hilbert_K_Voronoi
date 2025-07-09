import { Bound } from "./primitives.js";
import { computeBoundingBox, computeClosestBound, intersectBounds } from "./utils.js";
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
            let c = voronoi.cells[i]
            // each cell made of bisector segments
            // each bisector segment has a bisector, start, end and bound
            voronoi_bounds.set(i, c.bound);
        }

        // was trying to do smth with each bisectors bound instead of just getting the median

        let middle_x = Math.floor((bound.right + bound.left) / 2);


        // using the approach of median the tree gets stuck in infinite recursion, im going to likely have to 
        // do something that uses the bisectors bounds tbhtbh
        let x = computeClosestBound(voronoi_bounds.values(),middle_x);

        this.root = new PartitionTreeNode(Partition_Node_Type.X, {x: x});

        let left_bound = new Bound(bound.top,bound.bottom,bound.left, x);
        let right_bound = new Bound(bound.top,bound.bottom,x, bound.right);

        let keys = voronoi_bounds.keys();
        let left_voronoi_bounds = new Map();
        let right_voronoi_bounds = new Map();

        for (let k of keys) {
            let b = voronoi_bounds.get(k);
            if (intersectBounds(voronoi_bounds.get(k),left_bound)) {
                left_voronoi_bounds.set(k,b);
            }

            if (intersectBounds(voronoi_bounds.get(k), right_bound)) {
                right_voronoi_bounds.set(k,b);
            }
        }


        if (left_voronoi_bounds.size <= 3) {
            this.root.left = this.createTree(Partition_Node_Type.CELL, left_voronoi_bounds, left_bound);
        } else {
            this.root.left = this.createTree(Partition_Node_Type.Y, left_voronoi_bounds, left_bound);
        }

        if (right_voronoi_bounds.size <= 3) {
            this.root.right = this.createTree(Partition_Node_Type.CELL, right_voronoi_bounds, right_bound);
        } else {
            this.root.right = this.createTree(Partition_Node_Type.Y, right_voronoi_bounds, right_bound);
        }
    }

    // right now im writing it in a non random order, so i dont know how balanced the tree will be
    // i dont think we can really use the randomized method that regular trapmaps use anyway, since we want the bounding box to shrink

    createTree(type,voronoi_bounds,bound) {
        if (type === Partition_Node_Type.X) {
            // see what bisector has the most median x in the current bound
            let middle_x = Math.floor((bound.left + bound.right) / 2);
            let bound_arr = Array.from(voronoi_bounds.values());
            bound_arr.push(bound);
            let x = computeClosestBound(bound_arr, middle_x);


            let node = new PartitionTreeNode(Partition_Node_Type.X, {x: x});

            // splits bounding box up into a left and right
            let left_bound = new Bound(bound.top,bound.bottom,bound.left, x);
            let right_bound = new Bound(bound.top,bound.bottom,x, bound.right);
           
            // get how many cells the left and right bounds intersect with
            let keys = voronoi_bounds.keys();
            let left_voronoi_bounds = new Map();
            let right_voronoi_bounds = new Map();

            for (let k of keys) {
                let b = voronoi_bounds.get(k);
                if (intersectBounds(voronoi_bounds.get(k),left_bound)) {
                    left_voronoi_bounds.set(k,b);
                }
                
                if (intersectBounds(voronoi_bounds.get(k), right_bound)) {
                    right_voronoi_bounds.set(k,b);
                }
            }

            // we now know there are only 3 or less cells a point can be in if its left to the median
            if (left_voronoi_bounds.size <= 3 || x === bound.left || x === bound.right) {
                node.left = this.createTree(Partition_Node_Type.CELL, left_voronoi_bounds, left_bound);
            } else {
                node.left = this.createTree(Partition_Node_Type.Y, left_voronoi_bounds, left_bound);
            }

            // same with right
            if (right_voronoi_bounds.size <= 3 || x === bound.left || x === bound.right) {
                node.right = this.createTree(Partition_Node_Type.CELL, right_voronoi_bounds, right_bound);
            } else {
                node.right = this.createTree(Partition_Node_Type.Y, right_voronoi_bounds, right_bound);
            }
            return node;

            // nearly identical to the x case, just shrinks the bound vertically instead of horizontally
        } else if (type === Partition_Node_Type.Y) {
            let middle_y = Math.floor((bound.top + bound.bottom) / 2);
            let bound_arr = Array.from(voronoi_bounds.values());
            bound_arr.push(bound);
            let y = computeClosestBound(bound_arr, middle_y, true);


            let node = new PartitionTreeNode(Partition_Node_Type.Y, {y: y});
            let top_bound = new Bound(y, bound.bottom, bound.left, bound.right);
            let bottom_bound = new Bound(bound.top, y, bound.left, bound.right);
           
            // get how many cells the left and right bounds intersect with
            let keys = voronoi_bounds.keys();
            let top_voronoi_bounds = new Map();
            let bottom_voronoi_bounds = new Map();

            for (let k of keys) {
                let b = voronoi_bounds.get(k);
                if (intersectBounds(voronoi_bounds.get(k),top_bound)) {
                    top_voronoi_bounds.set(k,b);
                }
                
                if (intersectBounds(voronoi_bounds.get(k), bottom_bound)) {
                    bottom_voronoi_bounds.set(k,b);
                }
            }

            // we now know there are only 3 cells a point can be in if its above our current median
            if (top_voronoi_bounds.size <= 3 || y === bound.bottom || y === bound.top) {
                node.above = this.createTree(Partition_Node_Type.CELL, top_voronoi_bounds, top_bound);
            } else {
                node.above = this.createTree(Partition_Node_Type.X, top_voronoi_bounds, top_bound);
            }

            // same with right
            if (bottom_voronoi_bounds.size <= 3 || y === bound.top || y === bound.bottom) {
                node.below = this.createTree(Partition_Node_Type.CELL, bottom_voronoi_bounds, bottom_bound);
            } else {
                node.below = this.createTree(Partition_Node_Type.X, bottom_voronoi_bounds, bottom_bound);
            }
            return node;
        // cell case
        } else {
            let k = [...voronoi_bounds.keys()]; // turns cell indexes into an array
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


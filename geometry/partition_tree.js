import { useInsertionEffect } from "react";
import { Bound } from "./primitives";
import { computeBoundingBox } from "./utils";
import { calculateVoronoiCellBounds, VoronoiCell } from "./voronoi";

const Partition_Node_Type = {
    X: 0,
    Y: 1,
    CELL: 2,
};

export class PartitionTree {
    constructor(type, data){
        // this shouldnt be in initial constructor imo, we should make a recursive function that builds the subtrees.
        // though if data is the already built subtrees that also works, mainly just confused what data passed in would be rn
        switch (type) {
            case Partition_Node_Type.X:
                this.x = data.x;
                this.left = data.left;
                this.right = data.right;
                this.type = Partition_Node_Type.X;
            break;
            case Partition_Node_Type.Y:
                this.y = data.y;
                this.above = data.above;
                this.below = data.below;
                this.type = Partition_Node_Type.Y;
            break;
            case Partition_Node_Type.CELL:
                this.index = data.index;
                this.outside = data.outside;
                this.type = Partition_Node_Type.CELL;
            break;
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

        while (curr.outside != null) {
            if (voronoi.cells[curr.index].calculateVoronoiCellBounds.contains(point)) {
                return curr.index;
            }
            curr = curr.outside;
        }

        // for the case where curr.outside is null, meaning the only possible cell we can be in is the current
        return curr.index;
    }

    // if we have a new cell added to the voronoi we need to build new x and y questions.
    // we also need to replace the previous cells in the voronoi that our new cell cuts through
    insert(cell) {

    }
}

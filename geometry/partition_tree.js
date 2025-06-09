const Partition_Node_Type = {
    X: 0,
    Y: 1,
    CELL: 2,
};

export class PartitionTree {
    constructor(type, data){
        switch (type) {
            case Partition_Node_Type.X:
                this.x = data.x
                this.left = data.left
                this.right = data.right
            break;
            case Partition_Node_Type.Y:
                this.y = data.y
                this.above = data.above;
                this.below = data.below;
            break;
            case Partition_Node_Type.CELL:
                this.index = data.index;
                this.outside = data.outside;
            break;
        }
    }
}

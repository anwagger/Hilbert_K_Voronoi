class point {
    constructor(x,y){
        this.x = x;
        this.y = y;
    };
}
class segment {
    constructor(start,end){
        this.start = start;
        this.end = end;
    };
}
class polygon {
    constructor(points) {
        this.points = points;
    }
} 

class bound {
    constructor(top,bottom,left,right){
        this.top = top;
        this.bottom = bottom;
        this.left = left;
        this.right=right;
    }
}

class spoke {
    constructor(segment,front,back){
        this.segment = segment
        this.front = front
        this.back = back
    }
}


class sector {
    constructor(polygon, p1,p2,p1_enter,p1_end,p2_enter,p2_end){
        this.polygon = polygon
        this.p1 = p1
        this.p2 = p2
        this.p1_enter = p1_enter
        this.p1_end = p1_end
        this.p2_enter = p2_enter
        this.p2_end = p2_end
    }
}
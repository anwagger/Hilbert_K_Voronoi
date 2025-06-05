class Point {
    constructor(x,y){
        this.x = x;
        this.y = y;
    };
}
class Segment {
    constructor(start,end){
        this.start = start;
        this.end = end;
    };
}
class Polygon {
    constructor(points) {
        this.points = points;
    }
} 

class Bound {
    constructor(top,bottom,left,right){
        this.top = top;
        this.bottom = bottom;
        this.left = left;
        this.right=right;
    }
}

class Spoke {
    constructor(segment,front,back){
        this.segment = segment
        this.front = front // point
        this.back = back // segment from index - index+1
    }
}


class Sector {
    constructor(polygon, p1,p2,p1_exit,p1_end,p2_exit,p2_end){
        this.polygon = polygon
        this.p1 = p1
        this.p2 = p2
        this.p1_exit = p1_exit
        this.p1_end = p1_end
        this.p2_exit = p2_exit
        this.p2_end = p2_end
    }
}

export {Point, 
        Segment, 
        Polygon, 
        Bound, 
        Spoke, 
        Sector}
function euclidean_distance(point1,point2){
    let dx = point1.x - point2.x
    let dy = point1.y - point1.y
    return Math.sqrt(dx*dx + dy * dy)
}

function half_cross_ratio(point1,point2,edge_point){
    return euclidean_distance(point1,edge_point)/euclidean_distance(point2,edge_point)
}

function weak_funk(point1, point2, edge_point){
    return Math.log(half_cross_ratio(point1,point2,edge_point))
}

function cross_ratio(edge1, point1, point2, edge2){
    return half_cross_ratio(point1,point2,edge2) * half_cross_ratio(point2,point1,edge1)
}  

function hilbert_metric(edge1, point1, point2, edge2){
    return 0.5 * Math.log(cross_ratio(edge1,point1,point2,edge2))
}

export {euclidean_distance, half_cross_ratio, weak_funk, cross_ratio, hilbert_metric}
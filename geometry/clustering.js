import { Point } from "./primitives.js"
import { calculateHilbertDistance, calculateThompsonDistance, computeBoundingBox, euclideanDistance, isZero, pointInPolygon, pointOnPolygon, matrix, hilbertCentroid } from "./utils.js"

export class Cluster {
    constructor(indices, color) {
        this.indices = indices;
        this.color = color; 
    }

    draw(canvas) {
        canvas.sites.forEach((s,i) => {
            if (this.indices.includes(i)) {
                s.setColor(this.color);
                s.cluster_color = this.color;
                s.draw_cluster(canvas.ctx);
            }
        });
    }
}
class UnionFind {
    constructor(size) {
        this.count = size;
        this.nodes = [];
        this.sizes = [];
        
        for (let i = 0; i < size; i++) {
            this.nodes.push(i);
            this.sizes.push(1);
        }
    }

    find(i) {
        let root = i;
        while(root !== this.nodes[root]) {
            root = this.nodes[root];
        }

        while(i !== this.nodes[i]) {
            let next = this.nodes[i];
            this.nodes[i] = root;
            i = next;
        }

        return root;
    }

    connected(i,j) {
        return (this.find(i) === this.find(j));
    }

    union(i,j) {
        let i_root = this.find(i);
        let j_root = this.find(j);

        if (i_root !== j_root) {
            if (this.sizes[i_root] < this.sizes[j_root]) {
                this.nodes[i_root] = this.nodes[j_root];
                this.sizes[i_root] += this.sizes[j_root];
            } else {
                this.nodes[j_root] = this.nodes[i_root];
                this.sizes[j_root] += this.sizes[i_root];
            }
            this.count--;
        }
    }
}

export function singleLinkThresholdHilbert(boundary, points, threshold, canvas) {
    if (threshold <= 0) {
        alert("threshold must be greater than 0");
        return null;
    }

    let n = points.length;
    let uf = new UnionFind(n);

    let dists = generateHDistMatrix(boundary, points);

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (dists[i][j] < threshold) {
                uf.union(i,j);
            }
        }
    }

    let indices = new Map();
    for (let i = 0; i < n; i++) {
        let root = uf.find(i);

        if (!indices.has(root)) {
            indices.set(root,[]);
        }

        indices.get(root).push(i);
    }


    let clusters = [];
    let i = 0;
    for (let idxs of indices.values()) {
        if (canvas.clusters && i < canvas.clusters.length) {
            clusters.push(new Cluster(idxs, canvas.clusters[i++].color));   
        } else {
            clusters.push(new Cluster(idxs, canvas.getNewColor())); 
        }
    }

    return clusters;
}

export function singleLinkKHilbert(boundary, points, k, canvas) {
    let n = points.length;

    if (k < 0 || k > n) {
        alert("Invalid K");
        return null;
    } else if (k == n) {
        let clusters = [];
        for (let i in points) {
            if (i > canvas.clusters.length) {
                clusters.push(new Cluster([i], canvas.getNewColor()));    
            } else {
                clusters.push(new Cluster([i], canvas.clusters[i].color));
            }
        }
    }

    let uf = new UnionFind(n);

    let dists = generateHDistMatrix(boundary, points);

    // edges stores the distance between two points and the indices
    // will be useful for maintaining distances between clusters (i and j will become arrays)
    let edges = [];
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            let edge = {dist: dists[i][j], i: i, j: j};
            edges.push(edge);
        }
    }

    // 0 index stores distance for each edge;
    edges.sort((a,b) => a["dist"] - b["dist"]);
 
    let eIdx = 0;

    while (uf.count > k && eIdx < edges.length) {
        let {d, i, j} = edges[eIdx];
        uf.union(i,j);
        eIdx += 1;
    }

    let indices = new Map();
    for (let i = 0; i < n; i++) {
        let root = uf.find(i);

        if (!indices.has(root)) {
            indices.set(root,[]);
        }

        indices.get(root).push(i);
    }


    let clusters = [];
    let i = 0;
    for (let idxs of indices.values()) {
        if (canvas.clusters && i < canvas.clusters.length) {
            clusters.push(new Cluster(idxs, canvas.clusters[i].color));
            i++;   
        } else {
            clusters.push(new Cluster(idxs, canvas.getNewColor())); 
        }
    }

    return clusters;
}

// hilbert distance matrix yay
export function generateHDistMatrix(boundary, points) {
    let result = matrix(points.length, points.length, 0);
    for (let i = 0; i < points.length; i++) {
        for (let j = 0; j < points.length; j++) {
            result[i][j] = calculateHilbertDistance(boundary, points[i], points[j]);
        }
    }
    return result;
}

export function kmeans(k, points, boundary, canvas) {
    let centroids = kpp(k, points, boundary);
    let converged = false;
    let clusters = [];

    while(converged == false) {
        clusters = [];

        // how ive structured clusters is at clusters[i], theres another array
        // let e = clusters[i], e[0] is the actual points (their coords), and e[1] is all the indices!
        for (let i = 0; i < k; i++) {
            clusters[i] = [[],[]];
        }

        for (let i = 0; i < points.length; i++) {
            let point = points[i];
            let closest_idx = 0;
            let min_distance = calculateHilbertDistance(boundary, point, centroids[0]);

            for (let j = 1; j < k; j++) {
                let d = calculateHilbertDistance(boundary, point, centroids[j]);

                if (d < min_distance) {
                    min_distance = d;
                    closest_idx = j;
                }
            }

            clusters[closest_idx][0].push(points[i]);
            clusters[closest_idx][1].push(i);
        }

        let new_centroids = [];

        let actual_points = [];

        clusters.forEach((e) => {actual_points.push(e[0])});
        for (let i = 0; i < k; i++) {
            let new_centroid = hilbertCentroid(boundary, actual_points[i]);
            new_centroids.push(new_centroid);
        }

        if (JSON.stringify(new_centroids) === JSON.stringify(centroids)) {
            converged = true;
        } else {
            centroids = new_centroids;
        }
    }

    let final_clusters = [];
    for (let i = 0; i < clusters.length; i++) {
         final_clusters.push(new Cluster(clusters[i][1], canvas.getNewColor()));
    }
    
    console.log(final_clusters.length)
    return final_clusters;
}

export function kpp(k, points, boundary) {
    let centroids = [];
    let first_idx = Math.floor(Math.random() * points.length);

    centroids.push(points[first_idx]);

    while(centroids.length < k) {   
        let distances_sqrd = [];

        for (let i = 0; i < points.length; i++) {
            let point = points[i];
            let min_distance = calculateHilbertDistance(boundary, point, centroids[0]);

            for (let j = 1; j < centroids.length; j++) {
                min_distance = Math.min(calculateHilbertDistance(boundary, point, centroids[j]), min_distance);
            }

            distances_sqrd.push(min_distance);
        }

        let total = distances_sqrd.reduce((e,acc) => e + acc);
        let threshold = Math.random() * total;

        let cumulative = 0;

        for (let i = 0; i < points.length; i++) {
            cumulative = cumulative + distances_sqrd[i];
            if (cumulative >= threshold) {
                centroids.push(points[i]);
                break;
            }
        }
    }

    return centroids;
}
import { Point } from "./primitives.js"
import { calculateHilbertDistance, computeBoundingBox, euclideanDistance, isZero, pointInPolygon, pointOnPolygon, matrix } from "./utils.js"

export class Cluster {
    constructor(indices, canvas) {
        this.indices = indices;
        this.color = canvas.getNewColor(); // have to write this
    }

    draw(canvas) {
        canvas.sites.forEach((s,i) => {
            if (this.indices.includes(i)) {
                s.drawable_point.color = this.color;
                s.draw(canvas.ctx);
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
    for (let idxs of indices.values()) {
        clusters.push(new Cluster(idxs, canvas));
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
            clusters.push(new Cluster([i]));
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
    for (let idxs of indices.values()) {
        clusters.push(new Cluster(idxs, canvas));
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
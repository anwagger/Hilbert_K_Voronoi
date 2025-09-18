# Hilbert_K_Voronoi 

Coded by Andrew Wagger and June Cagan

# Introduction

In this software, we implement k-th order voronoi diagrams in the Hilbert Metric.

# Installation


1. Download software files

2. If hosting locally:
    1. Install [Node.js](https://nodejs.org/en/download) (Includes Node Package Manager)
    2. Inside the software folder, run
```npm install --force``` on a command line

    2. Run ```npm start``` or ```node server.js``` to start up the software

    3. Open [localhost:3000](http://localhost:3000)
3. If hosting from a web server:
    1. Only need to serve ```index.html```

# Usage

Navagate between the different modes through the dropdown menu at the top of the page

Create a boundary for the Hilbert geometry in the `set boundary` mode

Place and drag sites by clicking in the boundary in `insert sites`, `balls`, `voronoi`, and  `clustering` modes

Select multiple sites by clicking `Shift` and dragging the mosue over the desired sites.

# Documentation

## Sectors

Sectors are defined by the faces of the boundary that a line through one of the two sites and an arbitrary point in the sector hits and in what order. These are denoted as p1_enter, p1_exit, p2_enter, and p2_exit. This is the main way sectors are "named". 

Also included in the sector datastructure is pre-computed data about the boundaries of the sector, which are used in bisector calculations, among other things.

## Conics

In order to calculate and draw Hilbert bisectors, we needed to work with conic sections

The standard form of a conic section is: `Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0`

The `Bxy` term is very difficult to work with, but we can apply a rotation to the conic that removes the `Bxy` term but keeps the conic's shape:

`theta = 1/2 * atan2(B,A-C)`

The new rotated conic is much easier to work with

We then parameterize the conics in theta from 0 - 2*PI based on their type and orientation.

`x(t) = ...`

`y(t) = ...`

## Bisectors

Bisectors in the Hilbert geometry are made up on multiple conic sections bounded by their sector (CITATION NEEDED).

Bisector Creation Algorithm:

1. Calculate the midsector between two points

2. Calculate the conic section for the sector

3. Intersect the conic with the boundary of the sector

4. Calculate the neighboring sectors the intersected sector edges touch

5. Repeat steps 2-4 for each neighboring sector until a boundary is hit

6. Combine the conics for each sector in a direction

Bisectors are stored as a list of "conic segments", which are parameterized conic sections with a given start and end bound in theta.

The bisectors themselves are parameterized in t, where the integer part of t denotes which conic segment and the fractional part denotes what percentage of the conic segment's total length in theta.  

## Voronoi Algorithm

Voronoi diagrams splits a space into the areas where point are the closest to specific sites. A k-th degree voronoi diagram splits space into areas where the same k points are the k-closest points

Our algorithm calculates every degree voronoi diagram at once

1. Calculate all bisectors

2. Calculate all circumcenters

3. For each bisector:
    1. Order the circumcenters on that bisector with respect to t
    2. Calculate the degree and associated sites of the first bisector section
    3. At each circumcenter, the degree and sites change predictably.
    4. Each bisector sectionn can then be added to its two voronoi cells

## Partition Tree

Allows the software to quickly determine which cell a point is in.

The partition tree data structure stores information regarding which cell a point could potentially be in, with the maximum amount of potential cells being 3 (might be 4?). We can't use a data structure like a trapezoid map due to the convex nature of voronoi cells, which can't be decomposed into trapezoids and triangles like regular euclidean cells can. The partition tree searches for what point a cell may be in by asking a series of x and y questions about the point we are trying to locate, and each question shrinks the bounding box of the point in half until the bounding box only overlaps with 3 other cell's boxes. 

## Hilbert Rose

We define a Hilbert Rose as the convergence of the following routine:

1. Take the Convex hull of the current sites.
2. For each adjacent vertex of the hull, take the hilbert midpoint.
3. Add those midpoints to the list of sites, and take out the convex hull sites
4. Repeat

I don't think we have formally proven it converges, but it looks cool and seems to always converge. (Due to floating point, it doesn't go on forever in our visualization)

## Hilbert Centroid

In Euclidean geometry, the centroid of a set of points can be easily calculated by taking the average of each dimension's corrdinates. In Hilbert, that can't be done. We tried a few things 

## Hilbert Images

Convert an image into a Hilbert Image by seeing how it is warped by the Hilbert Geometry.

## Hilbertroids

Fly a spaceship through the Hilbert "Space" as you dodge and destroy asteroids! The movement and size of the obsticles is governed by the warping of Hilert Geometry, which makes it quite a tricky challenge!

Primarily uses a function to move some length in some euclidean angle through the Hilbert Geometry, which is done by converting the slice at that angle to a 1-D Hilbert Geometry and using an inverse Hilbert Distance function.

## Bugs

Unfortunately, due to the nature of floating point values, there are many slight edge cases where the current algorithms break. Many are due to needing to use approximations for 0 which can either be too lax or too strict at times.

These include conic sections in bisectors freaking out at edges, a voronoi diagram missing a wall due to circumcenter calculations going wrong, and more

The conic intersection algorithm can also freak out, and occasionally crash. but very rarely. 
The current algorithm is a brute force check, as exact methods are complex and unreliable. 

When filling in voronoi cells, occasionally the algorithm doesn't fill in the cell correcty due to the placement of vertices. 

Most of these bugs happen at very specific placements, so slightly moving a point is usually enough to get the program back in order.
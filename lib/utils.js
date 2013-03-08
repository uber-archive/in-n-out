var pointInPolygon = require('point-in-polygon');

var vectorCrossProduct = function(p1, p2) {
    return p1[0] * p2[1] - p1[1] * p2[0];
};

var vectorDifference = function(p1, p2) {
    return [p1[0] - p2[0], p1[1] - p2[1]];
};

var segmentsIntersect = function(s1p1, s1p2, s2p1, s2p2) {
    // Based on http://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect

    var p = s1p1;
    var r = vectorDifference(s1p2, s1p1);
    var q = s2p1;
    var s = vectorDifference(s2p2, s2p1);

    var rCrossS = vectorCrossProduct(r, s);
    var qMinusP = vectorDifference(q, p);

    if (rCrossS === 0) {
        if (vectorCrossProduct(qMinusP, r) === 0) { // collinear segments
            return true;
        } else {
            return false;
        }
    }
    
    var t = vectorCrossProduct(qMinusP, s) / rCrossS;
    var u = vectorCrossProduct(qMinusP, r) / rCrossS;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
};

var haveIntersectingEdges = function(poly1, poly2) {
    for (var idx1 = 0; idx1 < poly1.length - 1; idx1++){
        for (var idx2 = 0; idx2 < poly2.length - 1; idx2++) {
            if (segmentsIntersect(poly1[idx1], poly1[idx1 + 1], poly2[idx2], poly2[idx2 + 1])) {
                return true;
            }
        }
    }

    return false;
};

// Does the source have any points inside the target
var hasPointInPolygon = function(sourcePoly, targetPoly) {
    for (var idx = 0; idx < sourcePoly.length - 1; idx++) {
        if (pointInPolygon(sourcePoly[idx], targetPoly)) {
            return true;
        }
    }

    return false;
};

var project = function(value, tileSize) {
    return Math.floor(value / tileSize);
};

module.exports = {
    vectorCrossProduct: vectorCrossProduct,
    vectorDifference: vectorDifference,
    segmentsIntersect: segmentsIntersect,
    project: project,
    pointInPolygon: pointInPolygon,
    haveIntersectingEdges: haveIntersectingEdges,
    hasPointInPolygon: hasPointInPolygon
};

var utils = require('./utils');

var Geofence = function(vertices, granularity) {
    if (!Array.isArray(vertices)) {
        throw new Error("Vertices must be an array");
    }

    this.vertices = vertices;
    this.granularity = Math.floor(granularity) || 20;

    this.minX = null;
    this.maxX = null;
    this.minY = null;
    this.maxY = null;
    this.tileWidth = null;
    this.tileHeight = null;

    // Close the geofence if necessary
    if (vertices[0][0] !== vertices[vertices.length - 1][0] || vertices[0][1] !== vertices[vertices.length - 1][1]) {
        vertices.push(vertices[0]);
    }

    this.tiles = {}; // Tracks which tiles are inside or intersecting the geofence (tiles outside are simply not tracked)

    this.setInclusionTiles();

    // this.testsInside = 0;
    // this.testsOutside = 0;
    // this.testsIntersecting = 0;
    // this.timeHashing = 0;

    return this;
};

Geofence.prototype = {
    inside: function (point) {
        // Bbox check first
        if (point[0] < this.minX || point[0] > this.maxX || point[1] < this.minY || point[1] > this.maxY) {
            // console.log("Outside Bbox: minX: %d, x: %d, maxX: %d, minY: %d, y: %d, maxY: %d", this.minX, point[0], this.maxX, this.minY, point[1], this.maxY);
            return false;
        }

        // var hashStart = Date.now();
        var tileHash = Math.floor((point[1]-this.minY)/this.tileHeight) * this.granularity + Math.floor((point[0]-this.minX)/this.tileWidth);
        // console.log("Hash: %d", tileHash);
        // var hashStart = Date.now();
        var intersects = this.tiles[tileHash];
        // this.timeHashing += Date.now() - hashStart;

        if (intersects === 'i') {
            // this.testsInside++;
            return true;
        } else if (intersects === 'x') {
            // this.testsIntersecting++;
            return utils.pointInPolygon(point, this.vertices);
        } else {
            // this.testsOutside++;
            return false;
        }
    },

    setInclusionTiles: function() {
        var xVertices = this.vertices.map(function(point) { return point[0];});
        var yVertices = this.vertices.map(function(point) { return point[1];});

        var minX = this.minX = Math.min.apply(null, xVertices);
        var minY = this.minY = Math.min.apply(null, yVertices);
        var maxX = this.maxX = Math.max.apply(null, xVertices);
        var maxY = this.maxY = Math.max.apply(null, yVertices);

        var xRange = maxX - minX;
        var yRange = maxY - minY;

        var tileWidth = this.tileWidth = xRange / this.granularity;
        var tileHeight = this.tileHeight = yRange / this.granularity;

        var minTileX = utils.project(minX, tileWidth);
        var minTileY = utils.project(minY, tileHeight);
        var maxTileX = utils.project(maxX, tileWidth);
        var maxTileY = utils.project(maxY, tileHeight);

        var bBoxPoly = null;
        var tileHash = null;

        // console.log("");
        for (var tileX = minTileX; tileX <= maxTileX; tileX++) {
            // var row = '';
            for (var tileY = minTileY; tileY <= maxTileY; tileY++) {
                tileHash = (tileY - minTileY) * this.granularity + (tileX - minTileX);
                bBoxPoly = [
                    [tileX * tileWidth, tileY * tileHeight],
                    [(tileX + 1) * tileWidth, tileY * tileHeight],
                    [(tileX + 1) * tileWidth, (tileY + 1) * tileHeight],
                    [tileX * tileWidth, (tileY + 1) * tileHeight],
                    [tileX * tileWidth, tileY * tileHeight]
                ];

                if (utils.haveIntersectingEdges(bBoxPoly, this.vertices) || utils.hasPointInPolygon(this.vertices, bBoxPoly)) {
                    this.tiles[tileHash] = 'x';
                    // row += 'x';
                // If the geofence doesn't have any points inside the tile bbox, then if the bbox has any point inside the geofence
                // the bbox has all the points inside the geofence
                } else if (utils.hasPointInPolygon(bBoxPoly, this.vertices)) {
                    this.tiles[tileHash] = 'i';
                    // row += 'i';
                } // else all points are outside the poly
                else {
                    // row += '.';
                }
            }
            // console.log(row);
        }

        return;
    }
};

module.exports = Geofence;

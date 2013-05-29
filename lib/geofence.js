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
        var tileHash = (utils.project(point[1], this.tileHeight) - this.minTileY) * this.granularity + (utils.project(point[0], this.tileWidth) - this.minTileX);
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

    // Make a grid for this geofence using a given bound box and granularity.
    // For each tile visited, the callback will be called with (hash, state) as
    // arguments where state is either 'i', 'o', or 'x'.
    makeGrid: function(boundBox, granularity, callback) {

        var minX = boundBox.minX;
        var minY = boundBox.minY;
        var maxX = boundBox.maxX;
        var maxY = boundBox.maxY;

        var tileWidth = (maxX - minX) / granularity;
        var tileHeight = (maxY - minY) / granularity;

        var minTileX = this.minTileX = utils.project(minX, tileWidth);
        var minTileY = this.minTileY = utils.project(minY, tileHeight);
        var maxTileX = this.maxTileX = utils.project(maxX, tileWidth);
        var maxTileY = this.maxTileY = utils.project(maxY, tileHeight);

        var bBoxPoly = null;
        var tileHash = null;

        // console.log("");
        for (var tileX = minTileX; tileX <= maxTileX; tileX++) {
            var row = '';
            for (var tileY = minTileY; tileY <= maxTileY; tileY++) {
                tileHash = (tileY - minTileY) * granularity + (tileX - minTileX);
                bBoxPoly = [
                    [tileX * tileWidth, tileY * tileHeight],
                    [(tileX + 1) * tileWidth, tileY * tileHeight],
                    [(tileX + 1) * tileWidth, (tileY + 1) * tileHeight],
                    [tileX * tileWidth, (tileY + 1) * tileHeight],
                    [tileX * tileWidth, tileY * tileHeight]
                ];
                // console.log(tileHash, tileWidth, tileHeight, bBoxPoly);
                if (utils.haveIntersectingEdges(bBoxPoly, this.vertices) || utils.hasPointInPolygon(this.vertices, bBoxPoly)) {
                    callback(tileHash, 'x');
                    row += 'x';
                // If the geofence doesn't have any points inside the tile bbox, then if the bbox has any point inside the geofence
                // the bbox has all the points inside the geofence
                } else if (utils.hasPointInPolygon(bBoxPoly, this.vertices)) {
                    callback(tileHash, 'i');
                    row += 'i';
                } // else all points are outside the poly
                else {
                    callback(tileHash, 'o');
                    row += 'o';
                }
            }
            //console.log(row);
        } 
        return;
    },

    setInclusionTiles: function() {
        var xVertices = this.vertices.map(function(point) { return point[0];});
        var yVertices = this.vertices.map(function(point) { return point[1];});

        var minX = this.minX = Math.min.apply(null, xVertices);
        var minY = this.minY = Math.min.apply(null, yVertices);
        var maxX = this.maxX = Math.max.apply(null, xVertices);
        var maxY = this.maxY = Math.max.apply(null, yVertices);

        this.tileWidth = (maxX - minX) / this.granularity;
        this.tileHeight = (maxY - minY) / this.granularity;

        var tiles = this.tiles;
        this.makeGrid({minX: minX, minY: minY, maxX: maxX, maxY: maxY},
            this.granularity,
            function(hash, state) {
                tiles[hash] = state;
            });
    }
};

module.exports = Geofence;

var utils = require('./utils');

var Geofence = function(vertices, granularity, id) {
    if (!Array.isArray(vertices)) {
        throw new Error("Vertices must be an array");
    }

    this.vertices = vertices;
    this.granularity = Math.floor(granularity) || 20;
    this.id = id;

    this.tileWidth = null;
    this.tileHeight = null;

    // Close the geofence if necessary
    if (vertices[0] !== vertices[vertices.length - 1]) {
        vertices.push(vertices[0]);
    }

    this.tiles = {}; // Tracks which tiles are inside or intersecting the geofence (tiles outside are simply not tracked)

    this.setInclusionTiles();

    return this;
};

Geofence.prototype = {
    inside: function (point) {
        var tileHash = utils.projectPoint(point, this.tileWidth, this.tileHeight).join(',');
        var intersects = this.tiles[tileHash];

        if (intersects === 'i') {
            return true;
        } else if (intersects === 'x') {
            return utils.pointInPolygon(point, this.vertices);
        } else {
            return false;
        }
    },

    setInclusionTiles: function() {
        var xVertices = this.vertices.map(function(point) { return point[0];});
        var yVertices = this.vertices.map(function(point) { return point[1];});

        var minX = Math.min.apply(null, xVertices);
        var minY = Math.min.apply(null, yVertices);
        var maxX = Math.max.apply(null, xVertices);
        var maxY = Math.max.apply(null, yVertices);

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

        for (var tileX = minTileX; tileX <= maxTileX; tileX++) {
            for (var tileY = minTileY; tileY <= maxTileY; tileY++) {
                tileHash = [tileX, tileY].join(',');
                bBoxPoly = [
                    [tileX * tileWidth, tileY * tileHeight],
                    [(tileX + 1) * tileWidth, tileY * tileHeight],
                    [(tileX + 1) * tileWidth, (tileY + 1) * tileHeight],
                    [tileX * tileWidth, (tileY + 1) * tileHeight],
                    [tileX * tileWidth, tileY * tileHeight]
                ];

                if (utils.haveIntersectingEdges(bBoxPoly, this.vertices) || utils.hasPointInPolygon(this.vertices, bBoxPoly)) {
                    this.tiles[tileHash] = 'x';
                // If the geofence doesn't have any points inside the tile bbox, then if the bbox has any point inside the geofence
                // the bbox has all the points inside the geofence
                } else if (utils.hasPointInPolygon(bBoxPoly, this.vertices)) {
                    this.tiles[tileHash] = 'i';
                } // else all points are outside the poly
            }
        }

        return;
    }
};

module.exports = Geofence;

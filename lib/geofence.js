var utils = require('./utils');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var version = require('../package.json').version;

function Geofence(vertices, granularity, tiles) {
    EventEmitter.call(this);
    if (!Array.isArray(vertices)) {
        throw new Error("Vertices must be an array");
    }

    if (!Array.isArray(vertices[0])) {
        throw new Error("Vertices must contain at least one point");
    }

    // Support complex polygons a la GeoJSON with inner rings removed, as well
    // as single-array outer-ring polygons
    if (!Array.isArray(vertices[0][0])) {
        vertices = [vertices];
    }

    // Close the geofence(s) if necessary
    for (var i = 0, ring; ring = vertices[i]; i++) {
        if (ring[0][0] !== ring[ring.length - 1][0] ||
            ring[0][1] !== ring[ring.length - 1][1]) {
            ring.push(ring[0]);
        }
    }

    this.vertices = vertices[0];

    if (vertices.length > 1) {
        this.holes = vertices.slice(1);
    }

    this.granularity = Math.floor(granularity) || 20;

    this.minX = null;
    this.maxX = null;
    this.minY = null;
    this.maxY = null;
    this.tileWidth = null;
    this.tileHeight = null;
    this.minTileX = null;
    this.maxTileX = null;
    this.minTileY = null;
    this.maxTileY = null;

    this.tiles = tiles || {}; // Tracks which tiles are inside or intersecting the geofence (tiles outside are simply not tracked)
    this.version = version;

    if (!tiles) {
        this.setInclusionTiles();
    }

    // this.testsInside = 0;
    // this.testsOutside = 0;
    // this.testsIntersecting = 0;
    // this.timeHashing = 0;
}

util.inherits(Geofence, EventEmitter);

Geofence.prototype.inside = function(point) {
    // Bbox check first
    if (point[0] < this.minX || point[0] > this.maxX || point[1] < this.minY || point[1] > this.maxY) {
        this.emit('outside', point);
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
        this.emit('inside', point);
        // this.testsInside++;
        return true;
    } else if (intersects === 'x') {
        this.emit('intersection', point);
        // this.testsIntersecting++;
        var inside = utils.pointInPolygon(point, this.vertices);
        if (!inside || !this.holes) {
            return inside;
        }
        // If we do have holes cut out, and the point falls within the outer
        // ring, ensure no inner rings exclude this point
        for (var i = 0, hole; hole = this.holes[i]; i++) {
            if (utils.pointInPolygon(point, hole)) {
                return false;
            }
        }
        return true;
    } else {
        this.emit('outside', point);
        // this.testsOutside++;
        return false;
    }
};

Geofence.prototype.setInclusionTiles = function() {
    var xVertices = this.vertices.map(function(point) { return point[0]; });
    var yVertices = this.vertices.map(function(point) { return point[1]; });

    var minX = this.minX = Math.min.apply(null, xVertices);
    var minY = this.minY = Math.min.apply(null, yVertices);
    var maxX = this.maxX = Math.max.apply(null, xVertices);
    var maxY = this.maxY = Math.max.apply(null, yVertices);

    var xRange = maxX - minX;
    var yRange = maxY - minY;

    var tileWidth = this.tileWidth = xRange / this.granularity;
    var tileHeight = this.tileHeight = yRange / this.granularity;

    this.minTileX = utils.project(minX, tileWidth);
    this.minTileY = utils.project(minY, tileHeight);
    this.maxTileX = utils.project(maxX, tileWidth);
    this.maxTileY = utils.project(maxY, tileHeight);

    this.setExclusionTiles(this.vertices, true);
    if (this.holes) {
        this.holes.forEach(function(hole) {
            this.setExclusionTiles(hole, false);
        }.bind(this));
    }
};

Geofence.prototype.setExclusionTiles = function(vertices, inclusive) {
    var bBoxPoly;
    var tileHash;

    for (var tileX = this.minTileX; tileX <= this.maxTileX; tileX++) {
        for (var tileY = this.minTileY; tileY <= this.maxTileY; tileY++) {
            tileHash = (tileY - this.minTileY) * this.granularity + (tileX - this.minTileX);
            bBoxPoly = [
                [tileX * this.tileWidth, tileY * this.tileHeight],
                [(tileX + 1) * this.tileWidth, tileY * this.tileHeight],
                [(tileX + 1) * this.tileWidth, (tileY + 1) * this.tileHeight],
                [tileX * this.tileWidth, (tileY + 1) * this.tileHeight],
                [tileX * this.tileWidth, tileY * this.tileHeight]
            ];

            if (utils.haveIntersectingEdges(bBoxPoly, vertices) ||
                utils.hasPointInPolygon(vertices, bBoxPoly)) {
                this.tiles[tileHash] = 'x';
            // If the geofence doesn't have any points inside the tile bbox, then if the bbox has any point inside the geofence
            // the bbox has all the points inside the geofence
            } else if (utils.hasPointInPolygon(bBoxPoly, vertices)) {
                if (inclusive) {
                    this.tiles[tileHash] = 'i';
                } else {
                    this.tiles[tileHash] = 'o';
                }
            } // else all points are outside the poly
        }
    }
};

Geofence.prototype.save = function(full) {
    if (full === false) {
        return {
            version: this.version,
            vertices: this.vertices,
            holes: this.holes,
            granularity: this.granularity
        };
    } else {
        return {
            version: this.version,
            vertices: this.vertices,
            holes: this.holes,
            granularity: this.granularity,
            minX: this.minX,
            maxX: this.maxX,
            minY: this.minY,
            maxY: this.maxY,
            tileWidth: this.tileWidth,
            tileHeight: this.tileHeight,
            minTileX: this.minTileX,
            maxTileX: this.maxTileX,
            minTileY: this.minTileY,
            maxTileY: this.maxTileY,
            tiles: this.tiles
        };
    }
};

Geofence.load = function load(obj) {
    var geofence;
    if (obj.version === version && obj.tiles) {
        geofence = new Geofence(obj.vertices, obj.granularity, obj.tiles);
        geofence.holes = obj.holes;
        geofence.minX = obj.minX;
        geofence.maxX = obj.maxX;
        geofence.minY = obj.minY;
        geofence.maxY = obj.maxY;
        geofence.tileWidth = obj.tileWidth;
        geofence.tileHeight = obj.tileHeight;
        geofence.minTileX = obj.minTileX;
        geofence.maxTileX = obj.maxTileX;
        geofence.minTileY = obj.minTileY;
        geofence.maxTileY = obj.maxTileY;
    } else if (obj.vertices && obj.granularity) {
        if (obj.holes) {
            geofence = new Geofence([obj.vertices].concat(obj.holes), obj.granularity);
        } else {
            geofence = new Geofence(obj.vertices, obj.granularity);
        }
    } else {
        throw new Error('Serialized Geofence at version ' + obj.version + ' wildly different from current version ' + version);
    }
    return geofence;
};

module.exports = Geofence;

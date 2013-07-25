var expect = require('chai').expect;

var utils = require('../lib/utils');
var Geofence = require('../lib/geofence');
var GeofencedGroup = require('../lib/geofenced_group');

// Spec object to create random polygon
var PolygonSpec = function() {
    this.centerXRange = [0, 0]; 
    this.centerYRange = [0, 0]; 
    this.sidesRange = [3, 8];
    this.radiusRange = [0, 0];
    this.convex = true;
};

// Spec object to create a random geofence group
var GroupSpec = function() {
    this.minX = -10;
    this.minY = -10;
    this.maxX = 10;
    this.maxY = 10;
    this.granularity = 20;
    this.entries = 100;
    this.whiteGfRange = [0, 10];
    this.blackGfRange = [0, 10];
    this.polyRadiusRange = [1, 4];
};

// Spec object to create a group corresponding to the globe
var SparseGroupSpec = function() {
    this.minX = -180;
    this.minY = -90;
    this.maxX = 180;
    this.maxY = 90;
    this.granularity = 20;
    this.entries = 500;
    this.whiteGfRange = [1, 4];
    this.blackGfRange = [0, 4];
    this.polyRadiusRange = [0.1, 1];
};

// Generate a random polygon with non-intersecting edges in the following way
// 1. Create random angles in [0..360], fix two as 0, and 180
// 2. Draw a line with random length(radius) from [0,0] using one angle, the other
//    end of the line is a verticle of the polygon. For convex polygon, use fixed radius.
var generateRandomPolygon = function(spec) {

    var angles = [0, 180];
    var sides = spec.sidesRange[0] + Math.floor(Math.random() * (spec.sidesRange[1] - spec.sidesRange[0]));
    for (var i = 0; i < sides - 2; i++) {
        angles.push(Math.random() * 360);
    }
    angles = angles.sort();

    var centerX = spec.centerXRange[0] + Math.random() * (spec.centerXRange[1] - spec.centerXRange[0]);
    var centerY = spec.centerYRange[0] + Math.random() * (spec.centerYRange[1] - spec.centerYRange[0]);
    var vertices = [];
    for (var i = 0; i < angles.length; i++) {
        var radius = spec.convex ? spec.radiusRange[0] :
            spec.radiusRange[0] + Math.random() * (spec.radiusRange[1] - spec.radiusRange[0]);

        var x = centerX +  Math.cos(angles[i]) * radius;
        var y = centerY +  Math.sin(angles[i]) * radius;
        vertices.push([x, y]);
    }
    return vertices;
};

// Generate a random geofence group
var generateRandomGroup = function(groupSpec) {

    var gfg = new GeofencedGroup(groupSpec.granularity);
    var polySpec = new PolygonSpec();
    polySpec.centerXRange = [groupSpec.minX, groupSpec.maxX];
    polySpec.centerYRange = [groupSpec.minY, groupSpec.maxY];
    polySpec.radiusRange = groupSpec.polyRadiusRange;
    for (var i = 0; i < groupSpec.entries; i++) {
        var whites = [];
        var blacks = [];
        var numWhites = groupSpec.whiteGfRange[0] + Math.floor(
            Math.random() * (groupSpec.whiteGfRange[1] - groupSpec.whiteGfRange[0]));
        var numBlacks = groupSpec.blackGfRange[0] + Math.floor(
            Math.random() * (groupSpec.blackGfRange[1] - groupSpec.blackGfRange[0]));

        for (var x = 0; x < numWhites; x++) {
            var poly = generateRandomPolygon(polySpec);
            whites.push(new Geofence(poly));
        }

        for (var x = 0; x < numBlacks; x++) {
            var poly = generateRandomPolygon(polySpec);
            blacks.push(new Geofence(poly));
        }

        gfg.add(i, whites, blacks);
    }

    return gfg;
}

var testGroupPerformance = function(group) {
    var numUnknownTiles = 0;
    for (var x in group.tiles) {
        numUnknownTiles += (group.tiles[x] ? Object.keys(group.tiles[x]).length : 0);
    }
    console.log("Average unknown Ids per Tile " +
        numUnknownTiles / (group.granularity * group.granularity));
   
    var iterations = 100000;
    var points = [];
    var timeFunction = function(fn, iterations) {
        var start = Date.now();
        for (var x = 0; x < iterations; x++) {
            fn(x);
        }
        return Date.now() - start;
    };

    for (var i = 0; i < iterations; i++) {
        var randPoint = [group.minX + Math.random() * (group.maxX - group.minX),
            group.minY + Math.random() * (group.maxY - group.minY)];
        points.push(randPoint);
    }

    var fastTime = timeFunction(function(i) {
        group.getValidKeys(points[i]);
    }, iterations);

    var slowTime = timeFunction(function(i) {
        group.getValidKeysBF(points[i]);
    }, iterations);

    expect(fastTime).to.be.below(slowTime);
    //console.dir(group);
    console.log("iterations: %d, AFTER optimization: %dms, BEFORE optimization: %dms",
        iterations, fastTime, slowTime);

}


describe('GeofencedGroup.getValideKeys', function() {
    
    it('correctness of fast lookup', function() {
        var groupSpec = new GroupSpec();
        var group = generateRandomGroup(groupSpec);
        for (var i = 0; i < 10000; i++) {
            var randPoint = [group.minX + Math.random() * (group.maxX - group.minX),
                group.minY + Math.random() * (group.maxY - group.minY)];
            var ids1 = group.getValidKeys(randPoint);
            var ids2 = group.getValidKeysBF(randPoint);
            expect(ids1.sort()).to.deep.equal(ids2.sort());
        }
    });
   
    it('GeofencedGroup.performanceDenseGroup', function() {
        var groupSpec = new GroupSpec();
        var group = generateRandomGroup(groupSpec);
        console.log("Test speedup of using master grid on a group of dense regions");
        testGroupPerformance(group);
    }); 
 
    it('GeofencedGroup.performanceSparseGroup', function() {
        var groupSpec = new SparseGroupSpec();
        var group = generateRandomGroup(groupSpec);
        console.log("Test speedup of using master grid on a group of sparse regions");
        testGroupPerformance(group);
    }); 
   
       
});



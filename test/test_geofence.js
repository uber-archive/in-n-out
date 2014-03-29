
var expect = require('chai').expect;

var utils = require('../lib/utils');
var Geofence = require('../lib/geofence');

var randomPoint = function(range) { return [Math.random()*range - range/2, Math.random()*range - range/2]; };
var randomPolygon = function(range, percentageOfRange) {
    var polygon = [];
    while(polygon.length < 1000) {
        polygon.push(randomPoint(range * percentageOfRange));
    }

    return polygon;
};

describe('Geofence.inside()', function() {
    it('should always equal utils.pointInPolygon', function() {
        var polygon = randomPolygon(2000, 0.1);
        var gf = new Geofence(polygon);
        var point = null;
        for (var x = 0; x < 1000; x++) {
            point = randomPoint(2000);
            expect(gf.inside(point)).to.equal(utils.pointInPolygon(point, polygon));
        }
    });

    it('should be faster than utils.pointInPolygon', function() {
        var polygon = [ // Chicago geofence
            [42.01313565896657, -87.89133314508945],
            [42.01086525470408, -87.94498134870082],
            [41.955566495567936, -87.94566393946297],
            [41.937218295745865, -87.88581848144531],
            [41.96295962052549, -87.86811594385654],
            [41.93385557339662, -87.86333084106445],
            [41.934494079111666, -87.81011581420898],
            [41.90554916282452, -87.80925750732422],
            [41.9058827519221, -87.77938842773438],
            [41.86402837073972, -87.77792931126896],
            [41.864284053216565, -87.75638580846135],
            [41.82348977579423, -87.75552751729265],
            [41.823042045417644, -87.80410768697038],
            [41.771468158020106, -87.80324938008562],
            [41.772364335324305, -87.74625778198242],
            [41.730894639311565, -87.74513235432096],
            [41.73166805909664, -87.6870346069336],
            [41.71748939617332, -87.68600471266836],
            [41.716966221614854, -87.7243280201219],
            [41.69405798811367, -87.72351264953613],
            [41.693865716655395, -87.74385454365984],
            [41.67463566843159, -87.74299623677507],
            [41.67550471265456, -87.6654052734375],
            [41.651683859743336, -87.66489028930664],
            [41.65181212480582, -87.64789581298828],
            [41.652036588050684, -87.62532234191895],
            [41.643100214173714, -87.62506484985352],
            [41.643492184875946, -87.51889228820801],
            [41.642929165686375, -87.38588330335915],
            [41.836600482955916, -87.43858338799328],
            [42.05042567111704, -87.40253437310457],
            [42.070116505457364, -87.47205723077059],
            [42.0681413002819, -87.66792302951217],
            [42.02862488227374, -87.66551960259676],
            [42.0280511074349, -87.71289814263582],
            [41.998468275360544, -87.71301263943315],
            [41.9988509912138, -87.75069231167436],
            [42.02100207763309, -87.77704238542356],
            [42.02010937741473, -87.831029893714],
            [41.98719839843826, -87.83120155116194],
            [41.9948536336077, -87.86373138340423]
        ];
        var lats = polygon.map(function(point) { return point[0]; });
        var lngs = polygon.map(function(point) { return point[1]; });
        var minLat = Math.min.apply(null, lats);
        var maxLat = Math.max.apply(null, lats);
        var minLng = Math.min.apply(null, lngs);
        var maxLng = Math.max.apply(null, lngs);

        var latRange = maxLat - minLat;
        var lngRange = maxLng - minLng;

        var randomPointCustom = function(factor) {
            return [
                (minLat + maxLat)/2 - latRange*factor/2 + latRange*factor*Math.random(),
                (minLng + maxLng)/2 - lngRange*factor/2 + lngRange*factor*Math.random()
            ];
        };

        var gf = new Geofence(polygon);
        var point = null;

        var timeFunction = function(fn, iterations) {
            var start = Date.now();
            for (var x = 0; x < iterations; x++) {
                fn();
            }
            return Date.now() - start;
        };

        var iterations = 1000000;
        // var iterations = 10;

        var gfTime = timeFunction(function() {
            point = randomPointCustom(100);
            gf.inside(point);
        }, iterations);

        var inTime = timeFunction(function() {
            point = randomPointCustom(100);
            utils.pointInPolygon(point, polygon);
        }, iterations);

        // console.log("gf: %dms, in: %dms (points: %d, o: %d, x: %d, i: %d, percentX: %d, timeHashing: %d", gfTime, inTime, iterations, gf.testsOutside, gf.testsIntersecting, gf.testsInside, gf.testsIntersecting/iterations*100, gf.timeHashing);
        expect(gfTime).to.be.below(inTime);
        console.log("iterations: %d, innout: %dms, pointinpolygon: %dms", iterations, gfTime, inTime);
    });

    describe('event emission', function() {

        var polygon = [
            [0, 0],
            [5, 0],
            [5, 5],
            [0, 5]
        ];
        var geofence = new Geofence(polygon);

        it('should emit "inside" for a point fully inside of the polygon', function(done) {
            geofence.on('inside', function(point) {
                expect(point.toString()).to.equal([2, 2].toString());
                done();
            });
            geofence.inside([2, 2]);
        });

        it('should emit "outside" for a point fully outside of the polygon', function(done) {
            geofence.on('outside', function(point) {
                expect(point.toString()).to.equal([6, 6].toString());
                done();
            });
            geofence.inside([6, 6]);
        });

        it('should emit "intersection" for a point on the edge of the polygon', function(done) {
            geofence.on('intersection', function(point) {
                expect(point.toString()).to.equal([5, 5].toString());
                done();
            });
            geofence.inside([5, 5]);
        });
    });
});

describe('Complex polygons', function() {
    describe('with a single outer ring', function() {
        it('behaves the same as pointInPolygon', function() {
            var polygon = randomPolygon(2000, 0.1);
            var geofence = new Geofence([polygon]);
            var point = randomPoint(2000);
            expect(geofence.inside(point)).to.equal(utils.pointInPolygon(point, polygon));
        });
    });

    describe('with a single inner ring', function() {
        // San Francisco peninsula
        var polygon = [
            [-122.19581253,  37.365653004],
            [-122.49420166,  37.6447143555],
            [-122.513364651, 37.6988438412],
            [-122.355320255, 37.709494697],
            [-122.355879585, 37.6928869743],
            [-122.076452319, 37.4641785837],
            [-122.19581253,  37.365653004]
        ];
        var hole = [
            [-122.404894594, 37.6388752809],
            [-122.397411728, 37.6128435367],
            [-122.379888562, 37.601737887],
            [-122.336601607, 37.6116430059],
            [-122.366248909, 37.645475542],
            [-122.404894594, 37.6388752809]
        ];
        var donutGeofence = new Geofence([polygon, hole]);

        it('should return true for points outside the hole', function() {
            var sanMateo = [-122.3131, 37.5542];
            expect(donutGeofence.inside(sanMateo)).to.equal(true);
        });

        it('should return false for points inside the hole', function() {
            var airportPoint = [-122.3750, 37.6189];
            expect(donutGeofence.inside(airportPoint)).to.equal(false);
        });

        it('should compute the same as pointInPolygon', function() {
            var minLatitude = -122.513;
            var maxLatitude = -122.076;
            var latitudeDelta = maxLatitude - minLatitude;
            var minLongitude = 37.365;
            var maxLongitude = 37.709;
            var longitudeDelta = maxLongitude - minLongitude;

            for (var i = 0; i < 100; i++) {
                var latitude = minLatitude + Math.random() * latitudeDelta;
                var longitude = minLongitude + Math.random() * longitudeDelta;
                var point = [latitude, longitude];

                var insideBounds = utils.pointInPolygon(point, polygon);
                if (insideBounds) {
                    expect(donutGeofence.inside(point)).to.equal(!utils.pointInPolygon(point, hole));
                } else {
                    expect(donutGeofence.inside(point)).to.equal(insideBounds);
                }
            }
        });
    });

    describe('with two inner rings', function() {
        var bounds = [
            [-5, -5],
            [-5,  5],
            [5,   5],
            [5,  -5]
        ];
        var firstRing = [
            [3, 3],
            [3, 4],
            [4, 4],
            [4, 3]
        ];
        var secondRing = [
            [-4, -4],
            [-4, 2],
            [2, 2],
            [2, -4]
        ];
        var twoHoleGeofence = new Geofence([bounds, firstRing, secondRing]);

        it('respects the first ring', function() {
            expect(twoHoleGeofence.inside([3.5, 3.5])).to.equal(false);
        });

        it('respects the second ring', function() {
            expect(twoHoleGeofence.inside([0, 0])).to.equal(false);
        });

        it('correctly identifies points outside both rings', function() {
            expect(twoHoleGeofence.inside([2.5, 2.5])).to.equal(true);
        });
    });

    describe('saving and loading', function() {
        var bounds = [
            [-5, -5],
            [-5, 5],
            [5, 5],
            [5, -5]
        ];

        var originalGeofence = new Geofence(bounds);

        it('saves into an expected object', function() {
            var fullObj = originalGeofence.save();
            expect(fullObj.version).to.equal(originalGeofence.version);
            expect(fullObj.vertices).to.equal(originalGeofence.vertices);
            expect(fullObj.holes).to.equal(originalGeofence.holes);
            expect(fullObj.granularity).to.equal(originalGeofence.granularity);
            expect(fullObj.minX).to.equal(originalGeofence.minX);
            expect(fullObj.maxX).to.equal(originalGeofence.maxX);
            expect(fullObj.minY).to.equal(originalGeofence.minY);
            expect(fullObj.maxY).to.equal(originalGeofence.maxY);
            expect(fullObj.tileWidth).to.equal(originalGeofence.tileWidth);
            expect(fullObj.tileHeight).to.equal(originalGeofence.tileHeight);
            expect(fullObj.minTileX).to.equal(originalGeofence.minTileX);
            expect(fullObj.maxTileX).to.equal(originalGeofence.maxTileX);
            expect(fullObj.minTileY).to.equal(originalGeofence.minTileY);
            expect(fullObj.maxTileY).to.equal(originalGeofence.maxTileY);
            expect(fullObj.tiles).to.equal(originalGeofence.tiles);
        });

        it('loads back into the same object', function() {
            var fullObj = originalGeofence.save();
            var secondGeofence = Geofence.load(fullObj);
            expect(fullObj.version).to.equal(secondGeofence.version);
            expect(fullObj.vertices).to.equal(secondGeofence.vertices);
            expect(fullObj.holes).to.equal(secondGeofence.holes);
            expect(fullObj.granularity).to.equal(secondGeofence.granularity);
            expect(fullObj.minX).to.equal(secondGeofence.minX);
            expect(fullObj.maxX).to.equal(secondGeofence.maxX);
            expect(fullObj.minY).to.equal(secondGeofence.minY);
            expect(fullObj.maxY).to.equal(secondGeofence.maxY);
            expect(fullObj.tileWidth).to.equal(secondGeofence.tileWidth);
            expect(fullObj.tileHeight).to.equal(secondGeofence.tileHeight);
            expect(fullObj.minTileX).to.equal(secondGeofence.minTileX);
            expect(fullObj.maxTileX).to.equal(secondGeofence.maxTileX);
            expect(fullObj.minTileY).to.equal(secondGeofence.minTileY);
            expect(fullObj.maxTileY).to.equal(secondGeofence.maxTileY);
            expect(fullObj.tiles).to.equal(secondGeofence.tiles);
        });

        it('saves minimal objects as expected', function() {
            var smallObj = originalGeofence.save(false);
            expect(smallObj.version).to.equal(originalGeofence.version);
            expect(smallObj.vertices).to.equal(originalGeofence.vertices);
            expect(smallObj.holes).to.equal(originalGeofence.holes);
            expect(smallObj.granularity).to.equal(originalGeofence.granularity);
        });

        it('loads minimal objects as expected', function() {
            var smallObj = originalGeofence.save(false);
            var secondGeofence = Geofence.load(smallObj);
            expect(smallObj.version).to.equal(secondGeofence.version);
            expect(smallObj.vertices).to.equal(secondGeofence.vertices);
            expect(smallObj.holes).to.equal(secondGeofence.holes);
            expect(smallObj.granularity).to.equal(secondGeofence.granularity);
            expect(originalGeofence.minX).to.equal(secondGeofence.minX);
            expect(originalGeofence.maxX).to.equal(secondGeofence.maxX);
            expect(originalGeofence.minY).to.equal(secondGeofence.minY);
            expect(originalGeofence.maxY).to.equal(secondGeofence.maxY);
            expect(originalGeofence.tileWidth).to.equal(secondGeofence.tileWidth);
            expect(originalGeofence.tileHeight).to.equal(secondGeofence.tileHeight);
            expect(originalGeofence.minTileX).to.equal(secondGeofence.minTileX);
            expect(originalGeofence.maxTileX).to.equal(secondGeofence.maxTileX);
            expect(originalGeofence.minTileY).to.equal(secondGeofence.minTileY);
            expect(originalGeofence.maxTileY).to.equal(secondGeofence.maxTileY);
            expect(JSON.stringify(originalGeofence.tiles)).to.equal(JSON.stringify(secondGeofence.tiles));
        });

        it('should produce equal lookup results before and after serialization and deserialization', function() {
            var fullObj = originalGeofence.save();
            var secondGeofence = Geofence.load(fullObj);
            expect(originalGeofence.inside([1, 1])).to.equal(secondGeofence.inside([1, 1]));
            expect(originalGeofence.inside([6, 6])).to.equal(secondGeofence.inside([6, 6]));
        });

        it('should generate a valid object even if the version is off as long as the object quacks like a duck', function() {
            var fullObj = originalGeofence.save();
            delete fullObj.tiles;
            fullObj.version = '999.99.9';
            var secondGeofence = Geofence.load(fullObj);
            expect(originalGeofence.inside([1, 1])).to.equal(secondGeofence.inside([1, 1]));
            expect(originalGeofence.inside([6, 6])).to.equal(secondGeofence.inside([6, 6]));
        });

        it('should generate a valid object even if the version is off with holes, too', function() {
            var hole = [
                [-1, -1],
                [1, -1],
                [0, 1]
            ];
            var holeyGeofenceBatman = new Geofence([bounds, hole]);
            var fullObj = holeyGeofenceBatman.save();
            delete fullObj.tiles;
            fullObj.version = '999.99.9';
            var holeyMoleyGeofences = Geofence.load(fullObj);
            expect(holeyGeofenceBatman.inside([0, 0])).to.equal(holeyMoleyGeofences.inside([0, 0]));
            expect(holeyGeofenceBatman.inside([3, 3])).to.equal(holeyMoleyGeofences.inside([3, 3]));
            expect(holeyGeofenceBatman.inside([6, 6])).to.equal(holeyMoleyGeofences.inside([6, 6]));
        });

        it('should throw an error if the serialized object is too different from the expected format', function() {
            var json = { lol: 'json', version: 'blah' };
            try {
                Geofence.load(json);
            } catch(e) {
                expect(e.message).to.equal('Serialized Geofence at version blah wildly different from current version ' + originalGeofence.version);
            }
        });
    });
});

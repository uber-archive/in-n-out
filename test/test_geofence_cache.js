var Geofence = require('../lib/geofence');
var GeofenceCache = require('../lib/geofence_cache');
var expect = require('chai').expect;

describe('Geofence', function() {
    it('produces different objects', function() {
        var gf1 = new Geofence([[10,10], [100,10], [100,50], [10,50]]);
        var gf2 = new Geofence([[10,10], [100,10], [100,50], [10,50]]);

        expect(gf1).to.not.equal(gf2);
    });
});

describe('GeofenceCache', function() {
    var cache = new GeofenceCache();
    var count = 0;
    cache.on('log', function () {
        count++;
    });

    it('produces the same object for the same input', function() {
        var gf1 = cache.getGeo([[10,10], [100,10], [100,50], [10,50]]);
        var gf2 = cache.getGeo([[10,10], [100,10], [100,50], [10,50]]);

        expect(gf1).to.equal(gf2);
    });

    it('produces different objects for different inputs', function() {
        var gf1 = cache.getGeo([[10,10], [100,10], [100,50], [10,50]]);
        var gf2 = cache.getGeo([[20,20], [40,20], [40,30], [20,30]]);

        expect(gf1).to.not.equal(gf2);
    });

    it('should log when building a new geofence', function () {
        expect(count).to.equal(2);
    });
});

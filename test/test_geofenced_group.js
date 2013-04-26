var expect = require('chai').expect;

var utils = require('../lib/utils');
var Geofence = require('../lib/geofence');
var GeofencedGroup = require('../lib/geofenced_group');

var gfg = new GeofencedGroup();

var wogf1 = new Geofence([[10,10], [100,10], [100,50], [10,50]]);
var bogf1 = new Geofence([[20,20], [40,20], [40,30], [20,30]]); // Inside whiteout 1
var bogf2 = new Geofence([[50,22], [60,22], [60,26], [50,26]]); // Inside whiteout 2, not overlapping blackout 2

var wogf2 = new Geofence([[200,5], [300,5], [300,100], [200,100]]); // Completely outside whiteout 1

gfg.add(1, [wogf1, wogf2], [bogf1, bogf2]);
gfg.add(2, [wogf1]);
gfg.add(3, [], null);
gfg.add(4, null, [bogf2]);

describe('GeofencedGroup.getValid()', function() {
    it('a point far out should include 3, 4', function() {
        expect(gfg.getValidKeys(1000,1000)).to.deep.equal([3, 4]);
    });

    it('a point in whiteout 1 should include 1, 2, 3', function() {
        expect(gfg.getValidKeys([15, 15])).to.deep.equal([1, 2, 3, 4]);
    });

    it('a point in whiteout 2 should include 1, 2, 3', function() {
        expect(gfg.getValidKeys([250, 10])).to.deep.equal([1, 3, 4]);
    });

    it('a point in blackout 1 should include 2, 3, 4', function() {
        expect(gfg.getValidKeys([25, 25])).to.deep.equal([2, 3, 4]);
    });

    it('a point in blackout 2 should include 2, 3', function() {
        expect(gfg.getValidKeys([55, 25])).to.deep.equal([2, 3]);
    });
});

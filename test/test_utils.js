
var expect = require('chai').expect;

var utils = require('../lib/utils');

describe('vectorCrossProduct', function() {
    it('of two parallel vectors', function() {
        expect(utils.vectorCrossProduct([1,1], [10,10])).to.equal(0);
    });

    it('of two vectors in reverse order', function() {
       expect(utils.vectorCrossProduct([5,10], [10,10])).to.equal(-utils.vectorCrossProduct([10,10],[5,10]));
    });
});

describe('vectorDifference', function() {
    it('of two equal vectors', function() {
        expect(utils.vectorDifference([4,3], [4,3])).to.deep.equal([0,0]);
    });

    it('of two opposite vectors', function() {
        expect(utils.vectorDifference([4,3], [-4,-3])).to.deep.equal([8,6]);
    });

    it('of two random vectors', function() {
        expect(utils.vectorDifference([10,4], [5,0])).to.deep.equal([5,4]);
    });
});

describe('segmentsIntersect', function() {
    it('with perpendicular intersecting segments', function() {
        expect(utils.segmentsIntersect([0,2], [10,2], [5,0], [5,100])).to.equal(true);
    });

    it('with oblique intersecting segments', function() {
        expect(utils.segmentsIntersect([0,2], [10,2], [5,0], [6,100])).to.equal(true);
    });

    it('with perpendicular skewed segments', function() {
        expect(utils.segmentsIntersect([0,2], [10,2], [15,0], [15,100])).to.equal(false);
    });

    it('with oblique skewed segments', function() {
        expect(utils.segmentsIntersect([0,2], [10,2], [10,10], [100,100])).to.equal(false);
    });

    it('parallel segments', function() {
        expect(utils.segmentsIntersect([0,0], [10,10], [0,10], [10,20])).to.equal(false);
    });

    it('collinear segments', function() {
        expect(utils.segmentsIntersect([1,1], [10,10], [5,5], [100,100])).to.equal(true);
    });
});

describe('haveIntersectingEdges', function() {
    it('two identical polygons', function() {
        expect(utils.haveIntersectingEdges([[1,1], [2,3], [5,5]], [[1,1], [2,3], [5,5]])).to.equal(true);
    });

    it('two edge overlapping polygons', function() {
        expect(utils.haveIntersectingEdges([[0,0], [1,0], [1,1], [0,1], [0,0]], [[0.5,0.5], [1.5,0.5], [1.5,1.5], [0.5,1.5], [0.5,0.5]])).to.equal(true);
    });

    it('two area overlapping polygons', function() {
        expect(utils.haveIntersectingEdges([[0,0], [1,0], [1,1], [0,1], [0,0]], [[-0.5,-0.5], [1.5,-0.5], [1.5,1.5], [-0.5,1.5], [-0.5,-0.5]])).to.equal(false);
    });
});

describe('pointInPolygon', function() {
    it('point on edge of polygon', function() {
        expect(utils.pointInPolygon([0.5, 1], [[0,0], [1,0], [1,1], [0,1], [0,0]])).to.equal(false);
    });

    it('point inside polygon', function() {
        expect(utils.pointInPolygon([0.5, 0.1], [[0,0], [1,0], [1,1], [0,1], [0,0]])).to.equal(true);
    });

    it('point outside polygon', function() {
        expect(utils.pointInPolygon([10, 0.1], [[0,0], [1,0], [1,1], [0,1], [0,0]])).to.equal(false);
    });
});


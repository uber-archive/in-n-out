
var expect = require('chai').expect;

var utils = require('../lib/utils');
var geofence = require('../lib/geofence');

var randomPoint = function() { return [Math.random()*2000 - 1000, Math.random()*2000 - 1000]; };
var randomPolygon = function() {
    var polygon = [];
    while(polygon.length < 1000) {
        polygon.push(randomPoint());
    }

    return polygon;
};

describe('Geofence.inside()', function() {
    it('should always equal utils.pointInPolygon', function() {
        var polygon = randomPolygon();
        var gf = new geofence(polygon);
        var point = null;
        for (var x = 0; x < 1000; x++) {
            point = randomPoint();
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
        ].map(function(point) { return [point[0]*100/180, point[1]*100/90]; });

        var gf = new geofence(polygon);
        var point = null;

        var timeFunction = function(fn, iterations) {
            var start = Date.now();
            for (var x = 0; x < iterations; x++) {
                fn();
            }
            return Date.now() - start;
        };

        var gfTime = timeFunction(function() {
            point = randomPoint();
            gf.inside(point);
            gf.inside(point);
        }, 10000);

        var inTime = timeFunction(function() {
            point = randomPoint();
            // utils.pointInPolygon(point, polygon);
            gf.inside(point);
        }, 10000);

        expect(gfTime).to.be.below(inTime);
    });
});
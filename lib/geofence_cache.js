var crypto = require('crypto');
var util = require("util");
var events = require("events");
var Geofence = require('./geofence');


function GeofenceCache() {
    events.EventEmitter.call(this);
    this.cacheData = {};
}

util.inherits(GeofenceCache, events.EventEmitter);


GeofenceCache.hashGeo = function hashGeo(coordinates) {
    var json = JSON.stringify(coordinates);
    var hash = crypto.createHash('sha1');
    hash.update(json);
    return hash.digest('base64');
};


GeofenceCache.prototype.getGeo = function getGeo(coordinates, options) {
    options = options || {};
    var hash = GeofenceCache.hashGeo(coordinates);
    var geo = this.cacheData[hash];
    if (!geo) {
        this.emit('log', 'info', 'built geo', {region: options.region, hash: hash});
        geo = new Geofence(coordinates);
        this.cacheData[hash] = geo;
    }
    return geo;
};


module.exports = GeofenceCache;
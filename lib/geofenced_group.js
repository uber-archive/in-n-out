var Geofence = require('./geofence');

var Entry = function(id, whiteoutGfs, blackoutGfs) {
    this.id = id;
    this.whiteouts = whiteouts;
    this.blackouts = blackouts;

    return this;
};

var GeofencedGroup = function() {
    this.entries = {};

    return this;
};

GeofencedGroup.prototype = {
    add: function(id, whiteoutPolys, blackoutPolys) {
        var whiteoutGfs = Array.isArray(whiteoutPolys) ? whiteoutPolys.map(function(poly) { return new Geofence(poly);}) : null;
        var blackoutGfs = Array.isArray(blackoutPolys) ? blackoutPolys.map(function(poly) { return new Geofence(poly);}) : null;

        this.entries[id] = new Entry(id, whiteoutGfs, blackoutGfs);

        return;
    },

    isValid: function(point, entry) {
        var x;

        if (entry.blackouts) {
            for (x = 0; x < entry.blackouts.length; x++) {
                if (entry.blackouts[x].inside(point)) {
                    return false;
                }
            }
        }

        if (entry.whiteouts) {
            for (x = 0; x < entry.whiteouts.length; x++) {
                if (!entry.whiteouts[x].inside(point)) {
                    return false;
                }
            }
        }

        return true;
    },

    getValid: function(point) {
        var valid = [];
        var entry = null;

        for (var id in this.entries) {
            if (this.isValid(this.entries[id])) {
                valid.push(id);
            }
        }

        return valid;
    }
};

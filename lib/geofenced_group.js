var Geofence = require('./geofence');

var Entry = function(id, whiteoutGfs, blackoutGfs) {
    this.id = id;
    this.whiteouts = whiteoutGfs;
    this.blackouts = blackoutGfs;

    return this;
};

var GeofencedGroup = function() {
    this.entries = [];

    return this;
};

GeofencedGroup.prototype = {
    add: function(id, whiteoutGfs, blackoutGfs) {
        for (var x = 0; x < this.entries.length; x++) {
            if (this.entries[x].id === id) {
                this.entries.splice(x, 1);
                return;
            }
        }

        this.entries.push(new Entry(id, whiteoutGfs, blackoutGfs));

        return;
    },

    isValidKey: function(point, id) {
        var entry = null;
        for (var x = 0; x < this.entries.length; x++) {
            entry = this.entries[x];
            if (entry.id === id) {
                return GeofencedGroup.isPointValid(point, entry.whiteouts, entry.blackouts);
            }
        }

        return false;
    },

    getValidKeys: function(point) {
        var valid = [];
        var entry = null;

        for (var x = 0; x < this.entries.length; x++) {
            entry = this.entries[x];
            if (GeofencedGroup.isPointValid(point, entry.whiteouts, entry.blackouts)) {
                valid.push(entry.id);
            }
        }

        return valid;
    }
};

GeofencedGroup.isPointValid = function(point, whiteoutGfs, blackoutGfs) {
    var x;

    if (blackoutGfs) {
        for (x = 0; x < blackoutGfs.length; x++) {
            if (blackoutGfs[x].inside(point)) {
                return false;
            }
        }
    }

    if (whiteoutGfs) {
        for (x = 0; x < whiteoutGfs.length; x++) {
            if (whiteoutGfs[x].inside(point)) {
                return true;
            }
        }

        return false;
    }

    return true;
};

module.exports = GeofencedGroup;

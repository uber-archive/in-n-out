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

    isValidEntry: function(point, entry) {
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
                if (entry.whiteouts[x].inside(point)) {
                    return true;
                }
            }

            return false;
        }

        return true;
    },

    isValid: function(point, id) {
        for (var x = 0; x < this.entries.length; x++) {
            if (this.extries[x].id === id) {
                return this.isValidEntry(point, this.entries[x]);
            }
        }

        return false;
    },

    getValid: function(point) {
        var valid = [];
        var entry = null;

        for (var x = 0; x < this.entries.length; x++) {
            if (this.isValidEntry(point, this.entries[x])) {
                valid.push(this.entries[x].id);
            }
        }

        return valid;
    }
};

module.exports = GeofencedGroup;

var Geofence = require('./geofence');
var utils = require('./utils');

var Entry = function(id, whiteoutGfs, blackoutGfs) {
    this.id = id;
    this.whiteouts = whiteoutGfs;
    this.blackouts = blackoutGfs;
    this.minX = this.minY = Infinity;
    this.maxX = this.maxY = -Infinity;
    
    if (whiteoutGfs == false && blackoutGfs == false) {
        // should assert false?
        return this;
    }
    if (whiteoutGfs) {
        for (var i = 0; i < whiteoutGfs.length; i++) {
            this.minX = Math.min(this.minX, whiteoutGfs[i].minX);
            this.minY = Math.min(this.minY, whiteoutGfs[i].minY);
            this.maxX = Math.max(this.maxX, whiteoutGfs[i].maxX);
            this.maxY = Math.max(this.maxY, whiteoutGfs[i].maxY);
        }
    }
    if (blackoutGfs) {
        for (var i = 0; i < blackoutGfs.length; i++) {
            this.minX = Math.min(this.minX, blackoutGfs[i].minX);
            this.minY = Math.min(this.minY, blackoutGfs[i].minY);
            this.maxX = Math.max(this.maxX, blackoutGfs[i].maxX);
            this.maxY = Math.max(this.maxY, blackoutGfs[i].maxY);
        }
    }

    return this;
};

var GeofencedGroup = function(granularity) {
    this.entries = {};
    // A group has a master grid
    this.granularity = Math.floor(granularity) || 10;
    // bound box for all the geofences
    this.minX = this.minY = Infinity;
    this.maxX = this.maxY = -Infinity;
    this.tileWidth = null;
    this.tileHeight = null;

    this.tiles = [];
    this.blackOnlyIds = [];

    return this;
};

GeofencedGroup.prototype = {
    add: function(id, whiteoutGfs, blackoutGfs) {
        if (typeof id !== "number") {
            return;
        }
        this.remove(id);
        var entry = new Entry(id, whiteoutGfs, blackoutGfs);
        this.updateMasterGrid(entry);
        this.addEntryToMasterGrid(entry);
        this.entries[entry.id] = entry;
        return;
    },

    remove: function(id) {
        delete this.entries[id];
        for (var i = 0; i < this.tiles.length; i++) {
            if (typeof this.tiles[i] !== "undefined") {
                var index = this.tiles[i].indexOf(id);
                if (index !== -1) {
                    this.tiles[i].splice(index, 1);
                }
            }
        }
        index = this.blackOnlyIds.indexOf(id);
        if (index !== -1) {
            this.blackOnlyIds.splice(index, 1);
        }
    },

    // Add a new entry to the master grid. This method will call
    // makeGrid for the entry using the master grid and put each tile of the master grid
    addEntryToMasterGrid: function(entry) {
  
        var allGfs = [].concat(entry.blackouts, entry.whiteouts);

        for (var i = 0; i < allGfs.length; i++) {
            var oneGfTiles = allGfs[i] && allGfs[i].makeGrid(this, this.granularity);
            for (var hash in oneGfTiles) {
                if (oneGfTiles[hash] === 'i' || oneGfTiles[hash] === 'x') {
                    if (typeof this.tiles[hash] == "undefined") {
                        this.tiles[hash] = [];
                    }
                    //console.log("Hash " + hash + " contains id " + allGfs[i].id);
                    if (this.tiles[hash].indexOf(entry.id) === -1) {
                        this.tiles[hash].push(entry.id);
                    }
                }
            }
        }

        if (!entry.whiteouts || entry.whiteouts.length === 0) {
            this.blackOnlyIds.push(entry.id);
        }
    },

    // Update the master grid with a new entry. If the new entry cannot be
    // contained with existing bbox, then we will change the bbox, and re-gridify
    // all existing entries according to the new bbox.
    updateMasterGrid: function(entry) {
        if (this.minX <= entry.minX && this.minY <= entry.minY
            && this.maxX >= entry.maxX && this.maxY >= entry.maxY) {
            // no need to update, current master grids covers
            //console.log("entry " + entry.id + " is contained in existing bbox");
            return;
        }

        //console.dir("Updating master grid with entry " + entry.id);
        //console.log(this.minX, this.minY, this.maxX, this.maxY);
        
        // update grids and re-add all existing entries
        this.minX = Math.min(this.minX, entry.minX);
        this.maxX = Math.max(this.maxX, entry.maxX);
        this.minY = Math.min(this.minY, entry.minY);
        this.maxY = Math.max(this.maxY, entry.maxY);
        this.tileWidth = (this.maxX - this.minX) / this.granularity;
        this.tileHeight = (this.maxY - this.minY) / this.granularity;
        this.minTileX = utils.project(this.minX, this.tileWidth);
        this.minTileY = utils.project(this.minY, this.tileHeight);
      
        this.tiles = [];
        this.blackOnlyIds = [];

        for (var id in this.entries) {
            this.addEntryToMasterGrid(this.entries[id]);
        }

        //console.log("bound box changes after adding entry " + entry.id);
    },
    
    isValidKey: function(point, id) {
        var entry = null;
        if (!id in this.entries) {
            return false;
        }
        return GeofencedGroup.isPointValid(point, entry[id].whiteouts, entry[id].blackouts);
    },

    // This is the brute force implementation that does not use master grid
    getValidKeysBF: function(point) {
        var valid = [];
        var entry = null;

        for (var id in this.entries) {
            entry = this.entries[id];
            if (GeofencedGroup.isPointValid(point, entry.whiteouts, entry.blackouts)) {
                valid.push(entry.id);
            }
        }

        return valid;
    },

    getValidKeys: function(point) {
        if (!this.entries) {
            return [];
        }
        
        var result = [];
        var blacks = []; // verified to be blacked out Ids in the hashed tile

        if (point[0] < this.minX || point[0] > this.maxX ||
            point[1] < this.minY || point[1] > this.maxY) {
            return this.blackOnlyIds;
        }

        var hash = (utils.project(point[1], this.tileHeight) - this.minTileY) * this.granularity
            + (utils.project(point[0], this.tileWidth) - this.minTileX);

        if (typeof this.tiles[hash] === "undefined") {
            return this.blackOnlyIds;
        }
        //console.log("Hash: %d", tileHash);
        //console.log("point = " + point + ", hash = " + hash + ", bOnly = " + this.blackOnlyIds);
        //console.dir(this.tiles[hash]);
        
        // the valid Ids for this tile is determined in the following way
        // blackOnlyIds + (confirmed Ids in tiles[hash]) - (negatively conformed in tiles[hash])
        for (var i in this.tiles[hash]) {
            var id = this.tiles[hash][i];
            if (GeofencedGroup.isPointValid(point, this.entries[id].whiteouts, this.entries[id].blackouts)) {
                result.push(id);
            } else {
                blacks.push(id);
            }
        }

        for (var i in this.blackOnlyIds) {
            if (blacks.indexOf(this.blackOnlyIds[i]) === -1 && result.indexOf(this.blackOnlyIds[i]) === -1) {
                result.push(this.blackOnlyIds[i]);
            }
        }

        return result;
    }
};

GeofencedGroup.isPointValid = function(point, whiteoutGfs, blackoutGfs) {
    var x;

    // If a point is inside ANY of the blackout geofences, then it's not valid
    if (blackoutGfs) {
        for (x = 0; x < blackoutGfs.length; x++) {
            if (blackoutGfs[x].inside(point)) {
                //console.log("point " + point + " blackout by #" + x);
                return false;
            }
        }
    }

    // If a point is inside ANY of the whiteout geofences, then it's valid
    if (whiteoutGfs && whiteoutGfs.length) {
        for (x = 0; x < whiteoutGfs.length; x++) {
            if (whiteoutGfs[x].inside(point)) {
                //console.log("point " + point + " whiteout by #" + whiteoutGfs[x].vertices);
                return true;
            }
        }

        // If there are whiteout geofences, and the point is not inside ANY of them, then it's invalid
        return false;
    }

    // Not inside any blackouts and there are no whiteouts, so the point is valid
    return true;
};

module.exports = GeofencedGroup;

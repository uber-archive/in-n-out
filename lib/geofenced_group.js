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

    this.minX = this.minY = Infinity;
    this.maxX = this.maxY = -Infinity;
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
    // left-bottom point for the master grid. Following the same way Geofence
    // creates the grid, this point is different than [minX, minY]
    this.minGridX = this.minGridY = null;

    // We use three sets keeps track of the Ids for each tile
    // tiles['w'][X] is the Ids that white out the tile X
    // tiles['b'][X] is the Ids that black out the tile
    // tiles['?'][X] is the Ids that need to be verified by calling inside()
    this.tiles = {'w': [], 'b': [], '?': []};
    this.blackOnlyIds = {};
    return this;
};

GeofencedGroup.prototype = {
    add: function(id, whiteoutGfs, blackoutGfs) {
        this.remove(id);
        var entry = new Entry(id, whiteoutGfs, blackoutGfs);
        this.updateMasterGrid(entry);
        this.addEntryToMasterGrid(entry);
        this.entries[entry.id] = entry;
        return;
    },

    remove: function(id) {
        delete this.entries[id];
        var removeId = function(arr, id) {
            for (var i = 0; i < arr.length; i++) {
                if (typeof arr[i] != "undefined") {
                    delete arr[i][id];
                }
            }
        }
        removeId(this.tiles['w'], id);
        removeId(this.tiles['b'], id);
        removeId(this.tiles['?'], id);
        delete this.blackOnlyIds[id];
    },

    // Add a new entry to the master grid. This method will call
    // makeGrid for the entry using the master grid and put each tile of the master grid
    // in the 'w', 'b', or '?' sets
    addEntryToMasterGrid: function(entry) {
        var tiles = this.tiles;
        boundBox = {minX: this.minX, minY: this.minY, maxX: this.maxX, maxY: this.maxY};
        var addId = function(arr, hash, id) {
            if (typeof arr[hash] == "undefined") {
                arr[hash] = {}
            }
            arr[hash][id] = true;
        }
 
        var hasId = function(arr, hash, id) {
            return (typeof arr[hash] != "undefined") && (id in arr[hash]);
        }
  
        if (entry.blackouts) {
            for (var i = 0; i < entry.blackouts.length; i++) {
                entry.blackouts[i].makeGrid(boundBox, this.granularity,
                    function(hash, state) {
                        // console.log("add blackouts hash=" + hash + ", state=" + state);
                        if (state === 'i') {
                            addId(tiles['b'], hash, entry.id);
                        } else if (state === 'x') {
                            addId(tiles['?'], hash, entry.id);
                        }
                    }
                );
            }
        }
        
        if (!entry.whiteouts || entry.whiteouts.length === 0) {
            this.blackOnlyIds[entry.id] = true;
        }

        if (entry.whiteouts) {
            for (var i = 0; i < entry.whiteouts.length; i++) {
                entry.whiteouts[i].makeGrid(boundBox, this.granularity,
                    function(hash, state) {
                        if (state === 'i' && !hasId(tiles['b'], hash, entry.id) &&
                            !hasId(tiles['?'], hash, entry.id)) {
                            addId(tiles['w'], hash, entry.id);
                        } else if (state === 'x' && !hasId(tiles['b'], hash, entry.id) &&
                            !hasId(tiles['w'], hash, entry.id)) {
                            addId(tiles['?'], hash, entry.id);
                        }
                    }
                );
            }
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

        //console.dir(entry);
        //console.log(this.minX, this.minY, this.maxX, this.maxY);
        // update grids and re-add all existing entries
        this.minX = Math.min(this.minX, entry.minX);
        this.maxX = Math.max(this.maxX, entry.maxX);
        this.minY = Math.min(this.minY, entry.minY);
        this.maxY = Math.max(this.maxY, entry.maxY);
        this.tileWidth = (this.maxX - this.minX) / this.granularity;
        this.tileHeight = (this.maxY - this.minY) / this.granularity;
        this.minGridX = utils.project(this.minX, this.tileWidth) * this.tileWidth;
        this.minGridY = utils.project(this.minY, this.tileHeight) * this.tileHeight;
        this.tiles = {'w': [], 'b': [], '?': []};
        this.blackOnlyIds = {};

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
        
        var result = {}
        // start with blackOnlyIds
        for (var id in this.blackOnlyIds) {
            result[id] = true;
        }

        // if out of the boundBox, return all blackOnly Ids
        if (point[0] < this.minX || point[0] > this.maxX ||
            point[1] < this.minY || point[1] > this.maxY) {
            return Object.keys(result).map(Number);
        }
       
        var hash = Math.floor((point[1] - this.minGridY) / this.tileHeight) * this.granularity
            + Math.floor((point[0] - this.minGridX) / this.tileWidth);

        // the valid Ids for this tile is determined in the following way
        // blackOnlyIds + (Ids in 'w' set) - (Ids in 'b' set)
        //     + (confirmed Ids in '?' set) - (negatively conformed Ids in '?' set)
        var tiles = this.tiles;
        var entries = this.entries;

        //console.log("point = " + point + ", hash = " + hash + ", blackOnly = " + Object.keys(result));
        //console.dir(tiles['w'][hash]);
        //console.dir(tiles['b'][hash]);
        //console.dir(tiles['?'][hash]);

        for (var id in tiles['w'][hash]) {
            result[id] = true;
        }

        //console.log(result);
        for (var id in tiles['?'][hash]) {
            if (GeofencedGroup.isPointValid(point, entries[id].whiteouts, entries[id].blackouts)) {
                result[id] = true;
            } else {
                delete result[id];
            }
        }
            
        for (var id in tiles['b'][hash]) {
            delete result[id];
        }

        //return Object.keys(result).map(Number).sort(function(a, b) { return a - b; });
        // map() is slower than straightforward loop
        var arr = [];
        for (var id in result) {
            arr.push(Number(id));
        }

        return arr;
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

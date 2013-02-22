in-n-out
========

A library to perform point-in-geofence searches. A tiled cache is used to determine inclusion very efficiently, so the library is tailored for create once, query many times uses.

Install
-------
<pre>npm install in-n-out</pre>

Geofence(vertices, granularity = 20)
------------------------------------
Using the Geofence class you can determine whether a point is inside the geofence or not. Upon construction, the geofence's bounding box is broken down into tiles. The tiles that either intersect or are inside the geofence are tracked in a hash table. Geofence.inside() queries then use this cache to quickly answer inside() queries.

<pre>
var InNOut = require('in-n-out');
var gf = new InNOut.Geofence([[0,0], [1,0], [1,1], [0,1], [0,0]], 100);

gf.inside([0.5,0.5]); // true
gf.inside([100,100]); // false
</pre>

The geofence's bbox will be broken down into a granularity x granylarity grid, defaulting to 20x20.

GeofencedGroup(id, whiteoutGfs[], blackoutGfs[])
--------------------------------------------
Used to determine which ids are valid for a given location, based on the whiteout and blackout geofence rules provided for each id. A typical use case is geofence triggers for loccations, offering location based services or denying services based on location.

<pre>
var InNOut = require('in-n-out');
var whiteoutGf = new InNOut.Geofence([[0,0], [1,0], [1,1], [0,1], [0,0]]);
var blackoutGf = new InNOut.Geofence([[0.5,0], [1,0], [1,1], [0.5,1], [0.5, 0]]);
var gfGroup = new InNOut.GeofencedGroup();

gfGroup.add(1, [whiteoutGf], [blackoutGf]);

gfGroup.getValid([0.1, 0.1]); // [1] - Included by whiteout
gfGroup.getValid([0.6, 0.6]); // [] - Excluded by blackout
gfGroup.getValid([100, 100]); // [] - Excluded by whiteout
</pre>

The inclusion logic is as follows:
* If there are blackout zones, exclude the point if it is inside any of them
* If there are whiteout zones
*   Include the point if it is inside of any of them
*   Exclude the point otherwise
* Include the point

Passing null for the geofence arrays is the same as [].

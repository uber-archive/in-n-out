in-n-out [![NPM version](https://badge.fury.io/js/in-n-out.png)](http://badge.fury.io/js/in-n-out) [![Dependency Status](https://gemnasium.com/uber/in-n-out.png)](https://gemnasium.com/uber/in-n-out) [![Build Status](https://travis-ci.org/uber/in-n-out.png?branch=master)](https://travis-ci.org/uber/in-n-out)
========

A library to perform point-in-geofence searches. A tiled cache is used to determine inclusion very efficiently, so the library is tailored for create once, query many times uses.

Geofence.inside() should be faster than utils.pointInPolygon: iterations: 1000000, innout: 48ms, pointinpolygon: 747ms

Install
-------
<pre>npm install in-n-out</pre>

Geofence(vertices, granularity = 20)
------------------------------------
Using the Geofence class you can determine whether a point is inside the geofence or not. Upon construction, the geofence's bounding box is broken down into tiles. The tiles that either intersect or are inside the geofence are tracked in a hash table. ``Geofence.inside()`` queries then use this cache to quickly answer ``inside()`` queries.

```js
var InNOut = require('in-n-out');
var gf = new InNOut.Geofence([[0,0], [1,0], [1,1], [0,1], [0,0]], 100);

gf.inside([0.5,0.5]); // true
gf.inside([100,100]); // false
```

Just like GeoJSON supports [interior rings](http://www.geojson.org/geojson-spec.html#polygon)
for polygons, the ``Geofence`` class may also be passed multiple sets of
vertices. If you do, the first set is taken to be the exterior ring, and all
subsequent sets are taken as interior rings ("holes").

The geofence's bbox will be broken down into a granularity x granylarity grid, defaulting to 20x20.

GeofencedGroup(id, whiteoutGfs[], blackoutGfs[])
------------------------------------------------
Used to determine which ids are valid for a given location, based on the whiteout and blackout geofence rules provided for each id. A typical use case is geofence triggers for loccations, offering location based services or denying services based on location.

```js
var InNOut = require('in-n-out');
var whiteoutGf = new InNOut.Geofence([[0,0], [1,0], [1,1], [0,1], [0,0]]);
var blackoutGf = new InNOut.Geofence([[0.5,0], [1,0], [1,1], [0.5,1], [0.5, 0]]);
var gfGroup = new InNOut.GeofencedGroup();

gfGroup.add(1, [whiteoutGf], [blackoutGf]);

gfGroup.getValidKeys([0.1, 0.1]); // [1] - Included by whiteout
gfGroup.getValidKeys([0.6, 0.6]); // [] - Excluded by blackout
gfGroup.getValidKeys([100, 100]); // [] - Excluded by whiteout
```

The inclusion logic is as follows:
* If there are blackout zones, exclude the point if it is inside any of them
* If there are whiteout zones
  * Include the point if it is inside of any of them
  * Exclude the point otherwise
* Include the point

Passing null for the geofence arrays is the same as ``[]``.

GeofenceCache
-------------
This provides a relatively primitive caching mechanism which allows you to bypass tile creation for identical geofences.  It's basically a drop-in replacement for `new Geofence()`.  It keeps all geofences around so if you use many of them you'll run out of memory.

```js
var geofenceCache = new GeofenceCache();
var geo = geofenceCache.getGeo([[0,0], [1,0], [1,1], [0,1], [0,0]];
```

License (MIT)
-------------
Copyright (C) 2013 by Uber Technologies, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

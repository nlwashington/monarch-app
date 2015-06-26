/*
 	Package: datamanager.js

 	Class: DataManager
		handles all interaction with the data, from fetching from external 
 		servers, transformation and storage.
 
 	Parameters:
 		dataLoader - reference to the dataLoader 	
*/
var DataManager = function(dataLoader) {
	this.dataLoader = dataLoader;

	// inject data
	this.target = this.dataLoader.getTargets();
	this.source = this.dataLoader.getSources();
	this.cellData = this.dataLoader.getCellData();
};

DataManager.prototype = {
	constructor: DataManager,

	/*
		Function: isInitialized
			check to see if datasets have been initialized 

		Returns:
			boolean
	*/	
	isInitialized: function() {
		var targetSize = Object.keys(this.target).length;
		var sourceSize = Object.keys(this.source).length;

		if (sourceSize > 0 && targetSize > 0) {
			this.initialized = true;
		} else {
			this.initialized = false;
		}
		return this.initialized;
	},
	/*
		Function: getOriginalSource
			gets the original source listing used for query 

		Returns:
			array of objects
	*/
	getOriginalSource: function() {
		return this.qrySourceList;
	},
	/*
		Function: getData
			gets a list of entries from specified dataset

		Parameters:
			dataset - which data set array to return (i.e., source, target, cellData)
			species - optional, species name

		Returns:
			array of objects
	*/	
	getData: function(dataset, species) {
		if (species != null) {
			return this[dataset][species];
		}
		return this[dataset];
	},
	/*
		Function: length
			provides the length of specified data structure

		Parameters:
			dataset - which data set array to return (i.e., source, target, cellData)
			species - optional, species name

		Return:
			length
	*/	
	length: function(dataset, species) {
		var len = 0, a;
			if (species == null) {
				a = this[dataset];
			} else {
				a = this[dataset][species];
			}
			len = Object.keys(a).length;
		return len;
	},
	/*
		Function: cellPointMatch
			takes to a key pair and matches it to the cellData point

		Parameters:
			key1 - first key to match
			key2  - second key to match
			species - species name

		Returns:
			match - matching object
	*/
 	cellPointMatch: function (key1, key2, species) {

	     var rec= null;
	     if (typeof(this.cellData[species]) !== 'undefined') {
		 if (typeof(this.cellData[species][key1]) !== 'undefined') {
		     if (typeof (this.cellData[species][key1][key2]) !== 'undefined') {
			 rec = this.cellData[species][key1][key2];
		     }
		 } else if (typeof(this.cellData[species][key2]) !== 'undefined') {
		     if (typeof(this.cellData[species][key2][key1]) !== 'undefined') {
			 rec = this.cellData[species][key2][key1];
		     }
		 }
	     }
	     return rec
	 },

        // list of everything tht matches key - either as source or target.
        // two possibilities - either key is a source, in which case I get the whole list
        // or its a target, in which case I look in each source... 
 	matches: function (key, species) {
	    var matchList = [];
	    var cd = this.cellData; // convenience pointer. Good for scoping
	    if (typeof (cd[species]) != 'undefined')  {
		// it's  a source. grab all of them
		if (typeof (cd[species][key]) !=='undefined') {
		    matchList = Object.keys(cd[species][key]).map(function(k) 
		    						{return cd[species][key][k];});
		}
		else {
		    /// it's a target. find the entry for each source.
		    srcs = Object.keys(cd[species]);
		    for (i in srcs) {
				var src = srcs[i];
				if (typeof(cd[species][src]) !== 'undefined') {
			    	if (cd[species][src][key] != 'undefined') {
						matchList.push(cd[species][src][key]);
			    	}
				}
		    }
		}
	    }
	    return matchList;
	},

        /** DON't think I need this
	match: function (key, species) {
		var rec = null;
		for (var i=0; i < this.cellData[species].length; i++) {
			var cellIdSource = this.cellData[species][i].source_id;
			var cellIdTarget = this.cellData[species][i].target_id;
			if ( cellIdSource== key) {				
				rec = this.cellData[species][i];
				break;
			} else if (cellIdTarget == key) {
				rec = this.cellData[species][i];
				break;
			}
		}
		return rec;
		},***/

    
	/*
		Function: keys
			returns a list of key (id) values from a given dataset
	
		Parameters:
			dataset - which data set array to return (i.e., source, target, cellData)

		Returns:
			array of ids
	*/
	keys: function (dataset) {
		var a = this[dataset];
		return Object.keys(a);		// Object.keys(this.target["Homo sapiens"])
	},

	/*
		Function: getElement
			gets a single element object from a data set 
	
		Parameters:
			dataset - which data set
			key - key to search

		Returns:
			object
	*/	
	getElement: function (dataset, key, species) {
		var el;
		if (typeof(species) !== 'undefined') {
		 	el = this[dataset][species][key]; 
		} else {
			el = this[dataset][key];
		}
		return el;
	},
	getDetail: function (s, t, species) {
	 	return this.cellData[species][s][t]; 
	},
	/*
		Function: contains

			searches for value element contained with a data set 

		Parameters:
			dataset - which data set to search
			key - key to search


		Returns:
			boolean
	*/
	contains: function(dataset, key, species) {
		var el = this.getElement(dataset, key, species);
		if (typeof(el) !== 'undefined') return false;
		return true;
	}, 	

	getMatrix: function(xvals, yvals, species, invertAxis) {
		var self = this;
	    var xvalues = xvals, yvalues = yvals;     
	    var matrix = []; 

		yvalues.forEach(function(d, i) {
			var results = self.matches(d, species); 
			if (results != null ) {
				var list = [];
			    for (var a in results) {
//			    	console.log(JSON.stringify(results[a]));
			    	if (typeof(results[a]) !== 'undefined') {
						var	xPos, yPos;

						// get the x/y positions based on the ordered index
				    	if (invertAxis) { 
				    		xPos = xvalues.indexOf(results[a].source_id);
				    		yPos = yvalues.indexOf(results[a].target_id);
						} else {
				    		xPos = xvalues.indexOf(results[a].target_id);
				    		yPos = yvalues.indexOf(results[a].source_id);
						}
						if (yPos > -1 && xPos > -1) {  // if > -1 , then it's in the viewable rendered range
							var rec = {source_id: results[a].source_id, target_id: results[a].target_id, xpos: xPos, 
											ypos: yPos, species: results[a].species};
							list.push(rec);
						}
 					}
 				}
				matrix.push(list);
			}
		});

	    return matrix;
	},

	/*
		Function: reinitialize

			reinitializes the source, target and cellData for a specied species

		Parameters:
			species - species name

	*/
	reinitialize: function(species) {
		console.log("reinitialize dataManager...");
		this.source = [];
		this.target = [];
		this.cellData = [];

		// tell dataLoader to refresh data 
		this.dataLoader.refresh(species);

		// inject data
		this.target = this.dataLoader.getTargets();
		this.source = this.dataLoader.getSources();
		this.cellData = this.dataLoader.getCellData();
	}
};


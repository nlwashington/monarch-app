/*
 *
 *	Phenogrid - the Phenogrid widget.
 * 
 *	implemented as a jQuery UI (jqueryui.com) widget, this can be instantiated on a jquery-enabled web page
 *	with a call of the form 
 *	$("#mydiv).phenogrid({phenotypeData: phenotypeList}).
 *	where #mydiv is the id of the div that will contain the phenogrid widget
 *	and phenotypeList takes one of two forms:
 *
 *	1. a list of hashes of the form 
 *		[ {"id": "HP:12345", "observed" :"positive"}, {"oid: "HP:23451", "observed" : "negative"},]
 *	2. a simple list of ids..
 *		[ "HP:12345", "HP:23451"], etc.
 *
 *	Configuration options useful for setting species displayed, similarity calculations, and 
 *	related parameters can also be passed in this hash. As of September
 *	2014, these options are currently being refactored - further
 *	documentation hopefully coming soon.
 *
 *	The phenogrid widget uses semantic similarity calculations
 *	provided by OWLSim (www.owlsim.org), as provided through APIs from
 *	the Monarch initiative (www.monarchinitiative.org). 
 * 
 *	Given an input list of phenotypes and parameters indicating
 *	desired source of matching models (humans, model organisms, etc.),
 *	the phenogrid will call the Monarch API to get OWLSim results
 *	consisting of arrays of the items of the following form:
 *	{
 *		"id":"HP_0000716_MP_0001413_MGI_006446",
 *		"label_a":"Depression",
 *		"id_a":"HP:0000716",
 *		"subsumer_label":"Abnormal emotion/affect behavior",
 *		"subsumer_id":"HP:0100851",
 *		"value":5.667960271407814,
 *		"label_b":"abnormal response to new environment",
 *		"id_b":"MP:0001413",
 *		"model_id":"MGI_006446",
 *		"model_label":"B10.Cg-H2<sup>h4</sup>Sh3pxd2b<sup>nee</sup>/GrsrJ",
 *		"rowid":"HP_0000716_HP_0100851"
 *	},
 *
 *	These results will then be rendered in the phenogrid
 *
 *	NOTE: I probably need a model_url to render additional model info on 
 *	the screen. Alternatively I can load the data 
 *	as a separate call in the init function.
 *
 *	META NOTE (HSH - 8/25/2014): Can we remove this note, or at least clarify?
 */
var url = document.URL;

/*
	Package: axisgroup.js

	Namespace: phenogrid.axisgroup

 	Constructor: AxisGroup 
		an object routine that will wrap data required for axis rendering

 	Parameters:
		renderStartPos - render starting position
		renderEndPos - render end position
		items - item list to use for the axis display 	
*/
var AxisGroup = function(renderStartPos, renderEndPos, items)  {
	this.renderStartPos = renderStartPos;
    this.renderEndPos = renderEndPos;
    this.items = items;
};

/*
 	Class: AxisGroup 
		an object routine that will wrap data required for axis rendering
*/
AxisGroup.prototype = {
	constructor: AxisGroup,
	/*
		Function: getRenderStartPos
	 		gets the rendered starting position

	 	Return:
	 		position index
	*/
	getRenderStartPos: function() {
		return this.renderStartPos;
	},
	setRenderStartPos: function(position) {
		// don't allow out of position starts
		if (position < 0 || position > this.groupSize()) {
			position = 0; // default to zero
		}

		this.renderStartPos = position;
	},

	/*
		Function: getRenderEndPos
	 		gets the rendered end position

	 	Return:
	 		position index
	*/	
	getRenderEndPos: function() {
		return this.renderEndPos;
	},
	setRenderEndPos: function(position) {
		// don't let the postion go pass the max group size
		if (position > this.groupSize()) {
			position = this.groupSize();
		}		
		this.renderEndPos = position;
	},	
	/*
		Function: itemAt
			gets a single item at a specified index position within the rendered axisgroup 

		Parameters:
			index

		Return:
			item data
	*/
	itemAt: function(index) {
		var renderedList = this.keys();
		var item = renderedList[index];
    	return this.get(item);
	},

	/*
		Function: get
			gets a single item element using a key from the axis 
	
		Parameters:
			key
		Returns:
			item element
	*/	
	get: function(key) {
		return this.items[key];
	},

	/*
		Function: entries
			provides the array of rendered entries

		Return:
			array of objects of items
	*/	
	entries: function() {
		var keys = Object.keys(this.items);
		var a = [];
		// loop through on those rendered
		for (var i = this.renderStartPos; i < this.renderEndPos;i++) {
			var key = keys[i];
			var el = this.items[key];
			a.push(el);
		}
		return a;
	},

	/*
		Function: getItems
			provides the subset group of items to be rendered

		Return:
			array of objects of items
	*/	
	getItems: function() {
		// if (typeof(this.renderedItems) !== 'undefined' && this.renderedItems != null) {
		// 	return this.renderedItems.slice(this.renderStartPos, this.renderEndPos);
		// } 
		var keys = Object.keys(this.items);
		var a = [];
		// loop through only those that are rendered
		for (var i = this.renderStartPos; i < this.renderEndPos;i++) {
			var key = keys[i];
			var el = this.items[key];
			a[key] = el;
		}
		return a;
	},
	
	/*
		Function: keys
			returns a list of key (id) values
	
		Returns:
			array of key ids
	*/
	keys: function () {
		var renderedList = this.getItems();
		return Object.keys(renderedList);	
	},


       /* number of items diplayed */
    displayLength: function() {

    },

	/*
		Function: position
			gets the relative position a key within the rendered or viewable range
	
		Parameters:
			key - a key value to locate

		Return:
			index value, -1 if item not found within rendered range
	*/
	position: function(key) {
		var renderedList = this.keys(); 
		return renderedList.indexOf(key);
	},

	/*
		Function: size
			provides the size of only the rendered portion of the axisgroup

		Return:
			size
	*/	
	size: function() {
		return (this.renderEndPos - this.renderStartPos);
	},
	/*
		Function: groupSize
			provides the size of the entire axis group

		Return:
			size
	*/	
	groupSize: function() {
    	return Object.keys(this.items).length;
	},

	/*
		Function: groupIDs
			provides list of IDs for all entries within the axis group

		Return:
			array
	*/	
	groupIDs: function() {
		return Object.keys(this.items);
	},
	/*
		Function: groupEntries
			provides list of all entries within the axis group

		Return:
			array of objects of items
	*/	
	groupEntries: function() {
		var keys = Object.keys(this.items);
		var a = [];
		// loop through on those rendered
		for (var i = 0; i < keys.length;i++) {
			var key = keys[i];
			var el = this.items[key];
			a.push(el);
		}
		return a;
	},

	/*
		Function: contains
			determines if a item element is contained within the axis 
	
		Parameters:
			key - key id to locate

		Returns:
			boolean
	*/	

	contains: function(key) {
		if (this.get(key) != null)
			return true;
		else
			return false;
	},
    /*
		Function: sort
			sorts the data on the axis 
	
		Parameters:
			by - specifies the the sort type

	*/	
    sort: function(by) {
    	var temp = this.groupEntries();
 		if (by == 'Frequency') {
			//sortFunc = self._sortByFrequency;
			//this.items.sort(function(a,b) {
			temp.sort(function(a,b) {				
				var diff = b.count - a.count;
				if (diff === 0) {
					diff = a.id.localeCompare(b.id);
				}
				return diff;
			});
		} else if (by == 'Frequency and Rarity') {
			//this.items.sort(function(a,b) {
			temp.sort(function(a,b) {				
				return b.sum-a.sum;
			});
		} else if (by == 'Alphabetic') {
			//this.items.sort(function(a,b) {
			  temp.sort(function(a,b) {				
				var labelA = a.label, 
				labelB = b.label;
				if (labelA < labelB) {return -1;}
				if (labelA > labelB) {return 1;}
				return 0;
			});
		}
		// rebuild items
		this.items = [];
		for (var t in temp) {
			this.items[temp[t].id] = temp[t];
		}

    },

    getScale: function() {
	var values = this.keys();
	var scale = d3.scale.ordinal()
	.domain(values)
	.rangeRoundBands([0,values.length]);


	return scale
    }
};

/*
 	Constructor: DataManager 

 	Parameters:
  		parent - reference to parent calling object
 		serverUrl - sim server url, or location of server to provide data
*/
var DataManager = function(parent, serverUrl) {
	this.parent = parent;
	this.simServerURL = serverUrl;
	this.init();
};

/*
 	Class: DataManager
  		handles all interaction with the data, from fetching from external 
 		servers, transformation and storage.
 
 	Parameters:
 	 	parent - reference to parent calling object
 		serverUrl - sim server url
 */
DataManager.prototype = {
	constructor: DataManager,

	/*
		Function: init
			initializes the dataManager

		Returns:
			none
	*/		
	init: function() {
		this.source = []; // phenoList
		this.target = []; // modelList
		this.expandedCache = [];   
		this.cellData = []; 
		this.matrix = [];
		this.owlsimsData = [];			// raw owlsim
		this.origSourceList;
		this.initialized = false;
	},

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
	    var cd= this.cellData; // convenience pointer. Good for scoping
	    if (typeof (cd[species]) != 'undefined')  {
		// it's  a source. grab all of them
		if (typeof (cd[species][key]) !=='undefined') {
		    matchList = Object.keys(cd[species][key]).map(
			function(k) {return cd[species][key][k];});
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

	/*
		Function: fetch

			fetch and load data from external source (i.e., owlsims)

		Parameters:	
			qrySourceList - list of source items to query
			species - list of species
			limit - value to limit targets returned
	*/
	fetch: function(qrySourceList, species, limit) {
		var res, speciesName = [];

		// save the original source listing
		this.origSourceList = qrySourceList;

		if (typeof(species) == 'object') speciesName = species;
		else if (typeof(species) == 'string') {
			speciesName = [species];
		}

		for (var i=0; i < speciesName.length; i++) {

	    	var url = this.simServerURL + this.parent.state.simSearchQuery + qrySourceList.join("+");

		    if (typeof(speciesName[i]) !== 'undefined') {
		    	url += "&target_species=" + speciesName[i].taxon;
		    } 
		    if (typeof(limit) !== 'undefined') {
		    	url += "&limit=" + limit;
			}
		    console.log(url);
			jQuery.ajax({
				url: url, 
				async : false,
				dataType : 'json',
				success : function(data) {
					res = data;
				},
				error: function (xhr, errorType, exception) { 
					var msg;
					// Triggered if an error communicating with server
					switch(xhr.status){
					case 404:
					case 500:
					case 501:
					case 502:
					case 503:
					case 504:
					case 505:
					default:
						msg = "We're having some problems. Please try again soon.";
						break;
					case 0: 
						msg = "Please check your network connection.";
						break;
					}
					console.log(msg);
				} 
			});	


			// if (typeof (res) !=='undefined' && res !== null) {
			// 	if (typeof(limit) !== 'undefined' && typeof(res.b) !== 'undefined' && res.b !== null && res.b.length < limit) {
			// 		res = this._padSpeciesData(res,speciesName,limit);
			// 	}
			// }
			// save the original owlsim data
			this.owlsimsData[speciesName[i].name] = res;

			if (typeof (res) !=='undefined' && res !== null) {
				// now transform data to there basic data structures
				this.transform(res, speciesName[i].name);  
			}
		}

	},

	/*
		Function: transform

			transforms data from raw owlsims into simplified format
	
	 	Parameters:

	 		data - owlsims structured data
	 		species - species name
	*/
	transform: function(data, species) {	

		if (typeof(data) !== 'undefined' &&
		    typeof (data.b) !== 'undefined') {
			console.log("transforming...");

			// extract the maxIC score; ugh!
			if (typeof (data.metadata) !== 'undefined') {
				this.parent.state.maxICScore = data.metadata.maxMaxIC;
			}
			this.cellData[species] = [];
			this.target[species] = [];			

			var variantNum = 0;
			for (var idx in data.b) {
				var item = data.b[idx];
				var targetID = this.parent._getConceptId(item.id);

				// [vaa12] HACK.  NEEDED FOR ALLOWING MODELS OF THE SAME ID AKA VARIANTS TO BE DISPLAYED W/O OVERLAP
				// SEEN MOST WITH COMPARE AND/OR EXOMISER DATA
				// if (this.contains("target", targetID)){
				// 	targetID += "_" + variantNum;
				// 	variantNum++;
				// }

				// TODO: THIS NEEDS CHANGED TO CATEGORY (I THINK MONARCH TEAM MENTIONED ADDING THIS)
				type = this.parent.defaultApiEntity;
				for (var j in this.parent.state.apiEntityMap) {
				 	if (targetID.indexOf(this.parent.state.apiEntityMap[j].prefix) === 0) {
				 		type = this.parent.state.apiEntityMap[j].apifragment;
				 	}
				}
				
				// build the target list
				var t = {"id":targetID, 
					 "label": item.label, 
					 "species": item.taxon.label, 
					 "taxon": item.taxon.id, 
					 "type": type, 
					 "rank": parseInt(idx), 
					 "score": item.score.score};  
				this.target[species][targetID] = t;

				var matches = data.b[idx].matches;
				var curr_row, lcs, cellPoint, dataVals;
				var sourceID_a, currID_lcs;
				if (typeof(matches) !== 'undefined' && matches.length > 0) {

					var sum =0, count=0;
					for (var matchIdx in matches) {
						curr_row = matches[matchIdx];
						sourceID_a = this.parent._getConceptId(curr_row.a.id);
						currID_b = this.parent._getConceptId(curr_row.b.id)
						currID_lcs = this.parent._getConceptId(curr_row.lcs.id);

						lcs = this.parent._normalizeIC(curr_row);

						var srcElement = this.getElement("source", sourceID_a);

						// build a unique list of sources
						if (typeof(srcElement) == 'undefined') {
						//if (!this.contains("source", sourceID_a)) {

							dataVals = {"id":sourceID_a, "label": curr_row.a.label, "IC": parseFloat(curr_row.a.IC), //"pos": 0, 
											"count": count, "sum": sum, "type": "phenotype"};
							this.source[sourceID_a] = dataVals;
							//this.source.put(sourceID_a, hashDataVals);
							// if (!this.state.hpoCacheBuilt && this.state.preloadHPO){
							// 	this._getHPO(this._getConceptId(curr_row.a.id));
							// }
						} else {
							this.source[sourceID_a].count += 1;
							this.source[sourceID_a].sum += parseFloat(curr_row.lcs.IC);
							
							// console.log('source count: ' + this.source[sourceID_a].count);
							// console.log('source sum' + this.source[sourceID_a].sum);
						}

						// update values for sorting
						//var index = this.getElementIndex("source", sourceID_a);

						//if(  index > -1) {
							//this.source[index].count += 1;
							//this.source[index].sum += parseFloat(curr_row.lcs.IC);


						// building cell data points
						dataVals = {"source_id": sourceID_a, "target_id": targetID, "value": lcs, 
									"subsumer_label": curr_row.lcs.label, "subsumer_id": currID_lcs, 
									"subsumer_IC": parseFloat(curr_row.lcs.IC), "b_label": curr_row.b.label, 
									"species": item.taxon.label,
									"b_id": currID_b, "b_IC": parseFloat(curr_row.b.IC),
							    "rowid": sourceID_a + "_" + currID_lcs};						
					    if (typeof(this.cellData[species][sourceID_a]) == 'undefined') {
						this.cellData[species][sourceID_a] = {};
					    }
					    if(typeof(this.cellData[species][sourceID_a][targetID]) == 'undefined') {
						this.cellData[species][sourceID_a][targetID] = {};
					    }
					    this.cellData[species][sourceID_a][targetID] = dataVals;
					}
				}  //if
			}
		}
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

		// transform the data again using the originalOwlsim data, but for specified species
		this.transform(this.owlsimsData[species], species);  
	}
};

//****************************************************

/* main phenogrid widget */
(function($) {
	$.widget("ui.phenogrid", {
		// core commit. Not changeable by options. 
	config: {
		//scriptpath : $('script[src]').last().attr('src').split('?')[0].split('/').slice(0, -1).join('/')+'/',
		scriptpath : $('script[src*="phenogrid"]').last().attr('src').split('?')[0].split('/').slice(0, -1).join('/')+'/',
		colorDomains: [0, 0.2, 0.4, 0.6, 0.8, 1],
		colorRanges: [['rgb(229,229,229)','rgb(164,214,212)','rgb(68,162,147)','rgb(97,142,153)','rgb(66,139,202)','rgb(25,59,143)'],
			['rgb(252,248,227)','rgb(249,205,184)','rgb(234,118,59)','rgb(221,56,53)','rgb(181,92,85)','rgb(70,19,19)'],
			['rgb(230,209,178)','rgb(210,173,116)','rgb(148,114,60)','rgb(68,162,147)','rgb(31,128,113)','rgb(3,82,70)'],
			['rgb(229,229,229)','rgb(164,214,212)','rgb(68,162,147)','rgb(97,142,153)','rgb(66,139,202)','rgb(25,59,143)']],
		emptySvgX: 1100,
		emptySvgY: 200,
		overviewCount: 3,
		colStartingPos: 10,
		detailRectWidth: 300,
		detailRectHeight: 140,
		detailRectStrokeWidth: 3,
		globalViewSize : 110,
		reducedGlobalViewSize: 50,
		minHeight: 310,
		h : 578,	// [vaa12] this number could/should be eliminated.  updateAxis sets it dynamically as it should be
		m :[ 30, 10, 10, 10 ],
		multiOrganismCt: 10,
		multiOrgModelLimit: 750,
		phenotypeSort: ["Alphabetic", "Frequency and Rarity", "Frequency" ],
		similarityCalculation: [{label: "Similarity", calc: 0, high: "Max", low: "Min"}, 
			{label: "Ratio (q)", calc: 1, high: "More Similar", low: "Less Similar"}, 
			{label: "Ratio (t)", calc: 3, high: "More Similar", low: "Less Similar"} , 
			{label: "Uniqueness", calc: 2, high: "Highest", low: "Lowest"}],
		smallestModelWidth: 400,
		textLength: 34,
		textWidth: 200,
		w : 720,
		headerAreaHeight: 160,
		comparisonTypes: [ { organism: "Homo sapiens", comparison: "diseases"}],
		defaultComparisonType: { comparison: "genes"},
		speciesLabels: [ { abbrev: "HP", label: "Human"},
			{ abbrev: "MP", label: "Mouse"},
			{ abbrev: "ZFIN", label: "Zebrafish"},
			{ abbrev: "ZP", label: "Zebrafish"},
			{ abbrev: "FB", label: "Fly"},
			{ abbrev: "GO", label: "Gene Ontology"},
			{ abbrev: "UDPICS", label: "UDP Patients"}],
		dataDisplayCount: 30,
		labelCharDisplayCount : 20,
		apiEntityMap: [ {prefix: "HP", apifragment: "disease"},
			{prefix: "OMIM", apifragment: "disease"}, 
			{prefix: "MGI", apifragment: "gene"}],
		defaultApiEntity: "gene",
		tooltips: {},
		widthOfSingleCell: 18,
		heightOfSingleCell: 13,    //used
		yoffsetOver: 30,
		overviewGridTitleXOffset: 340,
		overviewGridTitleFaqOffset: 230,
		nonOverviewGridTitleXOffset: 220,
		nonOverviewGridTitleFaqOffset: 570,
		gridTitleYOffset: 20,
		xOffsetOver: 20,
		baseYOffset: 150,
		faqImgSize: 15,
		invertAxis: false,
		dummyModelName: "dummy",
		simServerURL: "",  // URL of the server for similarity searches
		preloadHPO: false,	// Boolean value that allows for preloading of all HPO data at start.  If false, the user will have to manually select what HPO relations to load via hoverbox.
		titleOffsets: [{"main": {x:220, y:30}, "disease": {x:0, y:100}}],
		gridRegion: [{x:254, y:300}]
	},

	internalOptions: {
		/// good - legit options
		serverURL: "",
		simServerURL: "",  // URL of the server for similarity searches
		simSearchQuery: "/simsearch/phenotype?input_items=",
		selectedCalculation: 0,
		ontologyDepth: 10,	// Numerical value that determines how far to go up the tree in relations.
		ontologyDirection: "out",	// String that determines what direction to go in relations.  Default is "out".
		ontologyTreeAmounts: 1,	// Allows you to decide how many HPO Trees to render.  Once a tree hits the high-level parent, it will count it as a complete tree.  Additional branchs or seperate trees count as seperate items
							// [vaa12] DO NOT CHANGE UNTIL THE DISPLAY HPOTREE FUNCTIONS HAVE BEEN CHANGED. WILL WORK ON SEPERATE TREES, BUT BRANCHES MAY BE INACCURATE
		selectedSort: "Frequency",
		targetSpeciesName : "Overview",  // MKD: not sure this works setting it here, need to look into this
		refSpecies: "Homo sapiens",
		genotypeExpandLimit: 5, // sets the limit for the number of genotype expanded on grid
		phenoCompareLimit: 10, // sets the limit for the number of phenotypes used for genotype expansion
		targetSpeciesList : [{ name: "Homo sapiens", taxon: "9606"},
			{ name: "Mus musculus", taxon: "10090" },
			{ name: "Danio rerio", taxon: "7955"},
			{ name: "Drosophila melanogaster", taxon: "7227"},
			{ name: "UDPICS", taxon: "UDPICS"}],
		// COMPARE CALL HACK - REFACTOR OUT
	    providedData: {},   
	    axisFlipConfig: {
		colorSelector: { true: "source_id", false: "target_id"}   //{ true: "yID", false: "xID"}
	    }
	},

	/*
	 reset state values that must be cleared before reloading data
	*/
	_reset: function(type) {

		// LEAVE UNTIL OR MOVING HASH CONSTRUCTION EARLIER
		if (type == 'organism' || type == 'axisflip' || typeof(type) == 'undefined') {
			this.state.expandedHash = new Hashtable();  //MKD:refactor to array
		}

		// target species name might be provided as a name or as taxon. Make sure that we translate to name
		this.state.targetSpeciesName = this._getTargetSpeciesNameByTaxon(this,this.state.targetSpeciesName);

		this.state.yAxisMax = 0;
		this.state.yoffset = this.state.baseYOffset;
		this.state.h = this.config.h;
	},

	/*
	 * this function will use the desired height to determine how many phenotype rows to display
	 * the basic formula is: (height - headerAreaHeight)/14.
	 * return -1 if the available space is too small to properly display the grid
	 */
// MKD: may be able to eliminate later 	 
	_calcYAxisDisplayLimit: function() {
		var self = this;

		var pCount = Math.round((self.state.h - self.state.headerAreaHeight) / 14);
		if (pCount < 10) {
			pCount = -1;
		}
		return pCount;
	},

	// Several procedures for various aspects of filtering/identifying appropriate entries in the target species list.. 
	_getTargetSpeciesIndexByName: function(self,name) {
		var index = -1;
		if (typeof(self.state.targetSpeciesByName[name]) !== 'undefined') {
			index = self.state.targetSpeciesByName[name].index;
		}
		return index;
	},

	_getTargetSpeciesNameByIndex: function(self,index) {
		var species;
		if (typeof(self.state.targetSpeciesList[index]) !== 'undefined') {
			species = self.state.targetSpeciesList[index].name;
		}
		else {
			species = 'Overview';
		}
		return species;
	},

	_getTargetSpeciesTaxonByName: function(self,name) {
		var taxon;
		// first, find something that matches by name
		if (typeof(self.state.targetSpeciesByName[name]) !== 'undefined') {
			taxon = self.state.targetSpeciesByName[name].taxon;
		}
		// default to overview, so as to always do somethign sensible
		if (typeof(taxon) === 'undefined') {
			taxon ='Overview';
		}

		return taxon;
	},

	/*
	* some installations might send in a taxon - "10090" - as opposed to a name - "Mus musculus".
	* here, we make sure that we are dealing with names by translating back
	* this might be somewhat inefficient, as we will later translate to taxon, but it will
	* make other calls easier to be consitently talking in terms of species name
	*/
	_getTargetSpeciesNameByTaxon: function(self,name) {
		// default - it actually was a species name
		var species = name;
		var found = false;

		/*
		 * check to see if the name exists.
		 * if it is found, then we say "true" and we're good.
		 * if, however, it matches the taxon, take the index in the array.
		 */

		for (var sname in self.state.targetSpeciesByName) {
			if(!self.state.targetSpeciesByName.hasOwnProperty(sname)){break;}
			// we've found a matching name.
			if (name == sname) {
				found = true;
			}

			if (name == self.state.targetSpeciesByName[sname].taxon) {
				found = true;
				species = sname;
				break;
			}
		}
		// if not found, it's overview.
		if (found === false) {
			species = "Overview";
		}
		return species;
	},

	// NOTE: I'm not too sure what the default init() method signature should be given an imageDiv and phenotype_data list
	/*
	 * imageDiv - the place you want the widget to appear
	 * phenotype_data - a list of phenotypes in the following format:
	 * [ {"id": "HP:12345", "observed" :"positive"}, {"id: "HP:23451", "observed" : "negative"},]
	 * or simply a list of IDs.
	 * [ "HP:12345", "HP:23451", ...]
	 */
	_create: function() {
		// must be available from js loaded in a separate file...
		this.configoptions = configoptions;
		// check these 
		// important that config options (from the file) and this. options (from
		// the initializer) come last
		this.state = $.extend({},this.internalOptions,this.config,this.configoptions,this.options);
		// default simServerURL value..
		if (typeof(this.state.simServerURL) == 'undefined' || this.state.simServerURL ==="") {
			this.state.simServerURL=this.state.serverURL;
		}
		this.state.data = {};
		this.state.dataManager = new DataManager(this, this.state.simServerURL);

		// will this work?
		this.configoptions = undefined;
		this._createTargetSpeciesIndices();
		// index species
		this._reset();

		console.log("in create func...");
	},

	// create a shortcut index for quick access to target species by name - to get index (position) and taxon
	_createTargetSpeciesIndices: function() {
		this.state.targetSpeciesByName = {};
		for (var j in this.state.targetSpeciesList) {
			// list starts as name, taxon pairs
			var name = this.state.targetSpeciesList[j].name;
			var taxon = this.state.targetSpeciesList[j].taxon;
			var entry = {};
			entry.index = j;
			entry.taxon = taxon;
			this.state.targetSpeciesByName[name] = entry;
		}
	},

	/*
	 * HACK WARNING - 20140926, harryh@pitt.edu
	 * phenogrid assumes a path of /js/res relative to the scriptpath directory. This will contain configuration files
	 * that will be loaded via urls constructed in this function.
	 * As of 9/26/2014, the puptent application used in monarch-app breaks this.
	 * thus, a workaround is included below to set the path correctly if it come up as '/'.
	 * this should not impact any standalone uses of phenogrid, and will be removed once monarch-app is cleaned up.
	 */
	_getResourceUrl: function(name,type) {
		var prefix = this.state.serverURL+'/widgets/phenogrid/js/';
		return prefix + 'res/' + name + '.' + type;
	},

	//init is now reduced down completely to loading
	_init: function() {

		console.log("init...");
		this.element.empty();
		this._loadSpinner();

		// target species name might be provided as a name or as taxon. Make sure that we translate to name
		this.state.targetSpeciesName = this._getTargetSpeciesNameByTaxon(this,this.state.targetSpeciesName);
//		this.state.phenotypeData = this._parseQuerySourceList(this.state.phenotypeData);
		var querySourceList = this._parseQuerySourceList(this.state.phenotypeData);

		// setup a species array for later usage; MAY NEED TO REFACTOR THIS
		var speciesList = [];
		for (var i in this.state.targetSpeciesList) {	
			var species = this.state.targetSpeciesList[i].name;
			speciesList.push(species);
		}		

		this.state.speciesList = speciesList;

		
		var listofTargetSpecies = [];
		if (this.state.targetSpeciesName == "Overview") {
			listofTargetSpecies = this.state.targetSpeciesList;
		} else {
			listofTargetSpecies.push(this.state.targetSpeciesName);
		}
		// dataManager fetch will initialize source and target data
		this.state.dataManager.fetch(querySourceList, listofTargetSpecies);

//TEMP CODE TESTING: force 1 species for testing
		this.state.targetSpeciesName = "Homo sapiens";

	    // initialize axis groups
	    this._createAxisRenderingGroups();

		this._initDefaults();   //MKD: refactor

		this._processDisplay();

	},

	//Originally part of _init
	_initDefaults: function() {
		// must init the stickytooltip here initially, but then don't reinit later until in the redraw
		// this is weird behavior, but need to figure out why later
		if (typeof(this.state.stickyInitialized) == 'undefined') {
			this._addStickyTooltipAreaStub();
			this.state.stickyInitialized = true;
			stickytooltip.init("*[data-tooltip]", "mystickytooltip");
		}
		this.state.tooltipRender = new TooltipRender(this.state.serverURL);   
		
		// init a single instance of Expander
		this.state.expander = new Expander(); 

		if (this.state.owlSimFunction == 'exomiser') {
			this.state.selectedCalculation = 2; // Force the color to Uniqueness
		}

	    this._setSelectedCalculation(this.state.selectedCalculation);
		this._setDefaultSelectedSort(this.state.selectedSort);

		// shorthand for top of model region
		this.state.yModelRegion = this.state.yoffsetOver + this.state.yoffset;

	    
//MKD: move to rendering code??    	
		this._createColorScale();  
	},


    /* create the groups to contain the rendering 
       information for x and y axes. Use already loaded data
       in various hashes, etc. to create objects containing
       information for axis rendering. Then, switch source and target
       groups to be x or y depending on "flip axis" choice*/
    _createAxisRenderingGroups: function() {
    
        /*** Build axis group here. */
        /* remember, source = phenotype and target=model */
   	    var self = this;

   	    self._setAxisDisplayLimits();

    	/* only do this if the group doesn't exist - don't
       	recreate on reload */
       	// creates AxisGroup with full source and target lists with default rendering range
    	this.state.sourceAxis = new AxisGroup(0, self.state.sourceDisplayLimit,
					  this.state.dataManager.getData("source"));
		// sort source with default sorting type
		this.state.sourceAxis.sort(this.state.selectedSort); 
    
    	this.state.targetAxis =  new AxisGroup(0, self.state.targetDisplayLimit,
					   this.state.dataManager.getData("target", self.state.targetSpeciesName));

    	self._setAxisRenderers();
	},

    _setAxisRenderers: function() {
	   var self= this;

	   if (self.state.invertAxis) {
	       self.state.xAxisRender = self.state.sourceAxis;
	       self.state.yAxisRender= self.state.targetAxis;
	   } else {
	       self.state.xAxisRender = self.state.targetAxis;
	       self.state.yAxisRender= self.state.sourceAxis;
	   }

    	//self.state.dataManager.buildMatrix(self.state.yAxisRender.keys(),  self.state.xAxisRender.keys(), 
    	//		self.state.targetSpeciesName, self.state.invertAxis);	   
    },

    _setAxisDisplayLimits: function() {
    			// set default display limits based on displaying 30
		if (this.state.dataManager.length("source") > this.state.dataDisplayCount) {
			this.state.sourceDisplayLimit = this.state.dataDisplayCount;
		} else {
			this.state.sourceDisplayLimit = this.state.dataManager.length("source");
		}

		if (this.state.dataManager.length("target", this.state.targetSpeciesName) > this.state.dataDisplayCount) {
			this.state.targetDisplayLimit = this.state.dataDisplayCount;
		} else {
			this.state.targetDisplayLimit = this.state.dataManager.length("target", this.state.targetSpeciesName);
		}
    },

	_loadSpinner: function() {
		var element =$('<div><h3>Loading...</h3><div class="cube1"></div><div class="cube2"></div></div>');
		this._createSvgContainer();
		element.appendTo(this.state.svgContainer);
	},

	
	_reDraw: function() {
		var self = this;
		if (this.state.dataManager.isInitialized()) {
			var displayRangeCount = this.state.yAxisRender.size();

			this._initCanvas();

//			var rectHeight = this._createRectangularContainers();

//			this._createXRegion();
			// this._createYRegion();
			// self._createGridlines();
//			self._createCellRects();


			this._createGrid();

			// this must be initialized here after the _createModelLabels, or the mouse events don't get
			// initialized properly and tooltips won't work with the mouseover defined in _convertLableHTML
			stickytooltip.init("*[data-tooltip]", "mystickytooltip");

		} else {
			var msg = "There are no results available.";
				this._createSvgContainer();
				this._createEmptyVisualization(msg);
		}

	},



            _getDisplayCells: function() {
		var self =this;

	    var yvalues = this.state.yAxisRender.keys();
		this.state.yScale = this.state.yAxisRender.getScale();
	    
		/*this.state.yScale = d3.scale.ordinal()	
		.domain(yvalues)
		.rangeRoundBands([0,yvalues.length]);*/
		//.range([0, yvalues.length])
		//.rangePoints([0, yvalues.length]);

	    var matrix = []; //this.state.dataManager.matrixArray(this.state.targetSpeciesName);

		yvalues.forEach(function(d, i) {
			var results = self.state.dataManager.matches(d, self.state.targetSpeciesName);
			if (results != null ) {
				var list = [];
			    for (var a in results) {
				var	yPos = self.state.yAxisRender.position(results[a].source_id);
 				var	xPos = self.state.xAxisRender.position(results[a].target_id);
				if (yPos > -1 && xPos > -1) {  // if > -1 , then it's in the viewable rendered range

 						var rec = {source_id: results[a].source_id, target_id: results[a].target_id, xpos: xPos, 
 									ypos: yPos, species: results[a].species};
 						list.push(rec);
 					}
 				}
				matrix.push(list);
			}
		});

	    return matrix;


	},

	_createGrid: function() {
		var self = this;
		var xvalues = this.state.xAxisRender.keys();


		this.state.xScale = this.state.xAxisRender.getScale();
		/*d3.scale.ordinal()
		.domain(xvalues)
		.rangeRoundBands([0, xvalues.length]);*/
/**/
	    var matrix = this._getDisplayCells();

		var gridxoffset=255, gridyoffset = 150, gridypadding=12, gridxpadding=20;

		// create a row, the matrix contains an array of rows (yscale) with an array of columns (xscale)
		var row = this.state.svg.selectAll(".row")
  			.data(matrix)
		.enter().append("g")
  			.attr("class", "row")
  			.attr("transform", function(d, i) { 
  				return "translate(" + gridxoffset +"," + (gridyoffset+self.state.yScale(i)*gridypadding) + ")"; })
  			.each(createrow);

	  	row.append("text")
			.attr("class", "grid_labels")	  	
	      	.attr("x", -6)
	      	.attr("y",  function(d, i) {
	      			 var rb = self.state.yScale.rangeBand(i)/2;
	      			 return rb;
	      			 })  
	      .attr("dy", ".60em")  
	      .attr("text-anchor", "end")
	      .text(function(d, i) { 
	      	var el = self.state.yAxisRender.itemAt(i);
	      	return self._getShortLabel(el.label); });

	    // create columns using the xvalues (targets)
	  	var column = this.state.svg.selectAll(".column")
	      .data(xvalues)
	    .enter().append("g")
	      .attr("class", "column")
	      .attr("transform", function(d, i) { 
	      	var p = self.state.xScale(i);
	      	return "translate(" + (gridxoffset+self.state.xScale(i)*gridxpadding) + "," + (gridyoffset-5) + ")rotate(-45)"; });

	  	column.append("text")
	  		.attr("class", "grid_labels")
	      	.attr("x", 0)
	      	.attr("y", self.state.xScale.rangeBand()+2)
		    .attr("dy", ".32em")
	      	.attr("text-anchor", "start")
	      		.text(function(d, i) { 		      	
				var el = self.state.xAxisRender.itemAt(i);
					//console.log('d:'+JSON.stringify(d));
	      		return self._getShortLabel(el.label); });


		function createrow(row) {
		 	var self = this;
		    var cell = d3.select(self).selectAll(".cell")
		        .data(row)
		      .enter().append("rect")
		        .attr("class", "cell")
		        .attr("x", function(d) { 
		        		return d.xpos * 20; })
		        .attr("width", 10)
		        .attr("height", 10)
				.attr("rx", "3")
				.attr("ry", "3")			        
		        //.style("fill-opacity", function(d) { return z(d.z); })
		        .style("fill", function(d) { 
			        	return "black"; })
		        .on("mouseover", mouseover)
		        .on("mouseout", mouseout);
		}

	  	function mouseover(p) {
		    d3.selectAll(".row text").classed("active", function(d, i) { return i == p.y; });
				d3.selectAll(".column text").classed("active", function(d, i) { return i == p.x; });
		  }

			function mouseout() {
			d3.selectAll("text").classed("active", false);
		}
	},

	/* dummy option procedures as per 
	 * http://learn.jquery.com/jquery-ui/widget-factory/how-to-use-the-widget-factory/
	 * likely to have some content added as we proceed
	 */
	_setOption: function( key, value ) {
		this._super( key, value );
	},

	_setOptions: function( options ) {
		this._super( options );
	},

	// create this visualization if no phenotypes or models are returned
	// [vaa12] the commented-out code has been here for a while.  Check to see if its unneeded and good to remove
	_createEmptyVisualization: function(msg) {
		var self = this;
		var html;
		d3.select("#svg_area").remove();
		//this.state.svgContainer.append("<svg id='svg_area'></svg>");
		//this.state.svg = d3.select("#svg_area");

		var svgContainer = this.state.svgContainer;
		//svgContainer.append("<svg id='svg_area'></svg>");
		//this.state.svg = d3.select("#svg_area")
		//	.attr("width", this.state.emptySvgX)
		//	.attr("height", this.state.emptySvgY);

		//var error = "<br /><div id='err'><h4>" + msg + "</h4></div><br /><div id='return'><button id='button' type='button'>Return</button></div>";
		//this.element.append(error);
		if (this.state.targetSpeciesName != "Overview"){
			html = "<h4 id='err'>" + msg + "</h4><br /><div id='return'><p><button id='button' type='button'>Return</button></p><br/></div>";
			//this.element.append(html);
			this.state.svgContainer.append(html);
			var btn = d3.selectAll("#button")
				.on("click", function(d,i){
					$("#return").remove();
					$("#errmsg").remove();
					d3.select("#svg_area").remove();

					//MKD: GET RID OF THIS LINE
					//self.state.phenotypeData = self.state.origPhenotypeData.slice();
					self._reset();
					self.state.targetSpeciesName = "Overview";
					self._init();
				});
		}else{
			html = "<h4 id='err'>" + msg + "</h4><br />";
			//this.element.append(html);
			this.state.svgContainer.append(html);
		}
	},

	// adds light gray gridlines to make it easier to see which row/column selected matches occur
	_createGridlines: function() {
		var self = this;
		var mWidth = self.state.widthOfSingleCell;
		var mHeight = self.state.heightOfSingleCell;
		// create a blank grid to match the size of the phenogrid grid
		var data = [];
   	    var rowCt = self.state.yAxisRender.size();
   	    var colCt = self.state.xAxisRender.size();
	     

		for (var k = 0; k < rowCt; k++){
			for (var l = 0; l < colCt; l++) {
				var r = [];
				r.push(k);
				r.push(l);
				data.push( r );
			}
		}
		self.state.svg.selectAll("rect.bordered")
			.data(data)
			.enter()
			.append("rect")
			.attr("id","gridline")
			.attr("transform","translate(" + ((self.state.gridRegion[0].x)-2) + "," + ((self.state.gridRegion[0].y)-1)+ ")") 	//252, " + (this.state.yModelRegion + 5) + ")")
			.attr("x", function(d,i) { return d[1] * mWidth;})
			.attr("y", function(d,i) { return d[0] * mHeight;})
			.attr("class", "hour bordered deselected")
			.attr("width", 14)
			.attr("height", 11.5);
	},

	// For the selection area, see if you can convert the selection to the idx of the x and y then redraw the bigger grid 
	_createOverviewSection: function() {
		var self = this;

		// set the display counts on each axis
	    var yCount = self.state.yAxisRender.size();  //self.state.sourceDisplayLimit;
	    var xCount = self.state.xAxisRender.size();  //self.state.targetDisplayLimit;

	    console.log("yCount: " + yCount + " xCount: " + xCount);

	    // get the rendered starting point on axis
		var startYIdx = self.state.yAxisRender.renderStartPos;    // this.state.currYIdx - yCount;
		var startXIdx = self.state.xAxisRender.renderStartPos;    // this.state.currXIdx - xCount;

		// add-ons for stroke size on view box. Preferably even numbers
		var linePad = 2;
		var viewPadding = linePad * 2 + 2;

		// overview region is offset by xTranslation, yTranslation
		var xTranslation = 42; 
		var yTranslation = 30;

		// these translations from the top-left of the rectangular region give the absolute coordinates
		var overviewX = self.state.axis_pos_list[2] + xTranslation;
		var overviewY = self.state.yModelRegion + yTranslation;

		// size of the entire region - it is a square
		var overviewRegionSize = self.state.globalViewSize;
		if (this.state.yAxisRender.groupSize() < yCount) {  //groupSize
			overviewRegionSize = self.state.reducedGlobalViewSize;
		}

		// make it a bit bigger to ccont for widths
		var overviewBoxDim = overviewRegionSize + viewPadding;

		// create the main box and the instruction labels.
		self._initializeOverviewRegion(overviewBoxDim,overviewX,overviewY);

		// create the scales
		self._createSmallScales(overviewRegionSize);

		// add the items using smaller rects
		//var cellData = self._mergeHashEntries(self.state.cellDataHash);
		//var data = self.state.filteredCellData;

		// this should be the full set of cellData
		// MKD:NEED TO BE ABLE TO HANDLE MULTIPLE SPECIES DISPLAYED
		var data = self.state.dataManager.getData("cellData", self.state.targetSpeciesName);

		var cell_rects = this.state.svg.selectAll(".mini_cells")
			.data(data, function(d) {return d.source_id + d.target_id;});   //D.Yid + D.xID;});
		overviewX++;	// Corrects the gapping on the sides
		overviewY++;
		var cellRectTransform = "translate(" + overviewX +	"," + overviewY + ")";

	    console.log("mini rects...");
	    var colorSelector = this.state.axisFlipConfig.colorSelector[this.state.invertAxis];

		cell_rects.enter()
			.append("rect")
			.attr("transform",cellRectTransform)
			.attr("class", "mini_cell")
			.attr("y", function(d, i) { 

				var yid = d.source_id;
				var yscale = self.state.smallYScale(yid);
			        var y = yscale + linePad / 2;
			    //hh 
			    var x = self.state.smallXScale(d.target_id+linePad/2);
			    //console.log(i+", "+d.source_id+", "+d.target_id+" ... "+x+","+y);
				return y;})  // yID
			.attr("x", function(d) { 
				var xid = d.target_id;
				var xscale = self.state.smallXScale(xid);
				var x =  xscale + linePad / 2; 
				return x;})  // xID
			.attr("width", linePad)
			.attr("height", linePad)
			.attr("fill", function(d) {
				//var colorID=d[colorSelector];
				var colorID=d.target_id;
			    var spec = self._getAxisData(colorID).species;
			    var val = d.value[self.state.selectedCalculation];
			    return self._getColorForCellValue(self, spec, val);
			});

		var yRenderedSize = this.state.yAxisRender.size();
		var xRenderedSize = this.state.xAxisRender.size();		
     	var lastYId = this.state.yAxisRender.itemAt(yRenderedSize - 1).id; 
	    var lastXId = this.state.xAxisRender.itemAt(xRenderedSize - 1).id; 
   	    var startYId = this.state.yAxisRender.itemAt(startYIdx).id;   
	    var startXId = this.state.xAxisRender.itemAt(startXIdx).id;

		var selectRectX = self.state.smallXScale(startXId);
		var selectRectY = self.state.smallYScale(startYId);
		var selectRectHeight = self.state.smallYScale(lastYId);
		var selectRectWidth = self.state.smallXScale(lastXId);
		console.log("yRenderedSize:" + yRenderedSize +" xRenderedSize" +xRenderedSize +
				 " selectRectX: " + selectRectX +  " selectRectY:" + selectRectY + 
			" selectRectHeight:" + selectRectHeight + " selectRectWidth:" + selectRectWidth);

		self.state.highlightRect = self.state.svg.append("rect")
			.attr("x",overviewX + selectRectX)
			.attr("y",overviewY + selectRectY)
			.attr("id", "selectionrect")
			.attr("height", selectRectHeight + 4)
			.attr("width", selectRectWidth + 4)
			.attr("class", "draggable")
			.call(d3.behavior.drag()
				.on("drag", function(d) {
					/*
					 * drag the highlight in the overview window
					 * notes: account for the width of the rectangle in my x and y calculations
					 * do not use the event x and y, they will be out of range at times. Use the converted values instead.
					 */

					var current = d3.select(this);
					var curX = parseFloat(current.attr("x"));
					var curY = parseFloat(current.attr("y"));

					var rect = self.state.svg.select("#selectionrect");
					rect.attr("transform","translate(0,0)");

					// limit the range of the x value
					var newX = curX + d3.event.dx;
					var newY = curY + d3.event.dy;

					// Restrict Movement if no need to move map
					if (selectRectHeight == overviewRegionSize) {
						newY = overviewY;
					}
					if (selectRectWidth == overviewRegionSize) {
						newX = overviewX;
					}

					// block from going out of bounds on left
					if (newX < overviewX) {
						newX = overviewX;
					}
					// top
					if (newY < overviewY) {
						newY = overviewY;
					}
					// right
					if (newX + selectRectWidth > overviewX + overviewRegionSize) {
						newX = overviewX + overviewRegionSize - selectRectWidth;
					}

					// bottom
					if (newY + selectRectHeight > overviewY + overviewRegionSize) {
						newY = overviewY + overviewRegionSize - selectRectHeight;
					}
					rect.attr("x", newX);
					// This changes for vertical positioning
					rect.attr("y", newY);

					// adjust x back to have 0,0 as base instead of overviewX, overviewY
					newX = newX - overviewX;
					newY = newY - overviewY;

					// invert newX and newY into posiions in the model and phenotype lists.
					var j = self._invertOverviewDragPosition(self.state.smallXScale,newX);
					var newXPos = j + xCount;

					var jj = self._invertOverviewDragPosition(self.state.smallYScale,newY);
					var newYPos = jj + yCount;

					self._updateCells(newXPos, newYPos);
		}));
		// set this back to 0 so it doesn't affect other rendering
	},

	// Returns the ID of the value on the Y Axis based on current position provided
	// _returnID: function(dataset,position){
	// 	var searchArray = dataset;   //hashtable.entries();
	// 	var results = false;
	// 	for (var i in searchArray){
	// 		if (searchArray[i][1].pos == position){
	// 			results = searchArray[i][0];
	// 			break;
	// 		}
	// 	}
	// 	return results;
	// },

	// We only have 3 color,s but that will do for now
	_getColorForCellValue: function(self,species,score) {
		// This is for the new "Overview" target option
		var selectedScale = self.state.colorScale[species][self.state.selectedCalculation];
		return selectedScale(score);
	},

	_getColorForCellValue2: function(self, data) {
		// This is for the new "Overview" target option
		var selectedScale = self.state.colorScale[data.species][self.state.selectedCalculation];
		return selectedScale(data.score);
	},


	_createModelScoresLegend: function() {
		var self = this;
		var scoreTipY = self.state.yoffset;
		var faqY = scoreTipY - self.state.gridTitleYOffset;
		var tipTextLength = 92;
		var explYOffset = 15;
		var explXOffset = 10;
		var scoretip = self.state.svg.append("text")
			.attr("transform","translate(" + (self.state.axis_pos_list[2] ) + "," + scoreTipY + ")")
			.attr("x", 0)
			.attr("y", 0)
			.attr("class", "tip")
			.text("< Model Scores");

		var tip	= self.state.svg
			.append("svg:image")
			.attr("xlink:href", this.state.scriptpath + "../image/greeninfo30.png")
			.attr("transform","translate(" + (self.state.axis_pos_list[2] + tipTextLength) + "," + faqY + ")")
			.attr("id","modelscores")
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", self.state.faqImgSize)
			.attr("height", self.state.faqImgSize)
			.attr("class", "faq_img")
			.on("click", function(d) {
				var name = "modelscores";
				self._showDialog(name);
			});

		var expl = self.state.svg.append("text")
			.attr("x",self.state.axis_pos_list[2] + explXOffset)
			.attr("y",scoreTipY + explYOffset)
			.attr("class","tip")
			.text("best matches left to right.");
	},

	_createDiseaseTitleBox: function() {
		var self = this;
		// var dTitleYOffset = self.state.yoffset - self.state.gridTitleYOffset/2;
		// var dTitleXOffset = self.state.colStartingPos;

		var x = self.state.titleOffsets[0]["disease"].x,
			y = self.state.titleOffsets[0]["disease"].y;

		var title = document.getElementsByTagName("title")[0].innerHTML;
		var dtitle = title.replace("Monarch Disease:", "");

		// place it at yoffset - the top of the rectangles with the phenotypes
		var disease = dtitle.replace(/ *\([^)]*\) */g,"");
		var shortDis = self._getShortLabel(disease,60);	// [vaa12] magic number needs removed

		// Use until SVG2. Word Wraps the Disease Title
		this.state.svg.append("foreignObject")
			.attr("width", 205)
			.attr("height", 50)
			.attr("id","diseasetitle")
			//.attr("transform","translate(" + dTitleXOffset + "," + dTitleYOffset + ")")
			.attr("x", x)
			.attr("y", y)
			.append("xhtml:div")
			.html(shortDis);
	},

	_initializeOverviewRegion: function(overviewBoxDim,overviewX,overviewY) {
		var self = this;
		// rectangular border for overview
		var globalview = self.state.svg.append("rect")
			.attr("x", overviewX)
			.attr("y", overviewY)
			.attr("id", "globalview")
			.attr("height", overviewBoxDim)
			.attr("width", overviewBoxDim);

		var overviewInstructionHeightOffset = 50;
		var lineHeight = 12;

		var y = self.state.yModelRegion + overviewBoxDim + overviewInstructionHeightOffset;
		var rect_instructions = self.state.svg.append("text")
			.attr("x", self.state.axis_pos_list[2] + 10)
			// This changes for vertical positioning
			.attr("y", y)
			.attr("class", "instruct")
			.text("Use the phenotype map above to");

		rect_instructions = self.state.svg.append("text")
			.attr("x", self.state.axis_pos_list[2] + lineHeight)
			// This changes for vertical positioning
			.attr("y", y + 10) 
			.attr("class", "instruct")
			.text("navigate the model view on the left");
	},

	_createSmallScales: function(overviewRegionSize) {
		var self = this;
		var sourceList = [];
		var targetList = [];

		// create list of all item ids within each axis
   	    sourceList = self.state.yAxisRender.groupIDs();
	    targetList = self.state.xAxisRender.groupIDs();

	    console.log("source len: " + sourceList.length);
	    console.log("target len: " + targetList.length);

		this.state.smallYScale = d3.scale.ordinal()
			.domain(sourceList.map(function (d) {return d; }))
			.rangePoints([0,overviewRegionSize]);

	    console.log("targetList are .."+JSON.stringify(targetList));
	    /*var targids = targ.map(function (d) {return d; });
	    console.log("target ids are ..."+JSON.stringify(targids));*/

		this.state.smallXScale = d3.scale.ordinal()
			.domain(targetList)
			.rangePoints([0,overviewRegionSize]);
	    //console.log(this.state.smallXScale(targetList[0]));
	    
	    
	},

	// Returns an sorted array of IDs from an arrayed Hashtable, but meant for non-overview display based off pos
	// [vaa12] the reason there are two different ones is how phenogrid prefers displays. _getSortedID can display items that have a pos
	// between 7-37 and keep them numbered as such, where in strict, it will reset 7 to 0, so they will be numbered 0-30
	_getSortedIDList: function(hashArray){
		var resultArray = [];
		for (var j in hashArray) {
			resultArray[hashArray[j][1].pos] = hashArray[j][0];
		}
		return resultArray;
	},

	// Returns an sorted array of IDs from an arrayed Hashtable, but meant for non-overview display based off an previous sort
	// Best for filtered display, as it sets the lowest value to 0 and increases from there
	_getSortedIDListStrict: function (hashArray){
		var firstSort = this._getSortedIDList(hashArray);
		var resultArray = [];
		for (var j in firstSort) {
			resultArray.push(firstSort[j]);
		}
		return resultArray;
	},

	_invertOverviewDragPosition: function(scale,value) {
		var leftEdges = scale.range();
		var size = scale.rangeBand();
		var j;
		for (j = 0; value > (leftEdges[j] + size); j++) {} 
		// iterate until leftEdges[j]+size is past value
		return j;
	},

	_getComparisonType: function(organism){
		var label = "";

		for (var i in this.state.comparisonTypes) {
			if (organism === this.state.comparisonTypes[i].organism){
				label = this.state.comparisonTypes[i].comparison;
			}
		}
		if (label === ""){
			label = this.state.defaultComparisonType.comparison;
		}
		return label;
	}, 

	_setComparisonType: function(){
		var comp = this.state.defaultComparisonType;
		for (var i in this.state.comparisonTypes) {
			if (this.state.targetSpeciesName === this.state.comparisonTypes[i].organism) {
				comp = this.state.comparisonTypes[i];
			}
		}
		this.state.comparisonType = comp;
	},

	_setSelectedCalculation: function(calc) {
		var self = this;

		var tempdata = self.state.similarityCalculation.filter(function(d) {
			return d.calc == calc;
		});
		self.state.selectedCalculation = tempdata[0].calc;
	},

	_setDefaultSelectedSort: function(type) {
		var self = this;
		self.state.selectedSort = type;
	},

	// Previously processSelected
	_processDisplay: function(){
//		this._buildRenderedMatrix();
//		this.state.unmatchedSources = this._getUnmatchedSources();
		this.element.empty();
		this._reDraw();
	},

	// builds the rendered matrix
	_buildRenderedMatrix: function() {
		var newFilteredCell = [];
		this.state.filteredCellData = [];

		console.log ("Rendering the matrix...");
		if ( this.state.targetSpeciesName != "Overview") {
			var sourceList,targetList; 

			sourceList = this.state.yAxisRender.keys();
			targetList = this.state.xAxisRender.keys();


			// loop through the rendered source/target to build matrix
			for(var s=0; s < sourceList.length; s++) {
				for(var t=0; t < targetList.length; t++) {
					var cellMatch = this.state.dataManager.cellPointMatch(sourceList[s], targetList[t], this.state.targetSpeciesName);

					if (typeof (cellMatch) !== 'undefined') {
						var xPos, yPos, source, target;

						if (this.state.invertAxis){
							source = cellMatch.target_id;
							target = cellMatch.source_id;
						} else {
							source = cellMatch.source_id;
							target = cellMatch.target_id;
			 			
}			 			yPos = this.state.yAxisRender.position(source);
	 					xPos = this.state.xAxisRender.position(target);						

			 			if ( xPos > -1 && yPos > -1) {
				 			var coords = {xpos: xPos, ypos: yPos};
				 		
				 			// update cell source/target
				 			cellMatch.source_id = source;
							cellMatch.target_id = target;

				 			var rec = $.extend({}, cellMatch, coords); //, ids);
							newFilteredCell.push(rec);
			 			}			 		
			 		}
				}
			}
			//if (newFilteredCell != null && newFilteredCell.length > 0) {
			//	newFilteredCell.sort(function(a, b) { return a.yPos-b.yPos});	
				this.state.filteredCellData = newFilteredCell;	
			//}
		}
	},

	// given a list of phenotypes, find the top n models
	// I may need to rename this method "getModelData". It should extract the models and reformat the data 
// MKD: this is will be refactored out
	_loadData: function() {

		/*
		 * set the owlsimFunction
		 * there are three possibilities
		 * 'undefined' is the basic, traditional simsearch
		 * 'compare' goes against specific subsets genes/genoetypes
		 * 'exomiser' calls the exomiser for the input data.
		 * COMPARE CALL HACK - REFACTOR OUT
		 */

		if (typeof this.state.owlSimFunction === 'undefined'){
			this.state.owlSimFunction = 'search';
		} else if (this.state.owlSimFunction === 'compare' || this.state.owlSimFunction == 'exomiser'){
			this.state.targetSpeciesName = "Homo sapiens";
		} 

		if (!this.state.hpoCacheBuilt){
			this.state.hpoCacheHash = new Hashtable();
			this.state.hpoCacheLabels = new Hashtable();
		}

		this.state.expandedHash = new Hashtable();  // for cache of genotypes
//		this.state.phenotypeListHash = new Hashtable();      //MKD: source
//		this.state.modelListHash = new Hashtable();			 //MKD: target
	    
	        // cellDataHash is the main table that contains the information on each relationship/cell in the grid.
//		this.state.cellDataHash = new Hashtable({hashCode: cellDataPointPrint, equals: cellDataPointEquals});
	    
		// [vaa12] determine if is wise to preload datasets for the three species and then build overview from this
		// At time being, overview is made up of three calls, which it repeats these calls with a larger limit if you decided to view single species
		// Might be more efficent to load those three, cache them and then make an overview dataset and cache that as well.
		// This is also called when axis is flipped, so might need to create those cached as well (which would be very simple)
		// NOTE: MKD:  it doesn't appear the sim call can return all species at once; default seems to be homosap
/*		if (this.state.targetSpeciesName === "Overview") {
			this._loadOverviewData();
			this._finishOverviewLoad();
		} else {
			this._loadSpeciesData(this.state.targetSpeciesName);
			// [vaa12] line below can be used to force a different limit.  It can be loaded above the API default (100) but has a
			// noticable time delay when trying to load.  There may be a conflict at the API level when trying to go higher than default
			//this._loadSpeciesData(this.state.targetSpeciesName,20);
			this._finishLoad();
		}
*/
		// build out the speciesList, this is used in serveral places and was initialized in _finishOverviewLoad
		// MKD: may need to do this somewhere elese later
		var speciesList = [];
		for (var i in this.state.targetSpeciesList) {	
			var species = this.state.targetSpeciesList[i].name;
			speciesList.push(species);
		}		
		this.state.speciesList = speciesList;

		this.state.hpoCacheBuilt = true;
	},
/*
// MKD: will be refactored to DM
	_loadSpeciesData: function(speciesName,limit) {
		var phenotypeList = this.state.phenotypeData;   // in DM NOW
		var taxon = this._getTargetSpeciesTaxonByName(this,speciesName);
		var res;
		//console.log("this.state.simServerURL is..."+this.state.simServerURL);
		// COMPARE CALL HACK - REFACTOR OUT
		console.log("getting species data...");
		if(jQuery.isEmptyObject(this.state.providedData)) {
			var url = this._getLoadDataURL(phenotypeList,taxon,limit);
			res = this._ajaxLoadData(speciesName,url);
		} else {
			res = this.state.providedData;
		}

		if (typeof (res) !=='undefined' && res !== null) {
			if (typeof(limit) !== 'undefined' && typeof(res.b) !== 'undefined' && res.b !== null && res.b.length < limit) {
				res = this._padSpeciesData(res,speciesName,limit);
			}
		}
		this.state.data[speciesName] = res;
	},
*/
    /*
	 * Make sure there are limit items in res --
	 * If we don't have enough, add some dummy items in. 
	 * This will space things out appropriately, having dummy models take 
	 * up some of the x axis space. Later, we will make sure not to show the labels for these dummies.
	 */
	_padSpeciesData: function(res,species,limit) {
		var toadd = limit - res.b.length;
		for (var i = 0; i < toadd; i++) {
			var dummyId = "dummy" + species + i;
			var newItem = { id: dummyId,
				label: this.state.dummyModelName,
				score: {score: 0, rank: Number.MAX_VALUE},
			};
			res.b.push(newItem);
		}
		return res;
	},
/*
// MKD: this is will be refactored out
	_loadOverviewData: function() {
		var limit = this.state.multiOrganismCt;
		for (var i in this.state.targetSpeciesList) {
			var species = this.state.targetSpeciesList[i].name;
			this._loadSpeciesData(species,limit);
			if (species === this.state.refSpecies && typeof(species) !== 'undefined') { 
			// if it's the one we're reffering to
				if (typeof(this.state.data[species].metadata) !== 'undefined'){
					this.state.maxICScore = this.state.data[species].metadata.maxMaxIC;
				}
			}
			else {
				var data = this.state.data[species];
				if(typeof(data) !== 'undefined' && data.length < limit) {
					limit = (limit - data.length);
				}
			}
		}
	},
*/
	// Different methods of based on the selectedCalculationMethod
	_normalizeIC: function(datarow){
		var aIC = datarow.a.IC;
		var bIC = datarow.b.IC;
		var lIC = datarow.lcs.IC;
		var nic;

		var ics = new Array(3);

		// 0 - similarity
		nic = Math.sqrt((Math.pow(aIC - lIC, 2)) + (Math.pow(bIC - lIC, 2)));
		nic = (1 - (nic / + this.state.maxICScore)) * 100;
		ics[0] = nic;

		// 1 - ratio(q)
		nic = ((lIC / aIC) * 100);
		ics[1] = nic;

		// 2 - uniquenss
		nic = lIC;
		ics[2] = nic;

		// 3 - ratio(t)
		nic = ((lIC / bIC) * 100);
		ics[3] = nic;

		return ics;
	},

	// Returns axis data from a ID of models or phenotypes
	_getAxisData: function(key) {
	 
	     if (this.state.yAxisRender.contains(key)){
		     return this.state.yAxisRender.get(key);
		 } else if (this.state.xAxisRender.contains(key)){
		     return this.state.xAxisRender.get(key);
		 }
		 else { return null; }
	},

	_getAxisDataPosition: function(key) {
	    if (this.state.yAxisRender.contains(key)){
		    return this.state.yAxisRender.position(key);
		} else if (this.state.xAxisRender.contains(key)){
		    return this.state.xAxisRender.position(key);
		}
		else { return -1; }
	},

	// Determines if an ID belongs to the Model or Phenotype hashtable
	// MKD: MOVE TIS TO DATAMANAGER;  use type attribute instead of this hard-code
	_getIDType: function(key) {
		if (this.state.dataManager.contains("target",key, this.state.targetSpeciesName)){
			return "target";
		}
		//else if (this.state.phenotypeListHash.containsKey(key)){
		else if (this.state.dataManager.contains("source", key)) {
			return "source";
		}
		else { return false; }
	},

	_getIDTypeDetail: function(key) {
		//var info = this.state.modelListHash.get(key);
		//var info = this.state.dataManager.getElement("target", key, this.state.targetSpeciesName);
		var info;
	     if (this.state.yAxisRender.contains(key)){
		     info = this.state.yAxisRender.get(key);
		 } else if (this.state.xAxisRender.contains(key)){
		     info = this.state.xAxisRender.get(key);
		 }
		if (typeof(info) !== 'undefined') return info.type;
		return "unknown";
	},

	// generic ajax call for all queries
	// MKD: refactor to DM
	_ajaxLoadData: function (target, url) {
		var self = this;
		var res;
		jQuery.ajax({
			url: url, 
			async : false,
			dataType : 'json',
			success : function(data) {
				res = data;
			},
			error: function (xhr, errorType, exception) { 
			// Triggered if an error communicating with server

			switch(xhr.status){
				case 404:
				case 500:
				case 501:
				case 502:
				case 503:
				case 504:
				case 505:
				default:
					msg = "We're having some problems. Please try again soon.";
					break;
				case 0: 
					msg = "Please check your network connection.";
					break;
				}
			} 
		});
		return res;
	},

	_createColorScale: function() {
		var maxScore = 0,
		method = this.state.selectedCalculation;

		switch(method){
			case 2: maxScore = this.state.maxICScore;
			break;
			case 1: maxScore = 100;
			break;
			case 0: maxScore = 100;
			break;
			case 3: maxScore = 100;
			break;
			default: maxScore = this.state.maxICScore;
			break;
		}	
		// 3 september 2014 still a bit clunky in handling many organisms, but much less hardbound. 
		this.state.colorScale = {};

		for (var i in this.state.targetSpeciesList) {
			var species = this.state.targetSpeciesList[i].name;
			this.state.colorScale[species] = new Array(4);
			for (var j = 0; j <4; j++) {
				maxScore = 100;
				if (j == 2) {
					maxScore = this.state.maxICScore;
				}
				if (typeof(this.state.colorRanges[i][j]) !== 'undefined') {
					this.state.colorScale[species][j] = this._getColorScale(i, maxScore);
				}
			}
		}
	},

	_getColorScale: function(speciesIndex,maxScore) {
		var cs = d3.scale.linear();
		cs.domain([3, maxScore]);
		cs.domain(this.state.colorDomains.map(cs.invert));
		cs.range(this.state.colorRanges[speciesIndex]);
		return cs;
	},

	_initCanvas: function() {
		this._createSvgContainer();
		var svgContainer = this.state.svgContainer;
		svgContainer.append("<svg id='svg_area'></svg>");
		this.state.svg = d3.select("#svg_area")
				.attr("width", "100%")
				.attr("height", 600);//displayRangeCount * this.state.widthOfSingleCell);

		 this._addGridTitle();
		 this._createDiseaseTitleBox();
		
	},

	_createSvgContainer: function() {
		var svgContainer = $('<div id="svg_container"></div>');
		this.state.svgContainer = svgContainer;
		this.element.append(svgContainer);
	},

	// NEW - add a sticky tooltip div stub, this is used to dynamically set a tooltip for gene info and expansion
	_addStickyTooltipAreaStub: function() {
		var sticky = $("<div>")
						.attr("id", "mystickytooltip")
						.attr("class", "stickytooltip");
					
		var inner1 = $("<div>")
						.attr("style", "padding:5px");

		var atip =  $("<div>")
						.attr("id", "sticky1")
						.attr("class", "atip");
		
		var img = $("<img>")
				.attr("id", "img-spinner")
				.attr("src", this.state.scriptpath + "../image/waiting_ac.gif")
				.attr("alt", "Loading, please wait...");

		var wait = $("<div>")
			.attr("id", "wait")
			//.attr("class", "spinner")
			.attr("style", "display:none")
			.text("Searching for data...");

			wait.append(img);
		var status = $("<div>")
			.attr("class", "stickystatus");

		inner1.append(wait).append(atip);

		sticky.append(inner1);
				//.append(wait);
				//.append(status);

		// always append to body
		sticky.appendTo('body');
			sticky.mouseleave("mouseout",function(e) {
			//console.log("sticky mouse out. of sticky.");
			stickytooltip.closetooltip();
		});
	},
	
	_addGridTitle: function() {
		var species = '';

		// set up defaults as if overview
		var xoffset = this.state.overviewGridTitleXOffset;
		var foffset = this.state.overviewGridTitleFaqOffset;

		var x = this.state.titleOffsets[0]["main"].x,
			y = this.state.titleOffsets[0]["main"].y;

		var titleText = "Cross-Species Overview";

		if (this.state.targetSpeciesName !== "Overview") {
			species= this.state.targetSpeciesName;
			xoffset = this.state.nonOverviewGridTitleXOffset;
			foffset = this.state.nonOverviewGridTitleFaqOffset;
			var comp = this._getComparisonType(species);
			titleText = "Phenotype Comparison (grouped by " + species + " " + comp + ")";
		}
		// COMPARE CALL HACK - REFACTOR OUT
		if (this.state.owlSimFunction === 'compare' || this.state.owlSimFunction === 'exomiser'){
			titleText = "Phenotype Comparison";
		}

		var mtitle = this.state.svg.append("svg:text")
			.attr("class","gridtitle")
			.attr("id","toptitle2")
			.attr("x",x) 		//xoffset)
			.attr("y", y)		//this.state.gridTitleYOffset)
			.text(titleText);

		/*
		 * foffset is the offset to place the icon at the right of the grid title.
		 * ideally should do this by dynamically grabbing the width of mtitle,
		 * but that doesn't seem to work.
		 */
		var faq	= this.state.svg
			.append("svg:image")
			.attr("xlink:href", this.state.scriptpath + "../image/greeninfo30.png")
			.attr("x",xoffset+foffset)
			.attr("id","faqinfo")
			.attr("width", this.state.faqImgSize)
			.attr("height",this.state.faqImgSize)
//			.attr("font-family","FontAwesome")
//			.attr('font-size', function(d) { return '70px';} )
//			.text(function(d) {return 'test \uf083';})
			.attr("class","faq_img")
			.on("click", function(d) {
				self._showDialog("faq");
			});
	},

	_configureFaqs: function() {
		var sorts = $("#sorts")
			.on("click", function(d,i){
				self._showDialog( "sorts");
			});

		//var calcs = d3.selectAll("#calcs")
		var calcs = $("#calcs")
			.on("click", function(d){
				self._showDialog( "calcs");
			});
	},

	_resetSelections: function(type) {
		var self = this;
		$("#unmatchedlabel").remove();
		$("#unmatchedlabelhide").remove();
		$("#unmatched").remove();
		$("#selects").remove();
		$("#org_div").remove();
		$("#calc_div").remove();
		$("#sort_div").remove();
		$("#mtitle").remove();
		$("#header").remove();
		$("#svg_area").remove();

		if (type === "organism"){
			self._reset("organism");
			self._init();
		} else if (type === "calculation"){
			self._reset("calculation");
		} else if (type === "sortphenotypes"){
			self._reset("sortphenotypes");
		} else if (type === "axisflip"){
			self._reset("axisflip");
//			self._init();  // MKD: this reloads data, needs refactored
		}
	},

	_addLogoImage:	 function() { 
		var start = 0;
// MKD: can this dependency be removed?
		if(this.state.filteredCellData.length < 30){
			// Magic Nums
			start = 680;
		} else { 
			start = 850;
		}
		//var imgs = this.state.svg.selectAll("image").data([0]);
		//imgs.enter()
		this.state.svg.append("svg:image")
			.attr("xlink:href", this.state.scriptpath + "../image/logo.png")
			.attr("x", start)
			.attr("y",0)
			.attr("id", "logo")
			.attr("width", "60")
			.attr("height", "90");
	},

	_resetLinks: function() {
		// don't put these styles in css file - these styles change depending on state
		this.state.svg.selectAll("#detail_content").remove();

		var link_lines = d3.selectAll(".data_text");
		for (var i in link_lines[0]){
			link_lines[0][i].style.fill = this._getExpandStyling(link_lines[0][i].id);
		}
		link_lines.style("font-weight", "normal");
		link_lines.style("text-decoration", "none");
		link_lines.style("text-anchor", "end");

		var link_labels = d3.selectAll(".model_label");
		for (var j in link_labels[0]){
			link_labels[0][j].style.fill = this._getExpandStyling(link_labels[0][j].id);
		}
		link_labels.style("font-weight", "normal");
		link_labels.style("text-decoration", "none");
	},

	// Will return all partial matches in the cellDataHash structure.  Good for finding rows/columns of data
	_getMatchingModels: function (key) {
		//var cellKeys = this.state.cellDataHash.keys();
		var cellKeys = this.state.dataManager.keys("cellData");  // MKD: this still needs work, esp for overview mode
		var matchingKeys = [];
		for (var i in cellKeys){
//			if (key == cellKeys[i].yID || key == cellKeys[i].xID){
			if (key == cellKeys[i].source_id || key == cellKeys[i].target_id){
				matchingKeys.push(cellKeys[i]);
			}
		}
		return matchingKeys;
	},

	// Merging of both Highlight model and phenotype functions
// MKD: this needs some refactoring	
	_highlightMatching: function(curr_data){
		var self = this;
		var alabels, label, ID;
		var dataType = self._getIDType(curr_data);
		var models = self._getMatchingModels(curr_data);
		var highlightX = false;

		if (dataType === "source"){
			if (this.state.invertAxis){
				alabels = this.state.svg.selectAll("text.a_text");
				highlightX = true;
			} else {
				alabels = this.state.svg.selectAll("text.model_label");
			}
		} else if (dataType === "target"){
			if (this.state.invertAxis){
				alabels = this.state.svg.selectAll("text.model_label");
			} else {
				alabels = this.state.svg.selectAll("text.a_text");
				highlightX = true;
			}
		}

		for (var i in models){
			if (highlightX){
				ID = models[i].source_id;   //yID;
			} else {
				ID = models[i].target_id;   //xID;
			}

			label = self._getAxisData(ID).label;
			if (label === undefined){
				label = ID;
			}

			for (var j in alabels[0]){
				if (alabels[0][j].id == ID){
					alabels[0][j].style.fill = "blue";
				}
			}
		}
	},

	// Merging of both deselect model and phenotype functions
	_deselectMatching: function(curr_data){
		var self = this;
		var dataType = self._getIDType(curr_data);
		var label, alabels, shortTxt, shrinkSize;
		if (dataType === "source"){
			if (!this.state.invertAxis){
				alabels = this.state.svg.selectAll("text.a_text");
				shrinkSize = self.state.textLength;
			} else {
				alabels = this.state.svg.selectAll("text.model_label");
				shrinkSize = self.state.labelCharDisplayCount;
			}
		} else if (dataType === "target"){
			if (!this.state.invertAxis){
				alabels = this.state.svg.selectAll("text.model_label"); 
				shrinkSize = self.state.labelCharDisplayCount;
			} else {
				alabels = this.state.svg.selectAll("text.a_text"); 
				shrinkSize = self.state.textLength;
			}
		} else {
			alabels = this.state.svg.selectAll("text.a_text");
			shrinkSize = self.state.textLength;

			// Clear both axis.  One here, one below
			var blabels = this.state.svg.selectAll("text.model_label");
			for (var i in blabels[0]){
				label = this._getAxisData(blabels[0][i].id).label;
				shortTxt = this._getShortLabel(label,self.state.labelCharDisplayCount);
				if (blabels[0][i].innerHTML == shortTxt){
					blabels[0][i].style.fill = this._getExpandStyling(blabels[0][i].id); //"black";
				}
			}
		}

		for (var j in alabels[0]){
			var obj = this._getAxisData(alabels[0][j].id);

			label = obj.label;

			if (label != null && typeof(label) !== 'undefined') {
				shortTxt = this._getShortLabel(label,shrinkSize);
				if (alabels[0][j].innerHTML == shortTxt){	
					alabels[0][j].style.fill = this._getExpandStyling(alabels[0][j].id); //"black";
				}
			}
		}
	},

	// Will capitalize words passed or send back undefined incase error
	_capitalizeString: function(word){
		if (word === undefined) {
			return "Undefined";
		} else {
			return word.charAt(0).toUpperCase() + word.slice(1);
		}
	},

	_selectXItem: function(data, obj) {
		// HACK: this temporarily 'disables' the mouseover when the stickytooltip is docked
		// that way the user doesn't accidently hover another label which caused tooltip to be refreshed
		if (stickytooltip.isdocked){ return; }

		var self = this;
	    //var displayCount = self._getYLimit();
	    var sourceDisplayCount = self.state.yAxisRender.size();
		var concept = self._getConceptId(data);
		//console.log("selecting x item.."+concept);
		var appearanceOverrides;

		// Show that model label is selected. Change styles to bold, blue and full-length label
		var target_label = self.state.svg.selectAll("text#" + concept)
			.style("font-weight", "bold")
			.style("fill", "blue");

		appearanceOverrides = self._createHoverBox(data);   // TODO:we may want to rethink using this return value override

		// create the related model rectangles
		var highlight_rect = self.state.svg.append("svg:rect")
			.attr("transform","translate(" + (self.state.textWidth + self.state.xOffsetOver + 32) + "," + self.state.yoffsetOver + ")")
			.attr("x", function(d) { return (self.state.xScale(data) - 1);})
			.attr("y", self.state.yoffset + 5) 
			.attr("class", "model_accent")
			.attr("width", 15 * appearanceOverrides.offset)
			.attr("height", (sourceDisplayCount * self.state.heightOfSingleCell));

		// obj is try creating an ojbect with an attributes array including "attributes", but I may need to define getAttrbitues
		// just create a temporary object to pass to the next method...
		obj = {
			attributes: [],
			getAttribute: function(keystring) {
				var ret = self.state.xScale(data) + 15;
				if (keystring == "y") {
					ret = Number(self.state.yoffset - 100);
				}
				return ret;
			},
		};
		obj.attributes.transform = {value: highlight_rect.attr("transform")};
		self._highlightMatching(data);
	},

	// Previously _selectData
	_selectYItem: function(curr_data, obj) {
		var appearanceOverrides;
		// create a highlight row
		if (stickytooltip.isdocked){ return; }

		var self = this;
		//var info = self._getAxisData(curr_data);
		var id = curr_data.id;
		
		//console.log("select y item.. "+txt);

		var alabels = this.state.svg.selectAll("text.a_text." + id)
			.style("font-weight", "bold")
			.style("fill", "blue");

		appearanceOverrides = self._createHoverBox(id);

		// create the related row rectangle
		var highlight_rect = self.state.svg.append("svg:rect")
//			.attr("transform","translate(" + (self.state.axis_pos_list[1]) + "," + (self.state.yoffsetOver + 4) + ")")
			.attr("transform","translate(252, " + (this.state.yModelRegion + 5) + ")")			
			.attr("x", 0) //
			.attr("y", self._getAxisDataPosition(id) * self.state.heightOfSingleCell) //.ypos
			.attr("class", "row_accent")  
			.attr("width", this.state.modelWidth - 4)
			.attr("height", 11 * appearanceOverrides.offset);

		this._highlightMatching(curr_data);
	},

	_createHoverBox: function(data){
		var appearanceOverrides = {offset: 1, style: "model_accent"}; // may use this structure later, offset is only used now
		var info = this._getAxisData(data);
		var type = info.type;
		if (type === undefined){
			type = this._getIDType(data);
		}

		var concept = this._getConceptId(data);

		// format data for rendering in a tooltip
		var retData = this.state.tooltipRender.html({parent: this, id:concept, data: info});   

		// update the stub stickytool div dynamically to display
		$("#sticky1").empty();
		$("#sticky1").html(retData);

		// not really good to do this but, we need to be able to override some appearance attributes		
		return appearanceOverrides;
	},

	// This builds the string to show the relations of the HPO nodes.  It recursively cycles through the edges and in the end returns the full visual structure displayed in the phenotype hover
	buildHPOTree: function(id, edges, level) {
		var results = "";
		var nextResult;
		var nextLevel = level + 1;

		for (var j in edges){
			// Currently only allows subClassOf relations.  When new relations are introducted, it should be simple to implement
			if (edges[j].pred == "subClassOf" && this.state.ontologyTreesDone != this.state.ontologyTreeAmounts){
				if (edges[j].sub == id){
					if (this.state.ontologyTreeHeight < nextLevel){
						this.state.ontologyTreeHeight++;
					}
					nextResult = this.buildHPOTree(edges[j].obj, edges, nextLevel);
					if (nextResult === ""){
						// Bolds the 'top of the line' to see what is the root or closet to the root.  It will hit this point either when it reaches the ontologyDepth or there are no parents
						results += "<br/>" + this._buildIndentMark(this.state.ontologyTreeHeight - nextLevel) + "<strong>" + this._buildHPOHyperLink(edges[j].obj) + "</strong>";
						this.state.ontologyTreesDone++;
					} else {
						results += nextResult + "<br/>" + this._buildIndentMark(this.state.ontologyTreeHeight - nextLevel) + this._buildHPOHyperLink(edges[j].obj);
					}
					
					if (level === 0){
						results += "<br/>" + this._buildIndentMark(this.state.ontologyTreeHeight) + this.state.hpoCacheLabels.get(id) + "<br/>";
						this.state.ontologyTreeHeight = 0;
					}
				}
			}
		}
		return results;
	},

	_buildIndentMark: function (times){
		var mark = "";
		for (var i = 0; i < times; i++){
			mark += "----";
		}
		return mark;
	},

	// Based on the ID, it pulls the label from hpoCacheLabels and creates a hyperlink that allows the user to go to the respective phenotype page
	_buildHPOHyperLink: function(id){
		var label = this.state.hpoCacheLabels.get(id);
		var link = "<a href=\"" + this.state.serverURL + "/phenotype/" + id + "\" target=\"_blank\">" + label + "</a>";
		return link;
	},

	// Previously _deselectData + _clearModelData
	_deselectData: function (data) {
		var self = this;
		this.state.svg.selectAll(".row_accent").remove();
		this.state.svg.selectAll("#detail_content").remove();
		this.state.svg.selectAll(".model_accent").remove();
		this._resetLinks();
		if (data !== undefined){
			var IDType = this._getIDType(data);
			var alabels;
			if (IDType) {
				var id = this._getConceptId(data);
				if (typeof(id) !== 'undefined') {
					var label = this._getAxisData(data).label;

					if ((IDType == "source" && !this.state.invertAxis) || (IDType == "target" && this.state.invertAxis)){
						alabels = this.state.svg.selectAll("text.a_text." + id);
						alabels.html(this._getShortLabel(label));
					}else if ((IDType == "source" && this.state.invertAxis) || (IDType == "target" && !this.state.invertAxis)){
						alabels = this.state.svg.selectAll("text#" + id);
						alabels.html(this._getShortLabel(label,self.state.labelCharDisplayCount));
					}

					alabels.style("font-weight","normal");
					alabels.style("text-decoration", "none");
					//alabels.style("fill", "black");
					alabels.style("fill", this._getExpandStyling(data));
				}
				//this._deselectMatching(data);
			}
		}
		//stickytooltip.closetooltip();
	},

	_clickItem: function(url_origin,data) {
		var url;
		var apientity = this.state.defaultApiEntity;
		if (this._getIDType(data) == "source"){
			url = url_origin + "/phenotype/" + (data.replace("_", ":"));
			var win = window.open(url, '_blank');

		} else if (this._getIDType(data) == "target"){
			apientity = this._getIDTypeDetail(data);

			// if it's overview, then just allow view of the model clicked
			if (this.state.targetSpeciesName != "Overview" && apientity == 'gene') {
				// TEMP: THIS HIDES THE GENOTYPE EXPANSION STUFF FOR NOW
				//var expanded = this._isExpanded(data);
				//if (expanded !== null && expanded) {
				// 	this._collapse(data);
				//} else if (expanded !== null && !expanded){
				// 	this._expand(data);
				//}
			}
		} else {
			console.log ("URL CLICK ERROR");
		}
	},

	// return a label for use in the list. This label is shortened to fit within the space in the column
	_getShortLabel: function(label, newlength) {
		if (label !== undefined){
			var retLabel = label;
			if (!newlength) {
				newlength = this.state.textLength;
			}
			if (label.length > newlength) {
				retLabel = label.substring(0,newlength-3) + "...";
			}	
			return retLabel;
		}else {
			return "Unknown";
		}
	},

	/*
	 * This method extracts the unique id from a given URI for example, http://www.berkeleybop.org/obo/HP:0003791 would return HP:0003791
	 * Why? Two reasons. First it's useful to note that d3.js doesn't like to use URI's as ids.
	 * Second, I like to use unique ids for CSS classes. This allows me to selectively manipulate related groups of items on the
	 * screen based their relationship to a common concept (ex: HP000123). However, I can't use a URI as a class.
	 */
	_getConceptId: function (uri) {
		// replace spaces with underscores. Classes are separated with spaces so a class called "Model 1" will be two classes: Model and 1. Convert this to "Model_1" to avoid this problem.
		var retString = uri;
		try {
			retString = retString.replace(" ", "_");
			retString = retString.replace(":", "_");
			return retString;
		} catch (exception) {}
	},

	_convertLabelHTML: function (self, t, label, data) {
		self = this;
		var width = 100,
		el = d3.select(t),
		p = d3.select(t.parentNode),
		x = +t.getAttribute("x"),
		y = +t.getAttribute("y");

		// this fixes the labels that are html encoded 
		label = this._decodeHtmlEntity(label);

		p.append("text")
			.attr('x', function(d) {
				var p = self._getAxisDataPosition(d);
				var x = p * self.state.widthOfSingleCell;  //x += 15;
				return x;})
			.attr('y', y)
			.attr("width", width)
			.attr("id", self._getConceptId(data))
			.attr("model_id", data)
			.attr("height", 60)
			.attr("transform", function(d) {
				return "rotate(-45)";
			})
			//.on("click", function(d) {
			//	self._clickItem(self.state.serverURL,data);
			//})
			.on("mouseover", function(d, event) {  
				self._selectXItem(data, this);
			})
			.on("mouseout", function(d) {
				self._deselectData(data);
			})
			.attr("class", this._getConceptId(data) + " model_label")
			// this activates the stickytool tip			
			.attr("data-tooltip", "sticky1")   			
			//.style("font-size", "12px")
			//.style("font-weight", "bold")
			.style("fill", this._getExpandStyling(data))
			// don't show the label if it is a dummy.
			.text( function(d) {
				if (label == self.state.dummyModelName){
					return ""; 
				} else {
					return label;
				}});

		// put a little icon indicator in front of the label
		if (this._hasChildrenForExpansion(data)) {
			p.append("image")
			.attr('x', x-3)
			.attr('y', y-10)
			.attr('width', 9)
			.attr('height', 9)
			.attr('xlink:href', '/widgets/phenogrid/image/downarrow.png');  
		} else if (this._isGenoType(data) ){
			p.append("image")
			.attr('x', x-3)
			.attr('y', y-10)
			.attr('width', 9)
			.attr('height', 9)
			.attr('xlink:href', '/widgets/phenogrid/image/checkmark-drk.png'); //small-bracket.png');
		}

		el.remove();
	},

	_updateDetailSection: function(htmltext, coords, width, height) {
		this.state.svg.selectAll("#detail_content").remove();

		var w = this.state.detailRectWidth - (this.state.detailRectStrokeWidth * 2);
		var h = this.state.detailRectHeight - (this.state.detailRectStrokeWidth * 2);
		if (width !== undefined) {
			w = width;
		}
		if (height !== undefined) {
			h = height;
		}
		var wdt = this.state.axis_pos_list[1] + ((this.state.axis_pos_list[2] - this.state.axis_pos_list[1])/2);
	    //var displayCount = this._getYLimit();
	    var displayCount = this.state.yAxisRender.size();
		var hgt = displayCount * 10 + this.state.yoffset;
		var yv, wv;

		if (coords.y > hgt) { yv = coords.y - this.state.detailRectHeight - 10;}
		else {yv = coords.y + 20;}

		if (coords.x > wdt) { wv = coords.x - w - 20;}
		else {wv = coords.x + 20;}

		this.state.svg.append("foreignObject")
			.attr("width", w)
			.attr("height", h)
			.attr("id", "detail_content")
			// add an offset. Otherwise, the tooltip turns off the mouse event
			.attr("y", yv)
			.attr("x", wv) 
			.append("xhtml:body")
			.attr("id", "detail_text")
			.html(htmltext);
	},

	_showCellData: function(d, obj) {
		var retData, prefix, targetLabel, sourceLabel, type;

		var yInfo = this._getAxisData(d.source_id); //this._getAxisData(d.yID); 
		var xInfo = this._getAxisData(d.target_id);
		var fullInfo = $.extend({},xInfo,yInfo);
		var species = fullInfo.species;
		var taxon = fullInfo.taxon;

		 if (self.state.invertAxis) {
			sourceLabel = xInfo.label;
			targetLabel = yInfo.label;
			type = yInfo.type;
		 } else {
			sourceLabel = yInfo.label;
			targetLabel = xInfo.label;
			type = xInfo.type;
		 }

		if (taxon !== undefined || taxon !== null || taxon !== '' || isNaN(taxon)) {
			if (taxon.indexOf("NCBITaxon:") != -1) {
				taxon = taxon.slice(10);
			}
		}

		for (var idx in this.state.similarityCalculation) {	
			if (this.state.similarityCalculation[idx].calc === this.state.selectedCalculation) {
				prefix = this.state.similarityCalculation[idx].label;
			break;
			}
		}

		// Hiding scores which are equal to 0
		var formatScore =  function(score) {
			if(score === 0) {
				return "";
			} else {
				return " (IC: " + score + ")";
			}
		};

		var suffix = "";
		// If the selected calculation isn't percentage based (aka similarity) make it a percentage
		if (this.state.selectedCalculation != 2) {suffix = '%';}

		retData = "<strong>Query: </strong> " + sourceLabel + formatScore(fullInfo.IC.toFixed(2)) +
			"<br/><strong>Match: </strong> " + d.b_label + formatScore(d.b_IC.toFixed(2)) +
			"<br/><strong>Common: </strong> " + d.subsumer_label + formatScore(d.subsumer_IC.toFixed(2)) +
			"<br/><strong>" + this._capitalizeString(type)+": </strong> " + targetLabel +
			"<br/><strong>" + prefix + ":</strong> " + d.value[this.state.selectedCalculation].toFixed(2) + suffix +
			"<br/><strong>Species: </strong> " + species + " (" + taxon + ")";

//		console.log(retData);
		this._updateDetailSection(retData, this._getXYPos(obj));
	},

	_showThrobber: function() {
		this.state.svg.selectAll("#detail_content").remove();
		this.state.svg.append("svg:text")
			.attr("id", "detail_content")
			.attr("y", (26 + this.state.detailRectStrokeWidth))
			.attr("x", (440+this.state.detailRectStrokeWidth))
			.style("font-size", "12px")
			.text("Searching for data");
		this.state.svg.append("svg:image")
			.attr("width", 16)
			.attr("height", 16)
			.attr("id", "detail_content")
			.attr("y", (16 + this.state.detailRectStrokeWidth))
			.attr("x", (545 + this.state.detailRectStrokeWidth))
			.attr("xlink:href","/widgets/phenogrid/image/throbber.gif");
	},

	// extract the x,y values from a SVG transform string (ex: transform(200,20))
	_extractTransform: function(dataString) {
		var startIdx = dataString.indexOf("(");
		var commaIdx = dataString.indexOf(",");
		var x_data = Number(dataString.substring(startIdx+1,commaIdx));
		var y_data = Number(dataString.substring(commaIdx+1, dataString.length-1));
		return { x: x_data, y: y_data};
	},

	/*
	 * The the "SVG" XY position of an element
	 * The mouse position returned by d3.mouse returns the poistion within the page, not the SVG
	 * area. Therefore, this is a two step process: retreive any transform data and the (x,y) pair.
	 * Return the (x,y) coordinates with the transform applied
	 */
	_getXYPos: function(obj) {
		var tform = { x: 0, y: 0};
		// if a transform exists, apply it
		if (typeof obj.attributes.transform != 'undefined') {
			var transform_str = obj.attributes.transform.value;
			tform = this._extractTransform(transform_str);
		}
		return {x: Number(obj.getAttribute("x")) + tform.x, y: Number(obj.getAttribute("y")) + tform.y};
	},


	_createSpeciesBorderOutline: function () {
		// create the related model rectangles
		var self = this;
		var list = [];
		var ct, width, height, borderStroke;
		var vwidthAndGap = self.state.heightOfSingleCell;
		var hwidthAndGap = self.state.widthOfSingleCell;
		var totCt = 0;
		var parCt = 0;
	    var displayCount = self.state.yAxisRender.size();
	    var displayCountX = self.state.xAxisRender.size();

		// Have temporarly until fix for below during Axis Flip
		if (self.state.targetSpeciesName == "Overview"){
			if (this.state.invertAxis) {
				list = self.state.speciesList;
				ct = self.state.multiOrganismCt;
				borderStroke = self.state.detailRectStrokeWidth / 2;
				width = hwidthAndGap * displayCountX;
				height = vwidthAndGap * ct + borderStroke;
			} else {
				list = self.state.speciesList;
				ct = self.state.multiOrganismCt;
				borderStroke = self.state.detailRectStrokeWidth;
				width = hwidthAndGap * ct;
				height = vwidthAndGap * displayCount + borderStroke * 2;
			}
		} else {
			list.push(self.state.targetSpeciesName);
			ct = displayCountX;
			borderStroke = self.state.detailRectStrokeWidth;
			width = hwidthAndGap * ct;
			height = vwidthAndGap * displayCount + borderStroke * 2;
		}

		var border_rect = self.state.svg.selectAll(".species_accent")
			.data(list)
			.enter()
			.append("rect")
			.attr("transform","translate(" + (self.state.textWidth + self.state.xOffsetOver + 30) + "," + (self.state.yoffsetOver) + ")")
			.attr("class", "species_accent")
			.attr("width", width)
			.attr("height", height)
			.attr("stroke", "black")
			.attr("stroke-width", borderStroke)
			.attr("fill", "none");

			if (self.state.targetSpeciesName == "Overview" && this.state.invertAxis){
				border_rect.attr("x", 0);
				border_rect.attr("y", function(d,i) { 
					totCt += ct;
					if (i === 0) { return (self.state.yoffset + borderStroke); }
					else {
						parCt = totCt - ct;
						return (self.state.yoffset + borderStroke) + ((vwidthAndGap) * parCt + i);
					}
				});
			} else {
				border_rect.attr("x", function(d,i) { 
					totCt += ct;
					if (i === 0) { return 0; }
					else {
						parCt = totCt - ct;
						return hwidthAndGap * parCt;
					}
				});
				border_rect.attr("y", self.state.yoffset + 1);
			}
	},

	_enableRowColumnRects: function(curr_rect){
	    var self = this;
		var cell_rects = self.state.svg.selectAll("rect.cells")
			.filter(function (d) { return d.rowid == curr_rect.__data__.rowid;});
		for (var i in cell_rects[0]){
			cell_rects[0][i].parentNode.appendChild(cell_rects[0][i]);
		}
		var data_rects = self.state.svg.selectAll("rect.cells")
			.filter(function (d) { return d.target_id == curr_rect.__data__.target_id;});
		for (var j in data_rects[0]){
			data_rects[0][j].parentNode.appendChild(data_rects[0][j]);
		}
	},

	_highlightIntersection: function(curr_data, obj){
		var self = this;
	    //var displayCount = self._getYLimit();
	    var displayCount = self.state.yAxisRender.size();
		// Highlight Row
		var highlight_rect = self.state.svg.append("svg:rect")
			//.attr("transform","translate(" + (self.state.axis_pos_list[1]) + ","+ (self.state.yoffsetOver + 4 ) + ")")
			.attr("transform","translate(254, " + (this.state.yModelRegion + 5) + ")")
			.attr("x", 0) //12
			.attr("y", function(d) {
					var p = self.state.yAxisRender.position(curr_data.source_id);
					console.log("position:"+p);
				return  p * self.state.heightOfSingleCell; }) //rowid yID
			.attr("class", "row_accent")
			.attr("width", this.state.modelWidth - 4)
			.attr("height", self.state.heightOfSingleCell);

		this.state.selectedRow = curr_data.source_id;  //yID;
		this.state.selectedColumn = curr_data.target_id;    //xID;
		//this._resetLinks();

		/*
		 * To get the phenotype label from the selected rect data, we need to concat the phenotype ids to the model id 
		 * that is in the 0th position in the grid. No labels exist with the curr_data.id except for the first column
		 * For the overview, there will be a 0th position for each species so we need to get the right model_id
		 */

		var source_label = this.state.svg.selectAll("text.a_text." + this._getConceptId(curr_data.source_id));  //yID
		source_label.style("font-weight", "bold");
		source_label.style("fill", "blue");

		// Highlight Column
		var target_label = self.state.svg.selectAll("text#" + this._getConceptId(curr_data.target_id));  //xID
		target_label.style("font-weight", "bold");
		target_label.style("fill", "blue");

		// create the related model rectangles
		var highlight_rect2 = self.state.svg.append("svg:rect")
			.attr("transform","translate(" + (self.state.textWidth + self.state.xOffsetOver + 34) + "," +self.state.yoffsetOver+ ")")
			.attr("x", function(d) { 
				var p = self.state.xScale(curr_data.target_id) - 1;
				console.log("xscale:"+p);
				return p;})  // xID
			.attr("y", self.state.yoffset + 2 )
			.attr("class", "model_accent")
			.attr("width", self.state.heightOfSingleCell)
			.attr("height", (displayCount * self.state.heightOfSingleCell));
	},

	_updateAxes: function() {
		var self = this;
		var data = [];

		// This is for the new "Overview" target option 
		if (this.state.targetSpeciesName == "Overview"){
			//MKD: data = this.state.cellDataHash.keys();
			data = this.state.dataManager.keys("cellData");   //MKD: NEEDS SOME WORK 
		} else {
			data = self.state.filteredCellData;
		}
		this.state.h = (data.length * 2.5);

		self.state.yScale = d3.scale.ordinal()
			.domain(data.map(function (d) { return d.source_id; }))  //d.yID; }))
			.range([0,data.length])
			.rangePoints([self.state.yModelRegion,self.state.yModelRegion + this.state.h]);

		// update accent boxes
		self.state.svg.selectAll("#rect.accent").attr("height", self.state.h);
	},

	/*
	 * Change the list of phenotypes and filter the models accordingly. The 
	 * Movecount is an integer and can be either positive or negative
	 */
	_updateCells: function(newXPos, newYPos){
		var xSize = this.state.xAxisRender.groupSize();
		var ySize = this.state.yAxisRender.groupSize();
		var newXEndPos, newYEndPos;

console.log("X:"+newXPos + " Y:"+newYPos);
		if (newXPos >= xSize){
			this.state.currXIdx = xSize;
		} else {
			this.state.currXIdx = newXPos;
		}

		if (newYPos >= ySize){
			this.state.currYIdx = ySize;
		} else {
			this.state.currYIdx = newYPos;
		}

	
		// note: that the currXIdx accounts for the size of the hightlighted selection area
		// so, the starting render position is this size minus the display limit
		console.log("curX:"+this.state.currXIdx + " curY:"+this.state.currYIdx);
		this.state.xAxisRender.setRenderStartPos(this.state.currXIdx-this.state.targetDisplayLimit);
		this.state.xAxisRender.setRenderEndPos(this.state.currXIdx);
console.log("xaxis start:" + this.state.xAxisRender.getRenderStartPos() + " end:"+this.state.xAxisRender.getRenderEndPos());

		this.state.yAxisRender.setRenderStartPos(this.state.currYIdx-this.state.sourceDisplayLimit);
		this.state.yAxisRender.setRenderEndPos(this.state.currYIdx);

console.log("yaxis start:" + this.state.yAxisRender.getRenderStartPos() + " end:"+this.state.yAxisRender.getRenderEndPos());

		this._buildRenderedMatrix();
		this._clearXLabels();

		this._createXRegion();
		this._createYRegion();
		this._createSpeciesBorderOutline();
		//this._createCellRects();

		/*
		 * this must be initialized here after the _createModelLabels, or the mouse events don't get
		 * initialized properly and tooltips won't work with the mouseover defined in _convertLableHTML
		 */
		stickytooltip.init("*[data-tooltip]", "mystickytooltip");
	},

	// Previously _createModelLabels
	_createXLabels: function(self, models) {
		var target_x_axis = d3.svg.axis().scale(self.state.xScale).orient("top");
		self.state.svg.append("g")
			.attr("transform","translate(" + (self.state.textWidth + self.state.xOffsetOver + 28) + "," + self.state.yoffset + ")")
			.attr("class", "x axis")
			.call(target_x_axis)
			// this be some voodoo...
			// to rotate the text, I need to select it as it was added by the axis
			.selectAll("text") 
			.each(function(d,i) { 
				var labelM = self._getAxisData(d).label;
				self._convertLabelHTML(self, this, self._getShortLabel(labelM,self.state.labelCharDisplayCount),d);
			});
	},

	// Previously _clearModelLabels
	_clearXLabels: function() {
		this.state.svg.selectAll("g .x.axis").remove();
		this.state.svg.selectAll("g .tick.major").remove();
	},

	// Previously _createModelLines
	_createXLines: function() {
		var modelLineGap = 10;
		var lineY = this.state.yoffset - modelLineGap;
		this.state.svg.selectAll("path.domain").remove();
		this.state.svg.selectAll("text.scores").remove();
		this.state.svg.selectAll("#specieslist").remove();

		this.state.svg.append("line")
			.attr("transform","translate(" + (this.state.textWidth + this.state.xOffsetOver + 30) + "," + lineY + ")")
			.attr("x1", 0)
			.attr("y1", 0)
			.attr("x2", this.state.modelWidth)
			.attr("y2", 0)
			.attr("stroke", "#0F473E")
			.attr("stroke-width", 1);
	},

	_createYLines: function() {
	    var self = this;
		var modelLineGap = 30;
		var lineY = this.state.yoffset + modelLineGap;
	    //var displayCount = self._getYLimit();
	    var displayCount = self.state.yAxisRender.size();
		//this.state.svg.selectAll("path.domain").remove();
		//this.state.svg.selectAll("text.scores").remove();
		//this.state.svg.selectAll("#specieslist").remove();

		var gridHeight = displayCount * self.state.heightOfSingleCell + 10;
		if (gridHeight < self.state.minHeight) {
			gridHeight = self.state.minHeight;
		}

		this.state.svg.append("line")
			.attr("transform","translate(" + (this.state.textWidth + 15) + "," + lineY + ")")
			.attr("x1", 0)
			.attr("y1", 0)
			.attr("x2", 0)
			.attr("y2", gridHeight)
			.attr("stroke", "#0F473E")
			.attr("stroke-width", 1);
	},

	_createTextScores: function() {
		var self = this;
		var list = [];
		var xWidth = self.state.widthOfSingleCell;
		var y =0;
		if (!this.state.invertAxis) {
			//list = self._getSortedIDListStrict(this.state.filteredXAxis.entries());
			list = self.state.xAxisRender.keys();
		} else {
			//list = self._getSortedIDListStrict(this.state.filteredYAxis.entries());
			list = self.state.yAxisRender.keys();			
		}

		this.state.svg.selectAll("text.scores")
			.data(list)
			.enter()
			.append("text")
			.attr("height", 10)
			.attr("id", "scorelist")
			.attr("width", xWidth)
			.attr("class", "scores")
			// don't show score if it is a dummy model.
			.text(function (d){ 
				if (d === self.state.dummyModelName) {
					return "";
				} else {
					return self._getAxisData(d).score;
				}})
			.style("font-weight","bold")
			.style("fill",function(d) {
				return self._getColorForCellValue(self,self._getAxisData(d).species,self._getAxisData(d).score);
			});

			if (this.state.invertAxis){
				this.state.svg.selectAll("text.scores").attr("y", function(d) {
					//return self._getAxisDataPosition(d) + 5;  // self._getAxisData(d).ypos + 5;
						return y += 13;
				});
				this.state.svg.selectAll("text.scores").attr("x", 230);  // MKD:
				//this.state.svg.selectAll("text.scores").attr("transform", "translate(" + (this.state.textWidth + 20) + "," + 40 + ")");
				this.state.svg.selectAll("text.scores").attr("transform","translate(0, " + (this.state.yModelRegion+5) + ")");
			} else {
				this.state.svg.selectAll("text.scores").attr("x",function(d,i){return i * xWidth;});
				this.state.svg.selectAll("text.scores").attr("y", 0);
				this.state.svg.selectAll("text.scores").attr("transform", "translate(" + (this.state.textWidth + 54) + "," + this.state.yoffset + ")");
			}
	},

	// Add species labels to top of Overview
	_createOverviewSpeciesLabels: function () {
		var self = this;
		var speciesList = [];

		if (!this.state.invertAxis && self.state.targetSpeciesName == "Overview") {
			speciesList = self.state.speciesList;
		} else{
			speciesList.push(self.state.targetSpeciesName);
		}
		var translation = "translate(" + (self.state.textWidth + self.state.xOffsetOver + 30) + "," + (self.state.yoffset + 10) + ")";

		var xPerModel = self.state.modelWidth/speciesList.length;
		var species = self.state.svg.selectAll("#specieslist")
			.data(speciesList)
			.enter()
			.append("text")
			.attr("transform",translation)
			.attr("x", function(d,i){ return (i + 1 / 2 ) * xPerModel;})
			.attr("id", "specieslist")
			.attr("y", 10)
			.attr("width", xPerModel)
			.attr("height", 10)
			.attr("fill", "#0F473E")
			.attr("stroke-width", 1)
			.text(function (d,i){return speciesList[i];})
			.attr("text-anchor","middle");
	},

	// we might want to modify this to do a dynamic http retrieval to grab the dialog components...
	_showDialog: function(name){
		var self = this;
		var url = this._getResourceUrl(name,'html');
		if (typeof(self.state.tooltips[name]) === 'undefined') {
			$.ajax( {url: url,
				dataType: 'html',
				async: 'false',
				success: function(data) {
					self._populateDialog(self,name,data);
				},
				error: function ( xhr, errorType, exception ) { 
				// Triggered if an error communicating with server
					self._populateDialog(self,"Error", "We are having problems with the server. Please try again soon. Error:" + xhr.status);
				}
			});
		}
		else {
			this._populateDialog(self,name,self.state.tooltips[name]);
		}
	},

	_populateDialog: function(self,name,text) {
		var SplitText = "Title";
		var $dialog = $('<div></div>')
			.html(SplitText )
			.dialog({
				modal: true,
				minHeight: 200,
				height: 250,
				maxHeight: 300,
				minWidth: 400,
				resizable: false,
				draggable: true,
				dialogClass: "dialogBG",
				position: { my: "top", at: "top+25%",of: "#svg_area"},
				title: 'Phenogrid Notes'});
		$dialog.html(text);
		$dialog.dialog('open');
		self.state.tooltips[name] = text;
	},

	/*
	 * Build the three main left-right visual components: the rectangle containing the 
	 * phenotypes, the main grid iself, and the right-hand side including the overview and color scales
	 */
	_createRectangularContainers: function() {
		var self = this;
		this._buildAxisPositionList();
	    //var displayCount = self._getYLimit();
	    var displayCount = self.state.yAxisRender.size();

		var gridHeight = displayCount * self.state.heightOfSingleCell + 10;
		if (gridHeight < self.state.minHeight) {
			gridHeight = self.state.minHeight;
		}

		var y = self.state.yModelRegion;
		// create accent boxes
		var rect_accents = this.state.svg.selectAll("#rect.accent")
			.data([0,1,2], function(d) { return d;});
		rect_accents.enter()
			.append("rect")
			.attr("class", "accent")
			.attr("x", function(d, i) { return self.state.axis_pos_list[i];})
			.attr("y", y)
			.attr("width", self.state.textWidth + 5)
			.attr("height", gridHeight)
			.attr("id", function(d, i) {
				if(i === 0) {return "leftrect";}
				else if(i == 1) {return "centerrect";}
				else {return "rightrect";}
			})
			.style("opacity", '0.4')
			.attr("fill", function(d, i) {
				return i != 1 ? d3.rgb("#e5e5e5") : "white";
			});

		return gridHeight + self.state.yModelRegion;
	},

	// Build out the positions of the 3 boxes
	_buildAxisPositionList: function() {
		// For Overview of Organisms 0 width = ((multiOrganismCt*2)+2) *this.state.widthOfSingleCell	
		// Add two extra columns as separators
		this.state.axis_pos_list = [];
		// calculate width of model section
		//this.state.modelWidth = this.state.filteredXAxis.size() * this.state.widthOfSingleCell;
		this.state.modelWidth = this.state.xAxisRender.size() * this.state.widthOfSingleCell;

		// add an axis for each ordinal scale found in the data
		for (var i = 0; i < 3; i++) {
			// move the last accent over a bit for the scrollbar
			if (i == 2) {
				// make sure it's not too narrow i
				var w = this.state.modelWidth;
				if(w < this.state.smallestModelWidth) {
					w = this.state.smallestModelWidth;
				}
				this.state.axis_pos_list.push((this.state.textWidth + 50) + this.state.colStartingPos + w);
			} else if (i == 1 ){
				this.state.axis_pos_list.push((i * (this.state.textWidth + this.state.xOffsetOver + 10)) + this.state.colStartingPos);
			} else {
				this.state.axis_pos_list.push((i * (this.state.textWidth + 10)) + this.state.colStartingPos);
			}
		}	
	},

	// This code creates the labels for the x-axis, the lines, scores, etc..
	// Previously _createModelRegion
	_createXRegion: function () {
		var self = this;
		var targets = [];

		//	mods = self._getSortedIDListStrict(this.state.filteredXAxis.entries());
		targets = this.state.xAxisRender.keys();

		this.state.xScale = d3.scale.ordinal()
			.domain(targets.map(function (d) {return d; }))
			.rangeRoundBands([0,this.state.modelWidth]);

		this._createXLabels(self,targets);
		this._createXLines();
		//[vaa12] These now darken when mini-map is moved
		if (!this.state.invertAxis) {
			this._createTextScores();
//			this._createModelScoresLegend();
		}
		if (this.state.owlSimFunction != 'compare' && this.state.owlSimFunction != 'exomiser'){
			this._createOverviewSpeciesLabels();
		}
	},

	// this code creates the labels for the y-axis, the lines, scores, etc..
	_createYRegion: function () {
		this._createYLabels();

		this._createYLines();
		if (this.state.invertAxis) {
			this._createTextScores();
		}
	},

	_addPhenogridControls: function() {
		var phenogridControls = $('<div id="phenogrid_controls"></div>');
		this.element.append(phenogridControls);
		this._createSelectionControls(phenogridControls);
	},
 
	_addGradients: function() {
		var self = this;
		//var cellData = this.state.cellDataHash.values();
		var cellData = this.state.dataManager.getData("cellData", self.state.targetSpeciesName);
		var temp_data = cellData.map(function(d) { return d.value[self.state.selectedCalculation];} );
		var diff = d3.max(temp_data) - d3.min(temp_data);
		var y1;

		// only show the scale if there is more than one value represented in the scale
		if (diff > 0) {
			// baseline for gradient positioning
			if (this.state.dataManager.length("source") < this.state.sourceDisplayLimit) {
				y1 = 172;
			} else {
				y1 = 262;
			}
			this._buildGradientDisplays(y1);
			this._buildGradientTexts(y1);
		}
	},

	// build the gradient displays used to show the range of colors
	_buildGradientDisplays: function(y1) {
		var ymax = 0;
		var y;
		// If this is the Overview, get gradients for all species with an index
		// COMPARE CALL HACK - REFACTOR OUT
		if ((this.state.targetSpeciesName == "Overview" || this.state.targetSpeciesName == "All") || (this.state.targetSpeciesName == "Homo sapiens" && (this.state.owlSimFunction == "compare" || this.state.owlSimFunction == "exomiser"))) {
			//this.state.overviewCount tells us how many fit in the overview
			for (var i = 0; i < this.state.overviewCount; i++) {
				y = this._createGradients(i,y1);
				if (y > ymax) {
					ymax = y;
				}
			}
		} else {	
			// This is not the overview - determine species and create single gradient
			var j = this._getTargetSpeciesIndexByName(this,this.state.targetSpeciesName);
			y = this._createGradients(j,y1);
			if (y > ymax) {
				ymax = y;
			}
		}
		return ymax;
	},

	/*
	 * Add the gradients to the grid, returning the max x so that
	 * we know how much space the grid will need vertically on the
	 * right. This is important because this region will extend 
	 * below the main grid if there are only a few phenotypes.
	 *
	 * y1 is the baseline for computing the y position of the gradient
	 */
	_createGradients: function(i, y1){
		self = this;
		var y;
		var gradientHeight = 20;
		var gradient = this.state.svg.append("svg:linearGradient")
			.attr("id", "gradient_" + i)
			.attr("x1", "0")
			.attr("x2", "100%")
			.attr("y1", "0%")
			.attr("y2", "0%");
		for (var j in this.state.colorDomains){
			gradient.append("svg:stop")
				.attr("offset", this.state.colorDomains[j])
				.style("stop-color", this.state.colorRanges[i][j])
				.style("stop-opacity", 1);
		}

		// gradient + gap is 20 pixels
		y = y1 + (gradientHeight * i) + self.state.yoffset;
		var x = self.state.axis_pos_list[2] + 12;
		var translate = "translate(0,10)";
		var legend = this.state.svg.append("rect")
			.attr("transform",translate)
			.attr("class", "legend_rect_" + i)
			.attr("id","legendscale_" + i)
			.attr("y", y)
			.attr("x", x)
			.attr("rx",8)
			.attr("ry",8)
			.attr("width", 180)
			.attr("height", 10) // 15
			.attr("fill", "url(#gradient_" + i + ")");

		// text is 20 below gradient
		y = (gradientHeight * (i + 1)) + y1 + self.state.yoffset;
		// [vaa12] BUG. IF LOOKING AT ONLY 1 SPECIES, SOMEHOW Y IS EITHER ADDED BY 180 OR 360 AT THIS POINT. NOT OTHER VARS CHANGED
		x = self.state.axis_pos_list[2] + 205;
		var gclass = "grad_text_" + i;
		var specName = this.state.targetSpeciesList[i].name;
		var grad_text = this.state.svg.append("svg:text")
			.attr("class", gclass)
			.attr("y", y)
			.attr("x", x)
			.style("font-size", "11px")
			.text(specName);
		y += gradientHeight;
		return y;
	},

	/*
	 * Show the labels next to the gradients, including descriptions of min and max sides 
	 * y1 is the baseline to work from
	 */
	_buildGradientTexts: function(y1) {
		var lowText, highText, labelText;
		for (var idx in this.state.similarityCalculation) {	
			if (this.state.similarityCalculation[idx].calc === this.state.selectedCalculation) {
				lowText = this.state.similarityCalculation[idx].low;
				highText = this.state.similarityCalculation[idx].high;
				labelText = this.state.similarityCalculation[idx].label;
				break;
			}
		}

		var ylowText = y1 + self.state.yoffset;
		var xlowText = self.state.axis_pos_list[2] + 10;
		var div_text1 = self.state.svg.append("svg:text")
			.attr("class", "detail_text")
			.attr("y", ylowText)
			.attr("x", xlowText)
			.style("font-size", "10px")
			.text(lowText);

		var ylabelText = y1 + self.state.yoffset;
		var xlabelText = self.state.axis_pos_list[2] + 75;
		var div_text2 = self.state.svg.append("svg:text")
			.attr("class", "detail_text")
			.attr("y", ylabelText)
			.attr("x", xlabelText)
			.style("font-size", "12px")
			.text(labelText);

		var yhighText = y1 + self.state.yoffset;
		var xhighText = self.state.axis_pos_list[2] + 125;
		var div_text3 = self.state.svg.append("svg:text")
			.attr("class", "detail_text")
			.attr("y", yhighText)
			.style("font-size", "10px")
			.text(highText);
		if (highText == "Max" || highText == "Highest"){
			div_text3.attr("x", xhighText + 25);
		} else {
			div_text3.attr("x", xhighText);
		}
	},

	// build controls for selecting organism and comparison. Install handlers
	_createSelectionControls: function(container) {
		var self = this;
		var optionhtml ='<div id="selects"></div>';
		var options = $(optionhtml);
		var orgSel = this._createOrganismSelection();
		options.append(orgSel);
		var sortSel = this._createSortPhenotypeSelection();
		options.append(sortSel);
		var calcSel = this._createCalculationSelection();
		options.append(calcSel);
		var axisSel = this._createAxisSelection();
		options.append(axisSel);

		container.append(options);
		// add the handler for the select control
		$( "#organism" ).change(function(d) {
			self.state.targetSpeciesName = self._getTargetSpeciesNameByIndex(self,d.target.selectedIndex);
			//self._resetSelections("organism");
			self.state.dataManager.reinitialize(self.state.targetSpeciesName);
			self._initDefaults();
			self._processDisplay();
		});

		$( "#calculation" ).change(function(d) {
			self.state.selectedCalculation = self.state.similarityCalculation[d.target.selectedIndex].calc;
			self._resetSelections("calculation");
			self._processDisplay();
		});

		// add the handler for the select control
		$( "#sortphenotypes" ).change(function(d) {
			self.state.selectedSort = self.state.phenotypeSort[d.target.selectedIndex];
			// sort source with default sorting type
			if (self.state.invertAxis){
				self.state.xAxisRender.sort(self.state.selectedSort); 
			} else {
				self.state.yAxisRender.sort(self.state.selectedSort); 
			}
			self._resetSelections("sortphenotypes");
			self._processDisplay();
		});

		$( "#axisflip" ).click(function(d) {
		    self.state.invertAxis = !self.state.invertAxis;
		    self._resetSelections("axisflip");
		    self._setAxisRenderers();
		    self._setAxisDisplayLimits();
		    self._processDisplay();

		});

		self._configureFaqs();
	},

	// construct the HTML needed for selecting organism
	_createOrganismSelection: function() {
		var selectedItem;
		var optionhtml = "<div id='org_div'><span id='olabel'>Species</span><br>" +
		"<span id='org_sel'><select id='organism'>";

		for (var idx in this.state.targetSpeciesList) {
			selectedItem = "";
			if (this.state.targetSpeciesList[idx].name === this.state.targetSpeciesName) {
				selectedItem = "selected";
			}
			optionhtml += "<option value=\"" + this.state.targetSpeciesList[idx.name] +
			"\" " + selectedItem + ">" + this.state.targetSpeciesList[idx].name + "</option>";
		}
		// add one for overview.
		if (this.state.targetSpeciesName === "Overview") {
			selectedItem = "selected";
		} else {
			selectedItem = "";
		}
		optionhtml += "<option value=\"Overview\" " + selectedItem + ">Overview</option>";

		optionhtml += "</select></span></div>";
		return $(optionhtml);
	},

	// create the html necessary for selecting the calculation
	_createCalculationSelection: function () {
		var optionhtml = "<span id='calc_div'><span id='clabel'>Display</span>"+
			"<span id='calcs'> <img class='faq_img' src='" + this.state.scriptpath + "../image/greeninfo30.png'></span>" + 
			"<span id='calc_sel'><select id='calculation'>";

		for (var idx in this.state.similarityCalculation) {
			var selecteditem = "";
			if (this.state.similarityCalculation[idx].calc === this.state.selectedCalculation) {
				selecteditem = "selected";
			}
			optionhtml += "<option value='" + this.state.similarityCalculation[idx].calc + "' " + selecteditem + ">" +
				this.state.similarityCalculation[idx].label + "</option>";
		}
		optionhtml += "</select></span></span>";
		return $(optionhtml);
	},

	// create the html necessary for selecting the sort
	_createSortPhenotypeSelection: function () {
		var optionhtml ="<span id='sort_div'> <span id='slabel' >Sort Phenotypes</span>" +
			"<span id='sorts'> <img class='faq_img' src='" + this.state.scriptpath + "../image/greeninfo30.png'></span>" +
			"<span><select id='sortphenotypes'>";

		for (var idx in this.state.phenotypeSort) {
			var selecteditem = "";
			if (this.state.phenotypeSort[idx] === this.state.selectedSort) {
				selecteditem = "selected";
			}
			optionhtml += "<option value='" + "' " + selecteditem + ">" + this.state.phenotypeSort[idx] + "</option>";
		}
		optionhtml += "</select></span>";
		return $(optionhtml);
	},

	// create the html necessary for selecting the axis flip
	_createAxisSelection: function () {
		var optionhtml = "<div id='axis_div'><span id='axlabel'>Axis Flip</span><br>" +
		"<span id='org_sel'><button type='button' id='axisflip'>Flip Axis</button></span></div>";
		return $(optionhtml);
	},

	// this code creates the text and rectangles containing the text on either side of the y-axis data
	// Previously _createRowLabels
	_createYLabels: function() {
		var self = this;
		var pad = 14;
		var list = [];
		var y = 0;
		//list = self._getSortedIDListStrict(self.state.filteredYAxis.entries());
		list = self.state.yAxisRender.entries(); //getItems();
console.log(list);

		var rect_text = this.state.svg
			.selectAll(".a_text")
			.data(list, function(d) { 
				return d.label; });
		rect_text.enter()
			.append("text")
			.attr("transform","translate(0, " + (this.state.yModelRegion+5) + ")")
			.attr("class", function(d) {
				return "a_text data_text " + d.id;  
			})
		// store the id for this item. This will be used on click events
			.attr("ontology_id", function(d) {
				return d.id;
			})
			.attr("id", function(d) {
				return d.id;
			})
			.attr("x", 208)    // MAGIC NUM
			.attr("y", function(d) {				
				  y += 13;  
				return y;  // 		self._getAxisData(d).ypos + 10;
			})
			.on("mouseover", function(d) {
				self._selectYItem(d, d3.mouse(this));
			})
			.on("mouseout", function(d) {
				self._deselectData(d, d3.mouse(this));
			})
			.attr("width", self.state.textWidth)
			.attr("height", 50) // 11.5
			.attr("data-tooltip", "sticky1")
			.style("fill", function(d){
				return self._getExpandStyling(d);
			})
			.text(function(d) {
				var txt = d.label;   //self._getAxisData(d).label;
				if (txt === undefined) {
					txt = d;
				}
				txt = self._getShortLabel(txt);
				return self._decodeHtmlEntity(txt);
			});

	// MKD: should probably move this
		this._buildUnmatchedSourceDisplay();

		y = 0;  // set
		rect_text.transition()
			.style('opacity', '1.0')
			.delay(5)
			.attr("y", function(d) {
				y += 13;  
				return y
				  //self.state.yAxisRender.getOrdinalPosition(d.id) + self.state.yoffsetOver + pad;    //self._getAxisData(d).ypos + self.state.yoffsetOver + pad;
			});
		rect_text.exit()
			.transition()
			.delay(20)
			.style('opacity', '0.0')
			.remove();
	},

	_getUnmatchedSources: function(){
		//var fullset = this.state.origPhenotypeData;
		var fullset = this.state.dataManager.getOriginalSource();
		var partialset = this.state.dataManager.keys("source");
		var full = [];
		var partial = [];
		var unmatchedset = [];
		var tempObject = {"id": 0, "observed": "positive"};

		for (var i in fullset) {
			if (typeof(fullset[i].id) === 'undefined'){
				tempObject.id = fullset[i];
				full.push(tempObject);
			} else {
				full.push(fullset[i]);
			}
		}

		for (var j in partialset){
			partial.push(partialset[j].replace("_", ":"));
		}

		for (var k in full) {
			// if no match in fullset
			if (partial.indexOf(full[k].id) < 0) {
				// if there unmatched set is empty, add this umatched phenotype
				unmatchedset.push(full[k]);
			}
		}

		var dupArray = [];
		dupArray.push(unmatchedset[0]);	
		// check for dups
		for (var l in unmatchedset){
			var found = false;
			for (var m in dupArray) {
				if (dupArray[m].id == unmatchedset[l].id) {
					found = true;
				}
			}
			if (found === false) {
				dupArray.push(unmatchedset[l]);
			}
		}
		if (dupArray[0] === undefined) {
			dupArray = [];
		}
		return dupArray;
	},

	_buildUnmatchedSourceDisplay: function() {
		var optionhtml;
		var prebl = $("#prebl");
		if (prebl.length === 0) {
			var preblHtml ="<div id='prebl'></div>";
			this.element.append(preblHtml);
			prebl = $("#prebl");
		}
		prebl.empty();

		if (this.state.unmatchedSources !== undefined && this.state.unmatchedSources.length > 0){
			optionhtml = "<div class='clearfix'><form id='matches'><input type='checkbox' name='unmatched' value='unmatched' >&nbsp;&nbsp;View Unmatched Phenotypes<br /><form><div id='clear'></div>";
			var phenohtml = this._buildUnmatchedPhenotypeTable();
			optionhtml = optionhtml + "<div id='unmatched' style='display:none;'>" + phenohtml + "</div></div>";
			prebl.append(optionhtml);
		} else { 
			// no unmatched phenotypes
			optionhtml = "<div id='unmatchedlabel' style='display:block;'>No Unmatched Phenotypes</div>";
			prebl.append(optionhtml);
		}

		$('#matches :checkbox').click(function() {
			var $this = $(this);
			// $this will contain a reference to the checkbox 
			if ($this.is(':checked')) {
				// the checkbox was checked 
				$("#unmatched").show();
			} else {
				// the checkbox was unchecked
				$("#unmatched").hide();
			}
		});
	},

	_buildUnmatchedPhenotypeTable: function(){
		var self = this;
		var columns = 4;
		var outer1 = "<table id='phentable'>";
		var outer2 = "</table>";
		var inner = "";

		var unmatched = self.state.unmatchedSources;
		var text = "";
		var i = 0;
		var label, id, url_origin;
		while (i < unmatched.length) {
			inner += "<tr>"; 
			text = "";
			for (var j = 0; j < columns; j++){
				id = self._getConceptId(unmatched[i++].id);
				if (unmatched[i - 1].label !== undefined){
					label = unmatched[i - 1].label;
				} else {
					label = unmatched[i - 1].id;
				}
				url_origin = self.document[0].location.origin;
				text += "<td><a href='" + url_origin + "/phenotype/" + id + "' target='_blank'>" + label + "</a></td>";
				if (i == unmatched.length) {
					break;
				}
			}
			inner += text + "</tr>";
		}
		return outer1 + inner + outer2;
	},

	_matchedClick: function(checkboxEl) {
		if (checkboxEl.checked) {
			// Do something special
			$("#unmatched").show();
		} else {
			// Do something else
			$("#unmatched").hide();
		}
	},

	_rectClick: function(data) {
		var retData;
		this._showThrobber();
		jQuery.ajax({
			url : this.state.serverURL + "/phenotype/" + data.attributes.ontology_id.value + ".json",
			async : false,
			dataType : 'json',
			success : function(data) {
				retData = "<strong>Label:</strong> " + "<a href=\"" + data.url + "\">" + data.label + "</a><br/><strong>Type:</strong> " + data.category;
			},
			error: function ( xhr, errorType, exception ) { 
				//Triggered if an error communicating with server
				self._populateDialog(self,"Error", "We are having problems with the server. Please try again soon. Error:" + xhr.status);
			},
		});
		this._updateDetailSection(retData, this._getXYPos(data));
	},

	_toProperCase: function (oldstring) {
		return oldstring.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	},

	/*
	 * given an array of phenotype objects edit the object array.
	 * items are either ontology ids as strings, in which case they are handled as is,
	 * or they are objects of the form { "id": <id>, "observed": <obs>}.
	 * in that case take id if "observed" is "positive"
	 * refactor: _filterPhenotypeResults
	 */
	_parseQuerySourceList: function(phenotypelist) {
		var newlist = [];
		var pheno;
		for (var i in phenotypelist) {
			pheno = phenotypelist[i];
			if (typeof pheno === 'string') {
				newlist.push(pheno);
			}
			if (pheno.observed === "positive") {
				newlist.push(pheno.id);
			}
		}
		return newlist;
	},

	// Will call the getHPO function to either load the HPO info or to make it visible if it was previously hidden.  Not available if preloading
	_expandHPO: function(id){
		self._getHPO(id);

		// this code refreshes the stickytooltip so that tree appears instantly
		var hpoCached = this.state.hpoCacheHash.get(id.replace("_", ":"));
		if (hpoCached !== null){
			this.state.ontologyTreesDone = 0;
			this.state.ontologyTreeHeight = 0;
			var info = this._getAxisData(id);
			var type = this._getIDType(id);
			var hrefLink = "<a href=\"" + this.state.serverURL+"/phenotype" + type +"/"+ id.replace("_", ":") + "\" target=\"_blank\">" + info.label + "</a>";
			var hpoData = "<strong>" + this._capitalizeString(type) + ": </strong> " + hrefLink + "<br/>";
			hpoData += "<strong>IC:</strong> " + info.IC.toFixed(2) + "<br/><br/>";
			var hpoTree = "<div id='hpoDiv'>" + this.buildHPOTree(id.replace("_", ":"), hpoCached.edges, 0) + "</div>";
			if (hpoTree == "<br/>"){
				hpoData += "<em>No HPO Data Found</em>";
			} else {
				hpoData += "<strong>HPO Structure:</strong>" + hpoTree;
			}
			$("#sticky1").html(hpoData);

			// reshow the sticky with updated info
			stickytooltip.show(null);
		}
	},

	// Will hide the hpo info, not delete it.  This allows for reloading to be done faster and avoid unneeded server calls.  Not available if preloading
	_collapseHPO: function(id){
		var idClean = id.replace("_", ":");
		var HPOInfo = this.state.hpoCacheHash.get(idClean);
		HPOInfo.active = 0;
		this.state.hpoCacheHash.put(idClean,HPOInfo);
		stickytooltip.closetooltip();
	},

	// When provided with an ID, it will first check hpoCacheHash if currently has the HPO data stored, and if it does it will set it to be visible.  If it does not have that information in the hpoCacheHash, it will make a server call to get the information and if successful will parse the information into hpoCacheHash and hpoCacheLabels
	_getHPO: function(id) {
		// check cached hashtable first 
		var idClean = id.replace("_", ":");
		var HPOInfo = this.state.hpoCacheHash.get(idClean);
		var direction = this.state.ontologyDirection;
		var relationship = "subClassOf";
		var depth = this.state.ontologyDepth;
		var nodes, edges;
		///neighborhood/HP_0003273/2/out/subClassOf.json
		if (HPOInfo === null) {
			HPOInfo = [];
			var url = this.state.serverURL + "/neighborhood/" + id + "/" + depth + "/" + direction + "/" + relationship + ".json";
		        //console.log("getting hpo data .. url is ..."+url);
			var taxon = this._getTargetSpeciesTaxonByName(this,this.state.targetSpeciesName);
			var results = this._ajaxLoadData(taxon,url);
			if (typeof (results) !== 'undefined') {
				edges = results.edges;
				nodes = results.nodes;
				// Labels/Nodes are done seperately to reduce redunancy as there might be multiple phenotypes with the same related nodes
				for (var i in nodes){
					if (!this.state.hpoCacheLabels.containsKey(nodes[i].id) && (nodes[i].id != "MP:0000001" && nodes[i].id != "UPHENO_0001001" && nodes[i].id != "UPHENO_0001002" && nodes[i].id != "HP:0000118" && nodes[i].id != "HP:0000001")){
						this.state.hpoCacheLabels.put(nodes[i].id,this._capitalizeString(nodes[i].lbl));
					}
				}

				// Used to prevent breaking objects
				for (var j in edges){
					if (edges[j].obj != "MP:0000001" && edges[j].obj != "UPHENO_0001001" && edges[j].obj != "UPHENO_0001002" && edges[j].obj != "HP:0000118" && edges[j].obj != "HP:0000001"){
						HPOInfo.push(edges[j]);
					}
				}
			}

			// HACK:if we return a null just create a zero-length array for now to add it to hashtable
			// this is for later so we don't have to lookup concept again
			if (HPOInfo === null) {HPOInfo = {};}

			// save the HPO in cache for later
			var hashData = {"edges": HPOInfo, "active": 1};
			this.state.hpoCacheHash.put(idClean,hashData);
		} else {
			// If it does exist, make sure its set to visible
			HPOInfo.active = 1;
			this.state.hpoCacheHash.put(idClean,HPOInfo);
		}
	},

	// collapse the expanded items for the current selected model targets
	_collapse: function(curModel) {
		var curData = this.state.dataManager.getElement("target", curModel);
		var modelInfo = {id: curModel, d: curData};

		// check cached hashtable first 
		var cachedScores = this.state.expandedHash.get(modelInfo.id);

		// if found just return genotypes scores
		if (cachedScores !== null && cachedScores.expanded) {
// MKD:  this needs to use DM
			this.state.modelListHash = this._removalFromModelList(cachedScores);

// MKD: do this through DM
//			this._rebuildCellHash();
			this.state.modelLength = this.state.modelListHash.size();

//			this._setAxisValues();
			this._processDisplay();

			// update the expanded flag
			var vals = this.state.expandedHash.get(modelInfo.id);
			vals.expanded = false;
			this.state.expandedHash.put(modelInfo.id, vals);
			stickytooltip.closetooltip();
		}
	},

	// get all matching phenotypes for a model
// MKD: get this from DM
	_getMatchingPhenotypes: function(curModelId) {
		var self = this;
		var models = self.state.modelData;
		var phenoTypes = [];
		for (var i in models){
			// models[i] is the matching model that contains all phenotypes
			if (models[i].model_id == curModelId){
				phenoTypes.push({id: models[i].id_a, label: models[i].label_a});
			}
		}
		return phenoTypes;
	}, 

	// insert into the model list
	_insertionModelList: function (insertPoint, insertions) {
		var newModelList = new Hashtable();
		var sortedModelList= self._getSortedIDList( this.state.dataManager.getData("target")); 
		var reorderPointOffset = insertions.size();
		var insertionOccurred = false;

		for (var i in sortedModelList){
			var entry = this.state.dataManager.getElement("target", sortedModelList[i]);
			if (entry.pos == insertPoint) {
				// add the entry, or gene in this case	
				newModelList.put(sortedModelList[i], entry);
				var insertsKeys = insertions.keys();
				// begin insertions, they already have correct positions applied
				for(var j in insertsKeys) {
					var id = insertsKeys[j];
					newModelList.put(id, insertions.get(id));
				}
				insertionOccurred = true;
			} else if (insertionOccurred) {
				entry.pos = entry.pos + reorderPointOffset;
				newModelList.put(sortedModelList[i], entry);
			} else {
				newModelList.put(sortedModelList[i], entry);
			}
		}
		//var tmp = newModelList.entries();
		return newModelList;
	},

	// remove a models children from the model list
	_removalFromModelList: function (removalList) {
		var newModelList = new Hashtable();
		var newModelData = [];
		var removalKeys = removalList.genoTypes.keys();   // MKD: needs refactored
		var sortedModelList= self._getSortedIDList(this.state.dataManager.getData("target"));
		var removeEntries = removalList.genoTypes.entries();

		// get the max position that was inserted
		var maxInsertedPosition = 0;
		for (var x in removeEntries){
			var obj = removeEntries[x][1];
			if (obj.pos > maxInsertedPosition) {
				maxInsertedPosition = obj.pos;
			}
		}

		for (var i in sortedModelList){
			var entry = this.state.dataManager.getElement("target",sortedModelList[i]);
			var found = false, cnt = 0;

			// check list to make sure it needs removed
			while (cnt < removalKeys.length && !found) {
				if (removalKeys[cnt] == sortedModelList[i]) {
					found = true;
				}
				cnt++;
			}
			if (found === false) {
				// need to reorder it back to original position
				if (entry.pos > maxInsertedPosition) {
					entry.pos =  entry.pos - removalKeys.length;
					//pos++;  
					//entry.pos - maxInsertedPosition;
				}
				newModelList.put(sortedModelList[i], entry);
			}
		}

		// loop through to rebuild model data and remove any removals
//MKD: needs refactored		
		for (var y = 0; y < this.state.modelData.length; y++) {
			var id = this.state.modelData[y].model_id;
			var ret = removalKeys.indexOf(id);
			if (ret <  0) {
				newModelData.push(this.state.modelData[y]);
			}
		}
// MKD: REFACTOR TO USE DM
		this.state.modelData = newModelData;
		return newModelList;
	},

//MKD: MOVE TO DATAMANAGER 
/*	_rebuildCellHash: function() {
		// [vaa12] needs updating based on changes in finishLoad and finishOverviewLoad
		this.state.phenotypeListHash = new Hashtable();
		this.state.cellDataHash = new Hashtable({hashCode: cellDataPointPrint, equals: cellDataPointEquals});
		var modelPoint, hashData;
		var y = 0;

		// need to rebuild the pheno hash and the modelData hash
		for (var i in this.state.modelData) {
			// Setting phenotypeListHash
			if (typeof(this.state.modelData[i].id_a) !== 'undefined' && !this.state.phenotypeListHash.containsKey(this.state.modelData[i].id_a)){
				hashData = {"label": this.state.modelData[i].label_a, "IC": this.state.modelData[i].IC_a, "pos": y, "count": 0, "sum": 0, "type": "phenotype"};
				this.state.phenotypeListHash.put(this.state.modelData[i].id_a, hashData);
				y++;
			}

			// Setting cellDataHash
			if (this.state.invertAxis){
				modelPoint = new cellDataPoint(this.state.modelData[i].id_a, this.state.modelData[i].model_id);
			} else {
				modelPoint = new cellDataPoint(this.state.modelData[i].model_id, this.state.modelData[i].id_a);
			}
//			this._updateSortVals(this.state.modelData[i].id_a, this.state.modelData[i].subsumer_IC);
			hashData = {"value": this.state.modelData[i].value, "subsumer_label": this.state.modelData[i].subsumer_label, "subsumer_id": this.state.modelData[i].subsumer_id, "subsumer_IC": this.state.modelData[i].subsumer_IC, "b_label": this.state.modelData[i].label_b, "b_id": this.state.modelData[i].id_b, "b_IC": this.state.modelData[i].IC_b};
			this.state.cellDataHash.put(modelPoint, hashData);
		}
	},
*/
	// encode any special chars 
	_encodeHtmlEntity: function(str) {
		if (str !== null) {
			return str
			.replace(/»/g, "&#187;")
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
		}
		return str;
	},

	_decodeHtmlEntity: function(str) {
		return $('<div></div>').html(str).text();
	},

	// get the css styling for expanded gene/genotype
	_getExpandStyling: function(data) {
		var concept = this._getConceptId(data);

		if(typeof(concept) === 'undefined' ) return "#000000";
		var info = this._getIDTypeDetail(concept);

		if (info == 'gene') {
			var g = this.state.expandedHash.get(concept);
			if (g !== null && g.expanded) {
				return "#08594B";
			}
		}
		else if (info == 'genotype') {
			return "#488B80"; //"#0F473E";
		}
		return "#000000";
	},

	// check to see object is expanded
	_isExpanded: function(data) {
		var concept = this._getConceptId(data);
		var info = this._getIDTypeDetail(concept);

		if (info == 'gene') {
			var g = this.state.expandedHash.get(concept);
			// if it was ever expanded
			if (g !== null){
				return g.expanded;  
			}
		}
		return null;
	}, 

	// check to see object has children
	_hasChildrenForExpansion: function(data) {
		var concept = this._getConceptId(data);
		var info = this._getIDTypeDetail(concept);

		if (info == 'gene') {
			var g = this.state.expandedHash.get(concept);
			// if it was ever expanded it will have children
			if (g !== null) {
				return true;  
			}
		}
		return false;
	},

	_isGenoType: function(data) {
		var concept = this._getConceptId(data);
		var info = this._getIDTypeDetail(concept);

		if (info == 'genotype') {
			return true;
		}
		return false;
	},

	_refreshSticky: function() {
		var div=$('#mystickytooltip').html();
		$('#mystickytooltip').html(div);
	},

		// expand the model with the associated targets
	_expand: function(curModel) {
		$('#wait').show();
		var div=$('#mystickytooltip').html();
		$('#mystickytooltip').html(div);

		var refresh = true;
		var targets = new Hashtable();
		var type = this._getIDTypeDetail(curModel);
		var curData = this.state.dataManager.getElement("target", curModel);
		var modelData = {id: curModel, type: type, d: curData};

		// check cached hashtable first 
		var cachedTargets = this.state.expandedHash.get(modelData.id);
		var savedData = null;

		// if cached info not found, try get targets
		if (cachedTargets == null) {
	
			// get targets
			returnObj = this.state.expander.getTargets({modelData: modelData, parentRef: this});

			if (returnObj != null) {
				// save the results to the expandedHash for later
				if (returnObj.targets == null && returnObj.compareScores == null) {
					savedData = {expanded: false, data: returnObj}; 	
				} else {
					savedData = {expanded: true, data: returnObj};  // in expanded state by default
				}
				this.state.expandedHash.put(modelData.id, savedData);
			}
		} else {
			returnObj = cachedTargets.data;  // just reuse what we cached
		}

		if (returnObj != null && returnObj.targets != null && returnObj.compareScores != null) { 

			// update the model data 
			for (var idx in returnObj.compareScores.b) {
				var b = returnObj.compareScores.b;
// MKD: need this refactored
//				this._loadDataForModel(b);
			}

			console.log("Starting Insertion...");
// MKD: do this using DM
			this.state.modelListHash = this._insertIntoModelList(modelData.d.pos, returnObj.targets);

// MKD: do this using DM
			console.log("Rebuilding hashtables...");
			this._rebuildModelHash();

			this.state.modelLength = this.state.modelListHash.size();
//			this._setAxisValues();

			console.log("updating display...");
			this._processDisplay();
		} else {
			alert("No data found to expand targets");
		}

		$('#wait').hide();
		stickytooltip.closetooltip();
	}

	}); // end of widget code
})(jQuery);

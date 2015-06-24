/*
 	Package: dataloader.js

 	Class: DataLoader
  		handles all loading of the data external
 		servers, transformations.
 
 	Parameters:
 	 	parent - reference to parent calling object
 		serverUrl - sim server url
 */
var DataLoader = function(parent, serverUrl) {
	this.parent = parent;
	this.simServerURL = serverUrl;
	this.owlsimsData = [];
	this.origSourceList;
};

DataLoader.prototype = {
	constructor: DataLoader,

	/*
		Function: load

			fetch and load data from external source (i.e., owlsims)

		Parameters:	
			qrySourceList - list of source items to query
			species - list of species
			limit - value to limit targets returned
	*/
	load: function(qrySourceList, species, limit) {
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
				this.transform(speciesName[i].name);   //res, speciesName[i].name);  
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
	transform: function(species) {      
		var data = this.owlsimsData[species];
		var xformData = [], targData = [], srcData = [];

		if (typeof(data) !== 'undefined' &&
		    typeof (data.b) !== 'undefined') {
			console.log("transforming...");

			// extract the maxIC score; ugh!
			if (typeof (data.metadata) !== 'undefined') {
				this.parent.state.maxICScore = data.metadata.maxMaxIC;
			}
			xformData = [];
			targData = []
			srcData = [];

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
				targData[targetID] = t;

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

						//var srcElement = this.getElement("source", sourceID_a);
						var srcElement = srcData[sourceID_a]; // this checks to see if source already exists

						// build a unique list of sources
						if (typeof(srcElement) == 'undefined') {
						//if (!this.contains("source", sourceID_a)) {

							dataVals = {"id":sourceID_a, "label": curr_row.a.label, "IC": parseFloat(curr_row.a.IC), //"pos": 0, 
											"count": count, "sum": sum, "type": "phenotype"};
							srcData[sourceID_a] = dataVals;
							//srcData.put(sourceID_a, hashDataVals);
							// if (!this.state.hpoCacheBuilt && this.state.preloadHPO){
							// 	this._getHPO(this._getConceptId(curr_row.a.id));
							// }
						} else {
							srcData[sourceID_a].count += 1;
							srcData[sourceID_a].sum += parseFloat(curr_row.lcs.IC);
							
							// console.log('source count: ' + srcData[sourceID_a].count);
							// console.log('source sum' + srcData[sourceID_a].sum);
						}

						// update values for sorting
						//var index = this.getElementIndex("source", sourceID_a);

						//if(  index > -1) {
							//srcData[index].count += 1;
							//srcData[index].sum += parseFloat(curr_row.lcs.IC);


						// building cell data points
						dataVals = {"source_id": sourceID_a, "target_id": targetID, "value": lcs, 
									"subsumer_label": curr_row.lcs.label, "subsumer_id": currID_lcs, 
									"subsumer_IC": parseFloat(curr_row.lcs.IC), "b_label": curr_row.b.label, 
									"species": item.taxon.label,
									"b_id": currID_b, "b_IC": parseFloat(curr_row.b.IC),
							    "rowid": sourceID_a + "_" + currID_lcs};						
					    if (typeof(xformData[sourceID_a]) == 'undefined') {
							xformData[sourceID_a] = {};
					    }
					    if(typeof(xformData[sourceID_a][targetID]) == 'undefined') {
							xformData[sourceID_a][targetID] = {};
					    }
					    xformData[sourceID_a][targetID] = dataVals;
					}

					// set in dataManager  (not the best way to do this...)
					this.parent.state.dataManager.cellData[species] = xformData;
					this.parent.state.dataManager.target[species] = targData;
					this.parent.state.dataManager.source = srcData;
				}  //if
			} // for
		} // if
	}
}
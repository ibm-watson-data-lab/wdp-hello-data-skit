// This is a sample usecase router. This is where you add your usecase logic.

// You do not need to explicitly initialize express application, this is done in auto-generated server.js file
var express = require('express');

// Use serviceManager to get all the initialized service SDKs
var serviceManager = require('../services/service-manager');

const debug = require('debug')('hello-data:router');


module.exports = function(app){
	// The app argument in this function is the express application.
	// You can add middlewares, routers or any other components you require as shown below.
	var router = express.Router();

	const _ = require('lodash');
    const client = require('../lib/client.js');
    const cloudant_access = require('../lib/data_access_helpers/cloudant_sample.js')

	// Add usecase logic endpoints to the express app
	router.get("/listprojects", function(req, res, next){	

		debug('Received request to fetch project list.');

		if(! req.query.api_key) {
			return res.status(400).send('Bluemix API key is missing');
		}

		debug('Payload:\n%O\n%O', req.params, req.query);

    	var conn_options = {
     		apitoken: req.query.api_key,         // required
     		auth_url : process.env.WDP_AUTH_URL, // if not set, the defaults will be used
     		base_url : process.env.WDP_API_URL   // if not set, the defaults will be used
    	};
 
		var WDPClient = new client(conn_options);   
		WDPClient.project().list({limit:100},
			                     function(raw_data, response) {

			                     	var client_response = {
			                     			response_type: 'api_response',
											API_method: 'GET',
											API_endpoint: '/v2/projects',
											API_HTTP_status: {
												code: response.statusCode,
												text: response.statusMessage
											},
											project_list: []
									};

									try {
										// parse response if it is valid json
										client_response.API_response_text = JSON.parse(raw_data);	
									}
									catch(err) {
										// not valid json; return as plain text
										client_response.API_response_text = raw_data || '';
									}
									
                                    if(response.statusCode === 200) {
                                    	// extract project names and ids from response
                                    	if(client_response.API_response_text.total_results > 0) {
                                    		_.each(client_response.API_response_text.resources,
                                    			   function(project) {
                                    			   		client_response.project_list.push({name: project.entity.name, guid: project.metadata.guid});
                                    		});
                                    		client_response.project_list = _.sortBy(client_response.project_list,
                                    			     function(project) {
                                    			     	return(project.name);
                                    		});
                                    	}                              
                                    }

                                    console.log(JSON.stringify(client_response));

                                    res.json(client_response);
                                });
	});

	// Add usecase logic endpoints to the express app
	router.get("/listassets/:project_guid", function(req, res, next){	

		debug('Received request to fetch asset list for project.');
		if(! req.query.api_key) {
			return res.status(400).send('Bluemix API key is missing');
		}

		debug('Payload:\n%O\n%O', req.params, req.query);

    	var conn_options = {
     		apitoken: req.query.api_key,         // required
     		auth_url : process.env.WDP_AUTH_URL, // if not set, the defaults will be used
     		base_url : process.env.WDP_API_URL   // if not set, the defaults will be used
    	};
 
		var WDPClient = new client(conn_options);   
		WDPClient.project().listAssets({guid: req.params.project_guid},
			                     function(raw_data, response) {

			                     	var client_response = {
			                     		    response_type: 'api_response',
											API_method: 'POST',
											API_endpoint: '/v2/asset_types/asset/search',
											API_HTTP_status: {
												code: response.statusCode,
												text: response.statusMessage
											}
									};

									try {
										// parse response if it is valid json
										client_response.API_response_text = JSON.parse(raw_data);	
									}
									catch(err) {
										// not valid json; return as plain text
										client_response.API_response_text = raw_data || '';
									}
									
                                    if(response.statusCode === 200) {
                                    	// extract asset names, asset types and ids from response
                                    	client_response.asset_list = [];
                                    	if(client_response.API_response_text.total_rows > 0) {
                                    		_.each(client_response.API_response_text.results,
                                    			   function(asset) {
                                    			   		client_response.asset_list.push({name: asset.metadata.name, guid: asset.metadata.asset_id, type: asset.metadata.asset_type});
                                    		});
                                    		client_response.asset_list = _.sortBy(client_response.asset_list,
                                    			     function(asset) {
                                    			     	return(asset.name);
                                    		});
                                    	}                              
                                    }

                                    console.log(JSON.stringify(client_response));

                                    res.json(client_response);
                                });

	});

	// Add usecase logic endpoints to the express app
	router.get("/access_asset_data/:asset_type/:asset_id", function(req, res, next){	

		debug('Received request to fetch data from asset.');

		if(! req.query.api_key) {
			return res.status(400).send('Bluemix API key is missing');
		}
		if(! req.query.project_guid) {
			return res.status(400).send('WDP project guid is missing');
		}

		debug('Payload:\n%O\n%O', req.params, req.query);

    	var conn_options = {
     		apitoken: req.query.api_key,         // required
     		auth_url : process.env.WDP_AUTH_URL, // if not set, the defaults will be used
     		base_url : process.env.WDP_API_URL   // if not set, the defaults will be used
    	};
 
		var WDPClient = new client(conn_options);   

		// invoke appropriate data access implementation

		if(req.params.asset_type == 'connection') {
			// get connection information
			debug('Fetching connection information...');
			WDPClient.project().getConnection({guid: req.query.project_guid,
											   connection_id: req.params.asset_id},
		                     				  function(get_connection_response_raw_data, get_connection_response) {
		                     				  	if(get_connection_response.statusCode === 200) {
		                     				  		const response_data = JSON.parse(get_connection_response_raw_data);

		                     				  		// identify connection type, e.g. "cloudant"
		                     				  		debug('Identifying connection type...');
		                     				  		WDPClient.datasource_types().get({datasource_type: response_data.entity.datasource_type},
		                     				  										 function(datasource_types_response_raw_data, response) {
		                     				  										 	if(response.statusCode === 200) {
		                     				  										 		const datasource_types_response_data = JSON.parse(datasource_types_response_raw_data);
		                     				  										 		if(datasource_types_response_data.entity.name === 'cloudant') {
		                     				  										 			cloudant_access({username:response_data.entity.properties.username,
		                     				  										 			                 password:response_data.entity.properties.password,
		                     				  										 			                 url:response_data.entity.properties.url || response_data.entity.properties.custom_url},
		                     				  										 			                 function(err, data) {
		                     				  										 			                 	if(err) {
		                     				  										 			                 		console.error('Error accessing Cloudant: ' + err);
																														return res.status(500).send('Check hello-data console output.');
		                     				  										 			                 	}
		                     				  										 			                 	else {
								                   		 					                     			         	var client_response = {
																	     		    										response_type: 'data_response',
																	     		    										asset_type: response_data.metadata.asset_type,
																	     		    										asset_sub_type: datasource_types_response_data.entity.label,
																	     		    										data: data
																														};			
																														debug('Hello-data sending response\n%O', client_response);
											        																	return res.json(client_response);		                     				  										 			                 	}
		                     				  										 			                 	});
													                     				     }
													                     				     else {
													                     				     	return res.status(501).send('Sample data access for ' + datasource_types_response_data.entity.name + ' connections has not been implemented.');
													                     				     }	
		                     				  										 	}
		                     				  										 	else {
		                     				  										 		// could not determine connection type
		                     				  										 		console.error('datasource_types().get(' + response_data.entity.datasource_type + ') returned status ' + 
		                     				  										 			          response.statusCode + ' (' + response.statusMessage + '): ' + datasource_types_response_raw_data);
		                     				  										 		return res.status(500).send('Check hello-data console output.');
		                     				  										 	}
		                     				  										 });
		                     				  	}
		                     				  	else {
		                     				  		// TODO
	  										 		console.error('project().getConnection(' + req.query.project_guid + ',' + req.params.asset_id + ')' + 
	  										 			          ' returned status ' + get_connection_response.statusCode + ' (' + get_connection_response.statusMessage + '): ' + 
	  									                          get_connection_response_raw_data);
	  										 		return res.status(500).send('Check hello-data console output.');
	  	}
				                              });
			// identify connection type (e.g. it's a Cloudant connection)
		}
		else {
			res.status(501).send('Sample data access for assets of type ' + req.params.asset_type + ' has not been implemented.');
		}
	});

	app.use("/hello_data", router);
}

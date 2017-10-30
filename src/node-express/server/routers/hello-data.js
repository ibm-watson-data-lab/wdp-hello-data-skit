// This is a sample usecase router. This is where you add your usecase logic.

// You do not need to explicitly initialize express application, this is done in auto-generated server.js file
var express = require('express');

// Use serviceManager to get all the initialized service SDKs
var serviceManager = require('../services/service-manager');


module.exports = function(app){
	// The app argument in this function is the express application.
	// You can add middlewares, routers or any other components you require as shown below.
	var router = express.Router();

	const _ = require('lodash');
    const client = require('../lib/client.js');

	// Add usecase logic endpoints to the express app
	router.get("/listprojects", function(req, res, next){	
		if(! req.query.api_key) {
			return res.status(400).send('Bluemix API key is missing');
		}

    	var conn_options = {
     		apitoken: req.query.api_key,         // required
     		auth_url : process.env.WDP_AUTH_URL, // if not set, the defaults will be used
     		base_url : process.env.WDP_API_URL   // if not set, the defaults will be used
    	};
 
 
		var WDPClient = new client(conn_options);   
		WDPClient.project().list(null,
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
		if(! req.query.api_key) {
			return res.status(400).send('Bluemix API key is missing');
		}

		console.log('Received request to list assets for project ' + req.params.project_guid);

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
		if(! req.query.api_key) {
			return res.status(400).send('Bluemix API key is missing');
		}
		if(! req.query.project_guid) {
			return res.status(400).send('WDP project guid is missing');
		}

		console.log('Received request to access asset ' + req.params.asset_id + ' of type ' + req.params.asset_type);

		const supported_asset_types = ['connection'];
		if(_.find(supported_asset_types, function(type) {
			return(type == req.params.asset_type);
		})) {
			// invoke appropriate data access implementation
         	var client_response = {
         		    response_type: 'data_response',
         		    data: 'Here you go.'
			};			
			console.log(JSON.stringify(client_response));
            res.json(client_response);
		}
		else {
			res.status(400).send('Sample data access for assets of type ' + req.params.asset_type + ' has not been implemented.');
		}

	});

	app.use("/hello_data", router);
}

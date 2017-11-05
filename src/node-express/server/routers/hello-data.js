// This is a sample usecase router. This is where you add your usecase logic.

// You do not need to explicitly initialize express application, this is done in auto-generated server.js file
var express = require('express');

// Use serviceManager to get all the initialized service SDKs
// This starter kit does not utilize the service manager
// var serviceManager = require('../services/service-manager');

const debug = require('debug')('hello-data:router');


module.exports = function(app){
	// The app argument in this function is the express application.
	// You can add middlewares, routers or any other components you require as shown below.
	var router = express.Router();

	const _ = require('lodash');
	const async = require('async');
    const client = require('../lib/client.js');
    const cloudant_access = require('../lib/data_access_helpers/cloudant_data_access_sample.js');
    const cos_access = require('../lib/data_access_helpers/cos_data_access_sample.js'); 
    const db2_warehouse_access = require('../lib/data_access_helpers/db2wh_data_access_sample.js');

    console.log('DEBUG settings: ' + process.env.DEBUG); 

	// Add usecase logic endpoints to the express app
	/*jshint unused:false*/
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
	/*jshint unused:false*/
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

		if(req.params.asset_type === 'connection') {
			// the asset is a connection to a data source
		    // (1) identify connection type
			// (2) collect connection information
			// (3) access data source using connection type specific implementation

            var datasource_type_lookup = [];
            var datasource_connection = {};
  
			async.series([
						  function(callback) {
						  	// fetch datasource lookup information, which enables us to determine the connection type
						  	WDPClient.datasource_types()
						  	         .list(null,
						  	         	   function(response_raw_data, response) {
			                                   if(response.statusCode > 200) {
			                                    	// request received an unexpected response
			                                		return callback({source: 'WDP API',
			                                			             reasonCode: response.statusCode,
			                                    			         reasonMessage: 'GET /v2/datasource_types returned ' + response_raw_data});
			                                	}
			                                	else {
			                                		_.forEach(JSON.parse(response_raw_data).resources,
			                                			      function(datasource) {
			                                			      		datasource_type_lookup.push({datasource_type: datasource.metadata.asset_id,
			                                			      			                         name: datasource.entity.name,
			                                			      			                         label: datasource.entity.label,
			                                			      			                         description: datasource.entity.description});
			                                			      });
			                                		return callback();
			                                   }
						  	         	   });
					 	  },
					 	  function(callback) {
					 	  	// 
							debug('Fetching connection information...');
							WDPClient.project()
							         .getConnection({guid: req.query.project_guid,
												     connection_id: req.params.asset_id},
			                     				    function(response_raw_data, get_connection_response) {
			                     				  		if(get_connection_response.statusCode > 200) {
			                     				  			// request received an unexpected response
                    										return callback({source: 'WDP API',
                    			             								reasonCode: get_connection_response.statusCode,
                        			         								reasonMessage: 'GET /v2/connections/ returned ' + response_raw_data});
			                     				  		}
			                     				  		else {
                 				  							const connection_response_data = JSON.parse(response_raw_data);
                 				  							datasource_connection.meta = _.find(datasource_type_lookup,
	                 				  								                            function(datasource) {
	                 				  								                           		return (connection_response_data.entity.datasource_type === datasource.datasource_type);
	                 				  								                            });
                 				  							if(datasource_connection.meta) {
                 				  								debug('Datasource type lookup yielded: %O', datasource_connection.meta);

                 				  								if(datasource_connection.meta.name === 'cloudant') {
																	datasource_connection.username = connection_response_data.entity.properties.username;
		                     				  						datasource_connection.password = connection_response_data.entity.properties.password;
		                     				  						datasource_connection.url = connection_response_data.entity.properties.url || connection_response_data.entity.properties.custom_url;
		                     				  						return callback();
                 				  								}
                 				  								else if(datasource_connection.meta.name === 'dashdb'){
                 				  									datasource_connection.username = connection_response_data.entity.properties.username;
													                datasource_connection.password = connection_response_data.entity.properties.password;
													                datasource_connection.host = connection_response_data.entity.properties.host;
													                datasource_connection.port = connection_response_data.entity.properties.port || 50001;
													                datasource_connection.database = connection_response_data.entity.properties.database;
                 				  									return callback();
                 				  								}
                 				  								else {
																	// acccess to other connection-based data sources has not been implemented
																	return callback({source: 'hello-data',
			                                			             			     reasonCode: 501,
			                                			             			     asset_type: req.params.asset_type,
 		    											  							 asset_sub_type_name: datasource_connection.meta.name,
 		    																		 asset_sub_type_label: datasource_connection.meta.label,			                                			             			     
			                                    			                         reasonMessage: 'Access has not been implemented.'});           				  									
                 				  								}
                 				  							}
                 				  							else {
			                                					return callback({source: 'hello-data',
			                                			             			 reasonCode: 404,
			                                    			                     reasonMessage: 'Lookup of datasource type info for connection asset "' + 
			                                    			                                    req.params.asset_id + '" failed. Type ' + connection_response_data.entity.datasource_type + 
			                                    			                                    ' was not found.'});
                 				  							}                				  							
                 				  						}
                 				  					});
					 	  }, 
					 	  function(callback) {
					 	  	// access datasource 
					 	  	debug('Datasource connection information: \n%O', datasource_connection);
					 	  	if(datasource_connection.meta.name === 'cloudant') {
					 			// access the selected Cloudant instance
					 			cloudant_access({username: datasource_connection.username,
					 			                 password: datasource_connection.password,
					 			                 url: datasource_connection.url},
					 			                 function(err, data) {
					 			                 	if(err) {
														return callback({source: 'Cloudant data access sample',
                                			             			     reasonCode: 500, // TODO
                                    			                         reasonMessage: err});           				  									
					 			                 	}
					 			                 	else {
			                     			         	var client_response = {
 		    												response_type: 'data_response',
 		    												asset_type: req.params.asset_type,
 		    											    asset_sub_type_name: datasource_connection.meta.name,
 		    												asset_sub_type_label: datasource_connection.meta.label,
 		    												data: data
														};			
														return callback(null, client_response);	                     				  										 			                 	
													}
					 			                 });
	     				     }
	     				     else if(datasource_connection.meta.name === 'dashdb'){
	     				     	// access the selected Db2 Warehouse instance
	     				     	db2_warehouse_access({username: datasource_connection.username,
	     				     	                      password: datasource_connection.password,
	     				     	                      hostname: datasource_connection.host,
	     				     	                      port: datasource_connection.port || 50001,
	     				     	                      database: datasource_connection.database},
		                     				     	 function(err, data) {
						 			                 	if(err) {
															return callback({source: 'Db2 Warehouse data access sample',
	                                			             			     reasonCode: 500, // TODO
	                                    			                         reasonMessage: err});           				  									
						 			                 	}
						 			                 	else {   		
			                     			         	 var client_response = {
 		    										 		 response_type: 'data_response',
 		    												 asset_type: req.params.asset_type ,
 		    												 asset_sub_type_name: datasource_connection.meta.name,
 		    												 asset_sub_type_label: datasource_connection.meta.label,
 		    												 data: data
														 };			
														 return callback(null, client_response);	                     				  										 			                 	
														}
					 			                 	  });
	     				     }
	     				     else {
	     				     	// acccess to other connection-based data sources has not been implemented
	     				     	// this code path should never be executed because the error condition was already triggered by the previous step
								return callback({source: 'hello-data',
	    			             			     reasonCode: 501,
	    			             			     asset_type: req.params.asset_type,
						  						 asset_sub_type_name: datasource_connection.meta.name,
												 asset_sub_type_label: datasource_connection.meta.label,			                                			             			     
	        			                         reasonMessage: 'Access has not been implemented.'});  
	     				     }	
					 	  }
					 	 ],
					 	 function(err, results) {
						 	if(err) {
						 		// an error was raised by one of the steps; abort
						 		console.error('Data load from connection failed: ' + JSON.stringify(err));
						 		return res.status(err.reasonCode).json(err);
						 	}
						 	else {	
								debug('Hello-data sending response\n%O', results[ results.length - 1]);
								return res.json(results[ results.length - 1]);	
						 	}
					 	 });

		}
		else if(req.params.asset_type === 'data_asset') {
			/*
			   To access a data file we need to
			    (1) determine which storage type the project is using
			    (2) collect connection information for that storage type
			    (3) 
			 */

			var asset_download_information = {};

			async.series([
					 	  function(callback) {
					 	  	// (1) determine which storage type is used by the project to store files
					 	  	// (2) store connectivity information; it'll be used in the following steps
					 	  	debug('Fetching project storage information...');
							WDPClient.project().get(
								 {guid: req.query.project_guid},
               					 function(get_project_response_raw_data, response){
                                    if(response.statusCode > 200) {
                                    	// request received an unexpected response
                                		return callback({source: 'WDP API',
                                			             reasonCode: response.statusCode,
                                    			         reasonMessage: 'GET /v2/projects/ returned ' + get_project_response_raw_data});
                                    }					                     
                                    else {
                                    	const get_project_response_data = JSON.parse(get_project_response_raw_data);
										// verify that storage has been assigned to the project
	                                    if(get_project_response_data.entity.hasOwnProperty('storage')) {
	                                      asset_download_information.storage_type = get_project_response_data.entity.storage.type;                                                
	                                      if (asset_download_information.storage_type === 'bmcos_object_storage') {
	                                      	// this project uses Cloud Object Storage; collect connection information
	                                        asset_download_information.endpoint_url = get_project_response_data.entity.storage.properties.endpoint_url;
	                                        asset_download_information.bucket_name = get_project_response_data.entity.storage.properties.bucket_name;
	                                        asset_download_information.bucket_region = get_project_response_data.entity.storage.properties.bucket_region;
	                                        asset_download_information.api_key = get_project_response_data.entity.storage.properties.credentials.admin.api_key;
	                                        asset_download_information.service_instance_id = get_project_response_data.entity.storage.guid;
	                                        asset_download_information.auth_url = get_project_response_data.entity.storage.properties.auth_url || 
	                                                                              process.env.WDP_AUTH_URL || 'https://iam.ng.bluemix.net/oidc/token';
	                                        debug('Project is configured to use Cloud Object Storage: %O', asset_download_information);
	                                        return callback();
	                                       }
	                                       else {
	                                       	  	// this project uses another storage type for which access is not implemented by hello-data
	                                        	return callback({source: 'hello-data',
	                                        		             reasonCode: 501, 
									          				     reasonMessage: 'Project "' + get_project_response_data.entity.name + 
	                                          	                                '" is configured for storage type ' + asset_download_information.storage_type + 
	                                          	                                ', which is not supported by hello-data.'});
	                                       }
	                                    }
	                                    else {
	                                    	// no project storage is configured; raise error
	                                    	return callback({source: 'hello-data',
	                                    		             reasonCode: 400, 
									          				 reasonMessage: 'No storage is configured for project "' + 
									          				                 get_project_response_data.entity.name + '"'});
	                                    }
                                    }
                                   }
                            );
						  },
					      function(callback) {
					      	// collect additional storage type specific information, if required
					      	if(asset_download_information.storage_type === 'bmcos_object_storage') {
					        	debug('Fetching asset information...');
					        	WDPClient.project().getAsset(
					        		{pguid: req.query.project_guid,
			                         aguid: req.params.asset_id}, 
	                                function(get_asset_response_raw_data, response) {
	                                    if(response.statusCode > 200) {
	                                    	// request returned an unexpected response; abort
	                                    	return callback({source: 'WDP API',
	                                    		             reasonCode: response.statusCode,
	                                    		             reasonMessage: 'GET /v2/assets/ returned ' + get_asset_response_raw_data});
	                                    }
	                                    else {
	                                        debug('Retrieved asset - ' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
	                                        const get_asset_response_data = JSON.parse(get_asset_response_raw_data);
											asset_download_information.object_key = get_asset_response_data.attachments[0].object_key;
											return callback();
						                }
					                }
					            );
							}
							else {
								return callback();
							}
						  },
						  function(callback) {
						  	// download data file from storage
					      	if(asset_download_information.storage_type === 'bmcos_object_storage') {
								cos_access({
									        api_key: asset_download_information.api_key,
									        service_instance_id: asset_download_information.service_instance_id,
									        endpoint_url: asset_download_information.endpoint_url,
									        auth_url: asset_download_information.auth_url,
									        bucket_name: asset_download_information.bucket_name,
									        object_key: asset_download_information.object_key
									       },
                     				       function(err, data) {
						 			            if(err) {
						 			          		return callback({source:'Cloud Object Storage data access sample',
						 			          						 reasonCode: 500, // TODO 
									             					 reasonMessage: err});
						 			            }
						 			          	else {
						 			          		// return information
	                     				  			return callback(null, data);							 			                 	
	                     				  		}
						 	               });
							}
							else {
								return callback({source: 'hello-data',
									             reasonCode: 501, 
									             reasonMessage: 'Data file download is not implemented for ' + asset_download_information.storage_type});
							}
						  }
						 ],
						 function(err, results) {
						 	if(err) {
						 		// an error was raised by one of the steps; abort
						 		console.error('Data load failed. ' + err.source + ' returned status code ' + err.reasonCode + ' and message ' + err.reasonMessage);
						 		return res.status(err.reasonCode).json(err);
						 	}
						 	else {
	 						    var client_response = {
									response_type: 'data_response',
									asset_type: req.params.asset_type,
									asset_sub_type_name: 'cloudobjectstorage',
									asset_sub_type_label: 'IBM Cloud Object Storage', 
									data: results[results.length - 1]
								};			
								debug('Hello-data sending response\n%O', client_response);
								return res.json(client_response);	
						 	}

						 }
			);
		}
		else {
			res.status(501).json({source: 'hello-data',
				                  reasonCode: 501,
				                  reasonMessage: 'Sample data access for assets of type ' + req.params.asset_type + ' has not been implemented.'
				            	 });
		}
	});

	app.use("/hello_data", router);
};

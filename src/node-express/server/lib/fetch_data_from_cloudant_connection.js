// Licensed under the Apache License, Version 2.0 (the 'License'); you may not
// use this file except in compliance with the License. You may obtain a copy of
// the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations under
// the License.

'use strict';

const async = require('async');
const debug = require('debug')('connect');
const _ = require('lodash');
const url = require('url');

const client = require('./client.js');

module.exports = function(parms, mcallback){

    const project_name = parms.project_name;
    const connection_name = parms.connection_name;

    var conn_options = {
     apitoken: parms.api_key
    };
 
    // TODO if(process.env.IS_DEV) {
     conn_options.auth_url = 'https://iam.stage1.ng.bluemix.net/oidc/token';
     conn_options.base_url = 'https://apsx-api-dev.stage1.ng.bluemix.net'; 
    // }

    var WDPClient = new client(conn_options);   

    var project_info = {
        guid: null, // type String
        connection_type: null, // type String
        connection_credentials: null // type object (structure depends on connection_type)
    };

    /*
     Use the WDP Core API and a Cloudant API to connect to a Cloudant connection that is defined in a Watson Data Platform project.
     */
    async.series([
      function(callback) {
        /* 
          - verify that the project exists
          - retrieve project metadata
        */
        debug('Retrieving project list and verifying project information...');   
        WDPClient.project().list({name: project_name}, 
                                 function(raw_data, response) {
                                    if(response.statusCode > 200) {
                                      return callback('Project ' + project_name + ' was not found. Project list request returned HTTP code ' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                    }
                                    else {
                                      debug('Retrieved project list:' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                      const data = JSON.parse(raw_data);
                                      if(data.total_results === 0) {
                                        // project was not found; raise an error to abort processing pipeline
                                        return callback('Error. Project ' + project_name + ' was not found.');
                                      }
                                      else {
                                        // get project id
                                        project_info.guid = data.resources[0].metadata.guid;
                                        return callback(null, "Project step: OK.");
                                      }                                           
                                    }
                                 });
        },
        function(callback) {
          /* 
            - Verify that a Cloudant connection with the specified name was defined in the project.
          */   
          debug('Retrieving connection list and locating connection information for ' + connection_name + ' ...');
          WDPClient.project().listConnections({guid: project_info.guid}, 
                                         function(raw_data, response) {
                                          if(response.statusCode > 200) {
                                            return callback('Error verifying that connection ' + connection_name + ' is defined in project ' + project_name + 
                                                            '. Connection list request returned HTTP code ' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                          }
                                          else {
                                            debug('Retrieved connection list - ' + response.statusCode + ' (' + response.statusMessage + '): ' + response.raw);
                                            const data = JSON.parse(raw_data);
                                            const connection_asset = _.find(data.resources,
                                                                            function(asset) {
                                                                              return((asset.entity.name === connection_name) && (asset.metadata.asset_type === 'connection'));
                                                                            });
                                            if(connection_asset) {
                                              // extract database information from URL if a database name was specified
                                              var cloudant_url = url.parse(connection_asset.entity.properties.custom_url);
                                              var database = null;
                                              const db_re = /^\/([^\/]+)\/?$/;
                                              const re_match = db_re.exec(cloudant_url.pathname);
                                              if(re_match) {
                                                database = re_match[1];
                                                cloudant_url.pathname = '/';
                                              }
                                              project_info.connection_type = 'cloudant';
                                              project_info.connection_credentials = {
                                                username: connection_asset.entity.properties.username,
                                                password: connection_asset.entity.properties.password,
                                                url: url.format(cloudant_url),
                                                database: database
                                              };
                                              debug('Connection information: ' + JSON.stringify(project_info.connection_credentials));
                                              return callback(null, 'Connection lookup step: OK.');
                                            }
                                            else {
                                              return callback('Error. No Cloudant connection named ' + connection_name + ' is defined in project ' + project_name);
                                            }
                                          }
                                         });
        },
        function(callback) {
          /* 
            - Connect to Cloudant using the provided credentials. 
            Refer to https://medium.com/ibm-watson-data-lab/choosing-a-cloudant-library-d14c06f3d714 to learn more about Cloudant libraries for Node.js.
          */ 

          if(project_info.connection_credentials.database) {
            debug('Connecting to database ' + project_info.connection_credentials.database + ' ...');
            var db = require('silverlining')(project_info.connection_credentials.url, project_info.connection_credentials.database); 
              db.count().then(function(data) {
                debug('The database contains ' + data + ' documents.');
                return callback(null, "Connection step: OK.");
              }).catch(function(err) {
                return callback('Error connecting to the Cloudant database: ' + JSON.stringify(err));
              });
          } 
          else {
            // https://www.npmjs.com/package/cloudant
            var Cloudant = require('cloudant');
            var cloudant = Cloudant({url: project_info.connection_credentials.url, plugin:'promises'});
            cloudant.db.list().then(function(data) {
                debug('This Cloudant instance contains ' + data.length + ' databases.');
                return callback(null, "Connection step: OK.");
            }).catch(function(err) {
              return callback('Error connecting to Cloudant: ' + JSON.stringify(err));
            });
          }


        },
     ],
     function(err, results) {
        /*
            Output results or error.
         */
        if(err) {
        	return mcallback(err, null);
        }
        else {
            // Project step: OK.
            // Asset verification step: OK.
            // Connection step: OK.
            _.each(results,
                   function(result) {
                        console.log(result);
                   });
            return mcallback(null, 'OK');
        }
     });
}
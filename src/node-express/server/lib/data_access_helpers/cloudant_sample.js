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

const Cloudant = require('cloudant');
const debug = require('debug')('hello-data:cloudant_sample');


function isNullOrEmptyString(string) {
  return ((! string) || (string.trim().length === 0));
}

module.exports = function(connection_credentials, callback){

  if((! connection_credentials) || (isNullOrEmptyString(connection_credentials.username)) || (isNullOrEmptyString(connection_credentials.password))) {
    return callback('Invocation error. Connection credentials are missing.');
  }

  if(isNullOrEmptyString(connection_credentials.url)) {
    connection_credentials.url = 'https://' + connection_credentials.username + ':' + connection_credentials.password + '@' + connection_credentials.username + '.cloudant.com';
  }

  debug('Connecting to Cloudant using URL ' +  connection_credentials.url);

  var cloudant = Cloudant({url: connection_credentials.url, plugin:'promises'});
  cloudant.db.list().then(function(data) {
      // return the number of databases in this instance
      return callback(null, 'This Cloudant instance contains ' + data.length + ' database(s).');
  }).catch(function(err) {
    return callback(JSON.stringify(err));
  }); 
};
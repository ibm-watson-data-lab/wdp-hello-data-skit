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


const debug = require('debug')('hello-data:db2wh_sample');
const ibm_db = require('ibm_db');

function isNullOrEmptyString(string) {
  return ((! string) || (string.trim().length === 0));
}

function isNullOrNotPositiveNumber(number) {
  return ((! number) || (typeof number !== 'number') || (number < 1));
}

module.exports = function(connection_credentials, callback){

  if((! connection_credentials) || 
     (isNullOrEmptyString(connection_credentials.username)) || 
     (isNullOrEmptyString(connection_credentials.password)) || 
     (isNullOrEmptyString(connection_credentials.hostname)) || 
     (isNullOrNotPositiveNumber(connection_credentials.port)) || 
     (isNullOrEmptyString(connection_credentials.database))) {
    debug('Db2 Warehouse connection credentials: \n%O', connection_credentials);
    return callback('Invocation error. Connection credentials are missing.');
  }

  const ssldsn = 'DATABASE=' + connection_credentials.database +
                 ';HOSTNAME=' + connection_credentials.hostname +
                 ';PORT=' + connection_credentials.port +
                 ';PROTOCOL=TCPIP;UID=' + connection_credentials.username + 
                 ';PWD=' + connection_credentials.password + 
                 ';Security=SSL;';

  debug('Connecting to Db2 Warehouse using URL ' +  ssldsn);


  function close_conn(conn, parent_callback) {
    conn.close(function (err) {
      if (err) {
       console.error('Error disconnecting from the Db2 Warehouse database: ' + JSON.stringify(err));
       }
      return parent_callback();
    });
  }

  ibm_db.open(ssldsn, 
              function (err, conn) {
                if (err) {
                  return callback('Error connecting to the Db2 Warehouse database using dsn ' + 
                                  ssldsn + ' : ' + JSON.stringify(err));
                }
                // ... fetch some data
                debug('Querying the database...');
                conn.query('SELECT COUNT(*) AS TABLE_COUNT FROM SYSCAT.TABLES WHERE OWNER = \'' + connection_credentials.username.toUpperCase() + '\'', function (err, data) {
                  if (err) {
                    debug('The query failed.');
                    close_conn(conn, function() {
                      return callback('Error querying the Db2 Warehouse database: ' + JSON.stringify(err));
                    });
                  }
                  else {
                    debug('The query returned the following result: \n%O', data);
                    close_conn(conn, function() {  
                      return callback(null, 'The database contains ' + data[0].TABLE_COUNT + ' tables that are owned by ' + connection_credentials.username + '.');
                    });
                  }
                });
              });
};
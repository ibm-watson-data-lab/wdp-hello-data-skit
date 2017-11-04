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

const debug = require('debug')('hello-data:cos_sample');
const AWS = require('ibm-cos-sdk');
const filesize = require('file-size');


function isNullOrEmptyString(string) {
  return ((! string) || (string.trim().length === 0));
}

module.exports = function(cos_download_information, callback){

  if((! cos_download_information) || 
     (isNullOrEmptyString(cos_download_information.api_key)) || 
     (isNullOrEmptyString(cos_download_information.service_instance_id)) || 
     (isNullOrEmptyString(cos_download_information.endpoint_url)) || 
     (isNullOrEmptyString(cos_download_information.auth_url)) || 
     (isNullOrEmptyString(cos_download_information.bucket_name)) ||
     (isNullOrEmptyString(cos_download_information.object_key))) {
    return callback('Invocation error. Connection credentials are missing.');
  }

  const cos_config = {
    endpoint: cos_download_information.endpoint_url,
    apiKeyId: cos_download_information.api_key,
    serviceInstanceId: cos_download_information.service_instance_id,
    ibmAuthEndpoint: cos_download_information.auth_url
  };

  debug('Cloud Object Storage config: %O', cos_config);

  const cos = new AWS.S3(cos_config);

  const object_spec = {
    Bucket: '/' + cos_download_information.bucket_name, 
    Key: cos_download_information.object_key
  };

  debug('Cloud Object Storage object spec: %O', object_spec);

  // download object from the specified bucket on Cloud Object Storage
  debug('Downloading data file from Cloud Object Storage...');
  cos.getObject(object_spec, 
                 function(err, data) {
                    if (err) {
                      console.error('Error retrieving object ' + cos_download_information.object_key + 
                                      ' from bucket ' + cos_download_information.bucket_name + 
                                      ': ' + JSON.stringify(err));  
                      return callback(JSON.stringify(err));
                    }
                    else   {   
                      // data.Body (a Buffer) contains the downloaded object
                      return callback(null, 'The size of object named "' + cos_download_information.object_key + '" is ' + filesize(data.Body.length).human() +'.');
                    } 
                   });
};
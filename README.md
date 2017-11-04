# Watson Data Platform - Hello Data starter kit

This starter kit illustrates how to 
 * connect to the Waton Data Platform
 * list projects
 * list assets in a project
 * retrieve data source connection (an asset of type "connection") information
 * retrieve a data file (an asset of type "data asset")

## Application overview
This Node.js starter kit application illustrates how to collect data asset information from a Watson Data Platform project and how to access a Cloudant database, a DB2 Warehouse on Cloud database and a data file that's stored in IBM Cloud Object Storage using that information.

### Debugging 
Each component in this starter kit application generates debug output. 
 * Web page: debug output is always written to the browser console.
 * Backend modules: to enable debug output for all modules set environment variable `DEBUG` to `hello-data:*`
   * hello-data router: to enable debug output only for this module set environment variable `DEBUG` to `hello-data:router`
   * hello-data Cloudant data access: to enable debug output only for this module set environment variable `DEBUG` to `hello-data:cloudant_sample`
   * hello-data Db2 Warehouse on Cloud data access: to enable debug output only for this module set environment variable `DEBUG` to `hello-data:db2wh_sample`
   * hello-data IBM Cloud Object Storage data access: to enable debug output only for this module set environment variable `DEBUG` to `hello-data:cos_sample`

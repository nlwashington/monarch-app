 /*

   Monarch WebApp

  See the RingoJS and Stick documentation for details on the approach.

  After some helper functions are declared, this consists of mappings of URL patterns to queries + visualization

 */

var env = require('../serverenv.js');
var web = require('./webenv.js');
var fs = require('fs');

var Mustache = require('mustache');
if (env.isRingoJS()) {
  var stick = require('stick');

  var response = require('ringo/jsgi/response');

  var httpclient = require('ringo/httpclient');
  var http = require('ringo/utils/http');
  var file = require('ringo/utils/files');
  var strings = require('ringo/utils/strings');
}
else {
  var AsyncRequest = require('request');
  var WaitFor = require('wait.for'); 
}


if (env.isRingoJS()) {
  var pup_tent_loader = require('pup-tent');
  var reporter = require('pup-analytics')();
}
else {
  var pup_tent_loader = require('../../../modules/pup-tent/pup-tent.js');
  var reporter = require('../../../modules/pup-analytics')();
}

var pup_tent = pup_tent_loader([
                    'js',
                    'css',
                    'templates',
                    'templates/labs',
                    'templates/legacy',
                    'templates/page',
                    'widgets/dove',
                    'widgets/dove/js',
                    'widgets/dove/lib',
                    'widgets/dove/css',
                    'node_modules/phenogrid/node_modules/gfm.css', // dist contains phenogrid-bundle.js and phenogrid-bundle.css
                    'node_modules/phenogrid/dist', // dist contains phenogrid-bundle.js and phenogrid-bundle.css
                    'node_modules/phenogrid/config', // config contains phenogrid_config.js
                    'node_modules/phenogrid/js/res',
                    'widgets/keggerator/js',
                    'widgets/class-enrichment',
                    'conf', // get access to conf/golr-conf.json
                    'widgets/dove/js/model',
                    'widgets/dove/js/chart',
                    'widgets/dove/js/builder',
                    'js/lib/monarch/widget',
                    ]);

if (env.isRingoJS()) {
    var app = exports.app = new stick.Application();
    app.configure('route');
    app.configure('params');
    app.configure('static');
    app.configure(require('./sanitize'));
    app.configure(require('./cors-middleware.js'));

    var http = require("ringo/utils/http");
    var isFileUpload = http.isFileUpload;
    var TempFileFactory = http.TempFileFactory;
    var mergeParameter = http.mergeParameter;
    var BufferFactory = http.BufferFactory;
    var getMimeParameter = http.getMimeParameter;
    var Headers = http.Headers;

    /* Here we are overriding the upload function from stick's upload.js module
     * The stick module is hardcoded to use a BufferFactory for uploads, resulting
     * in large files causing memory issues.  Here we override the function using
     * a TempFileFactory from ringo/utils/http.js.  This streams the data into a 
     * temp file using the servers default tmp directory.  
     * 
     * We also set a limit of 50 mb by checking the content-length in
     * HTTP Header and override the parseFileUpload function to support a 
     * streaming limit as well.
     */

    // Custom upload function to upload files to tmp file
    // Set upload limit to <50 MB using content-length from HTTP Header
    // Set streaming limit to <60 MB in case the content-length is incorrect
    app.configure (function upload(next, app) {

        app.upload = {
            impl: TempFileFactory
        };

        return function upload(req) {

            var postParams, desc = Object.getOwnPropertyDescriptor(req, "postParams");

            /**
             * An object containing the parsed HTTP POST parameters sent with this request.
             * @name request.postParams
             */
            Object.defineProperty(req, "postParams", {
                get: function() {
                    if (!postParams) {
                        var contentType = req.env.servletRequest.getContentType();
                        if (req.headers['content-length'] > 50000000){
                            postParams = {};
                            postParams.file_exceeds = req.headers['content-length'];
                        } else if ((req.method === "POST" || req.method === "PUT")
                                && isFileUpload(contentType)) {
                            postParams = {};
                            var encoding = req.env.servletRequest.getCharacterEncoding();
                            var byte_limit = 60000000;
                            parseFileUploadWithLimit(this, postParams, encoding, TempFileFactory, byte_limit);
                        } else if (desc) {
                            postParams = desc.get ? desc.get.apply(req) : desc.value;
                        }
                    }
                    return postParams;
                }, configurable: true
            });

            return next(req);
        };
    });
}
else {
    var Hapi = require('hapi');
    var http = require('http');

    // Create a server with a host and port
    var app = new Hapi.Server();
    app.connection({
        host: 'localhost',
        port: 8080
    });

    // Add routes

    app.route({
        method: 'GET',
        path: '/js/{filename}',
        handler: {
            file: function (request) {
                console.log('serving static:', '/js/' + request.params.filename);
                return 'js/' + request.params.filename;
            }
        }
    });

    // More efficient than fs.readFileSync(), presumably
    // app.route({
    //     method: 'GET',
    //     path: '/image/{filename}',
    //     handler: {
    //         file: function (request) {
    //             console.log('serving static:', '/image/' + request.params.filename);
    //             return 'image/' + request.params.filename;
    //         }
    //     }
    // });

    app.route({
        method: 'GET',
        path: '/css/{filename}',
        handler: {
            file: function (request) {
                console.log('serving static:', '/css/' + request.params.filename);
                return 'css/' + request.params.filename;
            }
        }
    });

    app.start(function () {
        console.log('Server running at:', app.info.uri);
    });

    app.get = function (route, handler) {
        var simpleRoute = route.indexOf(':') === -1;
        var wrappedHandler =  function (request, reply) {
                                WaitFor.launchFiber(handler, request, reply);
                              };
        if (simpleRoute) {
            app.route({
                method: 'GET',
                path: route,
                handler: wrappedHandler
            });
        }
        else {
            //console.log('#### PARAMETERIZED ROUTES NOT YET IMPLEMENTED:', route);
        }
    };

    app.post = function (route, handler) {
        var wrappedHandler =  function (request, reply) {
                                WaitFor.launchFiber(handler, request, reply);
                              };
        var simpleRoute = route.indexOf(':') === -1;
        if (simpleRoute) {
            app.route({
                method: 'POST',
                path: route,
                handler: wrappedHandler
            });
        }
    };
}


//app.static("docs", "index.html", "/docs");

//Configure pup tent common css and js libs
pup_tent.set_common('css_libs', [
    '/bootstrap.min.css',
    '/monarch-common.css',
    '/jquery-ui.css']);
pup_tent.set_common('js_libs', [
    '/underscore-min.js',
    '/jquery-1.11.0.min.js',
    '/jquery-ui-1.10.3.custom.min.js',
    '/bootstrap.min.js',
    '/d3.min.js',
    '/search_form.js',
    '/tabs.js',
    '/monarch-common.js',
    '/monarch.js',
    '/jquery.cookie.js',
    '/jquery.xml2json.js']);


//note: in future this may conform to CommonJS and be 'require'd
var engine = new bbop.monarch.Engine();

// The kinds of types that we're likely to see.
var js_re = /\.js$/;
var css_re = /\.css$/;
var json_re = /\.json$/;
var html_re = /\.html$/;
var png_re = /\.png$/;
function _decide_content_type(thing){
    var ctype = null;
    if( js_re.test(thing) ){
        ctype = 'text/javascript';
    }else if( css_re.test(thing) ){
        ctype = 'text/css';
    }else if( json_re.test(thing) ){
        ctype = 'application/json';
    }else if( html_re.test(thing) ){
        ctype = 'text/html';
    }else if( png_re.test(thing) ){
        ctype = 'image/png';
    }else{
        // "Unknown" type.
        ctype = 'application/octet-stream';
    }
    return ctype;
}
function _return_mapped_content(loc){
    var ctype = _decide_content_type(loc);
    var str_rep = env.fs_readFileSync(loc);
    return {
    	body: [str_rep],
    	headers: {'Content-Type': ctype},
    	status: 200
    };
}

// Add routes for all static cache items at top-level.
pup_tent.cached_list().forEach(
  function(thing) {
    // This will skip cached templates and other files not intended to be
    // sent to the client
    var route_exclusion_re = /\.mustache$|\.json$/;

    var ctype = _decide_content_type(thing);
    if( ctype !== null && !route_exclusion_re.test(thing)) {
        // console.log('STATIC ROUTES: ', thing, ctype);
        if (env.isRingoJS()) {
            app.get('/' + thing,
                function(req, repl) {
                    return {
                        body: [pup_tent.get(thing)],
                        headers: {'Content-Type': ctype},
                        status: 200
                    };
                });
        }
        else {
          app.route({
            method: 'GET',
            path: '/' + thing,
            handler:
              function (request, reply) {
                reply(pup_tent.get(thing)).type(ctype);
              }
          });
        }
    }
    else {
        // console.log('SKIP STATIC ROUTES: ', thing, ctype);
    }
  });


// When not in production, re-read files from disk--makes development
// easier.
if( ! engine.isProduction() ){
    pup_tent.use_cache_p(false);
}

// note: this will probably move to it's own OO module
engine.cache = {
    fetch: function(tbl, key, val) {
        var result = null;
        var path = "./cache/"+tbl+"/key-"+key+".json";
        if (env.fs_existsSync(path)) {
            var content = env.fs_readFileSync(path);
            result = JSON.parse(content);
        }
        return result;
    },
    store: function(tbl, key, val) {
        var path = "./cache/"+tbl+"/key-"+key+".json";
        //console.log("S lookup:"+path);
        env.fs_writeFileSync(path, JSON.stringify(val));
    },
    clear: function(match) {
        var files = env.fs_listTreeSync("cache");
        for (var i=0; i<files.length; i++) {
            var file = files[i];
            console.log("T:"+file);
            if (file.indexOf("key-") > 0 &&
                file.indexOf(".json") > 0) {
                if (match != null && file.indexOf(match) == -1) {
                    // does not match specified key
                }
                else {
                    console.log("CLEARING: " + file);
                    env.fs_unlinkSync("./cache/" + file);
                }
            }
        }
    },
    sizeInfo: function() {
        var subprocess = require("ringo/subprocess");
        console.log("Getting sizeInfo for "+this.cacheDirs());
        var info =
            this.cacheDirs().map(function(dir) {
                console.log("Testing: "+dir);
                return { id : dir,
                         entries : env.fs_listTreeSync("cache/"+dir).filter(function(f){ return f.indexOf(".json") > 0}).length,
                         sizeOnfo : subprocess.command("du -sh cache/"+dir)
                       };
            });
        console.log("Got: "+info.length);
        return info;
    },
    cacheDirs: function() {
        if (env.isRingoJS()) {
            return fs.listDirectoryTree("cache").filter(function(f){ return f.length > 0 });
            //return env.fs_listTreeSync("cache").filter(function(f){ return fs.isDirectory(f)});
        }
        else {
            console.log('cache.cacheDirs not supported for NodeJS yet. No equivalent to fs.listDirectoryTree');
        }
    },
    contents: function() {
        return env.fs_listTreeSync("cache").filter(function(f){ return f.indexOf(".json") > 0});
    }
};

// STATIC HELPER FUNCTIONS. May become OO later.
//o Deprecated with Pup tent
function getConfig(t) {
    var s = JSON.parse(env.fs_readFileSync('conf/'+t+'.json'));
    return s;
}

function staticTemplate(t) {
    var info = {};
    addCoreRenderers(info);
    info.pup_tent_css_libraries.push("/monarch-main.css");
    var output = pup_tent.render(t+'.mustache',info);
    return output;
}

function prepLandingPage() {
  // Rendering.
  var info = {};
  var defaults = {
      monarch_nav_search_p: true,
      monarch_extra_footer_p: false,
      monarch_footer_fade_p: false
  };
  addCoreRenderers(info, null, null, defaults);
  info.pup_tent_css_libraries.push("/monarch-landing.css");
  return info;
}

function loadBlogData(category, lim) {
  // Get blog data and render with vars.
  var blog_res = _get_blog_data(category);
  // Limit to X.
  var lim = 4;
  if (blog_res && blog_res.length > lim ) {
    blog_res = blog_res.slice(0, lim);
  }
  return blog_res;
}

// This function takes a json representation of some data
// (for example, a disease and various associated genes, phenotypes)
// intended to be rendered by some template (e.g. disease.mustache) and
// adds additional functions or data to be used in the template.
// The defaults arguments is used to supply initial values. For example, defaults might be:
//   var defaults = {
//       monarch_nav_search_p: false,
//       monarch_extra_footer_p: true,
//       monarch_footer_fade_p: false
//   };
//   addCoreRenderers(info, null, null, defaults);
//
function addCoreRenderers(info, type, id, defaults){
    // Initialize info
    if( ! info ){ info = {}; }

    // Standard context.
    info['@context'] = "/conf/monarch-context.json";

    // Add standard pup-tent variables.
    info.pup_tent_css_libraries = [];
    info.pup_tent_js_libraries = [];
    info.pup_tent_js_variables = [];

    info.monarch_nav_search_p = true;
    info.monarch_extra_footer_p = false;
    info.monarch_footer_fade_p = true;

    // Apply defaults for monarch layout controls.
    if (typeof defaults !== 'undefined') {
        if (typeof(defaults.monarch_nav_search_p) !== 'undefined') {
            info.monarch_nav_search_p = defaults.monarch_nav_search_p;
        }
        if (typeof(defaults.monarch_extra_footer_p) !== 'undefined') {
            info.monarch_extra_footer_p = defaults.monarch_extra_footer_p;
        }
        if (typeof(defaults.monarch_footer_fade_p) !== 'undefined') {
            info.monarch_footer_fade_p = defaults.monarch_footer_fade_p;
        }
    }

    // JS launcher.
    info.monarch_launchable = [];

    // Other controls.
    info.alerts = [];
    info.scripts = [];
    info.stylesheets = [];

    if (id != null) {
        info.base_url = "/"+type+"/"+id;
        info.download = {
            "json" : genURL(type, id, 'json')
        };
        //console.log("DN:"+JSON.stringify(info.download));
    }

    // Add global CSS.
    info.css = {};
    // info.css.table = "table table-striped table-condensed";

    // Add parsed conf files from /conf if not already in.
    if( info['conf'] == null ){ info['conf'] = {}; }
    if( info['conf']['monarch-team'] == null ){
	// Read in conf/monarch-team.json.
	info['conf']['monarch-team'] =
	    JSON.parse(env.fs_readFileSync('./conf/monarch-team.json'));
    }

    if (info.relationships != null) {
        var superClasses = [];
        var subClasses = [];
        var equivalentClasses = [];
        for (var k in info.relationships) {
            var rel = info.relationships[k];
            var propId = rel.property.id;
            if (propId == 'equivalentClass') {
                if (id == rel.subject.id){
                    equivalentClasses.push(rel.object);
                }
                else if (id == rel.object.id) {
                    equivalentClasses.push(rel.subject);
                }
                else {
                    console.error("Logic error: "+JSON.stringify(rel));
                }
            }
        }
        // The concept of node is taken from the OWLAPI; a node
        // is a set of classes that are mutually equivalent
        var node = equivalentClasses.map(function(c){return c.id;}).concat(id);

        for (var k in info.relationships) {
            var rel = info.relationships[k];
            var propId = rel.property.id;
            if (propId == 'subClassOf' || propId == 'BFO_0000050') {
                if (node.indexOf( rel.subject.id ) > -1){
                    if (rel.object.label) {
                        superClasses.push(rel.object);
                    }
                }
                else if (node.indexOf( rel.object.id ) > -1){
                    if (rel.subject.label) {
                        subClasses.push(rel.subject);
                    }
                }
                else {
                    // this state should be impossible when OQ bug is fixed
                    console.error("Logic error: "+rel);
                }
            }
        }
        info.superClasses = superClasses.map(function(c){return genObjectHref(type,c);});
        info.subClasses = subClasses.map(function(c){return genObjectHref(type,c);});
        info.equivalentClasses = equivalentClasses.map(function(c){return genObjectHref(type,c)+" ("+c.id+")";});
    }
    info.includes = {};
    var alys_id = engine.config.analytics_id || null;

    info.includes.analytics = pup_tent.render('analytics.mustache',
                                                {'analytics_id': alys_id});
    info.includes.navbar = pup_tent.render('navbar.mustache', info);
    info.includes.footer = pup_tent.render('footer.mustache', info);
    info.includes.classificationComponent = pup_tent.render('classificationComponent.mustache', info);

    info.isProduction = engine.config.type == 'production';

    info.alerts = info.alerts.concat(getConfig('alerts'));
    if (!info.isProduction) {
        var prodUrlSuffix = (id == null ? "" : genURL(type, id));
        var prodUrl = "http://monarchinitiative.org" + prodUrlSuffix;
        var legacyUrl = "/legacy" + prodUrlSuffix;
        info.alerts.push("This is the beta interface. <a href='"+prodUrl+"'>View this page on the main portal</a>.");
    }
}


// adds js and other files required for phenogrid
function addPhenogridFiles(info) {
    info.pup_tent_js_libraries.push("/phenogrid_config.js");
    info.pup_tent_js_libraries.push("/phenogrid-bundle.js"); // Minified - Zhou
    info.pup_tent_css_libraries.push("/phenogrid-bundle.css"); // Minified - Zhou
}

// Takes JSON and returns an HTTP response, possibly translating
// the JSON into a requested format.
// Note that HTML is handled separately.
function formattedResults(info, fmt, request) {
    if (env.isRingoJS()) {
        if (fmt == 'json') {
            var jsonResult = response.json(info);
            return jsonResult;
        }
        if (fmt == 'text') {
            return response.text(info);
        }
    }
    else {
        if (fmt == 'json') {
            return web.wrapJSON(info);
        }
        else if (fmt == 'text') {
            return web.wrapTEXT(info);
        }
    }

    if (fmt == 'jsonp') {
        // get callback name from parameters and wrap it around
        //response.
        /// consider replacing with response.jsonp once we got to
        //ringo .10
        var qs = request.queryString;
        var params = http.parseParameters(qs);
        callback = params.callback;
        var resp  = callback+"("+JSON.stringify(info)+");";
        return {
            status: 200,
            headers: {"Content-Type": "application/json"},
            body: [resp]
        };
    }
    else if (fmt == 'rdf' || fmt == 'nt') {
        // prepare  POST request to JSON-LD ==> RDF translator
        // (in future we may do this ourselves)
        var ct = 'text/plain';
        //var ct = 'application/n-triples';
        var tgt = fmt;
        if (fmt == 'rdf') {
            tgt = 'xml';
            ct = 'application/rdf+xml';
        }
        var url = "http://rdf-translator.appspot.com/convert/json-ld/"+tgt+"/content";
        var jsonStr = JSON.stringify(info);
        var rdf = httpclient.post(url, {content:jsonStr}).content;
        return {
            body: [rdf],
            headers: {'Content-Type': ct},
            status: 200
        };
    }
    else {
        return {
            body: [ "Cannot handle format/extension: "+fmt],
            status: 500
        };
    }
}

var responseFormattedData = formattedResults;

function responseError(s) {
    if (env.isRingoJS()) {
        return response.error(s);
    }
    else {
        return {
            body: [s],
            headers: {'Content-Type': 'text/plain'},
            status: 200
        };
    }
}


function errorResponse(msg) {
    var info = {};
    addCoreRenderers(info);
    //print(JSON.stringify(msg));
    console.error("Throwing error:" + msg);
    for (var k in msg) {
        console.warn("  :"+k+"="+msg[k]);
    }
    var stm = require("ringo/logging").getScriptStack(msg);
    console.error("Stack trace="+stm);
    //info.message = JSON.stringify(msg, null, ' ');
    info.stackTrace = stm;
    info.message = msg.message;
    info.pup_tent_css_libraries.push("/monarch-main.css");
    info.title = 'Error';
    var output = pup_tent.render('notfound.mustache',info,'monarch_base.mustache');
    var res =  response.html(output);
    res.status = 500;
    return res;
}

function notFoundResponse(msg) {
    var info = {};
    addCoreRenderers(info);
    //print(JSON.stringify(msg));
    console.error("Throwing error:" + msg);
    if (env.isRingoJS()) {
        var stm = require("ringo/logging").getScriptStack(msg);
    }
    else {
        var stm = ["Stack Trace NYI for NodeJS"];
    }
    console.error("Stack trace="+stm);
    //info.message = JSON.stringify(msg, null, ' ');
    info.stackTrace = stm;
    info.message = msg.message;
    info.pup_tent_css_libraries.push("/monarch-main.css");
    info.title = 'Error';
    var output = pup_tent.render('notfound.mustache',info,'monarch_base.mustache');
    return web.wrapHTML(output, 404);
}


////////////////////////////////////////
// CONTROLLER
//


/* Namespace: webapp
 *
 * Monarch REST URLs for retrieving web pages, JSON and HTML
 *
 * Each REST URL pattern has an undelrying implementation in <monarch.api>
 *
 */

/*
 * Method: /status
 *
 * Return the current state of webapp.js, including any interesting
 * analytics we might have collected (TODO).
 *
 * Parameters: 
 *  request - the incoming request object
 *
 * Returns:
 *  JSON response
 */

web.wrapRouteGet(app, '/status', '/status', [],
    function(request) {
        var status = {};

        status['name'] = "Monarch Application";
        status['okay'] =  true;
        status['message'] =  'okay';
        status['date'] = (new Date()).toString();
        status['location'] = request.url || request.pathInfo || '???';
        status['offerings'] = [
            {'name': 'api_version', 'value': engine.apiVersionInfo()},
            {'name': 'config_type', 'value': engine.config.type},
            {'name': 'good_robot_hits', 'value': reporter.report('robots.txt')}
        ];

        var output = web.wrapJSON(status);
        return output;
    }
);

// Method: /
//
// Arguments:
//  - none
//
// Returns:
//  Top level page
app.get('/labs/old-home', function(request) {
    var info = {};
    addCoreRenderers(info);

    info.pup_tent_css_libraries = [
        '/monarch-main.css',
        '/main.css'
    ];
    info.title = 'Monarch Diseases and Phenotypes';
    var output = pup_tent.render('main.mustache', info, 'monarch_base.mustache');
    return response.html(output);
});


web.wrapRouteGet(app, '/page/:page', '/page/{page}', ['page'],
    function(request, page) {
        var info = {};
        addCoreRenderers(info);

        if ((page !== 'software')){
            info.pup_tent_css_libraries.push("/tour.css");
        } else {
            info.pup_tent_css_libraries.push("/monarch-main.css");
        }

        var output = pup_tent.render(page+'.mustache',info);
        return web.wrapHTML(output);
    }
);


// block unwanted access
web.wrapRouteGet(app, '/robots.txt', '/robots.txt', [],
    function(request) {
        var info = {};
        addCoreRenderers(info);
        reporter.hit('robots.txt');

        return web.wrapTEXT(pup_tent.apply('robots.mustache', info));
    }
);


// anything in the docs/ directory is passed through statically

web.wrapRouteGet(app, '/docs/:dirname/:filename', '/docs/{dirname}/{filename}', ['dirname', 'filename'],
    function(request, dirname, filename) {
        var path = './docs/'+dirname + '/' + filename;
        var ctype = _decide_content_type(path);
        var s = env.fs_readFileSync(path) + '';
        return web.wrapBinary(s, ctype);
    }
);

web.wrapRouteGet(app, '/docs/:filename', '/docs/{filename*}', ['filename'],
    function(request, filename) {
        var path = './docs/'+filename;
        var ctype = _decide_content_type(path);
        var s = env.fs_readFileSync(path) + '';
        return web.wrapHTML(s);
    }
);

web.wrapRouteGet(app, '/image/:page', '/image/{page}', ['page'],
    function(request, page) {
        var path = './image/'+page;
        var ctype = _decide_content_type(path);
        var s = env.fs_readFileSyncBinary(path) ;
        return web.wrapBinary(s, ctype);
    }
);

web.wrapRouteGet(app, '/image/team/:page', '/image/team/{page}', ['page'],
    function(request, page) {
        var path = './image/team/'+page;
        var ctype = _decide_content_type(path);
        var s = env.fs_readFileSyncBinary(path) ;
        return web.wrapBinary(s, ctype);
    }
);

web.wrapRouteGet(app, '/node_modules/phenogrid/image/:filename', '/node_modules/phenogrid/image/{filename}', ['filename'],
    function(request, filename) {
        var path = './node_modules/phenogrid/image/' + filename;
        var ctype = _decide_content_type(path);
        var s = env.fs_readFileSyncBinary(path);
        return web.wrapBinary(s, ctype);
    }
);

web.wrapRouteGet(app, '/node_modules/phenogrid/:filename', '/node_modules/phenogrid/{filename*}', ['filename'],
    function(request, filename) {
        var path = './node_modules/phenogrid/'+filename;
        var ctype = _decide_content_type(path);
        var s = env.fs_readFileSync(path) + '';
        return web.wrapHTML(s);
    }
);


//
//  Miscellaneous utility functions that should be moved out of the way of the route defs
//
function renderPage(loc,page,ctype) {
    var s = env.fs_readFileSync(loc+'/'+page) + '';
    return Mustache.to_html(s, {});
}

/* needed to retain basic functionality for pass-through end run around puptent for phenogrid.*/
function serveDirect(loc,page,ctype) {
    // var body = env.fs_readFileSyncBinary(loc+'/'+page);
    // var result = {
    //         body: [body],
    //         headers: {'Content-Type': ctype},
    //         status: 200
    //     };
    var path = module.resolve('../../../' + loc+'/'+page);
    var result = response.static(path, ctype);
    return result;
}


// Get the query format (or null)
function getQueryFormat(path) {
  var fmt = null;
  if (path.lastIndexOf('.') > -1) {
      fmt = path.substring(path.lastIndexOf('.') + 1);
      if (0 === fmt.length) {
          fmt = null;
      }
  }
  return fmt;
}

// Get the query term
function getQueryTerm(path) {
  if (path.lastIndexOf('.') > -1) {
      path = path.substring(0, path.lastIndexOf('.'));
  }
  return path.substring(path.indexOf('/', 1) + 1);
}


//
// Continue with route defs
//

// Method: search
//
// searches over ontology terms via SciGraph
//
// Path:
//  - /search/:term
//
// Formats:
//  - html
//  - json
//
//
// Returns:
//  All classes with :term as a substring

function searchHandler(request, term, fmt) {
    try {
        if (/^\s*\S+:\S+\s*$/.test(term)) {
            var url;
            engine.log("Redirecting " + term);
            var resultObj = engine.getVocabularyTermByID(term);
            //Taking the first result
            if (typeof resultObj.concepts[0] != 'undefined'){
                var type = resultObj.concepts[0].categories[0];
                var id = resultObj.concepts[0].curie;
                url = genURL(type,id);
            } else {
                //Fallback
                url = genURL('object',term);
            }
            return web.wrapRedirect(url);
        }

        // temporary fix: need to properly figure out when to encode/decode
        // See: https://github.com/monarch-initiative/monarch-app/issues/287
        term = term.replace(/&#039;/g, "'");
        var results = engine.searchOverOntologies(term);
        var info = {};
        info.results = results;

        if (fmt != null) {
            return formattedResults(info, fmt);
        }

        info.term=term;
        // HTML
        addCoreRenderers(info, 'search', term);

        // adorn object with rendering functions
        if (info.results.length > 0){
            info.resultsTable = function() {return genTableOfSearchResults(info.results); };
            info.description = "<span>Results for "+term+ " searching phenotypes, diseases, genes, and models</span>";
        } else {
            info.resultsTable = "<span class=\"no-results\">&nbsp;&nbsp;No results found</span>";
        }

        info.monarch_launchable = [];
        info.monarch_launchable.push('search_results_init(searchTerm);');

        info.pup_tent_css_libraries.push("/monarch-specific.css");
        info.pup_tent_css_libraries.push("/search-page.css");
        info.title = 'Search Results: '+term;

        var output = pup_tent.render('search_results.mustache',info,'monarch_base.mustache');
        console.log('xsearch:', output);
        return web.wrapHTML(output);
    }
    catch(err) {
        return errorResponse(err);
    }
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/search/:term.:fmt?', '/search/{term}.{fmt}', ['term', 'fmt'], searchHandler);
web.wrapRouteGet(app, '/search/:term', '/search/{term}', ['term'], searchHandler);


//Method: search over NIF
//
// searches over NIF
//
// Path:
//  - /neurosearch/:term
//
// Formats:
//  - html
//  - json
//
//
// Returns:
//  All classes with :term as a substring
function neurosearchHandler(request, term, fmt) {
    try {
        if (request.params.search_term != null) {
            term = request.params.search_term;
        }

        if (/^\s*\S+:\S+\s*$/.test(term)) {
            engine.log("Redirecting" + term);
            return web.wrapRedirect(genURL('object',term));
        }

        // temporary fix: need to properly figure out when to encode/decode
        // See: https://github.com/monarch-initiative/monarch-app/issues/287
        term = term.replace(/&#039;/g, "'");
        var info = {};
        var otherResults = engine.searchOverData(term);

        //make associations from categorical data
        info.otherResults = [];
        Object.keys(otherResults).forEach(function (cat) {
            var obj = {};
            otherResults[cat].forEach(function(r) {
                obj = r;
                obj.category = cat;
                info.otherResults.push(obj);
            });
        });

        if (fmt != null) {
            return formattedResults(info, fmt);
        }

        info.term=term;
        // HTML
        addCoreRenderers(info, 'search', term);

        // adorn object with rendering functions
        info.genResultsTable = function() {return genTableOfSearchDataResults(info.otherResults) };


        info.pup_tent_css_libraries.push("/monarch-specific.css");
        info.pup_tent_css_libraries.push("/search-page.css");
        info.title = 'NIF Search Results: '+term;

        var output = pup_tent.render('search_results.mustache',info,'monarch_base.mustache');
        return web.wrapHTML(output);
    }
    catch(err) {
        return formattedError(err);
    }
}


// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/neurosearch/:term.:fmt?', '/neurosearch/{term}.{fmt}', ['term', 'fmt'], neurosearchHandler);
web.wrapRouteGet(app, '/neurosearch/:term', '/neurosearch/{term}', ['term'], neurosearchHandler);


//list all of the sources supplying data to monarch.
function sourcesHandler(request, fmt) {
    try {
        //fetch data description json
        var sources = engine.fetchDataDescriptions();
        var info = {};
        // adorn object with rendering functions
        info.sourcesTable = function() {return genTableOfDataSources(sources); };
        addCoreRenderers(info, 'sources');

        if (fmt != null) {
            return formattedResults(sources, fmt,request);
        }

        info.pup_tent_css_libraries.push("/monarch-specific.css");
        info.pup_tent_css_libraries.push("/sources.css");
        info.title = 'Data Sources';

        var output = pup_tent.render('sources.mustache',info,'monarch_base.mustache');
        return web.wrapHTML(output);
    }
    catch(err) {
        return errorResponse(err);
    }
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/sources.:fmt?', '/sources.{fmt}', ['fmt'], sourcesHandler);
web.wrapRouteGet(app, '/sources', '/sources', [], sourcesHandler);


// Method: autocomplete
//
// proxy for vocbaulary services autocomplete
//
// Path:
//  - /autocomplete/:term
//  - /autocomplete/:category/:term
//
// Formats:
//  - html
//  - json
//
//
// Returns:
//  List of matching objects


function autocompleteByCategoryTermHandler(request,category,term,fmt) {
    // todo - we would like to normalize possible categories; e.g. phenotype --> Phenotype
    var info = engine.searchSubstring(term, category);
    // engine.log("got autocomplete results..."+info.length);
    // if (info.length > 0) {
    //     console.log("first is: ", info[0]);
    // }
    if (fmt != null) {
        //engine.log("format is "+fmt);
        var res= formattedResults(info,fmt,request);
        return res;
    } else {
        return {
            body: [ "Cannot handle format/extension: "+fmt],
            status: 500
        };
    }
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/autocomplete/:category/:term.:fmt?', '/autocomplete/{category}/{term}.{fmt}', ['category', 'term', 'fmt'], autocompleteByCategoryTermHandler);
web.wrapRouteGet(app, '/autocomplete/:category/:term', '/autocomplete/{category}/{term}', ['category', 'term'], autocompleteByCategoryTermHandler);


function autocompleteByTermHandler(request,term,fmt) {
    return autocompleteByCategoryTermHandler(request, null, term, fmt);
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/autocomplete/:term.:fmt?', '/autocomplete/{term}.{fmt}', ['term', 'fmt'], autocompleteByTermHandler);
web.wrapRouteGet(app, '/autocomplete/:term', '/autocomplete/{term}', ['term'], autocompleteByTermHandler);



// Method: disease
//
// disease info or page.
//
// This will combine multiple sources of data combining phenotype. gene, pathway etc
// data. The aggregation makes use of the ontology; e.g. the results for DOID_14330 (Parkinson's disease) will
// include info association with PD only any subtypes
//
// Implementation:
//  - <monarch.api.fetchDiseaseInfo>
//
// Paths:
//  - /disease/  (HTML only)
//  - /disease/:id (combined info about a disease)
//  - /disease/:id/:section
//
//
// Formats:
//  - html
//  - json
//
//  Examples:
//  - /disease/ (Top page)
//  - /disease/DOID_14330 (Parkinson's disease)
//  - /disease/DOID:14330 (same as above - CURIES or URI fragments may be used)
//  - /disease/DOID_14330/phenotype_associations.json (Phenotypes for Parkinson's disease, as JSON)
//
//
// Returns:
//  Disease with matching ID

web.wrapRouteGet(app, '/disease', '/disease', [],
  function(request) {
    var info = prepLandingPage();
    info.blog_results = loadBlogData('disease-news', 4);

    info.spotlight = engine.fetchSpotlight('disease');
    //info.spotlight.link = genObjectHref('disease',{id:info.spotlight.id, label:"Explore"});
    info.spotlight.link = genObjectHref('disease',info.spotlight);

    var heritability = info.spotlight.heritability;
    info.spotlight.heritability = info.spotlight.heritability.map(function(h) {return h.label}).join(", ");

    var phenotypes = _sortByLabel(info.spotlight.phenotypes).map(function(p) {return genObjectHref('phenotype',p);});
    info.spotlight.phenotypes = phenotypes.slice(0,5).join(", ");
    if (phenotypes.length > 5) {
        info.spotlight.phenotypes += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(phenotypes.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.phenotypes += phenotypes.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }
    var genes = ['(none)'];
    if (info.spotlight.genes != null && info.spotlight.genes.length > 0) {
        info.spotlight.genes = _sortByLabel(info.spotlight.genes);
        genes = info.spotlight.genes.map(function(p) {return genObjectHref('gene',p);});
    }
 
    info.spotlight.genes = genes.slice(0,5).join(", ");
    if (genes.length > 5) {
        info.spotlight.genes += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(genes.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.genes += genes.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }
    
    if (info.spotlight.model_count > 0){
        info.spotlight.models = "<a href=/disease/"+info.spotlight.id+"#model>"+info.spotlight.model_count+"</a>";
    } else {
        info.spotlight.models = info.spotlight.model_count;
    }
    
    if (info.spotlight.publication_count > 0){
        info.spotlight.publications = "<a href=/disease/"+info.spotlight.id+
        "#literature>"+info.spotlight.publication_count+"</a>";
    } else {
        info.spotlight.publications = info.spotlight.publication_count;
    }
    
    //graph
    addGolrStaticFiles(info);
    
    info.pup_tent_js_variables.push({name:'global_scigraph_url',
        value: engine.config.scigraph_url});
    
    var diseaseDist = JSON.parse(env.fs_readFileSync('./widgets/dove/stats/DO-cache.json'));
    info.pup_tent_js_libraries.push("/dove.min.js");
    info.pup_tent_js_libraries.push("/d3.3.5.5.min.js");
    info.pup_tent_css_libraries.push("/dovegraph.css");
    info.pup_tent_js_libraries.push("/barchart-launcher.js");
    info.pup_tent_js_libraries.push("/graph-config.js");

    info.pup_tent_js_variables.push({name:'globalDataGraph',value:diseaseDist});
    info.monarch_launchable = [];
    info.monarch_launchable.push('makeDiseaseLandingGraph(globalDataGraph)');

    info.title = 'Monarch Diseases';
    
    var output = pup_tent.render('disease_main.mustache', info,'monarch_base.mustache');
    return web.wrapHTML(output);
  });


// DISEASE PAGE
// Status: working but needs work
app.get('/legacy/disease/:id.:fmt?', function(request, id, fmt) {
    try {
        engine.log("getting /disease/:id where id="+id);
        var newId = engine.resolveClassId(id);
        if (newId != id && typeof newId != 'undefined' ) {
            engine.log("redirecting: "+id+" ==> "+newId);
            return web.wrapRedirect(genURL('disease',newId));
        }
        engine.log("Fetching id from engine, where cache="+engine.cache);
        var info = engine.fetchDiseaseInfo(id);

        if (info == null || info.id == null) {
            return notFoundResponse("Cannot find "+id);
        }

        engine.log("Got info for disease");
        if (fmt != null) {
            return formattedResults(info, fmt,request);
        }

        // HTML
        addCoreRenderers(info, 'disease', id);

        //Add pup_tent libs
        info.pup_tent_css_libraries.push("/monarch-main.css");
        info.pup_tent_css_libraries.push("/monarch-specific.css");
        info.pup_tent_css_libraries.push("/imagehover.css");

	    addPhenogridFiles(info);

        info.pup_tent_js_libraries.push("/phenogridloader-no-species.js");
        info.monarch_launchable.push('loadPhenogrid()');
        info.pup_tent_js_libraries.push("/stupidtable.min.js");
        info.pup_tent_js_libraries.push("/tables.js");

        info.title = 'Monarch Disease: '+info.label+' ('+ info.id+')';

        //HACK because we are always redirected to the underscore, we need curi-style ids for proper link generation
        //ONTOQUEST!!!
        info.primary_xref = function() {return genExternalHref('source',{id : id.replace(/_/,':')})};

        info.hasHeritability = function() {return checkExistence(info.heritability)};
        info.heritability = engine.unique(info.heritability.map(function(h) {return h.inheritance.label})).join(", "); 
    
        if (typeof info.synonyms != 'undefined'){
            info.aka = info.synonyms.join(", ");
        }
        
        info.xrefs = function() {
            if (info.database_cross_reference != null) {
                return info.database_cross_reference.map(function(r) { return genExternalHref('source',{id : r}) }).join(", ");
                //return info.database_cross_reference.join(", ");
            }
        };
        info.altids = function() {
            if (info.has_alternative_id != null) {
                return info.has_alternative_id.join(", ");
            }
        }

        // variables checking existence of data in sections
        info.hasDef = function() {return checkExistence(info.definitions)};
        info.hasComment = function() {return checkExistence(info.comment)};
        info.hasAka = function() {return checkExistence(info.synonyms)};
        info.hasXrefs = function() {return checkExistence(info.database_cross_reference)};

        info.hasPhenotypes = function() {return checkExistence(info.phenotype_associations)};
        info.hasGenes = function() {return checkExistence(info.gene_associations)};
        info.hasAlleles = function() {return checkExistence(info.alleles)};
        info.hasModels = function() {return checkExistence(info.models)};
        info.hasSim = function() {return simcount() > 0};
        info.hasPathways = function() {return checkExistence(info.pathway_associations)};
        info.hasLiterature = function() {return checkExistence(info.literature)};

        //the score is out of 1, so scale to 5 stars
        info.annotationScore = function() {
            if (info.annotation_sufficiency != null) {
                return (5 * info.annotation_sufficiency);
            } else {
                return 0;
            }
        };
        //info.phenotypeNum = function() {return getNumLabel(info.phenotype_associations)};
        info.phenotypeNum = function() {
            if (info.phenotype_associations != null) {
                return getNumLabel(engine.unique(info.phenotype_associations.map(function(p) {return p.phenotype.id})))};
            return 0;
            };
        info.geneNum = function() {
            if (info.gene_associations != null) {
                return getNumLabel(engine.unique(info.gene_associations.map(function(g) {return g.gene.id})))};
            return 0;
            };
        info.alleleNum = function() {return getNumLabel(info.alleles)};
        info.modelNum = function() {return getNumLabel(info.models)};
        info.simNum = function() {return simcount()};
        info.literatureNum = function() {return getNumLabel(info.pmidinfo)};

        var simcount = function() {
            if (info.similar_diseases != null) {
                var unnestedAssocs = [];
                for (var i = 0; i < info.similar_diseases.length; i++) {
                    var iset = info.similar_diseases[i];
                    for (var j = 0; j < iset.b.length; j++) {
                        unnestedAssocs = unnestedAssocs.concat({a:iset.a, b:iset.b[j]});
                    }
                }
                return unnestedAssocs.length;
            }
            return 0;
        };
        //need to count the num of unique pathways
        info.pathwayNum = function() {
            if (info.pathway_associations != null) {
                var pathwayIds = [];
                pathwayIds = info.pathway_associations.map(function(a) {return a.pathway.id})
                pathwayIds = engine.unique(pathwayIds);
                return pathwayIds.length;
            }
            return 0;
        };

	// filter phenotype list for formatting for phenogrid.
        // adorn object with rendering functions
        info.phenotypeTable = function() {return genTableOfDiseasePhenotypeAssociations(info.phenotype_associations);};
        info.geneTable = function() {return genTableOfDiseaseGeneAssociations(info.gene_associations);};
        info.alleleTable = function() {return genTableOfDiseaseAlleleAssociations(info.alleles);};
        //engine.log("ALLELE TABLE-pre mustache:"+JSON.stringify(info));
        info.modelTable = function() {return genTableOfDiseaseModelAssociations(info.models);};
        //TODO: figure out how to best show this... one table per species?
        //TODO: defaulting to showing mouse here - since it's the only one we have
        info.simModelTable = function () {return genTableOfSimilarModels(info.similar_models['10090']);};
        info.simTable = function() {return genTableOfSimilarDiseases(info.similar_diseases);};
        info.pathwayTable = function() {return genTableOfDiseasePathwayAssociations(info.pathway_associations);};
        info.literatureTable = function() {return genTableOfLiterature(info.literature, info.pmidinfo);};

        var output = pup_tent.render('disease-legacy.mustache',info,'monarch_base.mustache');
        return response.html(output);
    }
    catch(err) {
        return errorResponse(err);
    }

});

// This function checks if a variable exists in the JSON blob (and is used to dynamically
// render the Mustache templates.
function checkExistence(variable) {
    if (variable != null) {
        return variable.length > 0;
    }
};

// This function returns the number of variables in the JSON blob.
// The number is returned as a label suitable for display - if the number
// is higher than the cutoff then "+" is appended
function getNumLabel(variable) {
    if (variable != null) {
        if (variable.length == 1000) {
            return "1000+";
        }
        return variable.length;
    }
};

// DISEASE - Sub-pages
// Example: /disease/DOID_12798/phenotype_associations.json
// Currently only works for json or rdf output
app.get('/legacy/disease/:id/:section.:fmt?', function(request, id, section, fmt) {
    var newId = engine.resolveClassId(id);
    if (newId != id) {
        engine.log("redirecting: "+id+" ==> "+newId);
        return web.wrapRedirect(genURL('disease',newId));
    }

    var info = engine.fetchDiseaseInfo(id);

    var sectionInfo =
        { id: "obo:"+id }; // <-- TODO - unify ID/URI strategy
    sectionInfo[section] = info[section];
    engine.addJsonLdContext(sectionInfo);

    if (fmt != null) {
        return formattedResults(sectionInfo, fmt,request);
    }
    else {
        return response.error("plain HTML does not work for page sections. Please append .json or .rdf to URL");
    }
});

// Method: phenotype
//
// phenotype info or page
//
// This will combine multiple sources of data combining disease, gene, genotype, pathway etc
// data. The aggregation makes use of the ontology; e.g. the results for MP_0011475 (abnormal glycosaminoglycan level) will
// include info association directly for this term, as well as subtypes (e.g. abnormal urine glycosaminoglycan level)
//
// Implementation:
//  - <monarch.api.fetchDiseaseInfo>
//
// Paths:
//  - /phenotype/  (HTML only)
//  - /phenotype/:id (combined info about a phenotype)
//  - /phenotype/:id/:section
//
//
// Formats:
//  - html
//  - json
//
//  Examples:
//  - /phenotype/ (Top page)
//  - /phenotype/MP_0011475 (abnormal glycosaminoglycan level)
//  - /phenotype/MP:0011475 (same as above - CURIES or URI fragments may be used)
//  - /phenotype/MP_0011475/disease_associations.json (Diseases with abnormal glycosaminoglycan level as JSON)
//
//
// Returns:
//  Phenotype with matching ID

app.get('/phenotype', function(request, reply) {
    var info = prepLandingPage();
    info.blog_results = loadBlogData('phenotype-news', 4);
   
	//spotlight
    info.spotlight = engine.fetchSpotlight('phenotype');
    //info.spotlight.link = genObjectHref('phenotype',{id:info.spotlight.id, label:"Explore"});
    info.spotlight.link = genObjectHref('phenotype',info.spotlight);

    var genes = _sortByLabel(info.spotlight.genes).map(function(g) {return genObjectHref('gene',g);});
    info.spotlight.genes = genes.slice(0,5).join(", ");
    if (genes.length > 5) {
        info.spotlight.genes += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(genes.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.genes += genes.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }
    var diseases = _sortByLabel(info.spotlight.diseases).map(function(p) {return genObjectHref('disease',p);});
    if (diseases.length == 0) {
		diseases = ['(none)'];
    }
    info.spotlight.diseases = diseases.slice(0,5).join(", ");
    if (diseases.length > 5) {
        info.spotlight.diseases += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(diseases.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.diseases += diseases.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }
    
    if (info.spotlight.model_count > 0){
        info.spotlight.models = "<a href=/phenotype/"+info.spotlight.id+"#genotypes>"+info.spotlight.model_count+"</a>";
    } else {
        info.spotlight.models = info.spotlight.model_count;
    }
    
    if (info.spotlight.publication_count > 0){
        info.spotlight.publications = "<a href=/phenotype/"+info.spotlight.id+
        "#literature>"+info.spotlight.publication_count+"</a>";
    } else {
        info.spotlight.publications = info.spotlight.publication_count;
    }

    //var pathways = info.spotlight.pathways.map(function(p) {p.label});
    //info.spotlight.pathways = pathways.slice(0,5).join(", ");
    //if (pathways.length > 5) {
    //    info.spotlight.pathways += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(pathways.length-5)+" more...]</span><span class=\"moreitems\">";
    //    info.spotlight.pathways += pathways.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    //}
 
    //graph
    
    addGolrStaticFiles(info);
    
    info.pup_tent_js_variables.push({name:'global_scigraph_url',
        value: engine.config.scigraph_url});
    
    var phenoDist = JSON.parse(env.fs_readFileSync('./widgets/dove/stats/hp-ontology-4.json'));
    info.pup_tent_js_libraries.push("/d3.3.5.5.min.js");
    info.pup_tent_css_libraries.push("/dovegraph.css");
    info.pup_tent_js_libraries.push("/dove.min.js");
    info.pup_tent_js_libraries.push("/graph-config.js");
    info.pup_tent_js_libraries.push("/barchart-launcher.js");
    info.pup_tent_js_variables.push({name:'globalDataGraph',value:phenoDist});
    info.monarch_launchable = [];
    info.monarch_launchable.push('makePhenotypeLandingGraph(globalDataGraph)');
    
    info.title = 'Monarch Phenotypes';
    
    var output = pup_tent.render('phenotype_main.mustache', info,'monarch_base.mustache');
    return web.wrapResponse(request, reply, web.wrapHTML(output));
});

app.get('/legacy/phenotype/:id.:fmt?', function(request, id, fmt) {

    // TEMPORARY. Remove when this resolved: https://github.com/monarch-initiative/monarch-app/issues/246
    if (id.indexOf("ZP") == 0) {

        var info = {
            message: "Zebrafish phenotypes are currently under construction"
        };
        addCoreRenderers(info);
        info.title = info.message;
        info.pup_tent_css_libraries.push("/monarch-main.css");
        var output = pup_tent.render('underconstruction.mustache',info,'monarch_base.mustache');
        var res =  response.html(output);
        res.status = 404;
        return res;

    }

    try {
        var info = engine.fetchPhenotypeInfo(id);

        // TEMPORARY - see https://github.com/monarch-initiative/monarch-app/issues/246
        if (info.genotype_associations != null) {
            info.genotype_associations = info.genotype_associations.filter(function(a){return a.has_genotype.id != null && a.has_genotype.id.indexOf("ZFIN") == -1});
        }

        if (fmt != null) {
            return formattedResults(info, fmt,request);
        }

        addCoreRenderers(info, 'phenotype', id);

        //Add pup_tent libs
        info.pup_tent_css_libraries.push("/monarch-main.css");
        info.pup_tent_css_libraries.push("/monarch-specific.css");

        info.pup_tent_js_libraries.push("/stupidtable.min.js");
        info.pup_tent_js_libraries.push("/tables.js");

        info.title = 'Monarch Phenotype: '+info.label+' ('+ info.id+')';

        if (typeof info.synonyms != 'undefined'){
            info.aka = info.synonyms.join(", ");
        }
        
        info.xrefs = function() {
            if (info.database_cross_reference != null) {
            return info.database_cross_reference.map(function(r) { return genExternalHref('source',{id : r}) }).join(", ");
            //return info.database_cross_reference.join(", ");
            }
        };

        // variables checking existence of data in sections
        info.hasDef = function() {return checkExistence(info.definitions)};
        info.hasAka = function() {return checkExistence(info.synonyms)};
        info.hasXrefs = function() {return checkExistence(info.database_cross_reference)};
        info.hasDiseases = function() {return checkExistence(info.disease_associations)};
        info.hasGenes = function() {return checkExistence(info.gene_associations)};
        info.hasGenotypes = function() {return checkExistence(info.genotype_associations)};
        info.hasLiterature = function() {return checkExistence(info.literature)};

        info.diseaseNum = function() {return getNumLabel(info.disease_associations)};
        info.geneNum = function() {
            if (info.gene_associations != null) {
                return getNumLabel(engine.unique(info.gene_associations.map(function(g) {return g.gene.id})))};
            return 0;
            };

        info.genotypeNum = function() {return getNumLabel(info.genotype_associations)};
        info.literatureNum = function() {return getNumLabel(info.pmidinfo)};

        // adorn object with rendering functions
        info.diseaseTable = function() {return genTableOfDiseasePhenotypeAssociations(info.disease_associations)} ;
        info.geneTable = function() {return genTableOfGenePhenotypeAssociations(info.gene_associations)};
        info.genotypeTable = function() {return genTableOfGenotypePhenotypeAssociations(info.genotype_associations)};
        info.literatureTable = function() {return genTableOfLiterature(info.literature, info.pmidinfo)};

        var output = pup_tent.render('phenotype-legacy.mustache',info,'monarch_base.mustache');
        return response.html(output);
    }
    catch(err) {
        return errorResponse(err);
    }
});

// Note: currently both /genotype/ and /model/ direct here;
// need to decide if we want these URLs to behave differently, or
// to collapse/redirect
var fetchLegacyGenotypePage = function(request, id, fmt) {
    try {
        var info = engine.fetchGenotypeInfo(id);
        if (fmt != null) {
            if (fmt == 'json') {
                return response.json(info);
            }
        }

        console.log("INFO:"+JSON.stringify(info));

        addCoreRenderers(info, 'genotype', id);

        //Add pup_tent libs
        info.pup_tent_css_libraries.push("/monarch-main.css");
        info.pup_tent_css_libraries.push("/monarch-specific.css");
        info.pup_tent_css_libraries.push("/imagehover.css");
	    
        addPhenogridFiles(info);

        info.pup_tent_js_libraries.push("/genotypepage.js");
        info.pup_tent_js_libraries.push("/stupidtable.min.js");
        info.pup_tent_js_libraries.push("/tables.js");

        info.title = 'Monarch Genotype: '+info.label+' ('+ info.id+')';

        info.overview = function() {return genOverviewOfGenotype(info) };

        // variables checking existence of data in sections
        info.hasPhenotypes = function() {return checkExistence(info.phenotype_associations)};
        info.hasDiseases = function() {return checkExistence(info.disease_associations)};
        info.hasGenes = function() {return checkExistence(info.has_affected_genes)};
        info.hasVariants = function() { return checkExistence(info.has_sequence_alterations)};
        info.hasSim = function() {return checkExistence(info.sim)};
        info.hasLiterature = function() {return checkExistence(info.literature)};

        info.phenotypeNum = function() {
            if (info.phenotype_associations != null) {
                return getNumLabel(engine.unique(info.phenotype_associations.map(function(p) {
                    if (typeof p.has_phenotype != 'undefined' && typeof p.has_phenotype.type != 'undefined')
                        return p.has_phenotype.type.id})))};
            return 0;
        };


        info.diseaseNum = function() {return getNumLabel(info.disease_associations)};
        info.geneNum = function() {return getNumLabel(info.has_affected_genes)};
        info.variantNum = function() {
            return getNumLabel(vassoc)
        };
        info.simNum = function() {return getNumLabel(info.sim)};
        info.literatureNum = function() {return getNumLabel(info.pmidinfo)};

        info.primary_xref = genMGIXRef(id);
        info.taxon_xref;
        if (info.taxon){
            info.taxon_xref = function() {return genExternalHref('source',info.taxon)};
        }


        //info.xrefs = function() {return genExternalHref('source',{id : id})};

        // adorn object with rendering functions
        info.phenotypeTable = function() {return genTableOfGenotypePhenotypeAssociations(info.phenotype_associations);} ;
        info.literatureTable = function() {return genTableOfLiterature(info.literature, info.pmidinfo);};
        info.variantTable = function() {return genTableOfGenoVariantAssociations(info);};

        info.annotationScore = function() {
            if (info.annotation_sufficiency != null) {
                return (5 * info.annotation_sufficiency);
            } else {
                return 0;
            }
        };

        var output = pup_tent.render('genotype-legacy.mustache',info,'monarch_base.mustache');
        return response.html(output);
    }
    catch(err) {
        return errorResponse(err);
    }
};

var fetchModelPage = function(request, id, fmt) {
    try {
        // Rendering.
        var info = {};
        info = engine.fetchDataInfo(id);
    
        if (fmt != null) {
            return formattedResults(info, fmt,request);
        }
        
        if (typeof info.id === 'undefined'){
            info.id = id;
        }
        if (typeof info.label === 'undefined'){
            info.label = id;
        }
    
        addCoreRenderers(info, 'model', id);
    
        addGolrStaticFiles(info);
        info.pup_tent_css_libraries.push("/monarch-main.css");
        info.pup_tent_css_libraries.push("/monarch-specific.css");
    
        //Load variables for client side tables
        var disease_filter = [{ field: 'object_category', value: 'disease' }];
        addGolrTable(info, "subject_closure", id, 'disease-table', disease_filter, 'model_disease', '#diseases');
        info.diseaseNum = engine.fetchAssociationCount(id, 'subject_closure', disease_filter);
        
        var phenotype_filter = [{ field: 'object_category', value: 'phenotype' }];
        addGolrTable(info, "subject_closure", id, 'phenotypes-table', phenotype_filter, 'model_phenotype', '#phenotypes');
        info.phenotypeNum = engine.fetchAssociationCount(id, 'subject_closure', phenotype_filter);
        
        var genotype_filter = [{ field: 'object_category', value: 'genotype' }];
        addGolrTable(info, "subject_closure", id, 'genotype-table', genotype_filter, 'model_genotype', '#genotypes');
        info.geneNum = engine.fetchAssociationCount(id, 'subject_closure', genotype_filter);
        
        var gene_filter = [{ field: 'object_category', value: 'gene' }];
        addGolrTable(info, "subject_closure", id, 'gene-table', gene_filter, 'model_gene', '#genes');
        info.geneNum = engine.fetchAssociationCount(id, 'subject_closure', gene_filter);
        
        var variant_filter = [{ field: 'object_category', value: 'variant' }];
        addGolrTable(info, "subject_closure", id, 'variant-table', variant_filter, 'model_variant','#variants');
        info.variantNum = engine.fetchAssociationCount(id, 'subject_closure', variant_filter);
        
        var pathway_filter = [{ field: 'object_category', value: 'pathway' }];
        addGolrTable(info, "subject_closure", id, 'pathway-table', pathway_filter, 'model_pathway', "#pathways");
        info.pathwayNum = engine.fetchAssociationCount(id, 'subject_closure', pathway_filter);
        
        // Phenogrid
        addPhenogridFiles(info);
        
        // Add templates
        info.includes.phenotype_anchor = addPhenotypeAnchor(info);
        info.includes.phenotype_table = addPhenotypeTable(info);
    
        // Add gene table
        info.includes.gene_anchor = addGeneAnchor(info);
        info.includes.gene_table = addGeneTable();
        
        // Add genotype table
        info.includes.genotype_anchor = addGenotypeAnchor(info);
        info.includes.genotype_table = addGenotypeTable();
    
        // Add variant table
        info.includes.variant_anchor = addVariantAnchor(info);
        info.includes.variant_table = addVariantTable();
    
        // Add disease table
        info.includes.disease_anchor = addDiseaseAnchor(info);
        info.includes.disease_table = addDiseaseTable();
    
        // Add pathway table
        info.includes.pathway_anchor = addPathwayAnchor(info);
        info.includes.pathway_table = addPathwayTable();

        info.title = 'Monarch Model: '+info.label+' ('+ info.id+')';

        info.primary_xref = function() {return genExternalHref('source',{id : id})};
        
        if (info.taxon){
            info.taxon_xref = function() {return genExternalHref('source',info.taxon)};
        }

        if (typeof info.synonyms != 'undefined'){
            info.aka = info.synonyms.join(", ");
        }
        
        if (info.equivalentClasses){
            info.equal_ids  = function() { 
                return info.equivalentClasses.map(function(r) { return genObjectHref('model', {id:r,label:r} ) }).join(", ");
            }
        }
        
        info.xrefs = function() {
            if (info.database_cross_reference != null) {
                return info.database_cross_reference.map(function(r) { return genExternalHref('source',{id : r}) }).join(", ");
            //return info.database_cross_reference.join(", ");
            }
        };
        info.altids = function() {
            if (info.has_alternative_id != null) {
                return info.has_alternative_id.join(", ");
            }
        }

        // variables checking existence of data in sections
        info.hasDef = function() {return checkExistence(info.definitions)};
        info.hasComment = function() {return checkExistence(info.comment)};
        info.hasAka = function() {return checkExistence(info.synonyms)};
        info.hasXrefs = function() {return checkExistence(info.database_cross_reference)};
        info.hasEqual = function() {return checkExistence(info.equivalentClasses)};
        info.hasPhenotypes = info.phenotypeNum;
        info.includes.phenogrid_anchor = pup_tent.render('phenogrid-anchor.mustache', info);

        if (info.hasPhenotypes){
            info.pup_tent_js_libraries.push("/phenogridloader-no-species.js");
            info.monarch_launchable.push('loadPhenogrid()');
        }
        
        //Launch function for annotation score
        info.pup_tent_js_variables.push({name:'globalID',value:id});
        info.monarch_launchable.push('getAnnotationScore(globalID)');
    
        var output = pup_tent.render('model.mustache', info,
                                     'monarch_base.mustache');
        return web.wrapHTML(output);     
    }
    catch(err) {
        return errorResponse(err);
    }
};

var fetchGenotypePage = function(request, id, fmt) {
    try {
        // Rendering.
        var info = {};
        info = engine.fetchDataInfo(id);
    
        if (fmt != null) {
            return formattedResults(info, fmt,request);
        }
        
        if (typeof info.id === 'undefined'){
            info.id = id;
        }
        if (typeof info.label === 'undefined'){
            info.label = id;
        }
    
        addCoreRenderers(info, 'genotype', id);
    
        addGolrStaticFiles(info);
        info.pup_tent_css_libraries.push("/monarch-main.css");
        info.pup_tent_css_libraries.push("/monarch-specific.css");
    
        //Load variables for client side tables
        var disease_filter = [{ field: 'object_category', value: 'disease' }];
        addGolrTable(info, "subject_closure", id, 'disease-table', disease_filter, 'genotype_disease', '#diseases');
        info.diseaseNum = engine.fetchAssociationCount(id, 'subject_closure', disease_filter);
        
        var phenotype_filter = [{ field: 'object_category', value: 'phenotype' }];
        addGolrTable(info, "subject_closure", id, 'phenotypes-table', phenotype_filter, 'genotype_phenotype', '#phenotypes');
        info.phenotypeNum = engine.fetchAssociationCount(id, 'subject_closure', phenotype_filter);
        
        var gene_filter = [{ field: 'object_category', value: 'gene' }];
        addGolrTable(info, "subject_closure", id, 'gene-table', gene_filter, 'genotype_gene', '#genes');
        info.geneNum = engine.fetchAssociationCount(id, 'subject_closure', gene_filter);
        
        var model_filter = [{ field: 'subject_category', value: 'model' }];
        addGolrTable(info, "object_closure", id, 'model-table', model_filter, 'model_genotype', '#models');
        info.geneNum = engine.fetchAssociationCount(id, 'object_closure', model_filter);
        
        var variant_filter = [{ field: 'object_category', value: 'variant' }];
        addGolrTable(info, "subject_closure", id, 'variant-table', variant_filter, 'genotype_variant','#variants');
        info.variantNum = engine.fetchAssociationCount(id, 'subject_closure', variant_filter);
        
        var pathway_filter = [{ field: 'object_category', value: 'pathway' }];
        addGolrTable(info, "subject_closure", id, 'pathway-table', pathway_filter, 'genotype_pathway', "#pathways");
        info.pathwayNum = engine.fetchAssociationCount(id, 'subject_closure', pathway_filter);
        
        // Phenogrid
        addPhenogridFiles(info);
        
        // Add templates
        info.includes.phenotype_anchor = addPhenotypeAnchor(info);
        info.includes.phenotype_table = addPhenotypeTable(info);
    
        // Add gene table
        info.includes.gene_anchor = addGeneAnchor(info);
        info.includes.gene_table = addGeneTable();
    
        // Add variant table
        info.includes.variant_anchor = addVariantAnchor(info);
        info.includes.variant_table = addVariantTable();
        
        info.includes.model_anchor = addModelAnchor(info);
        info.includes.model_table = addModelTable();
    
        // Add disease table
        info.includes.disease_anchor = addDiseaseAnchor(info);
        info.includes.disease_table = addDiseaseTable();
    
        // Add pathway table
        info.includes.pathway_anchor = addPathwayAnchor(info);
        info.includes.pathway_table = addPathwayTable();

        info.title = 'Monarch Genotype: '+info.label+' ('+ info.id+')';

        info.primary_xref = function() {return genExternalHref('source',{id : id})};
        
        if (info.taxon){
            info.taxon_xref = function() {return genExternalHref('source',info.taxon)};
        }

        if (typeof info.synonyms != 'undefined'){
            info.aka = info.synonyms.join(", ");
        }
        
        if (info.equivalentClasses){
            info.equal_ids  = function() { 
                return info.equivalentClasses.map(function(r) { return genObjectHref('genotype', {id:r,label:r} ) }).join(", ");
            }
        }
        
        info.xrefs = function() {
            if (info.database_cross_reference != null) {
                return info.database_cross_reference.map(function(r) { return genExternalHref('source',{id : r}) }).join(", ");
            //return info.database_cross_reference.join(", ");
            }
        };
        info.altids = function() {
            if (info.has_alternative_id != null) {
                return info.has_alternative_id.join(", ");
            }
        }

        // variables checking existence of data in sections
        info.hasDef = function() {return checkExistence(info.definitions)};
        info.hasComment = function() {return checkExistence(info.comment)};
        info.hasAka = function() {return checkExistence(info.synonyms)};
        info.hasXrefs = function() {return checkExistence(info.database_cross_reference)};
        info.hasEqual = function() {return checkExistence(info.equivalentClasses)};
        info.hasPhenotypes = info.phenotypeNum;
        info.includes.phenogrid_anchor = pup_tent.render('phenogrid-anchor.mustache', info);
        
        if (info.hasPhenotypes){
            info.pup_tent_js_libraries.push("/phenogridloader-no-species.js");
            info.monarch_launchable.push('loadPhenogrid()');
        }
        
        //Launch function for annotation score
        info.pup_tent_js_variables.push({name:'globalID',value:id});
        info.monarch_launchable.push('getAnnotationScore(globalID)');
    
        var output = pup_tent.render('genotype.mustache', info,
                                     'monarch_base.mustache');
        return response.html(output);     
    }
    catch(err) {
        return errorResponse(err);
    }
};

var genMGIXRef = function genMGIXRef(id){
    return "<a href=\"http://www.informatics.jax.org/allele/genoview/" +
            id + "\" target=\"_blank\">" + id + "</a>";
};

app.get('/genotype/:id.:fmt?', fetchGenotypePage);
app.get('/legacy/genotype/:id.:fmt?', fetchLegacyGenotypePage);


// GENOTYPE - Sub-pages
// Example: /genotype/MGI_4420313/genotype_associations.json
// Currently only works for json or rdf output
var fetchGenotypeSection =  function(request, id, section, fmt) {
    var newId = engine.resolveClassId(id);
    if (newId != id) {
        engine.log("redirecting: "+id+" ==> "+newId);
        return web.wrapRedirect(genURL('genotype',newId));
    }

    var info = engine.fetchGenotypeInfo(id);

    var sectionInfo =
        { id: "obo:"+id }; // <-- TODO - unify ID/URI strategy
    sectionInfo[section] = info[section];
    engine.addJsonLdContext(sectionInfo);

    if (fmt != null) {
        return formattedResults(sectionInfo, fmt,request);
    }
    else {
        return response.error("plain HTML does not work for page sections. Please append .json or .rdf to URL");
    }
};

app.get('/legacy/genotype/:id./:section.:fmt?',fetchGenotypeSection);

app.get('/gene', function(request, reply) {
    var info = prepLandingPage();
    info.blog_results = loadBlogData('gene-news', 4);
    info.spotlight = engine.fetchSpotlight('gene');
    //info.spotlight.link = genObjectHref('gene',{id:info.spotlight.id, label:"Explore"});
    info.spotlight.link = genObjectHref('gene',info.spotlight);

    var phenotypes = _sortByLabel(info.spotlight.phenotypes).map(function(p) {return genObjectHref('phenotype',p);});
    info.spotlight.phenotypes = phenotypes.slice(0,5).join(", ");
    if (phenotypes.length > 5) {
        info.spotlight.phenotypes += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(phenotypes.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.phenotypes += phenotypes.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }
    var diseases = _sortByLabel(info.spotlight.diseases).map(function(p) {return genObjectHref('disease',p);});
    if (diseases.length == 0) {
    diseases = ['(none)'];
    }
    info.spotlight.diseases = diseases.slice(0,5).join(", ");
    if (diseases.length > 5) {
        info.spotlight.diseases += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(diseases.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.diseases += diseases.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }

    var pathways = info.spotlight.pathways.map(function(p) {p.label});
    info.spotlight.pathways = pathways.slice(0,5).join(", ");
    if (pathways.length > 5) {
        info.spotlight.pathways += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(pathways.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.pathways += pathways.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }
    if (info.spotlight.publication_count > 0){
        info.spotlight.publications = "<a href=/gene/"+info.spotlight.id+
        "#literature>"+info.spotlight.publication_count+"</a>";
    } else {
        info.spotlight.publications = info.spotlight.publication_count;
    }
    
    addGolrStaticFiles(info);
    
    info.pup_tent_js_variables.push({name:'global_scigraph_url',
        value: engine.config.scigraph_url});
    
    var phenoDist = JSON.parse(env.fs_readFileSync('./widgets/dove/stats/hp-ontology-4.json'));
    var diseaseDist = JSON.parse(env.fs_readFileSync('./widgets/dove/stats/DO-cache.json'));
    info.pup_tent_js_libraries.push("/dove.min.js");
    info.pup_tent_js_libraries.push("/d3.3.5.5.min.js");
    info.pup_tent_css_libraries.push("/dovegraph.css");
    info.pup_tent_js_libraries.push("/graph-config.js");
    info.pup_tent_js_libraries.push("/barchart-launcher.js");
    info.pup_tent_js_variables.push({name:'globalDataGraph',value:phenoDist});
    info.pup_tent_js_variables.push({name:'globalDiseaseDist',value:diseaseDist});
    info.monarch_launchable = [];
    info.monarch_launchable.push('makePhenotypeLandingGraph(globalDataGraph)');
    info.monarch_launchable.push('makeGeneDiseaseLandingGraph(globalDiseaseDist)');

    
    info.title = 'Monarch Genes';

    var output = pup_tent.render('gene_main.mustache', info,'monarch_base.mustache');
    return web.wrapResponse(request, reply, web.wrapHTML(output));
});

// Status: STUB
app.get('/legacy/gene/:id.:fmt?', function(request, id, fmt) {

    //Redirect to NCBI Gene ID
    var mappedID = getGeneMapping(id);
    if (typeof mappedID != 'undefined' && mappedID != id){
        engine.log("found updated ID, redirecting to: "+mappedID);
        return web.wrapRedirect(genURL('gene',mappedID,fmt));
    }

    var info;
    try {
        info = engine.fetchGeneInfo(id);
    }
    catch(err) {
        return errorResponse(err);
    }
    console.log("got gene info..phenotype list is "+JSON.stringify(info.phenotype_list));

    if (fmt != null) {
        return formattedResults(info,fmt,request);
    }

    // HTML
    addCoreRenderers(info, 'gene', id);

    //Add pup_tent libs
    info.pup_tent_css_libraries.push("/monarch-main.css");
    info.pup_tent_css_libraries.push("/monarch-specific.css");
    info.pup_tent_css_libraries.push("/imagehover.css");

    info.pup_tent_js_libraries.push("/stupidtable.min.js");
    info.pup_tent_js_libraries.push("/tables.js");
    
    addPhenogridFiles(info);

    info.pup_tent_js_libraries.push("/phenogridloader-no-species.js");
    info.monarch_launchable.push('loadPhenogrid()');

    info.title = 'Monarch Gene: '+info.label+' ('+ info.id+')';

    // variables checking existence of data in sections
    info.hasPhenotypes   = function() {return checkExistence(info.phenotype_associations)};
    info.hasPathways     = function() {return checkExistence(info.pathway_associations)};
    info.hasDiseases     = function() {return checkExistence(info.disease_associations)};
    info.hasGenotypes    = function() {return checkExistence(info.genotype_associations)};
    info.hasLocation     = function() {return checkExistence(info.location)};
    info.hasAlleles      = function() {return checkExistence(info.alleles)};
    info.hasOrthologs    = function() {return checkExistence(info.orthologs)};
    info.hasInteractions = function() {return checkExistence(info.interactions)};
    info.hasSummary      = function() {return checkExistence(info.summary)};
    info.hasLiterature   = function() {return checkExistence(info.literature)};
    info.hasSynonym   = function() {return checkExistence(info.synonyms)};

    //info.phenotypeNum = function() {return getNumLabel(info.phenotype_associations)};
    info.phenotypeNum = function() {
        if (info.phenotype_associations != null) {
            return getNumLabel(engine.unique(info.phenotype_associations.map(function(p) {return p.phenotype.id})))};
        return 0;
    };

    info.genotypeNum    = function() {return getNumLabel(info.genotype_associations)};
    info.pathwayNum     = function() {return getNumLabel(info.pathway_associations)};
    info.diseaseNum     = function() {return getNumLabel(info.disease_associations)};
    info.alleleNum      = function() {return getNumLabel(info.alleles)};
    info.orthologNum    = function() {return getNumLabel(info.orthologs)};
    info.interactionNum = function() {return getNumLabel(info.interactions)};
    info.literatureNum  = function() {return getNumLabel(info.pmidinfo)};

    // adorn object with rendering functions
    info.phenotypeTable   = function() {return genTableOfGenePhenotypeAssociations(info.phenotype_associations);};
    info.pathwayTable     = function() {return genTableOfGenePathwayAssociations(info.pathway_associations);};
    info.diseaseTable     = function() {return genTableOfGeneDiseaseAssociations(info.disease_associations);};
    info.genotypeTable    = function() {return genTableOfGeneGenotypeAssociations(info.genotype_associations);};
    info.alleleTable      = function() {return genTableOfGeneAlleleAssociations(info.alleles);};
    info.orthologTable    = function() {return genTableOfGeneOrthologAssociations(info.orthologs);};
    info.interactionTable = function() {return genTableOfGeneInteractionAssociations(info.interactions);};
    info.literatureTable  = function() {return genTableOfLiterature(info.literature, info.pmidinfo);};

    info.primary_xref = function() {return genExternalHref('source',{id : info.id})};
    info.xrefTable    = function() {return genTableOfGeneXRefs(info.xrefs);};

    info.annotationScore = function() {
        if (info.annotation_sufficiency != null) {
            return (5 * info.annotation_sufficiency);
        } else {
            return 0;
        }
    };

    //Link out to NCBI
    info.taxon_xref;

    if (info.taxon){
        info.taxon_xref = function() {return genExternalHref('source',info.taxon)};
    }

    var output = pup_tent.render('gene-legacy.mustache',info,'monarch_base.mustache');
    return response.html(output);
});

var fetchModelLandingPage = function (request, reply){
    
    var info = prepLandingPage();
    info.blog_results = loadBlogData('model-news', 4);

    //spotlight
    info.spotlight = engine.fetchSpotlight('model');
    //info.spotlight.link = genObjectHref('model',{id:info.spotlight.id, label:"Explore"});
    info.spotlight.link = genObjectHref('model',info.spotlight);

    var phenotypes = _sortByLabel(info.spotlight.phenotypes).map(function(p) {return genObjectHref('phenotype',p);});
    info.spotlight.phenotypes = phenotypes.slice(0,5).join(", ");
    if (phenotypes.length > 5) {
        info.spotlight.phenotypes += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(phenotypes.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.phenotypes += phenotypes.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }
    var diseases = _sortByLabel(info.spotlight.diseases).map(function(p) {return genObjectHref('disease',p);});
    if (diseases.length == 0) {
    diseases = ['(none)'];
    }
    info.spotlight.diseases = diseases.slice(0,5).join(", ");
    if (diseases.length > 5) {
        info.spotlight.diseases += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(diseases.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.diseases += diseases.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }
    var genes = _sortByLabel(info.spotlight.genes).map(function(g) {return genObjectHref('gene',g);});
    info.spotlight.genes = genes.slice(0,5).join(", ");
    if (genes.length > 5) {
        info.spotlight.genes += ", <span class=\"toggleitems\"><span class=\"fewitems\"> [and "+(genes.length-5)+" more...]</span><span class=\"moreitems\">";
        info.spotlight.genes += genes.slice(5).join(", ") + "</span><span class=\"hideitems\"> [hide]</span></span>";
    }
    
    if (info.spotlight.publication_count > 0){
        info.spotlight.publications = "<a href=/model/"+info.spotlight.id+
        "#literature>"+info.spotlight.publication_count+"</a>";
    } else {
        info.spotlight.publications = info.spotlight.publication_count;
    }
    
    addGolrStaticFiles(info);
    
    info.pup_tent_js_variables.push({name:'global_scigraph_url',
        value: engine.config.scigraph_url});
    
    
    //graph
    var hpStub = JSON.parse(env.fs_readFileSync('./widgets/dove/stats/hp-ontology-4.json'));
    info.pup_tent_js_libraries.push("/d3.3.5.5.min.js");
    info.pup_tent_css_libraries.push("/dovegraph.css");
    info.pup_tent_js_libraries.push("/barchart-launcher.js");
    info.pup_tent_js_libraries.push("/dove.min.js");
    info.pup_tent_js_libraries.push("/graph-config.js");

    info.pup_tent_js_variables.push({name:'globalDataGraph',value:hpStub});
    info.monarch_launchable = [];
    info.monarch_launchable.push('makeGenotypeLandingGraph(globalDataGraph)');
    
    info.title = 'Monarch Models';
    
    var output = pup_tent.render('model_main.mustache', info,'monarch_base.mustache');
    return web.wrapResponse(request, reply, web.wrapHTML(output));
}

app.get('/model', fetchModelLandingPage);
app.get('/genotype', fetchModelLandingPage);

function getGeneMapping(id) {
    var mappedID;
    var mappings = engine.mapGeneToNCBIgene(id);
    var ncbigene_ids = Object.keys(mappings);
    if (ncbigene_ids.length > 0) {
        mappedID = mappings[ncbigene_ids[0]]['id'];
    }
    return mappedID;
}

// GENE - Sub-pages
// Example: /gene/NCIBGene:12166/phenotype_associations.json
// Currently only works for json or rdf output
app.get('/legacy/gene/:id/:section.:fmt?', function(request, id, section, fmt) {
    //Below breaks phenogrid loading due to endless redirect loops
    
    var mappedID = getGeneMapping(id);
    if (typeof mappedID != 'undefined' && mappedID != id){
        engine.log("found updated ID, redirecting to: "+mappedID);
        return web.wrapRedirect(genURL('gene',mappedID,fmt));
    }
    var info = engine.fetchGeneInfo(id);

    var sectionInfo =
        { id: "obo:"+id }; // <-- TODO - unify ID/URI strategy
    sectionInfo[section] = info[section];
    engine.addJsonLdContext(sectionInfo);

    if (fmt != null) {
        return formattedResults(sectionInfo, fmt,request);
    }
    else {
        return response.error("plain HTML does not work for page sections. Please append .json or .rdf to URL");
    }
});


//For receiving of HPO relations for Phenogrid
//Example: /neighborhood/HP_0003273/2/out/subClassOf.json

function neighborhoodHandler(request, id, depth, direction, relationship, fmt) {
  var info = engine.getGraphNeighbors(id, depth, relationship, direction);

  if (fmt != null) {
      return formattedResults(info, fmt, request);
  }
  else {
      return formattedError("plain HTML does not work for page sections. Please append .json or .rdf to URL");
  }
}

if (env.isRingoJS()) {
  app.get('/neighborhood/:id/:depth/:direction/:relationship.:fmt?', function(request, id, depth, direction, relationship, fmt) {
    var output = neighborhoodHandler(request, id, depth, direction, relationship, fmt);
    return output;
  });
}
else {
  app.route({
    method: 'GET',
    path: '/neighborhood/{id}/{depth}/{direction}/{relationship}.{fmt?}',
    handler:
        function (request, reply) {
          WaitFor.launchFiber(function () {
            var id = request.params.id;
            var depth = request.params.depth;
            var direction = request.params.direction;
            var relationship = request.params.relationship;
            var fmt = request.params.fmt;

            var output = neighborhoodHandler(request, id, depth, direction, relationship, fmt);
            reply(output);
          });
        }
  });
}

// Status: STUB
// this just calls the genotype page - TODO
app.get('/legacy/model/:id.:fmt?', fetchLegacyGenotypePage);
app.get('/legacy/model/:id/:section.:fmt?', fetchGenotypeSection);

web.wrapRouteGet(app, '/model/:id.:fmt?', '/model/{id}', ['id', 'fmt'], fetchModelPage);


// Status: STUB
// note we hardcode this for now
app.get('/phenome/Homo_sapiens.gff3', function(request, id, fmt) {

    var url = 'http://beta.neuinfo.org/services/v1/federation/data/nlx_152525-9.tsv?q=*&offset=0';

    var gffStr = httpclient.get(url, {}).content;
    return {
        body: [gffStr],
        headers: {'Content-Type': 'text/plain'},
        status: 200
    };
});


// Method: compare
//
// phenotypic comparison between two entities
//
// Given a query id (such as a gene, genotype, disease), and one or more target identifiers, this will map
// each to it's respective phenotypes, and perform an OwlSim comparison of the query to each target.
// You are permitted to mix query and target types.  For example, your query can be a disease, and the target
// be a list of gene(s), disease(s), phenotype(s), and/or genotype(s).
// You can indicate to union the phenotypes of either the query or the target with a plus "+".  Only one
// entity may be supplied for the query, whereas multiple target entities are allowed (delimited by a comma).
//
// For details on owlsim, see http://owlsim.org
//
// Paths:
//  - /compare/  (HTML only)
//  - /compare/:id1/:id2  (JSON only)
//  - /compare/:id1/:id2,id3,...idN (JSON only)
//  - /compare/:id1+:id2/:id3,:id4,...idN (JSON only)
//  - /compare/:id1/:id2+:id3,:id4,:id5+:id6,...,:idN (JSON only)
//
// Formats:
//  - json
//
//  Examples:
//  - /compare/OMIM:143100/MGI:3664660.json
//  - /compare/OMIM:270400/NCBIGene:18595+OMIM:249000,OMIM:194050.json
//  - /compare/HP:0000707+HP:0000372/NCBIGene:18595,HP:0000707,NCBIGene:18595+HP:0000707
//
// Returns:
//  A pairwise-comparison of phenotypes belonging to the query to the target(s), together with the LCS, and their scores.
//  The data follows the same format as is used for search.  The query (including it's identifier, label, type, and
//  phenotype ids will be listed in the "a" object; the target(s) in the "b" array object.  If only one b is supplied,
//  only one element will be found in "b".
//  The resulting "combinedScore" is generated based on a perfect match of the query to itself.  Therefore, the reciprocal
//  combined score may not be the same.  QxT !== TxQ.
app.get('/compare/:x/:y.:fmt?', function(request, x, y, fmt) {
	
	var xs = x.split("+");
	//first, split by comma.  then split by plus
    var ys = y.split(",");
	ys = ys.map(function(i){return i.split("+") });

	//pass the arrays
    var info = engine.compareEntities(xs,ys);

    return response.json(info);
});


// Redirects
app.get('/reference/:id.:fmt?', function(request, id, fmt) {
    //var info = engine.fetchReferenceInfo(id);  TODO
    //return web.wrapRedirect(engine.expandIdToURL(id));
    var url = makeExternalURL(id);
    return web.wrapRedirect(url);
});

// STUB
app.get('/publication/basic/:id.:fmt?', function(request, id, fmt) {
    var info = engine.fetchReferenceInfo(id);  //TODO
});

//Get orthologs/paralogs
app.get('/query/orthologs/:id.:fmt?', function(request, id, fmt) {
    var res;
    var idList = id.split("+");
    if (idList == '.json'){
        res = response.error("No gene IDs entered")
    } else {
        var info = engine.fetchOrthologList(idList);
        res = response.json(info);
    }
    
    return res;
});

app.get('/legacy/variant/:id.:fmt?', function(request, id, fmt) {
    //since we don't have allele or variant pages,
    //we will redirect to the sources for now
    //var newId = engine.resolveClassId(id);
    var url;
    if (id.match(/^OMIM/)){
        url = makeExternalURL(id+"."+fmt);
    } else {
        url = makeExternalURL(id);
    }
    engine.log("redirecting: "+id+" to source at "+url);
    return web.wrapRedirect(url);
});

app.get('/class', function(request, reply) {
    return web.wrapResponse(request, reply, web.wrapHTML(staticTemplate('class_main')));
});

// generic ontology view - most often this will be overridden, e.g. a disease class
// Status: STUB
app.get('/class/:id.:fmt?', function(request, id, fmt) {
    var opts =
        {
            level : request.params.level
        };

       var info = engine.fetchClassInfo(id, opts);  // Monarch API is currently a simpler wrapper to OntoQuest
    if (fmt != null) {
        if (fmt == 'json') {
            return formattedResults(info,fmt,request);
        }
        else {
            return response.error("Cannot return results in this format: "+fmt);
        }
    }

    // adorn object with rendering functions
    //info.diseaseTable = function() {return genTableOfDiseaseGeneAssociations(info.disease_associations)} ;
    //info.phenotypeTable = function() {return genTableOGenePhenotypeAssociations(info.phenotype_associations)} ;
    //info.alleleTable = function() {return genTableOfDiseaseAlleleAssociations(info.alleles)} ;

    return response.html(pup_tent.render('class.mustache', info));
});

app.get('/anatomy', function(request, reply) {
    return web.wrapResponse(request, reply, web.wrapHTML(staticTemplate('anatomy_main')));
});

app.get('/anatomy/:id.:fmt?', function(request, id, fmt) {
    var info = engine.fetchAnatomyInfo(id);  // OQ
    if (fmt != null) {
    return formattedResults(info,fmt,request);
    }

    addCoreRenderers(info, 'anatomy', id);

    //Add pup_tent libs
    info.pup_tent_css_libraries.push("/monarch-main.css");
    info.pup_tent_css_libraries.push("/monarch-specific.css");

    info.pup_tent_js_libraries.push("/stupidtable.min.js");
    info.pup_tent_js_libraries.push("/tables.js");

    info.title = 'Monarch Anatomy: '+info.label;

    if (false) {
        // this is too slow
        info.hasDiseases = function() {return checkExistence(info.disease_associations)};
        info.hasGenotypes = function() {return checkExistence(info.genotype_associations)};

        info.diseaseNum = function() {return getNumLabel(info.disease_associations)};
        info.genotypeNum = function() {return getNumLabel(info.genotype_associations)};

        info.diseaseTable = function() {return genTableOfDiseasePhenotypeAssociations(info.disease_associations);} ;
        info.genotypeTable = function() {return genTableOfGenotypePhenotypeAssociations(info.genotype_associations);};
    }

    info.phenotypeHrefs = info.phenotypes.map(function(p) { return genObjectHref('phenotype',p) });

    // adorn object with rendering functions
    info.expressionTable = function() {return genTableOfGeneExpressionAssocations(info.gene_associations);} ;
    //info.diseaseTable = function() {return genTableOfDiseaseGeneAssociations(info.disease_associations)} ;
    //info.phenotypeTable = function() {return genTableOGenePhenotypeAssociations(info.phenotype_associations)} ;
    //info.alleleTable = function() {return genTableOfDiseaseAlleleAssociations(info.alleles)} ;

    var output = pup_tent.render('anatomy.mustache',info,'monarch_base.mustache');
    return response.html(output);
});

/* Literature Pages */
app.get('/literature', function(request, reply) {
    return web.wrapResponse(request, reply, web.wrapHTML(staticTemplate('literature_main')));
});

app.get('/literature/:id.:fmt?', function(request, id, fmt) {
    var info;
    var regex = /^PMID:(\d+)$/;
    var regres = regex.exec(id);
    if (regres != null) {
        info = engine.fetchLiteratureInfo(regres[1]);
    }
    if (fmt != null) {
        return formattedResults(info,fmt,request);
    }

    addCoreRenderers(info, 'literature', id);

    //Add pup_tent libs
    info.pup_tent_css_libraries.push("/monarch-main.css");
    info.pup_tent_css_libraries.push("/monarch-specific.css");

    info.pup_tent_js_libraries.push("/stupidtable.min.js");
    info.pup_tent_js_libraries.push("/tables.js");

    info.title = 'Monarch Literature: '+info.label+' ('+ info.id+')';

    info.authorList = function() {
        var auths = info.authors.slice(0, 5).join(", ");
        if (info.authors.length > 5) {
            auths += ", <span class=\"littabmoreauthors\"><span class=\"etal\">et al</span><span class=\"moreauthors\">"
            auths += info.authors.slice(5).join(", ") + ", " + "</span><span class=\"hideauthors\">hide</span></span>";
        }
        return auths;
    };
    info.meshTerms = function() {
        return info.meshHeadings.join(", ");
    };

    info.hasSimilar = function() { return checkExistence(info.similarPapers) };
    info.hasGenes = function() { return checkExistence(info.genes) };
    info.similarNum = function() { return getNumLabel(info.similarPapers) };
    info.genesNum = function() { return getNumLabel(info.genes) };
    info.similarPapersTable = function() { return genTableOfSimilarPapers(info.similarPapers) };
    info.genesTable = function() { return genTableOfLiteratureGenes(info.genes) };

    var output = pup_tent.render('literature.mustache',info,'monarch_base.mustache');
    return response.html(output);
});

function getIdentifierList(params) {
    var input_items;
    if (params.a != null) {
        input_items = params.a;
        engine.log("Request: "+input_items);
        engine.log("Request Type: "+ typeof input_items);
    }
    else {
        input_items = params.input_items.split(/[\s,]+/);
    }
    engine.log("|Input| = "+input_items.length);
    engine.log("Input: "+input_items);
    return input_items;
}

function itemsToArray(input_items) {
    input_items = input_items.split(/[\s,]+/);
    engine.log("|Input| = "+input_items.length);
    engine.log("Input: "+input_items);
    return input_items;
}


function mapStyleToCategories(style) {
    engine.log("Mapping "+style+" to categories");
    //TODO: use external "style" files to map the style parameter to categories
    //for now, default to HPO categories
    var categories = [];
    categories = ["HP:0000924", "HP:0000707", "HP:0000152", "HP:0001574", "HP:0000478", "HP:0001626", "HP:0001939", "HP:0000119", "HP:0001438", "HP:0003011", "HP:0002664", "HP:0001871", "HP:0002715", "HP:0000818", "HP:0002086", "HP:0000598", "HP:0003549", "HP:0001197", "HP:0001507", "HP:0000769"];
    return categories;
}

var scoreFunction = function (request){
    engine.log("Ready to score");
    engine.log("Params:"+JSON.stringify(request.params));
    var target = null;
    var categories = request.params.categories || [];
    //default to phenotips categories.
    //TODO: make monarch categories
    var style = request.params.style || 'phenotips';
    categories = mapStyleToCategories(style);
    var annotation_profile = request.params.annotation_profile;
    annotation_profile = JSON.parse(annotation_profile);
    var myresults = engine.getInformationProfile(annotation_profile,categories);
    return response.json(myresults);
};

app.get('/score', scoreFunction);
app.post('/score', scoreFunction);


// Method: simsearch
//
// Performs OwlSim search over entities using a search profile of ontology classes
//
// For details on owlsim, see http://owlsim.org
//
// Implementation:
//  - <monarch.api.searchByDisease>
//  - <monarch.api.searchByPhenotype>
//
// Paths:
//  - /simsearch//disease/:id (search using the phenotypes of a disease as search profile)
//  - /simsearch/phenotype/
//
// Arguments:
//  - target_species : integer fragment of NCBI Taxon ID
//  - target_type : disease or gene
//  - limit : max results to return
//
// Formats:
//  - html
//  - json
//
//  Examples:
//  - /simsearch/phenotype/?input_items=MP:0000788,MP:0000802&target_species=10090 (mouse)
//  - /simsearch/phenotype/?input_items=MP:0000788,MP:0000802&target_species=9606 (human)
//
//
// Returns:
//  List of matching entities

function simsearchDiseaseById(request, id, fmt) {
    engine.log("Params:"+JSON.stringify(request.params));
    var target = null;
    var info = {datatype: 'disease', results:[]};
    var target_species = request.params.species || '9606';
    var target_type = request.params.type || 'disease';
    var limit = request.params.cutoff || request.params.limit || 10;

    info.results = engine.searchByDisease(id,target_species,limit);
    return info.results;
}


if (env.isRingoJS()) {
    app.get('/simsearch/disease/:id.:fmt?', function (request, id, fmt) {
            var output = simsearchDiseaseById(request, id, fmt);
            return web.wrapResponse(request, null, web.wrapJSON(output));
        }
    );
}
else {
    app.route({
        method: 'GET',
        path: '/simsearch/disease/{id}.{fmt?}',
        handler:
            function (request, reply) {
              WaitFor.launchFiber(function () {
                var id = request.params.id;
                var fmt = request.params.fmt;
                var output = simsearchDiseaseById(request, id, fmt);
                return web.wrapResponse(request, reply, web.wrapJSON(output));
              });
            }
    });
}



var simsearchPhenotype = function(request, fmt, target_species, target_type, limit, input_items) {
    var target = null;
    var info = {results:[]};
    //input_items = engine.mapIdentifiersToPhenotypes( input_items );
    info.results = engine.searchByPhenotypeProfile(input_items,target_species,null,limit);

    return info.results;

};

if (env.isRingoJS()) {
    app.get('/simsearch/phenotype.:fmt?', function (request, fmt) {
            var target_species = request.params.target_species; //|| '9606'; //default to human
            var target_type = request.params.target_type; //|| 'disease';
            var limit = request.params.cutoff || request.params.limit || 100;
            var input_items = getIdentifierList(request.params);

            var output = simsearchPhenotype(request, fmt, target_species, target_type, limit, input_items);
            return response.json(output);
        }
    );
    app.post('/simsearch/phenotype.:fmt?', function (request, fmt) {
            var target_species = request.params.target_species; //|| '9606'; //default to human
            var target_type = request.params.target_type; //|| 'disease';
            var limit = request.params.cutoff || request.params.limit || 100;
            var input_items = getIdentifierList(request.params);

            var output = simsearchPhenotype(request, fmt, target_species, target_type, limit, input_items);
            return response.json(output);
        }
    );
}
else {
    app.route({
        method: 'GET',
        path: '/simsearch/phenotype.{fmt?}',
        handler:
            function (request, reply) {
              WaitFor.launchFiber(function () {
                var fmt = request.params.fmt;
                var target_species = request.params.target_species; //|| '9606'; //default to human
                var target_type = request.params.target_type; //|| 'disease';
                var limit = request.params.cutoff || request.params.limit || 100;
                var input_items = getIdentifierList(request.params);

                var output = simsearchPhenotype(request, fmt, target_species, target_type, limit, input_items);
                reply(output);
              });
            }
    });
    app.route({
        method: 'POST',
        path: '/simsearch/phenotype',
        handler:
            function (request, reply) {
              WaitFor.launchFiber(function () {
                var fmt = request.payload.fmt;
                var target_species = request.payload.target_species; //|| '9606'; //default to human
                var target_type = request.payload.target_type; //|| 'disease';
                var limit = request.payload.cutoff || request.payload.limit || 100;
                var input_items = getIdentifierList(request.payload);

                var output = simsearchPhenotype(request, fmt, target_species, target_type, limit, input_items);
                reply(output);
              });
            }
    });
}


function annotateByTextHandler(request, fmt) {
    var q = env.isRingoJS() ? request.params.q : request.query.q;
    var longestOnly = env.isRingoJS() ? request.params.longestOnly : request.query.longestOnly;

    var pheno_ids = [];
    var info =
        {
            query: q,
            longestOnly: longestOnly,
            results:[],
        };

    if (q == null || q == "") {
    }
    else {
        info.results = engine.annotateText(q, {longestOnly : longestOnly});
        info.results.forEach(function(r) {
            engine.log("RES:"+JSON.stringify(r));
            if (r.token.categories.indexOf('Phenotype') > -1) {
                pheno_ids.push(r.token.id);
            }
            r.token.label = r.token.term;
            r.token.href=genObjectHref('phenotype', r.token);
        });
    }

    var markedText = info.query;
    var start = -1, end = -1;
    var currEnd = [];
    var currTerms = [];

    for (var i = info.results.length - 1; i >= 0; i -= 1) {
        var item = info.results[i];
        var token = item.token;
        if (end == -1 || end < item.end || start < item.end) {
            if (end == -1 || item.start < start) {
                start = item.start;
            }
            if (end == -1 || end < item.end) {
                end = item.end;
            }
            if (currTerms.indexOf(token.id) == -1) {
                currEnd.push(token);
                currTerms.push(token.id);
            }
        } else {
            if (end != -1) {
                var str = "<span class=\"linkedspan\">" + markedText.substring(start, end) + "<div class=\"linkedterms\">";
                currEnd = currEnd.reverse();
                for (var j = 0; j < currEnd.length; j += 1) {
                    var link = currEnd[j];
                    str += "<div class=\"linkeditem\">" + link.href + " (" + link.id + ")</div>";
                }
                str += "</div></span>";
                markedText = markedText.substring(0, start) + str + markedText.substring(end);
            }
            start = item.start;
            end = item.end;
            currEnd = [];
            currTerms = [];
            currEnd.push(token);
            currTerms.push(token.id);
        }
    };
    if (currEnd.length > 0) {
        var str = "<span class=\"linkedspan\">" + markedText.substring(start, end) + "<div class=\"linkedterms\">";
        currEnd = currEnd.reverse();
        for (var j = 0; j < currEnd.length; j += 1) {
            var link = currEnd[j];
            str += "<div class=\"linkeditem\">" + link.href + " (" + link.id + ")</div>";
        }
        str += "</div></span>";
        markedText = markedText.substring(0, start) + str + markedText.substring(end);
    };

    info.resultsTable = function() {return genTableOfAnnotateTextResults(info.results, info.query); } ;
    info.inputItems = pheno_ids.join(",");
    info.numPhenotypes = pheno_ids.length;
    info.markedText = markedText;

    addCoreRenderers(info, 'annotate');

    info.pup_tent_css_libraries.push("/monarch-main.css");
    info.pup_tent_css_libraries.push("/monarch-specific.css");
    info.pup_tent_css_libraries.push("/annotate.css");
    info.pup_tent_css_libraries.push("/imagehover.css");

    info.pup_tent_js_libraries.push("/tables.js");
    info.pup_tent_js_libraries.push("/stupidtable.min.js");

    info.title = "Annotation";
    info.hasResults = (info.results.length > 0);

    var output = pup_tent.render('annotate.mustache',info,'monarch_base.mustache');
    return web.wrapHTML(output);
}

web.wrapRouteGet(app, '/annotate/text.:fmt?', '/annotate/text', ['fmt'], annotateByTextHandler);


app.get('/annotate_minimal/text.:fmt?', function(request, fmt) {
    var q = request.params.q;

    var info =
        {
            query: q,
            longestOnly: request.params.longestOnly,
            results:[],
        };

    if (q == null || q == "") {
    }
    else {
        info.results = engine.annotateText(q, {longestOnly : request.params.longestOnly}).entities;
        info.results.forEach(function(r) {
            r.entity.label = r.entity.value;
        });
    }

    info.resultsTable = function() {return genTableOfAnnotateTextResults(info.results, 'obopurl'); } ;

    addCoreRenderers(info, 'annotate');
    info.hasResults = (info.results.length > 0);
    var output = pup_tent.render('annotate_minimal.mustache',info,'monarch_base.mustache');
    return response.html(output);
});

app.get('/sufficiency/basic.:fmt?', function(request, datatype, fmt) {
    var target = null;
    var info = {datatype: datatype, results:[]};
    var limit = 100;
    var input_items = getIdentifierList(request.params);
    input_items = engine.mapIdentifiersToPhenotypes( input_items );
    info.results = engine.getAnnotationSufficiencyScore(input_items);

    //info.input_items = resultObj.query_IRIs;
    info.input_items = input_items.join("\n");

    return response.json(info.results);
});

app.get('/scigraph/dynamic*.:fmt?', function(request) {
	//this presently is a scigraph pass-through wrapper, and only deals with json!
	//for example: /dynamic/homologs.json?gene_id=6469&homolog_id=RO_HOM0000000
    var path = request.pathInfo;

	//replace the "/dynamic" part of the path in the query
	path = path.replace(/.*\/?dynamic/,'');
    var params = request.params;

    var scigraph_results = engine.querySciGraphDynamicServices(path,params);

	return response.json(scigraph_results)


});

// proxy kegg api
app.get('/kegg/:operation/:arg1/:arg2?/:arg3?', function(request, operation, arg1, arg2, arg3) {
    var url = 'http://rest.kegg.jp/' + operation + '/' + arg1;
    if (arg2) url = url + '/' + arg2;
    if (arg3) url = url + '/' + arg3;

    var response = httpclient.get(url, {});
    var status = response.status;
    if (status == 200) {
        return {
            body: [response.content],
            headers: {'Content-Type': 'text/plain'},
            status: 200
        };
    } else {
        return {
            body: ["{error:true}"],
            headers: {'Content-Type': 'text/plain'},
            status: status
        };
    }


});

app.get('/admin/introspect.:fmt?', function(request, fmt) {

    var info = engine.introspect();

    // you can have any format you like, so long as it's json
    return response.json(info);
});

app.get('/admin/cache/info', function(request, fmt) {

    var info = {
        sizeInfo : engine.cache.sizeInfo(),
        cacheDirs : engine.cache.cacheDirs(),
        contents : engine.cache.contents().length
    };

    // you can have any format you like, so long as it's json
    return response.json(info);
});


// in theory anyone could access this and clear our cache slowing things down....
// we should make this authorized, not really a concern right now though
app.get('/admin/clear-cache', function(request, reply) {
    engine.cache.clear(request.params.match);
    if (env.isRingoJS()) {
        return response.html("Cleared!");
    }
    else {
        reply("Cleared!");
    }
});

// A routing page different non-production demonstrations and tests.
app.get('/labs',
    function(request, page){
        var info = {};
        addCoreRenderers(info);
        info.pup_tent_css_libraries.push("/tour.css");
        info.title = 'Monarch Labs'
        var output = pup_tent.render('labs.mustache', info,
				     'monarch_base.mustache');
        return response.html(output);
});

app.get('/labs/golr/:id.:fmt?',
        function(request, id, fmt){
    
    try {

        // Rendering.
        var info = {};
        info = engine.fetchClassInfo(id, {level:1});
        
        if (fmt != null) {
            return formattedResults(info, fmt,request);
        }
        
        addCoreRenderers(info, 'generic', id);               
        addGolrStaticFiles(info);
        info.pup_tent_css_libraries.push("/monarch-main.css");
        info.pup_tent_css_libraries.push("/monarch-specific.css");
        
        //Load variables for client side tables
        addGolrTable(info, "subject_closure", id, 'sub', undefined, 'generic_association');
       
        addGolrTable(info, "object_closure", id, 'ob', undefined, 'generic_association');

        info.title = 'Monarch Generic: '+info.label+' ('+ info.id+')';
        
        var output = pup_tent.render('generic.mustache', info,
                                     'monarch_base.mustache');
        return response.html(output);
        
    } catch(err) {
        return errorResponse(err);
    }
});

//A routing page different non-production demonstrations and tests.
app.get('/labs/dovegraph.:fmt?',function(request,fmt){
    
        var info = {};
        addCoreRenderers(info);
        addGolrStaticFiles(info);
        
        info.pup_tent_js_variables.push({name:'global_scigraph_url',
            value: engine.config.scigraph_url});
        
        var phenoDist = JSON.parse(env.fs_readFileSync('./widgets/dove/stats/key-phenotype-annotation-distro.json'));       
        var hpStub = JSON.parse(env.fs_readFileSync('./widgets/dove/stats/hp-ontology-4.json'));

        if (fmt != null) {
            return formattedResults(info,fmt,request);
        }

        info.pup_tent_js_libraries.push("/barchart-launcher.js");
        info.pup_tent_js_libraries.push("/graph-config.js");
        info.pup_tent_js_libraries.push("/dovechart.js");
        info.pup_tent_js_libraries.push("/d3.3.5.5.min.js");
        info.pup_tent_css_libraries.push("/dovegraph.css");
        info.pup_tent_js_libraries.push("/barchart.js");
        info.pup_tent_js_libraries.push("/tree.js");
        info.pup_tent_js_libraries.push("/tree_builder.js");
        info.pup_tent_css_libraries.push("/monarch-labs.css");
        info.pup_tent_css_libraries.push("/monarch-specific.css");
        info.pup_tent_css_libraries.push("/monarch-main.css");
        info.pup_tent_css_libraries.push("/monarch-specific.css");
        info.pup_tent_css_libraries.push("/main.css");
        info.title = 'Monarch Labs DoveGraph';
        
        info.pup_tent_js_variables.push.apply(info.pup_tent_js_variables,
        [
            {name:'phenoDist',value:hpStub}
        ]);
        info.monarch_launchable = [];
        info.monarch_launchable.push.apply(info.monarch_launchable,
        [
            'makePhenotypeLandingGraph(phenoDist)'
        ]);
        var output = pup_tent.render('dovegraph.mustache',info,'monarch_base.mustache');
        return response.html(output);
});

// A routing page different non-production demonstrations and tests.
app.get('/labs/cy-path-demo',
    function(request, page){
        var info = {};
        addCoreRenderers(info);

        // Now add the stuff that we need to move forward.
        info.pup_tent_js_libraries.push("/bbop.js");
        info.pup_tent_js_libraries.push("/amigo_data_context.js");
        info.pup_tent_js_libraries.push("/cytoscape.js");
        info.pup_tent_js_libraries.push("/CytoDraw.js");
        info.pup_tent_js_libraries.push("/CyPathDemo.js");
        info.pup_tent_css_libraries.push("/monarch-labs.css");
        info.pup_tent_css_libraries.push("/tour.css");

        info.title = 'cy-path-demo';

        var output = pup_tent.render('cy-path-demo.mustache',info,'monarch_base.mustache');
        return response.html(output);
});

// A routing page different non-production demonstrations and tests.
app.get('/labs/cy-explore-demo',
    function(request, page){
        var info = {};
        addCoreRenderers(info);

        // Now add the stuff that we need to move forward.
        info.pup_tent_js_libraries.push("/bbop.js");
        info.pup_tent_js_libraries.push("/amigo_data_context.js");
        info.pup_tent_js_libraries.push("/cytoscape.js");
        info.pup_tent_js_libraries.push("/CytoDraw.js");
        info.pup_tent_js_libraries.push("/CyExploreDemo.js");
        info.pup_tent_css_libraries.push("/monarch-labs.css");
        info.pup_tent_css_libraries.push("/tour.css");

        info.title = 'cy-explore-demo';

        var output = pup_tent.render('cy-explore-demo.mustache',info,'monarch_base.mustache');
        return response.html(output);
    });

//Page for testing out chromosome visualization
app.get('/labs/chromosome-vis-demo',
    function(request, page){
        var info = {};
        
        var pup_tent_test = require('pup-tent')(
                ['js','css','templates','templates/labs',
                 'templates/page',
                 'widgets/dove/js',
                 'widgets/dove/css',
                 'node_modules/phenogrid/js',
                 'node_modules/phenogrid/css',
                 'widgets/keggerator/js',
                 'widgets/class-enrichment',
                 'conf' // get access to conf/golr-conf.json
        ]);
        info.pup_tent_js_libraries = [];
        info.pup_tent_css_libraries = [];
        
        // Override common css and js files,
        pup_tent_test.set_common('css_libs', []);
        pup_tent_test.set_common('js_libs', []);
        
        info.title = 'chromosome-vis-demo';
        
        info.pup_tent_js_libraries.push("/d3.min.js");
        info.pup_tent_js_libraries.push("/d3.min.js");
        info.pup_tent_js_libraries.push("/jquery-1.11.0.js");
        info.pup_tent_js_libraries.push("/jsdas.min.js");
        info.pup_tent_js_libraries.push("/angular-chromosome-vis.js");

        info.pup_tent_css_libraries.push("/angular-chromosome-vis.css")

        var output = pup_tent_test.render('chromosome-vis-demo.mustache',info);
        return response.html(output);
 });

// Playing around with remote resource/feed reading.
// TODO: If it gets /any/ more complicated, reform into an object.
function _get_now_sec(){ return Math.round((new Date()).getTime() / 1000); }
var _blog_data_last_step = 1800; // # sec until next download; 1/2hr
var _blog_data_last_time = _get_now_sec(); // one-time init
var _blog_data_last_res = [];
/**
 * Get blog data
 * @param {String} label - An optional label restricting blog posts.
 */
function _get_blog_data(label) {

  // Only proceed if the time-since-last threshold is crossed or the
  // cached results are empty.
  var res = [];
  var now = _get_now_sec()
  if( (now - _blog_data_last_time) < _blog_data_last_step && _blog_data_last_res.length > 0 ) {
    // Used cached list
    engine.log('blog: using cached results');
    res = _blog_data_last_res;
  }
  else {
    engine.log('blog: get new results');

    // Grab off page.
    var base = 'http://monarch-initiative.blogspot.com';
    var catr = base + '/search/label/';
    var rsrc = base + '/feeds/posts/default?alt=rss';
    if (null != label) {
        rsrc = base + '/feeds/posts/default/-/' + label + '?alt=rss';
    }

    var rssContent = null;
    if (env.isRingoJS()) {
      try {
        var http_client = require("ringo/httpclient");
        var exchange = http_client.get(rsrc);
        if( exchange && exchange.content ){
          rssContent = exchange.content;
          // engine.log('rssContent: ' + rssContent);
        }
      }
      catch (e) {
        engine.log('blog: error: ' + e);
      }
    }
    else {
      var requestResult = WaitFor.for(AsyncRequest.get, rsrc);
      rssContent = requestResult.body + '';
    }

    if (rssContent) {
      // For E4X bug 336551.
      rssContent = rssContent.replace(/^<\?xml\s+version\s*=\s*(["'])[^\1]+\1[^?]*\?>/, "");
      // console.log('rssContent:', rssContent);

      var rss;
      if (false && env.isRingoJS()) {
        rss = new XML(rssContent);
      }
      else {
        var xml2js = require('xml2js');
        var parseString = xml2js.parseString;
        var parseOptions = {};
        parseOptions.explicitArray = false;
        parseOptions.ignoreAttrs = true;
        parseString(rssContent, parseOptions, function (err, result) {
            rss = result.rss;
        });
      }

      // console.log('parsed rss:', rss);
      // console.log('#### rss.channel:', rss.channel);
      // console.log('#### rss.channel.item:', rss.channel.item);
      if( rss && rss.channel && rss.channel.item ){
        for (var itemkey in rss.channel.item) {
          var item = rss.channel.item[itemkey];
          //engine.log('item: ' + Object.keys(item) + ' --> ' + item);

          // Date.
          var t = new Date(item.pubDate);
          var y = t.getFullYear();
          var m = t.getMonth();
          if ( m < 10 ) {
              m = '0' + m;
          }
          var d = t.getDate();

          // Categories.
          var cats = [];

          // Categories.
          var cats = [];
          if (item.category) {
            var catarray = item.category;
            if (typeof(catarray) === 'string') {
                catarray = [catarray];
            }
            for( var catindex = 0; catindex < catarray.length; ++catindex ) {
              var cat = catarray[catindex];
              cats.push({'label': cat, 'link': catr + cat});
            }
          }

          res.push({
              'title': item.title,
              'description': item.description,
              'link': item.link,
              'category': cats,
              'date': [y, m, d].join('-')
          });
        }
      }
    }
  }

  // No matter what, even if empty, update last attempt.
  _blog_data_last_res = res;
  _blog_data_last_time = now;

  return res;
}




function _sortByLabel(array) {
    if (array == null) return;
    array.sort(function(a, b){
            if (typeof a.label == 'undefined' || 
                typeof b.label == 'undefined' ){
                return 0;
            }
            var labelA=a.label.toLowerCase(), labelB=b.label.toLowerCase()
            if (labelA < labelB) //sort string ascending
              return -1
            if (labelA > labelB)
              return 1
            return 0 //default return value (no sorting)
              })
  return array;

}


function homeHandler(request) {
  // Rendering.
  var info = {};

  var defaults = {
      monarch_nav_search_p: true,
      monarch_extra_footer_p: true,
      monarch_footer_fade_p: false
  };

  addCoreRenderers(info, null, null, defaults);

  // Now add the stuff that we need to move forward.
  //info.pup_tent_css_libraries.push("/bootstrap-glyphicons.css");
  info.pup_tent_css_libraries.push("/monarch-home.css");
  info.pup_tent_js_libraries.push("/HomePage.js");

  // Get blog data and render with vars.
  var blog_res = _get_blog_data();
  // Limit to X.
  var lim = 4;
  if( blog_res && blog_res.length > lim ){
      blog_res = blog_res.slice(0, lim);
  }
  info.blog_results = blog_res;
  info.title = 'Welcome to Monarch';
  var output = pup_tent.render('home-page.mustache', info,
       'monarch-base-bs3.mustache');
  return output;
}

if (env.isRingoJS()) {
    app.get('/',
        function (request, id, fmt) {
            try {
                var output = homeHandler(request);
                return response.html(output);
            } catch(err) {
                return errorResponse(err);
            }
        }
    );
}
else {
    app.route({
        method: 'GET',
        path: '/',
        handler:
            function (request, reply) {
              WaitFor.launchFiber(function () {
                var output = homeHandler(request);
                reply(output);
              });
            }
    });
}

app.get('/labs/scratch-homepage', function(request, page){

    // Rendering.
    var info = {};

    var defaults = {
        monarch_nav_search_p: false,
        monarch_extra_footer_p: true,
        monarch_footer_fade_p: false
    };
    addCoreRenderers(info, null, null, defaults);

    // Now add the stuff that we need to move forward.
    //info.pup_tent_css_libraries.push("/bootstrap-glyphicons.css");
    info.pup_tent_css_libraries.push("/monarch-home.css");
    info.pup_tent_js_libraries.push("/HomePage.js");
    
    //graph
    var phenoDist = JSON.parse(env.fs_readFileSync('./widgets/dove/stats/key-phenotype-annotation-distro.json'));
    info.pup_tent_js_libraries.push("/dovechart.js");
    info.pup_tent_js_libraries.push("/d3.3.5.5.min.js");
    info.pup_tent_css_libraries.push("/dovegraph.css");
    info.pup_tent_js_libraries.push("/barchart.js");
    info.pup_tent_js_libraries.push("/tree.js");
    info.pup_tent_js_libraries.push("/graph-config.js");
    info.pup_tent_js_libraries.push("/barchart-launcher.js");
    info.pup_tent_js_variables.push({name:'globalDataGraph',value:phenoDist});
    info.monarch_launchable = [];
    info.monarch_launchable.push('makeHomePageGraph(globalDataGraph)');
    
    // Get blog data and render with vars.
    var blog_res = _get_blog_data();
    // Limit to X.
    var lim = 4;
    if( blog_res && blog_res.length > lim ){
        blog_res = blog_res.slice(0, lim);
    }
    info.blog_results = blog_res;
    info.title = 'Welcome to Monarch';
    var output = pup_tent.render('home-page-scratch.mustache', info,
                 'monarch-base-bs3.mustache');
    var res =  response.html(output);
    return res;
});

app.get('/labs/blog-test', function(request, page){

    // Rendering.
    var info = {};
    addCoreRenderers(info); 

    // Now add the stuff that we need to move forward.
    //info.pup_tent_css_libraries.push("/bootstrap-glyphicons.css");
    info.pup_tent_css_libraries.push("/monarch-labs.css");
    info.pup_tent_js_libraries.push("/BlogScratch.js");
    
    // Get blog data and render with vars.
    var blog_res = _get_blog_data();
    // Limit to X.
    var lim = 4;
    if( blog_res && blog_res.length > lim ){
        blog_res = blog_res.slice(0, lim);
    }
    info.blog_results = blog_res;
    info.title = 'Welcome to Monarch';
    var output = pup_tent.render('blog-scratch-test.mustache', info,
                 'blog-scratch-base.mustache');
    var res =  response.html(output);
    return res;
});

/*
 * GOLR REFACTOR
 */

function addGolrStaticFiles(info) {
    var golr_conf_raw = pup_tent.get('conf/golr-conf.json');
    var golr_conf_json = JSON.parse(golr_conf_raw);
    
    var xrefs_conf_raw = pup_tent.get('conf/xrefs.json');
    var xrefs_conf_json = JSON.parse(xrefs_conf_raw);

    info.pup_tent_css_libraries.push("/bbop.css");
    
    info.pup_tent_js_libraries.push("/bbop.min.js");
    info.pup_tent_js_libraries.push("/golr-table.js");
    
    info.pup_tent_js_variables.push({name:'global_app_base',
        value: engine.config.app_base});
    info.pup_tent_js_variables.push({name:'global_solr_url',
        value: engine.config.golr_url});
    info.pup_tent_js_variables.push({name:'global_golr_conf',
        value: golr_conf_json});
    info.pup_tent_js_variables.push({name:'global_xrefs_conf',
        value: xrefs_conf_json});
}

// query_field: e.g. subject_closure
function addGolrTable(info, query_field, id, div, filter, personality, anchor) {
    var replacer = new RegExp('-', 'g');

    //There has to be a better way
    var id_var = "query_id_" + bbop.core.uuid().replace(replacer, '');
    var field_var = "query_field_" + bbop.core.uuid().replace(replacer, '');
    var div_var = "query_div_" + bbop.core.uuid().replace(replacer, '');
    var filt_var = "filter_" + bbop.core.uuid().replace(replacer, '');
    var person_var = "person_" + bbop.core.uuid().replace(replacer, '');
    var anchor_var = "anchor_" + bbop.core.uuid().replace(replacer, '');
    var launch = '';

    info.pup_tent_js_variables.push({name: id_var, value: id});
    info.pup_tent_js_variables.push({name: field_var, value: query_field});
    info.pup_tent_js_variables.push({name: div_var, value: div});
    info.pup_tent_js_variables.push({name: person_var, value: personality});
    info.pup_tent_js_variables.push({name: anchor_var, value: anchor});
    
    if (typeof info.monarch_launchable === 'undefined'){
        info.monarch_launchable = [];
    }
    
    info.pup_tent_js_variables.push({name: filt_var, value: filter});
    launch = 'getTableFromSolr(' + id_var + ', ' + field_var + ', '
                                 + div_var + ', ' + filt_var + ', '
                                 + person_var + ', ' + anchor_var +')';
              
    info.monarch_launchable.push(launch);
}


app.get('/labs/widget-scratch',
    function(request, page){

        // Rendering.
        var info = {};
        addCoreRenderers(info);

        addGolrTable(info, "subject_closure", id, 'bs3results');

        // Now add the stuff that we need to move forward.
        //info.pup_tent_css_libraries.push("/bootstrap-glyphicons.css");
        info.pup_tent_css_libraries.push("/monarch-labs.css");
        info.pup_tent_css_libraries.push("/bbop.css");
        info.pup_tent_js_libraries.push("/bbop.js");
        info.pup_tent_js_libraries.push("/amigo2.js");
        info.pup_tent_js_libraries.push("/WidgetScratch.js");

	//
        info.title = 'Widget Tests in Monarch';
        var output = pup_tent.render('widget-scratch.mustache', info,
                     'blog-scratch-base.mustache');
        var res =  response.html(output);
        return res;
 });


web.wrapRouteGet(app, '/phenotype/:id.:fmt?', '/phenotype/{id}', ['id', 'fmt'],
        function(request, id, fmt){

            engine.log("PhenotypeID= "+id);
            
            //Curify ID if needed
            if (/_/.test(id)){
                engine.log("ID contains underscore, replacing with : and redirecting");
                var newID = id.replace("_",":");
                return web.wrapRedirect(genURL('phenotype',newID));
            }

            // Rendering.
            var info = {};
            info = engine.fetchClassInfo(id, {level:1});
            
            if (fmt != null) {
                // TODO
                return formattedResults(info, fmt, request);
            }
            
            addCoreRenderers(info, 'phenotype', id);
            addGolrStaticFiles(info);
            info.pup_tent_css_libraries.push("/monarch-main.css");
            info.pup_tent_css_libraries.push("/monarch-specific.css");
            
            //Load variables for client side tables
            var disease_filter = [{ field: 'subject_category', value: 'disease' }];
            addGolrTable(info, "object_closure", id, 'disease-table', disease_filter, 'disease_phenotype',"#diseases");
            info.diseaseNum = engine.fetchAssociationCount(id, 'object_closure', disease_filter);
            
            var gene_filter = [{ field: 'subject_category', value: 'gene' }];
            addGolrTable(info, "object_closure", id, 'gene-table', gene_filter, 'gene_phenotype', "#genes");
            info.geneNum = engine.fetchAssociationCount(id, 'object_closure', gene_filter);
            
            var genotype_filter = [{ field: 'subject_category', value: 'genotype' }];
            addGolrTable(info, "object_closure", id, 'genotype-table', genotype_filter, 'genotype_phenotype',"#genotypes");
            info.genotypeNum = engine.fetchAssociationCount(id, 'object_closure', genotype_filter);
            
            var model_filter = [{ field: 'subject_category', value: 'model' }];
            addGolrTable(info, "object_closure", id, 'model-table', model_filter, 'genotype_phenotype',"#models");
            info.modelNum = engine.fetchAssociationCount(id, 'object_closure', model_filter);
            
            var variant_filter = [{ field: 'subject_category', value: 'variant' }];
            addGolrTable(info, "object_closure", id, 'variant-table', variant_filter, 'variant_phenotype',"#variants");
            info.variantNum = engine.fetchAssociationCount(id, 'object_closure', variant_filter);
            
            var pathway_filter = [{ field: 'object_category', value: 'pathway' }];
            addGolrTable(info, "subject_closure", id, 'pathway-table', pathway_filter, 'phenotype_pathway',"#pathways");
            info.pathwayNum = engine.fetchAssociationCount(id, 'subject_closure', pathway_filter);
            
            
            // Add templates
            info.includes.disease_anchor = addDiseaseAnchor(info);
            info.includes.disease_table = addDiseaseTable();
            
            // Add gene table
            info.includes.gene_anchor = addGeneAnchor(info);
            info.includes.gene_table = addGeneTable();
            
            // Add genotype table
            info.includes.genotype_anchor = addGenotypeAnchor(info);
            info.includes.genotype_table = addGenotypeTable();
            
            // Add model table
            info.includes.model_anchor = addModelAnchor(info);
            info.includes.model_table = addModelTable();
            
            // Add variant table
            info.includes.variant_anchor = addVariantAnchor(info);
            info.includes.variant_table = addVariantTable();
            
            // Add pathway table
            info.includes.pathway_anchor = addPathwayAnchor(info);
            info.includes.pathway_table = addPathwayTable();
            
            if (typeof info.synonyms != 'undefined'){
                info.aka = info.synonyms.join(", ");
            }
            
            info.xrefs = function() {
                if (info.database_cross_reference != null) {
                return info.database_cross_reference.map(function(r) { return genExternalHref('source',{id : r}) }).join(", ");
                //return info.database_cross_reference.join(", ");
                }
            };
            
            if (info.equivalentClasses){
                info.equivalentClasses = info.equivalentClasses.join(", ");
            }

            info.title = 'Monarch Phenotype: '+info.label+' ('+ info.id+')';
            
            // variables checking existence of data in sections
            info.hasDef = function() {return checkExistence(info.definitions)};
            info.hasAka = function() {return checkExistence(info.synonyms)};
            info.hasXrefs = function() {return checkExistence(info.database_cross_reference)};
            info.hasEqual = function() {return checkExistence(info.equivalentClasses)};
            info.hasGenes = true;
            
            //Variables and launcher for ontology view
            info.pup_tent_js_variables.push({name:'global_scigraph_url',
                value: engine.config.scigraph_url});
            info.pup_tent_js_variables.push({name:'globalID',value:id});
            info.pup_tent_js_variables.push({name:'phenotype_root',value:'HP:0000118'});
            info.monarch_launchable.push("getOntologyBrowser(globalID, phenotype_root)");

            var output = pup_tent.render('phenotype.mustache', info,
                                         'monarch_base.mustache');
            return web.wrapHTML(output);
    }
);




//PHENOTYPE - Sub-pages
//Example: /phenotype/MP_0000854/phenotype_associations.json
//Currently only works for json or rdf output
app.get('/phenotype/:id/:section.:fmt?', function(request, id, section, fmt) {

 var info = engine.fetchClassInfo(id, {level:1});

 var sectionInfo =
     { id: "obo:"+id }; // <-- TODO - unify ID/URI strategy
 sectionInfo[section] = info[section];
 engine.addJsonLdContext(sectionInfo);

 if (fmt != null) {
     return formattedResults(sectionInfo, fmt,request);
 }
 else {
     return response.error("plain HTML does not work for page sections. Please append .json or .rdf to URL");
 }
});


function diseaseByIdHandler(request, id, fmt) {
    engine.log("getting /disease/:id where id="+id + " fmt=" + fmt);

    //Curify ID if needed
    if (/_/.test(id)){
        engine.log("ID contains underscore, replacing with : and redirecting");
        var newID = id.replace("_",":");
        return web.wrapRedirect(genURL('disease',newID));
    }

    // Rendering.
    var info = {};
    info = engine.fetchClassInfo(id, {level:1});

    if (fmt != null) {
        return formattedResults(info, fmt,request);
    }

    if (info.label == null || info.id == info.label){
        var redirect = redirectDiseasePage(id, info.equivalentNodes);
        if (redirect){
            return redirect;
        }
    }

    addCoreRenderers(info, 'disease', id);

    addGolrStaticFiles(info);
    info.pup_tent_css_libraries.push("/monarch-main.css");
    info.pup_tent_css_libraries.push("/monarch-specific.css");

    //Load variables for client side tables
    var phenotype_filter = [{ field: 'object_category', value: 'phenotype' }];
    addGolrTable(info, "subject_closure", id, 'phenotypes-table', phenotype_filter, 'disease_phenotype','#phenotypes');
    info.phenotypeNum = engine.fetchAssociationCount(id, 'subject_closure', phenotype_filter);

    var gene_filter = [
                       { field: 'subject_category', value: 'gene' },
                       { field: 'object_category', value: 'disease' }
    ];
    addGolrTable(info, "object_closure", id, 'gene-table', gene_filter, 'gene_disease','#genes');
    info.geneNum = engine.fetchAssociationCount(id, 'object_closure', gene_filter);

    var genotype_filter = [{ field: 'object_category', value: 'genotype' }];
    addGolrTable(info, "subject_closure", id, 'genotype-table', genotype_filter, 'disease_genotype',"#genotypes");
    info.genotypeNum = engine.fetchAssociationCount(id, 'subject_closure', genotype_filter);

    var model_filter = [{ field: 'subject_category', value: 'model' }];
    addGolrTable(info, "object_closure", id, 'model-table', model_filter, 'model_disease','#models');
    info.modelNum = engine.fetchAssociationCount(id, 'object_closure', model_filter);

    var variant_filter = [{ field: 'subject_category', value: 'variant' }];
    addGolrTable(info, "object_closure", id, 'variant-table', variant_filter, 'variant_disease','#variants');
    info.variantNum = engine.fetchAssociationCount(id, 'object_closure', variant_filter);

    var pathway_filter = [{ field: 'object_category', value: 'pathway' }];
    addGolrTable(info, "subject_closure", id, 'pathway-table', pathway_filter, 'disease_pathway','#pathways');
    info.pathwayNum = engine.fetchAssociationCount(id, 'subject_closure', pathway_filter);

    // Phenogrid
    addPhenogridFiles(info);

    // Add templates
    info.includes.phenotype_anchor = addPhenotypeAnchor(info);
    info.includes.phenotype_table = addPhenotypeTable(info);

    // Add gene table
    info.includes.gene_anchor = addGeneAnchor(info);
    info.includes.gene_table = addGeneTable();

    // Add genotype table
    info.includes.genotype_anchor = addGenotypeAnchor(info);
    info.includes.genotype_table = addGenotypeTable();

    // Add model table
    info.includes.model_anchor = addModelAnchor(info);
    info.includes.model_table = addModelTable();

    // Add variant table
    info.includes.variant_anchor = addVariantAnchor(info);
    info.includes.variant_table = addVariantTable();

    // Add pathway table
    info.includes.pathway_anchor = addPathwayAnchor(info);
    info.includes.pathway_table = addPathwayTable();

    info.title = 'Monarch Disease: '+info.label+' ('+ info.id+')';

    info.primary_xref = function() {return genExternalHref('source',{id : id})};

    if (typeof info.synonyms != 'undefined'){
        info.aka = info.synonyms.join(", ");
    }

    info.xrefs = function() {
        if (info.database_cross_reference != null) {
            return info.database_cross_reference.map(function(r) { return genExternalHref('source',{id : r}) }).join(", ");
            //return info.database_cross_reference.join(", ");
        }
    };
    info.altids = function() {
        if (info.has_alternative_id != null) {
            return info.has_alternative_id.join(", ");
        }
    }

    if (info.equivalentClasses){
        info.equivalentClasses = info.equivalentClasses.join(", ");
    }

    //info.hasHeritability = function() {return checkExistence(info.heritability)};
    //info.heritability = engine.unique(info.heritability.map(function(h) {return h.inheritance.label})).join(", ");

    // variables checking existence of data in sections
    info.hasDef = function() {return checkExistence(info.definitions)};
    info.hasComment = function() {return checkExistence(info.comment)};
    info.hasAka = function() {return checkExistence(info.synonyms)};
    info.hasXrefs = function() {return checkExistence(info.database_cross_reference)};
    info.hasEqual = function() {return checkExistence(info.equivalentClasses)};
    info.hasPhenotypes = info.phenotypeNum;
    if (info.phenotypeNum > 10000){
        info.hasPhenotypes = false;
    }

    info.includes.phenogrid_anchor = pup_tent.render('phenogrid-anchor.mustache', info);

    //Variables and launcher for ontology view
    info.pup_tent_js_variables.push({name:'global_scigraph_url',
        value: engine.config.scigraph_url});
    info.pup_tent_js_variables.push({name:'globalID',value:id});
    info.pup_tent_js_variables.push({name:'root',value:'DOID:4'});
    info.monarch_launchable.push("getOntologyBrowser(globalID, root)");

    var output;
    //Launch function for annotation score
    if (info.isLeafNode){
        info.pup_tent_js_variables.push({name:'globalID',value:id});
        info.monarch_launchable.push('getAnnotationScore(globalID)');
        if (info.hasPhenotypes){
            info.pup_tent_js_libraries.push("/phenogridloader-no-species.js");
            info.monarch_launchable.push('loadPhenogrid()');
        }
        output = pup_tent.render('disease.mustache', info,
            'monarch_base.mustache');
    } else {
        if (info.hasPhenotypes){
            info.pup_tent_js_libraries.push("/phenogridloader-onclick.js");
            info.monarch_launchable.push('loadPhenogrid()');
        }
        output = pup_tent.render('disease-non-leaf.mustache', info,
            'monarch_base.mustache');
    }

    return web.wrapHTML(output);
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/disease/:id.:fmt?', '/disease/{id}.{fmt}', ['id', 'fmt'], diseaseByIdHandler);
web.wrapRouteGet(app, '/disease/:id', '/disease/{id}', ['id'], diseaseByIdHandler);


//DISEASE - Sub-pages
//Example: /disease/DOID_12798/phenotype_associations.json
//Currently only works for json or rdf output

web.wrapRouteGet(app, '/disease/:id/:section.:fmt?', '/disease/{id}/{section}.{fmt?}', ['id', 'section', 'fmt'],
    function(request, id, section, fmt){
        var info = engine.fetchCoreDiseaseInfo(id);
        console.log('####fetchCoreDiseaseInfo returns:', JSON.stringify(info));
        var sectionInfo =
             { id: "obo:"+id }; // <-- TODO - unify ID/URI strategy
        sectionInfo[section] = info[section];
        engine.addJsonLdContext(sectionInfo);

        if (fmt != null) {
            return formattedResults(sectionInfo, fmt, request);
        } else {
            return formattedError("plain HTML does not work for page sections. Please append .json or .rdf to URL");
        }
    }
);


function fetchFeatureSection(request, id, section, fmt) {
    console.log(request + ' ' + id + ' ' + section + ' ' + fmt);
    var info = engine.fetchCoreGeneInfo(id);

    var sectionInfo =
        { id: "obo:"+id }; // <-- TODO - unify ID/URI strategy
    sectionInfo[section] = info[section];
    engine.addJsonLdContext(sectionInfo);

    if (fmt != null) {
        return formattedResults(sectionInfo, fmt,request);
    } else {
        return formattedError("plain HTML does not work for page sections. Please append .json or .rdf to URL");
    }
}

web.wrapRouteGet(app, '/gene/:id.:fmt?', '/gene/{id}', ['id'],
    function(request, id, fmt) {
    try {
        
        //Curify ID if needed
        if (/_/.test(id)){
            engine.log("ID contains underscore, replacing with : and redirecting");
            var newID = id.replace("_",":");
            return web.wrapRedirect(genURL('gene',newID));
        }

        // Rendering.
        var info = {};
        info = engine.fetchDataInfo(id);
        
        if (fmt != null) {
            return formattedResults(info, fmt,request);
        }
        
        if (info.label == null || info.id == info.label){
            var redirect = redirectGenePage(id, info.equivalentNodes);
            if (redirect){
                return redirect;
            }
        }

        addCoreRenderers(info, 'gene', id);
        addGolrStaticFiles(info);
        info.pup_tent_css_libraries.push("/monarch-main.css");
        info.pup_tent_css_libraries.push("/monarch-specific.css");
        
        //Load variables for client side tables
        var phenotype_filter = [{ field: 'object_category', value: 'phenotype' }];
        addGolrTable(info, "subject_closure", id, 'phenotypes-table', phenotype_filter, 'gene_phenotype', '#phenotypes');
        info.phenotypeNum = engine.fetchAssociationCount(id, 'subject_closure', phenotype_filter);
        
        var disease_filter = [{ field: 'object_category', value: 'disease' }];
        addGolrTable(info, "subject_closure", id, 'disease-table', disease_filter, 'gene_disease','#diseases');
        info.diseaseNum = engine.fetchAssociationCount(id, 'subject_closure', disease_filter);
        
        var genotype_filter = [{ field: 'subject_category', value: 'genotype' }];
        addGolrTable(info, "object_closure", id, 'genotype-table', genotype_filter, 'genotype_gene_on_gene_page','#genotypes');
        info.genotypeNum = engine.fetchAssociationCount(id, 'object_closure', genotype_filter);
        
        var model_filter = [{ field: 'subject_category', value: 'model' }];
        addGolrTable(info, "object_closure", id, 'model-table', model_filter, 'model_gene','#models');
        info.modelNum = engine.fetchAssociationCount(id, 'object_closure', model_filter);
        
        var variant_filter = [{ field: 'subject_category', value: 'variant' }];
        addGolrTable(info, "object_closure", id, 'variant-table', variant_filter, 'variant_gene','#variants');
        info.variantNum = engine.fetchAssociationCount(id, 'object_closure', variant_filter);
        
        var homolog_filter = [{ field: 'object_category', value: 'gene' }];
        addGolrTable(info, "subject_closure", id, 'homolog-table', homolog_filter, 'gene_homolog','#homologs');
        info.homologNum = engine.fetchAssociationCount(id, 'subject_closure', homolog_filter);
        
        var pathway_filter = [{ field: 'object_category', value: 'pathway' }];
        addGolrTable(info, "subject_closure", id, 'pathway-table', pathway_filter, 'gene_pathway','#pathways');
        info.pathwayNum = engine.fetchAssociationCount(id, 'subject_closure', pathway_filter);
        
        // Phenogrid
        addPhenogridFiles(info);
        
        // Add templates
        info.includes.phenotype_anchor = addPhenotypeAnchor(info);
        info.includes.phenotype_table = addPhenotypeTable(info);
        
        // Add gene table
        info.includes.disease_anchor = addDiseaseAnchor(info);
        info.includes.disease_table = addDiseaseTable();
        
        // Add genotype table
        info.includes.genotype_anchor = addGenotypeAnchor(info);
        info.includes.genotype_table = addGenotypeTable();
        
        // Add model table
        info.includes.model_anchor = addModelAnchor(info);
        info.includes.model_table = addModelTable();
        
        // Add variant table
        info.includes.variant_anchor = addVariantAnchor(info);
        info.includes.variant_table = addVariantTable();
        
        // Add pathway table
        info.includes.homolog_anchor = addHomologAnchor(info);
        info.includes.homolog_table = addHomologTable();
        
        // Add pathway table
        info.includes.pathway_anchor = addPathwayAnchor(info);
        info.includes.pathway_table = addPathwayTable();

        info.title = 'Monarch Gene: '+info.label+' ('+ info.id+')';

        info.primary_xref = function() {return genExternalHref('source',{id : id})};
        
        if (info.taxon){
            info.taxon_xref = function() {return genExternalHref('source',info.taxon)};
        }
    
        if (typeof info.synonyms != 'undefined'){
            info.aka = info.synonyms.join(", ");
        }
        
        if (info.equivalentClasses){
            info.equal_ids  = function() { 
                return info.equivalentClasses.map(function(r) { return genObjectHref('gene', {id:r,label:r} ) }).join(", ");
            }
        }
        
        info.xrefs = function() {
            if (info.database_cross_reference != null) {
                return info.database_cross_reference.map(function(r) { return genExternalHref('source',{id : r}) }).join(", ");
                //return info.database_cross_reference.join(", ");
            }
        };
        info.altids = function() {
            if (info.has_alternative_id != null) {
                return info.has_alternative_id.join(", ");
            }
        }

        // variables checking existence of data in sections
        info.hasDef = function() {return checkExistence(info.definitions)};
        info.hasComment = function() {return checkExistence(info.comment)};
        info.hasAka = function() {return checkExistence(info.synonyms)};
        info.hasXrefs = function() {return checkExistence(info.database_cross_reference)};
        info.hasEqual = function() {return checkExistence(info.equivalentClasses)};
        info.hasPhenotypes = info.phenotypeNum;
        
        //Launch function for annotation score
        info.pup_tent_js_variables.push({name:'globalID',value:id});
        info.monarch_launchable.push('getAnnotationScore(globalID)');
        
        if (info.hasPhenotypes){
            info.pup_tent_js_libraries.push("/phenogridloader-no-species.js");
            info.monarch_launchable.push('loadPhenogrid()');
        }
        
        info.includes.phenogrid_anchor = pup_tent.render('phenogrid-anchor.mustache', info);
        
        var output = pup_tent.render('gene.mustache', info,
                 'monarch_base.mustache');
        return web.wrapHTML(output);

    } catch(err) {
        return errorResponse(err);
    }
    
}
);

var redirectGenePage = function(id, equivalentNodes) {
   var prefix = id.replace(/(\w+):([\w\d]+)/, "$1");
   var nodeMap = {};
   
   // This assumes we have one equivalent node per source
   equivalentNodes.forEach( function (i) {
      var source = i.id.replace(/(\w+):([\w\d]+)/, "$1");
      nodeMap[source] = i;
   });
   
   //Preference when redirecting MGI,ZFIN > NCBIGene > OMIM > ENSEMBL
   if (prefix != 'MGI' && 'MGI' in nodeMap && nodeMap['MGI'].lbl != null){
       engine.log("Redirecting to id: "+ nodeMap['MGI'].id);
       return web.wrapRedirect(genURL('gene',nodeMap['MGI'].id));
    
   } else if (prefix != 'ZFIN' && 'ZFIN' in nodeMap && nodeMap['ZFIN'].lbl != null){
       engine.log("Redirecting to id: "+ nodeMap['ZFIN'].id);
       return web.wrapRedirect(genURL('gene',nodeMap['ZFIN'].id)); 
       
   } else if (prefix != 'NCBIGene' && 'NCBIGene' in nodeMap && nodeMap['NCBIGene'].lbl != null){
       engine.log("Redirecting to id: "+ nodeMap['NCBIGene'].id);
       return web.wrapRedirect(genURL('gene',nodeMap['NCBIGene'].id));
       
   } else if (prefix != 'OMIM' && 'OMIM' in nodeMap && nodeMap['OMIM'].lbl != null){
       engine.log("Redirecting to id: "+ nodeMap['OMIM'].id);
       return web.wrapRedirect(genURL('gene',nodeMap['OMIM'].id));
       
   } else if (prefix != 'ENSEMBL' && 'ENSEMBL' in nodeMap && nodeMap['ENSEMBL'].lbl != null){
       engine.log("Redirecting to id: "+ nodeMap['ENSEMBL'].id);
       return web.wrapRedirect(genURL('gene',nodeMap['ENSEMBL'].id));  
   } 

};

var redirectDiseasePage = function(id, equivalentNodes) {
    var prefix = id.replace(/(\w+):([\w\d]+)/, "$1");
    var nodeMap = {};
    
    // This assumes we have one equivalent node per source
    equivalentNodes.forEach( function (i) {
       var source = i.id.replace(/(\w+):([\w\d]+)/, "$1");
       nodeMap[source] = i;
    });
    
    //Preference when redirecting OMIM > DOID > Orphanet > MESH
    if (prefix != 'OMIM' && 'OMIM' in nodeMap && nodeMap['OMIM'].lbl != null){
        return web.wrapRedirect(genURL('disease',nodeMap['OMIM'].id));
     
    } else if (prefix != 'DOID' && 'DOID' in nodeMap && nodeMap['DOID'].lbl != null){
        return web.wrapRedirect(genURL('disease',nodeMap['DOID'].id)); 
        
    } else if (prefix != 'Orphanet' && 'Orphanet' in nodeMap && nodeMap['Orphanet'].lbl != null){
        return web.wrapRedirect(genURL('disease',nodeMap['Orphanet'].id));
        
    } else if (prefix != 'MESH' && 'MESH' in nodeMap && nodeMap['MESH'].lbl != null){
        return web.wrapRedirect(genURL('disease',nodeMap['MESH'].id));  
    } 
};


//Note there is much copied from the above function, should refactor to not repeat code, epic DRY violation
var fetchVariantPage = function(request, id, fmt) {
    try {

        // Rendering.
        var info = {};
        info = engine.fetchDataInfo(id);
        
        if (fmt != null) {
           return formattedResults(info, fmt,request);
        }
        
        addCoreRenderers(info, 'variant', id);
        addGolrStaticFiles(info);
        info.pup_tent_css_libraries.push("/monarch-main.css");
        info.pup_tent_css_libraries.push("/monarch-specific.css");
        
        //Load variables for client side tables
        var phenotype_filter = [{ field: 'object_category', value: 'phenotype' }];
        addGolrTable(info, "subject_closure", id, 'phenotypes-table', phenotype_filter, 'variant_phenotype','#phenotypes');
        info.phenotypeNum = engine.fetchAssociationCount(id, 'subject_closure', phenotype_filter);
        
        var disease_filter = [{ field: 'object_category', value: 'disease' }];
        addGolrTable(info, "subject_closure", id, 'disease-table', disease_filter, 'variant_disease','#diseases');
        info.diseaseNum = engine.fetchAssociationCount(id, 'subject_closure', disease_filter);
        
        var gene_filter = [{ field: 'object_category', value: 'gene' }];
        addGolrTable(info, "subject_closure", id, 'gene-table', gene_filter, 'variant_gene','#genes');
        info.geneNum = engine.fetchAssociationCount(id, 'subject_closure', gene_filter);
        
        var genotype_filter = [{ field: 'subject_category', value: 'genotype' }];
        addGolrTable(info, "object_closure", id, 'genotype-table', genotype_filter, 'genotype_variant','#genotypes');
        info.genotypeNum = engine.fetchAssociationCount(id, 'object_closure', genotype_filter);

        var model_filter = [{ field: 'subject_category', value: 'model' }];
        addGolrTable(info, "object_closure", id, 'model-table', model_filter, 'model_variant','#models');
        info.modelNum = engine.fetchAssociationCount(id, 'object_closure', model_filter);
        
        var pathway_filter = [{ field: 'object_category', value: 'pathway' }];
        addGolrTable(info, "subject_closure", id, 'pathway-table', pathway_filter, 'variant_pathway','#pathways');
        info.pathwayNum = engine.fetchAssociationCount(id, 'subject_closure', pathway_filter);
        
        // Phenogrid
        addPhenogridFiles(info);
        
        // Add templates
        info.includes.phenotype_anchor = addPhenotypeAnchor(info);
        info.includes.phenotype_table = addPhenotypeTable(info);
        
        // Add gene table
        info.includes.disease_anchor = addDiseaseAnchor(info);
        info.includes.disease_table = addDiseaseTable();
        
        // Add gene table
        info.includes.gene_anchor = addGeneAnchor(info);
        info.includes.gene_table = addGeneTable();
        
        // Add genotype table
        info.includes.genotype_anchor = addGenotypeAnchor(info);
        info.includes.genotype_table = addGenotypeTable();
        
        // Add model table
        info.includes.model_anchor = addModelAnchor(info);
        info.includes.model_table = addModelTable();
        
        // Add pathway table
        info.includes.pathway_anchor = addPathwayAnchor(info);
        info.includes.pathway_table = addPathwayTable();

        info.title = 'Monarch Variant: '+info.label+' ('+ info.id+')';

        info.primary_xref = function() {return genExternalHref('source',{id : id})};
        
        if (info.taxon){
            info.taxon_xref = function() {return genExternalHref('source',info.taxon)};
        }
    
        if (typeof info.synonyms != 'undefined'){
            info.aka = info.synonyms.join(", ");
        }
        
        if (info.equivalentClasses){
            info.equal_ids  = function() { 
                return info.equivalentClasses.map(function(r) { return genObjectHref('variant', {id:r,label:r} ) }).join(", ");
            }
        }
        
        info.xrefs = function() {
            if (info.database_cross_reference != null) {
                return info.database_cross_reference.map(function(r) { return genExternalHref('source',{id : r}) }).join(", ");
                //return info.database_cross_reference.join(", ");
            }
        };
        info.altids = function() {
            if (info.has_alternative_id != null) {
                return info.has_alternative_id.join(", ");
            }
        }
        
        info.types = function() {
            if (info.categories != null) {
                return info.categories.join(", ");
            }
        }

        // variables checking existence of data in sections
        info.hasPhenotypes = info.phenotypeNum;
        info.hasDef = function() {return checkExistence(info.definitions)};
        info.hasComment = function() {return checkExistence(info.comment)};
        info.hasAka = function() {return checkExistence(info.synonyms)};
        info.hasTypes= function() {return checkExistence(info.categories)};
        info.hasEqual = function() {return checkExistence(info.equivalentClasses)};
        info.hasXrefs = function() {return checkExistence(info.database_cross_reference)};
        
        if (info.hasPhenotypes){
            info.pup_tent_js_libraries.push("/phenogridloader-no-species.js");
            info.monarch_launchable.push('loadPhenogrid()');
        }
        
        info.includes.phenogrid_anchor = pup_tent.render('phenogrid-anchor.mustache', info);
        
        //Launch function for annotation score
        info.pup_tent_js_variables.push({name:'globalID',value:id});
        info.monarch_launchable.push('getAnnotationScore(globalID)');

        
        var output = pup_tent.render('variant.mustache', info,
                 'monarch_base.mustache');
        return response.html(output);
        
    } catch(err) {
        return errorResponse(err);
    }
    
}


app.get('/variant/:id', fetchVariantPage);

//Sequence Feature - Sub-pages
//Example: /gene/NCIBGene:12166/phenotype_associations.json
//Currently only works for json or rdf output

web.wrapRouteGet(app, '/gene/:id/:section.:fmt?', '/gene/{id}/{section}.{fmt?}', ['id', 'section', 'fmt'], fetchFeatureSection);
web.wrapRouteGet(app, '/variant/:id/:section.:fmt?', '/variant/{id}/{section}.{fmt?}', ['id', 'section', 'fmt'], fetchFeatureSection);
web.wrapRouteGet(app, '/genotype/:id/:section.:fmt?', '/genotype/{id}/{section}.{fmt?}', ['id', 'section', 'fmt'], fetchFeatureSection);
web.wrapRouteGet(app, '/model/:id/:section.:fmt?', '/model/{id}/{section}.{fmt?}', ['id', 'section', 'fmt'], fetchFeatureSection);

app.get('/labs/case/:id/phenotype_list.:fmt?', function(request, id, fmt){
    var info = {};
    info = engine.fetchPatientInfo(id);

    if (fmt != null) {
        return formattedResults(info, fmt,request);
    } else {
        return response.error("plain HTML does not work for page sections. Please append .json or .rdf to URL");
    }
});

app.get('/labs/case/:id', function(request, id, fmt){
    var info = {};
    info = engine.fetchPatientInfo(id);
    
    addCoreRenderers(info, 'patient', id);
    addPhenogridFiles(info);
    info.pup_tent_js_libraries.push("/phenogridloader-no-species.js");
    info.monarch_launchable.push('loadPhenogrid()');
    
    info.hasPhenotypes = true;
    info.includes.phenogrid_anchor = pup_tent.render('phenogrid-anchor.mustache', info);
    
    info.pup_tent_css_libraries.push("/monarch-main.css");
    info.pup_tent_css_libraries.push("/monarch-specific.css");
    
    info.hasRelated = function() {return checkExistence(info.related)};
    info.hasFam = function() {return checkExistence(info.family)};
    info.hasGeno = function() {return checkExistence(info.genotypes)};
    
    info.fam = function() {
        if (info.family != null) {
            return info.family.map(function(r) { return genExternalHref('source',{id : r}) }).join(", ");
        }
    };
    
    info.rel = function() {
        if (info.related != null) {
            return info.related.map(function(r) { return genExternalHref('source',{id : r}) }).join(", ");
        }
    };
    
    info.geno = function() {
        if (info.genotypes != null) {
            return info.genotypes.map(function(r) { return genExternalHref('source',{id : r}) }).join(", ");
        }
    };
    
    var output = pup_tent.render('patient.mustache', info,
        'monarch_base.mustache');
    return response.html(output);
});


app.get('/association/:id.:fmt?',
        function(request, id, fmt){
    
        try {
            
          //Curify ID if needed
            if (/_/.test(id)){
                engine.log("ID contains underscore, replacing with : and redirecting");
                var newID = id.replace("_",":");
                return web.wrapRedirect(genURL('association',newID));
            }
            
            // Rendering.
            var info = {};
            info = engine.fetchClassInfo(id, {level:1});
            
            if (fmt != null) {
                return formattedResults(info, fmt,request);
            }
            
            addCoreRenderers(info, 'association', id);                  
            addGolrStaticFiles(info);
            info.pup_tent_css_libraries.push("/monarch-main.css");
            info.pup_tent_css_libraries.push("/monarch-specific.css");
            info.type = "Association";
            
            //Load variables for client side tables
            var qual_filter = [{ field: 'qualifier', value: 'direct' }];
            addGolrTable(info, "evidence_object", id, 'associations-table', qual_filter, 'generic_association');
            info.associationNum = engine.fetchAssociationCount(id, 'evidence_object', qual_filter);
            
            var inf_filter = [{ field: 'qualifier', value: 'inferred' }];
            addGolrTable(info, "evidence_object", id, 'inferred-table', inf_filter, 'generic_association');
            info.inferredNum = engine.fetchAssociationCount(id, 'evidence_object', inf_filter);
            
            info.title = 'Monarch Association: '+info.label+' ('+ info.id+')';

            info.primary_xref = function() {return genExternalHref('source',{id : id})};
        
            if (typeof info.synonyms != 'undefined'){
                info.aka = info.synonyms.join(", ");
            }
            
            info.xrefs = function() {
                if (info.database_cross_reference != null) {
                    return info.database_cross_reference.map(function(r) { return genExternalHref('source',{id : r}) }).join(", ");
                    //return info.database_cross_reference.join(", ");
                }
            };
            info.altids = function() {
                if (info.has_alternative_id != null) {
                    return info.has_alternative_id.join(", ");
                }
            }

            // variables checking existence of data in sections
            info.hasDef = function() {return checkExistence(info.definitions)};
            info.hasComment = function() {return checkExistence(info.comment)};
            info.hasAka = function() {return checkExistence(info.synonyms)};
            info.hasXrefs = function() {return checkExistence(info.database_cross_reference)};
            
            var output = pup_tent.render('associations.mustache', info,
                                         'monarch_base.mustache');
            return response.html(output);
            
        } catch(err) {
            return errorResponse(err);
        }
 });

function addPhenotypeAnchor(info) {
    var phenotype_anchor = {id: info.id,
                            resultNum: info.phenotypeNum,
                            type: "Phenotypes", href: "phenotypes"};

    return pup_tent.render('anchor.mustache', phenotype_anchor);
}

function addPhenotypeTable(info) {
    var phenotype_table = {href: "phenotypes", div: "phenotypes-table",
                           isLeafNode: info.isLeafNode,
                           isPhenotypeTable : true};
    return pup_tent.render('golr-table.mustache', phenotype_table);
}

function addDiseaseAnchor(info) {
    var disease_anchor = {id: info.id,
                          resultNum: info.diseaseNum,
                          type: "Disease", href: "diseases"};
    return pup_tent.render('anchor.mustache', disease_anchor);
}

function addDiseaseTable() {
    var disease_table = {href: "diseases", div: "disease-table"};
    return pup_tent.render('golr-table.mustache', disease_table);
}

function addGeneAnchor(info) {
    var gene_anchor = {id: info.id,
                       resultNum: info.geneNum,
                       type: "Genes", href: "genes"};
    return pup_tent.render('anchor.mustache', gene_anchor);
}

function addGeneTable() {
    var gene_table = {href: "genes", div: "gene-table"}
    return pup_tent.render('golr-table.mustache', gene_table);
}

function addModelAnchor(info) {
    var model_anchor = {id: info.id,
                        resultNum: info.modelNum,
                        type: "Models", href: "models"};
    return pup_tent.render('anchor.mustache', model_anchor);
}

function addModelTable() {
    var model_table = {href: "models", div: "model-table"};
    return pup_tent.render('golr-table.mustache', model_table);
}

function addVariantAnchor(info) {
    var variant_anchor = {id: info.id, type: "Variants",
                          resultNum: info.variantNum,
                          href: "variants"};
    return pup_tent.render('anchor.mustache', variant_anchor);
}

function addVariantTable() {
    var variant_table = {href: "variants", div: "variant-table"};
    return pup_tent.render('golr-table.mustache', variant_table);
}

function addHomologAnchor(info) {
    var homolog_anchor = {id: info.id, type: "Homologs",
                          resultNum: info.homologNum,
                          href: "homologs"};
    return pup_tent.render('anchor.mustache', homolog_anchor);
}

function addHomologTable() {
    var homologs_table = {href: "homologs", div: "homolog-table"};
    return pup_tent.render('golr-table.mustache', homologs_table);
}

function addPathwayAnchor(info) {
    var pathway_anchor = {id: info.id, type: "Pathways",
                          resultNum: info.pathwayNum,
                          href: "pathways"};
    return pup_tent.render('anchor.mustache', pathway_anchor);
}

function addPathwayTable() {
    var pathway_table = {href: "pathways", div: "pathway-table"};
    return pup_tent.render('golr-table.mustache', pathway_table);
}

function addGenotypeAnchor(info) {
    var genotype_anchor = {id: info.id,
                            resultNum: info.genotypeNum,
                            type: "Genotypes", href: "genotypes"};
    return pup_tent.render('anchor.mustache', genotype_anchor);
}

function addGenotypeTable() {
    var genotype_table = {href: "genotypes", div: "genotype-table"};
    return pup_tent.render('golr-table.mustache', genotype_table);
}


/*
 * END GOLR REFACTOR
 */


app.get('/labs/people-scratch', function(request, page){

    // Rendering.
    var info = {};
    addCoreRenderers(info);
    
    // Now add the stuff that we need to move forward.
    info.pup_tent_css_libraries.push("/monarch-labs.css");
    info.pup_tent_css_libraries.push("/bbop.css");
    info.pup_tent_js_libraries.push("/bbop.js");
    info.pup_tent_js_libraries.push("/amigo2.js");
    info.pup_tent_js_libraries.push("/PeopleScratch.js");
    info.monarch_launchable.push("PeopleInit()");
    
    //
    info.title = 'People Tests in Monarch';
    var output = pup_tent.render('people-scratch.mustache', info,
				 'monarch-base-bs3.mustache');
    var res =  response.html(output);
    return res;
});

///
/// Routes for a demonstration of JBrowse in Monarch.
///

// Deliver content from directory mapped to path.
app.get('/labs/jbrowse/*', function(request){

    // Extract path from request.
    var path = request.pathInfo;
    path = path.substr('/labs/jbrowse/'.length, path.length) || '';

    // Map path onto filesystem.
    //var fs_loc = './'; // root dir
    var fs_loc = './templates/labs/jbrowse/'; // root dir
    var mapped_path = fs_loc + path;

    // Return file/content.
    //var res =  response.html('<em>' + path + ': not found</em>'); // default err
    //def ctype = _decide_content_type(path)
    //var res =  response.html('<em>' + fs.Path(mapped_path).absolute()+ ': not found</em>'); // default err
    //if( env.fs_existsSync(path) ){
    //    res = _return_mapped_content(path);
    if( env.fs_existsSync(mapped_path) ){
        var res = _return_mapped_content(mapped_path);
        return res ;
    }
    else{
        var res =  response.html('<em>' + fs.Path(mapped_path).absolute()+ ': not found</em>'); // default err
        res.status =  404 ;
        return res ;
    }
});
// Deliver content from directory mapped to path.
app.get('/labs/jbrowse-demo', function(request){

    // Rendering variables.
    var info = {};
    addCoreRenderers(info);
    info.title = 'Welcome to Monarch';

    // Final render.
    var output = pup_tent.render('jbrowse.mustache', info,
                 'blog-scratch-base.mustache');
    var res =  response.html(output);
    return res;
});

///
/// Error handling.
///

// Add an error for all of the rest.
app.get('/*',function(request) {
    var info = {};
    addCoreRenderers(info);
    info.pup_tent_css_libraries.push("/monarch-main.css");
    info.title = 'Page Not Found';
    var output = pup_tent.render('notfound.mustache',info,'monarch_base.mustache');
    var res =  response.html(output);
    res.status = 404;
    return res;
});


if (env.isRingoJS()) {
    // INITIALIZATION
    // Can set port from command line. E.g. --port 8080
    if (require.main == module) {
       require('ringo/httpserver').main(module.id);
    }
}

//TODO Delete
app.get('/labs/gene/:id.:fmt?', function(request, id, fmt) {

    //Redirect to NCBI Gene ID
    var mappedID = getGeneMapping(id);
    if (typeof mappedID != 'undefined' && mappedID != id){
        engine.log("found updated ID, redirecting to: "+mappedID);
        return web.wrapRedirect(genURL('gene',mappedID));
    }

    var info;
    try {
        info = engine.fetchGeneInfo(id);
    }
    catch(err) {
        return errorResponse(err);
    }

    if (fmt != null) {
        return formattedResults(info,fmt,request);
    }

    // HTML
    addCoreRenderers(info, 'gene', id);

    //Add pup_tent libs
    info.pup_tent_css_libraries.push("/monarch-main.css");
    info.pup_tent_css_libraries.push("/monarch-specific.css");
    info.pup_tent_css_libraries.push("/imagehover.css");

    info.pup_tent_js_libraries.push("/stupidtable.min.js");
    info.pup_tent_js_libraries.push("/tables.js");
    
    addPhenogridFiles(info);

    info.pup_tent_js_libraries.push("/phenogridloader-no-species.js");
    info.monarch_launchable.push('loadPhenogrid()');

    info.title = 'Monarch Gene: '+info.label+' ('+ info.id+')';

    // variables checking existence of data in sections
    info.hasPhenotypes   = function() {return checkExistence(info.phenotype_associations)};
    info.hasPathways     = function() {return checkExistence(info.pathway_associations)};
    info.hasDiseases     = function() {return checkExistence(info.disease_associations)};
    info.hasGenotypes    = function() {return checkExistence(info.genotype_associations)};
    info.hasLocation     = function() {return checkExistence(info.location)};
    info.hasAlleles      = function() {return checkExistence(info.alleles)};
    info.hasOrthologs    = function() {return checkExistence(info.orthologs)};
    info.hasInteractions = function() {return checkExistence(info.interactions)};
    info.hasSummary      = function() {return checkExistence(info.summary)};
    info.hasLiterature   = function() {return checkExistence(info.literature)};
    info.hasSynonym   = function() {return checkExistence(info.synonyms)};

    //info.phenotypeNum = function() {return getNumLabel(info.phenotype_associations)};
    info.phenotypeNum = function() {
        if (info.phenotype_associations != null) {
            return getNumLabel(engine.unique(info.phenotype_associations.map(function(p) {return p.phenotype.id})))};
        return 0;
    };

    info.genotypeNum    = function() {return getNumLabel(info.genotype_associations)};
    info.pathwayNum     = function() {return getNumLabel(info.pathway_associations)};
    info.diseaseNum     = function() {return getNumLabel(info.disease_associations)};
    info.alleleNum      = function() {return getNumLabel(info.alleles)};
    info.orthologNum    = function() {return getNumLabel(info.orthologs)};
    info.interactionNum = function() {return getNumLabel(info.interactions)};
    info.literatureNum  = function() {return getNumLabel(info.pmidinfo)};

    // adorn object with rendering functions
    info.phenotypeTable   = function() {return genTableOfGenePhenotypeAssociations(info.phenotype_associations);};
    info.pathwayTable     = function() {return genTableOfGenePathwayAssociations(info.pathway_associations);};
    info.diseaseTable     = function() {return genTableOfGeneDiseaseAssociations(info.disease_associations);};
    info.genotypeTable    = function() {return genTableOfGeneGenotypeAssociations(info.genotype_associations);};
    info.alleleTable      = function() {return genTableOfGeneAlleleAssociations(info.alleles);};
    info.orthologTable    = function() {return genTableOfGeneOrthologAssociations(info.orthologs);};
    info.interactionTable = function() {return genTableOfGeneInteractionAssociations(info.interactions);};
    info.literatureTable  = function() {return genTableOfLiterature(info.literature, info.pmidinfo);};

    info.primary_xref = function() {return genExternalHref('source',{id : info.id})};
    info.xrefTable    = function() {return genTableOfGeneXRefs(info.xrefs);};

    info.annotationScore = function() {
        if (info.annotation_sufficiency != null) {
            return (5 * info.annotation_sufficiency);
        } else {
            return 0;
        }
    };

    //Link out to NCBI
    info.taxon_xref;

    if (info.taxon){
        info.taxon_xref = function() {return genExternalHref('source',info.taxon)};
    }

    var output = pup_tent.render('gene-jbrowse.mustache',info,'monarch_base.mustache');
    return response.html(output);
});


function analyzeByDatatypePostHandler(request, datatype, fmt) {
     console.log('analyzeByDatatypePostHandler', datatype, fmt, request);
     var info = {};
     //Some hardcoded things for mustache
     info.hasInputItems = false;
     info.hasResults = false;
     info.hasTable = false;
     info.datatype = datatype;
     info.isFileError = false;
     info.limit = 100;
     
     /* Uploads are streamed to a tmp file using the custom upload function
      * above.  This function checks the content-length and prevents the
      * tmp file from being written for files over 50 mb.  Here we check
      * this again before writing the contents to memory and returning this
      * to the client.  With either check, if the file exceeds 50 mb we 
      * set doesFileExceedMax to true which is utilized by mustache to
      * display the error to the user
      */
     
     var user_request;
     
     if (typeof request.params.file_exceeds != 'undefined'){
         info.doesFileExceedMax = true;
         info.isFileError = true;
     } else if (typeof request.params.upload_file != 'undefined'){
         var fileUpload = request.params.upload_file;
         // File hit hard size limit when writing but for some reason
         // wasn't caught in the content-length
         if (request.params.hit_limit){
             env.fs_unlinkSync(fileUpload.tempfile);
             info.doesFileExceedMax = true;
             info.isFileError = true;
         } else {
             user_request = env.fs_readFileSync(fileUpload.tempfile);
             env.fs_unlinkSync(fileUpload.tempfile);
             info.hasInputItems = true;
         }
     } else if (typeof request.params.user_results != 'undefined') {
         user_request = request.params.user_results;
         info.hasInputItems = true;
     }
     
     //Try parsing JSON, if this fails show error to user
     if (typeof user_request != 'undefined'){
         try {
             JSON.parse(user_request);
         } catch (err) {
             info.isFileError = true;
             info.isJSONIllegal = true;
             info.hasInputItems = false;
             info.jsonError = String(err).replace(/\(.*/,'');
             user_request = '';
         }
     }
     
     if (datatype ==='phenotypes') {
         info.isPhenotype='True';
     }

     addCoreRenderers(info, 'analyze', datatype);

     //Add pup_tent libs
     info.pup_tent_css_libraries.push("/monarch-main.css");
     info.pup_tent_css_libraries.push("/monarch-specific.css");
     info.pup_tent_css_libraries.push("/imagehover.css");

     info.pup_tent_js_libraries.push("/Analyze.js");
     addPhenogridFiles(info);
     info.pup_tent_js_libraries.push("/stupidtable.min.js");
     info.pup_tent_js_libraries.push("/tables.js");
     
     info.pup_tent_js_variables.push.apply(info.pup_tent_js_variables,
             [
                 {name:'user_input',value: user_request}
             ]);
     info.monarch_launchable = [];
     info.monarch_launchable.push.apply(info.monarch_launchable,
             [
                 'AnalyzeInit(user_input)'
             ]);

     info.title = 'Monarch Analysis';

     var output = pup_tent.render('analyze.mustache',info,'monarch_base.mustache');
     return web.wrapHTML(output);
}

function analyzeByDatatypeGetHandler(request, datatype, fmt) {
    var target = web.getParam(request, 'target');
    var species = web.getParam(request, 'species');
    var mode = web.getParam(request, 'mode');
    var input_items = web.getParam(request, 'input_items');
    var limit = web.getParam(request, 'limit');
    var user_results = web.getParam(request, 'user_results');
    //console.log('   target, species, mode, limit, user_results, input_items: ', target, species, mode, limit, user_results, input_items);

     var tf = {};

     // deprecated: it is no longer possible to get a 'target' param from
     // the analyze form. However, we support legacy URLs for query results.
     // (mostly for test purposes)
     if (target == "" || target == "All") {
         target = null;
     }
     else {
         engine.warn("Use of target as a parameter is deprecated");
         tf.target = target;
     }

     if (species == "" || species == "All" || typeof species === 'undefined') {
         species = null;
     }
     else {
         tf.species = species;
     }

     engine.log("analyze...datatype is ..."+datatype);
     engine.log("Target="+target); // deprecated
     engine.log("Species="+species);
     engine.log("ResultFilter="+JSON.stringify(tf));
     var info =
         {
             target_filter : tf,
             datatype: datatype,
             results:[]
         };
     var limit = 100;

     if (input_items != null) {
         engine.log("input_items ..."+JSON.stringify(input_items));
         var input_items = itemsToArray(input_items);
         var splitLabels;
         //Grabs labels for IDs
         for (var spn = 0; spn < input_items.length; spn++) {
             if (input_items[spn]){
                var phenoInfo = engine.fetchClassInfo(input_items[spn],{level:0})
                 if (phenoInfo.label) {
                     if (splitLabels){
                         splitLabels += "+"+phenoInfo.label;
                     }else{
                         splitLabels = phenoInfo.label;
                     }
                 }
             }
         }
         info.splitLabels = splitLabels;
         input_items = engine.mapIdentifiersToPhenotypes( input_items ).join().split(',');
         engine.log("input items...."+JSON.stringify(input_items));
         engine.log("# of input items..."+input_items.length);


         var resultObj = engine.searchByAttributeSet(input_items, tf, limit);
         info.results = resultObj.results;
         engine.log("ResultsInput: "+info.results.length);

         //info.input_items = resultObj.query_IRIs;
         info.input_items = input_items.join(" ");
         info.hasInputItems = true;

         info.target_species=species;
     } else if (user_results) {
         info.hasInputItems = true;
     } else {
         info.hasInputItems = false;
     }
     if (fmt != null) {
         return formattedResults(info,fmt,request);
     }
     info.limit = limit;

     info.singleSpecies = true;
     
     if (info.target_species === null || species === null || info.target_species == "") {
         info.singleSpecies = false;
     }

     if (info.singleSpecies) {
         info.speciesHref = genExternalHref('source', engine.mapSpeciesIdentifierToTaxon(info.target_species))
     }
     
     if ((mode == 'compare') || (user_results)){
         info.hasTable = false;
     } else {
         info.hasTable = true;
     }

     addCoreRenderers(info, 'analyze', datatype);

     //Add pup_tent libs
     info.pup_tent_css_libraries.push("/monarch-main.css");
     info.pup_tent_css_libraries.push("/monarch-specific.css");
     info.pup_tent_css_libraries.push("/imagehover.css");

     info.pup_tent_js_libraries.push("/Analyze.js");
     
     addPhenogridFiles(info);
     
     info.pup_tent_js_libraries.push("/stupidtable.min.js");
     info.pup_tent_js_libraries.push("/tables.js");

     info.monarch_launchable = [];
     info.monarch_launchable.push.apply(info.monarch_launchable,
             [
                 'AnalyzeInit()'
             ]);

     info.title = 'Monarch Analysis';

     info.results = info.results.filter( function(a) { return a.combinedScore > 0 } );
     info.resultsTable = function() {
         return genTableOfAnalysisSearchResults(info.results, info.singleSpecies);
     };
     
     if ((mode == 'compare') || (mode == 'search') 
             || (user_results)){
         info.hasResults = true;
     } else {
         info.hasResults = false;
     }

     info.downloadURL = function() {
         var inputFix = info.input_items.trim();
         var str = "/analyze/" + datatype + ".json?input_items=" + inputFix.split(" ").join("+");
         if (str.indexOf(',')){
             str = str.replace(/,/g ,'+');
         }
         str += "&limit=" + info.limit + "&target_species="
         if (info.target_species !== null) {
             str += info.target_species;
         }
         return str;
     }

     if (datatype ==='phenotypes') {
         info.isPhenotype='True';
     }

     var output = pup_tent.render('analyze.mustache',info,'monarch_base.mustache');
     return web.wrapHTML(output);
}

//web.wrapRoutePost(app, '/analyze/:datatype.:fmt?', '/analyze/{datatype}/', ['datatype', 'fmt'], analyzeByDatatypePostHandler);
web.wrapRouteGet(app, '/analyze/:datatype.:fmt', '/analyze/{datatype}.{fmt}', ['datatype', 'fmt'], analyzeByDatatypeGetHandler);
web.wrapRouteGet(app, '/analyze/:datatype/', '/analyze/{datatype}/', ['datatype'], analyzeByDatatypeGetHandler);
web.wrapRouteGet(app, '/analyze/:datatype', '/analyze/{datatype}', ['datatype'], analyzeByDatatypeGetHandler);


 app.get('/labs/classenrichment', function(request) {
     var info = {};
     addCoreRenderers(info);
     info.pup_tent_css_libraries.push("http://cdn.datatables.net/1.10.6/css/jquery.dataTables.css");
     info.pup_tent_js_libraries.push("http://cdn.datatables.net/1.10.6/js/jquery.dataTables.js");
     info.pup_tent_js_libraries.push("/class-enrichment.js");
     var output = pup_tent.render('class-enrichment-demo.mustache',info,'monarch_base.mustache');
     return response.html(output);
 });

 /**
  * Mostly copied from parseFileUpload from ringo/http
  * See note above in upload function, we update this to implement a limit when
  * streaming user uploaded data into temp files
  * 
  * 
  * Parses a multipart MIME input stream.
  * Parses a multipart MIME input stream.
  * @param {Object} request the JSGI request object
  * @param {Object} params the parameter object to parse into. If not defined
  *        a new object is created and returned.
  * @param {string} encoding optional encoding to apply to non-file parameters.
  *        Defaults to "UTF-8".
  * @param {function} streamFactory factory function to create streams for mime parts
  * @param {int} limit streaming to number of bytes
  * @returns {Object} the parsed parameter object
  */
 function parseFileUploadWithLimit (request, params, encoding, streamFactory, lim) {
     
     // used for multipart parsing
     var HYPHEN  = "-".charCodeAt(0);
     var CR = "\r".charCodeAt(0);
     var CRLF = new ByteString("\r\n", "ASCII");
     var EMPTY_LINE = new ByteString("\r\n\r\n", "ASCII");

     params = params || {};
     encoding = encoding || "UTF-8";
     streamFactory = streamFactory || BufferFactory;
     var boundary = getMimeParameter(request.headers["content-type"], "boundary");
     if (!boundary) {
         return params;
     }
     boundary = new ByteArray("--" + boundary, "ASCII");
     var input = request.input;
     var buflen = 8192;
     var refillThreshold = 1024; // minimum fill to start parsing
     var buffer = new ByteArray(buflen); // input buffer
     var data;  // data object for current mime part properties
     var stream; // stream to write current mime part to
     var eof = false;
     // the central variables for managing the buffer:
     // current position and end of read bytes
     var position = 0, limit = 0;
     var bytesStreamed = 0;

     var refill = function(waitForMore) {
         if (position > 0) {
             // "compact" buffer
             if (position < limit) {
                 buffer.copy(position, limit, buffer, 0);
                 limit -= position;
                 position = 0;
             } else {
                 position = limit = 0;
             }
         }
         // read into buffer starting at limit
         var totalRead = 0;
         do {
             var read = input.readInto(buffer, limit, buffer.length);
             if (read > -1) {
                 totalRead += read;
                 limit += read;
             } else {
                 eof = true;
             }
         } while (waitForMore && !eof && limit < buffer.length);
         return totalRead;
     };

     refill();

     while (position < limit) {
         if (!data) {
             // refill buffer if we don't have enough fresh bytes
             if (!eof && limit - position < refillThreshold) {
                 refill(true);
             }
             var boundaryPos = buffer.indexOf(boundary, position, limit);
             if (boundaryPos < 0) {
                 throw new Error("boundary not found in multipart stream");
             }
             // move position past boundary to beginning of multipart headers
             position = boundaryPos + boundary.length + CRLF.length;
             if (buffer[position - 2] == HYPHEN && buffer[position - 1] == HYPHEN) {
                 // reached final boundary
                 break;
             }
             var b = buffer.indexOf(EMPTY_LINE, position, limit);
             if (b < 0) {
                 throw new Error("could not parse headers");
             }
             data = {};
             var headers = [];
             buffer.slice(position, b).split(CRLF).forEach(function(line) {
                 line = line.decodeToString(encoding);
                 // unfold multiline headers
                 if ((strings.startsWith(line, " ") || strings.startsWith(line, "\t")) && headers.length) {
                     arrays.peek(headers) += line;
                 } else {
                     headers.push(line);
                 }
             });
             for (var headerkey in headers) {
                var header = headers[headerkey];
                if (strings.startsWith(header.toLowerCase(), "content-disposition:")) {
                  data.name = getMimeParameter(header, "name");
                  data.filename = getMimeParameter(header, "filename");
                } else if (strings.startsWith(header.toLowerCase(), "content-type:")) {
                  data.contentType = header.substring(13).trim();
                }
             }
             // move position after the empty line that separates headers from body
             position = b + EMPTY_LINE.length;
             // create stream for mime part
             stream = streamFactory(data, encoding);
         }
         boundaryPos = buffer.indexOf(boundary, position, limit);
         if (boundaryPos < 0) {
             // no terminating boundary found, slurp bytes and check for
             // partial boundary at buffer end which we know starts with "\r\n--"
             // but we just check for \r to keep it simple.
             var cr = buffer.indexOf(CR, Math.max(position, limit - boundary.length - 2), limit);
             var end =  (cr < 0) ? limit : cr;
             if (typeof lim != 'undefined' && bytesStreamed > lim){
                 params.hit_limit = true;
                 stream.close();
                 if (typeof data.value === "string") {
                     mergeParameter(params, data.name, data.value);
                 } else {
                     mergeParameter(params, data.name, data);
                 }
                 data = stream = null;
                 return params; 
             } else {
                 stream.write(buffer, position, end);
                 bytesStreamed += end;
                 // stream.flush();
                 position = end;
             }
             if (!eof) {
                 refill();
             }
         } else {
             if (typeof lim != 'undefined' && bytesStreamed > lim){
                 params.hit_limit = true;
                 stream.close();
                 if (typeof data.value === "string") {
                     mergeParameter(params, data.name, data.value);
                 } else {
                     mergeParameter(params, data.name, data);
                 }
                 data = stream = null;
                 return params;
             }
             // found terminating boundary, complete data and merge into parameters
             stream.write(buffer, position, boundaryPos - 2);
             stream.close();
             position = boundaryPos;
             if (typeof data.value === "string") {
                 mergeParameter(params, data.name, data.value);
             } else {
                 mergeParameter(params, data.name, data);
             }
             data = stream = null;
         }
     }
     return params;
 }


function resolveByIdHandler(request, id, fmt) {

    engine.log("PhenotypeID= "+id);

    //Curify ID if needed
    if (/_/.test(id)){
        id = id.replace("_",":");
    }

    // Figure out where we should redirect
    var nodeByID = engine.getGraphNodeByID(id, engine.config.scigraph_data_url);
    var graph = new bbop.model.graph();
    graph.load_json(nodeByID);
    var node = graph.get_node(id);
    if (node) {
        var metadata = node.metadata();

        var variant_categories = ['sequence alteration','variant locus','sequence feature']

        if (metadata && metadata['category']){
            var category = metadata['category'][0];
            if (variant_categories.indexOf(category) > -1){
                return web.wrapRedirect(genURL('variant', id));
            }
            else {
                return web.wrapRedirect(genURL(category.toLowerCase(), id));
            }
        } else {
            // If we make it here, use the generic not found page for now
            return notFoundResponse("Cannot find "+id);
        }
    }
    else {
        // If we make it here, use the generic not found page for now
        return notFoundResponse("Cannot find "+id);
    }
}

// Order matters here in the declaration of these routes.
web.wrapRouteGet(app, '/resolve/:id.:fmt?', '/resolve/{id}.{fmt}', ['id', 'fmt'], resolveByIdHandler);
web.wrapRouteGet(app, '/resolve/:id', '/resolve/{id}', ['id'], resolveByIdHandler);


 //TODO Delete this, for testing of the new ontology browser
 app.get('/labs/phenotype/:id.:fmt?',
         function(request, id, fmt){

             engine.log("PhenotypeID= "+id);
             
             //Curify ID if needed
             if (/_/.test(id)){
                 engine.log("ID contains underscore, replacing with : and redirecting");
                 var newID = id.replace("_",":");
                 return web.wrapRedirect(genURL('phenotype',newID));
             }

             // Rendering.
             var info = {};
             info = engine.fetchClassInfo(id, {level:1});
             
             if (fmt != null) {
                 // TODO
                 return formattedResults(info, fmt,request);
             }
             
             addCoreRenderers(info, 'phenotype', id);
             addGolrStaticFiles(info);
             info.pup_tent_js_variables.push({name:'global_scigraph_url',
                 value: engine.config.scigraph_url});
             
             info.pup_tent_css_libraries.push("/monarch-main.css");
             info.pup_tent_css_libraries.push("/monarch-specific.css");
             info.pup_tent_js_libraries.push("/interactive-browse.js");
             
             //Load variables for client side tables
             var disease_filter = [{ field: 'subject_category', value: 'disease' }];
             addGolrTable(info, "object_closure", id, 'disease-table', disease_filter, 'disease_phenotype',"#diseases");
             info.diseaseNum = engine.fetchAssociationCount(id, 'object_closure', disease_filter);
             
             var gene_filter = [{ field: 'subject_category', value: 'gene' }];
             addGolrTable(info, "object_closure", id, 'gene-table', gene_filter, 'gene_phenotype', "#genes");
             info.geneNum = engine.fetchAssociationCount(id, 'object_closure', gene_filter);
             
             var genotype_filter = [{ field: 'subject_category', value: 'genotype' }];
             addGolrTable(info, "object_closure", id, 'genotype-table', genotype_filter, 'genotype_phenotype',"#genotypes");
             info.genotypeNum = engine.fetchAssociationCount(id, 'object_closure', genotype_filter);
             
             var model_filter = [{ field: 'subject_category', value: 'model' }];
             addGolrTable(info, "object_closure", id, 'model-table', model_filter, 'genotype_phenotype',"#models");
             info.modelNum = engine.fetchAssociationCount(id, 'object_closure', model_filter);
             
             var variant_filter = [{ field: 'subject_category', value: 'variant' }];
             addGolrTable(info, "object_closure", id, 'variant-table', variant_filter, 'variant_phenotype',"#variants");
             info.variantNum = engine.fetchAssociationCount(id, 'object_closure', variant_filter);
             
             var pathway_filter = [{ field: 'object_category', value: 'pathway' }];
             addGolrTable(info, "subject_closure", id, 'pathway-table', pathway_filter, 'phenotype_pathway',"#pathways");
             info.pathwayNum = engine.fetchAssociationCount(id, 'subject_closure', pathway_filter);
             
             
             // Add templates
             info.includes.disease_anchor = addDiseaseAnchor(info);
             info.includes.disease_table = addDiseaseTable();
             
             // Add gene table
             info.includes.gene_anchor = addGeneAnchor(info);
             info.includes.gene_table = addGeneTable();
             
             // Add genotype table
             info.includes.genotype_anchor = addGenotypeAnchor(info);
             info.includes.genotype_table = addGenotypeTable();
             
             // Add model table
             info.includes.model_anchor = addModelAnchor(info);
             info.includes.model_table = addModelTable();
             
             // Add variant table
             info.includes.variant_anchor = addVariantAnchor(info);
             info.includes.variant_table = addVariantTable();
             
             // Add pathway table
             info.includes.pathway_anchor = addPathwayAnchor(info);
             info.includes.pathway_table = addPathwayTable();
             
             if (typeof info.synonyms != 'undefined'){
                 info.aka = info.synonyms.join(", ");
             }
             
             info.xrefs = function() {
                 if (info.database_cross_reference != null) {
                 return info.database_cross_reference.map(function(r) { return genExternalHref('source',{id : r}) }).join(", ");
                 //return info.database_cross_reference.join(", ");
                 }
             };

             info.title = 'Monarch Phenotype: '+info.label+' ('+ info.id+')';
             
             // variables checking existence of data in sections
             info.hasDef = function() {return checkExistence(info.definitions)};
             info.hasAka = function() {return checkExistence(info.synonyms)};
             info.hasXrefs = function() {return checkExistence(info.database_cross_reference)};
             info.hasGenes = true;
             info.pup_tent_js_variables.push({name:'globalID',value:id});
             info.monarch_launchable.push("getInteractiveOntologyBrowser(globalID)");

             var output = pup_tent.render('phenotype-labs.mustache', info,
                                          'monarch_base.mustache');
             return response.html(output);
             return res;
  });


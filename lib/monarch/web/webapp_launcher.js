//
// node|ringo webapp_launcher.js [--port 8080] [dev]
//

var env = require('serverenv.js');
var platform = env.isRingoJS() ? 'RingoJS' : 'NodeJS';
var envName = 'dev';
var port = '8080';
var args = env.getArgv().slice(1);

if (args.length > 1 && args[0] === '--port') {
	port = args[1];
	if (args.length > 2) {
		envName = args[2];
	}
}
else if (args.length > 0) {
	envName = args[0];
	if (args.length > 2 && args[1] === '--port') {
		port = args[2];
	}
}

console.log('Starting server' + '.' +
			' Platform: ' + platform + '.' +
			' Environment: ' + envName + '.' +
			' Port: ' + port + '.');

var defaultConfigFile = "conf/server_config_dev.json";
var golrConfigFile = "conf/golr-conf.json";

if (envName === 'production') {
	defaultConfigFile = "conf/server_config_production.json";
}
else if (envName === 'stage') {
	defaultConfigFile = "conf/server_config_stage.json";
}

console.log('defaultConfigFile: ' + defaultConfigFile + ' golrConfigFile: ' + golrConfigFile);

var defaultConfig = env.readJSON(defaultConfigFile);
var golrConfig = env.readJSON(golrConfigFile);
global.defaultPort = port;

var webapp = require('web/webapp.js');
webapp.configServer(defaultConfig, golrConfig);
webapp.startServer();


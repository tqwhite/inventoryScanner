
var qtools = require('qtools'),
	qtools = new qtools(),
	machina = require('machina'),
	terminalInterface = require('./terminalInterface'),
	dataInterface = require('./dataInterface');

//INITIALIZATION ====================================

var self = this;

var projectBasePath = process.env.SCANNER_BASE_PATH;
if (!projectBasePath) {
	qtools.die("there must be an environment variable named SCANNER_BASE_PATH pointing to a folder that includes a folder named 'config'");
}

var scannerConfigName = process.env.SCANNER_CONFIG_NAME;
if (!scannerConfigName) {
	qtools.die("there must be an environment variable named SCANNER_CONFIG_NAME referring to a file in SCANNER_BASE_PATH/config/configs/");
}

var loggingBasePath = process.env.SCANNER_LOG_FILE_DIRECTORY_PATH;
if (!loggingBasePath) {
	qtools.die("there must be an environment variable named SCANNER_LOG_FILE_DIRECTORY_PATH pointing to a folder for journal and log files");
}

var config = require(projectBasePath + '/' + 'config/configs/' + scannerConfigName + '.js');
global.config = config;

var commandLineParms = qtools.parseCommandLine();

var port = commandLineParms.values.port || '1337';

global.terminalId = port;

//LOCAL FUNCTIONS ====================================

var resetModel = function() {
	self.dataModel = {};
}

var scanRequest = {
	type: 'wantScan',
	dataModelPropertyName: 'scanCode',
	replyToInput: 'inputA',
	prompt: 'Trigger Scan'
};

var quantityRequest = {
	type: 'wantNumber',
	dataModelPropertyName: 'quantity',
	replyToInput: 'inputA',
	prompt: 'Enter Quantity'
};

var typeRequest = {
	type: 'wantCode',
	dataModelPropertyName: 'type',
	replyToInput: 'inputA',
	prompt: 'Enter Type (a,b,c)<!newLine!>a:add,b:sub,c:rep'
};

var waitForSaveRequest = {
	type: 'saveDisplay',
	requestInput: 'wait',
	prompt: 'SAVING...'
}

var successSaveRequest = {
	type: 'saveDisplay',
	requestInput: 'success',
	prompt: 'SAVE SUCCESS'
}

var errorSaveRequest = {
	type: 'saveDisplay',
	requestInput: 'error',
	prompt: 'ERROR REPEAT SCAN'
}

try {
	var startScreen = qtools.fs.readFileSync(projectBasePath + '/config/startScreen.vt100').toString().replace(/\n/g, '\n\r');
} catch (e) {
	var startScreen = qtools.fs.readFileSync(projectBasePath + '/system/scanServer/startScreen.vt100').toString().replace(/\n/g, '\n\r');
}

var startList = startScreen.split("\n");

var updateModel = function(propertyName, inData, replyToInput) {
	if (propertyName == 'reset') {
		restartMachine();
		return;
	}

	self.dataModel[propertyName] = inData;
	finiteMachine.handle(replyToInput);
};


var startMachine = function() {
	finiteMachine.transition('getScan');
}

var restartMachine = function() {
	resetModel();
	finiteMachine.transition('getScan');
}

var saveCallback = function(err, data) {
	if (!err) {
		this.handle('success');
	} else {

console.log(err.toString());
		this.handle('error');
	}
};

var terminalInit = {
	port: port,
	ipAddress: '0.0.0.0',
	appName: 'inventoryScanner',
	initialText: startScreen,
	screenStructure: {
		promptRow: 5,
		echoRow: 10,
		echoLastRow: 16,
		leftCol: 3
	},
	updateDataModelFunction: updateModel,
	initiateProcessing: startMachine
};

//MACHINA ====================================

var finiteMachine = new machina.Fsm({

	initialize: function(options) {
		self.terminalInterface = new terminalInterface(terminalInit);
		self.dataInterface = new dataInterface({
			helixAccessParms: global.config.getHelixParms()
		});
	},

	initialState: 'uninitialized',

	states: {
		uninitialized: {
			"*": function() {
				this.deferUntilTransition();
			}
		},
		getScan: {

			_onEnter: function() {
				self.terminalInterface.newRequest(scanRequest);
			},

			'inputA': function() {
				this.transition('getQuantity');
			},

			'reset': function() {
				restartMachine();
			}
		},
		getQuantity: {

			_onEnter: function() {
				self.terminalInterface.newRequest(quantityRequest);
			},

			'inputA': function() {
				this.transition('getType');
			},

			'reset': function() {
				restartMachine();
			}
		},
		getType: {

			_onEnter: function() {
				self.terminalInterface.newRequest(typeRequest);
			},

			'inputA': function() {
				this.transition('save');
			},

			'reset': function() {
				restartMachine();
			}
		},
		save: {

			_onEnter: function() {
				self.terminalInterface.newRequest(waitForSaveRequest);
				self.dataInterface.save('barcodeEntry', self.dataModel, saveCallback.bind(this));
			},

			'success': function() {
				self.terminalInterface.newRequest(successSaveRequest);
				setTimeout(function() {
					this.transition('getScan');
				}.bind(this), 3000);
			},

			'error': function() {
				self.terminalInterface.newRequest(errorSaveRequest);
				setTimeout(function() {
					this.transition('getScan');
				}.bind(this), 3000);
			}
		},

		reset: function() {
			restartMachine();
		}
	}
}

);

//METHODS AND PROPERTIES ====================================

this.dataModel = {};


//END  ============================================================









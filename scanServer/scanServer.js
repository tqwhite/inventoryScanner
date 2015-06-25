
var qtools = require('qtools');
qtools = new qtools(),
machina = require('machina');;

//INITIALIZATION ====================================

var self = this;

var projectBasePath = process.env.SCANNER_BASE_PATH;
if (!projectBasePath) {
	qtools.die("there must be an environment variable named SCANNER_BASE_PATH pointing to a folder named 'config' containing lightningPipe.js and localEnvironment.js");
}

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
	prompt: 'Quantity'
};

var typeRequest = {
	type: 'wantCode',
	dataModelPropertyName: 'type',
	replyToInput: 'inputA',
	prompt: 'Type (a,b,c)'
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

var terminalInterface = require('./terminalInterface');

var startScreen = qtools.fs.readFileSync(projectBasePath + '/system/scanServer/startScreen.vt100').toString().replace(/\n/g, '\n\r');
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

var terminalInit = {
	port: 1337,
	ipAddress: '0.0.0.0',
	appName: 'inventoryScanner',
	initialText: startScreen,
	screenStructure: {
		promptRow: 5,
		echoRow: 8,
		echoLastRow:16,
		leftCol: 3
	},
	updateDataModelFunction: updateModel,
	initiateProcessing: startMachine
};

//MACHINA ====================================

var finiteMachine = new machina.Fsm({

	initialize: function(options) {
		self.terminalInterface = new terminalInterface(terminalInit);
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
				console.dir({
					"SELF.DATAMODEL": self.dataModel
				});
				self.terminalInterface.newRequest(waitForSaveRequest);
				setTimeout(function() {
					this.handle('success');
				}.bind(this), 3000);
			},

			'success': function() {
				self.terminalInterface.newRequest(successSaveRequest);
				setTimeout(function() {
					this.transition('getScan');
				}.bind(this), 3000);
			},

			'error': function() {
				self.terminalInterface.newRequest(errorSaveRequest);
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







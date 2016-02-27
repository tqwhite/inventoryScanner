
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





var chooseUiRequest = {
	type: 'chooseUi',
	dataModelPropertyName: 'uiChoice',
	replyToInput: 'inputA',
	prompt: 'Choose User Mode<!newLine!>a:General Entry<!newLine!>b:Immediate Subtract<!newLine!>'
};





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

var comboRequest = {
	type: 'wantCombo',
	dataModelPropertyName: 'quantity',
	prefixCharPropertyName: 'type',
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

var getScreenBackground = function(name) {


	try {
		var startScreen = qtools.fs.readFileSync(projectBasePath + '/config/' + name).toString().replace(/\n/g, '\n\r');
	} catch (e) {
		var startScreen = qtools.fs.readFileSync(projectBasePath + '/system/scanServer/' + name).toString().replace(/\n/g, '\n\r');
	}

	return startScreen
}

var startScreen = getScreenBackground('startScreen.vt100');

var startList = startScreen.split("\n");

var uiMap = {
	a: 'generalEntry',
	b: 'autoSubtractEntry'
};

var setUiChoice = function(propertyName, inData, replyToInput) {
	self.uiChoice = inData ? inData : 'a';
	finiteMachine.handle(replyToInput);
	return;
};

var getUpdateModelFunction = function(finiteMachine) {
	return function(propertyName, inData, replyToInput) {
		if (propertyName == 'reset') {
			restartMachine();
			return;
		}
		if (propertyName == 'uiChoice') {
			self.uiChoice = uiMap[inData] ? uiMap[inData] : 'generalEntry';
			finiteMachine.handle(replyToInput);
			return;
		}

		self.dataModel[propertyName] = inData;
		
		if (replyToInput){
			finiteMachine.handle(replyToInput);
		}
	};
};


/*

next:

move local vars into an object that can be sent to machine model constructors

*/

var startUiMachine = function() {
	finiteMachine.transition('chooseUi');
}


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
	updateDataModelFunction: setUiChoice,
	initiateProcessing: startUiMachine
};

//MACHINA ====================================



var startActionMachine = function(uiChoice) {
	var machineSpecs;
	var firstStep = '';

	switch (uiMap[uiChoice]) {
		case 'generalEntry':
			machineSpecs = {

				initialize: function(options) {
					// 		self.terminalInterface = new terminalInterface(terminalInit);
					// 		self.dataInterface = new dataInterface({
					// 			helixAccessParms: global.config.getHelixParms()
					// 		});
				},

				initialState: 'getScan',

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
			};
			firstStep = 'getScan';
			break;

		case 'autoSubtractEntry':
			machineSpecs = {

				initialize: function(options) {
					// 		self.terminalInterface = new terminalInterface(terminalInit);
					// 		self.dataInterface = new dataInterface({
					// 			helixAccessParms: global.config.getHelixParms()
					// 		});
				},

				initialState: 'getScan',

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
							var request = qtools.clone(comboRequest);
							request.prompt = "Auto-Subtract<!newLine!>Quantity";
							self.terminalInterface.newRequest(request);
							self.dataModel.type = 'b'; //this is auto-subtract
						},

						'inputA': function() {
//							this.transition('save');
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
						},

						'reset': function() {
							restartMachine();
						}
					},
// 					save: {
// 
// 						_onEnter: function() {
// 							self.terminalInterface.newRequest(waitForSaveRequest);
// 							self.dataInterface.save('barcodeEntry', self.dataModel, saveCallback.bind(this));
// 						},
// 
// 						'success': function() {
// 							self.terminalInterface.newRequest(successSaveRequest);
// 							setTimeout(function() {
// 								this.transition('getScan');
// 							}.bind(this), 3000);
// 						},
// 
// 						'error': function() {
// 							self.terminalInterface.newRequest(errorSaveRequest);
// 							setTimeout(function() {
// 								this.transition('getScan');
// 							}.bind(this), 3000);
// 						}
// 					},

					reset: function() {
						restartMachine();
					}
				}
			};
			self.terminalInterface.initialText = getScreenBackground('subtractModeScreen.vt100'); //needs to precede the start of the machine
			firstStep = 'getScan';

			break;

	}
	finiteMachine = new machina.Fsm(machineSpecs);
	self.terminalInterface.updateDataModelFunction = getUpdateModelFunction(finiteMachine);


	finiteMachine.transition(firstStep);
}





var chooseUiMachine = {

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
		chooseUi: {

			_onEnter: function() {
				self.terminalInterface.newRequest(chooseUiRequest);
			},

			'inputA': function() {
				startActionMachine(self.uiChoice);
				return;
			},

			'reset': function() {
				restartMachine();
			}
		},

		reset: function() {
			restartMachine();
		}
	}
};

var finiteMachine = new machina.Fsm(chooseUiMachine);

//METHODS AND PROPERTIES ====================================

this.dataModel = {};


//END  ============================================================














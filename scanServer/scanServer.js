
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

var chooseUiRequest = {
	type: 'chooseUi',
	dataModelPropertyName: 'uiChoice',
	replyToInput: 'inputB',
	prompt: 'Choose User Mode<!newLine!><!newLine!> a: Auto Add<!newLine!> b: Auto Subtract<!newLine!> c: Auto Replace<!newLine!>enter: Manual Mode<!newLine!>'
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
		var screenText = qtools.fs.readFileSync(projectBasePath + '/config/' + name).toString().replace(/\n/g, '\n\r');
	} catch (e) {
		var screenText = qtools.fs.readFileSync(projectBasePath + '/system/scanServer/defaultScreenLib/' + name).toString().replace(/\n/g, '\n\r');
	}

	return screenText
}

var initialScreen = getScreenBackground('startScreen.vt100');

var startList = initialScreen.split("\n");

var uiMap = {
	'<enter>': 'generalEntry',
	a: 'autoAddEntry',
	b: 'autoSubtractEntry',
	c: 'autoReplaceEntry'
};

//MACHINA SUPPORT FUNCTIONS ====================================

var setUiChoice = function(propertyName, inData, replyToInput) {
	self.uiChoice = inData ? inData : 'a';
	finiteMachine.handle(replyToInput);
	return;
};

var startUiMachine = function() {
	finiteMachine = new machina.Fsm(chooseUiMachine);
	finiteMachine.transition('chooseUi');
}

var getUpdateModelFunction = function(finiteMachine) {
	return function(propertyName, inData, replyToInput) {
		if (propertyName == 'reset') {
			finiteMachine.handle('reset');
			return;
		}
		if (propertyName == 'uiChoice') {
			self.uiChoice = inData;
			finiteMachine.handle(replyToInput);
			return;
		}

		self.dataModel[propertyName] = inData;

		if (replyToInput) {
			finiteMachine.handle(replyToInput);
		}
	};
};

var startScanning = function() {
	finiteMachine.transition('getScan');
}

var restartScanning = function() {
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

var resetModel = function() {
	self.dataModel = {};
}

var constructSubStatus=function(dataModel){
	var len=dataModel.scanCode.length,
	showCode='-'+dataModel.scanCode.substring(len-4, len);
	return "(prev: "+dataModel.type+' '+dataModel.quantity+" "+showCode+")";
};

//MACHINA ====================================

var startActionMachine = function(uiChoice) {

	var machineSpecs;
	var firstStep = '';
	
	var bindDefaultType=function(uiChoice){
		return function(){
			return uiChoice;
		}
	};
	
	var getDefaultType=function(){}
	
	var autoMachine = {

				initialize: function(options) {
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

						'inputB': function() {

							startActionMachine(self.uiChoice);
						},

						'reset': function() {
							startUiMachine();
						}
					},
					getQuantity: {

						_onEnter: function() {
							var request = qtools.clone(comboRequest);
							request.prompt = "Enter Quantity";
							self.terminalInterface.newRequest(request);
							self.dataModel.type = getDefaultType(); //this is auto-subtract
						},

						'inputA': function() {
							self.dataInterface.save('barcodeEntry', self.dataModel, saveCallback.bind(this));
						},

						'success': function() { //autoSave has save success here
							self.terminalInterface.newRequest(successSaveRequest);
							setTimeout(function() {
								this.transition('getScan');
								self.terminalInterface.writeSubStatus(constructSubStatus(self.dataModel));
							}.bind(this), 1000);
						},

						'error': function() {
							self.terminalInterface.newRequest(errorSaveRequest);
							setTimeout(function() {
								this.transition('getScan');
							}.bind(this), 1000);
						},

						'reset': function() {
							restartScanning();
						}
					},
					reset: function() {
						restartScanning();
					}
				}
			};
			
	switch (uiMap[uiChoice]) {
		case 'generalEntry':
			machineSpecs = {

				initialize: function(options) {
			self.terminalInterface.echoRow=10;
			self.terminalInterface.initialText = getScreenBackground('generalEntry.vt100');
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

						'inputB': function() {

							startActionMachine(self.uiChoice);
						},

						'reset': function() {
							startUiMachine();
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
							restartScanning();
						}
					},
					getType: {

						_onEnter: function() {
							self.terminalInterface.newRequest(typeRequest);
						},

						'inputA': function() {
							self.dataInterface.save('barcodeEntry', self.dataModel, saveCallback.bind(this));
						},

						'success': function() { //autoSave has save success here
							self.terminalInterface.newRequest(successSaveRequest);
							setTimeout(function() {
								this.transition('getScan');
								self.terminalInterface.writeSubStatus(constructSubStatus(self.dataModel));
							}.bind(this), 1000);
						},

						'error': function() {
							self.terminalInterface.newRequest(errorSaveRequest);
							setTimeout(function() {
								this.transition('getScan');
							}.bind(this), 1000);
						},

						'reset': function() {
							restartScanning();
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
								self.terminalInterface.writeSubStatus(constructSubStatus(self.dataModel));
							}.bind(this), 1000);
						},

						'error': function() {
							self.terminalInterface.newRequest(errorSaveRequest);
							setTimeout(function() {
								this.transition('getScan');
							}.bind(this), 1000);
						}
					},

					reset: function() {
						restartScanning();
					}
				}
			};
			firstStep = 'getScan';
			break;

		case 'autoAddEntry':
			machineSpecs = autoMachine;
			firstStep = 'getScan';
			getDefaultType=bindDefaultType('a');
			self.terminalInterface.screenStructure.echoRow=10;
			self.terminalInterface.initialText = getScreenBackground('addModeScreen.vt100');
			break;

		case 'autoSubtractEntry':
			machineSpecs = autoMachine;
			firstStep = 'getScan';
			getDefaultType=bindDefaultType('b');
			self.terminalInterface.screenStructure.echoRow=10;
			self.terminalInterface.initialText = getScreenBackground('subtractModeScreen.vt100');
			break;

		case 'autoReplaceEntry':
			machineSpecs = autoMachine;
			firstStep = 'getScan';
			getDefaultType=bindDefaultType('c');
			self.terminalInterface.screenStructure.echoRow=10;
			self.terminalInterface.initialText = getScreenBackground('replaceModeScreen.vt100');
			break;

	}

	finiteMachine = new machina.Fsm(machineSpecs);
	self.terminalInterface.updateDataModelFunction = getUpdateModelFunction(finiteMachine);

	finiteMachine.transition(firstStep);
}

var chooseUiMachine = {

	initialize: function(options) {
			self.terminalInterface.screenStructure.echoRow=18;
			self.terminalInterface.initialText = getScreenBackground('startScreen.vt100');
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

			'inputB': function() {

				startActionMachine(self.uiChoice);
				return;
			},

			'reset': function() {
				restartScanning();
			}
		},

		reset: function() {
			restartScanning();
		}
	}
};

var finiteMachine;

//METHODS AND PROPERTIES ====================================

self.dataModel = {};

var terminalInit = {
	port: port,
	ipAddress: '0.0.0.0',
	appName: 'Inventory Scanner v2.0',
	initialText: initialScreen,
	screenStructure: {
		promptRow: 5,
		subStatusRow: 16,
		echoRow: 18, //default, overwritten based on screen
		echoLastRow: 15,
		leftCol: 3
	},
	updateDataModelFunction: setUiChoice,
	initiateProcessing: startUiMachine
};
self.terminalInterface = new terminalInterface(terminalInit);

self.dataInterface = new dataInterface({
	helixAccessParms: global.config.getHelixParms()
});

//END  ============================================================


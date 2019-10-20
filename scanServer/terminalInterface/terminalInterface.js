'use strict';
var qtools = require('qtools'),
	qtools = new qtools(module),
	events = require('events'),
	util = require('util'),
	net = require('net'),
	machina = require('machina');

//START OF moduleFunction() ============================================================

var moduleFunction = function(args) {
	events.EventEmitter.call(this);
	this.forceEvent = forceEvent;
	this.args = args;
	this.metaData = {};
	this.addMeta = function(name, data) {
		this.metaData[name] = data;
	}

	qtools.validateProperties({
		subject: args || {},
		targetScope: this, //will add listed items to targetScope
		propList: [
			{
				name: 'port',
				optional: false
			},
			{
				name: 'ipAddress',
				optional: false
			},
			{
				name: 'appName',
				optional: false
			},
			{
				name: 'initialText',
				optional: false
			},
			{
				name: 'updateDataModelFunction',
				optional: 'false'
			},
			{
				name: 'initiateProcessing',
				optional: 'false'
			},
			{
				name: 'screenStructure',
				optional: 'false'
			}

		]
	});

	var self = this,
		forceEvent = function(eventName, outData) {
			this.emit(eventName, {
				eventName: eventName,
				data: outData
			});
		};

	//DEVICE SCREEN MANAGEMENT ====================================

	var escChar = String.fromCharCode(27),
		enterChar = String.fromCharCode(13), //note: 'x'.charCodeAt(0); gives code for character
		escPrefix = escChar + '[',
		enterChar = String.fromCharCode(13),
		bellChar = String.fromCharCode(7);

	// UTILITY STRING MAKERS =================================

	var echoStartPosition = function(){
	return {
		row: self.screenStructure.echoRow,
		col: self.screenStructure.leftCol
	};
	}

	var setNewPositionGetString = function(cursorPosition) {
		self.currentCursorPosition = cursorPosition;
		return currentPositionString(self.currentCursorPosition);
	}

	var currentPositionString = function() {
		return escPrefix + self.currentCursorPosition.row + ';' + self.currentCursorPosition.col + 'H';
	}

	var formatPositionString = function(position) {
		if (typeof (position) == 'string') {
			var row = position;
		} else {
			var row = position.row;
		}

		if (typeof (position.col) != 'undefined') {
			var col = position.col;
		} else {
			var col = self.screenStructure.leftCol;
		}

		return escPrefix + row + ';' + col + 'H';

	}

	var newLinePositionString = function() {
		return escChar + 'E' + escChar + 'E' + escPrefix + (self.screenStructure.leftCol - 1) + 'C';
	}

	var nextLinePositionString = function() {
		return escChar + 'E' + escPrefix + (self.screenStructure.leftCol - 1) + 'C';
	}

	var writeToDevice = function(writeString) {
		self.socket.write(writeString);
	}

	// WRITE ROUTINES =================================

	var initDisplay = function() {
		writeToDevice(setNewPositionGetString({
					row: 0,
					col: 0
				}) + self.initialText + setNewPositionGetString(echoStartPosition()));

		self.workingResultString = '';
		echoBuffer = '';
		echoLineCount = 1
	}

	var writePrompt = function(writeString) {
		if (writeString.match('<!newLine!>')) {
			writeString = writeString.replace(/<!newLine!>/g, newLinePositionString());
		} else {
			writeString += newLinePositionString();
		}
		writeToDevice(escPrefix + self.screenStructure.promptRow + ';' + self.screenStructure.leftCol + 'H' + clearToRight + writeString + clearToRight + currentPositionString());
	}

	// ECHO ZONE =================================

	var echoBuffer = '',
		echoLineCount = 1,
		prevPosition = echoStartPosition(),
		clearToRight = escPrefix + '0K';

	var updateEcho = function(inString) {
		if (inString == 'newLine') {
			echoBuffer = echoBuffer + clearToRight + newLinePositionString();
			echoLineCount++;
		} else {
			echoBuffer = echoBuffer + inString;
		}

		writeEcho();
	}

	var writeEcho = function() {
		var echoOutput = echoBuffer;
		writeToDevice(formatPositionString(echoStartPosition()) + echoBuffer + echoPaddingString());
	}

	var echoPaddingString = function(inString) {
		var echoRow = self.screenStructure.echoLastRow - self.screenStructure.echoRow - 3,
			needed = echoRow - echoLineCount,
			outString = '';

		for (var i = 0, len = needed; i < len; i++) {
			outString += clearToRight + newLinePositionString() + clearToRight;
		}
		return outString;

	}

	//MACHINA ====================================

	var onEnterGeneral = function(stateMachine) {
		self.currentInString = '';
		self.workingResultString = '';
		writePrompt(self.request.prompt);
	}

	var onExitGeneral = function(stateMachine) {}

	var stateMachineDefinition = {

		initialize: function(options) {
			// your setup code goes here... 
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

					initDisplay();
					onEnterGeneral(this);
				},
				'*': function() {
					writeEcho();
				},
				enter: function() {
					updateEcho(self.currentInString);
					self.workingResultString = '<enter>';
					self.updateDataModelFunction(self.request.dataModelPropertyName, self.workingResultString, self.request.replyToInput);
				},
				char: function() {

					if (!self.currentInString.match(/a|b|c/)) {
						writeEcho();
						return;
					}
					self.workingResultString = self.currentInString;
					updateEcho(self.currentInString);

					self.updateDataModelFunction(self.request.dataModelPropertyName, self.workingResultString, self.request.replyToInput);
				},
				_onExit: function() {
					onExitGeneral(this);
				}
			},
			wantScan: {
				_onEnter: function() {
					initDisplay();
					onEnterGeneral(this);
				},
				'*': function() {
					writeEcho();
				},
				enter: function() {
					if (!self.workingResultString) {
						return;
					}
					updateEcho('newLine')
					self.updateDataModelFunction(self.request.dataModelPropertyName, self.workingResultString, self.request.replyToInput);
				},
				escape: function() {
					self.updateDataModelFunction('reset');
				},
				scan: function() {
					var returnData = self.currentInString.match(/^code(.*?)edoc/, self.currentInString);
console.dir({"returnData [terminalInterface.js.scan]":returnData});


					if (!returnData){
						returnData=self.currentInString.match(/^\d\d\d+/, self.currentInString);
console.dir({"returnDatax [terminalInterface.js.scan]":returnData});


					}
					self.workingResultString = returnData[1];
					updateEcho(self.workingResultString);
					this.handle('enter');
				},

				_onExit: function() {
					onExitGeneral(this);
				}
			},
			wantNumber: {
				_onEnter: function() {
					onEnterGeneral(this);
				},
				'*': function() {
					writeEcho();
				},
				enter: function() {
					if (!self.workingResultString) {
						return;
					}
					updateEcho('newLine');
					self.updateDataModelFunction(self.request.dataModelPropertyName, self.workingResultString, self.request.replyToInput);
				},
				escape: function() {
					self.updateDataModelFunction('reset');
				},
				number: function() {
					self.workingResultString += self.currentInString;
					updateEcho(self.currentInString);
					writePrompt('Enter to Keep');
				},

				_onExit: function() {
					onExitGeneral(this);
				}
			},
			wantCombo: {
				_onEnter: function() {
					onEnterGeneral(this);
				},
				'*': function() {
					writeEcho();
				},
				enter: function() {
					if (!self.workingResultString) {
						return;
					}
					updateEcho('newLine');
					self.updateDataModelFunction(self.request.dataModelPropertyName, self.workingResultString, self.request.replyToInput);
				},
				escape: function() {
					self.updateDataModelFunction('reset');
				},
				number: function() {
					self.workingResultString += self.currentInString;
					updateEcho(self.currentInString);
					writePrompt('Enter to Keep');
				},
				char: function() {
					if (self.workingResultString) {
						return; //if a number has already been added, ignore input
					}
					if (!self.currentInString.match(/a|b|c/)) {
						writeEcho();
						return;
					}
					self.updateDataModelFunction(self.request.prefixCharPropertyName, self.currentInString);
					updateEcho(self.currentInString);

					switch (self.currentInString) {
						case 'a':
							writePrompt('ADD MODE');
							break;
						case 'b':
							writePrompt('SUBTRACT MODE');
							break;
						case 'c':
							writePrompt('REPLACE MODE');
							break;
					}
				},

				_onExit: function() {
					onExitGeneral(this);
				}
			},
			wantCode: {
				_onEnter: function() {
					onEnterGeneral(this);
				},
				'*': function() {
					writeEcho();
				},
				enter: function() {
					if (!self.workingResultString) {
						return;
					}
					updateEcho('newLine');
					self.updateDataModelFunction(self.request.dataModelPropertyName, self.workingResultString, self.request.replyToInput);
				},
				escape: function() {
					self.updateDataModelFunction('reset');
				},
				char: function() {
					if (!self.currentInString.match(/a|b|c/)) {
						writeEcho();
						return;
					}
					self.workingResultString = self.currentInString;
					updateEcho(self.currentInString);
					writePrompt('Enter to SAVE');
				},

				_onExit: function() {
					onExitGeneral(this);
				}
			},

			wantWord: {
				_onEnter: function() {
					onEnterGeneral(this);
				},
				'*': function() {},
				escape: function() {
					self.updateDataModelFunction('reset');
				},
				char: function() {
					self.workingResultString += self.currentInString;
				},

				_onExit: function() {
					onExitGeneral(this);
				}
			},
			saveDisplay: {
				_onEnter: function() {},
				wait: function() {
					writePrompt(self.request.prompt);
				},
				success: function() {
					writePrompt(self.request.prompt + bellChar);
				},
				error: function() {
					writePrompt(self.request.prompt + bellChar + bellChar + bellChar);
				},
				escape: function() {
					writePrompt("Can't (esc) " + newLinePositionString() + "during Save");
				},

				_onExit: function() {
					onExitGeneral(this);
				}
			}
		}
	};

	var detectSpecialCharStrings = function() {
		var inData = self.currentInString,
			outString;
		if (inData.match(/^code.*?edoc/)) {
console.dir({"inData [terminalInterface.js.detectSpecialCharStrings]":inData});


			outString = 'scan';
		} else if (inData.match(/^\d\d\d+/)) {
console.dir({"inDataX [terminalInterface.js.detectSpecialCharStrings]":inData});


			outString = 'scan';
		} else if (inData.match(/\d/)) {
			outString = 'number';
		} else if (inData.match(/\w/)) {
			outString = 'char';
		} else if (inData.match(new RegExp(enterChar))) {
			outString = 'enter';
		} else if (inData.match(new RegExp(escChar))) {
			outString = 'escape';
		} else {
			outString = 'xx';
		}
		return outString;
	}

	//METHODS AND PROPERTIES ====================================

	this.newRequest = function(request) {
		self.request = request
		stateMachine.transition(self.request.type);
		if (self.request.requestInput) {
			stateMachine.handle(self.request.requestInput);
		}
	}

	this.request = {};

	this.workingResultString = '';

	this.writeSubStatus = function(writeString) {
		if (writeString.match(/(<!newLine!>|<!nextLine!>)/)) {
			writeString = writeString
				.replace(/<!newLine!>/g, newLinePositionString())
				.replace(/<!nextLine!>/g, nextLinePositionString());
		} else {
			writeString += newLinePositionString();
		}
		writeToDevice(escPrefix + self.screenStructure.subStatusRow + ';' + self.screenStructure.leftCol + 'H' + clearToRight + writeString + clearToRight + currentPositionString());
	}

	//SCANNER OPERATION ====================================

	var startupFunction = function() {
		initDisplay();
		self.socket.pipe(self.socket);
		self.socket.on('data', scannerDataReceivingCallback);
	}

	var scannerDataReceivingCallback = function(inData) {
		self.currentInString = inData.toString();
		var charType = detectSpecialCharStrings();
		stateMachine.handle(charType);
	}

	var server = net.createServer(function(socket) {
		self.socket = socket;
		startupFunction();
		self.initiateProcessing();
	});

	server.listen(self.port, self.ipAddress);

	console.log(self.appName + ' listening on port ' + self.port);

	var stateMachine = new machina.Fsm(stateMachineDefinition);

	return this;
};

//END OF moduleFunction() ============================================================

util.inherits(moduleFunction, events.EventEmitter);
module.exports = moduleFunction;





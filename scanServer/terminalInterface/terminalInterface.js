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
	// 		errorRow: 3,
	// 		promptRow: 4,
	// 		echoRow: 6,
	// 		summary: 9
	//		leftCol: 3

	//DEVICE SCREEN MANAGEMENT ====================================

	var escChar = String.fromCharCode(27),
		enterChar = String.fromCharCode(13), //note: 'x'.charCodeAt(0); gives code for character
		escPrefix = escChar + '[',
		enterChar = String.fromCharCode(13);

	var echoStartPosition = {
		row: self.screenStructure.echoRow,
		col: self.screenStructure.leftCol
	}

	var initDisplay = function() {
		writeToDevice(setNewPositionGetString({
					row: 0,
					col: 0
				}) + self.initialText + setNewPositionGetString(echoStartPosition));
	}
	var writeToDevice = function(writeString) {
	//		console.log("writeString='"+writeString.replace(escChar,  'XXXXX').replace(' ', '.').replace(/\[/, '')+"'");
		self.socket.write(writeString);
	}

	var suppressEcho = function() {

		var writeString = '';
		for (var i = 0, len = self.currentInString.length; i < len; i++) {
			writeString += ' ';
		}
		writeToDevice(currentPositionString() + writeString + currentPositionString());
	}

	var incrementCurrentRow = function() {
		self.currentCursorPosition.row + 1;
	}

	var setNewPositionGetString = function(cursorPosition) {
		self.currentCursorPosition = cursorPosition;
		return currentPositionString(self.currentCursorPosition);
	}

	var currentPositionString = function() {
		return escPrefix + self.currentCursorPosition.row + ';' + self.currentCursorPosition.col + 'H';
	}

	var echoPositionString = function(inx) {
		inx=(typeof(inx)!='undefined')?inx:0;
		return escPrefix + (+echoStartPosition.row+inx) + ';' + echoStartPosition.col + 'H';
	}
	
	var formatPositionString=function(position){
		if (typeof(position)=='string'){
			var row=position;
		}
		else{
			var row=position.row;
		}
		
		if (typeof(position.col)!='undefined'){
			var col=position.col;
		}
		else{
			var col=self.screenStructure.leftCol;
		}
		
console.log("row="+row);
console.dir({"col":col});

		return escPrefix + row + ';' + col + 'H';
	
	}

	var writePrompt = function(writeString) {
		writeToDevice(escPrefix + self.screenStructure.promptRow + ';' + self.screenStructure.leftCol + 'H' + writeString + currentPositionString());
	}
	
	
	
	

	var echoBuffer = '',
		echoIndex = 1,
		prevPosition = echoStartPosition;
		
	var writeEcho = function(writeString, newLine) {
		var nextPosition = qtools.clone(echoStartPosition);
		nextPosition.row = nextPosition.row + (echoIndex * 2);
		
		if (newLine) {
console.log("\n=-=============   newLine  =========================\n");


			writeString += formatPositionString(prevPosition);
			echoIndex++;
		}
		echoBuffer += writeString;
		writeToDevice(formatPositionString(echoStartPosition) + writeString + formatPositionString(nextPosition));
		prevPosition = qtools.clone(nextPosition);
	}






	var writeLine = function(writeString) {
		writeToDevice(writeString);
		incrementCurrentRow();
		writeToDevice(currentPositionString());
	}

	//MACHINA ====================================

	var onEnterGeneral = function(stateMachine) {
		console.dir({
			"self.currentCursorPosition": self.currentCursorPosition
		});
	}

	var onExitGeneral = function(stateMachine) {
		console.dir({
			"self.currentCursorPosition": self.currentCursorPosition
		});
	}

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
			wantScan: {
				_onEnter: function() {
					onEnterGeneral(this);

					initDisplay();
					writePrompt(self.request.prompt);
				},
				'*': function() {
					writeLine(self.currentInString);
					self.workingResultString = '';
				},
				enter: function() {
console.log("\n=-=============   enter  =========================\n");


					writeEcho(self.workingResultString, 'newLine') 
					self.workingResultString = '';
					
					self.updateDataModelFunction(self.request.dataModelPropertyName, self.workingResultString, self.request.replyToInput);
				},
				escape: function() {
					self.updateDataModelFunction('reset');
				},
				scan: function() {
					var returnData = self.currentInString.match(/^code(.*?)edoc\r$/, self.currentInString);
					self.workingResultString += returnData[1];;
					this.handle('enter');
				},

				_onExit: function() {
					onExitGeneral(this);
				}
			},
			wantNumber: {
				_onEnter: function() {
					onEnterGeneral(this);

					self.currentInString = '';
					self.workingResultString = '';
					writePrompt(self.request.prompt);
				},
				'*': function() {
				//	suppressEcho();
					
				},
				enter: function() {
					writeEcho('', 'newLine');
					writeLine(self.workingResultString);
					self.workingResultString = '';
					self.updateDataModelFunction(self.request.dataModelPropertyName, self.workingResultString, self.request.replyToInput);
				},
				escape: function() {
					self.updateDataModelFunction('reset');
				},
				number: function() {
					self.workingResultString += self.currentInString;
					writeEcho(self.workingResultString);
				},

				_onExit: function() {
					onExitGeneral(this);
				}
			},
			wantCode: {
				_onEnter: function() {
					onEnterGeneral(this);

					self.currentInString = '';
					self.workingResultString = '';
					writePrompt(self.request.prompt);
				},
				'*': function() {},
				enter: function() {
					self.updateDataModelFunction(self.request.dataModelPropertyName, self.workingResultString, self.request.replyToInput);
					writeLine(self.workingResultString);
				},
				escape: function() {
					self.updateDataModelFunction('reset');
				},
				char: function() {
					if (!self.currentInString.match(/a|b|c/)) {
						suppressEcho();
						return;
					}
					self.workingResultString += self.currentInString;
					writeEcho(self.workingResultString);
				},

				_onExit: function() {
					onExitGeneral(this);
				}
			},

			wantWord: {
				_onEnter: function() {
					onEnterGeneral(this);

					self.currentInString = '';
					self.workingResultString = '';
					writePrompt(self.request.prompt);
				},
				'*': function() {},
				escape: function() {
					self.escapeCount++;
					if (self.escapeCount > 1) {
						self.updateDataModelFunction(self.request.dataModelPropertyName, self.currentInString, self.request.replyToInput);
					}
				},
				char: function() {
					self.workingResultString += self.currentInString;
				},

				_onExit: function() {
					onExitGeneral(this);
				}
			},
			reset: function() {
				console.log('clear data model');
			},
			saveDisplay: {
				_onEnter: function() {
					onEnterGeneral(this);

				},
				wait: function() {
					writePrompt(self.request.prompt);
				},
				success: function() {
					writePrompt(self.request.prompt);
				},
				error: function() {
					writePrompt(self.request.prompt);
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
		if (inData.match(/^code.*?edoc\r$/)) {
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

	//SCANNER OPERATION ====================================


	var startupFunction = function() {
		initDisplay();
		self.socket.pipe(self.socket);
		self.socket.on('data', scannerDataReceivingCallback);
	}

	var scannerDataReceivingCallback = function(inData) {
		self.currentInString = inData.toString();
		suppressEcho();
		var charType = detectSpecialCharStrings();
		stateMachine.handle(charType);
	}

	var server = net.createServer(function(socket) {
		self.socket = socket;
		startupFunction();
		self.initiateProcessing();
	});
	var port = 1337;
	server.listen(self.port, self.ipAddress);

	console.log(self.appName + ' listening on port ' + self.port);

	var stateMachine = new machina.Fsm(stateMachineDefinition);

	return this;
};

//END OF moduleFunction() ============================================================

util.inherits(moduleFunction, events.EventEmitter);
module.exports = moduleFunction;












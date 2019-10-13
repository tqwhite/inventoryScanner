'use strict';
var qtools = require('qtools'),
	qtools = new qtools(module),
	events = require('events'),
	util = require('util'),
	helixConnector = require('../../node_modules/helixConnector/helixConnector/helixConnector.js'),
	journal = require('journal');
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
					name: 'helixAccessParms',
					optional: true
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


	//LOCAL FUNCTIONS ====================================
	var authGoodies = {
		userId: 'tq@justkidding.com',
		authToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ0cUBqdXN0a2lkZGluZy5jb20iLCJpbnN0YW5jZUlkIjoidHF3aGl0ZS9xYm9vayIsImlhdCI6MTQ0OTkzNTE2N30.dJRnMa2VLJBsy7bXfPFvcb3mawd1a29PJ46EpojUcQY'
	};


	var getQueryParms = function(schemaName) {
console.log("global.terminalId="+global.terminalId+" [dataInterface.js.schemata]");

		var schemata = {

			barcodeEntry: {
				debug:false,
				skipPoolUser:true,
				publicEndpoint:true, //this prevents JWT processing
				relation: '_inertProcess',
				view: 'enterABC',
				fieldSequenceList: [
					'scanCode',
					'quantity',
					'type',
					'createDateTime',
					'terminalId',
					'refId'
				],
				mapping:{
					terminalId:function(){return global.terminalId; },
					refId:'refId',
					createDateTime:'helixDateTimeNow'
					
				}
			}
		}
		
		return schemata[schemaName]
	}

	//METHODS AND PROPERTIES ====================================

	this.save = function(schemaName, inData, callback) {
		journal.add(inData, 'all');
		var localCallback = function(err, data) {
			if (err) {

				journal.add(inData, 'unsaved');
			} else {

				journal.add(inData, 'saved_correctly');
			}
			callback(err, data);
		}
		
		
		helixConnector.process('saveOneWithProcess', {
			schema: getQueryParms(schemaName),
			debug: false,
			inData: inData,
			callback: localCallback
		});
		
		
	}

	//INITIALIZATION ====================================

	journal = new journal();
	helixConnector = new helixConnector({
		helixAccessParms:self.helixAccessParms,
		noValidationNeeded: true
	});

	return this;
};

//END OF moduleFunction() ============================================================

util.inherits(moduleFunction, events.EventEmitter);
module.exports = moduleFunction;

'use strict';
var qtools = require('qtools'),
	qtools = new qtools(module),
	events = require('events'),
	util = require('util'),
	helixConnector = require('helixConnector'),
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



	var getQueryParms = function(schemaName) {
		var schemata = {

			barcodeEntry: {
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
		helixConnector.save(getQueryParms(schemaName), inData, localCallback);
	}

	//INITIALIZATION ====================================

	journal = new journal();
	helixConnector = new helixConnector({
		helixAccessParms:self.helixAccessParms
	});

	return this;
};

//END OF moduleFunction() ============================================================

util.inherits(moduleFunction, events.EventEmitter);
module.exports = moduleFunction;

'use strict';
var qtools = require('qtools'),
	qtools = new qtools(module),
	events = require('events'),
	util = require('util'),
	helixConnector=require('helixConnector');

//START OF moduleFunction() ============================================================

var moduleFunction = function(args) {
	events.EventEmitter.call(this);
	this.forceEvent = forceEvent;
	this.args = args;
	this.metaData = {};
	this.addMeta = function(name, data) {
		this.metaData[name] = data;
	}

	// 	qtools.validateProperties({
	// 		subject: args || {},
	// 		targetScope: this, //will add listed items to targetScope
	// 		propList: [
	// 			{
	// 				name: 'placeholder',
	// 				optional: true
	// 			}
	// 		]
	// 	});

	var self = this,
		forceEvent = function(eventName, outData) {
			this.emit(eventName, {
				eventName: eventName,
				data: outData
			});
		};


	//LOCAL FUNCTIONS ====================================



	//METHODS AND PROPERTIES ====================================

	this.save=function(inData, callback){
		helixConnector.save(inData, callback);
	}

	//INITIALIZATION ====================================

	helixConnector=new helixConnector();

	return this;
};

//END OF moduleFunction() ============================================================

util.inherits(moduleFunction, events.EventEmitter);
module.exports = moduleFunction;
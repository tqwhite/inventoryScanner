'use strict';
var qtools = require('qtools'),
	qtools = new qtools(module),
	events = require('events'),
	util = require('util'),
	helixConnector = require('../../node_modules/helixConnector/helixConnector/helixConnector.js'),
	journal = require('journal');
const asynchronousPipePlus = new require('asynchronous-pipe-plus')();
const pipeRunner = asynchronousPipePlus.pipeRunner;
const taskListPlus = asynchronousPipePlus.taskListPlus;

//START OF moduleFunction() ============================================================

var moduleFunction = function(args) {
	events.EventEmitter.call(this);
	this.forceEvent = forceEvent;
	this.args = args;
	this.metaData = {};
	this.addMeta = function(name, data) {
		this.metaData[name] = data;
	};

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
		authToken:
			'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ0cUBqdXN0a2lkZGluZy5jb20iLCJpbnN0YW5jZUlkIjoidHF3aGl0ZS9xYm9vayIsImlhdCI6MTQ0OTkzNTE2N30.dJRnMa2VLJBsy7bXfPFvcb3mawd1a29PJ46EpojUcQY'
	};
	
	var getQueryParms = function(schemaName) {
		var schemata = {
			barcodeEntry: {
				processName: 'saveOneWithProcess',
				schema: {
					debug: false,
					skipPoolUser: true,
					publicEndpoint: true, //this prevents JWT processing
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
					mapping: {
						terminalId: function() {
							return global.terminalId;
						},
						refId: 'refId',
						createDateTime: 'helixDateTimeNow'
					}
				}
			},

			inventoryQtyOut: {
				processName: 'retrieveRecords',
				schema: {
					debug: true,
					skipPoolUser: true,
					publicEndpoint: true, //this prevents JWT processing
					relation: '_userPoolGlobal',
					view: 'inventoryQtyOut',
					testViewName: '',
					fieldSequenceList: ['lk qty-inv', 
						'scanCode',
						'quantity',
						'type'],
					mapping: {},
					separators: {
						field: '\t',
						record: '``'
					},
					criterionSchemaName: 'inventoryCriterion',
					criterion: {
						data:{},
						debug: true,
						relation: '_inertProcessScanServer',
						view: 'inventoryCriterion',
						testViewName: '',
						fieldSequenceList: ['scanCode'],
						mapping: {},
						separators: {
							field: '\t',
							record: '``'
						},
						criterionSchemaName: '',
						emptyRecordsAllowed: true,
						private: false
					},
					debug: 'false',
					emptyRecordsAllowed: true,
					private: false
				}
			}
		};

		return schemata[schemaName];
	};

	//METHODS AND PROPERTIES ====================================
	
	this.save = (schemaNameList, inData, callback) => {
		const taskList = new taskListPlus();

		schemaNameList.forEach(item => {
			taskList.push((args, next) => {
				journal.add(inData, 'all');
				var localCallback = function(err, data) {
					if (err) {
						journal.add(inData, `unsaved ${item}`);
					} else {
						journal.add(inData, `saved_correctly ${item}`);
					}

					args[item] = data;
					next(err, args);
				};

				const schemaProcessInfo = getQueryParms(item);
				qtools.putSurePath(schemaProcessInfo, 'schema.criterion.data', inData);

console.dir({"schemaProcessInfo [dataInterface.js.moduleFunction]":schemaProcessInfo});


				helixConnector.process(schemaProcessInfo.processName, {
					schema: schemaProcessInfo.schema,
					debug: false,
					inData: inData,
					callback: localCallback
				});
			});
		});

		// 	taskList.push((args, next) => {
		// 		const localCallback = (err, localResult2) => {
		// 			args.localResult2 = localResult2;
		// 			next(err, args);
		// 		};
		// 		localCallback('', 'localResult2');
		// 	}, ['localResult1']);

		const initialData = {};
		pipeRunner(taskList.getList(), initialData, (err, finalResult) => {
			//console.dir({ 'finalResult [asyncPipe Boilerplate.]': finalResult });
			callback(err, finalResult);
		});
	};
	//INITIALIZATION ====================================

	journal = new journal();
	helixConnector = new helixConnector({
		helixAccessParms: self.helixAccessParms,
		noValidationNeeded: true
	});

	return this;
};

//END OF moduleFunction() ============================================================

util.inherits(moduleFunction, events.EventEmitter);
module.exports = moduleFunction;

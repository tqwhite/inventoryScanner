/*
In the node.js intro tutorial (http://nodejs.org/), they show a basic tcp 
server, but for some reason omit a client connecting to it.  I added an 
example at the bottom.

Save the following server in example.js:
*/


var net = require('net');
var terminal = require('terminal.js');
var qtools = require('qtools');
qtools = new qtools();

var escChar = String.fromCharCode(27),
	escPrefix = escChar + '[',
	enterChar=String.fromCharCode(13);

var startScreen = qtools.fs.readFileSync('startScreen.vt100').toString().replace(/\n/g, '\n\r');
var startList = startScreen.split("\n");
;


var displayTop = 5,
	displayLeft = 3,
	displayHeight = startList.length,
	displayWidth = 16;
;

var currLine = displayTop,
	currCol = displayLeft;

var transactionCount=0;



var newLine = function() {
	currLine=currLine+1;
	return setCursorPosition(displayLeft, currLine);
}


var setCursorPosition = function(col, row) {
	currLine = row;
	return escPrefix + row + ';' + col + 'H';
}

var initCursorPosition = function() {
	currLine = displayTop;
	currCol = displayLeft;
	return setCursorPosition(currCol, currLine);
}

var clearDisplayArea = function() {

	var outString = '';
	for (var row = displayTop, len = displayHeight; row < len; row++) {
		var blanksString = '';
		for (var col = displayLeft, len2 = displayWidth; col < len2; col++) {
			blanksString += ' ';
		}

		outString += setCursorPosition(displayLeft, row) + blanksString+'      ';
	}
	return outString +initCursorPosition();
}

var initScreen=function(){
		clearDisplayArea();
		scannerSocket.write(setCursorPosition(0,0)+startScreen);
		scannerSocket.write(initCursorPosition());
}

var returnToCursorPosition=function(){
	return setCursorPosition(currCol, currLine);
}




var scannerSocket;


var server = net.createServer(function(socket) {
var stringAccumulator='', barCode, quantity,
waitingForSecondEnter=false;
scannerSocket=socket;
	var replyToScanner = function(inData) {

		var scanCode, reply;

		if (inData==enterChar && waitingForSecondEnter){
			quantity=stringAccumulator;
			stringAccumulator=''
			
			initScreen();
			reply="Helix Save:"+newLine()+newLine()+'Item: '+newLine()+barCode+newLine()+newLine()+'Qty: '+quantity;
			reply+=newLine()+newLine()+"ERROR:"+newLine()+"No Helix Server"+newLine()
		}
		else{
		if (inData.length > 1) {
			barCode=inData;
			initScreen();
			reply = 'Code (#'+(transactionCount++)+'):'+newLine()+inData+newLine()+newLine();
			reply += 'Quantity:'+newLine();
			stringAccumulator='';
		} else {
		
			if (inData==enterChar){
				waitingForSecondEnter=true;
				reply = returnToCursorPosition() +  stringAccumulator+returnToCursorPosition();
			}
			else{
				waitingForSecondEnter=false;
			}
			stringAccumulator+=inData;
			reply = returnToCursorPosition() +  stringAccumulator+returnToCursorPosition();
		}
		}

		socket.write(reply);
	}




		socket.write(startScreen);
		socket.write(initCursorPosition());

	socket.pipe(socket);
	socket.on('data', replyToScanner);


});

var port = 1337;
server.listen(port, '0.0.0.0');

console.log('listening on port ' + port);

/*
And connect with a tcp client from the command line using netcat, the *nix 
utility for reading and writing across tcp/udp network connections.  I've only 
used it for debugging myself.

$ netcat 127.0.0.1 1337

You should see:
> Echo server

*/

/* Or use this example tcp client written in node.js.  (Originated with 
example code from 
http://www.hacksparrow.com/tcp-socket-programming-in-node-js.html.) */

// var net = require('net');
//  
// var client = new net.Socket();
// client.connect(1337, '127.0.0.1', function(inData) {
// 	console.log('Connected');
// 	client.write('Hello, server! Love, Client.');
// });
//  
// client.on('data', function(data) {
// 	console.log('Received: ' + data);
// 	client.destroy(); // kill client after server's response
// });
//  
// client.on('close', function() {
// 	console.log('Connection closed');
// });


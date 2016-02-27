If you have trouble, you can call TQ White II at 708-763-0100.


The paths with PATH_TO need to be adjusted to point to the directory holding the inventoryScanner application.

1) Add something like this to .bash_alias

	alias initscan='source ~/PATH_TO/inventoryScanner/config/initializationScripts/siteSpecific/production.bash'

2) Adjust the PATH_TO in production.bash

3) Open a terminal. Type initscan. It should say 

INVENTORY SCANNER ALIASES ETC
----------------------------------
COMMANDS

scanserve - start Inventory Scanner server

fakescanner - use terminal as a pretend scanner for testing
----------------------------------

4) The type scanserver. It should say

	"inventoryScanner listening on port 1337"

5) You will probably have to do something to your network to let the scanner talk on port 1337
(and any other ports if there is more than one scanner).

6) Installation can be verified by using...

	telnet localhost 1337

after telnet starts (ignore the 'connection refused' message), you need to enter 
the escape ^] (control-left-brace) to get a prompt,

then type...

	mode character

You can then PASTE (typing won't work) a sample code with delimiter, eg,

	code9999999edoc

(replace the nines with an actual code).

======================================

SCANNER SETUP

If the scanner is new, find the menu Administration, then Startup & Servers, then Text Mode (at the 
bottom of the list) should be changed to 'enabled'. Then reboot to set the preference.
(This info is on the instruction sheet that comes with the device.)

If this is not done, the user interface is more 'user friendly' and therefore incomprehensible. 
The following instructions rely on the Text Mode control structure.

Initialize Server Access

1) Press the esc key a lot of times until you see the Main Menu.

2) Scroll on it using the up/down arrow keys until you see Settings and USER Options. Press Enter.

3) Follow package directions to get access to your wifi network using Network and Wifi Setup.
(Note: this device only works on 2.4gh wifi networks.)

4) Then choose Host Servers and VT Setup then Host Server List then Host 1.

5) Access each of the settings and make enter this information...

Terminal:		VT100
Name:			scanserver
Host Address:	Enter the IP address of the computer running ScanServer software.
Host Port:		1337
(for additional scanners, use a different port number)

Use esc to back out and make sure it says it is saving the changes (should be automatic)

6) Back at Settings and User Options, choose Barcode and Laser Control then Editing (selection 4).

7) Choose GLobal Edit.

8) On the Global Edit menu, highlight selection 1, Global Edit. Press enter until it says 'Enabled'.

9) scroll down to selection 5, Prefix. Press enter and type

code

then enter again

10) Choose Suffix, selection 6, and type

edoc

then enter again.

11) Press escape many times to get back to the Main Menu again. Make sure it says it is saving the changes (should be automatic).

12) Press escape again to get to Connect. Option 1 should say scanserver. Press enter. You should see...

 ------------------ 
  Panagon Systems   
   ------------     
                    
          
   ------------     
                    
     
   ------------     
  (esc) to reset    
 -------**---------
 
 If not, change things until you do. Good luck.

======================================

Additional information...

To use a different port, enter...

node ~/PATH_TO/inventoryScanner/system/scanServer/scanServer.js --port=PORTNUMBER

eg, 1336





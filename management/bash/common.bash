#!/bin/bash
echo "INVENTORY SCANNER ALIASES ETC";

#include other executable scripts in this directory  ================================
export PATH=$PATH:"$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )": 

echo -e  " 
----------------------------------
COMMANDS 

startAllScanners - Start all Scanners 
 
stopAllScanners - Stop all scanners 
 
checkScanners - See if scanner servers are running 

-------------------
Current Status:

";

launchctl list | grep scan

echo -e "

(if nothing shown above, scanners are not running.)
-------------------

psLog - see scanServer tech log files

psErrorLog - see scanServer error log files

psEconnProblemLog - only display ECONNRESET errors
 
fakescanner - use terminal as a pretend scanner for testing (sample code 'code9999edoc') 
 
updateps - get the latest code (if pscommit was done elsewhere) 
 
psrepo - cd to the repository 
 
---------------------------------- 
";

alias psLog="tail -f -n 200 /Users/HelixServer/inventoryScanner/logFiles/scanServer.tech.log";
alias psErrorLog="tail -f -n 200 /Users/HelixServer/inventoryScanner/logFiles/scanServer.err.log";
alias psEconnProblemLog="tail -f -n 5000 /Users/HelixServer/inventoryScanner/logFiles/scanServer.err.log | grep ECONNRESET";

# point at this project ================================
projectBase=$scanProjectBase;

# create environment variables for important locations ================================
loggingDir="$projectBase/logFiles"
export SCANNER_LOG_FILE_DIRECTORY_PATH=$loggingDir;

# check important directories ================================

if [ ! -e "$loggingDir" ]
then
  echo -e "\ncreating $loggingDir\n"
  mkdir "$loggingDir"
fi

if [ ! -e "$projectBase/testResults" ]
then
  echo -e "\ncreating $projectBase/testResults\n"
  mkdir "$projectBase/testResults"
fi

# if [ ! -e "$projectBase/testData" ]
# then
#   echo -e "\nWARNING: $projectBase/testData IS MISSING\n"
# fi

if [ ! -e "$projectBase/config" ]
then
  echo -e "\nWARNING: $projectBase/config IS MISSING\n"
fi


# === UTILITY AND NAVIGATION aliases ===========================================
alias psrepo="cd $projectBase/system; pwd; git status;";

# === BASIC OPERATION aliases/variables ===========================================

# === TEST RUNNING ===========================================
alias pingScanServer="curl http://127.0.0.1:1337/ping"

if [ "$SCANNER_CONFIG_NAME" == "qbook" ]; then
alias viewLog="cat $loggingDir/operation.log | bunyan | tail -c -10000; echo 'ANY FATAL?'; cat $loggingDir/operation.log | bunyan -l fatal; echo 'done';"
else
alias viewLog="cat $loggingDir/operation.log | bunyan | tail --lines=133; echo 'ANY FATAL?'; cat $loggingDir/operation.log | bunyan -l fatal; echo 'done';"

fi

alias tailLog="tail -f -n 20 $loggingDir/operation.log | bunyan"
alias killLog="rm $loggingDir/operation.log"



#!/bin/bash
echo "INVENTORY SCANNER ALIASES ETC";

#include other executable scripts in this directory  ================================
export PATH=$PATH:"$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )": 

scanTestInfo="\
----------------------------------\n\
COMMANDS\n\n\
startScanners - Start Both Scanners\n\
\n\
stopScanners - Stop both scanners\n\
\n\
start1337 - start Inventory Scanner server  on port 1337\n\
\n\
start1338 - start Inventory Scanner server  on port 1338\n\
\n\
fakescanner - use terminal as a pretend scanner for testing (sample code 'code9999edoc')\n\
\n\
updateps - get the latest code (if pscommit was done elsewhere)\n\
\n\
scanrepo - cd to the repository\n\
----------------------------------\n\
";

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

echo -e "$scanTestInfo";
alias lpInfo=' echo -e "$scanTestInfo"'

# === UTILITY AND NAVIGATION aliases ===========================================
alias scanrepo="cd $projectBase/system; pwd; git status;";

# === BASIC OPERATION aliases/variables ===========================================
alias scanserve="clear; nodemon -w $projectBase $projectBase/system/scanServer/scanServer.js --port=1337";

alias start1337="node $projectBase/system/scanServer/scanServer.js --port=1337";

alias start1338="node $projectBase/system/scanServer/scanServer.js --port=1338";

alias startscannerlist=$projectBase/config/initializationScripts/siteSpecific/startScannerNodes

# === TEST RUNNING ===========================================
alias pingScanServer="curl http://127.0.0.1:1337/ping"

if [ "$SCANNER_CONFIG_NAME" == "qbook" ]; then
alias viewLog="cat $loggingDir/operation.log | bunyan | tail -c -10000; echo 'ANY FATAL?'; cat $loggingDir/operation.log | bunyan -l fatal; echo 'done';"
else
alias viewLog="cat $loggingDir/operation.log | bunyan | tail --lines=133; echo 'ANY FATAL?'; cat $loggingDir/operation.log | bunyan -l fatal; echo 'done';"

fi

alias tailLog="tail -f -n 20 $loggingDir/operation.log | bunyan"
alias killLog="rm $loggingDir/operation.log"



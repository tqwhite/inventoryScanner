#!/bin/bash
echo "INVENTORY SCANNER ALIASES ETC";

#include other executable scripts in this directory  ================================
export PATH=$PATH:"$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )": 

scanTestInfo="\
----------------------------------\n\
TESTING COMMANDS\n\n\
scanserve - start Inventory Scanner server\n\
----------------------------------\n\
";

# point at this project ================================
projectBase=$scanProjectBase;

# create environment variables for important locations ================================
loggingDir="$projectBase/logFiles"

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
alias scanserve="clear; nodemon -w $projectBase $projectBase/system/scanServer/scanServer.js";

# === TEST RUNNING ===========================================
alias pingScanServer="curl http://127.0.0.1:1337/ping"

if [ "$serverContext" == "qbook" ]; then
alias viewLog="cat $loggingDir/operation.log | bunyan | tail -c -10000; echo 'ANY FATAL?'; cat $loggingDir/operation.log | bunyan -l fatal; echo 'done';"
else
alias viewLog="cat $loggingDir/operation.log | bunyan | tail --lines=133; echo 'ANY FATAL?'; cat $loggingDir/operation.log | bunyan -l fatal; echo 'done';"

fi

alias tailLog="tail -f -n 20 $loggingDir/operation.log | bunyan"
alias killLog="rm $loggingDir/operation.log"



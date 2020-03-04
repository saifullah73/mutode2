const chalk = require('chalk')
const spawn = require('child_process').spawn
const Debug = require('debug')
const fs = require('fs')
const path = require('path')
const terminate = require('terminate')

/**
 * @module MutantRunner
 * @description Runs a given mutant in a free worker, logging one of the possible results (survived, killed or discarded) and the time of execution.
 *
 * Execution is done with the `npm test` command inside the worker's directory
 */
module.exports = function MutantRunner ({ mutodeInstance, filePath, contentToWrite, log}) {
  const debug = Debug(`mutants:${filePath}`);
  var failedTestCasesNumber = 1;  // 1 since first test case that fails is numbered 1, so we are also trying to match that
  var testCaseReport = [];
  var testCaseNo = 0;
  var seperator = "|"
  var TestCaseResult = function(num,desc,stat) {
    this.number = num;
    this.description = desc;
    this.status = stat; //1: Pass , 0: fail, -2: No test case run due to compilation source code, -1: Test case did not run,since an earlier one failed 
  }

  function writeRow(id,time,header,testcaseresults, filePath){
    var headersplit = header.split(seperator)
    headersplit = headersplit.slice(1);
    var totalTestCases = headersplit.length;
    console.log(totalTestCases)
    console.log(`${chalk.bgYellow("Total length of totalTestCases = " + totalTestCases)}`);
    var string = getStringToWrite(id,time,testcaseresults,totalTestCases,seperator);
    console.log(`${chalk.bgYellow("Row written = "+ string)}`);
    fs.appendFileSync(filePath, string+"\n");
  }

  function getStringToWrite(id,time,testResults,testCasesLength,sep){
    var str = id+sep+time;
    console.log(`${chalk.bgYellow("length of testcaseresults = "+ testResults.length + " totalTestCases = " + testCasesLength)}`);
    if (testResults.length == 0){
      console.log(`${chalk.bgYellow("Length of totalTestCases = 0 mutode:id = "+id)}`)
      var patt = sep + "-2"
      str = str + patt.repeat(testCasesLength)
      return str;
    }
    for (var i = 0; i < testCasesLength ; i++){
      if (i < testResults.length){
        str = str + sep + testResults[i].status;
      }
      else{
        str = str + sep + "-1" // this test case did not run
      }
    }
    return str;
  }

  function getHeaderRow(filePath){
    var res;
    data  = fs.readFileSync(filePath);
    res =  data.toString().split('\n')[0];
    return res;
  }

  function writeHeaderRow(testcaseresults,filePath){
    var str = "mutant-id";
    for(var i = 0; i < testcaseresults.length; i++){
      str = str+seperator+testcaseresults[i].number + "-" +testcaseresults[i].description;
    }
    fs.writeFileSync(filePath,str+"\n");
  }

  var writeOutput = function(data,id,time,filePath){
    try {
      if (fs.existsSync(filePath)) {
        //console.log(`${chalk.bgRed('File already exists')}`);
        var header = getHeaderRow(filePath);
        // console.log(`${chalk.bgRed('Header = '+ header)}`);
        writeRow(id,time,header,data,filePath);
      }
      else{
        //console.log(`${chalk.bgRed('File does not exist')}`);
        writeHeaderRow(data,filePath);
        var header = getHeaderRow(filePath);
        //console.log(`${chalk.bgYellow('Header = '+ header)}`);
        writeRow(id,time,header,data,filePath);
      }
    } catch(err) {
      console.error(err);
    }
  }

  return async index => {
    await new Promise(resolve => {
      const startTime = process.hrtime()
      fs.writeFileSync(`.mutode/mutode-${mutodeInstance.id}-${index}/${filePath}`, contentToWrite);
      const child = spawn(mutodeInstance.npmCommand, ['test'], { cwd: path.resolve(`.mutode/mutode-${mutodeInstance.id}-${index}`) })

      child.stderr.on('data', data => {
        debug(data.toString())
      })

      let timedout = false
      const timeout = setTimeout(() => {
        terminate(child.pid)
        timedout = true
      }, mutodeInstance.timeout).unref()

      child.on('exit', (code, signal) => {
        const endTime = process.hrtime(startTime)
        const endTimeMS = (endTime[0] * 1e3 + endTime[1] / 1e6).toFixed(0)
        const timeDiff = chalk.gray(`${endTimeMS} ms`)
        clearTimeout(timeout)
        if (code === 0) {
          console.log(`${log}\t${chalk.bgRed('survived')} ${timeDiff}`)
          mutodeInstance.survived++
        } else if (signal || timedout) {
          console.log(`${log}\t${chalk.bgBlue('discarded (timeout)')} ${timeDiff}`)
          mutodeInstance.discarded++
        } else {
          console.log(`${log}\t${chalk.bgGreen('killed')} ${timeDiff}`)
          mutodeInstance.killed++
        }
        var patt = new RegExp("MUTANT [0-9]+" ,"i");
        var id = log.match(patt);
        writeOutput(testCaseReport,id,timeDiff,`.mutode/output-${mutodeInstance.id}.csv`);
        resolve()
      });

      child.stdout.on('data', (data) => {
        var output,match,regex1,regex2,match2,testCaseName,lines;
        lines = data.toString().split('\n');
        lines.forEach((element, index) => {
          output = element.trim();
          //console.log(`${chalk.bgBlue(output)}`);
          regex1 = new RegExp("^" + failedTestCasesNumber + "\\)" ,"g");
          regex2 = new RegExp("^" + "√" ,"i");
          match = output.match(regex1);
          match2 = output.match(regex2);
          if (match){
            //console.log(`${chalk.bgRed('Failed')}`);
            testCaseName = output.substring(output.indexOf(match.toString())+match.toString().length).trim();
            testCaseReport.push(new TestCaseResult(testCaseNo,testCaseName,0));
            testCaseNo++;
            failedTestCasesNumber++;
          }
          else if (match2){
            //console.log(`${chalk.bgGreen('Passed')}`);
            testCaseName = output.substring(output.indexOf(match2.toString())+match2.toString().length).trim();
            testCaseReport.push(new TestCaseResult(testCaseNo,testCaseName,1));
            testCaseNo++;
          }
        });
      });
    })
  }
}

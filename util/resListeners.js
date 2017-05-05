/*
  stores listeners to be placed on the response object

*/
const jsonController = require('./jsonController');
const takeSnapshot = require('./takeSnapshot.js');
const Classes = require('./Classes.js');
const Snapshot = Classes.Snapshot;
const Report = Classes.Report;


const resListeners = {
  //passed as callback into onFinish
  finish: (err, res) => {
    const now = Date.now();
    let xpr = res.locals._XPR;
    let validRequest = true;
    // no xpr means this is a request to an invalid route i.e. 404 error
    if (!xpr) {
      const parsed = jsonController.getAndParse();
      // if there is a currentRoute then this is a redirect
      if (parsed.currentRoute) {
        jsonController.updateCurrentReport(parsed, (report) => {
          report.redirect = new Report(res.req, res, "initial state", now);
        })
        parsed.currentRoute.push('redirect');
      } else {
        let methodRoute = res.req.method + " " + res.req.originalUrl;
        parsed.currentRoute = [methodRoute];
        parsed[methodRoute] = new Report(res.req, res, "inital state", now);
      }
      validRequest = false;
      xpr = parsed;
    }

    let reportDuration;
    jsonController.updateCurrentReport(xpr, (report) => {
      if (validRequest) report.timeline.push(new Snapshot(res.req, res, report.midware[report.midware.length - 1], now));
      report.end = now;
      reportDuration = report.duration = report.end - report.start;
      report.error = err;
      report.statusCode = res.statusCode;
      report.statusMessage = res.statusMessage;
    })

    const finishDuration = Date.now() - now;
    //increments totalDuration in initial report with duration of current report
    xpr[xpr.currentRoute[0]].hasOwnProperty('totalDuration') ?
      xpr[xpr.currentRoute[0]].totalDuration += reportDuration - finishDuration :
      xpr[xpr.currentRoute[0]].totalDuration = reportDuration - finishDuration;

    if (!xpr[xpr.currentRoute[0]].isRedirect) xpr.completedReqs += 1;
    jsonController.overwrite(xpr);
    if (!xpr[xpr.currentRoute[0]].isRedirect || !validRequest) process.send('next');
  }

}

module.exports = resListeners;

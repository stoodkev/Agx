var request = require('request');
var fs = require('fs');
var JSDOM = require('jsdom').JSDOM;
var jsdom = new JSDOM('<body><div id="container" style="width: 100%;height: 100%;margin: 50px;padding: 50px;"></div></body>', {runScripts: 'dangerously'});

var window = jsdom.window;

var anychart = require('anychart')(window);
var anychartExport = require('anychart-nodejs')(anychart);
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  var date= new Date();
  date=date.toISOString().split('T')[0];
  if (fs.existsSync('./public/'+date+'.jpg')) {
    console.log('Today chart was already generated!');
  }
  else
    startAgX(res,date);
});

function startAgX(res,date){

  request({url: 'https://bittrex.com/Api/v2.0/pub/market/GetTicks?marketName=BTC-STEEM&tickInterval=day', json: true}, function(err, res, json) {
    if (err) {
      throw err;
    }
    else {
        const STEEM=json.result.splice(json.result.length-400);
        console.log('GOT STEEM',STEEM);
        request({url: 'https://bittrex.com/Api/v2.0/pub/market/GetTicks?marketName=BTC-SBD&tickInterval=day', json: true}, function(err, res, json) {
          if (err) {
            throw err;
          }
          else
            {
              const SBD=json.result.splice(json.result.length-400);
              //console.log('GOT SBD',SBD);
              const STEEM_SBD=getSteemSbd(STEEM,SBD);
              //console.log(STEEM_SBD,STEEM_SBD[STEEM_SBD.length-1]);
              const MAYER=getMayer(STEEM_SBD);
              console.log('MAYER: ',MAYER,MAYER[199],MAYER.length);
              const time= SBD.map(function(e){return new Date(e.T).getTime();});
              console.log(time);
              const chart=createChart(time,STEEM_SBD,MAYER);
              saveChart(chart);
            }
        });
      }
  });

  function getSteemSbd(steem,sbd)
  {
    var steem_sbd=[];
    console.log('Start Calculating STEEM/SBD average over the 200 last days');
    for (var i=0;i<400;i++){
      steem_sbd.push((steem[i].H+steem[i].L)/(sbd[i].H+sbd[i].L));
    }
    return steem_sbd;
  }

  function getMayer(array){
    var mayers=[];
    for(var i=0;i<200;i++){
     mayers.push(array.slice(i,i+200).reduce((previous, current) => current += previous)/200);
   }
   return mayers;
  }

  function createChart(time,price,mayer)
  {
    var chart = anychart.line();
    chart.title("STEEM/SBD price and AgX");
    var yAxis = chart.yAxis();
    yAxis.orientation("right");
    yAxis.title("STEEM/SBD");
    var xAxis = chart.xAxis();
    xAxis.title("Time");

    var dateTimeScale = anychart.scales.dateTime();
    var dateTimeTicks = dateTimeScale.ticks();
    dateTimeTicks.interval(0,1);
    var minorTicks = dateTimeScale.minorTicks();

    // apply Date Time scale
    chart.xScale(dateTimeScale);
    var price_series=[];
    var mayer_series=[];
    var label = chart.label();
    label.padding(10,0);
    label.position("topright");
    label.anchor("topright");
    label.offsetY(15);
    label.offsetX(25);
    label.width(200);
    label.hAlign("center");
    label.text("STEEM/SBD : "+Math.round(price[399]*100)/100+"\n AgX : "+Math.round(mayer[199]*100)/100);
    var labelBackground = label.background();
    labelBackground.enabled(true);
    labelBackground.fill(null);
    labelBackground.stroke("2 #3498db");

    chart.bounds(10, 10, 800, 600);

    chart.xGrid().enabled(true);
    chart.yGrid().enabled(true);
    // enable minor grids
    chart.xMinorGrid().enabled(true);
    chart.yMinorGrid().enabled(true);
    for (var i=0;i<time.length-1;i++){
      price_series.push({value:price[i],x:time[i]});
      if(i>=200)
        mayer_series.push({value:mayer[i-200],x:time[i]});
    }
    var pr = chart.line(price_series.splice(price_series.length-365));
    var ma = chart.line(mayer_series);
    pr.normal().stroke("#3498db",2);
    pr.name('STEEM/SBD');
    ma.normal().stroke("#b22000",2);
    ma.name('AgX');

    chart.legend(true);

    var labels = chart.xAxis().labels();
    labels.hAlign("center");
    labels.width(60);
    labels.format(function(value){
      var date = new Date(value["tickValue"]);
      var options = {
        year: "numeric",
        month: "short"
      };
      return date.toLocaleDateString("en-US", options);
    });

    // set container and draw chart
    chart.container("container");
    chart.draw();

    return chart;
  }

  function saveChart(chart){
    anychartExport.exportTo(chart, 'jpg').then(function(image) {

      fs.writeFile('./public/'+date+'.jpg', image, function(fsWriteError) {
        if (fsWriteError) {
          console.log(fsWriteError);
          return null;
        } else {
          console.log('Complete');
           res.render('./index', {});
          return date;
        }
      });
    }, function(generationError) {
      console.log(generationError);
      return null;
    });
  }
}


  module.exports = router;

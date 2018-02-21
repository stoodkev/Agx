var request = require('request');
var fs = require('fs');
var JSDOM = require('jsdom').JSDOM;
var jsdom = new JSDOM('<body><div id="container" style="width: 100%;height: 100%;margin: 50px;padding: 50px;"></div></body>', {runScripts: 'dangerously'});
require('dotenv').config();
var window = jsdom.window;
var steem = require('steem');
steem.api.setOptions({ url: 'https://api.steemit.com' });

var anychart = require('anychart')(window);
var anychartExport = require('anychart-nodejs')(anychart);
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  var date= new Date();
  date=date.toISOString().split('T')[0];
  if (fs.existsSync('./public/'+date+'.jpg')&&req.query.force==undefined) {
    console.log('Today chart was already generated!');
  }
  else
  {
    if(req.query.token==process.env.TOKEN)
    {
      console.log('Starting AGX...');
      startAgX(res,date);
    }
    else {
      console.log('Unauthorized!');
    }
  }
});

function startAgX(res,date){

  console.log('Fetching Data from Bittrex');
  request({url: 'https://bittrex.com/Api/v2.0/pub/market/GetTicks?marketName=BTC-STEEM&tickInterval=day', json: true}, function(err, res, json) {
    if (err) {
      throw err;
    }
    else {
        const STEEM=json.result.splice(json.result.length-400);
        //console.log('GOT STEEM',STEEM);
        request({url: 'https://bittrex.com/Api/v2.0/pub/market/GetTicks?marketName=BTC-SBD&tickInterval=day', json: true}, function(err, res, json) {
          if (err) {
            throw err;
          }
          else
            {
              const SBD=json.result.splice(json.result.length-400);
              const STEEM_SBD=getSteemSbd(STEEM,SBD);
              const MAD=getMAD(STEEM_SBD);
              const AgX=getAgX(STEEM_SBD,MAD);
              const time= SBD.map(function(e){return new Date(e.T).getTime();});
              const chartPriceMad=createChart(time,STEEM_SBD,MAD);
              const chartAgX=createChartAgX(time,AgX);
              saveCharts(chartPriceMad,chartAgX,{price:STEEM_SBD[399],mad:MAD[199],agx:AgX[199]});
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


  function getMAD(array){
    console.log('Calculating MAD');
    var mad=[];
    for(var i=0;i<200;i++){
     mad.push(array.slice(i,i+200).reduce((previous, current) => current += previous)/200);
   }
   return mad;
  }

  function getAgX(price,mad)
  {
    return mad.map(function(n, i) { return price[i+200] / n; });
  }

  function createChart(time,price,mad)
  {
    console.log('Drawing chart!');
    var chart = anychart.line();
    chart.title("STEEM/SBD price and 200 days Moving Average");
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
    var mad_series=[];
    var label = chart.label();
    label.padding(10,0);
    label.position("topright");
    label.anchor("topright");
    label.offsetY(15);
    label.offsetX(25);
    label.width(200);
    label.hAlign("center");
    label.text("STEEM/SBD : "+Math.round(price[399]*100)/100+"\n 200d MAD : "+Math.round(mad[199]*100)/100);
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
        {
        mad_series.push({value:mad[i-200],x:time[i]});
      }
    }
    var pr = chart.line(price_series.splice(price_series.length-365));
    var ma = chart.line(mad_series);
    pr.normal().stroke("#3498db",2);
    pr.name('STEEM/SBD');
    ma.normal().stroke("#b22000",2);
    ma.name('200d MAD');
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

  function createChartAgX(time,agx)
  {
    console.log('Drawing chart AgX!');
    var chart = anychart.line();
    chart.title("AgX");
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
    var agx_series=[];
    var label = chart.label();
    label.padding(10,0);
    label.position("topright");
    label.anchor("topright");
    label.offsetY(15);
    label.offsetX(25);
    label.width(200);
    label.hAlign("center");
    label.text("AgX : "+Math.round(agx[199]*100)/100);
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
      if(i>=200)
        {
        agx_series.push({value:agx[i-200],x:time[i]});
      }
    }
    var ag = chart.line(agx_series);
    ag.normal().stroke("#3317b4",2);
    ag.name('AgX');

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

  function saveCharts(chartA,chartB,price){
    anychartExport.exportTo(chartA, 'jpg').then(function(image) {

      fs.writeFile('./public/A'+date+'.jpg', image, function(fsWriteError) {
        if (fsWriteError) {
          console.log(fsWriteError);
          return false;
        } else {
          console.log('Chart A has been generated!');
          anychartExport.exportTo(chartB, 'jpg').then(function(im) {

            fs.writeFile('./public/B'+date+'.jpg', im, function(fsWriteErrors) {
              if (fsWriteErrors) {
                console.log(fsWriteErrors);
                return false;
              } else {
                console.log('Chart B has been generated!');
                PostChart(date,price);
                return true;
              }
            });
          }, function(generationErrors) {
            console.log(generationErrors);
            return false;
          });
        }
      });
    }, function(generationError) {
      console.log(generationError);
      return false;
    });
  }

  function PostChart(date,price)
  {
    console.log('Posting chart!');
    var body=process.env.URL+'/A'+date+'.jpg';
    body+='<br/><br/>';
    body+='This is the chart for today '+date+'.<br/>Today\'s 200 days moving average factor is '+Math.round(price.mad*100)/100+' for a STEEM/SBD ratio of '+Math.round(100*price.price)/100+'.<br/>The AgX is factor is'+Math.round(100*price.agx)/100+'.';
    body+='<br/><br/>'+process.env.URL+'/B'+date+'.jpg <br/><br/>';
    body+='<h3>What is AgX?</h3><br/><br/>';
    body+='The Mayer\'s multiple (200 days moving average of the BTC/USD price) is known to be a good indicator of the BTC price evolution.\n';
    body+='AgX aims to be a similar indicator regarding the STEEM/SBD ratio, in order for users to find the right moment to exchange their SBD for STEEM at the best possible rate.';
    body+='<hr/>Original idea by @aggroed (<a href="https://v2.steemconnect.com/sign/account-witness-vote?witness=aggroed&amp;approve=1">Vote for witness</a>)';
    body+='<br/>Developed by @stoodkev (<a href="https://v2.steemconnect.com/sign/account-witness-vote?witness=stoodkev&amp;approve=1">Vote for witness</a>)<hr/>'
    var jsonmetadata= {"tags":["AgX","steem","cryptocurrency","news","minnowsupportproject"],"users":["stoodkev","aggroed"],"image":[process.env.URL+'/'+date+'.jpg'],"links":["https://v2.steemconnect.com/sign/account-witness-vote?witness=stoodkev&amp;approve=1","https://v2.steemconnect.com/sign/account-witness-vote?witness=aggroed&amp;approve=1"],"app":"AgX/1","format":"markdown"};

    var operations = [
            ['comment',
                {
                    parent_author: '',
                    parent_permlink: 'agx',
                    author: process.env.AUTHOR,
                    permlink: 'agx-'+date,
                    title: 'Steem/SBD and AgX evolution - '+date,
                    body: body,
                    json_metadata : JSON.stringify(jsonmetadata)
                }
            ],
            ['comment_options', {
                author: process.env.AUTHOR,
                permlink: 'agx-'+date,
                max_accepted_payout: '100000.000 SBD',
                percent_steem_dollars: 10000,
                allow_votes: true,
                allow_curation_rewards: true,
                extensions: [
                    [0, {
                      beneficiaries:[{
                      account: 'stoodkev',
                      weight: 100*5
                    }]
                    }]
                ]
            }]
        ];
        //console.log(operations);
        steem.broadcast.send({
          operations: operations, extensions: [] },
          { posting: process.env.WIF },
          function(e, r) {
            console.log('Post succesfully added to the blockchain!',e,r);
        });
  }
}


  module.exports = router;

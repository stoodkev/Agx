var request = require('request');

request({url: 'https://bittrex.com/Api/v2.0/pub/market/GetTicks?marketName=BTC-STEEM&tickInterval=day', json: true}, function(err, res, json) {
  if (err) {
    throw err;
  }
  else {
      const STEEM=json.result.splice(json.result.length-200);
      console.log('GOT STEEM',STEEM);
      request({url: 'https://bittrex.com/Api/v2.0/pub/market/GetTicks?marketName=BTC-SBD&tickInterval=day', json: true}, function(err, res, json) {
        if (err) {
          throw err;
        }
        else
          {
            const SBD=json.result.splice(json.result.length-200);
            console.log('GOT SBD',SBD);
            const STEEM_SBD=getSteemSbd(STEEM,SBD);
            console.log(STEEM_SBD,STEEM_SBD[STEEM_SBD.length-1]);
            const MAYER=getMayer(STEEM_SBD);
            console.log('MAYER: ',MAYER);
          } 
      });
    }
});

function getSteemSbd(steem,sbd)
{
  var steem_sbd=[];
  console.log('Start Calculating STEEM/SBD average over the 200 last days');
  for (var i=0;i<200;i++){
    steem_sbd.push((steem[i].H+steem[i].L)/(sbd[i].H+sbd[i].L));
  }
  return steem_sbd;
}

function getMayer(array){
  return array.reduce((previous, current) => current += previous)/array.length;
}

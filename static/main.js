// MAIN

const Markets     = { Forex:0, Crypto:1, WallSt:2, GaltSt:3 };
const NetworkMode = { Live: 'LIVE', Test:'TEST' };
const HorizonNet  = { Live: 'https://horizon.stellar.org', Test:'https://horizon-testnet.stellar.org' };

var serverUrl   = HorizonNet.Test;
var marketPairs = [];
var baseAsset   = null;
var cntrAsset   = null;
var isAssetBase = false;  // XLM/USD:false  USD/XLM:true
var ticker      = null;
var candles     = {"USD":[]};
var topten      = ["USD", "EUR", "GBP", "JPY", "CNY", "RUB", "AUD", "CAD", "MXN", "BRL"];
var issuer      = 'GBANKHXFXNOST75HZRTJGNJWB7QYQ6WWK3PVJKD6VD6ZXPCX3HNNTLLK';
var chartTicks  = [300000, 900000, 3600000, 86400000, 604800000];  // 5m 15min 1hr 1day 1week 

var state    = {
    network  : 'TEST',
    dollar   : 0.0,
    bitcoin  : 0.0,
    stellar  : 0.0,
    galtxlm  : 0.0,
    galtusd  : 0.0,
    coin     : 'USD',
    market   : 'XLM:USD',
    period   : 1,
    thousand : ',',
    login    : false,
    account  : null,
    readOnly : true,
    ok       : true
};

function main() {
    clearCandles();
    loadCurrencies(Markets.Forex);
}

function loadCurrencies(market=Markets.Forex) {
    console.log('Loading currencies...');

    var url = './data/ticker.json';
    switch(market) {
        case Markets.Forex : isAssetBase = false; url = './data/ticker.json'; break
        case Markets.Crypto: isAssetBase = true;  url = './data/tickercrypto.json'; break
        case Markets.WallSt: isAssetBase = true;  url = './data/tickerwallst.json'; break
        case Markets.GaltSt: isAssetBase = true;  url = './data/tickergaltst.json'; break
        default            : isAssetBase = false; url = './data/ticker.json'; break
    }

    webGet(url, json => {
        console.log(json);
        ticker = json;
        state.stellar = ticker['USD'].pricexlm; //console.log('XLM '+state.stellar);
        buildMarketTable(json);
        buildAllCurrenciesTable(json);
        selectCoin('USD');
        enableEvents();
        loadGaltPrice();
        console.log('Currencies loaded');
    });
}

function loadGaltPrice() {
    // getOrderbook XLM:GALT
    var url = serverUrl + '/order_book?buying_asset_type=credit_alphanum4&buying_asset_code=GALT&buying_asset_issuer='+issuer+'&selling_asset_type=native&limit=1';
    webGet(url, info => {
        console.log('GALT OFFERS');
        console.log(info);
        state.galtxlm = info.asks[0].price;
        state.galtusd = 1 / state.galtxlm * state.stellar;
        $('galt-price').innerHTML = money(state.galtusd);
        console.log('GALT/USD '+state.galtusd);
    });
}

function buildMarketTable(ticker) {
    var table = $('coins');
    var html  = '';
    
    for (key in topten) {
        item = ticker[topten[key]];
        if(!item){ continue; }
        //console.log(item);
        var id     = topten[key];
        var symbol = topten[key];
        var price  = parseFloat(item['priceusd'])    || 0.0;
        var xlmprice  = parseFloat(item['pricexlm']) || 0.0;
        var pct01  = parseFloat(item['change01h'])   || 0.0;
        var pct24  = parseFloat(item['change24h'])   || 0.0;
        var trendPrice = (pct01==0 ? "no" : pct01>0 ? "up" : "dn");
        var trendPct01 = (pct01==0 ? "no" : pct01>0 ? "up" : "dn");
        var trendPct24 = (pct24==0 ? "no" : pct24>0 ? "up" : "dn");
        var klass      = 'none';
        if(symbol==state.coin){ klass = 'select'; }
        var row = '<tr id="{id}" class="{classSel}"> <td>{symbol}</td> <td>{price}</td> <td class="{goPrice}">{xlmprice}</td> <td class="go-{class01}">{pct01}%</td> <td class="go-{class24}">{pct24}%</td> </tr>';
        html += row.replace('{id}', id)
                   .replace('{symbol}',   symbol)
                // .replace('{classPrice}', 'price-'+trendPrice)
                   .replace('{price}',    money(price, 4, true))
                   .replace('{goPrice}',  'price-'+trendPrice)
                   .replace('{xlmprice}', money(xlmprice, 4, true))
                   .replace('{class01}',  trendPct01)
                   .replace('{pct01}',    money(pct01, 2))
                   .replace('{class24}',  trendPct24)
                   .replace('{pct24}',    money(pct24, 2))
                   .replace('{classSel}', klass);
    }

    table.tBodies[0].innerHTML = html;
    var now = new Date();
    $('update-time').innerHTML = 'Last updated ' + now.toLocaleTimeString('en-us');
}

function buildAllCurrenciesTable(ticker) {
    var table = $('all-coins');
    var html  = '';
    var row   = '<tr id="{coin}"> <td>{rank}</td> <td>{symbol}</td> <td>{name}</td> <td>{priceUsd}</td> <td class="{classXlm}">{priceXlm}</td> <td>{volume}</td> <td>{market}</td> <td class="{class01}">{change01}%</td> <td class="{class24}">{change24}%</td> <td>{supply}</td> </tr>';

    var totVolume   = 0;
    var totMarket   = 0;
    var totChange01 = 0;
    var totChange24 = 0;
    var change01    = 'go-no';
    var change24    = 'go-no';
    var n = 0;

    for(key in ticker) {
        item = ticker[key];
        if(item.inactive){ continue }
        n++;
        //console.log(item);
        var price  = parseFloat(item['priceusd'])  || 0.0;
        var pct01  = parseFloat(item['change01h']) || 0.0;
        var pct24  = parseFloat(item['change24h']) || 0.0;
        var trendPrice = (pct01==0 ? "no" : pct01>0 ? "up" : "dn");
        var trendPct01 = (pct01==0 ? "no" : pct01>0 ? "up" : "dn");
        var trendPct24 = (pct24==0 ? "no" : pct24>0 ? "up" : "dn");

        totVolume   += parseFloat(item['volume']);
        totMarket   += parseFloat(item['marketcap']);
        totChange01 += pct01;
        totChange24 += pct24;

        html += row.replace('{coin}'     , key)
                   .replace('{rank}'     , n) //item['rank'])
                   .replace('{symbol}'   , key)
                   .replace('{name}'     , item['name'])
                   // .replace('{classUsd}' , 'price-'+trendPrice)
                   .replace('{priceUsd}' , money(item['priceusd'], 4, true))
                   .replace('{classXlm}' , 'price-'+trendPrice)
                   .replace('{priceXlm}' , money(item['pricexlm'], 4, true))
                   .replace('{volume}'   , money(item['volume'], 0, true))
                   .replace('{market}'   , money(item['marketcap'], 0, true))
                   .replace('{class01}'  , 'go-'+trendPct01)
                   .replace('{change01}' , money(item['change01h'], 2, true))
                   .replace('{class24}'  , 'go-'+trendPct24)
                   .replace('{change24}' , money(item['change24h'], 2, true))
                   .replace('{supply}'   , money(item['available'], 0, true));
    }

    totVolume = parseInt(totVolume/1);  // 1000000
    totMarket = parseInt(totMarket/1000000);
    totChange01 = totChange01 / n;
    totChange24 = totChange24 / n;
    change01 = 'go-' + (totChange01==0 ? "no" : totChange01>0 ? "up" : "dn");
    change24 = 'go-' + (totChange24==0 ? "no" : totChange24>0 ? "up" : "dn");
    //console.log("Totals", totVolume+'M', totMarket+'M', money(totChange01/n,4), money(totChange24/n,4));

    $('total-volume').innerHTML    = '<xlm>⩙</xlm>' + money(totVolume, 0, true); // ' M'
    $('total-marketcap').innerHTML = '<xlm>⩙</xlm>' + money(totMarket, 0, true) + ' M';
    $('total-change01').innerHTML  = money(totChange01, 2, false) + '%';
    $('total-change24').innerHTML  = money(totChange24, 2, false) + '%';
    $('total-change01').className  = change01;
    $('total-change24').className  = change24;

    table.tBodies[0].innerHTML = html;
}

function onCoin(event) {
    var row  = event.target.parentNode;
    var coin = row.id;
    if(!coin) { return; }
    selectCoin(coin)
}

function onAllCoins(event) {
    var row  = event.target.parentNode;
    var coin = row.id;
    if(!coin) { return; }
    selectCoin(coin)
}


function selectCoin(coin) {
    state.coin   = coin;
    state.market = 'XLM:'+coin;  // XLM:USD

    var marketPair = coin+':XLM';
    var baseSymbol = coin;
    var cntrSymbol = 'XLM';
    var cntrPrice  = marketPairs[baseSymbol];
    var basePrice  = 1 / cntrPrice;
        baseAsset  = new StellarSdk.Asset(baseSymbol, issuer);
        cntrAsset  = StellarSdk.Asset.native();

    if(!isAssetBase){ /* Swap */
        marketPair = 'XLM:'+coin;
        baseSymbol = 'XLM';
        cntrSymbol = coin;
        baseAsset  = StellarSdk.Asset.native();
        cntrAsset  = new StellarSdk.Asset(cntrSymbol, issuer);
        basePrice  = marketPairs[cntrSymbol];
        cntrPrice  = 1 / basePrice;
    }

    state.market = marketPair;


    //var pair = 'XLM : '+coin;
    var price = ticker[coin]['pricexlm'];
    clearForms(coin, marketPair, price);

    // All coins table
    var table1 = $('coins');
    var rows1  = table1.tBodies[0].rows
    for (var i = 0; i < rows1.length; i++) {
        rows1[i].className = '';
        if(rows1[i].id==coin) { rows1[i].className = 'select'; }
    }

    var table2 = $('all-coins');
    var rows2  = table2.tBodies[0].rows
    for (var i = 0; i < rows2.length; i++) {
        rows2[i].className = '';
        if(rows2[i].id==coin) { rows2[i].className = 'select'; }
    }

    getOrderBook(coin);
    getTradeHistory(coin);
    getChartData(coin);
}

function clearForms(coin, pair, price) {
    $('label-buy-sym1').innerHTML  = coin;
    $('label-buy-sym2').innerHTML  = coin;
    $('label-sell-sym1').innerHTML = coin;
    $('label-sell-sym2').innerHTML = coin;
    $('form-buy-sym').innerHTML    = pair;
    $('form-sell-sym').innerHTML   = pair;
    $('chart-label').innerHTML     = pair;
    $('order-market').innerHTML    = pair;
    $('trade-market').innerHTML    = pair;

    // Tables
    var loading  = '<tr><td align="left">Loading...</td><td>&nbsp;</td><td>&nbsp;</td></tr>';
    var emptyRow = '<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>';
    $('bid-list').tBodies[0].innerHTML   = loading;
    $('ask-list').tBodies[0].innerHTML   = emptyRow;
    $('trade-list').tBodies[0].innerHTML = loading;

    $('bid-price').value  = money(price, 4, true);
    $('bid-amount').value = money(0.0,   4, true);
    $('bid-total').value  = money(0.0,   2, true);
    $('ask-price').value  = money(price, 4, true);
    $('ask-amount').value = money(0.0,   4, true);
    $('ask-total').value  = money(0.0,   2, true);
}

function getOrderBook(symbol) {
    console.log('Loading orderbook for '+symbol+'...');

    // SYM/XLM Buying native: Base is SYM, Counter is XLM
    var baseUrl = serverUrl + '/order_book?buying_asset_type=native&selling_asset_type=credit_alphanum4&selling_asset_code={symbol}&selling_asset_issuer={issuer}';
    // XLM/SYM Buying asset: Base is XLM, Counter is SYM
    var cntrUrl = serverUrl + '/order_book?buying_asset_type=credit_alphanum4&buying_asset_code={symbol}&buying_asset_issuer={issuer}&selling_asset_type=native';

    var uri = (isAssetBase ? baseUrl : cntrUrl);
    var url = uri.replace('{symbol}', symbol).replace('{issuer}', issuer);

    webGet(url, buildOrderbook);
}

function buildOrderbook(info) {
    console.log(info);
    if(!info || info.error || info.status==500){ 
        console.log('Error requesting orderbook'); 
        $('bid-list').tBodies[0].innerHTML = '<tr><td colspan="3"><div class="warn center">Error</div></td></tr>';
        $('ask-list').tBodies[0].innerHTML = '<tr><td colspan="3"><div class="warn center">Error</div></td></tr>';
        return;
    }

    var bids     = info['bids'];
    var asks     = info['asks'];
    var offers   = [];
    var bidTable = $('bid-list');
    var askTable = $('ask-list');
    var bidRow   = '<tr> <td>{bidTotal}</td> <td>{bidAmount}</td> <td class="color-bid">{bidPrice}</td> </tr>';
    var askRow   = '<tr> <td class="color-ask">{askPrice}</td> <td>{askAmount}</td> <td>{askTotal}</td> </tr>';
    var emptyRow = '<tr><td colspan="3"><div style="text-align:center">No offers</div></td></tr>';
    var bidHtml  = '';
    var askHtml  = '';
    var bidSum   = 0;
    var askSum   = 0;
    var decs     = 4;
    if(bids.length > 0 && bids[0].price){ decs = bids[0].price > 10 ? 2 : 4; }  // High value, less decs

    for(index in bids) {
        bidPrice  = parseFloat(bids[index].price);
        bidAmount = parseFloat(bids[index].amount) / bidPrice;
        bidSum   += bidAmount;
        bidHtml  += bidRow.replace('{bidTotal}' , money(bidSum,    2, true, true))
                          .replace('{bidAmount}', money(bidAmount, 2, true, true))
                          .replace('{bidPrice}' , money(bidPrice,  decs));
    }
    if(bids.length < 1) { bidHtml = emptyRow; }

    for(index in asks) {
        askAmount = parseFloat(asks[index].amount);
        askPrice  = parseFloat(asks[index].price);
        askSum   += askAmount;
        askHtml  += askRow.replace('{askTotal}' , money(askSum,    2, true, true))
                          .replace('{askAmount}', money(askAmount, 2, true, true))
                          .replace('{askPrice}' , money(askPrice,  decs));
    }
    if(asks.length < 1) { askHtml = emptyRow; }
    
    bidTable.tBodies[0].innerHTML = bidHtml;
    askTable.tBodies[0].innerHTML = askHtml;

    // Assign latest price to order forms
    var symbol = isAssetBase ? baseAsset.getCode() : cntrAsset.getCode();
    if(bids[0]){ bidPrice = parseFloat(bids[0].price) } else { bidPrice = marketPairs[symbol]; if(isAssetBase){ bidPrice = 1/bidPrice; } }
    if(asks[0]){ askPrice = parseFloat(asks[0].price) } else { askPrice = marketPairs[symbol]; if(isAssetBase){ askPrice = 1/askPrice; } }
    var avgPrice = (bidPrice + askPrice) / 2;
    //console.log(0, bidPrice, askPrice, avgPrice);

    if(bids[0]){ $('ask-price').value = money(bidPrice); }
    if(asks[0]){ $('bid-price').value = money(askPrice); }
}

function getTradeHistory(symbol) {
    console.log("Loading trade history...");
    var baseTrades = serverUrl + '/trades?base_asset_type=credit_alphanum4&base_asset_code={symbol}&base_asset_issuer={issuer}&counter_asset_type=native&order=desc&limit=20';
    var cntrTrades = serverUrl + '/trades?base_asset_type=native&counter_asset_type=credit_alphanum4&counter_asset_code={symbol}&counter_asset_issuer={issuer}&order=desc&limit=20';
    var uri = (isAssetBase ? baseTrades : cntrTrades);
    var url = uri.replace('{symbol}', symbol).replace('{issuer}', issuer);
    console.log('Trades: '+url);
    webGet(url, buildTradeHistory);
}

function buildTradeHistory(info) {
    console.log(info);
    if(!info || info.error || info.status==500){ 
        console.log('Error requesting trade history');
        $('trade-list').tBodies[0].innerHTML = '<tr><td colspan="3"><div class="warn center">Error</div></td></tr>';
        return; 
    }

    var table = $('trade-list');
    var row   = '<tr> <td>{time}</td> <td class="{color}">{price}</td> <td>{amount}</td> </tr>';
    var empty = '<tr><td colspan="3"><div style="text-align:center">No orders</div></td></tr>';
    var html  = '';
    var recs  = info['_embedded']['records'];

    for(index in recs) {
        //console.log(recs[index]);
        var item   = recs[index];
        var time   = (new Date(item.ledger_close_time)).toLocaleTimeString();
        var type   = 'sell';
        var amount = item.base_amount;
        var price  = item.counter_amount / item.base_amount;

        if(item.base_is_seller) { type = 'buy'; }

        html += row.replace('{time}'  , time)
                   .replace('{price}' , money(price,  4, true))
                   .replace('{amount}', money(amount, 2, true, true))
                   .replace('{color}' , type=='buy'?'color-bid':'color-ask');
    }
    if(recs.length < 1) { html = empty; }

    table.tBodies[0].innerHTML = html;
}

function getMyOrders() {
    if(!state.login){ return; }
    if(!state.account){ return; }
    console.log('Loading my orders...');
    var address = ""
    if(state.readOnly){ address = state.account; }
    else { address = state.account.publicKey(); }
    var url = serverUrl + '/accounts/'+address+'/offers?order=desc&limit=20';
    webGet(url, showMyOrders);
}

function showMyOrders(info) {
    console.log(info);
    if(!info || info.error || info.status==500){ 
        console.log('Error requesting my orders'); 
        $('myorders-list').tBodies[0].innerHTML = '<tr><td colspan="3"><div class="warn center">Error</div></td></tr>';
        return;
    }

    var table = $('myorders-list');
    var row   = '<tr> <td>{orderid}</td> <td class="{color}">{type}</td> <td>{amount}</td> <td>{market}</td> <td class="{color}">{price}</td> <td><a href="javascript:cancelOrder({orderid})">Cancel</td> </tr>';
    var empty = '<tr><td colspan="3"><div style="text-align:center">No orders</div></td></tr>';
    var html  = '';
    var recs  = info['_embedded']['records'];

    for(index in recs) {
        // TODO: Check isAssetBase and invert all
        //console.log(recs[index]);
        var item     = recs[index];
        var orderId  = item.id;
        var price    = item.price;
        var amount   = item.amount;
        var buying   = getAssetCode(item.buying);
        var selling  = getAssetCode(item.selling);
        var type     = 1;
        var market   = selling+':'+buying;

        if(buying=='XLM') { 
            type = 0; 
            market = buying+':'+selling; 
            amount = item.amount * price; 
            price = 1/price;
        }

        var color    = type==0?'color-bid':'color-ask';
        var typeText = type==0?'Buy':'Sell';

        html += row.replace(/{orderid}/g, orderId)
                   .replace('{type}'    , typeText)
                   .replace('{amount}'  , money(amount, 4, true))
                   .replace('{market}'  , market)
                   .replace(/{color}/g  , color)
                   .replace('{price}'   , money(price, 4, true));
    }
    if(recs.length < 1){ html = empty; }

    table.tBodies[0].innerHTML = html;
}

function enableEvents() {
    $('coins').addEventListener('click',      function(event){ onCoin(event) }, false);
    $('all-coins').addEventListener('click',  function(event){ onAllCoins(event)}, false);
    $('bid-price').addEventListener('keyup',  function(event){ onBidKey(event)}, false);
    $('bid-amount').addEventListener('keyup', function(event){ onBidKey(event)}, false);
    $('bid-total').addEventListener('keyup',  function(event){ onBidKey(event)}, false);
    $('ask-price').addEventListener('keyup',  function(event){ onAskKey(event)}, false);
    $('ask-amount').addEventListener('keyup', function(event){ onAskKey(event)}, false);
    $('ask-total').addEventListener('keyup',  function(event){ onAskKey(event)}, false);
}

function onBidKey(event) {
    calcValue(event.target.id);
}

function onAskKey(event) {
    calcValue(event.target.id);
}

function onBidLabel(id) {
    refreshValue(id);
}

function onAskLabel(id) {
    refreshValue(id);
}

function calcValue(id) {
    switch(id){
        case 'bid-price' : $('bid-total').value  = money(numberFrom($('bid-amount').value) * numberFrom($('bid-price').value)); break;
        case 'bid-amount': $('bid-total').value  = money(numberFrom($('bid-amount').value) * numberFrom($('bid-price').value)); break;
        case 'bid-total' : $('bid-amount').value = money(numberFrom($('bid-total').value)  / numberFrom($('bid-price').value || 1)); break;
        case 'ask-price' : $('ask-total').value  = money(numberFrom($('ask-amount').value) * numberFrom($('ask-price').value)); break;
        case 'ask-amount': $('ask-total').value  = money(numberFrom($('ask-amount').value) * numberFrom($('ask-price').value)); break;
        case 'ask-total' : $('ask-amount').value = money(numberFrom($('ask-total').value ) / numberFrom($('ask-price').value || 1)); break;
    }
}

function refreshValue(id) {
    // TODO: REFRESH VALUES
    switch(id){
        case 'label-bid-price' : /*$('bid-price').value  = money(0);*/ break;  // latest bid
        case 'label-bid-amount': /*$('bid-amount').value = money(0);*/ break;  // max amount to buy  from balance
        case 'label-bid-total' : /*$('bid-total').value  = money(0);*/ break;  // max amount to sell from balance
        case 'label-ask-price' : /*$('ask-price').value  = money(0);*/ break;  // latest ask
        case 'label-ask-amount': /*$('ask-amount').value = money(0);*/ break;  // max amount to sell from balance
        case 'label-ask-total' : /*$('ask-total').value  = money(0);*/ break;  // max amount to buy  from balance
    }
}


//---- CHART

function clearCandles() {
    for(id in candles){
        for(period in candles[id]){
            candles[id][period] = null; // Candlestick cached data
        }
    }
}

function getChartData(symbol='USD') {
    console.log('Chart ', symbol);
    if(candles[symbol] && candles[symbol][state.period]){ onChartData(candles[symbol][state.period], symbol); return; }

    // This works for XLM/SYM, if asset is base use SYM/XLM
    var baseAssetType      = 'native';
    var counterAssetType   = 'credit_alphanum4';
    var counterAssetCode   = symbol;
    var counterAssetIssuer = issuer;
    //var resolution       = 300000;       // millis 300000|900000|3600000|86400000|604800000 = 5m 15min 1hr 1day 1week 
    var resolution         = chartTicks[state.period]; // millis 300000|900000|3600000|86400000|604800000 = 5m 15min 1hr 1day 1week = 48 ticks x 4h 12h 2d 48d 336d
    var startTime          = epoch08d();
    var endTime            = epoch();  // 1512775500000
    var limit              = 48;
    var order              = 'desc';

    switch(state.period){
        case 0:  startTime = epoch04h(); break;
        case 1:  startTime = epoch24h(); break;
        case 2:  startTime = epoch08d(); break;
        case 3:  startTime = epoch48d(); break;
        default: startTime = epoch24h(); break;
    }
    
    var resolution = 900000;
    var startTime = epoch08d();

    var url = serverUrl+'/trade_aggregations?'
            + 'base_asset_type='+baseAssetType
            + '&counter_asset_type='+counterAssetType
            + '&counter_asset_code='+counterAssetCode
            + '&counter_asset_issuer='+counterAssetIssuer
            + '&start_time='+startTime
            + '&end_time='+endTime
            + '&resolution='+resolution
            + '&limit='+limit
            + '&order='+order;

    if(isAssetBase){ 
        baseAssetType    = 'credit_alphanum4';
        baseAssetCode    = symbol;
        baseAssetIssuer  = issuer;
        counterAssetType = 'native';

        url = serverUrl+'/trade_aggregations?'
            + 'base_asset_type='+baseAssetType
            + '&base_asset_code='+baseAssetCode
            + '&base_asset_issuer='+baseAssetIssuer
            + '&counter_asset_type='+counterAssetType
            + '&start_time='+startTime
            + '&end_time='+endTime
            + '&resolution='+resolution
            + '&limit='+limit
            + '&order='+order;
    }

    console.log(url);
    webGet(url, onChartData, symbol);
}

function onChartData(info, symbol) {
    console.log('ONCHART', info);
    if(!info || info.error || info.status==500){ console.log('Error requesting chart data'); return; }

    console.log(state);
    console.log(candles);
    if(!candles[symbol]){ candles[symbol] = []; }
    candles[symbol][state.period] = info;  // Cache chart data for faster drawing
    $('chart-label').innerHTML = 'XLM : '+symbol; //currentCoinName();

    if(!info['_embedded']){ console.log('Error requesting chart data'); return; }
    var data = parseChartData(info['_embedded']['records']);
    console.log(data);

    drawChart(data, symbol);
}

function parseChartData(inData) {
    var data = inData.map(function(item) {
        return {
            time:   item.timestamp,
            date:   new Date(item.timestamp),
            open:   parseFloat(item.open),
            high:   parseFloat(item.high),
            low:    parseFloat(item.low),
            close:  parseFloat(item.close),
            volume: parseFloat(item.base_volume)
        };
    }).sort(function(a, b) { return a.time > b.time; });

    return data;
}

function drawChart(data, id="BTC") {
    //console.log('CHART', data);
    var area = $('chart-area');
    var margin = {top: 20, right: 10, bottom: 20, left: 50};
    var width  = area.offsetWidth - margin.left - margin.right;
    var height = (area.offsetWidth * 0.50) - margin.top - margin.bottom;

    var x = techan.scale.financetime().range([0, width]);
    var y = d3.scaleLinear().range([height, 0]);

    // Define the line
    var valueline = d3.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.close); });

    var candlestick = techan.plot.candlestick().xScale(x).yScale(y);

    var xAxis = d3.axisBottom().scale(x);
    var yAxis = d3.axisLeft().scale(y);

    // Remove old chart
    //removeSpinner();
    removeChart();
    //area.removeChild(area.lastChild);
    //area.removeChild(area.childNodes[1]);

    var svg = d3.select("#chart-area").append("svg")
            .attr("id", "chart")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var accessor = candlestick.accessor();
    data.sort(function(a, b) { return d3.ascending(accessor.d(a), accessor.d(b)); });

    // Gridlines in y axis function
    function make_y_gridlines() {       
        return d3.axisLeft(y).ticks(40)  // 5
    }

    function draw(data) {
        //console.log('DRAW',data);
        x.domain(data.map(candlestick.accessor().d));
        y.domain(techan.scale.plot.ohlc(data, candlestick.accessor()).domain());
        svg.selectAll("g.candlestick").datum(data).call(candlestick);
        svg.selectAll("g.x.axis").call(xAxis);
        svg.selectAll("g.y.axis").call(yAxis);
    }

    // Add the Y gridlines
    svg.append("g")         
        .attr("class", "grid")
        .call(make_y_gridlines().tickSize(-width).tickFormat(""))

    // Axis and legend
    svg.append("g").attr("class", "candlestick");
    svg.append("g").attr("class", "x axis").attr("transform", "translate(0," + height + ")");
    svg.append("g").attr("class", "y axis");
    /*
        .append("text")
        // .attr("transform", "rotate(-90)")
        .attr("x",  6)
        .attr("y", -6)
        .attr("dy", ".71em")
        .style("text-anchor", "start")
        .style("font-size", "2em")
        .style("font-weight", "300")
        .text(id);
        //.text("Precio ($)");
    */

    // Draw chart
    draw(data);
}

function removeChart() {
    var chart = $('chart');
    if(chart){ chart.parentNode.removeChild(chart); }
}

function onChartPeriod(n) {
    //console.log(ticks);
    state.period = n;
    setChartButtons(n);
    getChartData(state.coin);
}

function setChartButtons(n) {
    removeClass($('chart-action1'), 'selected');
    removeClass($('chart-action2'), 'selected');
    removeClass($('chart-action3'), 'selected');
    removeClass($('chart-action4'), 'selected');
    var tag;
    switch(n){
        case 0:  tag = $('chart-action1'); break;
        case 1:  tag = $('chart-action2'); break;
        case 2:  tag = $('chart-action3'); break;
        case 3:  tag = $('chart-action4'); break;
        default: tag = $('chart-action2'); break;
    }
    addClass(tag, 'selected');
}


//----LOGIN

function onLogin() {
    if(state.login){ logout(); return; }
    var key = $('login-key').value;
    if(!key) { return; }
    if(key.length != 56) { alert('0 Invalid key. Access denied.'); return; }
    var prefix = key.substr(0,1); console.log(prefix);
    if(prefix!='G' && prefix!='S') { alert('1 Invalid key. Access denied.'); return; }
    if(prefix=='G'){ state.account = key; state.readOnly = true; /* READ-ONLY */ }
    else if(prefix=='S'){ state.account = StellarSdk.Keypair.fromSecret(key); state.readOnly = false; }
    if(state.readOnly){ $('login-key').value = key.substr(0,6)+'-READ-ONLY-'+key.substr(50,6); /*DISABLE ASK/BID BUTTONS */ }
    else { $('login-key').value = '• • • • • • • • • • • • • • • • • • • •'; }
    $('login-key').setAttribute('disabled','true');
    $('login-go').innerHTML = 'Logout';
    state.login = true;   // Logged in
    console.log(state);
    getMyOrders();
}

function logout() {
    state.account  = null;
    state.readOnly = true;
    state.login    = false;  // Logged out
    $('login-key').value = '';
    $('login-key').removeAttribute('disabled');
    $('login-go').innerHTML = 'Login';
}


//---- ORDERS

function onBuy() {
    if(!state.login){ alert('You must be logged in to trade in GALTEX\nEnter your secret key or trade using your own wallet'); return; }
    bidOffer();
}

function onSell() {
    if(!state.login){ alert('You must be logged in to trade in GALTEX\nEnter your secret key or trade using your own wallet'); return; }
    askOffer();
}


// OFFERS XLM/USD
// SELL ASK:{buying:cntr, selling:base, amount:amount, price:price}         0.45 USD for 1 XLM
// BUY  BID:{buying:base, selling:cntr, amount:amount*price, price:1/price} 2.22 XLM for 1 USD = 1/price
// PRICE: How many units of buying it takes to get 1 unit of selling

function bidOffer() {
    //showStatus('Buying...');
    var bidAmount = numberFrom($('bid-amount').value); 
    var bidPrice  = numberFrom($('bid-price').value);
    //var amount    = (1*bidAmount).toFixed(7);
    var amount    = (bidAmount * bidPrice).toFixed(7);
    //var price     = (1 / bidPrice).toFixed(7);
    var fractal   = StellarSdk.Operation._toXDRPrice(bidPrice.toFixed(7))._attributes;
    var price     = {n: fractal.d, d:fractal.n};  // Swap num/den 
    var offer     = buildOffer('BID', 0, baseAsset, cntrAsset, amount, price);
    console.log('BID', 0, baseAsset, cntrAsset, amount, price);

    disableBidButton();
    manageOffer(offer, result => {
        if(result.ok){ 
            getOrderBook(state.coin);
            getTradeHistory(state.coin);
            getMyOrders(); 
        }
        else { alert('Something went wrong. Try again later'+'\n'+result.message); }
        enableBidButton();
    });
}

function askOffer() {
    //showStatus('Selling...');
    var askAmount = numberFrom($('ask-amount').value);
    var askPrice  = numberFrom($('ask-price').value);
    var amount    = (1*askAmount).toFixed(7);
    var price     = (1*askPrice).toFixed(7);
    var offer     = buildOffer('ASK', 0, baseAsset, cntrAsset, amount, price);
    console.log('ASK', 0, baseAsset, cntrAsset, amount, price);
    
    disableAskButton();
    manageOffer(offer, result => {
        if(result.ok){ 
            getOrderBook(state.coin);
            getTradeHistory(state.coin);
            getMyOrders();
        }
        else { alert('Something went wrong. Try again later'+'\n'+result.message); }
        enableAskButton();
    });
}

function cancelOrder(orderId) {
    //showStatus('Cancelling order '+orderId+'...');
    var offer = buildOffer('DEL', orderId, baseAsset, cntrAsset, 0, 1);

    manageOffer(offer, result => {
        // Reload my orders
        if(result.ok){ getMyOrders(); }
        else { alert('Something went wrong. Try again later'+'\n'+result.message); }
    });
    return false;
}

function buildOffer(type, orderId, baseAsset, cntrAsset, amount, price) {
    var offer = null;

    switch(type){
        case 'ASK':
            // SELL 1 USD @ 0.45 USD per 1 XLM
            offer = {
                buying  : cntrAsset,
                selling : baseAsset,
                amount  : amount,
                price   : price
            };
            break;

        case 'BID':
            // SELL 1 XLM @ 2.22 XLM per 1 USD
            offer = {
                buying  : baseAsset,
                selling : cntrAsset,
                amount  : amount,
                price   : price
            };
            break;

        case 'DEL':
            offer = {
                offerId : orderId,
                buying  : baseAsset,
                selling : cntrAsset,
                amount  : '0',
                price   :  1
            }; 
            break;

        default: alert('Unknown offer type');
    }

    return offer;
}

function manageOffer(offer, callback) {
    console.log("Place offer on SDEX");

    var server  = null;
    var source  = state.account;

    if (state.network == NetworkMode.Live) {
        StellarSdk.Network.usePublicNetwork();
        server = new StellarSdk.Server(HorizonNet.Live);
    } else {
        StellarSdk.Network.useTestNetwork();
        server = new StellarSdk.Server(HorizonNet.Test);
    }

    server.loadAccount(source.publicKey()).then(account => {
        console.log("Building offer...");
        var builder = new StellarSdk.TransactionBuilder(account);
        builder.addOperation(StellarSdk.Operation.manageOffer(offer));
        var tx = builder.build();
        tx.sign(source);
        return server.submitTransaction(tx);
    }).then(result => {
        console.log('Success!', result);
        callback({ok:true, message: 'Success!'});
    }).catch(error => {
        console.log(error); 
        var message = error.data.extras.result_codes.operations[0] || error.message;
        callback({ok:false, message: message});
    });
}

function disableBidButton() {
    $('button-buy').setAttribute('disabled');
    $('button-buy').innerHTML = 'WAIT';
}

function enableBidButton() {
    $('button-buy').removeAttribute('disabled');
    $('button-buy').innerHTML = 'BUY';
}

function disableAskButton() {
    $('button-sell').setAttribute('disabled');
    $('button-sell').innerHTML = 'WAIT';
}

function enableAskButton() {
    $('button-sell').removeAttribute('disabled');
    $('button-sell').innerHTML = 'SELL';
}


//---- MAIN

window.onload = main;

// END
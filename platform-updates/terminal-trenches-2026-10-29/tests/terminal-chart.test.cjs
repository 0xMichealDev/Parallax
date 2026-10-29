const assert=require('node:assert/strict');
const {test}=require('node:test');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const helperSource=readFileSync(path.join(root,'public/terminal-chart.js'),'utf8');
const nativeSource=readFileSync(path.join(root,'public/trading-desk.js'),'utf8');
const html=readFileSync(path.join(root,'app/terminal.html'),'utf8');
const context={module:{exports:{}},Intl,Date};vm.runInNewContext(helperSource,context);const units=context.module.exports;
const now=Date.parse('2026-10-29T12:00:00Z'),mint='8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump',pool='6iep3EgqksbZwgzMBCyAJtiVtVYkCgL9BnPBEwLR8AGQ',SOL='So11111111111111111111111111111111111111112';
const bars=[{time:18000,open:.01,high:.02,low:.009,close:.015,volume:0},{time:18120,open:.015,high:.03,low:.014,close:.025,volume:null}];
const fixture=(extra={})=>({mint,pool,currency:'USD',chartCurrency:'usd',intervalMinutes:1,source:'Fixture provider',candles:structuredClone(bars),valuation:{pool,marketCapUsd:250000,fdvUsd:500000,priceUsd:.025,fetchedAt:new Date(now).toISOString(),source:'Fixture provider'},...extra});

test('currency axes use readable K/M/B and preserve small, zero, and unknown prices',()=>{
 assert.equal(units.formatAxis(25000),'$25K');assert.equal(units.formatAxis(1250000),'$1.25M');assert.equal(units.formatAxis(2500000000),'$2.5B');
 assert.equal(units.formatAxis(0),'$0');assert.equal(units.formatAxis(null),'—');assert.equal(units.formatAxis(Infinity),'—');
 assert.equal(units.formatAxis(.00001234),'$0.00001234');assert.equal(units.formatAxis(1e-12),'$1.00e-12');
 assert.equal(units.formatAxis(12500,'SOL'),'12.5K SOL');assert.equal(units.formatAxis(-25000),'−$25K');
});
test('market cap and FDV are separate display transforms with a coherent current supply basis',()=>{
 const raw=fixture(),before=structuredClone(raw),cap=units.display(raw,'cap',now),fdv=units.display(raw,'fdv',now);
 assert.equal(cap.measure,'cap');assert.equal(cap.factor,10000000);assert.equal(cap.candles[0].open,100000);assert.equal(cap.candles[0].high,200000);assert.equal(cap.candles[0].low,90000);assert.equal(cap.candles[0].close,150000);
 assert.equal(fdv.measure,'fdv');assert.equal(fdv.factor,20000000);assert.equal(fdv.candles[0].close,300000);
 assert.deepEqual(raw,before,'neither provider OHLC nor volume is mutated');assert.equal(cap.candles[0].volume,0);assert.equal(cap.candles[1].volume,null);
 assert.equal(units.display(raw,'valuation',now).measure,'cap');
 const fdvOnly=fixture();fdvOnly.valuation.marketCapUsd=null;
 assert.equal(units.display(fdvOnly,'valuation',now).measure,'fdv','automatic valuation is visibly FDV when circulating cap is unverified');
 assert.equal(units.display(fdvOnly,'cap',now).measure,'price','an explicit market cap request never silently becomes FDV');
 const restored=units.display(raw,'price',now);assert.equal(restored.candles,raw.candles);assert.equal(restored.factor,1);
});
test('missing, zero, stale, mismatched and nonfinite valuation bases never invent market cap',()=>{
 for(const value of [null,undefined,0,-1,Infinity,NaN,'250000']){const data=fixture();data.valuation.marketCapUsd=value;assert.equal(units.display(data,'cap',now).measure,'price');}
 for(const value of [null,0,-1,Infinity,NaN,'0.025']){const data=fixture();data.valuation.priceUsd=value;assert.equal(units.display(data,'cap',now).measure,'price');}
 for(const patch of [{stale:true},{fetchedAt:null},{fetchedAt:new Date(now-900001).toISOString()},{fetchedAt:new Date(now+61000).toISOString()},{pool:'wrong-pool'},{pool:null}]){const data=fixture();Object.assign(data.valuation,patch);assert.equal(units.display(data,'cap',now).measure,'price');}
 assert.equal(units.display(fixture({stale:true}),'cap',now).measure,'price');
 const missingCandle=fixture();missingCandle.candles[0].low=null;assert.equal(units.display(missingCandle,'cap',now).measure,'price','missing candle values do not become zero cap');
 assert.equal(units.display(fixture({valuation:undefined}),'valuation',now).measure,'price');
 const overflow=fixture();overflow.valuation.marketCapUsd=Number.MAX_VALUE;overflow.valuation.priceUsd=Number.MIN_VALUE;assert.equal(units.display(overflow,'cap',now).measure,'price');
});
test('pool-quote candles and execution prices are never multiplied by a USD supply ratio',()=>{
 const data=fixture({chartCurrency:'token',currency:'SOL',quoteMint:SOL}),before=structuredClone(data),position={mint,basis:{quoteMint:SOL,averageEntry:.012}};
 assert.equal(units.display(data,'cap',now).measure,'price');assert.equal(units.display(data,'fdv',now).candles,data.candles);assert.deepEqual(data,before);
 assert.equal(units.entryPrice(data,position,'price'),.012);assert.equal(units.entryPrice(data,position,'cap'),null);assert.equal(units.entryPrice(data,position,'fdv'),null);
 assert.equal(units.entryPrice({...data,chartCurrency:'usd'},position),null);assert.equal(units.entryPrice({...data,quoteMint:'other'},position),null);assert.equal(units.entryPrice(data,{...position,mint:'other'}),null);
});
test('trade markers identify actual existing candle times identically in cap, FDV, and price views',()=>{
 const raw=fixture(),trades=[{time:18025,side:'buy',signature:'a',executionPrice:.01},{time:18075,side:'sell',signature:'gap'},{time:18130,side:'sell',signature:'b',executionPrice:.02},{time:17940,side:'buy',signature:'outside'}],before=structuredClone(trades);
 const price=units.tradeMarkers(trades,raw.candles,1),cap=units.tradeMarkers(trades,units.display(raw,'cap',now).candles,1),fdv=units.tradeMarkers(trades,units.display(raw,'fdv',now).candles,1);
 assert.deepEqual(cap,price);assert.deepEqual(fdv,price);assert.deepEqual(Array.from(price,row=>row.id),['a','b']);assert.equal(price[0].position,'belowBar');assert.equal(price[1].position,'aboveBar');assert.equal(price[0].color,'#7ad6b0');assert.equal(price[1].color,'#dd879b');assert(!('price' in price[0]));assert.deepEqual(trades,before);
});

function harness(){
 class Element{
  constructor(){this._text='';this._html='';this.hidden=false;this.disabled=false;this.dataset={};this.value='usd';this.attributes=new Map();const classes=new Set();this.classList={add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x)),toggle:(v,on)=>on?classes.add(v):classes.delete(v)};}
  set textContent(value){this._text=String(value);this._html='';}get textContent(){return this._html?this._html.replace(/<[^>]*>/g,''):this._text;}
  set innerHTML(value){this._html=String(value);this._text='';}get innerHTML(){return this._html;}
  setAttribute(name,value){this.attributes.set(name,String(value));}getAttribute(name){return this.attributes.get(name)||null;}
  replaceChildren(){this.textContent='';}scrollIntoView(){}
 }
 const nodes=new Map([...html.matchAll(/id="([^"]+)"/g)].map(match=>[match[1],new Element()])),charts=[],requests=[],chartRequests=[],events={},intervalFns=[],saved={};
 const styles=['candles','line'].map(value=>Object.assign(new Element(),{dataset:{chartStyle:value}}));
 const wallet='5ZeA2mx6MotvFgpF8ZyGHSAVLZAqGuNK5aj8udFwtLC3',clock={now};let chartMode='snapshot';
 class ClockDate extends Date{constructor(...args){super(...(args.length?args:[clock.now]));}static now(){return clock.now;}}
 const terminal={getSelection:()=>({mint}),getChart:()=>({mode:chartMode,data:null}),refreshSwapLabels(){},closeSwap(){},suspendChart(){},refreshChart(){},setChart:(interval,currency)=>chartRequests.push({interval,currency}),openPositionSell(){throw Error('A chart action must never open an order.');}};
 const library={ColorType:{Solid:'solid'},CrosshairMode:{Normal:0},PriceScaleMode:{Normal:0,Logarithmic:1},PriceLineSource:{LastBar:0},LineStyle:{Dashed:2},LineType:{Simple:0},CandlestickSeries:'candles',LineSeries:'line',HistogramSeries:'volume',
  createChart:(_element,options)=>{
   const scales=new Map(),chart={options,series:[],removed:false,logical:null,visible:null,restored:null,
    addSeries(kind,options){const series={kind,options:{...options},data:[],priceLines:[],setData(data){this.data=data;},applyOptions(next){Object.assign(this.options,next);},createPriceLine(options){const line={options};this.priceLines.push(line);return line;},removePriceLine(line){this.priceLines.splice(this.priceLines.indexOf(line),1);}};this.series.push(series);return series;},
    priceScale(id){if(!scales.has(id))scales.set(id,{applyOptions(){}});return scales.get(id);},
    timeScale:()=>({fitContent(){},scrollToRealTime(){},getVisibleRange:()=>chart.visible,getVisibleLogicalRange:()=>chart.logical,setVisibleRange:range=>{chart.restored=range;},setVisibleLogicalRange:range=>{chart.logical=range;}}),
    subscribeCrosshairMove(fn){this.hover=fn;},unsubscribeCrosshairMove(){},remove(){this.removed=true;}
   };charts.push(chart);return chart;
  },createSeriesMarkers:(series,initial)=>{const markers={data:initial,setMarkers(next){this.data=next;},detach(){}};series.markers=markers;return markers;}
 };
 const provider={isPhantom:true,publicKey:{toString:()=>wallet},connect:async()=>({publicKey:provider.publicKey}),on(){}};
 const window={ParallaxTerminal:terminal,LightweightCharts:library,phantom:{solana:provider},addEventListener:(key,fn)=>events[key]=fn};
 const sandbox={window,document:{body:new Element(),hidden:false,getElementById:id=>{assert(nodes.has(id),id);return nodes.get(id);},querySelectorAll:selector=>selector==='[data-chart-style]'?styles:[],addEventListener(){}},Intl,Date:ClockDate,console,AbortController,AbortSignal,matchMedia:()=>({matches:false}),sessionStorage:{getItem:key=>saved[key]||null,setItem:(key,value)=>saved[key]=value},setInterval:fn=>intervalFns.push(fn),clearTimeout(){},setTimeout(){},fetch:(url,init)=>new Promise(resolve=>requests.push({url,init,resolve:body=>resolve(Response.json(body))}))};
 vm.createContext(sandbox);vm.runInContext(helperSource,sandbox);vm.runInContext(nativeSource,sandbox);
 return {nodes,window,charts,requests,chartRequests,clock,styles,intervalFns,events,render:data=>window.ParallaxTrading.renderChart(data),current:()=>charts.at(-1),series:kind=>charts.at(-1).series.find(item=>item.kind===kind),wallet,setMode:mode=>{chartMode=mode;window.ParallaxTrading.chartModeChanged(mode);}};
}
test('native controls round-trip valuation/price, currency, viewport, markers and entry lines safely',async()=>{
 const h=harness(),raw=fixture(),before=structuredClone(raw);h.render(raw);
 assert.equal(h.nodes.get('desk-measure-cap').getAttribute('aria-pressed'),'true');assert.match(h.nodes.get('desk-chart-basis').textContent,/Estimated market cap.*current supply basis/);
 assert.equal(h.series('candles').data[0].close,150000);assert.equal(h.series('line').data[0].value,150000);assert.equal(h.current().options.localization.priceFormatter(250000),'$250K');
 assert.equal(h.series('line').options.color,'#7ad6b0');assert.equal(h.series('candles').options.downColor,'#dd879b');
 assert.equal(h.series('volume').data[0].value,0);assert.equal(h.series('volume').data.length,1);
 const range={from:18000,to:18120};h.current().visible=range;h.nodes.get('desk-measure-price').onclick();assert.equal(h.series('candles').data[0].close,.015);assert.deepEqual(h.current().restored,range);assert.equal(h.nodes.get('desk-measure-price').getAttribute('aria-pressed'),'true');
 h.nodes.get('desk-measure-fdv').onclick();assert.equal(h.series('candles').data[0].close,300000);assert.match(h.nodes.get('desk-chart-basis').textContent,/Estimated FDV.*diluted supply/);assert.match(h.nodes.get('desk-chart-hover').textContent,/Est. FDV/);assert.deepEqual(raw,before);
 await h.nodes.get('desk-connect').onclick();assert.equal(h.requests.length,1);h.requests[0].resolve({wallet:h.wallet,mint,fetchedAt:new Date(now).toISOString(),balance:{rawAmount:'3000',amount:'3',decimals:3,frozen:false},trades:[{signature:'fixture',time:18025,side:'buy',tokenAmount:'3',quoteAmount:'.3',quoteMint:SOL,quoteSymbol:'SOL',executionPrice:.1}],basis:{quoteMint:SOL,quoteSymbol:'SOL',status:'reconciled',averageEntry:.1,remainingCost:.3,reasons:[],method:'Fixture'},mark:null,coverage:'Fixture'});await new Promise(resolve=>setImmediate(resolve));
 const fdvMarkers=JSON.stringify(h.series('candles').markers.data);assert.equal(h.series('candles').priceLines.length,0);h.current().hover({time:18000});assert.match(h.nodes.get('desk-chart-hover').textContent,/BUY 3 @ 0.1 SOL/,'actual execution price is unchanged in FDV mode');
 h.nodes.get('desk-measure-cap').onclick();assert.equal(JSON.stringify(h.series('candles').markers.data),fdvMarkers);assert.equal(h.series('candles').priceLines.length,0);
 h.nodes.get('desk-chart-currency').value='token';h.nodes.get('desk-chart-currency').onchange();assert.deepEqual(h.chartRequests.at(-1),{interval:'1',currency:'token'});
 const quote=fixture({chartCurrency:'token',currency:'SOL',quoteMint:SOL});h.render(quote);assert.equal(h.series('candles').data[0].close,.015);assert.equal(h.nodes.get('desk-measure-price').getAttribute('aria-pressed'),'true');assert.equal(h.series('candles').priceLines[0].options.price,.1);
 h.nodes.get('desk-measure-cap').onclick();assert.deepEqual(h.chartRequests.at(-1),{interval:'1',currency:'usd'});assert.equal(h.nodes.get('desk-chart-currency').value,'usd');assert.equal(h.series('candles').data[0].close,.015,'quote candles remain unscaled while USD data loads');
 h.render(raw);assert.equal(h.series('candles').data[0].close,150000);assert.equal(h.series('candles').priceLines.length,0);assert.equal(JSON.stringify(h.series('candles').markers.data),fdvMarkers);
 h.styles[1].onclick();assert.equal(h.series('line').options.visible,true);assert.equal(JSON.stringify(h.series('line').markers.data),fdvMarkers);
 h.setMode('dex');assert(h.nodes.get('desk-chart-tools').hidden);const count=h.charts.length;h.nodes.get('desk-measure-price').onclick();assert.equal(h.charts.length,count,'hidden native controls cannot mutate an external chart');
});
test('native default labels FDV explicitly and expired or missing bases revert to price',()=>{
 const h=harness(),data=fixture();data.valuation.marketCapUsd=null;h.render(data);
 assert.equal(h.nodes.get('desk-measure-fdv').getAttribute('aria-pressed'),'true');assert(h.nodes.get('desk-measure-cap').disabled);assert.match(h.nodes.get('desk-chart-basis').textContent,/Estimated FDV/);assert.match(h.nodes.get('desk-measure-cap').title,/unverified/);
 h.clock.now+=900001;h.intervalFns.forEach(fn=>fn());assert.equal(h.nodes.get('desk-measure-price').getAttribute('aria-pressed'),'true');assert.equal(h.series('candles').data[0].close,.015);assert(h.nodes.get('desk-measure-fdv').disabled);
 h.render(fixture({valuation:null}));assert.match(h.nodes.get('desk-chart-basis').textContent,/unavailable.*Price per token/);assert(h.nodes.get('desk-measure-cap').disabled);assert(h.nodes.get('desk-measure-fdv').disabled);assert.equal(h.series('candles').data[0].close,.015);
});

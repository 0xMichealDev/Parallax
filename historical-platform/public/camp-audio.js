/* Local, opt-in Web Audio ambience. No recordings or external audio requests. */
(() => {
  'use strict';
  const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
  class CampSound {
    constructor(){
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)throw Error('Audio unavailable');
      this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=.65;this.master.connect(this.ctx.destination);
      this.river=this.ctx.createGain();this.river.gain.value=0;this.river.connect(this.master);this.fire=this.ctx.createGain();this.wind=this.ctx.createGain();
      this.fire.gain.value=this.wind.gain.value=0;this.fire.connect(this.master);this.wind.connect(this.master);
      this.loop('fire',7,3600);this.loop('wind',11,620);this.loop('river',9,2400);
      const rate=this.ctx.sampleRate;this.stepBuffer=this.ctx.createBuffer(1,Math.ceil(rate*.24),rate);
      const data=this.stepBuffer.getChannelData(0);let low=0;
      for(let i=0;i<data.length;i++){low=.76*low+.24*(Math.random()*2-1);const t=i/rate;data[i]=(low*.8+(Math.random()*2-1)*.22)*Math.sin(Math.PI*Math.min(1,t/.025))*Math.exp(-t*19);}
      this.nextStep=0;
    }
    loop(kind,seconds,frequency){
      const rate=this.ctx.sampleRate,buffer=this.ctx.createBuffer(1,rate*seconds,rate),data=buffer.getChannelData(0);let low=0,pop=0;
      for(let i=0;i<data.length;i++){
        const t=i/rate;low=(low+(Math.random()*2-1)*.035)/1.035;
        if(kind==='fire'){if(Math.random()<.00017)pop=.25+Math.random()*.65;pop*=.989;data[i]=low*1.9+pop*(Math.random()*2-1);}
        else if(kind==='river')data[i]=low*2.5+(Math.random()*2-1)*.10*(.85+.15*Math.sin(t*3.6));
        else data[i]=low*3.2*(.66+.18*Math.sin(t*Math.PI*2/seconds)+.12*Math.sin(t*Math.PI*6/seconds));
      }
      // Smooth the loop join without a silent gap.
      const fade=Math.min(rate*.08,data.length/4)|0;
      for(let i=0;i<fade;i++){const a=i/fade;data[data.length-fade+i]=data[data.length-fade+i]*(1-a)+data[i]*a;}
      const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=frequency;source.connect(filter);filter.connect(this[kind]);source.start();
    }
    async resume(){await this.ctx.resume();if(this.ctx.state!=='running')throw Error('Audio paused');}
    volume(value){this.master.gain.setTargetAtTime(clamp(value),this.ctx.currentTime,.08);}
    level(fire,wind){this.fire.gain.setTargetAtTime(clamp(fire),this.ctx.currentTime,.18);this.wind.gain.setTargetAtTime(clamp(wind),this.ctx.currentTime,.4);}
    riverLevel(value){this.river.gain.setTargetAtTime(clamp(value),this.ctx.currentTime,.4);}
    step(){
      const t=this.ctx.currentTime;if(this.ctx.state!=='running'||t<this.nextStep)return;this.nextStep=t+.16;
      const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.stepBuffer;source.playbackRate.value=.88+Math.random()*.22;gain.gain.value=.42;source.connect(gain);gain.connect(this.master);source.onended=()=>{source.disconnect();gain.disconnect();};source.start();
    }
    suspend(){this.level(0,0);this.riverLevel(0);this.ctx.suspend().catch(()=>{});}
  }
  window.ParallaxCampSound=CampSound;
})();

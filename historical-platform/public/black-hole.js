(() => {
  'use strict';
  const media=matchMedia('(prefers-reduced-motion: reduce)'),full=document.querySelector('#singularity-dialog');
  let paused=media.matches,returnFocus=null;
  const instances=[];
  function labels(){for(const id of ['singularity-motion','singularity-full-motion']){const b=document.getElementById(id);b.textContent=paused?'Resume effects ▷':'Pause effects Ⅱ';b.setAttribute('aria-pressed',String(paused));}document.querySelector('#our-planet').classList.toggle('singularity-paused',paused);}
  function toggle(){paused=!paused;labels();instances.forEach(i=>i.draw());}
  document.getElementById('singularity-motion').onclick=toggle;document.getElementById('singularity-full-motion').onclick=toggle;
  window.openParallaxBlackHole=()=>{returnFocus=document.activeElement;full.showModal();instances.forEach(i=>i.resize());document.getElementById('singularity-exit').focus();};
  document.getElementById('singularity-enter').onclick=window.openParallaxBlackHole;
  document.getElementById('singularity-exit').onclick=()=>full.close();full.addEventListener('close',()=>returnFocus?.focus());
  media.addEventListener('change',()=>{if(media.matches){paused=true;labels();}});labels();
  document.getElementById('singularity-copy').onclick=async()=>{const input=document.getElementById('singularity-ca'),status=document.getElementById('singularity-status');try{await navigator.clipboard.writeText(input.value);status.textContent='Official contract address copied.'}catch{input.select();status.textContent='Address selected. Copy it using your device menu.'}};
  for(const canvas of document.querySelectorAll('.black-hole-canvas')){
    const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});if(!gl)continue;
    let ready=false,visible=false,lost=false,elapsed=0,previous=0,lastDraw=0;
    const vertex='attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
    const fragment=`precision highp float;uniform vec2 resolution;uniform sampler2D scene;uniform float time;
      void main(){
        vec2 uv=gl_FragCoord.xy/resolution;float aspect=resolution.x/resolution.y;float imageAspect=1.7777778;
        vec2 fit=aspect>imageAspect?vec2(1.,imageAspect/aspect):vec2(aspect/imageAspect,1.);
        uv=(uv-.5)*fit+vec2(.5,.5);uv.x-=.10*(1.-fit.x);
        vec2 center=vec2(.384,.51);vec2 p=(uv-center)*vec2(imageAspect,1.);float r=length(p);float a=atan(p.y,p.x);
        float ring=smoothstep(.173,.21,r)*(1.-smoothstep(.43,.63,r));
        float disk=exp(-pow(p.y/.047,2.))*(1.-smoothstep(.6,1.,abs(p.x)));
        float eddy=sin(a*9.+r*43.-time*.55)*.008+sin(a*17.-r*75.+time*.85)*.004;
        float theta=a+eddy*ring;vec2 warped=vec2(cos(theta),sin(theta))*r;
        vec2 sampleUV=center+warped/vec2(imageAspect,1.);
        sampleUV.x+=sin(uv.x*55.-time*.42)*.0032*disk;
        sampleUV.y+=sin(uv.x*38.+time*.65)*.0016*disk;
        vec3 base=texture2D(scene,sampleUV).rgb;
        float flow=.5+.5*sin(a*16.+r*95.-time*1.2);
        float flow2=.5+.5*sin(p.x*110.-time*2.1+p.y*90.);
        base*=1.+ring*.12*(flow-.5)+disk*.13*(flow2-.5);
        float arc=exp(-pow((r-.181)/.007,2.));
        base+=vec3(.12,.27,.50)*arc*.07*(.5+.5*sin(a*4.-time*.35));
        gl_FragColor=vec4(base,1.);
      }`;
    try{
      function compile(type,code){const sh=gl.createShader(type);gl.shaderSource(sh,code);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error('shader');return sh}
      const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('link');gl.useProgram(program);
      const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
      const clock=gl.getUniformLocation(program,'time'),resolution=gl.getUniformLocation(program,'resolution');
      function resize(){const bounds=canvas.getBoundingClientRect();if(!bounds.width||!bounds.height)return;const ratio=Math.min(devicePixelRatio||1,1.4,1600/bounds.width);const w=Math.round(bounds.width*ratio),h=Math.round(bounds.height*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}draw();}
      function draw(){if(!ready||lost||!canvas.width||!canvas.height)return;gl.uniform2f(resolution,canvas.width,canvas.height);gl.uniform1f(clock,elapsed);gl.drawArrays(gl.TRIANGLES,0,6);}
      const image=new Image();image.onload=()=>{if(lost)return;const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);ready=true;resize();canvas.classList.add('black-hole-ready');};image.src='/assets/parallax-singularity.png';
      new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)resize();}).observe(canvas);new ResizeObserver(resize).observe(canvas);
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;canvas.classList.remove('black-hole-ready');});
      instances.push({draw,resize});
      function frame(t){if(lost)return;const delta=previous?Math.min((t-previous)/1000,.1):0;previous=t;if(visible&&!document.hidden&&ready&&(!paused||canvas.closest('#after-dark'))&&!document.body.classList.contains('motion-paused')&&(!document.body.classList.contains('after-dark-active')||canvas.closest('#after-dark'))&&!canvas.closest('.ad-paused')){elapsed+=delta;if(t-lastDraw>33){draw();lastDraw=t;}}requestAnimationFrame(frame);}requestAnimationFrame(frame);
    }catch{canvas.classList.remove('black-hole-ready');}
  }
})();

from pathlib import Path
import hashlib
root=Path(__file__).resolve().parents[1]
s=(root/'baseline/public/camp-experience.js').read_text()
assert hashlib.sha256(s.encode()).hexdigest()=='23cdf7bf14de19b36a8fb0cb99c33c7b4fd89997bd93f394576d8cc8418a29cd'
def replace(old,new):
 global s
 assert s.count(old)==1, f'Anchor count {s.count(old)} for {old[:70]}'
 s=s.replace(old,new)
replace('<button id="u-scope-reset">Center &amp; refocus</button>', '''<div class="u-scope-course"><span class="u-camp-kicker">NEXT / YOUR FLIGHT PLAN</span><p id="u-scope-course-note" role="status" aria-live="polite">Choose an observation to see available travel.</p><button id="u-scope-course" class="u-camp-primary" type="button" aria-describedby="u-scope-course-note" disabled>Observation only</button></div><button id="u-scope-reset">Center &amp; refocus</button>''')
replace("    q('#u-field-launch').onclick=()=>rocket?.guide();", """    q('#u-field-launch').onclick=()=>rocket?.guide();
    // Only these reviewed spacecraft observations map to the existing flight catalog.
    // Deep-sky images and unconnected community worlds remain observation-only.
    const observationCourses=Object.freeze({PIA00405:'Moon',PIA22946:'Jupiter',PIA17172:'Saturn'});
    function observationPlanet(){const planet=observationCourses[targets[scopeIndex]?.image];return planet&&window.ParallaxRocket?.PLANETS.includes(planet)?planet:null;}
    function courseLabels(){const g=getGround(),planet=observationPlanet(),button=q('#u-scope-course'),note=q('#u-scope-course-note');const available=!!planet&&typeof rocket?.plan==='function'&&g?.ready&&!g.driving&&g.flight?.mode==='ground';button.disabled=!available;button.textContent=available?'Set course for '+planet+' ↗':'Observation only';note.textContent=available?'Save this destination and follow the trail to the rocket. You will confirm launch aboard.':planet?'Return to the ground on foot to set a course.':'This observation is not a connected flight destination. Your existing course stays unchanged.';}
    q('#u-scope-course').onclick=()=>{const g=getGround(),planet=observationPlanet(),point=g?.points?.telescope;if(panel!==scope||!visible||document.hidden||!isWalking()||!point||!Number.isFinite(g.state.x)||!Number.isFinite(g.state.z)||Math.hypot(g.state.x-point[0],g.state.z-point[2])>2.8||!planet||!rocket?.plan(planet)){q('#u-scope-course-note').textContent='Move to the telescope on foot and select a connected destination.';return;}freeze();closePanel(false);rocket.guide();fieldLabels();stage.focus();announce('Course set for '+planet+'. Follow the trail to the rocket and confirm launch aboard.');draw();};""")
replace("soundOn,found.size].join(':');", "soundOn,found.size,g.flight?.planet].join(':');")
replace("fieldSignature=signature;q('#u-field-binoculars')", "fieldSignature=signature;q('#u-field-launch').textContent=g.flight?.planet?'Rocket: '+g.flight.planet+' ↗':'Launch campus ↗';q('#u-field-binoculars')")
replace("    function openScope(){visit('telescope');openPanel(scope);selectTarget(scopeIndex);}", "    function openScope(){const g=getGround();if(!g?.ready||g.driving||g.flight?.mode!=='ground')return;visit('telescope');openPanel(scope);selectTarget(scopeIndex);}")
replace("    function selectTarget(i){scopeIndex=i;const target=targets[i];", "    function selectTarget(i){if(!Number.isInteger(i)||!targets[i])return;scopeIndex=i;courseLabels();const target=targets[i];")
# Fire, wind and river audio must stay at ground level, not follow the cabin into space.
replace("active=visible&&!document.hidden&&soundOn;", "active=visible&&!document.hidden&&soundOn&&g?.flight?.mode==='ground';")
replace("document.addEventListener('visibilitychange',()=>{if(document.hidden)audio?.suspend();", "document.addEventListener('visibilitychange',()=>{if(document.hidden){freeze();drag=null;audio?.suspend();}")
replace("    function update(){\n", "    window.addEventListener('blur',()=>{freeze();drag=null;});\n    function update(){\n")
# Closing the outer experience invalidates any pending arrival and restores the real world state.
replace("close(){adventure?.close?.();if(getGround()?.flight?.mode!=='ground'&&getGround()?.flight)getGround().exitRocket();", "close(){adventure?.close?.();rocket?.close?.();if(getGround()?.flight?.mode!=='ground'&&getGround()?.flight)getGround().exitRocket();")
(root/'public/camp-experience.js').write_text(s)
print('Generated integrated camp controller:',len(s.encode()),'bytes')

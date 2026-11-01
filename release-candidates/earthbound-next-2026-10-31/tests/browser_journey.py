"""Real Chromium DOM tests; world rendering/routing/audio are explicit fixtures, not production.
Requires Python Playwright and an installed Chromium. No external service calls.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import json, os, re
ROOT=Path(__file__).resolve().parents[1]
# Offline DOM rendering uses only local strings; no HTTP/browser security settings are altered.
html=(ROOT/'tests/fixture/index.html').read_text()
html=re.sub(r'<script\b[^>]*>[\s\S]*?</script>', '', html)
html=html.replace('<link rel="stylesheet" href="/public/observatory-journey.css">','<style>'+(ROOT/'public/observatory-journey.css').read_text()+'</style>')
results=[]
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
    for profile in [{'name':'desktop','width':1280,'height':900,'touch':False},{'name':'phone','width':390,'height':844,'touch':True}]:
        context=browser.new_context(viewport={'width':profile['width'],'height':profile['height']},has_touch=profile['touch'],is_mobile=profile['touch'],device_scale_factor=1)
        page=None;errors=[]
        def fresh():
            global page,errors
            if page:page.close()
            errors=[];page=context.new_page();page.set_default_timeout(3500);page.on('pageerror',lambda e:errors.append(str(e)))
            page.set_content(html,wait_until='load')
            for script in ['public/rocket-state.js','public/rocket-experience.js','public/camp-experience.js','tests/fixture/world.js']:
                page.add_script_tag(content=(ROOT/script).read_text())
            page.wait_for_function('window.test !== undefined')
        def click(selector):
            target=page.locator(selector)
            target.tap() if profile['touch'] else target.click()
        def state():return page.evaluate('test.snapshot()')
        def check(name,fn):
            try:
                fresh();fn();assert not errors,errors
                results.append({'profile':profile['name'],'name':name,'passed':True})
            except Exception as e:
                results.append({'profile':profile['name'],'name':name,'passed':False,'error':str(e)})
                print('FAIL',profile['name'],name,str(e)[:500],flush=True)
        def scope(name='Saturn'):
            click('[data-place="telescope"]');page.get_by_role('button',name=name,exact=True).click()
        def set_course(name='Saturn'):
            scope(name);click('#u-scope-course');page.evaluate('test.tick()')
        def cabin(name='Saturn'):
            set_course(name);page.evaluate('test.atLift()');click('.u-rocket-action');page.evaluate('test.tick(51)')
            assert state()['flight']['mode']=='cabin'
        def launch(name='Saturn',mode='success'):
            cabin(name);click('.u-rocket-action');page.evaluate('(m)=>test.setArrival(m)',mode);click('.u-rocket-launch');page.evaluate('test.tick(112)')
        def observation_only():
            click('[data-place="telescope"]');assert page.locator('#u-scope-course').is_disabled();assert state()['flight']['planet']=='Mars'
        check('deep-sky target remains observation-only',observation_only)
        def inspect_cancel():
            scope();assert state()['flight']['planet']=='Mars';page.keyboard.press('Escape');assert not state()['observing'];assert state()['flight']['planet']=='Mars'
        check('inspecting and closing telescope does not change course',inspect_cancel)
        def commit():
            page.evaluate('test.input.forward=1;test.input.touch=7');set_course();s=state();assert s['flight']['planet']=='Saturn';assert not s['blocking'];assert s['focus']=='u-stage';assert s['input']=={'forward':0,'touch':None}
            assert page.evaluate("test.events.some(e=>e?.guide?.name?.includes('Saturn'))")
            assert 'Saturn' in page.locator('#u-field-launch').inner_text()
        check('explicit telescope course, guidance, input reset and focus handoff',commit)
        for name in ['Moon','Jupiter']:
            def run(n=name):set_course(n);assert state()['flight']['planet']==n
            check('supported telescope destination '+name,run)
        def no_driving():
            page.evaluate('test.ground.driving=true');page.locator('[data-place="telescope"]').evaluate('(b)=>b.click()');assert not state()['observing']
        check('telescope does not interrupt rover driving',no_driving)
        def moved():
            scope();page.evaluate('test.ground.state.x=100');click('#u-scope-course');assert state()['flight']['planet']=='Mars';assert state()['observing']
        check('stale out-of-range telescope commit is rejected',moved)
        def handoff_cancel():
            cabin();click('.u-rocket-action');assert page.locator('#u-rocket-planet').input_value()=='Saturn'
            page.locator('#u-rocket-planet').select_option('Jupiter');click('.u-rocket-panel [data-close]');assert state()['flight']['planet']=='Saturn'
            page.evaluate('test.tick()');click('.u-rocket-action');assert page.locator('#u-rocket-planet').input_value()=='Saturn'
        check('flight deck inherits course and cancelling edits preserves it',handoff_cancel)
        def change_launch():
            cabin();click('.u-rocket-action');page.locator('#u-rocket-planet').select_option('Jupiter');click('.u-rocket-launch');page.evaluate('test.tick(112)');assert state()['arrivals']==['Jupiter'];page.evaluate('test.tick(20)');assert state()['arrivals']==['Jupiter']
        check('confirmed deck override reaches arrival callback exactly once',change_launch)
        def endtoend():
            launch();assert state()['arrivals']==['Saturn'];assert state()['flight']['mode']=='ground';assert state()['flight']['planet']=='Saturn'
        check('telescope to boarding to flight to exact destination callback',endtoend)
        def cancel_lift():
            set_course();page.evaluate('test.atLift()');click('.u-rocket-action');page.evaluate('test.tick(2)');click('.u-rocket-exit');s=state();assert s['flight']['mode']=='ground';assert s['flight']['planet']=='Saturn';assert s['state']['z']==-108;assert s['focus']=='u-stage';assert not s['arrivals']
        check('lift cancellation restores launch-pad pose and keeps course',cancel_lift)
        def cancel_launch():
            cabin();click('.u-rocket-action');click('.u-rocket-launch');page.evaluate('test.tick(10)');click('.u-rocket-exit');page.evaluate('test.tick(120)');assert not state()['arrivals'];assert state()['flight']['planet']=='Saturn'
        check('countdown cancellation does not later trigger arrival',cancel_launch)
        def pause():
            cabin();click('.u-rocket-action');click('.u-rocket-launch');page.evaluate('test.tick(4);window.dispatchEvent(new Event("blur"));test.tick(20)');elapsed=state()['flight']['elapsed'];page.evaluate('test.tick(20)');assert state()['flight']['elapsed']==elapsed
            click('.u-rocket-resume');page.evaluate('test.tick(120)');assert state()['arrivals']==['Saturn']
        check('blur pauses flight until explicit resume',pause)
        def hidden():
            cabin();click('.u-rocket-action');click('.u-rocket-launch');page.evaluate('test.tick(4);Object.defineProperty(document,"hidden",{value:true,configurable:true});document.dispatchEvent(new Event("visibilitychange"));test.tick(20)');elapsed=state()['flight']['elapsed'];assert not state()['arrivals']
            page.evaluate('Object.defineProperty(document,"hidden",{value:false,configurable:true});document.dispatchEvent(new Event("visibilitychange"));test.tick(20)');assert state()['flight']['elapsed']==elapsed
            click('.u-rocket-resume');page.evaluate('test.tick(120)');assert state()['arrivals']==['Saturn']
        check('hidden page freezes flight and restores a resumable state',hidden)
        def reduced():
            page.evaluate('test.setMotion(false)');set_course('Moon');page.evaluate('test.atLift()');click('.u-rocket-action');page.evaluate('test.tick()');assert state()['flight']['mode']=='cabin'
            click('.u-rocket-action');click('.u-rocket-launch');page.evaluate('test.tick()');assert state()['arrivals']==['Moon']
        check('reduced-motion path uses the same course and arrives once',reduced)
        for mode in ['throw','reject','false']:
            def failed(m=mode):
                launch(mode=m);page.wait_for_function("document.querySelector('.u-rocket-retry').hidden===false",timeout=1000) if m!='reject' else page.evaluate('test.tick()')
                page.evaluate('test.tick()');assert state()['flight']['mode']=='orbit';assert state()['flight']['planet']=='Saturn';assert len(state()['arrivals'])==1
                page.evaluate("test.setArrival('success')");click('.u-rocket-retry');page.evaluate('test.tick()');assert state()['arrivals']==['Saturn','Saturn'];assert state()['flight']['mode']=='ground'
            check('arrival '+mode+' stays recoverable without changing destination',failed)
        def stale():
            launch(mode='pending');assert state()['flight']['mode']=='orbit';click('.u-rocket-exit');page.evaluate('test.resolve(true)');page.evaluate('test.tick()');assert state()['flight']['mode']=='ground';assert len(state()['arrivals'])==1
        check('late arrival result cannot restore a cancelled flight',stale)
        def outerclose():
            launch(mode='close');assert state()['flight']['mode']=='ground';assert state()['arrivals']==['Saturn']
        check('arrival adapter may close camp synchronously without double handoff',outerclose)
        def image_failure():
            scope();assert 'could not load' in page.locator('#u-scope-status').inner_text();click('#u-scope-course');assert state()['flight']['planet']=='Saturn'
        check('unavailable observation image does not fabricate data or lose valid course',image_failure)
        def focus_loop():
            scope();page.locator('.u-scope [data-close]').focus();page.keyboard.press('Shift+Tab');assert page.evaluate('document.activeElement.id')=='u-scope-reset'
            page.keyboard.press('Tab');assert page.evaluate("document.activeElement.matches('.u-scope [data-close]')")
        check('telescope keyboard focus stays inside modal',focus_loop)
        def phone_bounds():
            scope();page.locator('#u-scope-course').scroll_into_view_if_needed();box=page.locator('#u-scope-course').bounding_box();assert box['width']>100;assert box['height']>=44;assert box['x']>=0;assert box['x']+box['width']<=profile['width'];assert box['y']+box['height']<=profile['height']
            page.screenshot(path=str(ROOT/'evidence'/f"telescope-{profile['name']}.png"))
        check('course control stays reachable and touch-sized in fixture',phone_bounds)
        def audio_ground():
            click('#u-field-sound');page.evaluate('test.tick()');assert page.evaluate("test.audioCalls.includes('resume')")
            page.evaluate("test.atLift()");click('.u-rocket-action');page.evaluate('test.tick()');assert page.evaluate('test.audioCalls.filter(Array.isArray).at(-1).every(v=>v===0)')
        check('ground ambience does not follow the cabin into flight',audio_ground)
        context.close()
    browser.close()
report={'scope':'Offline document injection; no network navigation. Actual candidate camp/rocket DOM and state controllers in Chromium; fixture world adapter and fixture base CSS, not live 3D/device validation','tests':results,'passed':sum(r['passed'] for r in results),'failed':sum(not r['passed'] for r in results)}
(ROOT/'evidence/browser-tests.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'passed':report['passed'],'failed':report['failed']}),flush=True)
raise SystemExit(bool(report['failed']))

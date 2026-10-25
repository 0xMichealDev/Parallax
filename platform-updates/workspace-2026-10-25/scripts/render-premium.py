"""Render Premium collection thumbnails with the production GLSL shader (Mesa EGL, Pillow).

Developer asset-generation helper, not part of the Site runtime or build.
Run from the repository root with Python 3. Outputs are tracked in public/assets/premium.
"""
import ctypes as C
import ctypes.util
import json
import os
from pathlib import Path
import re
import sys
import math

icon_mode = "--icons" in sys.argv
from PIL import Image

os.environ.setdefault('EGL_PLATFORM', 'surfaceless')
egl = C.CDLL(ctypes.util.find_library('EGL'))

def efn(name, result, args):
    f = getattr(egl, name)
    f.restype, f.argtypes = result, args
    return f

ptr, integer, uint, floating = C.c_void_p, C.c_int, C.c_uint, C.c_float
get_display = efn('eglGetDisplay', ptr, [ptr])
initialize = efn('eglInitialize', uint, [ptr, C.POINTER(integer), C.POINTER(integer)])
choose = efn('eglChooseConfig', uint, [ptr, C.POINTER(integer), C.POINTER(ptr), integer, C.POINTER(integer)])
bind_api = efn('eglBindAPI', uint, [uint])
surface = efn('eglCreatePbufferSurface', ptr, [ptr, ptr, C.POINTER(integer)])
context = efn('eglCreateContext', ptr, [ptr, ptr, ptr, C.POINTER(integer)])
current = efn('eglMakeCurrent', uint, [ptr, ptr, ptr, ptr])
proc = efn('eglGetProcAddress', ptr, [C.c_char_p])
display = get_display(None)
major, minor = integer(), integer()
assert initialize(display, C.byref(major), C.byref(minor)), 'EGL initialization failed'
assert bind_api(0x30A0), 'OpenGL ES unavailable'
attrs = (integer * 15)(0x3033, 1, 0x3040, 4, 0x3024, 8, 0x3023, 8, 0x3022, 8, 0x3021, 8, 0x3025, 0, 0x3038)
config, count = ptr(), integer()
assert choose(display, attrs, C.byref(config), 1, C.byref(count)) and count.value
size = 960
target = surface(display, config, (integer * 5)(0x3057, size, 0x3056, size, 0x3038))
ctx = context(display, config, None, (integer * 3)(0x3098, 2, 0x3038))
assert target and ctx and current(display, target, target, ctx), 'EGL context unavailable'

def gl(name, result, args):
    address = proc(name.encode())
    assert address, name
    return C.CFUNCTYPE(result, *args)(address)

create_shader = gl('glCreateShader', uint, [uint])
shader_source = gl('glShaderSource', None, [uint, integer, C.POINTER(C.c_char_p), C.POINTER(integer)])
compile_shader = gl('glCompileShader', None, [uint])
shader_status = gl('glGetShaderiv', None, [uint, uint, C.POINTER(integer)])
shader_log = gl('glGetShaderInfoLog', None, [uint, integer, C.POINTER(integer), C.c_char_p])
create_program = gl('glCreateProgram', uint, [])
attach = gl('glAttachShader', None, [uint, uint])
link = gl('glLinkProgram', None, [uint])
program_status = gl('glGetProgramiv', None, [uint, uint, C.POINTER(integer)])
use = gl('glUseProgram', None, [uint])
code = Path('public/planet-renderer.js').read_text()
program = create_program()
for key, kind in [('vertex', 0x8B31), ('fragment', 0x8B30)]:
    shader_text = re.search(r'const '+key+r'=`([\s\S]*?)`;', code).group(1)
    if icon_mode and key == 'fragment':
        # Still thumbnails use quieter emission and mapped relief so fine detail
        # survives at 48px. The interactive production shader stays unchanged.
        shader_text = shader_text.replace(
            'base=mix(vec3(.018,.012,.02),vec3(.17,.065,.025),land);',
            'cracks*=smoothstep(.39,.64,fbm(material*3.+2.));base=mix(vec3(.018,.016,.015),vec3(.10,.075,.052),land)*(0.5+tex.r*1.8);')
        shader_text = shader_text.replace(
            'mix(vec3(1.,.11,.008),vec3(1.,.55,.08),cracks)*pow(cracks,2.)*(1.2+.15*sin(uTime+land*20.))',
            'mix(vec3(.9,.025,.002),vec3(1.,.24,.015),cracks)*pow(cracks,2.)*.85')
        shader_text = shader_text.replace(
            'base*=1.-seams*.5;',
            'base*=1.-seams*.5;base*=.5+dot(tex,vec3(.333))*1.0;')
        shader_text = shader_text.replace(
            'base=mix(base,gold*.22,veins*.55);emission=gold*veins*.26;',
            'veins*=smoothstep(.3,.62,fbm(material*3.));base*=.5+tex.r*2.;base=mix(base,gold*.34,veins*.7);emission=gold*veins*.12;')
        shader_text = shader_text.replace(
            'if(uRefined<.5){float relief=',
            'emission*=.18+.82*day;float terrain=fbm(material*85.);base*=.7+.6*terrain;if(uRefined<.5){float relief=')
    source = shader_text.encode()
    shader = create_shader(kind)
    shader_source(shader, 1, C.byref(C.c_char_p(source)), None)
    compile_shader(shader)
    status = integer()
    shader_status(shader, 0x8B81, C.byref(status))
    if not status.value:
        log = C.create_string_buffer(8192)
        shader_log(shader, 8192, None, log)
        raise RuntimeError(log.value.decode())
    attach(program, shader)
link(program)
status = integer()
program_status(program, 0x8B82, C.byref(status))
assert status.value, 'Shader link failed'
use(program)
buffer = uint()
gl('glGenBuffers', None, [integer, C.POINTER(uint)])(1, C.byref(buffer))
gl('glBindBuffer', None, [uint, uint])(0x8892, buffer)
vertices = (floating * 12)(-1,-1,1,-1,-1,1,-1,1,1,-1,1,1)
gl('glBufferData', None, [uint, C.c_ssize_t, ptr, uint])(0x8892, C.sizeof(vertices), vertices, 0x88E4)
position = gl('glGetAttribLocation', integer, [uint, C.c_char_p])(program, b'aPosition')
gl('glEnableVertexAttribArray', None, [uint])(position)
gl('glVertexAttribPointer', None, [uint, integer, uint, uint, integer, ptr])(position, 2, 0x1406, 0, 0, None)
location = gl('glGetUniformLocation', integer, [uint, C.c_char_p])
u1f = gl('glUniform1f', None, [integer, floating])
u1i = gl('glUniform1i', None, [integer, integer])
u3f = gl('glUniform3f', None, [integer, floating, floating, floating])
gen_texture = gl('glGenTextures', None, [integer, C.POINTER(uint)])
active_texture = gl('glActiveTexture', None, [uint])
bind_texture = gl('glBindTexture', None, [uint, uint])
tex_parameter = gl('glTexParameteri', None, [uint, uint, integer])
tex_image = gl('glTexImage2D', None, [uint, integer, integer, integer, integer, integer, uint, uint, ptr])
textures = {}

def texture(file, unit):
    active_texture(0x84C0 + unit)
    if file in textures:
        bind_texture(0x0DE1, textures[file])
        return
    t = uint()
    gen_texture(1, C.byref(t))
    bind_texture(0x0DE1, t)
    for key, value in [(0x2802,0x812F),(0x2803,0x812F),(0x2801,0x2601),(0x2800,0x2601)]:
        tex_parameter(0x0DE1, key, value)
    im = Image.open(Path('public/assets/globe') / file).convert('RGBA')
    pixels = C.create_string_buffer(im.tobytes())
    tex_image(0x0DE1, 0, 0x1908, im.width, im.height, 0, 0x1908, 0x1401, pixels)
    textures[file] = t


# Curated Premium Worlds thumbnails, rendered with the production shader.
out = Path('public/assets/premium')
out.mkdir(parents=True, exist_ok=True)
collections = [
    ('aurora',3,'#8cebd1',6,'dusk'),
    ('sovereign',4,'#d7b367',4,'studio'),
    ('frontier',2,'#96d9ff',7,'studio'),
    ('ember',1,'#ffb072',3,'sunrise'),
]
icons = [
    ('surface-original',0,'#86bbec',0,'studio'),
    ('surface-volcanic',1,'#e9904d',0,'studio'),
    ('surface-glacial',2,'#b8e4f3',0,'studio'),
    ('surface-biolume',3,'#66cdb6',0,'studio'),
    ('surface-obsidian',4,'#d7b367',0,'studio'),
    ('environment-aurora',0,'#86d6bd',0,'dusk'),
    ('environment-eclipse',0,'#e6b96b',0,'eclipse'),
    ('environment-orbit',0,'#b0bfd0',2,'studio'),
]
for name, material, accent, rings, lighting in (icons if icon_mode else collections):
    texture('2k_moon.jpg' if name=='environment-eclipse' else '2k_saturn.jpg' if name=='environment-orbit' else '2k_mars.jpg' if material==1 else '2k_europa.jpg' if material==2 else '2k_moon.jpg' if material==4 else '2k_earth_daymap.jpg',0)
    texture('2k_earth_clouds.jpg',1)
    texture('2k_earth_nightmap.jpg',2)
    for uniform,value in [('uMap',0),('uCloud',1),('uNight',2)]:
        u1i(location(program,uniform.encode()),value)
    u3f(location(program,b'uAccent'),*[int(accent[i:i+2],16)/255 for i in [1,3,5]])
    light={'studio':[-.65,.45,.62],'dusk':[.75,.25,.23],'sunrise':[-.91,.18,.32],'eclipse':[-.2,.2,-.94]}[lighting]
    if icon_mode and lighting=='studio':light=[-.76,.34,.56]
    if icon_mode:light=[x/math.sqrt(sum(v*v for v in light)) for x in light]
    u3f(location(program,b'uLight'),*light)
    values={'uTime':6.4,'uSurface':0,'uMaterial':material,'uRings':rings,'uWeather':0 if material==4 else 1,'uAtmosphere':0 if material in [2,4] else 2,'uHasMap':1,'uHasCloud':1,'uHasNight':1,'uPixel':4.1/size,'uBrandEnabled':0,'uRefined':0}
    if icon_mode:
        values.update(uRefined=1,uNatural=1,uAir=.35 if material==0 else .08,uWeather=1 if material==0 and name not in ['environment-orbit','environment-eclipse'] else 0,uHasNight=0,uAtmosphere=0,uTime=5.7)
        if name=='environment-eclipse':values.update(uSurface=1,uAir=2.5)
        if name=='environment-orbit':values.update(uSurface=2,uAir=.15)
        if name=='environment-aurora':values.update(uAir=1.7)
    for uniform,value in values.items(): u1f(location(program,uniform.encode()),value)
    gl('glViewport',None,[integer,integer,integer,integer])(0,0,size,size)
    gl('glClearColor',None,[floating]*4)(0,0,0,0)
    gl('glClear',None,[uint])(0x4000)
    gl('glDrawArrays',None,[uint,integer,integer])(4,0,6)
    pixels=(C.c_ubyte*(size*size*4))()
    gl('glReadPixels',None,[integer,integer,integer,integer,uint,uint,ptr])(0,0,size,size,0x1908,0x1401,pixels)
    im=Image.frombytes('RGBA',(size,size),bytes(pixels)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    assert im.getchannel('A').getbbox(), 'Empty render'
    if icon_mode:
        if not rings:im=im.crop((190,190,770,770))
        im=im.resize((256,256),Image.Resampling.LANCZOS)
        im.save(out/(name+'-v186.webp'),quality=94,method=6)
    else:
        im=im.resize((600,600),Image.Resampling.LANCZOS)
        im.save(out/(name+'-v139.webp'),quality=91,method=6)
    print(name,im.size)

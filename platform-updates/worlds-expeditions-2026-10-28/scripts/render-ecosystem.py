"""Render concept fallbacks with the production GLSL shader (Mesa EGL, Pillow).

Developer asset-generation helper, not part of the Site runtime or build.
Run from the repository root with Python 3. Outputs are tracked in public/assets/ecosystem.
"""
import argparse
import ctypes as C
import ctypes.util
import json
import math
import os
from pathlib import Path
import re
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('worlds', nargs='*', help='Optional catalog IDs; omitted renders the full catalog.')
parser.add_argument('--output-dir', type=Path, default=Path('public/assets/ecosystem'))
parser.add_argument('--phase', type=float, default=6.4)
parser.add_argument('--portrait-yaw', type=float, help='Explicit portrait turn in degrees, clamped to the verified -24..24 range.')
args = parser.parse_args()
catalog = json.loads(Path('public/ecosystem-worlds.json').read_text())
catalog.append(json.loads(Path('public/gatto-world.json').read_text()))
solhandle = json.loads(Path('public/solhandle-world.json').read_text())
catalog.append({**solhandle, 'id': 'solhandle', 'map': '2k_mars.jpg'})
unknown = set(args.worlds) - {world['id'] for world in catalog}
if unknown:
    parser.error('Unknown worlds: ' + ', '.join(sorted(unknown)))

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
    source = re.search(r'const '+key+r'=`([\s\S]*?)`;', code).group(1).encode()
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

out = args.output_dir
out.mkdir(parents=True, exist_ok=True)
for world in catalog:
    if args.worlds and world['id'] not in args.worlds:
        continue
    style = world['style']
    _, _, surface_name, ring, weather = world['design'].split('-')
    texture(world['map'], 0)
    texture('2k_earth_clouds.jpg', 1)
    texture('2k_earth_nightmap.jpg', 2)
    for name, value in [('uMap',0),('uCloud',1),('uNight',2)]:
        u1i(location(program, name.encode()), value)
    identity = style.get('identity') == 'solhandle'
    if identity:
        texture('solhandle-emblem-v198.png', 3)
    u1i(location(program, b'uEmblem'), 3 if identity else 0)
    u1f(location(program, b'uSolhandle'), int(identity))
    u1f(location(program, b'uHasEmblem'), int(identity))
    gatto = style.get('identity') == 'gatto'
    gatto_map = 'gatto-face-v207.png'
    has_gatto_map = gatto and (Path('public/assets/globe') / gatto_map).is_file()
    if has_gatto_map:
        texture(gatto_map, 4)
    u1i(location(program, b'uGattoMap'), 4 if has_gatto_map else 0)
    u1f(location(program, b'uHasGattoMap'), int(has_gatto_map))
    u1f(location(program, b'uGattoMoon'), int(gatto and style.get('moons', 0) > 0))
    portrait_ids = {'bonk', 'pengu', 'wif', 'popcat', 'sheeple', 'trump'}
    portrait = style.get('identity') in portrait_ids
    portrait_map = str(style.get('identity')) + '-realism-v209.webp'
    if portrait:
        if not (Path('public/assets/globe') / portrait_map).is_file():
            raise FileNotFoundError('Portrait asset is required: ' + portrait_map)
        texture(portrait_map, 5)
        texture(str(style.get('identity')) + '-realism-contour-v209.png', 6)
    u1i(location(program, b'uPortraitMap'), 5 if portrait else 0)
    u1i(location(program, b'uPortraitContour'), 6 if portrait else 0)
    u1f(location(program, b'uHasPortrait'), int(portrait))
    limit = math.radians(24)
    portrait_angle = limit * math.sin((args.phase - 6.4) * .15 / limit) if args.portrait_yaw is None else math.radians(max(-24, min(24, args.portrait_yaw)))
    u1f(location(program, b'uPortraitAngle'), portrait_angle if portrait else 0)
    u1f(location(program, b'uRealTerrain'), int(style.get('realism') == 'terrain-v209'))
    rgb = [int(style['accent'][i:i+2], 16)/255 for i in [1,3,5]]
    u3f(location(program,b'uAccent'), *rgb)
    palette = style.get('palette', {})
    branded = all(isinstance(palette.get(k), str) and re.fullmatch(r'#[a-fA-F0-9]{6}', palette[k]) for k in ['primary','secondary','ring'])
    u1f(location(program,b'uBrandEnabled'), int(branded))
    for key,name in [('primary','uBrandPrimary'),('secondary','uBrandSecondary'),('ring','uBrandRing')]:
        color = [int(palette[key][i:i+2],16)/255 for i in [1,3,5]] if branded else [0,0,0]
        u3f(location(program,name.encode()), *color)
    light = {'studio':[-.65,.45,.62], 'sunrise':[-.91,.18,.32], 'dusk':[.75,.25,.23]}[style['lighting']]
    u3f(location(program,b'uLight'), *light)
    rings = {'none':0,'halo':3,'double':4,'dust':5,'silk':6,'asteroid':7}.get(style['rings'], {'none':0,'thin':1,'wide':2}[ring])
    values = {'uIdentity':{'bonk':1,'pengu':2,'wif':3,'popcat':4,'sheeple':5,'trump':6,'gatto':7}.get(style.get('identity'),0),'uRefined':0,'uNatural':0,'uAir':1,'uPluto':0,'uPixel':4.1/size,'uTime':args.phase,'uSurface':{'earth':0,'gas':2,'rocky':1}[surface_name], 'uMaterial':{'volcanic':1,'glacial':2,'biolume':3,'obsidian':4}.get(style['surface'],0), 'uRings':rings, 'uWeather':int(weather=='clouds' and style['surface']!='obsidian'), 'uAtmosphere':{'ion':2,'vivid':1}.get(style['atmosphere'],0),'uHasMap':1,'uHasCloud':1,'uHasNight':1}
    for name,value in values.items(): u1f(location(program,name.encode()),value)
    gl('glViewport',None,[integer,integer,integer,integer])(0,0,size,size)
    gl('glClearColor',None,[floating]*4)(0,0,0,0)
    gl('glClear',None,[uint])(0x4000)
    gl('glDrawArrays',None,[uint,integer,integer])(4,0,6)
    pixels = (C.c_ubyte*(size*size*4))()
    gl('glReadPixels',None,[integer,integer,integer,integer,uint,uint,ptr])(0,0,size,size,0x1908,0x1401,pixels)
    im = Image.frombytes('RGBA',(size,size),bytes(pixels)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    assert im.getchannel('A').getbbox(), 'Empty planet render'
    im.save(out/Path(world['image']).name, quality=92, method=6)
    print(world['id'], im.size)

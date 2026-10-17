"""
Run one of the twin's Blender build scripts without the interface, on the master scene:

  blender -b assets-src/twin/site_master.blend --python scripts/blender/twin/run_headless.py -- \
      <script.py> <stage,stage> <who,who|all> [--save | --save-as <path>] [--set NAME=VALUE ...]

Long stages (the cloth simulation, the bakes) take longer than a live-session call allows.
"""
import ast
import os
import sys

import bpy

args = sys.argv[sys.argv.index("--") + 1:]
script, stages, who = args[0], args[1].split(","), args[2]
extra = {}
save_to = None
i = 3
while i < len(args):
    if args[i] == "--save":
        save_to = bpy.data.filepath
    elif args[i] == "--save-as":
        i += 1
        save_to = os.path.abspath(args[i])
    elif args[i] == "--set":
        i += 1
        name, value = args[i].split("=", 1)
        extra[name] = ast.literal_eval(value)
    i += 1
# the master scene's own scene, whichever was active when the file was saved (it was once saved with the
# people's review scene active, and every script then worked on a scene without the rigs and crashed)
main = bpy.data.scenes.get("Scene")
if main is not None:
    for window in bpy.context.window_manager.windows:
        window.scene = main
    print("[headless] scene", bpy.context.scene.name)
here = os.path.dirname(os.path.abspath(__file__))
path = script if os.path.isabs(script) else os.path.join(here, script)
glb = {"__name__": "headless", "STAGES": stages, **extra}
if who != "all":
    glb["WHO"] = who.split(",")
exec(compile(open(path, encoding="utf-8").read(), path, "exec"), glb)
if save_to:
    bpy.ops.wm.save_as_mainfile(filepath=save_to, copy=save_to != bpy.data.filepath)
    print("[headless] saved", save_to)

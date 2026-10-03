# 3D asset credits — SCIC Atlas Navigator

`scic_atlas_navigator_pro.glb` is assembled from the following Sketchfab models, all licensed
**CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/). Attribution is required wherever the
character is shown or redistributed.

| Part | Title | Author | Source |
| --- | --- | --- | --- |
| Character (body, face blendshapes, rig, clothes) | "Rigged T-Pose Human Male w 50 Face Blendshapes" | mikealger | https://sketchfab.com/models/cc7e4596bcd145208a6992c757854c07 |
| Hard hat | "Hard hat" | naira001 | https://sketchfab.com/models/a1328e74b0f44b4284af05eb2aa5cfb6 |
| Hi-vis vest | "high-visibility safety vest" | Dom_vx | https://sketchfab.com/models/9f8a2969eb3b44539db16a8ac22fc297 |

Changes made: models combined; hat and vest fitted, re-proportioned and skinned to the character
rig; unused blendshapes removed; textures downscaled; exported to glTF binary.

Further changes (2026-10-02): body re-proportioned (broader shoulders and chest, thicker arms and neck,
slightly wider jaw, wider stance) with `scripts/blender/masculinize_atlas_navigator.py`.

Working files: `scripts/blender/source/scic_atlas_navigator_pro.blend` (original fit) and
`scic_atlas_navigator_pro_v3.blend` (re-proportioned, the one exported), kept out of `public/` so they are not served.

## Body animations

The clips inside the GLB (`idleSubtle`, `talk`, `greet`, `nod`, `yes`, `reject`, `confused`, `listen`, `foldArms`, `fistPump`, `interact`, `stretch`)
come from the Mesh2Motion human animation library (animations by Quaternius), released **CC0**
(https://app.mesh2motion.org/). They were retargeted onto this character with
`scripts/blender/retarget_m2m_animations.py`. No attribution is required; this note is for provenance.

**2026-10-03:** only `idleSubtle` and `foldArms` remain from that library (the others were rejected for him).
The rest are Mixamo (Adobe) motion-capture clips, exported on the male Y Bot figure and retargeted with
`scripts/blender/add_mixamo_clips.py`: `idleBreathing`, `presentR`, `presentL`, `presentBoth`, `pointR`, `pointL`,
`explainOne`, `explainTwo`, `shrug`, `nodFirm`, `acknowledge`, `wave`, `bow`. Mixamo animations are royalty-free for use
in projects (including commercial ones) but the raw files may not be redistributed, so the downloaded FBX files
live in `assets-src/mixamo/` and are git-ignored; only the baked animations inside the GLB ship.
Review stills of each clip on him: `scripts/blender/render_clip_review.py`.

**2026-10-03 (arm weights):** `scripts/blender/refine_arm_weights.py` reworks how the arms, sleeves and vest follow
the skeleton (weights smoothed across the shoulder and elbow, at most four bones per point as glTF requires, the vest
kept on the torso). Result saved as `scripts/blender/source/scic_atlas_navigator_pro_v4.blend`, now the file the GLB is exported from.

**2026-10-03 (later):** `offer`, `nodListen` and `idleNeutral` (Mixamo) were added back; `wave` and `acknowledge` are in the GLB but not played.

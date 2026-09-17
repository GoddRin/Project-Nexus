/**
 * TunnelShaderMaterial.ts
 *
 * Custom Three.js ShaderMaterial for Dynamic Construction-Stage Lining Blending.
 *
 * Blends smoothly across 4 construction stages along normalized longitudinal
 * chainage v in [0, 1] using smoothstep weighting:
 *  - Zone 4: Finished cast concrete (v < b1)
 *  - Zone 3: Fibre-reinforced shotcrete (b1 <= v < b2)
 *  - Zone 2: Wire mesh + steel rib backdrop (b2 <= v < b3)
 *  - Zone 1: Raw blasted rock (v >= b3)
 *
 * ARCHITECTURAL ADVANTAGE:
 * Updating `uLiningProgress` costs O(1) uniform state updates per frame.
 * ZERO geometry re-allocations, zero re-builds, zero draw-call thrashing.
 *
 * LIGHT MODEL INTEGRATION:
 * Samples Phase 2 dynamic light parameters (active face floodlights & crown string lights)
 * via uniforms so the tunnel lining dynamically reflects all light adjustments, amber
 * alarm pulses, and tripod movements in 100% unison with the scene props.
 */

import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";

export const TunnelLiningShaderMaterial = shaderMaterial(
  {
    uLiningProgress: 0.65,
    uFaceProgress: 0.96,       // Normalized active face position [0.0 - 1.0] along tunnel drive
    uTunnelLength: 60.0,       // Canonical total heading drive length in meters
    uBareRockOffset: 4.0,      // Meters of bare blasted rock directly trailing the face
    uMeshRibOffset: 8.0,       // Meters of wire mesh & steel ribs trailing bare rock
    uShotcreteOffset: 12.0,    // Meters of shotcrete shell trailing wire mesh
    uBlastFlashIntensity: 0.0, // 0.0 to 1.0 detonation flash impulse
    uBlastFlashColor: new THREE.Color("#FFF8C0"),
    uBlastDustIntensity: 0.0,  // 0.0 to 1.0 post-detonation airborne dust veil
    uTransitionWidth: 0.035,   // ~2.0m soft transition band
    uSeepageFactor: 0.25,      // Weather-driven floor wetness

    // Textures: Raw Rock
    uRawRockAlbedo: null,
    uRawRockNormal: null,
    uRawRockRoughness: null,
    uRawRockAO: null,

    // Textures: Wire Mesh & Rock Bolts
    uWireMeshAlbedo: null,
    uWireMeshNormal: null,
    uWireMeshRoughness: null,

    // Textures: Shotcrete
    uShotcreteAlbedo: null,
    uShotcreteNormal: null,
    uShotcreteRoughness: null,

    // Textures: Finished Concrete
    uConcreteAlbedo: null,
    uConcreteNormal: null,
    uConcreteRoughness: null,

    // Phase 2 Real Light Integration Uniforms (Genuine Sampling)
    uFaceFloodlightPos: new THREE.Vector3(-1.35, -0.9, -54.0),
    uFaceFloodlightDir: new THREE.Vector3(0.0, -0.15, -1.0).normalize(),
    uFaceFloodlightColor: new THREE.Color("#FFF3DB"),
    uFaceFloodlightIntensity: 2.8,
    uFaceFloodlightEnabled: 1.0,

    uStringLightPositions: [
      new THREE.Vector3(2.05, 0.88, -5.0),
      new THREE.Vector3(2.05, 0.88, -15.0),
      new THREE.Vector3(2.05, 0.88, -25.0),
      new THREE.Vector3(2.05, 0.88, -36.0),
      new THREE.Vector3(2.05, 0.88, -47.0),
      new THREE.Vector3(2.05, 0.88, -55.0),
    ],
    uStringLightColor: new THREE.Color("#FFE1A8"),
    uStringLightIntensity: 2.4,
    uStringLightEnabled: 1.0,

    uSubterraneanAmbient: new THREE.Color("#2E2B27"),
    uLightDirection: new THREE.Vector3(0.3, 0.8, 0.5).normalize(),
    uLightColor: new THREE.Color("#F3E6D0"),
  },
  /* ═════════════════════════════════════════════════════════════════
     VERTEX SHADER
     ═════════════════════════════════════════════════════════════════ */
  `
    #ifndef USE_COLOR
      attribute vec3 color;
    #endif

    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;
    varying vec3 vAOColor;

    void main() {
      vUv = uv;
      vAOColor = color; // Subtle baked vertex AO (0.76 - 1.0)
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPosition.xyz;
      // Inward-facing normal vector transformed to world space
      vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  /* ═════════════════════════════════════════════════════════════════
     FRAGMENT SHADER
     ═════════════════════════════════════════════════════════════════ */
  `
    uniform float uLiningProgress;
    uniform float uFaceProgress;
    uniform float uTunnelLength;
    uniform float uBareRockOffset;
    uniform float uMeshRibOffset;
    uniform float uShotcreteOffset;
    uniform float uBlastFlashIntensity;
    uniform vec3 uBlastFlashColor;
    uniform float uBlastDustIntensity;
    uniform float uTransitionWidth;
    uniform float uSeepageFactor;

    uniform sampler2D uRawRockAlbedo;
    uniform sampler2D uRawRockNormal;
    uniform sampler2D uRawRockRoughness;
    uniform sampler2D uRawRockAO;

    uniform sampler2D uWireMeshAlbedo;
    uniform sampler2D uWireMeshNormal;
    uniform sampler2D uWireMeshRoughness;

    uniform sampler2D uShotcreteAlbedo;
    uniform sampler2D uShotcreteNormal;
    uniform sampler2D uShotcreteRoughness;

    uniform sampler2D uConcreteAlbedo;
    uniform sampler2D uConcreteNormal;
    uniform sampler2D uConcreteRoughness;

    uniform vec3 uFaceFloodlightPos;
    uniform vec3 uFaceFloodlightDir;
    uniform vec3 uFaceFloodlightColor;
    uniform float uFaceFloodlightIntensity;
    uniform float uFaceFloodlightEnabled;

    uniform vec3 uStringLightPositions[6];
    uniform vec3 uStringLightColor;
    uniform float uStringLightIntensity;
    uniform float uStringLightEnabled;

    uniform vec3 uSubterraneanAmbient;
    uniform vec3 uLightDirection;
    uniform vec3 uLightColor;

    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;
    varying vec3 vAOColor;

    // Normal perturbation via screen-space derivatives (in world space)
    vec3 perturbNormal2Arb(vec3 eye_pos, vec3 surf_norm, vec3 mapN, vec2 uv) {
      vec3 q0 = dFdx(eye_pos);
      vec3 q1 = dFdy(eye_pos);
      vec2 st0 = dFdx(uv);
      vec2 st1 = dFdy(uv);

      vec3 N = surf_norm;
      vec3 q1perp = cross(q1, N);
      vec3 q0perp = cross(N, q0);

      vec3 T = q1perp * st0.x + q0perp * st1.x;
      vec3 B = q1perp * st0.y + q0perp * st1.y;

      float det = max(dot(T, T), dot(B, B));
      float scale = (det == 0.0) ? 0.0 : inversesqrt(det);

      return normalize(T * (mapN.x * scale) + B * (mapN.y * scale) + N * mapN.z);
    }

    void main() {
      float v = vUv.y; // Longitudinal position: 0.0 (portal) -> 1.0 (face)

      // Active excavation face progress [0.05 to 1.0]
      float faceNorm = clamp(uFaceProgress, 0.05, 1.0);

      // Discard unexcavated rock past the active heading face (Resolution 1)
      if (v > faceNorm + 0.005) {
        discard;
      }

      float w = uTransitionWidth * 0.5;

      // ─── 1. ZONE BOUNDARIES (METERS-BASED RESOLUTION 2) ───────────
      // Engineering offsets in real meters along tunnel alignment
      float L = max(uTunnelLength, 1.0);
      float bareRockNorm = uBareRockOffset / L;
      float meshRibNorm = uMeshRibOffset / L;
      float shotcreteNorm = uShotcreteOffset / L;

      // Zone 1 (Raw Blasted Rock): right behind the heading face
      float b3 = faceNorm;
      // Zone 2 (Wire Mesh & Steel Ribs): trailing bare rock
      float b2 = max(0.0, b3 - bareRockNorm);
      // Zone 3 (Fibre-reinforced Shotcrete Shell): trailing wire mesh
      float b1 = max(0.0, b2 - meshRibNorm);
      // Zone 4 (Finished Cast Concrete): trailing shotcrete to portal
      float b0 = max(0.0, b1 - shotcreteNorm);

      // Smooth transition factors
      float t0 = smoothstep(b0 - w, b0 + w, v);
      float t1 = smoothstep(b1 - w, b1 + w, v);
      float t2 = smoothstep(b2 - w, b2 + w, v);

      // Partition of unity across 4 zones
      float weightConcrete = 1.0 - t0;
      float weightShotcrete = t0 * (1.0 - t1);
      float weightMesh = t1 * (1.0 - t2);
      float weightRawRock = t2;

      // ─── 2. SAMPLE TEXTURE MAPS ───────────────────────────────────
      vec2 uvRock = vec2(vUv.x * 4.0, vUv.y * 24.0);
      vec2 uvMesh = vec2(vUv.x * 4.0, vUv.y * 24.0);
      vec2 uvShot = vec2(vUv.x * 4.0, vUv.y * 24.0);
      vec2 uvConc = vec2(vUv.x * 3.0, vUv.y * 12.0);

      // Albedo with rich procedural base fallbacks (guaranteed vibrant contrast)
      vec3 baseConc = vec3(0.72, 0.70, 0.66); // Smooth cast concrete (#B8B4AE)
      vec3 baseShot = vec3(0.48, 0.47, 0.46); // Matte sprayed shotcrete (#7A7875)
      vec3 baseMesh = vec3(0.36, 0.34, 0.32); // Steel mesh over fractured rock
      vec3 baseRock = vec3(0.24, 0.22, 0.20); // Dark blasted Sierra Madre basalt

      vec3 texConc = texture2D(uConcreteAlbedo, uvConc).rgb;
      vec3 texShot = texture2D(uShotcreteAlbedo, uvShot).rgb;
      vec3 texMesh = texture2D(uWireMeshAlbedo, uvMesh).rgb;
      vec3 texRock = texture2D(uRawRockAlbedo, uvRock).rgb;

      vec3 colConc = (length(texConc) > 0.05) ? texConc : baseConc;
      vec3 colShot = (length(texShot) > 0.05) ? texShot : baseShot;
      vec3 colMesh = (length(texMesh) > 0.05) ? texMesh : baseMesh;
      vec3 colRock = (length(texRock) > 0.05) ? texRock : baseRock;

      vec3 albedo = colConc * weightConcrete +
                    colShot * weightShotcrete +
                    colMesh * weightMesh +
                    colRock * weightRawRock;

      // Roughness
      float rConc = texture2D(uConcreteRoughness, uvConc).r;
      float rShot = texture2D(uShotcreteRoughness, uvShot).r;
      float rMesh = texture2D(uWireMeshRoughness, uvMesh).r;
      float rRock = texture2D(uRawRockRoughness, uvRock).r;

      rConc = (rConc > 0.01) ? rConc : 0.60;
      rShot = (rShot > 0.01) ? rShot : 0.88;
      rMesh = (rMesh > 0.01) ? rMesh : 0.75;
      rRock = (rRock > 0.01) ? rRock : 0.85;

      float roughness = rConc * weightConcrete +
                        rShot * weightShotcrete +
                        rMesh * weightMesh +
                        rRock * weightRawRock;

      // Normals
      vec3 rawNConc = texture2D(uConcreteNormal, uvConc).xyz;
      vec3 rawNShot = texture2D(uShotcreteNormal, uvShot).xyz;
      vec3 rawNMesh = texture2D(uWireMeshNormal, uvMesh).xyz;
      vec3 rawNRock = texture2D(uRawRockNormal, uvRock).xyz;

      vec3 nConc = (length(rawNConc) > 0.1) ? rawNConc * 2.0 - 1.0 : vec3(0.0, 0.0, 1.0);
      vec3 nShot = (length(rawNShot) > 0.1) ? rawNShot * 2.0 - 1.0 : vec3(0.0, 0.0, 1.0);
      vec3 nMesh = (length(rawNMesh) > 0.1) ? rawNMesh * 2.0 - 1.0 : vec3(0.0, 0.0, 1.0);
      vec3 nRock = (length(rawNRock) > 0.1) ? rawNRock * 2.0 - 1.0 : vec3(0.0, 0.0, 1.0);

      vec3 blendedNormalMap = normalize(
        nConc * weightConcrete +
        nShot * weightShotcrete +
        nMesh * weightMesh +
        nRock * weightRawRock
      );

      // ─── 3. INVERT SEEPAGE DAMPNESS ───────────────────────────────
      // On the invert/floor (vUv.x > 0.82 or < 0.15), water seepage darkens and increases gloss
      bool isFloor = (vUv.x > 0.82 || vUv.x < 0.15);
      if (isFloor) {
        albedo *= (1.0 - uSeepageFactor * 0.25);
        roughness = mix(roughness, 0.20, uSeepageFactor * 0.7);
      }

      // ─── 4. PERTURBED NORMAL & PBR SHADING ────────────────────────
      vec3 geomNormal = normalize(vWorldNormal);
      if (!gl_FrontFacing) {
        geomNormal = -geomNormal;
      }
      vec3 eyePos = cameraPosition - vWorldPos;
      vec3 V = normalize(eyePos);
      vec3 N = geomNormal;
      vec3 pN = perturbNormal2Arb(eyePos, geomNormal, blendedNormalMap, vUv);
      if (length(pN) > 0.5) {
        N = normalize(pN);
      }

      // Phase 2 String Lights Contribution (samples 6 key point sources along alignment)
      vec3 stringLightContrib = vec3(0.0);
      vec3 specularAcc = vec3(0.0);
      if (uStringLightEnabled > 0.5) {
        for (int i = 0; i < 6; i++) {
          vec3 toLight = uStringLightPositions[i] - vWorldPos;
          float d = length(toLight);
          vec3 Ls = toLight / max(d, 0.001);
          float atten = 1.0 / (1.0 + 0.04 * d + 0.006 * d * d);
          float NdotLs = max(dot(N, Ls), 0.0) * 0.82 + 0.18; // Subterranean soft bounce
          stringLightContrib += uStringLightColor * (NdotLs * atten * uStringLightIntensity);

          // Specular highlight from string lights
          vec3 Hs = normalize(Ls + V);
          float NdotHs = max(dot(N, Hs), 0.0);
          specularAcc += uStringLightColor * pow(NdotHs, mix(64.0, 8.0, roughness)) * (1.0 - roughness) * 0.40 * atten;
        }
      }

      // Phase 2 Active Heading Floodlight Contribution
      vec3 floodContrib = vec3(0.0);
      if (uFaceFloodlightEnabled > 0.5) {
        vec3 toFlood = uFaceFloodlightPos - vWorldPos;
        float dFlood = length(toFlood);
        vec3 Lf = toFlood / max(dFlood, 0.001);
        float floodAtten = 1.0 / (1.0 + 0.04 * dFlood + 0.008 * dFlood * dFlood);
        float NdotLf = max(dot(N, Lf), 0.0) * 0.85 + 0.15; // Soft wrap diffuse
        float spotCos = dot(-Lf, normalize(uFaceFloodlightDir));
        float spotFactor = smoothstep(0.25, 0.80, spotCos); // Broad flood cone
        floodContrib = uFaceFloodlightColor * (NdotLf * floodAtten * spotFactor * uFaceFloodlightIntensity);

        // Specular highlight from floodlight
        vec3 Hf = normalize(Lf + V);
        float NdotHf = max(dot(N, Hf), 0.0);
        specularAcc += uFaceFloodlightColor * pow(NdotHf, mix(96.0, 12.0, roughness)) * (1.0 - roughness) * 0.60 * floodAtten * spotFactor;
      }

      // Portal external sun/sky diffuse penetration
      float NdotSun = max(dot(N, normalize(uLightDirection)), 0.0);
      vec3 portalSun = uLightColor * NdotSun * 0.35 * smoothstep(0.35, 0.0, v);

      // Phase 4 Detonation Blast Flash Contribution
      vec3 blastFlashContrib = vec3(0.0);
      if (uBlastFlashIntensity > 0.01) {
        float blastProximity = smoothstep(b1, faceNorm, v);
        blastFlashContrib = uBlastFlashColor * (uBlastFlashIntensity * 4.5 * blastProximity);
      }

      vec3 ambient = max(uSubterraneanAmbient, vec3(0.58, 0.54, 0.48));
      vec3 totalIllumination = ambient + stringLightContrib + floodContrib + portalSun + blastFlashContrib;
      vec3 diffuse = albedo * totalIllumination;

      // Phase 4 Airborne Dust Veil
      if (uBlastDustIntensity > 0.01) {
        vec3 dustColor = vec3(0.52, 0.48, 0.44) * (totalIllumination + 0.2);
        float dustProximity = smoothstep(b1, faceNorm, v);
        diffuse = mix(diffuse, dustColor, uBlastDustIntensity * 0.55 * dustProximity);
      }

      // ─── 5. MULTIPLY SUBTLE CREVICE AO ───────────────────────────
      // Safeguard against uninitialized vertex color (which defaults to 0.0 in WebGL)
      float ao = (vAOColor.r > 0.1) ? clamp(vAOColor.r, 0.70, 1.0) : 1.0;
      vec3 finalColor = (diffuse + specularAcc) * ao;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
  (material: any) => {
    if (material) {
      material.vertexColors = true;
      material.side = THREE.FrontSide; // Single-sided front-faces (Resolution 2: no DoubleSide performance tax!)
    }
  }
);

extend({ TunnelLiningShaderMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      tunnelLiningShaderMaterial: any;
    }
  }
}

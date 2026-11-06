/* A real reflection in the desk: the scene is rendered once more from a camera mirrored
   in the plane y=0, at reduced size, and the desk's own material reads it back with a
   Fresnel falloff and a slight blur. Nothing sits below the desk, so no clip plane is
   needed. Costs one extra scene pass, so it runs on the high tier only and is the first
   thing given up on a machine that cannot hold the rate. */
import {THREE} from '../core.js';

export function makeMirror(stage, desk, {scale = .5, strength = 1, lod = 1.6} = {}) {
  const {renderer, scene, camera} = stage;
  const direct = !stage.composer;
  const rt = new THREE.WebGLRenderTarget(4, 4, {
    type: direct ? THREE.UnsignedByteType : THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter,
  });
  /* three gives an ordinary target its own build of every shader, without tone mapping. An XR
     target gets the screen's, so this pass needs no compiling; it stores finished colour,
     and the desk undoes the sRGB and the filmic curve when it reads it. With a post stack the
     scene is in a target already, so the ordinary kind is the one that shares. */
  if (direct) {
    rt.isXRRenderTarget = true;
    rt.texture.colorSpace = THREE.SRGBColorSpace;
  }
  const read = direct ? `
          vec3 mY = min(pow(mRaw, vec3(2.2)), vec3(.88));
          vec3 mA = mY * .983729 - 1., mB = mY * .432951 - .0245786, mC = mY * .238081 + .000090537;
          vec3 mCol = (-mB - sqrt(mB * mB - 4. * mA * mC)) / (2. * mA) * .6 / toneMappingExposure;` : `
          vec3 mCol = mRaw;`;
  /* only what is on layer 1 is reflected: the big silhouettes, not every key and capacitor */
  const vcam = camera.clone(), texM = new THREE.Matrix4(), up = new THREE.Vector3(), dir = new THREE.Vector3(), tgt = new THREE.Vector3();
  const BIAS = new THREE.Matrix4().set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
  const uniforms = {tMirror: {value: rt.texture}, uMirrorM: {value: texM}, uMirrorK: {value: strength}, uMirrorLod: {value: lod}};

  desk.traverse(o => {
    if (!o.isMesh || !o.userData.mirror) return;
    const m = o.material;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nuniform mat4 uMirrorM;\nvarying vec4 vMirror;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMirror = uMirrorM * modelMatrix * vec4(transformed, 1.);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D tMirror;\nuniform float uMirrorK, uMirrorLod;\nvarying vec4 vMirror;')
        .replace('#include <opaque_fragment>', `
          vec2 mUv = vMirror.xy / vMirror.w + normal.xz * .012;
          vec2 mPx = vec2(.0016, .0028) * (1. + roughnessFactor * 3.);
          vec3 mRaw = (textureLod(tMirror, mUv + mPx, uMirrorLod).rgb + textureLod(tMirror, mUv - mPx, uMirrorLod).rgb) * .5;${read}
          float mF = .05 + .95 * pow(1. - clamp(dot(normalize(vViewPosition), normal), 0., 1.), 4.);
          outgoingLight += mCol * mF * uMirrorK;
          #include <opaque_fragment>`);
    };
    m.customProgramCacheKey = () => 'mirror';
    m.needsUpdate = true;
  });

  const mirror = {
    enabled: true,
    size(w, h, dpr) { rt.setSize(Math.max(2, Math.round(w * dpr * scale)), Math.max(2, Math.round(h * dpr * scale))); },
    update() {
      if (!mirror.enabled) { uniforms.uMirrorK.value = 0; return; }
      camera.updateMatrixWorld();
      vcam.copy(camera, false);
      vcam.layers.set(1);
      vcam.position.set(camera.position.x, -camera.position.y, camera.position.z);
      camera.getWorldDirection(dir);
      tgt.copy(camera.position).add(dir);
      up.set(0, 1, 0).applyQuaternion(camera.quaternion);
      vcam.up.set(up.x, -up.y, up.z);
      vcam.lookAt(tgt.x, -tgt.y, tgt.z);
      vcam.updateMatrixWorld();
      texM.copy(BIAS).multiply(vcam.projectionMatrix).multiply(vcam.matrixWorldInverse);
      const was = renderer.getRenderTarget(), wasAuto = renderer.shadowMap.autoUpdate, wasVis = desk.visible;
      desk.visible = false;
      renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(scene, vcam);
      renderer.setRenderTarget(was);
      renderer.shadowMap.autoUpdate = wasAuto;
      desk.visible = wasVis;
    },
    dispose() { rt.dispose(); },
  };
  return mirror;
}

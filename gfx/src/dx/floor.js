import {THREE, canvasTex} from '../core.js';

export function makeFloor() {
  const tex = canvasTex(1024, 1024, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(186,176,160,.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let p = 0; p <= w; p += 64) {
      ctx.moveTo(p + .5, 0); ctx.lineTo(p + .5, h);
      ctx.moveTo(0, p + .5); ctx.lineTo(w, p + .5);
    }
    ctx.stroke();
    // Erase the lines radially so the grid melts into the stage
    const fade = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    fade.addColorStop(0, 'rgba(0,0,0,1)');
    fade.addColorStop(.55, 'rgba(0,0,0,.7)');
    fade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }, {srgb: true});
  const mat = new THREE.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0});
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mat);
  plane.rotation.x = -Math.PI / 2;
  const group = new THREE.Group();
  group.add(plane);
  return {group, set(k) { mat.opacity = k; }};
}

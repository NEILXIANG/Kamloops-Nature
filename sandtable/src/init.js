/* ================= init (runs after engine, ui and live modules are defined) ================= */
computeFlood();
{const X=REPS[0];repT=defT(X);repRun='model'}
{const [r,c]=R.rc(50.74,-120.42);scen.ign=[r,c]}
setSheet(false);
setMode('live');applyLang();
{const p=R.world(...R.rc(50.676,-120.34));controls.target.copy(p);camera.position.copy(p.clone().add(new THREE.Vector3(0,0.68,0.73).normalize().multiplyScalar(R.W*0.22)));controls.update()}
refreshLive();renderOfficial();
requestAnimationFrame(frame);

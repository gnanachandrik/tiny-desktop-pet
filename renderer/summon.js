const btn=document.getElementById('summon');
let drag=null, justDragged=false;
btn.addEventListener('pointerdown',e=>{if(e.button!==0)return;btn.setPointerCapture(e.pointerId);drag={gx:e.clientX,gy:e.clientY,sx:e.screenX,sy:e.screenY,moved:false};});
btn.addEventListener('pointermove',e=>{if(!drag)return;if(!drag.moved&&Math.abs(e.screenX-drag.sx)+Math.abs(e.screenY-drag.sy)<6)return;drag.moved=true;window.petAPI.moveSummon(e.screenX-drag.gx,e.screenY-drag.gy);});
btn.addEventListener('pointerup',()=>{justDragged=!!(drag&&drag.moved);if(justDragged)window.petAPI.saveSummon();drag=null;setTimeout(()=>{justDragged=false;},0);});
btn.addEventListener('pointercancel',()=>{drag=null;});
btn.addEventListener('click',()=>{if(!justDragged)window.petAPI.summon();});

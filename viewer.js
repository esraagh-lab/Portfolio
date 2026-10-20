'use strict';
const $=id=>document.getElementById(id);
const spread=$('spread'),viewer=$('viewer'),status=$('status');
const prev=$('prev'),next=$('next'),pageSlider=$('pageSlider'),zoomSlider=$('zoomSlider');
let pdf=null,index=0,zoom=1,small=innerWidth<=760,busy=false,queued=null,refit=false;
let pageRatio=595/842;
const maxIndex=()=>small?pdf.numPages-1:Math.ceil((pdf.numPages-1)/2);
const numsFor=i=>small?[i+1]:i===0?[1]:[i*2,i*2+1].filter(n=>n<=pdf.numPages);
const indexFor=n=>small?n-1:n===1?0:Math.floor(n/2);
function updateControls(){
 const nums=numsFor(index);status.textContent=nums.join('–')+' / '+pdf.numPages;
 prev.disabled=index===0;next.disabled=index===maxIndex();
 pageSlider.max=pdf.numPages;pageSlider.value=nums[0];
 pageSlider.setAttribute('aria-valuetext','Page '+nums[0]+' of '+pdf.numPages);
 zoomSlider.value=Math.round(zoom*100);$('zoomLabel').textContent=Math.round(zoom*100)+'%';
}
async function pageElement(n,width,height){
 const page=await pdf.getPage(n),natural=page.getViewport({scale:1});
 const wrap=document.createElement('div');wrap.className='page';wrap.style.width=width+'px';wrap.style.height=height+'px';
 const canvas=document.createElement('canvas');canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Portfolio page '+n);
 const density=Math.min(devicePixelRatio||1,2.5),viewport=page.getViewport({scale:width/natural.width*density});
 canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);wrap.append(canvas);
 await page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport,background:'rgb(255,255,255)'}).promise;
 for(const a of await page.getAnnotations()){
  if(a.subtype!=='Link')continue;
  const link=document.createElement('a');link.className='hotspot';
  const r=natural.convertToViewportRectangle(a.rect);
  Object.assign(link.style,{left:Math.min(r[0],r[2])/natural.width*100+'%',top:Math.min(r[1],r[3])/natural.height*100+'%',width:Math.abs(r[2]-r[0])/natural.width*100+'%',height:Math.abs(r[3]-r[1])/natural.height*100+'%'});
  if(a.url && /^https?:\/\//i.test(a.url)){link.href=a.url;link.target='_blank';link.rel='noopener noreferrer';link.title='Open linked video or website';}
  else if(a.dest){link.href='#';link.title='Go to linked page';link.onclick=async e=>{e.preventDefault();try{const dest=typeof a.dest==='string'?await pdf.getDestination(a.dest):a.dest;if(!dest)return;const pageNo=Number.isInteger(dest[0])?dest[0]:await pdf.getPageIndex(dest[0]);goToPage(pageNo+1)}catch(e){console.warn(e)}};}
  else continue;
  link.setAttribute('aria-label',link.title);wrap.append(link);
 }
 return wrap;
}
function cloneCanvas(source){const c=document.createElement('canvas');c.width=source.width;c.height=source.height;c.getContext('2d').drawImage(source,0,0);return c}
async function turn(oldPages,newPages,direction){
 const layer=document.createElement('div');layer.className='turn-layer';
 const fixed=document.createElement('div');fixed.className='turn-static';fixed.style.left=direction>0?'0':'50%';fixed.append(cloneCanvas(oldPages[direction>0?0:1].querySelector('canvas')));
 const leaf=document.createElement('div');leaf.className='turn-leaf';leaf.style.left=direction>0?'50%':'0';leaf.style.transformOrigin=direction>0?'left center':'right center';
 const front=document.createElement('div');front.className='turn-face';front.append(cloneCanvas(oldPages[direction>0?1:0].querySelector('canvas')));
 const back=document.createElement('div');back.className='turn-face turn-back';back.append(cloneCanvas(newPages[direction>0?0:1].querySelector('canvas')));
 leaf.append(front,back);layer.append(fixed,leaf);spread.append(layer);
 try{await leaf.animate([{transform:'rotateY(0deg)'},{transform:`rotateY(${direction>0?-180:180}deg)`}],{duration:480,easing:'cubic-bezier(.25,.65,.25,1)',fill:'forwards'}).finished;}finally{layer.remove()}
}
async function show(target,animate=true){
 if(!pdf)return;
 target=Math.max(0,Math.min(maxIndex(),target));
 if(busy){queued={target,animate};return}
 const oldIndex=index,oldPages=Array.from(spread.children);
 busy=true;status.textContent='Loading pages…';
 try{
  const nums=numsFor(target),availableW=Math.max(100,viewer.clientWidth-(small?72:200)),availableH=Math.max(100,viewer.clientHeight-(small?40:64));
  const height=Math.floor(Math.min(availableH,availableW/(pageRatio*nums.length))*zoom),width=Math.floor(height*pageRatio);
  const pages=await Promise.all(nums.map(n=>pageElement(n,width,height)));
  spread.replaceChildren(...pages);index=target;updateControls();
  if(animate&&target!==oldIndex&&oldPages.length&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const direction=target>oldIndex?1:-1;
   if(!small&&oldPages.length===2&&pages.length===2&&Math.abs(target-oldIndex)===1)await turn(oldPages,pages,direction);
   // Cover, mobile and distant page jumps switch directly: no slide or fade.
  }
 }catch(err){console.error(err);status.textContent='Could not display this page. Use PDF ↓ to open the original.';}
 finally{busy=false;if(refit){refit=false;resize()}else if(queued){const q=queued;queued=null;show(q.target,q.animate)}}
}
function change(delta){if(pdf)show((queued?.target??index)+delta)}
function goToPage(n){if(pdf)show(indexFor(n))}
prev.onclick=()=>change(-1);next.onclick=()=>change(1);
function setZoom(value){zoom=Math.max(.7,Math.min(1.8,value));show(index,false)}
$('zoomIn').onclick=()=>setZoom(Math.round((zoom+.1)*10)/10);
$('zoomOut').onclick=()=>setZoom(Math.round((zoom-.1)*10)/10);
zoomSlider.oninput=()=>setZoom(Number(zoomSlider.value)/100);
pageSlider.oninput=()=>goToPage(Number(pageSlider.value));
window.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select'))return;if(e.key==='ArrowRight'){e.preventDefault();change(1)}if(e.key==='ArrowLeft'){e.preventDefault();change(-1)}});
function resize(){if(!pdf)return;if(busy){refit=true;return}const first=numsFor(index)[0];small=innerWidth<=760;index=indexFor(first);queued=null;show(index,false)}
let timer;window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(resize,120)});
$('fullscreen-btn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{status.textContent='Fullscreen unavailable here. Use the browser fullscreen menu.'}};
document.addEventListener('fullscreenchange',()=>{const active=!!document.fullscreenElement;$('fullscreen-btn').textContent=active?'×':'⛶';$('fullscreen-btn').setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');resize()});
let touch=null;viewer.addEventListener('touchstart',e=>{touch=e.touches.length===1&&zoom<=1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null},{passive:true});
viewer.addEventListener('touchend',e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;touch=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)change(dx<0?1:-1)},{passive:true});
(async()=>{
 try{
  const lib=await import('./vendor/pdf.min.mjs');lib.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.min.mjs',location.href).href;
  const task=lib.getDocument({url:'portfolio.pdf?v=book-only-20261020',isEvalSupported:false});
  task.onProgress=p=>{if(!pdf)status.textContent=p.total?'Loading PDF '+Math.min(100,Math.round(p.loaded/p.total*100))+'%':'Loading PDF…'};
  pdf=await task.promise;const first=await pdf.getPage(1),vp=first.getViewport({scale:1});pageRatio=vp.width/vp.height;await show(0,false);
 }catch(err){console.error(err);status.textContent='Viewer could not load. Open the original with PDF ↓.';const a=document.createElement('a');a.href='portfolio.pdf';a.textContent='Open original PDF';a.style.color='white';spread.replaceChildren(a)}
})();

const fullscreenBtn = document.getElementById('fullscreen-btn');
let data=null;
let spreadIndex=0;
let zoom=1;
const spread=document.getElementById('spread');
const prev=document.getElementById('prev');
const next=document.getElementById('next');
const status=document.getElementById('status');
const zoomLabel=document.getElementById('zoomLabel');
const zoomIn=document.getElementById('zoomIn');
const zoomOut=document.getElementById('zoomOut');

const mobile=()=>window.innerWidth<=760;
const maxIndex=()=> mobile() ? data.pages.length-1 : Math.ceil((data.pages.length-1)/2);

function pageNumbers(){
  if(mobile()) return [spreadIndex+1];
  if(spreadIndex===0) return [1];
  const a=spreadIndex*2;
  return [a,a+1].filter(n=>n<=data.pages.length);
}

function makePage(n, single=false){
  const p=data.pages[n-1];
  const wrap=document.createElement('div');
  wrap.className='page'+(single?' single':'');
  const img=document.createElement('img');
  img.src=p.file;
  img.alt=`Portfolio page ${n}`;
  img.width=p.width;
  img.height=p.height;
  img.draggable=false;
  wrap.appendChild(img);

  for(const l of data.links.filter(x=>x.page===n)){
    const a=document.createElement('a');
    a.className='hotspot';
    a.style.left=(l.x*100)+'%'; a.style.top=(l.y*100)+'%';
    a.style.width=(l.w*100)+'%'; a.style.height=(l.h*100)+'%';
    if(l.type==='url'){
      a.href=l.href; a.target='_blank'; a.rel='noopener noreferrer';
      a.title='Watch model film on Vimeo'; a.setAttribute('aria-label',a.title);
    } else if(l.type==='page'){
      a.href='#'; a.title=`Go to page ${l.target}`; a.setAttribute('aria-label',a.title);
      a.addEventListener('click',e=>{e.preventDefault();goToPage(l.target)});
    }
    wrap.appendChild(a);
  }
  return wrap;
}

function render(){
  if(!data) return;
  spread.innerHTML='';
  const nums=pageNumbers();
  nums.forEach(n=>spread.appendChild(makePage(n,nums.length===1)));
  spread.style.transform=`scale(${zoom})`;
  spread.style.marginTop=zoom>1 ? `${(zoom-1)*120}px` : 'auto';
  spread.style.marginBottom=zoom>1 ? `${(zoom-1)*120}px` : 'auto';

  if(nums.length===2) status.textContent=`${nums[0]}–${nums[1]} / ${data.pages.length}`;
  else status.textContent=`${nums[0]} / ${data.pages.length}`;
  prev.disabled=spreadIndex<=0;
  next.disabled=spreadIndex>=maxIndex();
  zoomLabel.textContent=Math.round(zoom*100)+'%';
  preloadAround(nums);
}

function preloadAround(nums){
  const candidates=new Set();
  nums.forEach(n=>{for(let k=n-2;k<=n+2;k++) if(k>=1&&k<=data.pages.length)candidates.add(k)});
  candidates.forEach(n=>{const im=new Image();im.src=data.pages[n-1].file;});
}

function animateSpread(direction=1){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const distance = 34;
  const fromX = direction > 0 ? distance : -distance;

  spread.getAnimations().forEach(a=>a.cancel());
  const animation = spread.animate(
    [
      {
        transform:`translateX(${fromX}px) scale(${zoom})`,
        opacity:0.84
      },
      {
        transform:`translateX(0) scale(${zoom})`,
        opacity:1
      }
    ],
    {
      duration:180,
      easing:'cubic-bezier(.22,.61,.36,1)',
      fill:'none'
    }
  );

  animation.finished
    .then(()=>animation.cancel())
    .catch(()=>{});
}

function change(delta){
  if(!data) return;
  const n=Math.max(0,Math.min(maxIndex(),spreadIndex+delta));
  if(n===spreadIndex) return;

  spreadIndex=n;
  

render();

  requestAnimationFrame(()=>animateSpread(delta));
}

function goToPage(page){
  const oldIndex=spreadIndex;
  const newIndex=mobile()?page-1:(page===1?0:Math.floor(page/2));

  spreadIndex=Math.max(0,Math.min(maxIndex(),newIndex));
  render();

  const direction=spreadIndex>=oldIndex ? 1 : -1;
  requestAnimationFrame(()=>animateSpread(direction));
}
prev.onclick=()=>change(-1); next.onclick=()=>change(1);
zoomIn.onclick=()=>{zoom=Math.min(1.8,Math.round((zoom+.1)*10)/10);render()};
zoomOut.onclick=()=>{zoom=Math.max(.7,Math.round((zoom-.1)*10)/10);render()};
window.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')change(-1);if(e.key==='ArrowRight')change(1)});
let wasMobile=mobile();
let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{
  if(!data) return;
  const first=wasMobile?spreadIndex+1:(spreadIndex===0?1:spreadIndex*2);
  wasMobile=mobile();
  spreadIndex=wasMobile?first-1:(first===1?0:Math.floor(first/2));
  spreadIndex=Math.min(spreadIndex,maxIndex());render();
},150)});
async function toggleFullscreen(){
  try{
    if(!document.fullscreenElement){
      await document.documentElement.requestFullscreen();
    }else{
      await document.exitFullscreen();
    }
  }catch(err){
    status.textContent='Fullscreen is unavailable in this browser. Use its fullscreen menu.';
  }
}

function updateFullscreenButton(){
  if(!fullscreenBtn) return;
  const active = !!document.fullscreenElement;
  fullscreenBtn.textContent = active ? '×' : '⛶';
  fullscreenBtn.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
  fullscreenBtn.setAttribute('title', active ? 'Exit fullscreen' : 'Fullscreen');
}

fullscreenBtn?.addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', ()=>{
  updateFullscreenButton();
  // Re-fit the current spread after entering/exiting fullscreen.
  setTimeout(()=>render(), 80);
});
updateFullscreenButton();

fetch('pages.json',{cache:'no-store'})
  .then(r=>{if(!r.ok)throw new Error('pages.json '+r.status);return r.json()})
  .then(j=>{data=j;render()})
  .catch(err=>{console.error(err);status.textContent='Viewer error';spread.innerHTML='<div style="padding:24px;background:white;color:#7a2020;line-height:1.5">The portfolio viewer could not load. Please make sure the <b>pages</b> folder and <b>pages.json</b> were uploaded.</div>'});

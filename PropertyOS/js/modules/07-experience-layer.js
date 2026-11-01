/* PropertyOS module 7: cinematic entrance.
   Animated landing (hero, live UPI demo, bento features, FAQ), split-screen sign-in / sign-up,
   3-step onboarding with build sequence, welcome tour, WebAudio sound, confetti, count-up KPIs,
   spotlight cards and press ripples. Loaded last. Wraps authScreen / onboard / start / toast / render. */
(()=>{
const RM=matchMedia('(prefers-reduced-motion:reduce)').matches,FINE=matchMedia('(pointer:fine)').matches;
const safe=f=>{try{return f()}catch(e){return null}};
const store=(k,v)=>{try{return v===undefined?localStorage.getItem(k):v===null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){return null}};
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inviteP=()=>{const p=new URLSearchParams(location.search);return p.get('invite')||p.get('r')||p.get('c')};

/* ============================ Sound engine ============================ */
const SND=(()=>{let ctx,master,on=store('po-snd')!=='0';
const ensure=()=>{if(!on)return null;if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;try{ctx=new AC();master=ctx.createGain();master.gain.value=.55;master.connect(ctx.destination)}catch(e){return null}}if(ctx.state=='suspended')ctx.resume().catch(()=>{});return ctx};
const tone=(f,t,d,type='sine',v=.12,to)=>{const c=ensure();if(!c)return;const o=c.createOscillator(),g=c.createGain(),s=c.currentTime+t;o.type=type;o.frequency.setValueAtTime(f,s);if(to)o.frequency.exponentialRampToValueAtTime(to,s+d);g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(v,s+.012);g.gain.exponentialRampToValueAtTime(.0001,s+d);o.connect(g);g.connect(master);o.start(s);o.stop(s+d+.03)};
const noise=(t,d,f0,f1,v=.08)=>{const c=ensure();if(!c)return;const n=c.sampleRate*d,b=c.createBuffer(1,n,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);const s=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain(),st=c.currentTime+t;s.buffer=b;fl.type='bandpass';fl.Q.value=1.2;fl.frequency.setValueAtTime(f0,st);fl.frequency.exponentialRampToValueAtTime(f1,st+d);g.gain.value=v;s.connect(fl);fl.connect(g);g.connect(master);s.start(st)};
const N={C5:523.25,D5:587.33,E5:659.25,G5:783.99,A5:880,B5:987.77,C6:1046.5,E6:1318.5,G6:1568};
const fx={
tap:()=>tone(1400,0,.045,'triangle',.05,900),
pop:()=>{tone(420,0,.11,'sine',.12,880)},
tick:()=>tone(1800,0,.03,'square',.025),
whoosh:()=>noise(0,.45,300,3400,.1),
success:()=>[N.C5,N.E5,N.G5,N.C6].forEach((f,i)=>tone(f,i*.075,.32,'sine',.11)),
coin:()=>{tone(N.B5,0,.09,'square',.05);tone(N.E6,.08,.5,'square',.05)},
error:()=>{tone(220,0,.16,'sawtooth',.07,150);tone(165,.14,.22,'sawtooth',.07,110)},
sparkle:()=>[N.G6,N.E6,N.C6,N.G6].forEach((f,i)=>tone(f*(1+Math.random()*.02),i*.06,.2,'sine',.05)),
fanfare:()=>{[N.C5,N.E5,N.G5,N.C6,N.E6].forEach((f,i)=>tone(f,i*.09,.5,'triangle',.1));noise(.45,.6,2000,6000,.04)}};
return{play:k=>{if(on&&fx[k])safe(fx[k])},get on(){return on},set(v){on=!!v;store('po-snd',on?'1':'0');if(on){ensure();fx.pop()}paintSnd()},unlock:()=>{if(on)ensure()}}})();
const paintSnd=()=>qa('[data-p7=snd]').forEach(b=>{b.innerHTML=SND.on?ICON.vol:ICON.mute;b.setAttribute('aria-pressed',SND.on);b.title=b.ariaLabel=SND.on?'Sound on':'Sound off'});
addEventListener('pointerdown',()=>SND.unlock(),{once:true,passive:true});
window.PO_SND=SND;

const ICON={
vol:'<svg viewBox="0 0 24 24" width="18" height="18"><path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
mute:'<svg viewBox="0 0 24 24" width="18" height="18"><path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6M21 9l-5 6"/></svg>',
eye:'<svg viewBox="0 0 24 24" width="18" height="18"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
eyeoff:'<svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 3l18 18M10.6 5.1A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.2 6.2A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
check:'<svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
arrow:'<svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
back:'<svg viewBox="0 0 24 24" width="18" height="18"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
mail:'<svg viewBox="0 0 24 24" width="40" height="40"><path d="M3 6h18v12H3zM3 7l9 6.5L21 7"/></svg>',
bldg:'<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 21V5l8-3v19M12 9h8v12M8 8h1M8 12h1M8 16h1M16 13h1M16 17h1"/></svg>'};

/* ============================ Confetti ============================ */
function confetti(x,y,n=110,spread=1){if(RM)return;const c=document.createElement('canvas'),W=c.width=innerWidth,H=c.height=innerHeight;c.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:200';document.body.append(c);const g=c.getContext('2d'),cols=['#0a84ff','#5e5ce6','#bf5af2','#ff2d78','#ff9f0a','#30d158','#64d2ff','#ffd60a'];
x=x??W/2;y=y??H*.45;const P=Array.from({length:n},()=>{const a=Math.random()*Math.PI*2,s=(4+Math.random()*9)*spread;return{x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-5,w:5+Math.random()*7,h:3+Math.random()*6,r:Math.random()*6,vr:(Math.random()-.5)*.4,c:cols[Math.random()*cols.length|0],l:1}});let t=0;
(function f(){t++;g.clearRect(0,0,W,H);let alive=0;P.forEach(p=>{p.vy+=.28;p.vx*=.985;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;p.l-=.0075;if(p.l>0&&p.y<H+20){alive++;g.save();g.globalAlpha=Math.max(p.l,0);g.translate(p.x,p.y);g.rotate(p.r);g.fillStyle=p.c;g.fillRect(-p.w/2,-p.h/2,p.w,p.h);g.restore()}});alive&&t<260?requestAnimationFrame(f):c.remove()})()}
window.PO_CONFETTI=confetti;

/* ============================ QR (local, small) ============================ */
function qrSvg(text,size=150){try{const m=new QRCode(-1,QRErrorCorrectLevel.Q);m.addData(text);m.make();const n=m.getModuleCount(),p=2;let d='';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(m.isDark(r,c))d+=`M${c+p} ${r+p}h1v1h-1z`;return`<svg viewBox="0 0 ${n+p*2} ${n+p*2}" width="${size}" height="${size}" shape-rendering="crispEdges" style="stroke:none"><rect width="100%" height="100%" fill="#fff" rx="2"/><path d="${d}" fill="#0b1226"/></svg>`}catch(e){return''}}

/* ============================ Styles ============================ */
const css=document.createElement('style');css.textContent=`
#gate.p7l,#gate.p7a,#gate.p7o{display:block!important;padding:0;overflow-y:auto;overflow-x:hidden;scroll-behavior:smooth;text-align:left;background:transparent}
#gate.p7l::after{display:none}
.p7-btn{position:relative;overflow:hidden;isolation:isolate}
.p7-btn::after{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.55) 48%,transparent 66%);transform:translateX(-120%);z-index:-1}
.p7-btn:hover::after{transform:translateX(120%);transition:transform .8s}
.p7-btn.big{padding:15px 28px;font-size:16px}
.p7-ico{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:50%;border:1px solid var(--gb);background:var(--gl);color:var(--tx);cursor:pointer;padding:0;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);transition:transform .25s cubic-bezier(.3,1.6,.5,1)}
.p7-ico:active{transform:scale(.88)}.p7-ico svg{stroke-width:1.9}
.p7-prog{position:fixed;top:0;left:0;height:3px;width:0;z-index:60;background:linear-gradient(90deg,#0a84ff,#bf5af2,#ff2d78);box-shadow:0 0 12px #bf5af2}
#p7cv{position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none}
.p7aur{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.p7aur i{position:absolute;border-radius:50%;filter:blur(90px);opacity:.55;mix-blend-mode:normal}
.p7aur i:nth-child(1){width:46vmax;height:46vmax;background:#0a84ff;left:-12vmax;top:-14vmax;animation:p7a1 18s ease-in-out infinite alternate}
.p7aur i:nth-child(2){width:40vmax;height:40vmax;background:#bf5af2;right:-14vmax;top:8vmax;animation:p7a2 22s ease-in-out infinite alternate}
.p7aur i:nth-child(3){width:34vmax;height:34vmax;background:#ff2d78;left:22vmax;bottom:-20vmax;animation:p7a1 26s ease-in-out infinite alternate-reverse;opacity:.4}
@keyframes p7a1{to{transform:translate(10vmax,8vmax) scale(1.2)}}@keyframes p7a2{to{transform:translate(-9vmax,10vmax) scale(.85)}}

/* ---------- landing ---------- */
.p7w{width:min(1120px,100%);margin:0 auto;padding:max(14px,env(safe-area-inset-top)) 18px 50px;box-sizing:border-box}
.p7n{position:sticky;top:max(10px,env(safe-area-inset-top));z-index:20;display:flex;align-items:center;gap:10px;padding:8px 8px 8px 14px;border-radius:99px;margin-bottom:40px;transition:box-shadow .3s,background .3s;background:color-mix(in srgb,var(--bg) 62%,transparent)}
.p7n b{display:flex;align-items:center;gap:10px;font-size:17px;letter-spacing:-.01em}.p7n .logo{width:30px;height:30px;border-radius:10px;margin:0}
.p7n .sp{flex:1}.p7n a.l{font-size:14px;font-weight:600;color:var(--mu);cursor:pointer;padding:8px 10px;border-radius:99px;display:none}.p7n a.l:hover{color:var(--tx)}
@media(min-width:820px){.p7n a.l{display:inline-block}}
.p7h{display:grid;grid-template-columns:1.1fr .9fr;gap:34px;align-items:center;min-height:min(640px,82vh);padding:10px 0 20px}
.p7chip{display:inline-flex;align-items:center;gap:8px;padding:7px 14px 7px 10px;border-radius:99px;font-size:13px;font-weight:700;background:var(--fl);box-shadow:inset 0 0 0 1px var(--gb)}
.p7chip i{width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 0 var(--ok);animation:p7pu 1.8s infinite}@keyframes p7pu{70%{box-shadow:0 0 0 9px transparent}100%{box-shadow:0 0 0 0 transparent}}
.p7h h1{font-size:clamp(42px,8vw,78px);line-height:1;letter-spacing:-.045em;margin:18px 0 16px;font-weight:800}
.p7h h1 .ln{display:block;overflow:hidden;padding-bottom:.08em}.p7h h1 .ln>span{display:inline-block;transform:translateY(110%) rotate(3deg);filter:blur(8px);animation:p7ln .9s cubic-bezier(.2,.9,.3,1) forwards}
.p7h h1 .ln:nth-child(2)>span{animation-delay:.14s}@keyframes p7ln{to{transform:none;filter:none}}
.p7rot{position:relative;display:inline-block;min-width:3ch}.p7rot em{font-style:normal;background:linear-gradient(90deg,#0a84ff,#bf5af2 55%,#ff2d78);-webkit-background-clip:text;background-clip:text;color:transparent;display:inline-block;transition:transform .5s cubic-bezier(.2,.9,.3,1),opacity .4s,filter .4s}
.p7rot em.out{transform:translateY(-60%);opacity:0;filter:blur(6px)}.p7rot em.pre{transform:translateY(60%);opacity:0;filter:blur(6px);transition:none}
.p7lead{font-size:clamp(16px,2.2vw,19px);line-height:1.55;color:var(--mu);margin:0 0 26px;max-width:540px;opacity:0;animation:p7fi .9s .55s forwards}
.p7ct{display:flex;gap:10px;flex-wrap:wrap;opacity:0;animation:p7fi .9s .7s forwards}.p7tr{display:flex;gap:8px 18px;flex-wrap:wrap;margin-top:24px;font-size:13px;font-weight:600;color:var(--mu);opacity:0;animation:p7fi .9s .85s forwards}.p7tr span:before{content:'✓ ';color:var(--ok);font-weight:800}
@keyframes p7fi{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.p7stage{position:relative;display:grid;place-items:center;perspective:1100px;min-height:470px}
.p7ph{position:relative;width:min(300px,78vw);border-radius:42px;padding:12px;transform-style:preserve-3d;transition:transform .25s ease-out;animation:p7fl 7s ease-in-out infinite;box-shadow:0 40px 90px rgba(10,20,80,.35),inset 0 1.5px 0 var(--fl)}
@keyframes p7fl{50%{margin-top:-12px}}
.p7scr{border-radius:32px;padding:18px 16px 16px;text-align:center;background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,.2));position:relative;overflow:hidden;min-height:400px;display:flex;flex-direction:column;align-items:center}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]) .p7scr{background:linear-gradient(180deg,rgba(255,255,255,.1),rgba(255,255,255,.03))}}
:root[data-theme=dark] .p7scr{background:linear-gradient(180deg,rgba(255,255,255,.1),rgba(255,255,255,.03))}
.p7scr small{color:var(--mu);font-weight:700;letter-spacing:.04em}.p7scr h2{font-size:38px;letter-spacing:-.03em;margin:2px 0 10px;text-transform:none;color:var(--tx)}
.p7qr{position:relative;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.18);transition:transform .6s cubic-bezier(.3,1.5,.5,1),filter .6s,opacity .6s}.p7qr svg{display:block;border-radius:18px}
.p7beam{position:absolute;left:-4%;right:-4%;height:3px;top:0;background:linear-gradient(90deg,transparent,#30d158,transparent);box-shadow:0 0 18px 4px rgba(48,209,88,.7);opacity:0}
.p7ph[data-s="1"] .p7beam{opacity:1;animation:p7bm 1.4s ease-in-out}@keyframes p7bm{0%{top:0}50%{top:calc(100% - 3px)}100%{top:0}}
.p7ph[data-s="2"] .p7qr{transform:scale(.55);filter:blur(5px);opacity:.15}
.p7st{margin-top:12px;padding:7px 16px;border-radius:99px;font-weight:800;font-size:13px;transition:all .4s;background:color-mix(in srgb,var(--wr) 22%,transparent);color:var(--wr)}
.p7ph[data-s="2"] .p7st{background:color-mix(in srgb,var(--ok) 24%,transparent);color:var(--ok);transform:scale(1.08)}
.p7ok{position:absolute;left:50%;top:48%;width:112px;height:112px;margin:-56px 0 0 -56px;border-radius:50%;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,#32d74b,#0fa63a);box-shadow:0 14px 40px rgba(48,209,88,.55);transform:scale(0);transition:transform .6s cubic-bezier(.3,1.7,.5,1)}
.p7ok svg{width:56px;height:56px;stroke-width:3}.p7ok path{stroke-dasharray:30;stroke-dashoffset:30}
.p7ph[data-s="2"] .p7ok{transform:scale(1)}.p7ph[data-s="2"] .p7ok path{stroke-dashoffset:0;transition:stroke-dashoffset .5s .35s}
.p7ok::before,.p7ok::after{content:'';position:absolute;inset:0;border-radius:50%;border:2px solid #32d74b;opacity:0}.p7ph[data-s="2"] .p7ok::before{animation:p7rp 1.6s .2s infinite}.p7ph[data-s="2"] .p7ok::after{animation:p7rp 1.6s .8s infinite}
@keyframes p7rp{from{transform:scale(1);opacity:.7}to{transform:scale(2.2);opacity:0}}
.p7orb{position:absolute;padding:9px 13px;border-radius:16px;font-size:13px;font-weight:700;white-space:nowrap;box-shadow:0 14px 30px var(--sh);animation:p7ob 6s ease-in-out infinite;z-index:2;transform:translateZ(60px)}
.p7orb.a{left:-4%;top:14%}.p7orb.b{right:-2%;top:40%;animation-delay:-2s}.p7orb.c{left:0;bottom:12%;animation-delay:-4s}
@keyframes p7ob{50%{transform:translateY(-14px)}}
.p7n .btn,.p7n b{white-space:nowrap}
@media(max-width:760px){.p7h{grid-template-columns:1fr;min-height:0;gap:10px}.p7stage{min-height:420px;margin-top:10px}.p7orb.a{left:-2%;top:6%}.p7orb.b{right:-2%;top:46%}.p7orb.c{display:none}.p7n{margin-bottom:26px}.p7n .btn.q{display:none}.p7h h1{margin-top:14px}}
.p7mq{overflow:hidden;margin:26px -18px 0;-webkit-mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)}
.p7mq div{display:flex;gap:12px;width:max-content;animation:p7mq 38s linear infinite}.p7mq:hover div{animation-play-state:paused}
.p7mq span{padding:10px 18px;border-radius:99px;font-weight:700;font-size:14px;background:var(--gl);border:1px solid var(--gb);white-space:nowrap}@keyframes p7mq{to{transform:translateX(-50%)}}
.p7s{margin:92px 0 0}.p7s>h2{font-size:clamp(28px,5vw,46px);letter-spacing:-.035em;margin:0 0 8px;text-transform:none;color:var(--tx)}.p7s>p.sub{color:var(--mu);margin:0 0 26px;font-size:17px;max-width:620px}
.p7s .kick{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--ac);margin-bottom:10px}
.rv7{opacity:0;transform:translateY(26px);filter:blur(5px);transition:opacity .8s,transform .8s cubic-bezier(.2,.9,.3,1),filter .8s}.rv7.in{opacity:1;transform:none;filter:none}
/* demo */
.p7demo{display:grid;grid-template-columns:1.2fr .8fr;gap:16px}@media(max-width:820px){.p7demo{grid-template-columns:1fr}}
.p7dl{padding:18px;border-radius:30px}.p7dl .hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px;flex-wrap:wrap}
.p7tn{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:20px;margin-bottom:8px;background:var(--fl);box-shadow:inset 0 0 0 1px var(--gb);transition:transform .4s cubic-bezier(.3,1.6,.5,1),background .4s}
.p7tn .av{width:40px;height:40px;border-radius:14px;display:grid;place-items:center;font-weight:800;color:#fff;flex:none}.p7tn .m{flex:1;min-width:0}.p7tn .m b{display:block}.p7tn .m small{color:var(--mu)}
.p7tn .bd{transition:all .4s}.p7tn.pop{transform:scale(1.03)}.p7tn.sent .bd{background:rgba(10,132,255,.16);color:var(--ac)}.p7tn.paid .bd{background:rgba(48,209,88,.18);color:var(--ok)}
.p7dr{padding:22px;border-radius:30px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
.p7ring{position:relative;width:170px;height:170px}.p7ring svg{width:100%;height:100%;transform:rotate(-90deg)}.p7ring circle{fill:none;stroke-width:12;stroke-linecap:round}.p7ring .t{stroke:var(--fl)}.p7ring .p{stroke:url(#p7g);stroke-dasharray:440;stroke-dashoffset:440;transition:stroke-dashoffset 1s cubic-bezier(.2,.9,.3,1)}
.p7ring b{position:absolute;inset:0;display:grid;place-items:center;font-size:28px;letter-spacing:-.03em}
.p7wa{align-self:stretch;margin-top:10px;min-height:46px;text-align:left;font-size:13px}.p7wa span{display:inline-block;padding:9px 13px;border-radius:16px 16px 16px 4px;background:#d9fdd3;color:#0b1226;animation:p7fi .4s both;max-width:100%}
/* bento */
.p7b{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}.p7b>.g{grid-column:span 2}.p7b>.w{grid-column:span 3}.p7b>.x{grid-column:span 4}
@media(max-width:900px){.p7b{grid-template-columns:repeat(2,1fr)}.p7b>.g,.p7b>.w,.p7b>.x{grid-column:span 1}.p7b>.x{grid-column:span 2}}@media(max-width:560px){.p7b{grid-template-columns:1fr}.p7b>.g,.p7b>.w,.p7b>.x{grid-column:auto}}
.p7f{position:relative;padding:22px;border-radius:30px;overflow:hidden;transition:transform .45s cubic-bezier(.3,1.5,.5,1)}
.p7f::before{content:'';position:absolute;inset:0;background:radial-gradient(380px circle at var(--mx,50%) var(--my,0%),rgba(255,255,255,.28),transparent 45%);opacity:0;transition:opacity .3s;pointer-events:none}.p7f:hover::before{opacity:1}.p7f:hover{transform:translateY(-5px)}
.p7f i{display:grid;place-items:center;width:50px;height:50px;border-radius:17px;font-style:normal;font-size:24px;background:var(--fl);box-shadow:inset 0 0 0 1px var(--gb);margin-bottom:14px;transition:transform .5s cubic-bezier(.3,1.8,.5,1)}.p7f:hover i{transform:rotate(-8deg) scale(1.12)}
.p7f b{display:block;font-size:19px;letter-spacing:-.02em;margin-bottom:5px}.p7f span{color:var(--mu);font-size:14.5px;line-height:1.5}
/* steps */
.p7st3{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}@media(max-width:760px){.p7st3{grid-template-columns:1fr}}
.p7st3 .g{padding:26px 22px 22px;border-radius:30px;position:relative}.p7st3 .n{position:absolute;top:-16px;left:20px;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;font-weight:800;color:#fff;background:linear-gradient(135deg,var(--ac),#bf5af2);box-shadow:0 8px 20px var(--sh)}
.p7st3 b{display:block;font-size:18px;margin-bottom:4px}.p7st3 span{color:var(--mu);font-size:14.5px}
/* faq */
.p7q details{padding:0;margin-bottom:10px;border-radius:22px;overflow:hidden}.p7q summary{list-style:none;cursor:pointer;padding:18px 20px;font-weight:700;display:flex;justify-content:space-between;gap:14px;align-items:center}.p7q summary::-webkit-details-marker{display:none}
.p7q summary::after{content:'+';font-size:24px;font-weight:400;color:var(--ac);transition:transform .35s}.p7q details[open] summary::after{transform:rotate(45deg)}.p7q p{margin:0;padding:0 20px 18px;color:var(--mu);line-height:1.55}
.p7cta{position:relative;margin-top:92px;padding:54px 22px;border-radius:38px;text-align:center;overflow:hidden}
.p7cta::before{content:'';position:absolute;inset:-60%;background:conic-gradient(from 0deg,#0a84ff,#bf5af2,#ff2d78,#ff9f0a,#0a84ff);opacity:.22;animation:p7sp 12s linear infinite;z-index:-1}@keyframes p7sp{to{transform:rotate(360deg)}}
.p7cta h2{font-size:clamp(30px,5.5vw,52px);letter-spacing:-.04em;margin:0 0 10px;text-transform:none;color:var(--tx)}.p7cta p{color:var(--mu);margin:0 0 22px;font-size:17px}
.p7ft{margin-top:30px;text-align:center;color:var(--mu);font-size:13px}.p7ft a{color:var(--ac);cursor:pointer;font-weight:600}

/* ---------- auth ---------- */
.p7au{display:grid;grid-template-columns:1.05fr .95fr;min-height:100%;width:100%}
.p7ar .big7{margin-top:clamp(36px,11vh,120px);position:relative;z-index:2}.p7ar{position:relative;display:flex;flex-direction:column;justify-content:flex-start;padding:34px 40px;overflow:hidden;color:#fff;background:linear-gradient(155deg,#0a3dff,#6a2bd9 55%,#d4237a)}
.p7ar::before{content:'';position:absolute;inset:0;background:radial-gradient(600px circle at 20% 10%,rgba(255,255,255,.25),transparent 55%),radial-gradient(500px circle at 90% 90%,rgba(255,159,10,.35),transparent 55%)}
.p7ar>*{position:relative}.p7ar .br7{display:flex;align-items:center;gap:12px;font-weight:800;font-size:20px}.p7ar .br7 .logo{width:40px;height:40px;margin:0}
.p7ar h2{font-size:clamp(30px,3.6vw,46px);letter-spacing:-.035em;line-height:1.05;margin:0 0 14px;text-transform:none;color:#fff}.p7ar p{opacity:.85;font-size:16px;line-height:1.55;max-width:420px;margin:0}
.p7sky{position:absolute!important;left:0;right:0;bottom:0;height:34%;opacity:.95;z-index:1}.p7sky svg{width:100%;height:100%;stroke:none}.p7sky .w{animation:tw 3.4s ease-in-out infinite}.p7sky .w:nth-child(3n){animation-delay:-1s}.p7sky .w:nth-child(3n+1){animation-delay:-2.2s}.p7sky .w:nth-child(5n){animation-delay:-.4s}
@keyframes tw{50%{opacity:.2}}
.p7tip{display:flex;gap:10px;align-items:center;margin-top:22px;padding:12px 16px;border-radius:18px;background:rgba(255,255,255,.16);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);max-width:400px;font-size:14px;font-weight:600;min-height:48px;transition:opacity .4s}
.p7fm{display:flex;align-items:center;justify-content:center;padding:28px 20px;position:relative}.p7fm .top{position:absolute;top:16px;right:16px;display:flex;gap:8px}
.p7c{width:min(430px,100%);padding:30px;border-radius:34px;animation:p7cin .8s cubic-bezier(.2,.9,.3,1) both}@keyframes p7cin{from{opacity:0;transform:translateY(30px) scale(.96);filter:blur(8px)}}
.p7c.shake{animation:p7sh .5s}@keyframes p7sh{20%{transform:translateX(-10px)}40%{transform:translateX(9px)}60%{transform:translateX(-6px)}80%{transform:translateX(4px)}}
.p7c h1{font-size:30px;letter-spacing:-.035em;margin:0 0 4px}.p7c .sb{color:var(--mu);margin:0 0 18px;font-size:15px}
.p7seg{position:relative;display:grid;grid-template-columns:1fr 1fr;padding:4px;border-radius:99px;background:var(--fl);box-shadow:inset 0 0 0 1px var(--gb);margin-bottom:18px}.p7seg i{position:absolute;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);border-radius:99px;background:var(--gl);box-shadow:inset 0 0 0 1px var(--gb),0 4px 14px var(--sh);transition:transform .45s cubic-bezier(.3,1.4,.5,1)}.p7seg.up i{transform:translateX(100%)}
.p7seg button{position:relative;z-index:1;border:0;background:none;color:var(--mu);font:700 14px inherit;font-family:inherit;padding:10px;cursor:pointer;transition:color .3s}.p7seg button.on{color:var(--tx)}
.p7fl{position:relative;display:block;margin:0 0 14px}.p7fl input{padding:22px 14px 8px;margin:0;border-radius:18px;font-size:16px}.p7fl span{position:absolute;left:15px;top:17px;font-size:15px;font-weight:500;color:var(--mu);pointer-events:none;transition:all .2s;transform-origin:left}
.p7fl input:focus+span,.p7fl input:not(:placeholder-shown)+span{top:7px;font-size:11px;font-weight:700;letter-spacing:.04em;color:var(--ac)}.p7fl input:focus{outline:2px solid var(--ac);outline-offset:1px}.p7fl.bad input{outline:2px solid var(--er)}.p7fl.good input{outline:2px solid color-mix(in srgb,var(--ok) 70%,transparent)}
.p7fl .eye{position:absolute;right:6px;top:8px;width:38px;height:38px;border:0;background:none;color:var(--mu);cursor:pointer;display:grid;place-items:center;border-radius:50%}
.p7fl .ok{position:absolute;right:12px;top:15px;color:var(--ok);opacity:0;transform:scale(.4);transition:all .35s cubic-bezier(.3,1.8,.5,1)}.p7fl.good .ok{opacity:1;transform:none}
.p7pw{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:-4px 0 6px}.p7pw i{height:5px;border-radius:9px;background:var(--fl);transition:background .3s}
.p7hint{font-size:12.5px;color:var(--mu);margin:0 0 12px;min-height:18px}.p7caps{color:var(--wr);font-weight:700}
.p7msg{min-height:20px;margin:0 0 10px;font-size:14px;font-weight:600;color:var(--er);text-align:left}.p7msg.ok{color:var(--ok)}
.p7go{width:100%;padding:15px;font-size:16px}.p7go .sp7{display:none;width:18px;height:18px;border-radius:50%;border:2.5px solid rgba(255,255,255,.4);border-top-color:#fff;animation:p7spin .7s linear infinite;vertical-align:-4px;margin-right:8px}.p7go.ld .sp7{display:inline-block}@keyframes p7spin{to{transform:rotate(360deg)}}
.p7c .lnk{display:flex;justify-content:space-between;margin-top:16px;font-size:14px}.p7c .lnk a{color:var(--ac);font-weight:600;cursor:pointer}
.p7iv{display:flex;gap:10px;align-items:center;padding:11px 14px;border-radius:18px;background:color-mix(in srgb,var(--ac) 14%,transparent);color:var(--tx);font-size:14px;font-weight:600;margin-bottom:14px}
.p7env{display:grid;place-items:center;width:92px;height:92px;margin:6px auto 14px;border-radius:30px;color:#fff;background:linear-gradient(145deg,#0a84ff,#bf5af2);box-shadow:0 18px 40px rgba(94,92,230,.45);animation:p7pop .9s cubic-bezier(.3,1.7,.5,1) both}@keyframes p7pop{from{transform:scale(0) rotate(-30deg)}}
.p7env svg{stroke-width:1.8}
@media(max-width:860px){.p7au{grid-template-columns:1fr;grid-template-rows:auto 1fr}.p7ar{padding:20px 20px 26px;min-height:0;border-radius:0 0 34px 34px}.p7ar p,.p7tip,.p7sky{display:none}.p7ar .big7{display:none}.p7fm{padding:18px 14px 34px;align-items:flex-start}.p7fm .top{position:fixed;top:max(14px,env(safe-area-inset-top));right:14px;z-index:5}.p7ar .br7{font-size:18px}.p7c{padding:24px 22px}}

/* ---------- onboarding ---------- */
.p7ob{min-height:100%;display:flex;align-items:center;justify-content:center;padding:22px 16px}
.p7oc{width:min(560px,100%);padding:30px;border-radius:36px;animation:p7cin .8s cubic-bezier(.2,.9,.3,1) both;position:relative}
.p7dots{display:flex;gap:8px;align-items:center;margin-bottom:22px}.p7dots i{flex:1;height:6px;border-radius:9px;background:var(--fl);overflow:hidden;position:relative}.p7dots i::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,var(--ac),#bf5af2);transform:translateX(-101%);transition:transform .6s cubic-bezier(.2,.9,.3,1)}.p7dots i.on::after{transform:none}
.p7oc h1{font-size:clamp(26px,5vw,34px);letter-spacing:-.035em;margin:0 0 6px}.p7oc .sb{color:var(--mu);margin:0 0 20px}
.p7sw{animation:p7sl .55s cubic-bezier(.2,.9,.3,1) both}@keyframes p7sl{from{opacity:0;transform:translateX(30px);filter:blur(6px)}}.p7sw.rev{animation-name:p7sr}@keyframes p7sr{from{opacity:0;transform:translateX(-30px);filter:blur(6px)}}
.p7opt{display:flex;align-items:center;gap:14px;width:100%;text-align:left;padding:16px;margin-bottom:10px;border-radius:22px;border:1px solid var(--gb);background:var(--fl);color:var(--tx);font-family:inherit;cursor:pointer;transition:transform .3s cubic-bezier(.3,1.6,.5,1),box-shadow .3s}
.p7opt:hover{transform:translateY(-2px)}.p7opt:active{transform:scale(.98)}.p7opt.on{box-shadow:0 0 0 2px var(--ac);background:color-mix(in srgb,var(--ac) 12%,var(--fl))}
.p7opt .e{font-size:26px;width:48px;height:48px;border-radius:16px;display:grid;place-items:center;background:var(--gl);flex:none}.p7opt b{display:block;font-size:16px}.p7opt small{color:var(--mu);font-size:13px}
.p7chips{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 18px}.p7chips button{border:1px solid var(--gb);background:var(--fl);color:var(--tx);font:600 14px inherit;font-family:inherit;padding:10px 16px;border-radius:99px;cursor:pointer;transition:all .25s cubic-bezier(.3,1.6,.5,1)}.p7chips button.on{background:var(--ac);color:#fff;transform:scale(1.05);border-color:transparent}
.p7lab{font-size:13px;font-weight:700;color:var(--mu);margin:14px 0 4px;display:block}
.p7slug{display:flex;align-items:center;gap:6px;padding:12px 14px;border-radius:16px;background:var(--fl);box-shadow:inset 0 0 0 1px var(--gb);font-size:14px;color:var(--mu);margin:-4px 0 14px;word-break:break-all}.p7slug b{color:var(--tx)}
.p7nv{display:flex;gap:10px;margin-top:6px}.p7nv .btn{flex:1}.p7nv .btn.q{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px}
.p7build{text-align:center;padding:6px 0}.p7bld{position:relative;width:120px;height:120px;margin:0 auto 18px}.p7bld svg{width:100%;height:100%;transform:rotate(-90deg)}.p7bld circle{fill:none;stroke-width:8;stroke-linecap:round}.p7bld .t{stroke:var(--fl)}.p7bld .p{stroke:url(#p7g2);stroke-dasharray:327;stroke-dashoffset:327;transition:stroke-dashoffset .6s}
.p7bld div{position:absolute;inset:0;display:grid;place-items:center;font-size:42px}
.p7bl{list-style:none;padding:0;margin:0 auto;max-width:330px;text-align:left}.p7bl li{display:flex;align-items:center;gap:12px;padding:9px 0;color:var(--mu);font-weight:600;transition:color .3s}.p7bl li em{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;flex:none;font-style:normal;box-shadow:inset 0 0 0 2px var(--gb);transition:all .35s cubic-bezier(.3,1.8,.5,1)}.p7bl li em svg{width:14px;height:14px;stroke-width:3;opacity:0}
.p7bl li.on{color:var(--tx)}.p7bl li.on em{background:var(--ok);box-shadow:none;color:#fff;transform:scale(1.1)}.p7bl li.on em svg{opacity:1}

/* ---------- tour ---------- */
.p7t{position:fixed;inset:0;z-index:150;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(5,10,40,.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);animation:fi .4s}
.p7tc{width:min(460px,100%);padding:30px 26px 24px;border-radius:38px;text-align:center;animation:p7cin .8s cubic-bezier(.2,.9,.3,1) both}
.p7tc .em7{font-size:60px;line-height:1;margin-bottom:10px;display:block;animation:p7pop .9s cubic-bezier(.3,1.7,.5,1) both}.p7tc h2{font-size:28px;letter-spacing:-.035em;margin:0 0 8px;text-transform:none;color:var(--tx)}.p7tc p{color:var(--mu);margin:0 0 18px;line-height:1.55}
.p7tl{list-style:none;padding:0;margin:0 0 18px;text-align:left}.p7tl li{display:flex;gap:12px;align-items:center;padding:11px 14px;border-radius:18px;background:var(--fl);box-shadow:inset 0 0 0 1px var(--gb);margin-bottom:8px;font-weight:600;opacity:0;animation:p7fi .5s forwards}.p7tl li:nth-child(1){animation-delay:.15s}.p7tl li:nth-child(2){animation-delay:.3s}.p7tl li:nth-child(3){animation-delay:.45s}.p7tl li:nth-child(4){animation-delay:.6s}
.p7tl li i{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-style:normal;font-weight:800;font-size:13px;color:#fff;background:linear-gradient(135deg,var(--ac),#bf5af2);flex:none}
.p7td{display:flex;justify-content:center;gap:6px;margin-bottom:16px}.p7td i{width:7px;height:7px;border-radius:9px;background:var(--gb);transition:all .35s}.p7td i.on{width:22px;background:var(--ac)}

/* ---------- in-app polish ---------- */
.k b,.xs b{font-variant-numeric:tabular-nums}
.g.k,.row,.hero{position:relative;overflow:hidden}
.g.k::before,.row::before,.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(260px circle at var(--mx,50%) var(--my,0%),rgba(255,255,255,.22),transparent 60%);opacity:0;transition:opacity .3s;pointer-events:none;border-radius:inherit}
.g.k:hover::before,.row:hover::before,.hero:hover::before{opacity:1}.g.k{transition:transform .4s cubic-bezier(.3,1.5,.5,1)}.g.k:hover{transform:translateY(-3px)}
.p7rip{position:absolute;border-radius:50%;background:rgba(255,255,255,.45);transform:scale(0);animation:p7rip .6s ease-out forwards;pointer-events:none}@keyframes p7rip{to{transform:scale(1);opacity:0}}
header .p7-ico{width:38px;height:38px}
@media(prefers-reduced-motion:reduce){.p7h h1 .ln>span,.p7lead,.p7ct,.p7tr{opacity:1;transform:none;filter:none;animation:none}.rv7{opacity:1;transform:none;filter:none}.p7mq div{animation:none}}
`;document.head.append(css);

const LOGO7='<span class="logo"><img src="assets/logo.png" alt=""></span>';
const gateEl=()=>q('#gate');
const setGate=(cls,html)=>{const e=gateEl();e.classList.remove('lp','p7l','p7a','p7o');if(cls)e.classList.add(cls);gate(html);e.classList.remove('lp');if(cls)e.classList.add(cls);e.scrollTop=0;return e};
const sndBtn=()=>`<button class="p7-ico" data-p7="snd" type="button" aria-pressed="${SND.on}" title="Sound" aria-label="Sound">${SND.on?ICON.vol:ICON.mute}</button>`;

/* ============================ Landing ============================ */
let LP={};
function stopLanding(){(LP.stop||[]).forEach(f=>safe(f));LP={}}
const WORDS=['on time.','by UPI.','without chasing.','beautifully.'];
const FK=['pay','inq','leases','maint','utils','reports','set'];
const FEATS=[['📲','UPI rent QR','Every charge gets a scannable QR with the exact amount. Tenants pay from any UPI app, straight to your UPI ID.','x'],['💬','WhatsApp reminders','One tap sends a polite reminder with the UPI link to every overdue tenant.','g'],['📑','Leases & tenants','Start, renew and end leases. Invite tenants to their own portal.','g'],['🛠️','Repairs','Tenants report issues. You track them from new to resolved.','g'],['⚡','Realtime & offline','Changes sync live across devices, and the app opens even without a signal.','g'],['📈','Profit & cash flow','Log expenses, see profit by property and a 12-month cash-flow view.','x'],['🎨','Make it yours','Upload your logo and name, pick a theme: light, dark or AMOLED.','g']];
const FAQ=[['Is PropertyOS free?','Yes, you can start free. The app runs on a free Supabase project, so you can try it with your own properties before deciding anything.'],['How do tenants pay?','PropertyOS creates a UPI QR and payment link with the exact amount. The money goes straight from your tenant to your UPI ID. PropertyOS never holds your rent.'],['Do my tenants need an account?','Only if you want them to have the portal. You send an invite link, and they can see what is due, pay by UPI and report repairs.'],['Does it work without internet?','The app is cached on the device, opens instantly from a saved snapshot, and tells you when you are offline. It syncs when you are back.'],['Is my data private?','Your data is stored in your own Supabase project behind row-level security, so each workspace only sees its own records. You can export a backup any time.']];
const DEMO=[['Aarav Mehta','A-101','#0a84ff',18000],['Diya Nair','B-204','#bf5af2',15000],['Kabir Rao','C-302','#ff2d78',22000],['Meera Iyer','A-103','#ff9f0a',12000]];

function landing7(){stopLanding();ls_seen();
const n=new Date(),mo=n.toLocaleString('en',{month:'long'});let upi='upi://pay?pa=demo@upi&pn=PropertyOS%20Demo&am=15000.00&cu=INR&tn=Rent%20'+mo;
const e=setGate('p7l',`<div class="p7-prog" id="p7pg"></div><div class="p7aur"><i></i><i></i><i></i></div><canvas id="p7cv"></canvas>
<div class="p7w"><nav class="g p7n"><b>${LOGO7}PropertyOS</b><span class="sp"></span><a class="l" data-p7="go" data-t="p7demo">Demo</a><a class="l" data-p7="go" data-t="p7feat">Features</a><a class="l" data-p7="go" data-t="p7faq">FAQ</a>${sndBtn()}<button class="btn q s" data-p7="in">Sign in</button><button class="btn s p7-btn" data-p7="up">Get started</button></nav>
<section class="p7h"><div><span class="p7chip"><i></i>Built for India · UPI-first</span>
<h1><span class="ln"><span>Collect rent</span></span><span class="ln"><span class="p7rot"><em id="p7w">${WORDS[0]}</em></span></span></h1>
<p class="p7lead">Leases, tenants, repairs and UPI rent QR codes in one liquid-glass app. Fast on any phone, installable, and it keeps working offline.</p>
<div class="p7ct"><button class="btn p7-btn big" data-p7="up">Create free workspace ${ICON.arrow.replace('18','20').replace('18','20')}</button><button class="btn q big" data-p7="go" data-t="p7demo">Watch it work</button></div>
<div class="p7tr"><span>Free to start</span><span>Row-level security</span><span>Installs like an app</span></div></div>
<div class="p7stage"><div class="g p7ph" id="p7ph" data-s="0"><div class="p7scr"><small>RENT · ${mo.toUpperCase()}</small><h2>₹15,000</h2><div class="p7qr">${qrSvg(upi,176)}<div class="p7beam"></div></div><div class="p7st" id="p7st">Due · scan to pay</div><div class="p7ok"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><small style="margin-top:auto;padding-top:14px">Sample data · tenants pay by UPI</small></div></div>
<div class="g p7orb a" id="p7oa">${I('inq')}<span>Reminder sent</span></div><div class="g p7orb b" id="p7ob">${I('pay')}<span>₹15,000 received</span></div><div class="g p7orb c">${I('utils')}<span>Realtime sync</span></div></div></section>
<div class="p7mq"><div>${['GPay','PhonePe','Paytm','BHIM','Any UPI handle','WhatsApp reminders','Works offline','Installs like an app','Realtime sync','Row-level security'].concat(['GPay','PhonePe','Paytm','BHIM','Any UPI handle','WhatsApp reminders','Works offline','Installs like an app','Realtime sync','Row-level security']).map(x=>`<span>${x}</span>`).join('')}</div></div>

<section class="p7s rv7" id="p7demo"><span class="kick">Interactive demo</span><h2>See rent day in 10 seconds</h2><p class="sub">Sample tenants, sample money. Press the button and watch the month fill itself in.</p>
<div class="p7demo"><div class="g p7dl"><div class="hd"><b style="font-size:17px">${mo} rent</b><button class="btn s p7-btn" id="p7run" data-p7="run">▶ Remind everyone</button></div>${DEMO.map((d,i)=>`<div class="p7tn" data-i="${i}"><span class="av" style="background:${d[2]}">${d[0][0]}</span><div class="m"><b>${d[0]}</b><small>${d[1]} · ₹${d[3].toLocaleString('en-IN')}</small></div><span class="bd Overdue">Overdue</span></div>`).join('')}</div>
<div class="g p7dr"><div class="p7ring"><svg viewBox="0 0 160 160"><defs><linearGradient id="p7g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a84ff"/><stop offset="1" stop-color="#bf5af2"/></linearGradient></defs><circle class="t" cx="80" cy="80" r="70"/><circle class="p" id="p7rg" cx="80" cy="80" r="70"/></svg><b id="p7sum">₹0</b></div><small style="color:var(--mu);font-weight:700">COLLECTED OF ₹67,000</small><div class="p7wa" id="p7wa"></div></div></div></section>

<section class="p7s rv7" id="p7feat"><span class="kick">Everything in one place</span><h2>Everything a landlord needs</h2><p class="sub">No spreadsheets, no chasing. Built around how rent really works in India.</p>
<div class="p7b">${FEATS.map(f=>`<div class="g p7f ${f[3]}"><i class="lq-fi">${ico(FK[FEATS.indexOf(f)],SEC[FK[FEATS.indexOf(f)]][1])}</i><b>${f[1]}</b><span>${f[2]}</span></div>`).join('')}</div></section>

<section class="p7s rv7"><span class="kick">Getting started</span><h2>Up and running in minutes</h2><p class="sub">Three steps from sign-up to your first UPI payment.</p>
<div class="p7st3"><div class="g"><span class="n">1</span><b>Create your workspace</b><span>Name your business and add your UPI ID.</span></div><div class="g"><span class="n">2</span><b>Add properties &amp; tenants</b><span>Units, leases and tenant invites in a few taps.</span></div><div class="g"><span class="n">3</span><b>Share the QR, get paid</b><span>Generate rent, send reminders, record payments.</span></div></div></section>

<div class="p7s rv7 sec4" id="lpL" hidden style="margin-top:92px"><span class="kick" style="display:inline-block;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--ac);margin-bottom:10px">Public rentals</span><h2 style="font-size:clamp(28px,5vw,46px);letter-spacing:-.035em;margin:0 0 8px;text-transform:none;color:var(--tx)">Available to rent</h2><p style="color:var(--mu);margin:0 0 22px;font-size:17px">Browse homes from landlords on PropertyOS and send an inquiry.</p><div class="ls4" id="lpC"></div></div>

<section class="p7s p7q rv7" id="p7faq"><span class="kick">Questions</span><h2>Good to know</h2><p class="sub">Straight answers before you sign up.</p>${FAQ.map(f=>`<details class="g"><summary>${f[0]}</summary><p>${f[1]}</p></details>`).join('')}</section>

<section class="g p7cta rv7"><h2>Ready to get paid on time?</h2><p>Create your free workspace in under a minute.</p><button class="btn p7-btn big" data-p7="up" data-boom="1">Create free account ${ICON.arrow.replace('18','20').replace('18','20')}</button><p style="margin:16px 0 0;font-size:14px">Invited by your landlord? <a data-p7="in" style="color:var(--ac);cursor:pointer;font-weight:700">Sign in as tenant</a></p></section>
<div class="p7ft">© ${n.getFullYear()} PropertyOS · Made in India · <a data-p7="in">Sign in</a></div></div>`);
/* scroll progress, nav glow, reveals */
const pg=q('#p7pg'),nav=q('.p7n');e.onscroll=()=>{const m=e.scrollHeight-e.clientHeight;pg.style.width=m>0?e.scrollTop/m*100+'%':'0';nav.style.boxShadow=e.scrollTop>20?'0 14px 40px var(--sh), inset 0 1.5px 0 var(--fl)':''};
const io=new IntersectionObserver(a=>a.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}}),{root:e,threshold:.1});qa('.rv7',e).forEach(x=>io.observe(x));LP.stop=[()=>io.disconnect()];
/* spotlight on feature cards */
qa('.p7f',e).forEach(c=>c.addEventListener('pointermove',ev=>{const r=c.getBoundingClientRect();c.style.setProperty('--mx',ev.clientX-r.left+'px');c.style.setProperty('--my',ev.clientY-r.top+'px')}));
/* rotating word */
let wi=0;const w=q('#p7w'),rot=setInterval(()=>{if(document.hidden||!w.isConnected)return;w.classList.add('out');setTimeout(()=>{wi=(wi+1)%WORDS.length;w.textContent=WORDS[wi];w.classList.remove('out');w.classList.add('pre');void w.offsetWidth;w.classList.remove('pre')},420)},2600);LP.stop.push(()=>clearInterval(rot));
/* phone tilt */
const ph=q('#p7ph');if(FINE&&!RM){const st=q('.p7stage');const mv=ev=>{const r=st.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width-.5,y=(ev.clientY-r.top)/r.height-.5;ph.style.transform=`rotateY(${x*18}deg) rotateX(${-y*14}deg)`};st.addEventListener('pointermove',mv);st.addEventListener('pointerleave',()=>ph.style.transform='')}
/* phone story loop: due -> scan -> paid */
const stEl=q('#p7st');let step=0;const story=()=>{if(document.hidden||!ph.isConnected)return;step=(step+1)%4;const s=step==0?0:step==1?1:step==2?2:2;ph.dataset.s=s;if(step==0){stEl.textContent='Due · scan to pay'}if(step==1){stEl.textContent='Scanning…';SND.play('tick')}if(step==2){stEl.textContent='Paid ✓ ₹15,000';SND.play('coin');const r=ph.getBoundingClientRect();confetti(r.left+r.width/2,r.top+r.height/2,60,.7)}};
const sto=setInterval(story,2300);LP.stop.push(()=>clearInterval(sto));
/* particle canvas: rising soft "rupee" dots */
const cv=q('#p7cv');if(cv&&!RM){const x=cv.getContext('2d');let W,H,raf;const fit=()=>{W=cv.width=innerWidth;H=cv.height=innerHeight};fit();addEventListener('resize',fit);const P=Array.from({length:innerWidth<700?18:34},()=>({x:Math.random()*W,y:Math.random()*H,r:1+Math.random()*2.4,v:.15+Math.random()*.4,a:.15+Math.random()*.4,s:Math.random()*6}));
const f=()=>{if(!cv.isConnected)return;raf=requestAnimationFrame(f);if(document.hidden)return;x.clearRect(0,0,W,H);P.forEach(p=>{p.y-=p.v;p.s+=.01;p.x+=Math.sin(p.s)*.25;if(p.y<-10){p.y=H+10;p.x=Math.random()*W}x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fillStyle=`rgba(160,170,255,${p.a})`;x.fill()})};f();LP.stop.push(()=>{cancelAnimationFrame(raf);removeEventListener('resize',fit)})}
/* listings (existing upgrade4 loader fills #lpC) */
safe(()=>window._po7loadList&&window._po7loadList());
SND.play('whoosh')}
const ls_seen=()=>{};

/* demo runner */
function runDemo(btn){if(btn.dataset.busy)return;btn.dataset.busy=1;btn.textContent='Sending…';const rows=qa('.p7tn'),wa=q('#p7wa'),sum=q('#p7sum'),rg=q('#p7rg');let total=0;const T=67000,paint=v=>{sum.textContent='₹'+Math.round(v).toLocaleString('en-IN');rg.style.strokeDashoffset=440-440*Math.min(v/T,1)};
rows.forEach(r=>{r.className='p7tn';const b=r.querySelector('.bd');b.className='bd Overdue';b.textContent='Overdue'});paint(0);wa.innerHTML='';
const wait=ms=>new Promise(r=>setTimeout(r,RM?Math.min(ms,60):ms));
(async()=>{SND.play('whoosh');wa.innerHTML='<span>💬 Hi! Rent for this month is due. Pay by UPI: upi://pay?…</span>';for(const r of rows){await wait(260);if(!r.isConnected)return;r.classList.add('sent','pop');r.querySelector('.bd').className='bd';r.querySelector('.bd').textContent='Reminded';SND.play('pop');await wait(160);r.classList.remove('pop')}
await wait(700);for(let i=0;i<rows.length;i++){const r=rows[i];if(!r.isConnected)return;r.classList.remove('sent');r.classList.add('paid','pop');const b=r.querySelector('.bd');b.className='bd Paid';b.textContent='Paid ✓';total+=DEMO[i][3];SND.play('coin');
const from=total-DEMO[i][3],t0=performance.now();await new Promise(res=>{const f=t=>{const k=Math.min((t-t0)/500,1);paint(from+(total-from)*k);k<1?requestAnimationFrame(f):res()};requestAnimationFrame(f)});wa.innerHTML=`<span>✅ ${E(DEMO[i][0].split(' ')[0])} paid ₹${DEMO[i][3].toLocaleString('en-IN')} by UPI</span>`;r.classList.remove('pop');await wait(380)}
const rc=rg.getBoundingClientRect();confetti(rc.left+rc.width/2,rc.top+rc.height/2,130);SND.play('success');wa.innerHTML='<span>🎉 All ₹67,000 collected. No chasing.</span>';btn.textContent='↻ Replay';delete btn.dataset.busy})()}

/* ============================ Auth ============================ */
const pwScore7=p=>{let s=0;if(p.length>=8)s++;if(p.length>=12)s++;if(/[a-z]/.test(p)&&/[A-Z]/.test(p))s++;if(/\d/.test(p)&&/[^\w]/.test(p)||(/\d/.test(p)&&p.length>=10))s++;return Math.min(s,4)};
const TIPS=['📲 Tenants pay by UPI. You get paid straight to your account.','💬 One tap reminds every overdue tenant on WhatsApp.','📈 See profit by property, month by month.','⚡ Works offline and syncs when you are back.'];
const sky=()=>{let b='',w='';const H=[38,62,48,80,54,70,44,88,58,66,40,74];H.forEach((h,i)=>{const x=i*50,top=140-h*1.4;b+=`<rect x="${x}" y="${top}" width="42" height="${h*1.4+10}" fill="#fff" fill-opacity="${.12+(i%3)*.05}"/>`;for(let r=0;r<Math.floor(h/14);r++)for(let c=0;c<2;c++)if((i*7+r*3+c)%3)w+=`<rect class="w" x="${x+8+c*18}" y="${top+8+r*18}" width="8" height="9" rx="2" fill="#ffe9a6"/>`});return`<svg viewBox="0 0 600 150" preserveAspectRatio="xMidYMax slice">${b}${w}</svg>`};
function auth7(mode='in',msg=''){stopLanding();const up=mode=='up',iv=!!inviteP(),em=store('po-email')||'',reset=mode=='rs';
setGate('p7a',`<div class="p7aur" style="opacity:.5"><i></i><i></i><i></i></div><div class="p7au"><section class="p7ar"><div class="br7">${LOGO7}PropertyOS</div><div class="big7"><h2>${up?'Your rent day,<br>on autopilot.':'Welcome back.<br>Rent is waiting.'}</h2><p>${up?'Create a free workspace and send your first UPI rent QR in minutes.':'Pick up where you left off. Your properties, tenants and payments are in sync.'}</p><div class="p7tip" id="p7tip">${TIPS[0]}</div></div><div class="p7sky">${sky()}</div></section>
<section class="p7fm"><div class="top"><button class="p7-ico" data-p7="about" type="button" title="About" aria-label="About">${ICON.bldg}</button>${sndBtn()}</div>
<div class="g p7c" id="p7c">${reset?`<h1>Reset password</h1><p class="sb">Enter your email and we will send a reset link.</p>`:`<h1>${up?'Create your account':'Sign in'}</h1><p class="sb">${iv?'You were invited. Use the email your landlord invited.':up?'Start free. No card needed.':'Sign in to your workspace.'}</p>`}
${iv&&!reset?`<div class="p7iv">✉️ Invitation detected. Create an account or sign in to join.</div>`:''}
${reset?'':`<div class="p7seg ${up?'up':''}"><i></i><button type="button" data-p7="in" class="${up?'':'on'}">Sign in</button><button type="button" data-p7="up" class="${up?'on':''}">Create account</button></div>`}
<label class="p7fl" id="p7e"><input id="em" type="email" placeholder=" " autocomplete="email" inputmode="email" value="${E(em)}"><span>Email</span><b class="ok">${ICON.check}</b></label>
${reset?'<input id="pw" type="hidden" value="">':`<label class="p7fl" id="p7p"><input id="pw" type="password" placeholder=" " autocomplete="${up?'new-password':'current-password'}"><span>Password</span><button class="eye" type="button" data-p7="eye" aria-label="Show password">${ICON.eye}</button></label>
${up?'<div class="p7pw" id="p7pb"><i></i><i></i><i></i><i></i></div><div class="p7hint" id="p7ph2">Use 8+ characters. Longer is stronger.</div>':'<div class="p7hint" id="p7ph2"></div>'}`}
<p class="p7msg" id="gm" role="alert">${E(msg)}</p>
<button class="btn p7-btn p7go" id="p7go" data-p7="go2" type="button"><span class="sp7"></span><span id="p7gt">${reset?'Send reset link':up?'Create account':'Sign in'}</span></button>
<div class="lnk">${reset?`<a data-p7="in">← Back to sign in</a><span></span>`:`<a data-p7="rs">Forgot password?</a><a data-p7="about">About PropertyOS</a>`}</div></div></section></div>`);
const c=q('#p7c'),emI=q('#em'),pw=reset?null:q('#pw'),ok=v=>/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v);
emI.oninput=()=>{const f=q('#p7e');f.classList.toggle('good',ok(emI.value.trim()));f.classList.remove('bad')};emI.oninput();
if(pw){pw.oninput=()=>{q('#p7p').classList.remove('bad');const s=pwScore7(pw.value);if(up){qa('#p7pb i').forEach((b,i)=>b.style.background=i<s&&pw.value?['var(--er)','var(--wr)','var(--ok)','var(--ok)'][Math.max(s-1,0)]:'');q('#p7ph2').textContent=pw.value?['Too weak','Weak. Add length or numbers.','Okay','Strong','Excellent'][s]:'Use 8+ characters. Longer is stronger.'}};
pw.addEventListener('keyup',ev=>{if(ev.getModifierState&&ev.getModifierState('CapsLock')){const h=q('#p7ph2');h.innerHTML='<span class="p7caps">⇪ Caps Lock is on</span>'}else if(!up)q('#p7ph2').textContent=''})}
qa('#p7c input').forEach(i=>i.onkeydown=ev=>{if(ev.key=='Enter'){ev.preventDefault();q('#p7go').click()}});
(emI.value&&pw?pw:emI).focus({preventScroll:true});
/* rotating tips */
let ti=0;const tip=q('#p7tip');if(tip){const t=setInterval(()=>{if(!tip.isConnected)return clearInterval(t);tip.style.opacity=0;setTimeout(()=>{ti=(ti+1)%TIPS.length;tip.textContent=TIPS[ti];tip.style.opacity=1},380)},3600);LP.stop=[()=>clearInterval(t)]}
/* react to messages written by the original auth() through sm() */
const gm7=q('#gm');new MutationObserver(()=>{const t=gm7.textContent.trim();if(!t)return;const good=/check your email|reset email sent/i.test(t);gm7.classList.toggle('ok',good);if(good){SND.play('success');showSent(t,mode,em)}else{SND.play('error');c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake');(t.match(/email/i)?q('#p7e'):q('#p7p')||q('#p7e')).classList.add('bad')}}).observe(gm7,{childList:true,characterData:true,subtree:true})}
function showSent(t,mode,_em){const c=q('#p7c');if(!c)return;const email=E(($('#em')||{}).value||'');const reset=/reset/i.test(t);c.innerHTML=`<div class="p7env">${ICON.mail}</div><h1 style="text-align:center">Check your inbox</h1><p class="sb" style="text-align:center">${reset?'We sent a password reset link to':'We sent a verification link to'}<br><b style="color:var(--tx)">${email}</b>.<br>${reset?'Open it to choose a new password.':'Open it, then come back and sign in.'}</p><button class="btn p7-btn p7go" type="button" data-p7="in">Back to sign in</button>`;confetti(innerWidth/2,innerHeight*.3,70,.7)}
function farewell7(){stopLanding();setGate('p7a',`<div class="p7aur"><i></i><i></i><i></i></div><div class="p7fm" style="min-height:100%"><div class="p7c g" style="text-align:center"><div class="p7env" style="background:linear-gradient(145deg,#32d74b,#0fa63a)">${ICON.check.replace('18','44').replace('18','44')}</div><h1>You’re signed out</h1><p class="sb">Your data is safe and synced. See you soon 👋</p><button class="btn p7-btn p7go" data-p7="in">Sign back in</button><div class="lnk" style="justify-content:center"><a data-p7="about">About PropertyOS</a></div></div></div>`);SND.play('pop')}

async function doAuth(btn){const up=!!q('.p7seg.up'),reset=/Send reset/i.test(q('#p7gt').textContent),email=q('#em').value.trim(),pwv=q('#pw')?q('#pw').value:'';const c=q('#p7c'),bad=(el,m)=>{q('#gm').textContent='';q('#gm').textContent=m;q(el).classList.add('bad')};
store('po-seen','1');store('po-email',email);
if(!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email))return bad('#p7e','Enter a valid email address.');
if(!reset&&pwv.length<8)return bad('#p7p','Password must be at least 8 characters.');
btn.classList.add('ld');btn.disabled=true;SND.play('tap');
try{await auth(reset?'rs':up?'up':'in')}finally{if(document.contains(btn)){btn.classList.remove('ld');btn.disabled=false}}}

/* ============================ Onboarding ============================ */
const OB={step:0,role:'owner',name:'',slug:'',touched:false,units:'',how:'',rev:false};
const slugify=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function onboard7(msg=''){stopLanding();OB.rev=false;obRender(msg)}
function obRender(msg=''){const s=OB.step,dots=`<div class="p7dots">${[0,1,2].map(i=>`<i class="${i<=s?'on':''}"></i>`).join('')}</div>`;let body='';
if(s==0)body=`<h1>Welcome 👋 Who are you?</h1><p class="sb">This takes about 30 seconds.</p>
<button class="p7opt ${OB.role=='owner'?'on':''}" data-p7="role" data-v="owner"><span class="e">🏠</span><div><b>I own rental properties</b><small>Collect rent, track leases and repairs</small></div></button>
<button class="p7opt ${OB.role=='mgr'?'on':''}" data-p7="role" data-v="mgr"><span class="e">🧑‍💼</span><div><b>I manage properties for others</b><small>Run several owners or buildings in one place</small></div></button>
<button class="p7opt ${OB.role=='ten'?'on':''}" data-p7="role" data-v="ten"><span class="e">🔑</span><div><b>I'm a tenant</b><small>My landlord sent me an invite</small></div></button>
${OB.role=='ten'?`<p class="p7msg" style="color:var(--tx);font-weight:500">Tenants join with an invite link. Ask your landlord to send it, then open the link while signed in with this account.</p>`:''}
<div class="p7nv">${OB.role=='ten'?`<button class="btn q" data-p7="so">Sign out</button>`:`<button class="btn p7-btn p7go" data-p7="next">Continue ${ICON.arrow}</button>`}</div>`;
if(s==1)body=`<h1>Name your workspace</h1><p class="sb">Properties, tenants and rent live here. You can rename it later.</p>
<label class="p7fl" id="p7n"><input id="on" placeholder=" " autocomplete="organization" value="${E(OB.name)}"><span>Business name</span></label>
<label class="p7fl" id="p7s"><input id="os" placeholder=" " value="${E(OB.slug)}"><span>Web address</span></label>
<div class="p7slug">🔗 <span>propertyos/<b id="p7sl">${E(OB.slug||'your-name')}</b></span></div><p class="p7msg" id="gm" role="alert">${E(msg)}</p>
<div class="p7nv"><button class="btn q" data-p7="prev">${ICON.back}</button><button class="btn p7-btn p7go" data-p7="next">Continue ${ICON.arrow}</button></div>`;
if(s==2)body=`<h1>A little about you</h1><p class="sb">Optional. Helps us suggest where to start.</p>
<span class="p7lab">How many units do you manage?</span><div class="p7chips" data-k="units">${['1–5','6–20','21–50','50+'].map(x=>`<button type="button" data-p7="chip" data-k="units" data-v="${x}" class="${OB.units==x?'on':''}">${x}</button>`).join('')}</div>
<span class="p7lab">How do you collect rent today?</span><div class="p7chips">${['Cash','UPI','Bank transfer','Mixed'].map(x=>`<button type="button" data-p7="chip" data-k="how" data-v="${x}" class="${OB.how==x?'on':''}">${x}</button>`).join('')}</div>
<p class="p7msg" id="gm" role="alert"></p><div class="p7nv"><button class="btn q" data-p7="prev">${ICON.back}</button><button class="btn p7-btn p7go" data-p7="make">Create my workspace ${ICON.arrow}</button></div>`;
if(s==3)body=`<div class="p7build"><div class="p7bld"><svg viewBox="0 0 120 120"><defs><linearGradient id="p7g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a84ff"/><stop offset="1" stop-color="#bf5af2"/></linearGradient></defs><circle class="t" cx="60" cy="60" r="52"/><circle class="p" id="p7bp" cx="60" cy="60" r="52"/></svg><div id="p7be">🏗️</div></div><h1>Building ${E(OB.name)}</h1><p class="sb">Hang tight, this only takes a moment.</p><ul class="p7bl" id="p7bl">${['Creating your workspace','Locking it down with row-level security','Wiring up the rent engine','Polishing the UPI QR studio'].map(x=>`<li><em>${ICON.check}</em>${x}</li>`).join('')}</ul><p class="p7msg" id="gm" role="alert"></p></div>`;
setGate('p7o',`<div class="p7aur"><i></i><i></i><i></i></div><div class="p7ob"><div class="g p7oc" id="p7c"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><b style="display:flex;align-items:center;gap:10px">${LOGO7}PropertyOS</b>${sndBtn()}</div>${dots}<div class="p7sw ${OB.rev?'rev':''}">${body}</div></div></div>`);
if(s==1){const on=q('#on'),os=q('#os');on.oninput=()=>{OB.name=on.value;if(!OB.touched){OB.slug=slugify(on.value);os.value=OB.slug}q('#p7sl').textContent=OB.slug||'your-name'};os.oninput=()=>{OB.touched=true;OB.slug=slugify(os.value);q('#p7sl').textContent=OB.slug||'your-name'};qa('#p7c input').forEach(i=>i.onkeydown=ev=>{if(ev.key=='Enter'){ev.preventDefault();q('[data-p7=next]').click()}});on.focus({preventScroll:true})}
if(s==3)buildWorkspace()}
async function buildWorkspace(){const li=qa('#p7bl li'),bp=q('#p7bp'),be=q('#p7be'),em=['🏗️','🔐','⚙️','📲'];const wait=ms=>new Promise(r=>setTimeout(r,RM?80:ms));
const call=Promise.resolve(sb.rpc('create_organization',{p_name:OB.name.trim(),p_slug:OB.slug}));let err=null;call.then(r=>{err=r&&r.error}).catch(e=>{err=e});
for(let i=0;i<li.length;i++){await wait(i==0?500:650);if(i==0)await call.catch(()=>{});if(err){break}li[i].classList.add('on');be.textContent=em[Math.min(i+1,3)];bp.style.strokeDashoffset=327-327*(i+1)/li.length;SND.play('tick');SND.play('pop')}
await call.catch(()=>{});
if(err){const m=/duplicate|unique/i.test(err.message||'')?'That web address is taken. Try another.':(err.message||'Could not create your workspace.');OB.step=1;OB.rev=true;obRender(m);SND.play('error');const c=q('#p7c');c&&c.classList.add('shake');return}
store('po-new','1');store('po-prof',JSON.stringify({u:OB.units,h:OB.how,r:OB.role}));await wait(500);be.textContent='🎉';SND.play('fanfare');const r=q('.p7bld').getBoundingClientRect();confetti(r.left+r.width/2,r.top+r.height/2,150);await wait(1100);start()}

/* ============================ Welcome tour ============================ */
function maybeTour(){if(typeof ORG==='undefined'||!ORG||store('po-new')!=='1'||store('po-tour-'+ORG)==='1'||role=='tenant')return;if(q('.p7t'))return;const prof=safe(()=>JSON.parse(store('po-prof')||'{}'))||{};
const tipByHow={Cash:'You collect cash today. Record each payment as you receive it and PropertyOS keeps the statement.',UPI:'You already use UPI. Add your UPI ID and every charge gets its own QR.','Bank transfer':'Add your UPI ID too, so tenants can pay in a tap instead of a transfer.',Mixed:'Mix and match. Record cash, share UPI QR codes, all in one ledger.'};
const slides=[`<span class="em7">🎉</span><h2>${E(D.org||'Your workspace')} is live</h2><p>Nice work. Let's get your first rent collected in four quick steps.</p>`,
`<span class="em7">🗺️</span><h2>Your path to first payment</h2><ul class="p7tl"><li><i>1</i>Add a property and a unit</li><li><i>2</i>Add a tenant</li><li><i>3</i>Create a lease</li><li><i>4</i>Set your UPI ID, generate rent</li></ul>`,
`<span class="em7">📲</span><h2>${prof.u?`For ${E(prof.u)} units`:'Pro tip'}</h2><p>${E(tipByHow[prof.h]||'Set your UPI ID once, then every rent charge gets a scannable QR. Tenants pay from any UPI app.')}</p>`];
let i=0;const o=document.createElement('div');o.className='p7t';document.body.append(o);
const paint=()=>{o.innerHTML=`<div class="g p7tc"><div class="p7sw">${slides[i]}</div><div class="p7td">${slides.map((_,k)=>`<i class="${k==i?'on':''}"></i>`).join('')}</div><div class="p7nv"><button class="btn q" data-t="skip">Skip</button><button class="btn p7-btn" data-t="next">${i==slides.length-1?'Add my first property':'Next'}</button></div></div>`;if(i==0){confetti(innerWidth/2,innerHeight*.35,140);SND.play('fanfare')}else SND.play('pop')};
const done=to=>{store('po-tour-'+ORG,'1');store('po-new',null);o.remove();if(to){SND.play('success');safe(()=>go('props'))}};
o.onclick=ev=>{const b=ev.target.closest('[data-t]');if(!b)return;if(b.dataset.t=='skip')return done();if(i<slides.length-1){i++;paint()}else done(1)};paint()}

/* ============================ Router: wrap the existing hooks ============================ */
const _auth=authScreen;
authScreen=function(m=''){/* let the previous module decide (farewell / landing / form), then replace what it drew */
_auth(m);const g=gateEl();if(g.querySelector('.lpw')){return landing7()}
if(g.querySelector('#em')){const up=!!g.querySelector('.seg [data-ax=up].on');return auth7(inviteP()?'up':up?'up':'in',m)}
if(g.querySelector('.ax h1')&&/signed out/i.test(g.textContent))return farewell7()};
onboard=onboard7;
const _start=start;start=async function(){const g=gateEl();g&&g.classList.remove('lp','p7l','p7a','p7o');if(!S)stopLanding();const had=!!document.querySelector('#p7c');const r=await _start.apply(this,arguments);if(S&&had&&q('body.ready')){SND.play('whoosh')}safe(maybeTour);return r};
/* expose the listing loader of module 4 (it fills #lpC) */
/* click router */
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-p7]');if(!b)return;const k=b.dataset.p7;
if(k=='snd'){SND.set(!SND.on);return}
if(!b.matches('[data-p7=snd]'))SND.play('tap');
if(k=='in'||k=='up'){store('po-seen','1');if(b.dataset.boom)confetti(ev.clientX,ev.clientY,70,.8);const em=q('#em');if(em)store('po-email',em.value.trim());return auth7(k)}
if(k=='rs'){const em=q('#em');if(em)store('po-email',em.value.trim());return auth7('rs')}
if(k=='about'){store('po-seen','');return landing7()}
if(k=='eye'){const p=q('#pw'),sh=p.type=='password';p.type=sh?'text':'password';b.innerHTML=sh?ICON.eyeoff:ICON.eye;return}
if(k=='go2')return doAuth(b);
if(k=='go'){const t=q('#'+b.dataset.t);t&&t.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'});return}
if(k=='run')return runDemo(b);
if(k=='role'){OB.role=b.dataset.v;return obRender()}
if(k=='next'){if(OB.step==1){OB.name=q('#on').value;OB.slug=slugify(q('#os').value||OB.name);const m=OB.name.trim().length<2?'Enter your business name.':OB.slug.length<3?'Web address needs at least 3 letters or numbers.':'';if(m){q('#gm').textContent=m;SND.play('error');q('#p7c').classList.remove('shake');void q('#p7c').offsetWidth;q('#p7c').classList.add('shake');return}}OB.rev=false;OB.step++;return obRender()}
if(k=='prev'){OB.rev=true;OB.step=Math.max(0,OB.step-1);return obRender()}
if(k=='chip'){OB[b.dataset.k]=b.dataset.v;qa(`[data-p7=chip][data-k=${b.dataset.k}]`).forEach(x=>x.classList.toggle('on',x==b));return}
if(k=='make'){OB.rev=false;OB.step=3;return obRender()}
if(k=='so')return sb.auth.signOut()});
/* sound for the rest of the app (delegated, light) */
document.addEventListener('click',ev=>{if(q('#gate.p7l,#gate.p7a,#gate.p7o'))return;const t=ev.target.closest('.btn,.pill,nav.tb button,aside button,.row,[data-a]');if(!t)return;if(t.closest('[data-p7]'))return;SND.play('tap')},true);
/* toast -> sound */
const _toast=toast;toast=function(m){const s=String(m||'');if(/could not|failed|error|invalid|offline|not |missing|enter |must/i.test(s)&&!/saved|sent|added/i.test(s))SND.play('error');else if(/paid|received|recorded|payment/i.test(s))SND.play('coin');else if(/✓|saved|added|created|sent|copied|updated|done|installed|restored/i.test(s))SND.play('success');return _toast.apply(this,arguments)};

/* ============================ In-app polish ============================ */
function countUp(root){if(RM)return;qa('.k b,.xs b,.hero h1',root).forEach(el=>{if(el.dataset.cu||el.children.length)return;const t=el.textContent.trim(),m=t.match(/^([₹]?)([\d,]+(?:\.\d+)?)(.*)$/);if(!m)return;const to=parseFloat(m[2].replace(/,/g,''));if(!isFinite(to)||to<=0||to>1e10)return;el.dataset.cu=1;const dec=(m[2].split('.')[1]||'').length,t0=performance.now(),D=900;const f=now=>{const k=Math.min((now-t0)/D,1),e=1-Math.pow(1-k,3),v=to*e;el.textContent=m[1]+(dec?v.toFixed(dec):Math.round(v).toLocaleString(m[2].includes(',')||to>=1e5?'en-IN':'en')).toString()+m[3];if(k<1)requestAnimationFrame(f);else el.textContent=t};requestAnimationFrame(f)})}
function injectSnd(){const h=q('header');if(!h||h.querySelector('[data-p7=snd]'))return;const b=document.createElement('button');b.className='pill g p7-ico';b.dataset.p7='snd';b.type='button';b.style.padding='0';b.innerHTML=SND.on?ICON.vol:ICON.mute;b.setAttribute('aria-label','Sound');b.title='Sound';const a=q('#scbtn');a?a.before(b):h.append(b)}
const _render=render;render=function(){const r=_render.apply(this,arguments);safe(injectSnd);safe(()=>{const v=q('.v')||q('.app');countUp(v)});return r};
/* spotlight + ripple, delegated */
document.addEventListener('pointermove',ev=>{if(!FINE)return;const c=ev.target.closest&&ev.target.closest('.g.k,.row,.hero');if(!c)return;const r=c.getBoundingClientRect();c.style.setProperty('--mx',ev.clientX-r.left+'px');c.style.setProperty('--my',ev.clientY-r.top+'px')},{passive:true});
document.addEventListener('pointerdown',ev=>{if(RM)return;const b=ev.target.closest&&ev.target.closest('.btn:not(.q),.p7-btn');if(!b)return;const r=b.getBoundingClientRect(),s=Math.max(r.width,r.height)*2,i=document.createElement('i');i.className='p7rip';i.style.cssText=`width:${s}px;height:${s}px;left:${ev.clientX-r.left-s/2}px;top:${ev.clientY-r.top-s/2}px`;if(getComputedStyle(b).position=='static')b.style.position='relative';b.style.overflow='hidden';b.append(i);setTimeout(()=>i.remove(),650)},{passive:true});
paintSnd();
/* if the entrance was already drawn before this module loaded (slow script order), redraw it in the new design */
safe(()=>{const g=gateEl();if(g&&g.querySelector('.lpw'))landing7();else if(g&&g.querySelector('.ax #em'))authScreen()});
if(document.body.classList.contains('ready'))safe(render);
})();

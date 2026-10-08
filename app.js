const posts = [
{id:1,source:"DanielRPK",initials:"DR",time:"12m",category:"doomsday",tag:"DOOMSDAY",confidence:"high",text:"Hearing that Marvel has another major <strong>Avengers: Doomsday</strong> announcement planned around the next marketing push."},
{id:2,source:"ProjectHurts",initials:"PH",time:"28m",category:"doomsday",tag:"DOOMSDAY",confidence:"high",text:"New <strong>Doomsday</strong> material is reportedly moving internally. Take this one as a rumor for now, but the source is saying it is tied to the next promo cycle.",image:true},
{id:3,source:"Cryptic4KQual",initials:"CQ",time:"41m",category:"marvel",tag:"MARVEL",confidence:"medium",text:"Marvel is preparing more footage for upcoming promotional use. Details on where it will appear are still unclear."},
{id:4,source:"MyTimeToShineH",initials:"MT",time:"1h",category:"casting",tag:"CASTING",confidence:"medium",text:"A familiar MCU name is being discussed for a role connected to the next Avengers storyline."},
{id:5,source:"AlexFromCC",initials:"AC",time:"2h",category:"spiderman",tag:"SPIDER-MAN",confidence:"medium",text:"Some movement around the next <strong>Spider-Man</strong> project may become public sooner than expected."},
{id:6,source:"999salem",initials:"9S",time:"3h",category:"marvel",tag:"999 UPDATE",confidence:"high",text:"999 FEED is now tracking the latest Marvel scoop cycle in one place. More sources and categories coming soon."}
];

const feed=document.querySelector("#feed"),newLeaks=document.querySelector("#newLeaks"),newCount=document.querySelector("#newCount"),quiet=document.querySelector("#quiet"),backdrop=document.querySelector("#modalBackdrop"),modal=document.querySelector("#modal");
let activeFilter="all",pending=0;

function render(){
 const visible=posts.filter(p=>activeFilter==="all"||p.category===activeFilter);
 quiet.style.display=visible.length?"none":"flex";
 feed.innerHTML=visible.map((p,i)=>`
 <article class="post" data-id="${p.id}" style="animation-delay:${Math.min(i*55,250)}ms">
  <div class="post-frame">
   <div class="post-head">
    <div class="author"><div class="avatar">${p.initials}</div><div><div class="handle">@${p.source} <span class="xmark">𝕏</span></div><div class="time">${p.time} ago</div></div></div>
    <div class="tag">${p.tag}</div>
   </div>
   <div class="post-body">${p.text}</div>
   ${p.image?`<div class="post-image"><div class="fake-scene"></div></div>`:""}
   <div class="post-actions"><button data-open-post="${p.id}">♡</button><button data-open-post="${p.id}">↻</button><button data-open-post="${p.id}">↗</button><button data-open-post="${p.id}" style="margin-left:auto">•••</button></div>
   <div class="post-foot"><span class="confidence ${p.confidence}">${p.confidence==="high"?"Trusted source":"Unverified"}</span><span class="sep">·</span><span class="confidence">PUBLIC POST</span></div>
  </div>
 </article>`).join("");
}

function setFilter(filter){
 activeFilter=filter;
 document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.filter===filter));
 document.querySelectorAll(".drawer-grid button").forEach(b=>b.classList.toggle("active",b.dataset.filter===filter));
 render(); window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll(".nav-item,.drawer-grid button").forEach(b=>b.addEventListener("click",()=>setFilter(b.dataset.filter)));

function openPost(id){
 const p=posts.find(x=>x.id==id); if(!p)return;
 modal.innerHTML=`<button class="modal-close" data-close>×</button><div class="modal-kicker">${p.tag} · ${p.time} AGO</div><h2>Original post</h2><div class="profile-head"><div class="profile-avatar">${p.initials}</div><div><div class="profile-name">@${p.source} <span class="xmark">𝕏</span></div><div class="profile-meta">Tracked source · ${p.confidence==="high"?"HIGH SIGNAL":"MIXED SIGNAL"}</div></div></div><div class="modal-post">${p.text}</div>${p.image?`<div class="post-image" style="margin-top:20px"><div class="fake-scene"></div></div>`:""}<div class="post-foot"><span class="confidence ${p.confidence}">${p.confidence==="high"?"Trusted source":"Unverified"}</span><span class="sep">·</span><span class="confidence">ORIGINAL POST</span></div>`;
 backdrop.hidden=false;
}
function openProfile(source){
 const p=posts.find(x=>x.source===source)||posts[0];
 modal.innerHTML=`<button class="modal-close" data-close>×</button><div class="modal-kicker">SOURCE PROFILE</div><div class="profile-head"><div class="profile-avatar">${p.initials}</div><div><div class="profile-name">@${source} <span class="xmark">𝕏</span></div><div class="profile-meta">Tracked by 999 FEED</div></div></div><div class="profile-stats"><div class="stat"><b>${source==="DanielRPK"||source==="ProjectHurts"?"HIGH":"MIXED"}</b><span>SIGNAL</span></div><div class="stat"><b>${posts.filter(x=>x.source===source).length}</b><span>POSTS TRACKED</span></div><div class="stat"><b>—</b><span>CONFIRMED</span></div></div><div class="profile-source-list"><p>999 FEED tracks public posts from this source and does not treat individual rumors as confirmed facts.</p></div>`;
 backdrop.hidden=false;
}
backdrop.addEventListener("click",e=>{if(e.target===backdrop||e.target.matches("[data-close]"))backdrop.hidden=true});
feed.addEventListener("click",e=>{const b=e.target.closest("[data-open-post]");if(b)openPost(b.dataset.openPost)});
document.querySelectorAll(".source").forEach(b=>b.addEventListener("click",()=>openProfile(b.dataset.source)));

newLeaks.addEventListener("click",()=>{
 const templates=[
  {source:"DanielRPK",initials:"DR",category:"doomsday",tag:"BREAKING",confidence:"high",text:"New information is starting to circulate regarding <strong>Avengers: Doomsday</strong>. Details are still developing."},
  {source:"ProjectHurts",initials:"PH",category:"doomsday",tag:"DOOMSDAY",confidence:"high",text:"Another piece of the current <strong>Doomsday</strong> leak cycle is making the rounds."},
  {source:"Cryptic4KQual",initials:"CQ",category:"marvel",tag:"MARVEL",confidence:"medium",text:"More Marvel promotional material is reportedly in motion."}
 ];
 for(let i=0;i<pending;i++){const t=templates[i%templates.length];posts.unshift({id:Date.now()+i,...t,time:"now"})}
 pending=0;newLeaks.hidden=true;render();document.querySelector("#lastUpdate").textContent="just now";window.scrollTo({top:0,behavior:"smooth"});
});

setInterval(()=>{if(document.hidden)return;pending=Math.min(pending+1,3);newCount.textContent=pending;newLeaks.hidden=false;document.querySelector("#postsToday").textContent=24+pending;},22000);

document.querySelectorAll("[data-salem-trigger]").forEach(el=>el.addEventListener("click",()=>{
 const cat=el.querySelector(".pixel-salem"); if(cat){cat.classList.remove("react");void cat.offsetWidth;cat.classList.add("react")}
}));
document.addEventListener("click",e=>{if(e.target.closest(".post-frame")===null)return});
render();

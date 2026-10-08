const SOURCE_HANDLES = [
  "DanielRPK", "ProjectHurts", "MyTimeToShineH", "Cryptic4KQual",
  "AlexFromCC", "CanWeGetToast", "SpiderMan_Newz",
  "MyCosmicCircus", "ViewerAnon", "bigscreenleaks", "OneTakeNews",
  "_CharlesMurphy", "TheComixKid", "Atlanta_Filming", "TheDirect",
  "GeekVibesNation", "Cinestealth", "sm_leak"
];

const SOURCE_META = {
  DanielRPK:{signal:"high", label:"High signal", type:"SCOOPER"},
  ProjectHurts:{signal:"high", label:"High signal", type:"SCOOPER"},
  MyTimeToShineH:{signal:"medium", label:"Mixed signal", type:"SCOOPER"},
  Cryptic4KQual:{signal:"medium", label:"Mixed signal", type:"SCOOPER"},
  AlexFromCC:{signal:"medium", label:"Reported scoops", type:"SCOOPER"},
  CanWeGetToast:{signal:"medium", label:"Reported scoops", type:"SCOOPER"},
  SpiderMan_Newz:{signal:"medium", label:"Niche source", type:"SPIDER-MAN"},
  MyCosmicCircus:{signal:"high", label:"High signal", type:"OUTLET / SCOOPER"},
  ViewerAnon:{signal:"high", label:"High signal", type:"INDUSTRY SCOOPER"},
  bigscreenleaks:{signal:"high", label:"Established source", type:"SCOOPER"},
  OneTakeNews:{signal:"high", label:"Established outlet", type:"NEWS / SCOOPS"},
  _CharlesMurphy:{signal:"high", label:"Established source", type:"INDUSTRY SCOOPER"},
  TheComixKid:{signal:"medium", label:"Mixed signal", type:"SCOOPER"},
  Atlanta_Filming:{signal:"high", label:"Production source", type:"SET / PRODUCTION"},
  TheDirect:{signal:"medium", label:"News / scoops", type:"OUTLET"},
  GeekVibesNation:{signal:"medium", label:"News / scoops", type:"OUTLET"},
  Cinestealth:{signal:"low", label:"Watchlist", type:"RUMOR"},
  sm_leak:{signal:"low", label:"Watchlist", type:"RUMOR"}
};

const REFRESH_MS = 90_000;
const API_BASE = "https://api.fxtwitter.com/2/profile";
const MAX_POSTS = 60;

let posts = [];
let activeFilter = "all";
let pending = 0;
let lastSuccessfulFetch = null;
let fetchInFlight = false;

const feed = document.querySelector("#feed");
const newLeaks = document.querySelector("#newLeaks");
const newCount = document.querySelector("#newCount");
const quiet = document.querySelector("#quiet");
const backdrop = document.querySelector("#modalBackdrop");
const modal = document.querySelector("#modal");
const liveAge = document.querySelector("#liveAge");
const lastUpdate = document.querySelector("#lastUpdate");
const postsToday = document.querySelector("#postsToday");
const sourcesOnline = document.querySelector("#sourcesOnline");

const CATEGORY_RULES = [
  {key:"doomsday", tag:"DOOMSDAY", words:["doomsday","avengers","secret wars","latveria","doctor doom","captain america","robert downey","fantastic four"]},
  {key:"spiderman", tag:"SPIDER-MAN", words:["spider-man","spiderman","peter parker","tom holland","zendaya","brand new day"]},
  {key:"xmen", tag:"X-MEN", words:["x-men","xmen","mutant","mutants","cyclops","jean grey","rogue","angel","gambit","beast","wolverine"]},
  {key:"casting", tag:"CASTING", words:["cast","casting","casted","joins","joined","in talks","role","playing","signs on"]},
  {key:"movies", tag:"MOVIES", words:["marvel","mcu","marvel studios","movie","film","trailer","production","filming","release"]}
];

function escapeHTML(value=""){
  return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
}

function linkify(text=""){
  const safe = escapeHTML(text);
  return safe.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

const MARVEL_SIGNALS = [
  "marvel", "mcu", "marvel studios", "avengers", "doomsday", "secret wars", "doctor doom", "latveria",
  "fantastic four", "fantastic 4", "spider-man", "spiderman", "peter parker", "miles morales", "tom holland",
  "zendaya", "x-men", "xmen", "mutant", "mutants", "wolverine", "deadpool", "ryan reynolds", "hugh jackman",
  "daredevil", "punisher", "echo", "kingpin", "blade", "thunderbolts", "thunderbolts*", "captain america",
  "sam wilson", "brave new world", "iron man", "tony stark", "robert downey", "thor", "loki", "hulk",
  "bruce banner", "she-hulk", "black panther", "wakanda", "shang-chi", "doctor strange", "wanda", "vision",
  "fantastic four", "galactus", "silver surfer", "kang", "young avengers", "midnight sons", "armor wars",
  "nova", "blade", "moon knight", "ms. marvel", "kamala khan", "captain marvel", "monica rambeau", "sentry",
  "what if", "zombies", "agatha", "ironheart", "wonder man", "vision quest", "born again", "brand new day"
];

const DC_SIGNALS = [
  "dcu", "dc universe", "dc studios", "james gunn", "superman", "batman", "wonder woman", "justice league",
  "brave and the bold", "supergirl", "lanterns", "green lantern", "peacemaker", "creature commandos", "swamp thing",
  "booster gold", "the authority", "clayface", "blue beetle", "aquaman", "shazam", "joker", "harley quinn",
  "the penguin", "gotham", "lex luthor", "lois lane", "metropolis", "brainiac", "darkseid", "flash", "cyborg",
  "green arrow", "black canary", "constantine", "teen titans"
];

function hasTerm(text, term){
  const lower=text.toLowerCase();
  return lower.includes(term.toLowerCase());
}

function isMarvelRelevant(text, source=""){
  const lower=text.toLowerCase();
  const marvelHits=MARVEL_SIGNALS.filter(x=>lower.includes(x)).length;
  const dcHits=DC_SIGNALS.filter(x=>lower.includes(x)).length;

  // Strong Marvel signal always wins unless the post is overwhelmingly DC-only.
  if(marvelHits >= 1 && dcHits === 0) return true;
  if(marvelHits >= 2 && marvelHits >= dcHits) return true;

  // A source can post a vague Marvel scoop without naming a character.
  // Keep only clearly Marvel-coded production/casting language when paired with a known Marvel project term.
  if((hasTerm(lower,"casting") || hasTerm(lower,"cast") || hasTerm(lower,"filming") || hasTerm(lower,"production") || hasTerm(lower,"trailer")) && marvelHits >= 1 && marvelHits >= dcHits) return true;

  // Explicit DC-only posts are rejected.
  if(dcHits > 0 && marvelHits === 0) return false;
  return false;
}

function classify(text=""){
  const lower = text.toLowerCase();
  for(const rule of CATEGORY_RULES){
    if(rule.words.some(word => lower.includes(word))) return {category:rule.key, tag:rule.tag};
  }
  return null;
}

function relativeTime(epoch){
  const seconds = Math.max(0, Math.floor(Date.now()/1000 - Number(epoch||0)));
  if(seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds/60);
  if(minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes/60);
  if(hours < 24) return `${hours}h`;
  const days = Math.floor(hours/24);
  return `${days}d`;
}

function initials(handle){
  const clean = handle.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return (clean.slice(0,2) || "99");
}

function sourceSignal(handle){
  return SOURCE_META[handle]?.signal || "medium";
}

function mediaFor(status){
  const photos = status?.media?.photos || [];
  if(photos[0]?.url) return {type:"image", url:photos[0].url, alt:photos[0].altText || "Post image"};
  const all = status?.media?.all || [];
  const first = all[0];
  if(first?.type === "photo" && first.url) return {type:"image", url:first.url, alt:first.altText || "Post image"};
  if(first?.thumbnail_url) return {type:"image", url:first.thumbnail_url, alt:"Post media"};
  return null;
}

function normalize(status, handle){
  if(!status || status.type === "tombstone") return null;
  const text = (status.text || "").trim();
  if(!text) return null;
  if(!isMarvelRelevant(text, handle)) return null;
  const classification = classify(text);
  if(!classification) return null;
  return {
    id:String(status.id),
    source:status.author?.screen_name || handle,
    name:status.author?.name || handle,
    initials:initials(status.author?.screen_name || handle),
    category:classification.category,
    tag:classification.tag,
    confidence:sourceSignal(handle),
    sourceType:SOURCE_META[handle]?.type || "SOURCE",
    text,
    time:relativeTime(status.created_timestamp),
    epoch:Number(status.created_timestamp||0),
    url:status.url || `https://x.com/${handle}/status/${status.id}`,
    media:mediaFor(status),
    likes:Number(status.likes||0),
    reposts:Number(status.reposts||0),
    replies:Number(status.replies||0)
  };
}

async function fetchSource(handle){
  const response = await fetch(`${API_BASE}/${encodeURIComponent(handle)}/statuses`, {
    headers:{"Accept":"application/json"},
    cache:"no-store"
  });
  if(!response.ok) throw new Error(`${handle}: HTTP ${response.status}`);
  const data = await response.json();
  if(!Array.isArray(data.results)) throw new Error(`${handle}: invalid response`);
  return data.results.map(item => normalize(item, handle)).filter(Boolean);
}

async function refreshLive(){
  if(fetchInFlight) return;
  fetchInFlight = true;
  liveAge.textContent = "UPDATING";
  try{
    const settled = await Promise.allSettled(SOURCE_HANDLES.map(fetchSource));
    const successful = settled.filter(x => x.status === "fulfilled");
    const incoming = successful.flatMap(x => x.value);
    const unique = new Map();
    incoming.sort((a,b) => b.epoch-a.epoch).forEach(p => { if(!unique.has(p.id)) unique.set(p.id,p); });
    const next = Array.from(unique.values()).slice(0, MAX_POSTS);

    if(next.length){
      const previousIds = new Set(posts.map(p => p.id));
      const fresh = next.filter(p => !previousIds.has(p.id));
      posts = next;
      if(fresh.length && lastSuccessfulFetch){
        pending = Math.min(pending + fresh.length, 9);
        newCount.textContent = pending;
        newLeaks.hidden = false;
      }
      lastSuccessfulFetch = Date.now();
      sourcesOnline.textContent = String(successful.length).padStart(2,"0");
      postsToday.textContent = String(posts.length).padStart(2,"0");
      lastUpdate.textContent = "just now";
      liveAge.textContent = "LIVE DATA";
      render();
    } else {
      throw new Error("No relevant public posts returned");
    }
  } catch(error){
    console.warn("999 FEED live refresh failed", error);
    liveAge.textContent = lastSuccessfulFetch ? "LAST GOOD DATA" : "OFFLINE";
    lastUpdate.textContent = lastSuccessfulFetch ? "previous data" : "connection failed";
    if(!posts.length) renderError();
  } finally {
    fetchInFlight = false;
  }
}

function render(){
  const visible = posts.filter(p => activeFilter === "all" || p.category === activeFilter);
  quiet.style.display = visible.length ? "none" : "flex";
  feed.innerHTML = visible.map((p,i)=>`
    <article class="post" data-id="${escapeHTML(p.id)}" style="animation-delay:${Math.min(i*35,220)}ms">
      <div class="post-frame">
        <div class="post-head">
          <div class="author"><div class="avatar">${escapeHTML(p.initials)}</div><div><div class="handle">@${escapeHTML(p.source)} <span class="xmark">𝕏</span></div><div class="time">${escapeHTML(p.time)} ago</div></div></div>
          <div class="tag">${escapeHTML(p.tag)}</div>
        </div>
        <div class="post-body">${linkify(p.text)}</div>
        ${p.media ? `<a class="post-image live-media" href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHTML(p.media.url)}" alt="${escapeHTML(p.media.alt)}" loading="lazy"></a>` : ""}
        <div class="post-actions"><button type="button" data-open-post="${escapeHTML(p.id)}">♡</button><button type="button" data-open-post="${escapeHTML(p.id)}">↻</button><a href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer">↗</a><button type="button" data-open-post="${escapeHTML(p.id)}" style="margin-left:auto">•••</button></div>
        <div class="post-foot"><span class="confidence ${p.confidence}">${escapeHTML(SOURCE_META[p.source]?.label || "Tracked source")}</span><span class="sep">·</span><span class="confidence">${escapeHTML(p.sourceType || "SOURCE")}</span><span class="sep">·</span><span class="confidence">PUBLIC POST</span></div>
      </div>
    </article>`).join("");
}

function renderError(){
  quiet.style.display="none";
  feed.innerHTML=`<div class="connection-card"><div class="eyebrow"><span></span> LIVE CONNECTION</div><h2>Waiting for public posts…</h2><p>999 FEED could not reach the live X data source. The site will retry automatically in 90 seconds.</p><button type="button" id="retryLive">TRY NOW</button></div>`;
  document.querySelector("#retryLive")?.addEventListener("click", refreshLive);
}

function setFilter(filter){
  activeFilter=filter;
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.filter===filter));
  document.querySelectorAll(".drawer-grid button").forEach(b=>b.classList.toggle("active",b.dataset.filter===filter));
  render();
  window.scrollTo({top:0,behavior:"smooth"});
}

document.querySelectorAll(".nav-item,.drawer-grid button").forEach(b=>b.addEventListener("click",()=>setFilter(b.dataset.filter)));

function openPost(id){
  const p=posts.find(x=>x.id==id); if(!p)return;
  modal.innerHTML=`<button class="modal-close" data-close>×</button><div class="modal-kicker">${escapeHTML(p.tag)} · ${escapeHTML(p.time)} AGO</div><h2>Original public post</h2><div class="profile-head"><div class="profile-avatar">${escapeHTML(p.initials)}</div><div><div class="profile-name">@${escapeHTML(p.source)} <span class="xmark">𝕏</span></div><div class="profile-meta">Tracked by 999 FEED · live source</div></div></div><div class="modal-post">${linkify(p.text)}</div>${p.media?`<img class="modal-live-image" src="${escapeHTML(p.media.url)}" alt="${escapeHTML(p.media.alt)}">`:""}<div class="post-foot"><span class="confidence ${p.confidence}">PUBLIC SOURCE</span><span class="sep">·</span><a href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer">OPEN ON X ↗</a></div>`;
  backdrop.hidden=false;
}

function openProfile(source){
  const sourcePosts=posts.filter(x=>x.source===source);
  const p=sourcePosts[0] || {initials:initials(source)};
  modal.innerHTML=`<button class="modal-close" data-close>×</button><div class="modal-kicker">SOURCE PROFILE</div><div class="profile-head"><div class="profile-avatar">${escapeHTML(p.initials)}</div><div><div class="profile-name">@${escapeHTML(source)} <span class="xmark">𝕏</span></div><div class="profile-meta">${escapeHTML(SOURCE_META[source]?.type || "SOURCE")} · ${escapeHTML(SOURCE_META[source]?.label || "Tracked source")} · tracked by 999 FEED</div></div></div><div class="profile-stats"><div class="stat"><b>${sourcePosts.length}</b><span>POSTS LOADED</span></div><div class="stat"><b>${sourcePosts.filter(x=>x.category==="doomsday").length}</b><span>DOOMSDAY</span></div><div class="stat"><b>${sourcePosts.filter(x=>x.category==="spiderman").length}</b><span>SPIDER-MAN</span></div></div><div class="profile-source-list"><p>999 FEED reads public posts and categorizes them for this feed. A post appearing here is not the same thing as the claim being confirmed.</p></div>`;
  backdrop.hidden=false;
}

backdrop.addEventListener("click",e=>{if(e.target===backdrop||e.target.matches("[data-close]"))backdrop.hidden=true});
feed.addEventListener("click",e=>{const b=e.target.closest("[data-open-post]");if(b)openPost(b.dataset.openPost)});
document.querySelectorAll(".source").forEach(b=>b.addEventListener("click",()=>openProfile(b.dataset.source)));

newLeaks.addEventListener("click",()=>{
  pending=0;newCount.textContent="0";newLeaks.hidden=true;
  render();window.scrollTo({top:0,behavior:"smooth"});
});

document.querySelectorAll("[data-salem-trigger]").forEach(el=>el.addEventListener("click",()=>{
  const cat=el.querySelector(".salem-cat");
  if(cat){cat.classList.remove("react");void cat.offsetWidth;cat.classList.add("react")}
}));

const drawer=document.querySelector("#mobileDrawer");
const nav=document.querySelector(".nav");
if(drawer && nav && window.matchMedia("(max-width:850px)").matches){
  let startY=0;
  nav.addEventListener("touchstart",e=>{startY=e.touches[0].clientY},{passive:true});
  nav.addEventListener("touchend",e=>{if(startY-e.changedTouches[0].clientY>35)drawer.classList.add("open")},{passive:true});
  drawer.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>drawer.classList.remove("open")));
}

setInterval(()=>{
  if(lastSuccessfulFetch) liveAge.textContent = `${Math.floor((Date.now()-lastSuccessfulFetch)/1000)}s AGO`;
},1000);

setInterval(refreshLive, REFRESH_MS);
newLeaks.hidden=true;
renderError();
refreshLive();

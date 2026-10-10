(() => {
  "use strict";
  const catalog = Array.isArray(window.SCHOOLBAGS) ? window.SCHOOLBAGS.filter(x => x.image) : [];
  const byId = Object.fromEntries(catalog.map(x => [x.id, x]));
  const storageKey = "schulranzen-duell-2026-2027-v1";
  const $ = id => document.getElementById(id);
  let state = null, history = [];
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(storageKey) || "null"); } catch (_) {}
  if (saved && saved.state && saved.state.medals && saved.state.losses) {
    state = saved.state;
    history = saved.history || [];
  }
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify({state,history})); } catch (_) {}
  }
  function filterList() {
    const years = new Set(["2026","2027"].filter(y => $("y"+y).checked));
    const brands = new Set([$("berg").checked && "Beckmann", $("ergo").checked && "ergobag"].filter(Boolean));
    return catalog.filter(x => years.has(x.year) && brands.has(x.brand));
  }
  function refreshCounter() {
    const filtered = filterList();
    $("catalog-count").textContent = catalog.length + " Designs · 2026 + 2027";
    $("filter-count").textContent = filtered.length + " Designs für die Auswahl";
    $("start-btn").disabled = filtered.length < 3;
  }
  function startNew() {
    const options = filterList();
    if (options.length < 3) return;
    history = [];
    state = DuelEngine.create(options.map(x => x.id));
    persist();render();
  }
  function undo() {
    if (!history.length) return;
    state = JSON.parse(history.pop());persist();render();
  }
  function vote(slot) {
    if (!state || state.stage === "done") return;
    const pair = DuelEngine.pair(state);
    if (!pair) return;
    const swapped = state.votes % 2 === 1;
    const winner = slot === "left" ? (swapped ? pair[1] : pair[0]) : (swapped ? pair[0] : pair[1]);
    history.push(JSON.stringify(state));
    DuelEngine.decide(state,winner);
    persist();render();
  }
  function setupPicture(side,bag) {
    const img = $("photo-"+side), bad = $("error-"+side), link = $("link-"+side);
    img.style.display = ""; bad.classList.add("hidden");
    img.alt = bag.brand + " " + bag.model + " " + bag.name;
    img.onerror = () => {img.style.display="none";bad.classList.remove("hidden");};
    img.src = bag.image;
    link.href = bag.url || bag.image;
    $("name-"+side).textContent = bag.name;
    $("meta-"+side).textContent = bag.brand + " · " + (bag.variants || [bag.model]).join(" / ") + " · " + bag.year;
  }
  function renderResult() {
    const medals = [state.medals.first,state.medals.second,state.medals.third];
    const grid=$("top-three"); grid.replaceChildren();
    medals.forEach((id,index) => {
      const bag=byId[id]; if (!bag) return;
      const card=document.createElement("article"); card.className="medal";
      const rank=document.createElement("div");rank.className="rank";rank.textContent=["🥇 1. Platz","🥈 2. Platz","🥉 3. Platz"][index];
      const picture=document.createElement("img");picture.src=bag.image;picture.alt=bag.name;
      const name=document.createElement("h2");name.textContent=bag.name;
      const meta=document.createElement("p");meta.textContent=bag.brand+" "+bag.model+" · "+bag.year;
      card.append(rank,picture,name,meta);grid.appendChild(card);
    });
    $("copy-status").textContent = "Deine Auswahl wird in diesem Browser gespeichert.";
  }
  function render() {
    const intro=!state,done=Boolean(state && state.stage==="done");
    $("start-screen").classList.toggle("hidden",!intro);
    $("game-screen").classList.toggle("hidden",intro||done);
    $("results-screen").classList.toggle("hidden",!done);
    $("undo-btn").disabled = !history.length;
    $("resume-btn").classList.toggle("hidden",!state);
    if (intro) {refreshCounter(); return;}
    if (done) {renderResult();return;}
    const captions = {
      champion:["WER IST DER SCHÖNSTE?","Welcher gefällt dir besser?"],
      silver:["SPIEL UM PLATZ 2","Welcher soll Zweiter werden?"],
      bronze:["SPIEL UM PLATZ 3","Wer bekommt Bronze?"]
    };
    const c=captions[state.stage];
    $("round-label").textContent=c[0];
    $("round-title").textContent=c[1];
    const pair=DuelEngine.pair(state);
    const swapped=state.votes%2===1;
    const left=byId[swapped?pair[1]:pair[0]],right=byId[swapped?pair[0]:pair[1]];
    setupPicture("left",left);setupPicture("right",right);
    $("votes").textContent=state.votes+" Entscheidungen · "+
      (state.stage==="champion"?"Hauptrunde":state.stage==="silver"?"Silberrunde":"Bronzerunde");
  }
  function reset() {
    if (state && !confirm("Möchtest du alle bisherigen Ergebnisse löschen und neu starten?")) return;
    state=null;history=[];persist();render();
  }
  async function copyResults() {
    const ids=[state.medals.first,state.medals.second,state.medals.third];
    const text="Meine Schulranzen Top 3:\n"+ids.map((id,i)=>{
      const b=byId[id];return (i+1)+". "+b.brand+" "+b.model+" – "+b.name+" ("+b.year+")";
    }).join("\n");
    try {
      if (!navigator.clipboard) throw Error("Clipboard nicht verfügbar");
      await navigator.clipboard.writeText(text);
      $("copy-status").textContent="✓ Top 3 kopiert! Du kannst sie jetzt in einen Chat einfügen.";
    } catch (_) {
      $("copy-status").textContent=text;
    }
  }
  $("start-btn").addEventListener("click",startNew);
  $("resume-btn").addEventListener("click",render);
  $("pick-left").addEventListener("click",()=>vote("left"));
  $("pick-right").addEventListener("click",()=>vote("right"));
  ["link-left","link-right"].forEach(id=>$(id).addEventListener("click",e=>e.stopPropagation()));
  $("undo-btn").addEventListener("click",undo);
  $("reset-btn").addEventListener("click",reset);
  $("again-btn").addEventListener("click",reset);
  $("copy-btn").addEventListener("click",copyResults);
  $("print-btn").addEventListener("click",()=>window.print());
  $("full-btn").addEventListener("click",()=>{
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(()=>{});
  });
  for (const id of ["y2026","y2027","berg","ergo"]) $(id).addEventListener("change",refreshCounter);
  document.addEventListener("keydown",e=>{
    if (!state || state.stage==="done") return;
    if (e.key==="ArrowLeft" || e.key==="1"){e.preventDefault();vote("left");}
    if (e.key==="ArrowRight" || e.key==="2"){e.preventDefault();vote("right");}
    if ((e.key==="Backspace"||e.key==="z") && history.length){e.preventDefault();undo();}
  });
  if (state) { $("start-screen").classList.remove("hidden"); }
  render();
})();
(function (host) {
  "use strict";
  function shuffled(values) {
    const a = values.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function create(ids) {
    if (new Set(ids).size < 3) throw Error("Mindestens drei Designs wählen.");
    const s = { stage:"champion", round:shuffled([...new Set(ids)]),
      pending:[], offset:0, losses:{}, medals:{first:null,second:null,third:null}, votes:0 };
    for (const id of ids) s.losses[id] = [];
    return advance(s);
  }
  function advance(s) {
    let guard = 0;
    while (s.stage !== "done" && guard++ < 1000) {
      if (s.round.length === 1 && s.offset === 0 && s.pending.length === 0) {
        const winner = s.round[0];
        if (s.stage === "champion") {
          s.medals.first = winner;
          s.stage = "silver";
          s.round = shuffled(s.losses[winner]); s.offset = 0; s.pending = [];
        } else if (s.stage === "silver") {
          s.medals.second = winner;
          s.stage = "bronze";
          const ids = [...s.losses[s.medals.first].filter(id => id !== winner), ...s.losses[winner]];
          s.round = shuffled([...new Set(ids)]); s.offset = 0; s.pending = [];
        } else {
          s.medals.third = winner;
          s.stage = "done";
        }
        continue;
      }
      if (s.offset >= s.round.length) {
        s.round = s.pending; s.pending = []; s.offset = 0;
        continue;
      }
      if (s.offset === s.round.length - 1) {
        s.pending.push(s.round[s.offset]); s.offset += 1;
        continue;
      }
      break;
    }
    if (guard >= 1000) throw Error("Turnier konnte nicht abgeschlossen werden.");
    return s;
  }
  function pair(s) {
    if (s.stage === "done") return null;
    return [s.round[s.offset], s.round[s.offset + 1]];
  }
  function decide(s, winnerId) {
    const ids = pair(s);
    if (!ids || !ids.includes(winnerId)) throw Error("Ungültige Auswahl.");
    const loser = ids.find(id => id !== winnerId);
    s.losses[winnerId].push(loser);
    s.pending.push(winnerId);
    s.offset += 2;
    s.votes += 1;
    return advance(s);
  }
  const api = { create, decide, pair, advance };
  host.DuelEngine = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);

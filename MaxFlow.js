// maxflow network simulator
// reference: lesson 6 (network flow). edmonds-karp = ford-fulkerson, pero bfs ang gamit sa paghahanap ng path

// ---------- algorithm ----------

// bfs: hanapin ang shortest path na may natitira pang capacity
function bfs(res, n, s, t, parent, visited) {
  const queue = [s];
  visited[s] = true;
  parent[s] = -1;
  for (let q = 0; q < queue.length; q++) {
    const u = queue[q];
    for (let v = 0; v < n; v++) {
      if (!visited[v] && res[u][v] > 0) {   // check if may capacity pa ba?
        visited[v] = true;
        parent[v] = u;
        queue.push(v);
        if (v === t) return true;           // nakarating na sa sink
      }
    }
  }
  return false;   // wala nang augmenting path
}

function edmondsKarp(ns, es, src, snk, keep) {
  const n = ns.length;
  const id = new Map(ns.map((x, i) => [x.name, i]));   // node name -> index
  const s = id.get(src), t = id.get(snk);
  const none = { steps: [], maxFlow: 0, count: 0, flows: es.map(() => 0), reach: new Set() };
  if (s === undefined || t === undefined || s === t) return none;

  // capacity matrix, this rin ang residual graph (based sa lesson)
  const cap = Array.from({ length: n }, () => Array(n).fill(0));
  es.forEach(e => cap[id.get(e.from)][id.get(e.to)] += e.cap);
  const res = cap.map(row => row.slice());

  // flow ng edge u->v = original capacity - natitirang capacity
  const edgeFlows = () => es.map(e => {
    const u = id.get(e.from), v = id.get(e.to);
    return Math.max(0, cap[u][v] - res[u][v]);
  });

  const steps = [], parent = Array(n).fill(-1);
  let maxFlow = 0, count = 0, visited;

  while (true) {
    visited = Array(n).fill(false);
    if (!bfs(res, n, s, t, parent, visited)) break;   // kapag wala nang path, done na s'ya

    // bottleneck = pinakamaliit na residual capacity sa path
    let bottleneck = Infinity;
    for (let v = t; v !== s; v = parent[v]) bottleneck = Math.min(bottleneck, res[parent[v]][v]);

    // update: bawas sa forward, dagdag sa backward (para pwedeng ibalik ang flow)
    const path = [t];
    for (let v = t; v !== s; v = parent[v]) {
      const u = parent[v];
      res[u][v] -= bottleneck;
      res[v][u] += bottleneck;
      path.push(u);
    }
    path.reverse();
    maxFlow += bottleneck;
    count++;

    if (keep) {
      // hanapin kung anong edge ang dinaanan (backward = ibinalik ang flow)
      const edgeIdx = [], back = [];
      for (let k = 0; k < path.length - 1; k++) {
        const a = ns[path[k]].name, b = ns[path[k + 1]].name;
        const fwd = es.findIndex(e => e.from === a && e.to === b);
        edgeIdx.push(fwd >= 0 ? fwd : es.findIndex(e => e.from === b && e.to === a));
        back.push(fwd >= 0 ? 0 : 1);
      }
      steps.push({ nodes: path.map(i => ns[i].name), edgeIdx, back, bottleneck, total: maxFlow, flows: edgeFlows() });
    }
  }
  // reach = mga node na maaabot pa mula sa source (para sa min-cut)
  return { steps, maxFlow, count, flows: edgeFlows(), reach: new Set(ns.filter((x, i) => visited[i]).map(x => x.name)) };
}

// pinapatakbo nang maraming beses para mas accurate ang time
function timeRuns(ns, es, s, t, runs) {
  const t0 = performance.now();
  let r;
  for (let i = 0; i < runs; i++) r = edmondsKarp(ns, es, s, t, false);
  return { r, ms: (performance.now() - t0) / runs };
}

// ---------- test cases ----------
const mk = (ns, es, s, t, expected) => ({
  nodes: ns.map(([name, x, y]) => ({ name, x, y })),
  edges: es.map(([from, to, cap]) => ({ from, to, cap })),
  s, t, expected
});

function buildTest(name) {
  if (name === "small") {
    // nag-base lang me sa lesson, hihi (expected max flow = 5)
    return mk(
      [["S", 80, 260], ["A", 450, 100], ["B", 450, 420], ["T", 820, 260]],
      [["S", "A", 3], ["S", "B", 2], ["A", "B", 5], ["A", "T", 2], ["B", "T", 3]], "S", "T", 5);
  }
  if (name === "medium") {
    // 10 nodes, 18 edges
    return mk(
      [["S", 60, 260], ["A", 240, 110], ["B", 240, 260], ["C", 240, 410], ["D", 450, 110], ["E", 450, 260],
       ["F", 450, 410], ["G", 650, 185], ["H", 650, 335], ["T", 840, 260]],
      [["S", "A", 10], ["S", "B", 12], ["S", "C", 8], ["A", "D", 7], ["A", "E", 6], ["B", "D", 5],
       ["B", "E", 8], ["B", "F", 4], ["C", "E", 3], ["C", "F", 9], ["E", "F", 2], ["D", "G", 9],
       ["D", "H", 3], ["E", "G", 5], ["E", "H", 7], ["F", "H", 8], ["G", "T", 12], ["H", "T", 14]], "S", "T", 26);
  }
  // large: 5 layers x 6 nodes, random pero laging pareho ang outcome (seeded)
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const id = (k, j) => "N" + (k * 6 + j + 1);
  const ns = [["S", 50, 260]], es = [];
  for (let k = 0; k < 5; k++) for (let j = 0; j < 6; j++) ns.push([id(k, j), 170 + k * 140, 50 + j * 84]);
  ns.push(["T", 860, 260]);
  for (let j = 0; j < 6; j++) es.push(["S", id(0, j), 10 + Math.floor(rnd() * 20)]);
  for (let k = 0; k < 4; k++) for (let j = 0; j < 6; j++) {
    const opts = [j - 1, j, j + 1].filter(r => r >= 0 && r < 6);   // katabing row lang
    const a = opts.splice(Math.floor(rnd() * opts.length), 1)[0];
    const b = opts[Math.floor(rnd() * opts.length)];
    es.push([id(k, j), id(k + 1, a), 5 + Math.floor(rnd() * 26)]);
    es.push([id(k, j), id(k + 1, b), 5 + Math.floor(rnd() * 26)]);
  }
  for (let j = 0; j < 6; j++) es.push([id(4, j), "T", 10 + Math.floor(rnd() * 20)]);
  return mk(ns, es, "S", "T", 99);
}

const TEST_DESC = {
  small: "the network from the lecture.",
  medium: "three layers of nodes between S and T.",
  large: "five layers of six nodes each."
};

// ---------- ui ----------
const W = 900, H = 520, R = 22;       // size ng canvas at radius ng node
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

let nodes = [];     // {name, x, y}
let edges = [];     // {from, to, cap}
let result = null;  // resulta ng algorithm
let stepIdx = 0;    // ilang steps na ang nakita
let current = null; // {name, expected} kapag test case pa rin ang nasa canvas

const DEFS = `<defs>
  <marker id="ar-idle" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" fill="#6a6fa3"/></marker>
  <marker id="ar-flow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" fill="#e4e5ff"/></marker>
  <marker id="ar-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="14" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 0L10 5L0 10z" fill="#7f84f0"/></marker>
</defs>`;

function setMsg(text, bad) {
  const m = $("msg");
  m.textContent = text;
  m.className = "msg" + (bad ? " bad" : "");
  return false;   // return false, para pwedeng "return setMsg(...)"
}

function showPage(name) {
  document.documentElement.dataset.page = name;   // para sa home-only na background effect
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === "page-" + name));
  document.querySelectorAll(".nav-link").forEach(a => a.classList.toggle("current", a.dataset.page === name));
  window.scrollTo(0, 0);
}

// ----- graph input -----
function nameFor(i) { return i < 26 ? String.fromCharCode(65 + i) : "N" + (i + 1); }

function addNode() {
  let name = $("nodeName").value.trim();
  if (!name) {   // auto name: A, B, C...
    let i = 0;
    while (nodes.some(n => n.name === nameFor(i))) i++;
    name = nameFor(i);
  }
  if (nodes.some(n => n.name === name)) return setMsg("Node " + name + " already exists.", true);
  const k = nodes.length;
  nodes.push({ name, x: 90 + (k % 6) * 140, y: 90 + (Math.floor(k / 6) % 4) * 110 });
  $("nodeName").value = "";
  refresh();
}

function addEdge() {
  const from = $("edgeFrom").value, to = $("edgeTo").value, cap = Number($("edgeCap").value);
  if (!from || !to) return setMsg("Add at least two nodes first.", true);
  if (from === to) return setMsg("An edge must connect two different nodes.", true);
  if (!Number.isInteger(cap) || cap <= 0) return setMsg("Capacity must be a positive whole number.", true);
  const old = edges.find(e => e.from === from && e.to === to);
  if (old) old.cap = cap; else edges.push({ from, to, cap });   // kung existing na ang edge, capacity lang ang papalitan
  refresh();
}

function removeNode(i) {
  const name = nodes[i].name;
  nodes.splice(i, 1);
  edges = edges.filter(e => e.from !== name && e.to !== name);   // tanggalin din ang mga edge nito
  refresh();
}

function removeEdge(i) { edges.splice(i, 1); refresh(); }
function clearGraph() { nodes = []; edges = []; refresh(); }

function loadTest(name) {
  const t = buildTest(name);
  nodes = t.nodes; edges = t.edges;
  refresh();
  $("srcSel").value = t.s; $("snkSel").value = t.t;
  current = { name, expected: t.expected };
  render();
  $("testInfo").textContent = name[0].toUpperCase() + name.slice(1) + " test case (" + nodes.length + " nodes, " + edges.length +
    " edges): " + TEST_DESC[name] + " Source " + t.s + ", destination " + t.t + ". Expected maximum flow: " + t.expected + ".";
}

// ----- algorithm controls -----
function prepare() {
  const s = $("srcSel").value, t = $("snkSel").value;
  if (nodes.length < 2 || edges.length < 1) return setMsg("Add at least two nodes and one edge first.", true);
  if (s === t) return setMsg("Source and destination must be different nodes.", true);
  if (!result) {
    const run = timeRuns(nodes, edges, s, t, 200);
    result = edmondsKarp(nodes, edges, s, t, true);
    result.ms = run.ms;
    result.s = s; result.t = t;
    stepIdx = 0;
  }
  setMsg("");
  return true;
}

function stepOnce() { if (prepare()) { if (stepIdx < result.steps.length) stepIdx++; render(); } }
function runAll() { if (prepare()) { stepIdx = result.steps.length; render(); } }
function resetRun() { result = null; stepIdx = 0; render(); }

// kapag may binago sa graph, i-clear ang lumang result
function refresh() {
  result = null; stepIdx = 0; current = null;
  setMsg("");
  fillSelects(); drawLists(); render();
}

function render() { drawGraph(); drawLog(); drawResults(); drawStats(); }

// ----- drawing -----
function fillSelects() {
  ["edgeFrom", "edgeTo", "srcSel", "snkSel"].forEach(id => {
    const sel = $(id), old = sel.value;
    sel.innerHTML = nodes.map(n => `<option>${esc(n.name)}</option>`).join("");
    if (nodes.some(n => n.name === old)) sel.value = old;
    else if (id === "snkSel") sel.selectedIndex = nodes.length - 1;
    else if (id === "edgeTo" && nodes.length > 1) sel.selectedIndex = 1;
  });
}

function drawLists() {
  $("nodeChips").innerHTML = nodes.map((n, i) =>
    `<span class="chip">${esc(n.name)}<button title="Remove node" onclick="removeNode(${i})">×</button></span>`).join("")
    || `<span class="muted">No nodes yet.</span>`;
  $("edgeRows").innerHTML = edges.map((e, i) =>
    `<tr><td>${esc(e.from)} → ${esc(e.to)}</td><td>${e.cap}</td><td><button class="x" title="Remove edge" onclick="removeEdge(${i})">×</button></td></tr>`).join("")
    || `<tr><td colspan="3" class="muted">No edges yet.</td></tr>`;
}

function drawGraph() {
  const svg = $("graph");
  if (!nodes.length) {
    svg.innerHTML = `<text x="450" y="260" class="empty">Add nodes and edges, or load a test case.</text>`;
    return;
  }
  const step = result && stepIdx > 0 ? result.steps[stepIdx - 1] : null;
  const flows = step ? step.flows : [];
  const small = edges.length > 40 ? " small" : "";   // mas maliit na label kapag marami ang edges
  const src = $("srcSel").value, snk = $("snkSel").value;
  let html = DEFS;

  edges.forEach((e, i) => {
    const a = nodes.find(n => n.name === e.from), b = nodes.find(n => n.name === e.to);
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;        // direction at normal
    const twoWay = edges.some(o => o.from === e.to && o.to === e.from);   // may edge pabalik (two-way) = kurba
    const off = twoWay ? 8 : 0;
    const sx = a.x + ux * R + nx * off, sy = a.y + uy * R + ny * off;
    const ex = b.x - ux * (R + 3) + nx * off, ey = b.y - uy * (R + 3) + ny * off;
    let d, lx, ly;
    if (twoWay) {
      const cx = (sx + ex) / 2 + nx * 26, cy = (sy + ey) / 2 + ny * 26;
      d = `M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`;
      lx = 0.25 * sx + 0.5 * cx + 0.25 * ex + nx * 9; ly = 0.25 * sy + 0.5 * cy + 0.25 * ey + ny * 9;
    } else {
      d = `M${sx} ${sy} L${ex} ${ey}`;
      const t = small ? 0.32 : 0.5;   // kapag marami ang edges, ilapit ang label sa simula
      lx = sx + (ex - sx) * t + nx * 11; ly = sy + (ey - sy) * t + ny * 11;
    }
    const f = flows[i] || 0;
    const k = step ? step.edgeIdx.indexOf(i) : -1;    // kasama ba sa current path
    const cls = k >= 0 ? "active" + (step.back[k] ? " back" : "") : f > 0 ? "flow" : "";
    const mark = k >= 0 ? "ar-active" : f > 0 ? "ar-flow" : "ar-idle";
    html += `<path class="edge ${cls}" d="${d}" marker-end="url(#${mark})"/>`;
    html += `<text class="elabel${small}" x="${lx}" y="${ly + 4}">${result ? f + "/" : ""}${e.cap}</text>`;
  });

  nodes.forEach((n, i) => {
    const role = n.name === src ? "src" : n.name === snk ? "snk" : "";
    html += `<g class="node ${role}" data-i="${i}"><circle cx="${n.x}" cy="${n.y}" r="${R}"/>` +
            `<text x="${n.x}" y="${n.y}" style="font-size:${n.name.length > 3 ? 13 : 20}px">${esc(n.name)}</text></g>`;
  });
  svg.innerHTML = html;
}

function drawLog() {
  const box = $("logBox"), status = $("logStatus");
  if (!result) {
    box.innerHTML = `<p class="muted">Press Step or Run All to start the algorithm.</p>`;
    status.textContent = "";
    return;
  }
  const rows = result.steps.slice(0, stepIdx).map((s, k) => {
    const ups = s.edgeIdx.map((ei, j) => `${esc(edges[ei].from)}→${esc(edges[ei].to)} ${s.back[j] ? "−" : "+"}${s.bottleneck}`).join(", ");
    return `<tr class="${k === stepIdx - 1 ? "now" : ""}"><td>${k + 1}</td><td>${s.nodes.map(esc).join(" → ")}</td><td>${s.bottleneck}</td><td>${ups}</td><td>${s.total}</td></tr>`;
  }).join("");
  box.innerHTML = `<table><thead><tr><th>Step</th><th>Augmenting path (BFS)</th><th>Bottleneck</th><th>Flow updates</th><th>Total flow</th></tr></thead><tbody>${rows}</tbody></table>`;
  status.textContent = stepIdx === result.steps.length
    ? "No more augmenting path from " + result.s + " to " + result.t + ", so the algorithm stops."
    : stepIdx === 0 ? "Initial state: every edge has flow 0." : "Step " + stepIdx + " of " + result.steps.length + ".";
  const now = box.querySelector(".now");
  if (now) box.scrollTop = now.offsetTop - 40;   // i-scroll sa latest step
}

function drawResults() {
  const box = $("resultBox");
  if (!result || stepIdx !== result.steps.length) {
    box.innerHTML = `<p class="muted">Final results appear once the algorithm finishes.</p>`;
    return;
  }
  const fl = result.flows;

  // check sa 2 rules ng lesson: capacity constraint at conservation
  const capOk = edges.every((e, i) => fl[i] >= 0 && fl[i] <= e.cap);
  const consOk = nodes.every(n => {
    if (n.name === result.s || n.name === result.t) return true;   // hindi kasama ang S at T
    const inn = edges.reduce((a, e, i) => e.to === n.name ? a + fl[i] : a, 0);
    const out = edges.reduce((a, e, i) => e.from === n.name ? a + fl[i] : a, 0);
    return inn === out;
  });

  // max-flow min-cut: dapat pareho ang capacity ng cut at ang max flow
  const sSide = nodes.filter(n => result.reach.has(n.name)).map(n => n.name);
  const tSide = nodes.filter(n => !result.reach.has(n.name)).map(n => n.name);
  const cut = edges.filter(e => result.reach.has(e.from) && !result.reach.has(e.to)).reduce((a, e) => a + e.cap, 0);

  const rows = edges.map((e, i) =>
    `<tr><td>${esc(e.from)} → ${esc(e.to)}</td><td>${fl[i]}</td><td>${e.cap}</td><td>${fl[i] === e.cap ? "Saturated" : fl[i] > 0 ? "Partial" : "Unused"}</td></tr>`).join("");
  const expected = current ? `<li>Expected for the ${current.name} test case: ${current.expected}. ${current.expected === result.maxFlow ? "The result matches." : "The result does not match."}</li>` : "";

  box.innerHTML = `<div class="bigflow"><span>${result.maxFlow}</span> maximum flow from ${esc(result.s)} to ${esc(result.t)}</div>
    <ul class="checks">
      <li>Capacity constraint (0 ≤ f ≤ c): ${capOk ? "satisfied" : "violated"}.</li>
      <li>Conservation (flow in = flow out, except S and T): ${consOk ? "satisfied" : "violated"}.</li>
      <li>Min cut: {${sSide.map(esc).join(", ")}} | {${tSide.map(esc).join(", ")}} has capacity ${cut}, which ${cut === result.maxFlow ? "equals the maximum flow." : "does not equal the maximum flow."}</li>
      ${expected}
    </ul>
    <div class="scroll mid"><table><thead><tr><th>Edge</th><th>Flow</th><th>Capacity</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function drawStats() {
  $("stV").textContent = nodes.length;
  $("stE").textContent = edges.length;
  $("stAug").textContent = result ? stepIdx + " of " + result.steps.length : "-";
  $("stFlow").textContent = result && stepIdx === result.steps.length ? result.maxFlow : "-";
  $("stTime").textContent = result ? result.ms.toFixed(4) + " ms" : "-";
}

// ----- performance test (small, medium, large) -----
function runPerformance() {
  $("perfRows").innerHTML = ["small", "medium", "large"].map(name => {
    const t = buildTest(name);
    const run = timeRuns(t.nodes, t.edges, t.s, t.t, 200);
    return `<tr><td>${name}</td><td>${t.nodes.length}</td><td>${t.edges.length}</td><td>${run.r.count}</td><td>${run.r.maxFlow}</td><td>${run.ms.toFixed(4)}</td></tr>`;
  }).join("");
}

// ----- pag-drag ng node sa canvas -----
const svg = $("graph");
let dragging = null;
svg.addEventListener("pointerdown", e => {
  const g = e.target.closest("[data-i]");
  if (g) { dragging = nodes[g.dataset.i]; svg.setPointerCapture(e.pointerId); }
});
svg.addEventListener("pointermove", e => {
  if (!dragging) return;
  const r = svg.getBoundingClientRect();
  dragging.x = Math.max(R, Math.min(W - R, (e.clientX - r.left) * W / r.width));
  dragging.y = Math.max(R, Math.min(H - R, (e.clientY - r.top) * H / r.height));
  drawGraph();
});
svg.addEventListener("pointerup", () => dragging = null);

// ----- start -----
document.addEventListener("click", e => {
  const b = e.target.closest("a[data-page], button[data-page]");   // hindi kasama ang <html data-page>
  if (b) { e.preventDefault(); showPage(b.dataset.page); }
});
$("addNodeBtn").onclick = addNode;
$("addEdgeBtn").onclick = addEdge;
$("clearBtn").onclick = clearGraph;
$("stepBtn").onclick = stepOnce;
$("runBtn").onclick = runAll;
$("resetBtn").onclick = resetRun;
$("perfBtn").onclick = runPerformance;
$("srcSel").onchange = () => { current = null; resetRun(); };
$("snkSel").onchange = () => { current = null; resetRun(); };
document.querySelectorAll("[data-test]").forEach(b => b.onclick = () => loadTest(b.dataset.test));
$("nodeName").addEventListener("keydown", e => { if (e.key === "Enter") addNode(); });
$("edgeCap").addEventListener("keydown", e => { if (e.key === "Enter") addEdge(); });

refresh();   // walang laman pagbukas, naka-clear ang network
runPerformance();

// ----- ripple at glow kapag cinlick ang button -----
document.addEventListener("click", e => {
  const b = e.target.closest(".btn");
  if (!b) return;
  const r = b.getBoundingClientRect();
  const size = Math.max(r.width, r.height) * 2;
  const x = e.detail ? e.clientX - r.left : r.width / 2;    // keyboard click = gitna ng button
  const y = e.detail ? e.clientY - r.top : r.height / 2;
  const dot = document.createElement("span");
  dot.className = "ripple";
  dot.style.cssText = "width:" + size + "px;height:" + size + "px;left:" + (x - size / 2) + "px;top:" + (y - size / 2) + "px";
  b.appendChild(dot);
  b.classList.add("burst");
  setTimeout(() => { dot.remove(); b.classList.remove("burst"); }, 650);
});

// ----- background: mga node na dahan-dahang gumagalaw (home at about lang) -----
const bg = $("bgCanvas"), ctx = bg.getContext("2d");
const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;   // walang galaw kung ayaw ng motion
let dots = [];

function sizeBg() {
  bg.width = window.innerWidth;
  bg.height = window.innerHeight;
  const count = Math.round(bg.width * bg.height / 26000);   // mas malaki ang screen, mas maraming node
  dots = Array.from({ length: count }, () => ({
    x: Math.random() * bg.width, y: Math.random() * bg.height,
    vx: calm ? 0 : (Math.random() - .5) * .28, vy: calm ? 0 : (Math.random() - .5) * .28,
    r: 1 + Math.random() * 1.5
  }));
}

function drawBg() {
  requestAnimationFrame(drawBg);
  const page = document.documentElement.dataset.page;
  if (page !== "home" && page !== "about") return;   // huwag mag-draw sa simulator
  ctx.clearRect(0, 0, bg.width, bg.height);
  dots.forEach(d => {
    d.x += d.vx; d.y += d.vy;
    if (d.x < 0 || d.x > bg.width) d.vx *= -1;     // tumatalbog sa gilid
    if (d.y < 0 || d.y > bg.height) d.vy *= -1;
  });
  for (let i = 0; i < dots.length; i++) {
    for (let j = i + 1; j < dots.length; j++) {
      const dist = Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y);
      if (dist < 150) {                              // magkalapit = may linya
        ctx.strokeStyle = "rgba(127,132,240," + (0.2 * (1 - dist / 150)) + ")";
        ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y); ctx.stroke();
      }
    }
  }
  ctx.fillStyle = "rgba(190,194,255,.5)";
  dots.forEach(d => { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill(); });
}

sizeBg();
window.addEventListener("resize", sizeBg);
drawBg();

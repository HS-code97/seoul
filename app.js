/* ============ 홍대·연남 2박 3일 가족여행 — 앱 ============ */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get(k, d) { try { const v = localStorage.getItem("hy26:" + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("hy26:" + k, JSON.stringify(v)); } catch {} },
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // [글자](주소) → 링크
  const md = s => esc(s).replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const naver = q => "https://map.naver.com/p/search/" + encodeURIComponent(q);
  const TZ = "Asia/Seoul";
  const REGIONS = ["홍대", "연남", "망원", "신촌"];

  // 행 찾기 · 장소가 등장하는 행
  const ROW = {}, placeRows = {};
  DAYS.forEach((d, di) => d.rows.forEach(r => {
    ROW[r.id] = { ...r, di };
    (r.pins || []).forEach(k => (placeRows[k] ||= []).push(r.id));
  }));
  const typeOf = r => TYPES[r.type] || TYPES["선택"];
  const startOf = r => r.time.split("~")[0];
  const endOf = r => r.time.split("~")[1] || "";

  // 실시간 방문 기록 로드 (localStorage + data.js의 VISITS)
  if (typeof VISITS === "undefined") window.VISITS = [];
  const storedVisits = store.get("visits", []);
  if (storedVisits.length > 0) {
    VISITS.push(...storedVisits);
  }
  // 중복 제거 (같은 timestamp와 place의 조합)
  const seen = new Set();
  window.VISITS = VISITS.filter(v => {
    const key = `${v.timestamp}-${v.place}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  /* ---------- KST 날짜 ---------- */
  const kstDate = () => new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
  const kstHM = () => new Date().toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  const todayIndex = () => DAYS.findIndex(d => d.date === kstDate());
  const md2 = iso => `${+iso.slice(5, 7)}/${+iso.slice(8, 10)}`;

  /* ---------- 떨어지는 단풍 캔버스 ---------- */
  function leaves() {
    const cv = $("#leaves"), ctx = cv.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const COLORS = ["#e8743b", "#f2b632", "#c8553d", "#d98c3a", "#f4c95d"];
    let W, H, list = [], dpr = Math.min(devicePixelRatio || 1, 2), running = true;
    function resize() {
      W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = reduce ? 0 : Math.round(Math.min(34, W * H / 22000));
      list = Array.from({ length: n }, () => mk(true));
    }
    function mk(any) {
      const r = Math.random() * 5 + 4;
      return { x: Math.random() * W, y: any ? Math.random() * H : -20, r, s: r * .06 + .35, w: Math.random() * 7, a: Math.random() * 7, va: (Math.random() - .5) * .04,
        c: COLORS[Math.floor(Math.random() * COLORS.length)], o: Math.random() * .35 + .35 };
    }
    function leaf(f) {
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a); ctx.globalAlpha = f.o; ctx.fillStyle = f.c;
      ctx.beginPath(); ctx.moveTo(0, -f.r);
      ctx.quadraticCurveTo(f.r * .9, 0, 0, f.r); ctx.quadraticCurveTo(-f.r * .9, 0, 0, -f.r); ctx.fill();
      ctx.restore();
    }
    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (const f of list) {
        f.w += .012; f.y += f.s; f.x += Math.sin(f.w) * .6; f.a += f.va;
        if (f.y > H + 20) Object.assign(f, mk(false));
        leaf(f);
      }
      requestAnimationFrame(tick);
    }
    addEventListener("resize", resize);
    document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) tick(); });
    resize(); tick();
  }

  /* ---------- 카운트다운 ---------- */
  function countdown() {
    const el = $("#countdown"), start = new Date(TRIP.start), end = new Date(TRIP.end);
    const fabBtn = $("#logVisitBtn");
    function draw() {
      const now = new Date();
      if (now >= start && now <= end) {
        const d = DAYS[todayIndex()];
        el.innerHTML = `<div class="cd-msg">🍁 지금 여행 중! ${d ? `오늘은 ${d.label} · ${esc(d.title)}` : ""}</div>`;
        if (fabBtn.hidden) fabBtn.hidden = false;
        return;
      }
      if (now > end) { el.innerHTML = `<div class="cd-msg">📸 추억 저장 완료! 다음 여행에서 또 만나요.</div>`; return; }
      let s = Math.floor((start - now) / 1000);
      const d = Math.floor(s / 86400); s %= 86400;
      const h = Math.floor(s / 3600); s %= 3600;
      const m = Math.floor(s / 60);
      el.innerHTML = [[`D-${d}`, "DAYS"], [String(h).padStart(2, "0"), "HOURS"], [String(m).padStart(2, "0"), "MIN"]]
        .map(([v, l]) => `<div class="cd-box"><b>${v}</b><span>${l}</span></div>`).join("");
    }
    draw(); setInterval(draw, 30000);
  }

  /* ---------- 개요 ---------- */
  function overview() {
    $("#overview").innerHTML = `
      <h2 class="ov-title">한눈에 보는 3일</h2>
      <div class="ov-list">
        ${DAYS.map((d, i) => `
          <button class="ov-item" data-go="${i}">
            <div class="ov-date"><b>${+d.date.slice(8)}</b><small>10월 · ${d.dow}</small></div>
            <div class="ov-main"><b>${esc(d.title)}</b><span>${[...new Set(d.rows.map(r => r.area).filter(a => a !== "고속도로"))].join(" · ")}${d.holiday ? ` · ${d.holiday}` : ""}</span></div>
            <i class="ov-dot" style="background:${d.hue};color:${d.hue}"></i>
          </button>`).join("")}
      </div>
      <p class="ov-note">🏨 ${esc(TRIP.base)}<br>🚗 서울 안에서는 차를 호텔에 두고 도보·지하철<br>${esc(TRIP.intro)}</p>`;
    $$(".ov-item").forEach(b => b.onclick = () => { selectDay(+b.dataset.go); $("#daybarWrap").scrollIntoView({ behavior: "smooth" }); });
  }

  /* ---------- 일정 ---------- */
  let curDay = 0;
  function daybar() {
    const ti = todayIndex();
    $("#daybar").innerHTML = DAYS.map((d, i) => `
      <button class="day-chip" role="tab" data-i="${i}">
        <b style="color:${d.hue}">${d.label}${i === ti ? '<span class="today">TODAY</span>' : ""}</b>
        <span>10/${+d.date.slice(8)}</span><small>${d.dow}</small>
      </button>`).join("");
    $$(".day-chip").forEach(b => b.onclick = () => selectDay(+b.dataset.i));
  }
  function selectDay(i) {
    curDay = i;
    $$(".day-chip").forEach(b => { const on = +b.dataset.i === i; b.classList.toggle("active", on); b.setAttribute("aria-selected", on); });
    // 가로로만 가운데 맞춤 (세로 스크롤이 히어로를 건너뛰지 않게)
    const bar = $("#daybar"), chip = $(".day-chip.active");
    if (chip) bar.scrollTo({ left: chip.offsetLeft - (bar.clientWidth - chip.clientWidth) / 2, behavior: "smooth" });
    store.set("day", i);
    renderDay();
  }
  // 오늘이면 지금 진행 중인 카드 (KST)
  function nowIds(d, rows) {
    if (todayIndex() !== DAYS.indexOf(d)) return new Set();
    const hm = kstHM();
    const on = rows.filter(r => r.type !== "선택" && !r.off && startOf(r) <= hm && (!endOf(r) || hm < endOf(r)));
    return new Set(on.map(r => r.id));
  }
  const WHO = { teen: '<span class="tl-badge teen">🎀 딸 자유 시간</span>', parent: '<span class="tl-badge parent">☕ 부모 휴식</span>' };

  // 실시간 여행 기록: 방문한 장소 조회
  function getVisitedPlaces(date) {
    return (VISITS || []).filter(v => v.timestamp.slice(0, 10) === date).map(v => v.place);
  }
  function getVisit(placeId) {
    return (VISITS || []).find(v => v.place === placeId);
  }

  function rowCard(r, now) {
    const t = typeOf(r);
    const optional = r.type === "선택";
    const goFood = r.type === "식사" || r.type === "카페";
    const goShop = SHOP.some(g => g.row === r.id);
    const onMap = (r.pins || []).some(k => !PLACES[k]?.highway);

    // 실시간 여행 기록: 이 행의 장소 중 방문한 곳 확인
    const placesInRow = (r.pins || []).filter(k => PLACES[k]);
    const expectedDate = r.di !== undefined ? DAYS[r.di]?.date : kstDate();
    const visitedPlace = placesInRow.find(placeId => {
      const visited = getVisit(placeId);
      return visited && visited.timestamp.slice(0, 10) === expectedDate;
    });
    const visit = r.visited ? (getVisit((r.pins || [])[0]) || {}) : visitedPlace ? getVisit(visitedPlace) : null;

    return `
      <div class="tl-item" id="row-${r.id}">
        <div class="tl-time"><b>${startOf(r)}</b>${endOf(r) ? `<small>~${endOf(r)}</small>` : ""}<div class="tl-icon" style="background:${t.color}">${r.icon || t.icon}</div></div>
        <div class="tl-card${optional ? " optional" : ""}${now.has(r.id) ? " now" : ""}${visit ? " visited" : ""}" style="--tc:${t.color}">
          <div class="tl-top">
            <span class="tl-type">${t.icon} ${r.type}</span>
            <span class="tl-area">📍 ${r.area}</span>
            ${now.has(r.id) ? '<span class="tl-now">NOW</span>' : ""}
            ${visit ? '<span class="tl-visited">✓ 방문 완료</span>' : ""}
            <span class="tl-id">${r.id}</span>
          </div>
          ${r.who ? WHO[r.who] : ""}
          <h4>${md(r.place)}</h4>
          <p>${md(r.text)}</p>
          ${visit && visit.photo ? `<div class="tl-photo"><img src="${visit.photo}" alt="방문 사진"/></div>` : ""}
          ${r.tip ? `<div class="tl-tip"><b>TIP</b>${md(r.tip)}</div>` : ""}
          ${onMap || goFood || goShop ? `<div class="tl-actions">
            ${onMap ? `<button data-map="${r.id}">📍 지도</button>` : ""}
            ${goFood ? `<button data-food="${r.id}">🍽️ 추천 메뉴</button>` : ""}
            ${goShop ? `<button data-shop="${r.id}">🎯 미션</button>` : ""}
          </div>` : ""}
        </div>
      </div>`;
  }

  function renderDay() {
    const d = DAYS[curDay];
    // 시간순 (같은 시각이면 문서 순서)
    const rows = d.rows.map((r, k) => ({ ...r, k })).filter(r => !r.off).sort((a, b) => startOf(a).localeCompare(startOf(b)) || a.k - b.k);
    const offRows = d.rows.filter(r => r.off);
    const now = nowIds(d, rows);
    $("#dayPanel").innerHTML = `
      <div class="day-head" style="--hue:${d.hue}">
        <div class="dh-label">${d.label} · 10월 ${+d.date.slice(8)}일 (${d.dow})</div>
        <div class="dh-title">${esc(d.title)}</div>
        <div class="dh-sub">${esc(d.lead)}</div>
        <div class="dh-meta">
          <span>🗓️ ${d.date} KST</span>
          <span>🕘 ${startOf(rows[0])} ~ ${endOf(rows[rows.length - 1]) || "밤"}</span>
          ${d.holiday ? `<span class="dh-holiday">🎌 ${esc(d.holiday)}</span>` : ""}
        </div>
      </div>
      <div class="legend">${Object.entries(TYPES).filter(([k]) => rows.some(r => r.type === k))
        .map(([k, t]) => `<span style="--tc:${t.color}"${k === "선택" ? ' class="opt"' : ""}>${t.icon} ${k}</span>`).join("")}</div>
      <div class="timeline">${rows.map(r => rowCard(r, now)).join("")}</div>
      ${offRows.length ? `<div class="off-list"><h4>📦 일정에서 뺀 곳 <small>맛집·쇼핑 탭과 지도에는 그대로 있어요</small></h4>
        ${offRows.map(r => `<div class="off-item" id="row-${r.id}"><div class="tl-card" style="--tc:${typeOf(r).color}"><span class="tl-type">${typeOf(r).icon} ${r.type}</span> <b>${md(r.place)}</b> <small>· ${r.area}</small>
          ${(r.pins || []).some(k => PLACES[k]?.lat) ? `<button data-map="${r.id}">📍</button>` : ""}</div></div>`).join("")}</div>` : ""}
      <div class="day-nav">
        <button id="prevDay" ${curDay === 0 ? "disabled" : ""}>‹ 이전 날</button>
        <button id="nextDay" ${curDay === DAYS.length - 1 ? "disabled" : ""}>다음 날 ›</button>
      </div>`;
    $$("[data-map]", $("#dayPanel")).forEach(b => b.onclick = () => showRowOnMap(b.dataset.map));
    $$("[data-food]", $("#dayPanel")).forEach(b => b.onclick = () => { foodFilter = "all"; renderFood(); showView("food"); scrollToEl(`.food-card[data-row="${b.dataset.food}"]`); });
    $$("[data-shop]", $("#dayPanel")).forEach(b => b.onclick = () => { showView("shop"); scrollToEl(`.list-card[data-row="${b.dataset.shop}"]`); });
    $("#prevDay").onclick = () => { selectDay(curDay - 1); $("#daybarWrap").scrollIntoView({ behavior: "smooth" }); };
    $("#nextDay").onclick = () => { selectDay(curDay + 1); $("#daybarWrap").scrollIntoView({ behavior: "smooth" }); };
  }
  function scrollToEl(sel) {
    setTimeout(() => {
      const el = $(sel); if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1600);
    }, 80);
  }

  /* ---------- 바텀시트 ---------- */
  const sheet = $("#sheet"), backdrop = $("#sheetBackdrop");
  let sheetOpen = false;
  function openSheet(id) {
    const p = PLACES[id]; if (!p) return;
    const rows = (placeRows[id] || []).map(rid => ROW[rid]);
    const first = rows[0], t = first ? typeOf(first) : TYPES["숙소"];
    const food = FOOD.find(f => f.place === id);
    $("#sheetBody").innerHTML = `
      <div class="sh-img" style="--tc:${t.color}"><span>${p.emoji}</span></div>
      <div class="sh-content">
        <div class="sh-type" style="color:${t.color}">${p.stay ? "STAY · 숙소 후보" : first ? `${t.icon} ${first.type} · ${first.area}` : ""}</div>
        <h2>${esc(p.name)}</h2>
        <div class="sh-meta">
          ${rows.map(r => `<span>🗓️ ${DAYS[r.di].label} ${startOf(r)} · ${r.id}</span>`).join("")}
          <span class="${p.exact ? "ok" : "warn"}">${p.exact ? "📍 위치 확인됨" : "📍 대략 위치 · 네이버 지도로 확인"}</span>
        </div>
        ${food ? `<p>${esc(food.desc)}</p><h4>🍽️ 우리 가족 추천 메뉴</h4>${menuHTML(food)}` : ""}
        ${rows.filter(r => !food || r.type !== "식사" && r.type !== "카페").slice(0, p.stay ? 0 : 3).map(r => `
          <div class="sh-row">
            <b>${md(r.place)}</b>
            <p>${md(r.text)}</p>
            ${r.tip ? `<div class="tl-tip"><b>TIP</b>${md(r.tip)}</div>` : ""}
          </div>`).join("")}
        ${p.stay ? `<p>${esc(TRIP.stayNote)}</p>` : ""}
        <div class="sh-actions">
          <a class="btn dark" href="${naver(p.q)}" target="_blank" rel="noopener">🗺️ 네이버 지도</a>
          ${p.highway ? "" : `<button class="btn light" id="shOnMap">📍 지도에서 보기</button>`}
        </div>
      </div>`;
    const onMap = $("#shOnMap");
    if (onMap) onMap.onclick = () => { closeSheet(); showView("map"); setTimeout(() => focusPlace(id), 350); };
    $("#sheetBody").scrollTop = 0;
    backdrop.hidden = false;
    requestAnimationFrame(() => { backdrop.classList.add("show"); sheet.classList.add("open"); });
    sheet.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (!sheetOpen) history.pushState({ sheet: 1 }, "");
    sheetOpen = true;
  }
  function closeSheet(fromPop) {
    if (!sheetOpen) return;
    sheetOpen = false;
    sheet.classList.remove("open"); backdrop.classList.remove("show");
    sheet.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    setTimeout(() => { backdrop.hidden = true; }, 300);
    if (!fromPop && history.state?.sheet) history.back();
  }
  addEventListener("popstate", () => closeSheet(true));
  backdrop.onclick = () => closeSheet();
  $("#sheetClose").onclick = () => closeSheet();
  // 아래로 스와이프해서 닫기
  (() => {
    let y0 = null, dy = 0;
    const body = $("#sheetBody");
    sheet.addEventListener("touchstart", e => { if (body.scrollTop <= 0) { y0 = e.touches[0].clientY; dy = 0; sheet.style.transition = "none"; } }, { passive: true });
    sheet.addEventListener("touchmove", e => { if (y0 === null) return; dy = Math.max(0, e.touches[0].clientY - y0); if (dy > 0) sheet.style.transform = `translateY(${dy}px)`; }, { passive: true });
    sheet.addEventListener("touchend", () => { if (y0 === null) return; sheet.style.transition = ""; sheet.style.transform = ""; if (dy > 110) closeSheet(); y0 = null; });
  })();

  function menuHTML(f) {
    return `<div class="menu-grid">
      <div class="menu-col a"><h5>👨‍👩 부모</h5><ul>${f.parent.map(m => `<li>${esc(m)}</li>`).join("")}</ul></div>
      <div class="menu-col t"><h5>🎀 중3 딸</h5><ul>${f.teen.map(m => `<li>${esc(m)}</li>`).join("")}</ul></div>
    </div>`;
  }

  /* ---------- 맛집 ---------- */
  const FOOD_FILTERS = [["all", "전체"], ["식사", "🍜 식사"], ["카페", "☕ 카페"], ["d0", "DAY 1"], ["d1", "DAY 2"], ["d2", "DAY 3"]];
  let foodFilter = "all";
  function foodView() {
    $("#foodFilters").innerHTML = FOOD_FILTERS.map(([k, l]) => `<button class="chip" data-f="${k}">${l}</button>`).join("");
    $$("#foodFilters .chip").forEach(b => b.onclick = () => { foodFilter = b.dataset.f; renderFood(); });
    renderFood();
  }
  function renderFood() {
    $$("#foodFilters .chip").forEach(b => b.classList.toggle("active", b.dataset.f === foodFilter));
    const list = FOOD.filter(f => {
      const r = ROW[f.row];
      if (foodFilter === "all") return true;
      if (foodFilter[0] === "d") return r.di === +foodFilter.slice(1);
      return r.type === foodFilter;
    });
    $("#foodList").innerHTML = list.map(f => {
      const r = ROW[f.row], t = typeOf(r), d = DAYS[r.di], p = PLACES[f.place];
      const num = (r.pins || []).indexOf(f.place);
      return `
      <article class="food-card" data-row="${r.id}">
        <div class="fc-img" style="--tc:${t.color}">
          <div class="days"><span style="background:${d.hue}">${d.label}</span><span>${r.off ? "일정 외" : r.time}</span></div>
          <span class="fc-emoji">${p.emoji}</span>
          <span class="price">${t.icon} ${r.type}${num >= 0 && r.pins.length > 1 ? ` · ${"①②③④⑤"[num]}` : ""}</span>
        </div>
        <div class="fc-body">
          <h3><a href="${naver(p.q)}" target="_blank" rel="noopener">${esc(f.name)} <small>↗</small></a></h3>
          <div class="fc-sub">${esc(f.sub)}</div>
          <p>${esc(f.desc)}</p>
          ${menuHTML(f)}
          ${r.tip ? `<div class="tl-tip"><b>TIP</b>${md(r.tip)}</div>` : ""}
          <div class="fc-actions">
            <button class="btn light" data-plan="${r.id}">🗓️ 일정에서 보기</button>
            ${p.highway || !p.lat ? `<a class="btn dark" href="${naver(p.q)}" target="_blank" rel="noopener">🗺️ 네이버 지도</a>` : `<button class="btn dark" data-pin="${f.place}">📍 지도</button>`}
          </div>
        </div>
      </article>`;
    }).join("");
    $$("#foodList [data-plan]").forEach(b => b.onclick = () => goRow(b.dataset.plan));
    $$("#foodList [data-pin]").forEach(b => b.onclick = () => { showView("map"); setTimeout(() => focusPlace(b.dataset.pin), 350); });
  }
  function goRow(id) {
    showView("plan"); selectDay(ROW[id].di); scrollToEl(`#row-${id} .tl-card`);
  }

  /* ---------- 지도 ---------- */
  let map, markers = {}, mapFilter = "all";
  const VIEWS = {
    "홍대": [[37.5475, 126.9180], [37.5600, 126.9300]],
    "연남": [[37.5590, 126.9190], [37.5662, 126.9285]],
    "망원": [[37.5530, 126.9025], [37.5580, 126.9120]],
    "명동": [[37.5595, 126.9815], [37.5645, 126.9945]],
    "신촌": [[37.5540, 126.9340], [37.5675, 126.9405]],
  };
  function initMap() {
    if (map || !window.L) return;
    map = L.map("map", { zoomControl: false, attributionControl: true }).fitBounds(VIEWS["홍대"]);
    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    Object.entries(PLACES).forEach(([id, p]) => {
      if (p.highway || !p.lat) return;
      const rows = (placeRows[id] || []).map(rid => ROW[rid]);
      const first = rows.find(r => r.type !== "숙소") || rows[0];
      const color = p.stay ? "#6c7fd1" : first ? typeOf(first).color : "#8c93a8";
      const icon = L.divIcon({
        className: "", iconSize: [34, 34], iconAnchor: [4, 34], popupAnchor: [13, -30],
        html: `<div class="pin${p.stay ? " home" : ""}${p.exact ? "" : " approx"}" style="background:${color}"><span>${p.emoji}</span></div>`,
      });
      const m = L.marker([p.lat, p.lng], { icon, zIndexOffset: p.stay ? 500 : 0, title: p.name }).addTo(map);
      const when = [...new Set(rows.filter(r => !p.stay && !r.off).map(r => `${DAYS[r.di].label} ${startOf(r)}`))].join(" · ");
      m.bindPopup(`<div class="pop"><b>${p.emoji} ${esc(p.name)}</b><span>${p.stay ? "숙소 후보" : esc(first ? `${first.type} · ${first.area}` : "")}${when ? ` · ${when}` : ""}</span>${p.exact ? "" : '<em>대략 위치 · 정확한 위치는 네이버 지도</em>'}<div class="pop-btns"><button data-pop="${id}">자세히 보기</button><a href="${naver(p.q)}" target="_blank" rel="noopener">네이버 지도</a></div></div>`);
      m.on("popupopen", e => { e.popup.getElement().querySelector("[data-pop]").onclick = () => openSheet(id); });
      markers[id] = { m, days: p.stay ? DAYS.map((_, i) => i) : [...new Set(rows.map(r => r.di))] };
    });
    $("#mapFilters").innerHTML = [["all", "전체", "#fff"], ...DAYS.map((d, i) => [String(i), `${d.label} · ${d.title}`, d.hue])]
      .map(([k, l, c]) => `<button class="chip" data-mf="${k}"><i style="background:${c}"></i>${esc(l)}</button>`).join("");
    $$("#mapFilters .chip").forEach(b => b.onclick = () => filterMap(b.dataset.mf));
    $$("#jumpRow button").forEach(b => b.onclick = () => flyRegion(b.dataset.fly));
    filterMap("all", true);
  }
  function flyRegion(k) {
    $$("#jumpRow button").forEach(b => b.classList.toggle("active", b.dataset.fly === k));
    if (k === "all") {
      const vis = Object.values(markers).filter(x => map.hasLayer(x.m)).map(x => x.m.getLatLng());
      map.flyToBounds(L.latLngBounds(vis.length ? vis : Object.values(markers).map(x => x.m.getLatLng())).pad(.08), { duration: 1 });
    } else map.flyToBounds(VIEWS[k], { duration: 1 });
  }
  function filterMap(k, quiet) {
    mapFilter = k;
    $$("#mapFilters .chip").forEach(b => b.classList.toggle("active", b.dataset.mf === k));
    const vis = [];
    Object.values(markers).forEach(({ m, days }) => {
      const show = k === "all" || days.includes(+k);
      if (show) { m.addTo(map); vis.push(m.getLatLng()); } else m.remove();
    });
    if (!quiet && vis.length) map.flyToBounds(L.latLngBounds(vis).pad(.15), { duration: .9, maxZoom: 16 });
  }
  function focusPlace(id) {
    if (!map) initMap();
    if (!map) return;
    if (mapFilter !== "all") filterMap("all", true);
    const mk = markers[id]; if (!mk) return;
    map.flyTo(mk.m.getLatLng(), 17, { duration: .9 });
    setTimeout(() => mk.m.openPopup(), 950);
  }
  function showRowOnMap(rid) {
    const r = ROW[rid];
    const ids = (r.pins || []).filter(k => markers[k] || !PLACES[k].highway);
    showView("map");
    setTimeout(() => {
      if (!map) return;
      if (mapFilter !== "all") filterMap("all", true);
      const pts = ids.map(k => markers[k]?.m.getLatLng()).filter(Boolean);
      if (pts.length === 1) focusPlace(ids[0]);
      else if (pts.length) map.flyToBounds(L.latLngBounds(pts).pad(.3), { duration: .9, maxZoom: 17 });
    }, 350);
  }
  function mapNotes() {
    $("#stayNote").innerHTML = `
      <b>🏨 숙소 · 토요일 더레스티 / 일요일 트래블어스 명동</b>
      <p>${esc(TRIP.stayNote)}</p>
      <div class="stay-btns">${TRIP.hotels.map(k => `<span><button data-stay="${k}">📍 ${esc(PLACES[k].name)}</button><a href="${naver(PLACES[k].q)}" target="_blank" rel="noopener" aria-label="${esc(PLACES[k].name)} 네이버 지도">↗</a></span>`).join("")}</div>`;
    $$("#stayNote [data-stay]").forEach(b => b.onclick = () => focusPlace(b.dataset.stay));
    $("#offMap").innerHTML = `
      <b>🚗 지도에 없는 곳</b>
      <p>고속도로 구간(d1-01~d1-02, d3-06)의 휴게소: ${["jeongan", "iseo"].map(k => `<a href="${naver(PLACES[k].q)}" target="_blank" rel="noopener">${esc(PLACES[k].name)}</a>`).join(", ")}<br>
      룩백 팝업과 미도인 홍대는 위치를 확인하지 못해 핀을 찍지 않았어요. 네이버 지도에서 확인하세요.</p>`;
  }

  /* ---------- 쇼핑 미션 ---------- */
  function popupState(period) {
    if (!period) return null;
    const t = kstDate(), [s, e] = period;
    if (t > e) return { cls: "ended", label: `운영 종료 (${md2(s)}~${md2(e)})` };
    if (t < s) return { cls: "soon", label: `${md2(s)} 오픈 · ~${md2(e)}` };
    const left = Math.round((Date.parse(e) - Date.parse(t)) / 86400000);
    return { cls: "live", label: `운영 중 · ~${md2(e)} 종료${left ? ` (D-${left})` : " (오늘 마지막 날)"}` };
  }
  function shopView() {
    const done = new Set(store.get("mission", []));
    const keys = SHOP.flatMap(g => g.items.map(it => `${g.row}:${it.k}`));
    const total = keys.length;
    $("#missionList").innerHTML = SHOP.map((g, gi) => {
      const r = ROW[g.row], t = typeOf(r), d = DAYS[r.di];
      const head = (gi === 0 || SHOP[gi - 1].optional !== g.optional) && g.optional ? `<h3 class="shop-sub">✨ 선택 일정 속 팝업·쇼핑 <small>(고를 때만)</small></h3>` : "";
      return `${head}
      <div class="list-card${g.optional ? " optional" : ""}" data-row="${r.id}" style="--tc:${t.color}">
        <div class="lc-head"><span class="tl-type">${t.icon} ${r.type}</span><button class="lc-when" data-plan="${r.id}">${d.label} · ${r.time} ›</button></div>
        ${g.items.map(it => {
          const key = `${g.row}:${it.k}`, ps = popupState(it.period), p = PLACES[it.k];
          return `<label class="check${ps ? " " + ps.cls : ""}">
            <input type="checkbox" data-k="${key}" ${done.has(key) ? "checked" : ""}>
            <span><b>${esc(it.name)}</b>${ps ? `<em class="period ${ps.cls}">🎪 ${ps.label}</em>` : ""}<small>${esc(it.note)}</small>
            ${p ? `<a class="nv" href="${naver(p.q)}" target="_blank" rel="noopener">네이버 지도 ↗</a>` : ""}</span>
          </label>`;
        }).join("")}
      </div>`;
    }).join("");
    const prog = () => {
      const n = store.get("mission", []).filter(k => keys.includes(k)).length;
      $("#missionProgress").innerHTML = `<p>팝업·뷰티 미션 달성률</p><b>${n} / ${total}</b><div class="bar"><i style="width:${n / total * 100}%"></i></div>`;
    };
    $$("#missionList input").forEach(cb => cb.onchange = () => {
      store.set("mission", $$("#missionList input").filter(x => x.checked).map(x => x.dataset.k)); prog();
      if (cb.checked) toast("미션 클리어! 🎀");
    });
    // 체크박스 라벨 안 링크는 체크 토글 없이 열기
    $$("#missionList .nv").forEach(a => a.onclick = e => e.stopPropagation());
    $$("#missionList [data-plan]").forEach(b => b.onclick = () => goRow(b.dataset.plan));
    prog();
  }

  /* ---------- 준비 ---------- */
  function infoView() {
    const s = new Date(TRIP.start), e = new Date(TRIP.end);
    const fmt = d => d.toLocaleString("ko-KR", { timeZone: TZ, month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false });
    $("#tripCard").innerHTML = `
      <div class="tc-row"><span>출발</span><b>${fmt(s)}</b><small>광양</small></div>
      <div class="tc-row"><span>도착</span><b>${fmt(e)}</b><small>광양 · 대체공휴일</small></div>
      <p>${esc(TRIP.intro)}</p>`;

    $("#prepNote").textContent = PREP_NOTE;
    const done = new Set(store.get("prep", []));
    $("#prepList").innerHTML = PREP.map((it, i) => `<label class="check"><input type="checkbox" data-k="${i}" ${done.has(i) ? "checked" : ""}><span>${esc(it)}</span></label>`).join("");
    const cnt = () => { $("#prepCount").textContent = `${store.get("prep", []).length}/${PREP.length}`; };
    $$("#prepList input").forEach(cb => cb.onchange = () => { store.set("prep", $$("#prepList input").filter(x => x.checked).map(x => +x.dataset.k)); cnt(); });
    cnt();

    $("#transit").innerHTML = TRANSIT.map(t => `<li>${t}</li>`).join("");

    $("#rain").innerHTML = `<p>${esc(RAIN.text)}</p>
      <div class="rain-route">${RAIN.route.map((k, i) => `${i ? '<span class="arr">→</span>' : ""}<button data-rain="${k}">${PLACES[k].emoji} ${esc(PLACES[k].name.replace(/ \(.*\)$/, ""))}</button>`).join("")}</div>`;
    $$("[data-rain]").forEach(b => b.onclick = () => { showView("map"); setTimeout(() => focusPlace(b.dataset.rain), 350); });

    $("#stayList").innerHTML = `<p class="small">${esc(TRIP.stayNote)}</p>` + TRIP.hotels.map(k =>
      `<a class="stay-row" href="${naver(PLACES[k].q)}" target="_blank" rel="noopener">🏨 ${esc(PLACES[k].name)} <small>네이버 지도 ↗</small></a>`).join("");

    $("#overviewTable").innerHTML = `<table class="ov-table">${TRIP.overview.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table>`;

    $("#sources").innerHTML = SOURCES.map(s => `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a>${s.d ? ` — ${esc(s.d)}` : ""}</li>`).join("");
  }

  /* ---------- 탭 전환 ---------- */
  function showView(v) {
    $$(".view").forEach(s => s.classList.toggle("active", s.id === "view-" + v));
    $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === v));
    scrollTo({ top: 0, behavior: "instant" in document.documentElement.style ? "instant" : "auto" });
    if (v === "map") { initMap(); setTimeout(() => map && map.invalidateSize(), 60); }
    store.set("view", v);
  }
  $$(".tab").forEach(t => t.onclick = () => showView(t.dataset.view));

  /* ---------- 공유 / 토스트 ---------- */
  let tt;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 1600); }
  $("#shareBtn").onclick = async () => {
    const data = { title: "🍁 홍대·연남 2박 3일 가족여행", text: "우리 가족 홍대·연남 여행 일정 (2026.10.3–10.5)", url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(location.href); toast("링크를 복사했어요 📋"); }
    } catch {}
  };

  /* ---------- 방문 기록 모달 ---------- */
  const visitModal = $("#visitModal"), visitForm = $("#visitForm");
  const placeSelect = $("#visitPlace"), visitTime = $("#visitTime"), visitPhoto = $("#visitPhoto");
  const photoPreview = $("#photoPreview"), submitVisit = $("#submitVisit");

  // 모달 초기화: 장소 목록 채우기
  function initVisitForm() {
    const today = kstDate();
    placeSelect.innerHTML = '<option value="">장소를 선택해주세요</option>';
    Object.entries(PLACES).forEach(([id, p]) => {
      if (!p.highway && !p.stay) {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = `${p.emoji} ${p.name}`;
        placeSelect.appendChild(option);
      }
    });
  }

  function openVisitModal() {
    initVisitForm();
    const now = new Date();
    visitTime.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    visitPhoto.value = "";
    photoPreview.innerHTML = "";
    visitModal.hidden = false;
    visitForm.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => { visitModal.classList.add("show"); });
  }

  function closeVisitModal() {
    visitForm.classList.remove("open");
    visitForm.setAttribute("aria-hidden", "true");
    setTimeout(() => { visitModal.hidden = true; }, 300);
  }

  // 사진 미리보기
  visitPhoto.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = document.createElement("img");
      img.src = evt.target.result;
      photoPreview.innerHTML = "";
      photoPreview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });

  // 방문 기록 저장
  submitVisit.onclick = () => {
    if (!placeSelect.value) { toast("장소를 선택해주세요"); return; }
    const today = kstDate();
    const [h, m] = visitTime.value.split(":");
    const timestamp = `${today}T${h}:${m}:00+09:00`;

    const visit = { timestamp, place: placeSelect.value, photo: null };

    // 사진이 있으면 base64로 저장
    const img = photoPreview.querySelector("img");
    if (img) {
      visit.photo = img.src; // base64 data URL
    }

    // VISITS 배열에 추가
    if (!window.VISITS) window.VISITS = [];
    VISITS.push(visit);

    // localStorage에 저장
    store.set("visits", VISITS);

    toast("방문 기록이 저장되었어요 ✓");
    closeVisitModal();

    // 오늘이면 화면 즉시 업데이트
    if (todayIndex() === DAYS.indexOf(DAYS.find(d => d.date === today))) {
      renderDay();
    }
  };

  $("#visitFormClose").onclick = closeVisitModal;
  visitModal.onclick = (e) => { if (e.target === visitModal) closeVisitModal(); };
  $("#logVisitBtn").onclick = openVisitModal;

  /* ---------- 시작 ---------- */
  leaves(); countdown(); overview(); daybar();
  const ti = todayIndex();
  selectDay(ti >= 0 ? ti : Math.min(store.get("day", 0), DAYS.length - 1));
  foodView(); shopView(); infoView(); mapNotes();
})();

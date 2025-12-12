
// Disable all map links
Object.keys(simplemaps_usmap_mapdata.state_specific).forEach(st => {
  simplemaps_usmap_mapdata.state_specific[st].url = "";
});


// Election winners and interactive logic
const WINNERS_2020 = {
  AL:"Trump",AK:"Trump",AZ:"Biden",AR:"Trump",CA:"Biden",CO:"Biden",CT:"Biden",
  DE:"Biden",FL:"Trump",GA:"Biden",HI:"Biden",ID:"Trump",IL:"Biden",IN:"Trump",
  IA:"Trump",KS:"Trump",KY:"Trump",LA:"Trump",ME:"Biden",MD:"Biden",MA:"Biden",
  MI:"Biden",MN:"Biden",MS:"Trump",MO:"Trump",MT:"Trump",NE:"Trump",NV:"Biden",
  NH:"Biden",NJ:"Biden",NM:"Biden",NY:"Biden",NC:"Trump",ND:"Trump",OH:"Trump",
  OK:"Trump",OR:"Biden",PA:"Biden",RI:"Biden",SC:"Trump",SD:"Trump",TN:"Trump",
  TX:"Trump",UT:"Trump",VT:"Biden",VA:"Biden",WA:"Biden",WV:"Trump",WI:"Biden",
  WY:"Trump",DC:"Biden"
};

const WINNERS_2024 = {
  AL:"Trump",AK:"Trump",AZ:"Trump",AR:"Trump",CA:"Harris",CO:"Harris",CT:"Harris",
  DE:"Harris",FL:"Trump",GA:"Trump",HI:"Harris",ID:"Trump",IL:"Harris",IN:"Trump",
  IA:"Trump",KS:"Trump",KY:"Trump",LA:"Trump",ME:"Harris",MD:"Harris",
  MA:"Harris",MI:"Trump",MN:"Harris",MS:"Trump",MO:"Trump",MT:"Trump",
  NE:"Trump",NV:"Trump",NH:"Harris",NJ:"Harris",NM:"Harris",NY:"Harris",
  NC:"Trump",ND:"Trump",OH:"Trump",OK:"Trump",OR:"Harris",PA:"Trump",
  RI:"Harris",SC:"Trump",SD:"Trump",TN:"Trump",TX:"Trump",UT:"Trump",
  VT:"Harris",VA:"Harris",WA:"Harris",WV:"Trump",WI:"Trump",WY:"Trump",DC:"Harris"
};

function partyOf(winner) {
  if (winner === "Biden" || winner === "Harris") return "Dem";
  return "GOP";
}

function winnerColor(winner) {
  return (winner === "Biden" || winner === "Harris") ? "#1d4ed8" : "#b91c1c";
}

function formatMoney(n) {
  if (n == null) return "n/a";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "k";
  return "$" + n.toLocaleString();
}

// Donation color scale (single-hue light -> dark based on relative donation)
const donationRanges = {2020: {min: Infinity, max: -Infinity}, 2024: {min: Infinity, max: -Infinity}};

function computeDonationRanges() {
  const years = [2020, 2024];
  years.forEach(y => {
    let min = Infinity, max = -Infinity;
    for (const st in window.DONATION_DATA) {
      const v = window.DONATION_DATA[st]?.[y];
      if (v != null) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    donationRanges[y].min = min;
    donationRanges[y].max = max;
  });
}

function donationColor(value, year) {
  const range = donationRanges[year];
  if (!isFinite(range.min) || !isFinite(range.max) || value == null) {
    return "#e5e7eb";
  }
  const tRaw = (value - range.min) / (range.max - range.min || 1);
  const t = Math.max(0, Math.min(1, tRaw));
  // interpolate light blue (#dbeafe) -> dark teal/blue (#1d4ed8)
  const start = {r: 219, g: 234, b: 254};
  const end   = {r: 29,  g: 78,  b: 216};
  const r = Math.round(start.r + (end.r - start.r) * t);
  const g = Math.round(start.g + (end.g - start.g) * t);
  const b = Math.round(start.b + (end.b - start.b) * t);
  return `rgb(${r},${g},${b})`;
}

let CURRENT_YEAR = 2020;
let CURRENT_MODE = "winner"; // 'winner' or 'donations'

function updateLegend() {
  const legend = document.getElementById("legend");
  if (!legend) return;

  if (CURRENT_MODE === "winner") {
    legend.innerHTML = `
      <span class="swatch" style="background:#1d4ed8;"></span> Democratic win
      &nbsp;&nbsp;
      <span class="swatch" style="background:#b91c1c;"></span> Republican win
    `;
  } else {
    legend.innerHTML = `
      <span class="scale">
        <span>Lower donations</span>
        <span class="scale-box" style="background:rgb(219,234,254);"></span>
        <span class="scale-box" style="background:rgb(96,165,250);"></span>
        <span class="scale-box" style="background:rgb(37,99,235);"></span>
        <span class="scale-box" style="background:rgb(29,78,216);"></span>
        <span>Higher donations</span>
      </span>
    `;
  }
}

function updateMap() {
  const states = simplemaps_usmap_mapdata.state_specific;

  Object.keys(states).forEach(st => {
    const stateConf = states[st];
    const donations = window.DONATION_DATA[st]?.[CURRENT_YEAR] ?? null;
    const winners = CURRENT_YEAR === 2020 ? WINNERS_2020 : WINNERS_2024;
    const winner = winners[st];

    let color;
    if (CURRENT_MODE === "winner") {
      color = winnerColor(winner);
    } else {
      color = donationColor(donations, CURRENT_YEAR);
    }

    stateConf.color = color;

    const descLines = [];
    descLines.push(`<strong>${stateConf.name}</strong>`);
    if (winner) {
      const party = partyOf(winner);
      descLines.push(`<strong>${CURRENT_YEAR} winner:</strong> ${winner} (${party})`);
    }
    if (donations != null) {
      descLines.push(`<strong>${CURRENT_YEAR} donations (all presidential candidates):</strong> ${formatMoney(donations)}`);
    }
    descLines.push(`<em>Click for full 2020 vs 2024 comparison.</em>`);
    stateConf.description = `<strong>📍 ${stateConf.name}</strong><br>${CURRENT_YEAR} winner: ${winner} (${partyOf(winner)})<br>${CURRENT_YEAR} donations: ${formatMoney(donations)}<br><em>Click for full 2020 vs 2024 comparison.</em>`;
  });

  simplemaps_usmap.refresh();
  updateLegend();
}

function renderStatePanel(stateId) {
  const container = document.getElementById("state-info");
  if (!container) return;
  const base = simplemaps_usmap_mapdata.state_specific[stateId];
  if (!base) return;

  const name = base.name;
  const d2020 = window.DONATION_DATA[stateId]?.[2020] ?? null;
  const d2024 = window.DONATION_DATA[stateId]?.[2024] ?? null;
  const w2020 = WINNERS_2020[stateId];
  const w2024 = WINNERS_2024[stateId];

  // For bar widths we normalize by max of the two values (or global max as fallback)
  const localMax = Math.max(d2020 || 0, d2024 || 0, 1);
  const globalMax = donationRanges[2020].max && donationRanges[2024].max
    ? Math.max(donationRanges[2020].max, donationRanges[2024].max)
    : localMax;
  const denom = globalMax || localMax;
  const w2020Pct = d2020 != null ? Math.max(4, Math.round((d2020 / denom) * 100)) : 0;
  const w2024Pct = d2024 != null ? Math.max(4, Math.round((d2024 / denom) * 100)) : 0;

  container.innerHTML = `
    <h2>${name}</h2>
    <p class="muted">
      Compare who won and how much presidential fundraising came from this state
      across the 2020 and 2024 cycles.
    </p>

    <h3>2020 election
      ${w2020 ? `<span class="pill ${partyOf(w2020)==="Dem" ? "dem" : "gop"}">${partyOf(w2020)}</span>` : ""}
    </h3>
    <p><strong>Winner:</strong> ${w2020 || "n/a"}</p>
    <p><strong>Donations:</strong> ${d2020 != null ? formatMoney(d2020) : "n/a"}</p>

    <h3>2024 election
      ${w2024 ? `<span class="pill ${partyOf(w2024)==="Dem" ? "dem" : "gop"}">${partyOf(w2024)}</span>` : ""}
    </h3>
    <p><strong>Winner:</strong> ${w2024 || "n/a"}</p>
    <p><strong>Donations:</strong> ${d2024 != null ? formatMoney(d2024) : "n/a"}</p>

    <h3>Donations comparison</h3>
    <div class="bar-row">
      <div class="bar-label">2020</div>
      <div class="bar-track">
        <div class="bar-fill y2020" style="width:${w2020Pct}%;"></div>
      </div>
      <div class="bar-value">${d2020 != null ? formatMoney(d2020) : "n/a"}</div>
    </div>
    <div class="bar-row">
      <div class="bar-label">2024</div>
      <div class="bar-track">
        <div class="bar-fill y2024" style="width:${w2024Pct}%;"></div>
      </div>
      <div class="bar-value">${d2024 != null ? formatMoney(d2024) : "n/a"}</div>
    </div>

    <p class="note">
      Tip: Use the controls above the map to switch between
      <span class="chip">Winner coloring</span> and
      <span class="chip">Donation shading</span> and to toggle between years.
    </p>
  `;
}

// Hook SimpleMaps events
simplemaps_usmap.hooks.complete = function () {
  computeDonationRanges();
  updateMap();
};

simplemaps_usmap.hooks.click_state = function (id) {
  renderStatePanel(id);
};

document.addEventListener("DOMContentLoaded", function () {
  const yearSelect = document.getElementById("year-select");
  const modeSelect = document.getElementById("mode-select");

  if (yearSelect) {
    yearSelect.addEventListener("change", function () {
      CURRENT_YEAR = parseInt(this.value, 10);
      updateMap();
    });
  }

  if (modeSelect) {
    modeSelect.addEventListener("change", function () {
      CURRENT_MODE = this.value;
      updateMap();
    });
  }

  // initial legend text (map colors will be set on 'complete' hook)
  updateLegend();
});

const stateEl = document.querySelector("#state");
const table = document.querySelector("#leaderboard-table");
const tbody = document.querySelector("#leaderboard-body");
const regionSelect = document.querySelector("#region-select");
const refreshBtn = document.querySelector("#refresh-btn");

async function loadLeaderboard() {
  table.style.display = "none";
  stateEl.className = "state-msg";
  stateEl.textContent = "Chargement du classement...";

  const region = regionSelect.value;

  try {
    const res = await fetch(`${API_BASE}/leaderboard?country=${encodeURIComponent(region)}`);
    if (!res.ok) throw new Error("Impossible de récupérer le classement.");
    const data = await res.json();
    const items = data.items || [];

    tbody.innerHTML = items
      .map(
        (p) => `
        <tr>
          <td class="rank">#${p.rank}</td>
          <td>${escapeHtml(p.name)}</td>
          <td>${escapeHtml(p.clan ? p.clan.name : "—")}</td>
          <td class="trophies">🏆 ${p.trophies}</td>
        </tr>
      `
      )
      .join("");

    table.style.display = "table";
    stateEl.textContent = "";
  } catch (err) {
    stateEl.className = "state-msg state-msg--error";
    stateEl.textContent = `❌ ${err.message}`;
  }
}

regionSelect.addEventListener("change", loadLeaderboard);
refreshBtn.addEventListener("click", loadLeaderboard);

loadLeaderboard();

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

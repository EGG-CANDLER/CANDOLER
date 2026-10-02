const dayFilter = document.getElementById("dayFilter");
const dateFilter = document.getElementById("dateFilter");
const archivesBody = document.getElementById("archivesBody");
const pageInfo = document.getElementById("pageInfo");
const prevPage = document.getElementById("prevPage");
const nextPage = document.getElementById("nextPage");
const modal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const modalCaption = document.getElementById("modalCaption");

let page = 1;
const perPage = 10;

for (let day = 1; day <= 21; day += 1) {
  const option = document.createElement("option");
  option.value = `Day ${day}`;
  option.textContent = `Day ${day}`;
  dayFilter.appendChild(option);
}

function closeModal() {
  modal.classList.remove("show");
}

function openImage(item) {
  modalImage.src = item.image_url;
  modalCaption.textContent = `ID ${item.id} · ${item.predicted_day || "Uncertain"} · ${item.date} ${item.time}`;
  modal.classList.add("show");
}

async function restoreArchive(item) {
  if (!confirm(`Restore detection ID ${item.id} to Logs / History?`)) return;

  try {
    const response = await fetch(`/api/logs/${item.id}/restore`, { method: "POST" });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Could not restore detection log.");
    }
    await loadArchives();
  } catch (error) {
    alert(`Restore failed: ${error.message}`);
  }
}

async function deleteArchiveForever(item) {
  const confirmed = confirm(
    `Permanently delete detection ID ${item.id}?\n\n` +
    "This will permanently delete the archived record and its saved image. This cannot be undone."
  );
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/logs/${item.id}/permanent`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Could not permanently delete detection log.");
    }
    await loadArchives();
  } catch (error) {
    alert(`Delete failed: ${error.message}`);
  }
}

async function loadArchives() {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (dayFilter.value) params.set("day", dayFilter.value);
  if (dateFilter.value) params.set("date", dateFilter.value);

  archivesBody.innerHTML = '<tr><td colspan="8">Loading...</td></tr>';

  try {
    const response = await fetch(`/api/archives?${params.toString()}`);
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || "Could not load archive.");

    if (!data.logs.length) {
      archivesBody.innerHTML = '<tr><td colspan="8">No archived records found.</td></tr>';
    } else {
      archivesBody.innerHTML = "";
      data.logs.forEach((item) => {
        const row = document.createElement("tr");
        const confidence = typeof item.confidence === "number"
          ? `${Number(item.confidence).toFixed(2)}%`
          : "—";
        row.innerHTML = `
          <td>${item.id}</td>
          <td><img class="thumb" src="${item.image_url}" alt="Egg ${item.id}"></td>
          <td>${item.predicted_day || "—"}</td>
          <td>${item.development_stage || "—"}</td>
          <td>${confidence}</td>
          <td>${item.date}</td>
          <td>${item.time}</td>
          <td>
            <button class="primary view-btn" type="button">VIEW IMAGE</button>
            <button class="secondary restore-btn" type="button">RESTORE</button>
            <button class="danger delete-btn" type="button">DELETE FOREVER</button>
          </td>
        `;
        row.querySelector(".view-btn").addEventListener("click", () => openImage(item));
        row.querySelector(".thumb").addEventListener("click", () => openImage(item));
        row.querySelector(".restore-btn").addEventListener("click", () => restoreArchive(item));
        row.querySelector(".delete-btn").addEventListener("click", () => deleteArchiveForever(item));
        archivesBody.appendChild(row);
      });
    }

    pageInfo.textContent = `Page ${data.page} of ${data.pages} (${data.total} records)`;
    prevPage.disabled = data.page <= 1;
    nextPage.disabled = data.page >= data.pages;
  } catch (error) {
    archivesBody.innerHTML = `<tr><td colspan="8">${error.message}</td></tr>`;
  }
}

document.getElementById("applyFilters").addEventListener("click", () => {
  page = 1;
  loadArchives();
});
document.getElementById("resetFilters").addEventListener("click", () => {
  dayFilter.value = "";
  dateFilter.value = "";
  page = 1;
  loadArchives();
});
prevPage.addEventListener("click", () => {
  page = Math.max(1, page - 1);
  loadArchives();
});
nextPage.addEventListener("click", () => {
  page += 1;
  loadArchives();
});
document.getElementById("closeModal").addEventListener("click", closeModal);
modal.addEventListener("click", (event) => {
  if (event.target.id === "imageModal") closeModal();
});

loadArchives();

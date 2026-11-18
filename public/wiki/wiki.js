"use strict";

const topics = [...document.querySelectorAll(".topic")];
const navigation = [...document.querySelectorAll("[data-topic]")];
const navigationMenu = document.querySelector(".wiki-nav");
const compact = window.matchMedia("(max-width: 49rem)");
const searchBox = document.querySelector("[role='search']");
const search = document.getElementById("wiki-search");
const results = document.getElementById("wiki-results");
const status = document.getElementById("wiki-status");

function normalize(text) {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const entries = topics.flatMap(topic => {
  const title = document.getElementById(topic.getAttribute("aria-labelledby"));
  return [...topic.querySelectorAll("h1[id], h2[id], h3[id]")].map(heading => {
    const main = heading === title;
    const context = main ? topic.dataset.keywords : heading.dataset.keywords;
    const detail = main ? topic.querySelector("header p:last-of-type") : heading.closest(".answer") || heading.nextElementSibling;
    return {
      id: main ? topic.id : heading.id,
      title: heading.textContent,
      topic: main ? "" : title.textContent,
      heading: normalize(heading.textContent),
      keywords: normalize(context || ""),
      detail: normalize(detail?.textContent || ""),
    };
  });
});

function updateSearch() {
  const query = normalize(search.value);
  results.replaceChildren();
  results.hidden = true;
  status.textContent = "";
  if (!query) return;

  const terms = query.split(/\s+/);
  const matches = entries.flatMap(entry => {
    if (entry.heading === query) return [{ entry, order: 0 }];
    if (terms.every(term => entry.heading.includes(term))) return [{ entry, order: 1 }];
    if (terms.every(term => (entry.heading + " " + entry.keywords).includes(term))) return [{ entry, order: 2 }];
    if (terms.every(term => (entry.heading + " " + entry.keywords + " " + entry.detail).includes(term))) return [{ entry, order: 3 }];
    return [];
  }).sort((a, b) => a.order - b.order).slice(0, 7);

  if (!matches.length) {
    status.textContent = "Sin resultados. Probá con otra palabra.";
    return;
  }
  for (const { entry } of matches) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = "#" + entry.id;
    link.textContent = entry.title;
    if (entry.topic) {
      const group = document.createElement("small");
      group.textContent = entry.topic;
      link.append(group);
    }
    item.append(link);
    results.append(item);
  }
  results.hidden = false;
  status.textContent = matches.length === 1 ? "1 resultado" : matches.length + " resultados";
}

function clearSearch() {
  search.value = "";
  updateSearch();
}

function showTopic(moveFocus) {
  const id = location.hash.slice(1);
  if (id === "contenido" && moveFocus) return;
  const target = document.getElementById(id);
  const topic = target?.closest(".topic") || topics[0];
  for (const article of topics) article.hidden = article !== topic;
  for (const link of navigation) {
    if (link.getAttribute("href") === "#" + topic.id) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
  const title = document.getElementById(topic.getAttribute("aria-labelledby"));
  document.title = topic === topics[0] ? "Wiki de Golden Farm" : title.textContent + " · Wiki de Golden Farm";

  if (moveFocus) {
    clearSearch();
    if (compact.matches) navigationMenu.open = false;
    const destination = target && target !== topic && topic.contains(target) ? target : title;
    destination.tabIndex = -1;
    destination.focus({ preventScroll: true });
    if (destination === title) window.scrollTo(0, 0);
    else destination.scrollIntoView();
  } else if (target && target !== topic) {
    target.scrollIntoView();
  }
}

search.addEventListener("input", updateSearch);
search.addEventListener("keydown", event => {
  if (event.key === "Escape") clearSearch();
  if (event.key === "Enter" && !results.hidden) {
    event.preventDefault();
    results.querySelector("a")?.click();
  }
});
window.addEventListener("hashchange", () => showTopic(true));
document.addEventListener("click", event => {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest("a[href^='#']");
  if (link && link.hash === location.hash && link.hash !== "#contenido") showTopic(true);
});
function fitNavigation() { navigationMenu.open = !compact.matches; }
compact.addEventListener("change", fitNavigation);
fitNavigation();
searchBox.hidden = false;
showTopic(false);

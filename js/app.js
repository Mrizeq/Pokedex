import { fetchGalarDex, fetchSwordLocations, fetchRaidSpecies } from "./api.js";
import { getEvolutionInfo } from "./evolution.js";
import { capitalize } from "./utils.js";
import { auth, provider } from "./firebase.js";
import {
signInWithPopup,
signOut,
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { db, doc, setDoc, getDoc } from "./firebase.js";

const tableBody = document.querySelector("#dex tbody");
const searchInput = document.querySelector("#search");
const filterButtons = document.querySelectorAll(".filter-btn");
const sortButtons = document.querySelectorAll(".sort-btn");
const tableStatus = document.querySelector("#tableStatus");
const errorState = document.querySelector("#errorState");
const emptyState = document.querySelector("#emptyState");
const retryBtn = document.querySelector("#retryBtn");

const loginBtn = document.querySelector("#loginBtn");
const logoutBtn = document.querySelector("#logoutBtn");
const userInfo = document.querySelector("#userInfo");

const STATIC_OBTAIN = {
grookey: "Gift (Starter)",
scorbunny: "Gift (Starter)",
sobble: "Gift (Starter)",
toxel: "Gift (Nursery)",
"type-null": "Gift (Battle Tower)",
zacian: "Legendary (Story)",
eternatus: "Legendary (Story)",
dracozolt: "Fossil restoration",
arctozolt: "Fossil restoration",
dracovish: "Fossil restoration",
arctovish: "Fossil restoration"
};

let pokemonData = [];
let dexRows = [];
let caught = {};
let swordLocations = {};
let raidSpeciesSet = new Set();
let expandedLocations = new Set();
let saveTimeout = null;

let uiState = {
search: "",
filter: "all",
sortBy: "id",
sortDir: "asc",
loading: false,
error: false
};

loginBtn.addEventListener("click", async () => {
const result = await signInWithPopup(auth, provider);
console.log("Logged in user:", result.user);
});

logoutBtn.addEventListener("click", () => {
signOut(auth);
});

retryBtn.addEventListener("click", () => {
loadDex();
});

onAuthStateChanged(auth, async user => {
if(user){
loginBtn.style.display = "none";
logoutBtn.style.display = "inline";
userInfo.innerText = "Logged in as " + user.displayName;
await loadUserProgress(user.uid);
}else{
loginBtn.style.display = "inline";
logoutBtn.style.display = "none";
userInfo.innerText = "";
caught = {};
renderTable();
}
});

searchInput.addEventListener("input", debounce(() => {
uiState.search = searchInput.value.toLowerCase().trim();
renderTable();
}, 180));

for (const btn of filterButtons) {
btn.addEventListener("click", () => {
uiState.filter = btn.dataset.filter;
filterButtons.forEach(item => item.classList.remove("active"));
btn.classList.add("active");
renderTable();
});
}

for (const btn of sortButtons) {
btn.addEventListener("click", () => {
const key = btn.dataset.sort;
if (uiState.sortBy === key) {
uiState.sortDir = uiState.sortDir === "asc" ? "desc" : "asc";
} else {
uiState.sortBy = key;
uiState.sortDir = "asc";
}
updateSortIndicators();
renderTable();
});
}

tableBody.addEventListener("change", e => {
if (e.target.matches('input[type="checkbox"][data-id]')) {
const id = e.target.dataset.id;
caught[id] = e.target.checked;

if (auth.currentUser) {
if (saveTimeout) {
clearTimeout(saveTimeout);
}
saveTimeout = setTimeout(() => {
saveUserProgress(auth.currentUser.uid);
}, 250);
}

renderTableStatus(getVisibleRows().length);
}
});

tableBody.addEventListener("click", e => {
const toggle = e.target.closest(".location-toggle");
if (!toggle) {
return;
}

const id = String(toggle.dataset.id);
const content = toggle.closest(".location-content");
const summary = content.querySelector(".location-summary");
const shortText = content.dataset.short;
const fullText = content.dataset.full;
const moreCount = toggle.dataset.more;

if (expandedLocations.has(id)) {
expandedLocations.delete(id);
summary.textContent = shortText;
toggle.textContent = `+${moreCount} more`;
} else {
expandedLocations.add(id);
summary.textContent = fullText;
toggle.textContent = "Show less";
}
});

async function loadDex(){
setLoadingState(true);
setErrorState(false);

try {
const [dexData, locationsData, raidData] = await Promise.all([
fetchGalarDex(),
fetchSwordLocations(),
fetchRaidSpecies()
]);

pokemonData = dexData;
swordLocations = locationsData;
raidSpeciesSet = new Set(raidData);

dexRows = await mapWithConcurrency(pokemonData, 16, buildDexRow);

setLoadingState(false);
setErrorState(false);
renderTable();
} catch (err) {
console.error(err);
setLoadingState(false);
if (dexRows.length === 0) {
setErrorState(true);
} else {
setErrorState(false);
tableStatus.innerText = "Showing cached data. Refresh or Retry to update.";
}
}
}

async function buildDexRow(entry){
const id = entry.entry_number;
const name = entry.pokemon_species.name;
const sprite = `https://img.pokemondb.net/sprites/home/normal/${name}.png`;
const evolution = await getEvolutionInfo(name);
const location = getLocationText(name);
const obtain = getObtainText(name, evolution, location);

return {
id,
name,
nameLabel: capitalize(name),
sprite,
evolution,
stone: evolution.stone,
location,
obtain
};
}

function getVisibleRows(){
let rows = [...dexRows];

if (uiState.search) {
rows = rows.filter(row => row.name.includes(uiState.search));
}

switch (uiState.filter) {
case "caught":
rows = rows.filter(row => Boolean(caught[row.id]));
break;
case "not-caught":
rows = rows.filter(row => !caught[row.id]);
break;
case "has-stone":
rows = rows.filter(row => row.stone !== "-");
break;
case "final-evo":
rows = rows.filter(row => row.evolution.isFinalEvolution);
break;
default:
break;
}

rows.sort((a, b) => compareRows(a, b, uiState.sortBy, uiState.sortDir));

return rows;
}

function compareRows(a, b, sortBy, sortDir){
const dir = sortDir === "asc" ? 1 : -1;

if (sortBy === "id") {
return (a.id - b.id) * dir;
}

if (sortBy === "caught") {
const aVal = caught[a.id] ? 1 : 0;
const bVal = caught[b.id] ? 1 : 0;
if (aVal === bVal) {
return (a.id - b.id) * dir;
}
return (aVal - bVal) * dir;
}

const aVal = getSortValue(a, sortBy);
const bVal = getSortValue(b, sortBy);

if (aVal < bVal) {
return -1 * dir;
}
if (aVal > bVal) {
return 1 * dir;
}

return (a.id - b.id) * dir;
}

function getSortValue(row, key){
if (key === "name") return row.name;
if (key === "evolution") return row.evolution.method.toLowerCase();
if (key === "stone") return row.stone.toLowerCase();
if (key === "obtain") return row.obtain.toLowerCase();
return row.id;
}

function renderTable(){
if (uiState.loading) {
renderLoadingRows();
return;
}

const rows = getVisibleRows();
renderTableStatus(rows.length);

emptyState.hidden = rows.length !== 0;

const html = rows.map(row => {
const checked = caught[row.id] ? "checked" : "";
const isExpanded = expandedLocations.has(String(row.id));

return `
<tr>
<td>${row.id}</td>
<td><img class="sprite" src="${row.sprite}" alt="${row.nameLabel} sprite"></td>
<td class="pokemon-cell">
<div class="pokemon-main">
<span>${row.nameLabel}</span>
<label class="checkbox-container mobile-caught" aria-label="Mark ${row.nameLabel} as caught">
<input type="checkbox" data-id="${row.id}" ${checked}>
<span class="checkmark"></span>
</label>
</div>
</td>
<td>${escapeHtml(row.evolution.method)}</td>
<td>${escapeHtml(row.stone)}</td>
<td>${escapeHtml(row.obtain)}</td>
<td class="location-cell">
<div
class="location-content"
data-short="${escapeHtml(row.location.short)}"
data-full="${escapeHtml(row.location.full)}"
>
<span class="location-summary">
${escapeHtml(isExpanded ? row.location.full : row.location.short)}
</span>
${row.location.hiddenCount > 0 ? `
<button
type="button"
class="location-toggle"
data-id="${row.id}"
data-more="${row.location.hiddenCount}"
title="${escapeHtml(row.location.full)}"
aria-label="Show more locations for ${row.nameLabel}"
>
${isExpanded ? "Show less" : `+${row.location.hiddenCount} more`}
</button>
` : ""}
</div>
</td>
<td>
<label class="checkbox-container" aria-label="Mark ${row.nameLabel} as caught">
<input type="checkbox" data-id="${row.id}" ${checked}>
<span class="checkmark"></span>
</label>
</td>
</tr>
`;
}).join("");

tableBody.innerHTML = html;
}

function renderLoadingRows(){
const placeholders = Array.from({ length: 12 }).map(() => `
<tr class="skeleton-row">
<td><span class="skeleton-box w-id"></span></td>
<td><span class="skeleton-box w-sprite"></span></td>
<td><span class="skeleton-box w-name"></span></td>
<td><span class="skeleton-box w-evo"></span></td>
<td><span class="skeleton-box w-stone"></span></td>
<td><span class="skeleton-box w-obtain"></span></td>
<td><span class="skeleton-box w-location"></span></td>
<td><span class="skeleton-box w-check"></span></td>
</tr>
`).join("");

tableBody.innerHTML = placeholders;
}

function getObtainText(name, evolution, location){
if (location.hasWild) {
return "Wild encounter";
}

if (evolution.parentName) {
if (evolution.parentTrigger === "trade") {
return `Evolve from ${evolution.parentName} (Trade)`;
}

if (evolution.parentTrigger === "stone") {
return `Evolve from ${evolution.parentName} (${evolution.parentStone})`;
}

if (evolution.parentTrigger === "item") {
return `Evolve from ${evolution.parentName} (Item)`;
}

return `Evolve from ${evolution.parentName}`;
}

if (STATIC_OBTAIN[name]) {
return STATIC_OBTAIN[name];
}

if (raidSpeciesSet.has(name)) {
return "Max Raid Battle";
}

return "Special encounter";
}

function getLocationText(name){
const locations = swordLocations[name];

if (!locations || locations.length === 0) {
return {
short: "Not in Sword wild encounters",
full: "Not in Sword wild encounters",
hiddenCount: 0,
hasWild: false
};
}

const grouped = {};
for (const entry of locations) {
const match = entry.match(/^(.*) \[(.*)\]$/);
const place = match ? match[1] : entry;
const condition = match ? match[2] : "All Weather";

if (!grouped[place]) {
grouped[place] = new Set();
}

grouped[place].add(condition);
}

let hiddenWeatherCount = 0;
const placeSummaries = Object.keys(grouped).sort().map(place => {
const conditions = Array.from(grouped[place]).sort();
if (conditions.length <= 2) {
return `${place} [${conditions.join(", ")}]`;
}
hiddenWeatherCount += conditions.length - 2;
return `${place} [${conditions.slice(0, 2).join(", ")}, +${conditions.length - 2} more]`;
});

const short = placeSummaries.slice(0, 3).join("; ");
const hiddenPlaceCount = Math.max(0, placeSummaries.length - 3);

return {
short,
full: locations.join(", "),
hiddenCount: hiddenWeatherCount + hiddenPlaceCount,
hasWild: true
};
}

function setLoadingState(isLoading){
uiState.loading = isLoading;
if (isLoading) {
tableStatus.innerText = "Loading Pokédex data...";
emptyState.hidden = true;
renderLoadingRows();
}
}

function setErrorState(isError){
uiState.error = isError;
errorState.hidden = !isError;
if (isError) {
tableStatus.innerText = "Could not load data.";
}
}

function renderTableStatus(visibleCount){
const total = dexRows.length;
const caughtCount = dexRows.filter(row => caught[row.id]).length;
tableStatus.innerText = `${visibleCount} shown · ${caughtCount}/${total} caught`;
}

function updateSortIndicators(){
for (const btn of sortButtons) {
btn.classList.remove("active", "asc", "desc");
btn.setAttribute("aria-pressed", "false");
if (btn.dataset.sort === uiState.sortBy) {
btn.classList.add("active", uiState.sortDir);
btn.setAttribute("aria-pressed", "true");
}
}
}

async function loadUserProgress(uid){
const ref = doc(db, "users", uid);
const snap = await getDoc(ref);

if(snap.exists()){
caught = snap.data().caught || {};
}else{
caught = {};
}

renderTable();
}

async function saveUserProgress(uid){
const ref = doc(db, "users", uid);
await setDoc(ref, { caught: caught });
}

function escapeHtml(str){
return String(str)
.replaceAll("&", "&amp;")
.replaceAll("<", "&lt;")
.replaceAll(">", "&gt;")
.replaceAll('"', "&quot;")
.replaceAll("'", "&#39;");
}

function debounce(fn, delayMs){
let timer = null;
return (...args) => {
if (timer) {
clearTimeout(timer);
}
timer = setTimeout(() => fn(...args), delayMs);
};
}

async function mapWithConcurrency(items, concurrency, mapper){
const results = new Array(items.length);
let index = 0;

async function worker(){
while (index < items.length) {
const current = index;
index += 1;
results[current] = await mapper(items[current]);
}
}

const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
await Promise.all(workers);
return results;
}

updateSortIndicators();
loadDex();

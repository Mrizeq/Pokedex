import { fetchGalarDex, fetchSwordLocations } from "./api.js";
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

const loginBtn = document.querySelector("#loginBtn");
const logoutBtn = document.querySelector("#logoutBtn");
const userInfo = document.querySelector("#userInfo");

loginBtn.addEventListener("click", async () => {

const result = await signInWithPopup(auth, provider);

console.log("Logged in user:", result.user);

});

logoutBtn.addEventListener("click", () => {

signOut(auth);

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

renderTable(pokemonData);

}

});

let pokemonData = [];
let caught = {};
let swordLocations = {};
let expandedLocations = new Set();

async function loadDex(){

const [dexData, locationsData] = await Promise.all([
fetchGalarDex(),
fetchSwordLocations()
]);

pokemonData = dexData;
swordLocations = locationsData;

renderTable(pokemonData);

}

async function renderTable(list){
let rows = await Promise.all(list.map(async entry => {

let id = entry.entry_number;
let name = entry.pokemon_species.name;

let sprite =
`https://img.pokemondb.net/sprites/home/normal/${name}.png`;

let checked = caught[id] ? "checked" : "";
let location = getLocationText(name);
let isExpanded = expandedLocations.has(String(id));

let evolution = await getEvolutionInfo(name);
let evo = evolution.method;
let stone = evolution.stone;

return `
<tr>
<td>${id}</td>
<td><img class="sprite" src="${sprite}"></td>
<td>${capitalize(name)}</td>
<td>${evo}</td>
<td>${stone}</td>
<td class="location-cell">
<div
class="location-content"
data-short="${escapeHtml(location.short)}"
data-full="${escapeHtml(location.full)}"
>
<span class="location-summary">
${escapeHtml(isExpanded ? location.full : location.short)}
</span>
${location.hiddenCount > 0 ? `
<button
type="button"
class="location-toggle"
data-id="${id}"
data-more="${location.hiddenCount}"
title="${escapeHtml(location.full)}"
>
${isExpanded ? "Show less" : `+${location.hiddenCount} more`}
</button>
` : ""}
</div>
</td>
<td>
<label class="checkbox-container">
<input type="checkbox" data-id="${id}" ${checked}>
<span class="checkmark"></span>
</label>
</td>
</tr>
`;

}));

tableBody.innerHTML = rows.join("");
}

tableBody.addEventListener("change", e => {
if (e.target.matches('input[type="checkbox"][data-id]')) {
let id = e.target.dataset.id;

caught[id] = e.target.checked;

if (auth.currentUser) {
saveUserProgress(auth.currentUser.uid);
}
}
});

tableBody.addEventListener("click", e => {
let toggle = e.target.closest(".location-toggle");

if (!toggle) {
return;
}

let id = String(toggle.dataset.id);
let content = toggle.closest(".location-content");
let summary = content.querySelector(".location-summary");
let shortText = content.dataset.short;
let fullText = content.dataset.full;
let moreCount = toggle.dataset.more;

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

function getLocationText(name){
let locations = swordLocations[name];

if (!locations || locations.length === 0) {
return {
short: "Not in Sword wild encounters",
full: "Not in Sword wild encounters",
hiddenCount: 0
};
}

let grouped = {};

for (const entry of locations) {
let match = entry.match(/^(.*) \[(.*)\]$/);
let place = match ? match[1] : entry;
let condition = match ? match[2] : "All Weather";

if (!grouped[place]) {
grouped[place] = new Set();
}

grouped[place].add(condition);
}

let hiddenWeatherCount = 0;

let placeSummaries = Object.keys(grouped).sort().map(place => {
let conditions = Array.from(grouped[place]).sort();

if (conditions.length <= 2) {
return `${place} [${conditions.join(", ")}]`;
}

hiddenWeatherCount += conditions.length - 2;
return `${place} [${conditions.slice(0, 2).join(", ")}, +${conditions.length - 2} more]`;
});

let short = placeSummaries.slice(0, 3).join("; ");
let hiddenPlaceCount = Math.max(0, placeSummaries.length - 3);
let hiddenCount = hiddenWeatherCount + hiddenPlaceCount;

return {
short: short,
full: locations.join(", "),
hiddenCount: hiddenCount
};
}

function escapeHtml(str){
return String(str)
.replaceAll("&", "&amp;")
.replaceAll("<", "&lt;")
.replaceAll(">", "&gt;")
.replaceAll("\"", "&quot;")
.replaceAll("'", "&#39;");
}

searchInput.addEventListener("input",()=>{

let term = searchInput.value.toLowerCase();

let filtered = pokemonData.filter(p =>

p.pokemon_species.name.includes(term)

);

renderTable(filtered);

});

async function loadUserProgress(uid){

const ref = doc(db, "users", uid);

const snap = await getDoc(ref);

if(snap.exists()){

caught = snap.data().caught || {};

}else{

caught = {};

}

renderTable(pokemonData);

}

async function saveUserProgress(uid){

const ref = doc(db, "users", uid);

await setDoc(ref, {

caught: caught

});

}

loadDex();

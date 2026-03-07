import { fetchGalarDex } from "./api.js";
import { getEvolutionMethod } from "./evolution.js";
import { loadCaught, saveCaught } from "./storage.js";
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
let caught = loadCaught();

async function loadDex(){

pokemonData = await fetchGalarDex();

renderTable(pokemonData);

}

async function renderTable(list){

tableBody.innerHTML="";

for (const entry of list){

let id = entry.entry_number;

let name = entry.pokemon_species.name;

let sprite =
`https://img.pokemondb.net/sprites/home/normal/${name}.png`;

let checked = caught[id] ? "checked" : "";

let evoPromise = getEvolutionMethod(name);

let rows = await Promise.all(list.map(async entry => {

let id = entry.entry_number;
let name = entry.pokemon_species.name;

let sprite =
`https://img.pokemondb.net/sprites/home/normal/${name}.png`;

let checked = caught[id] ? "checked" : "";

let evo = await getEvolutionMethod(name);

return `
<tr>
<td>${id}</td>
<td><img class="sprite" src="${sprite}"></td>
<td>${capitalize(name)}</td>
<td>${evo}</td>
<td><input type="checkbox" data-id="${id}" ${checked}></td>
</tr>
`;

}));

tableBody.innerHTML = rows.join("");
attachCheckboxEvents();
}

}

function attachCheckboxEvents(){

document.querySelectorAll("input[type=checkbox]").forEach(box=>{

box.addEventListener("change",e=>{

let id = e.target.dataset.id;

caught[id] = e.target.checked;

if(auth.currentUser){

saveUserProgress(auth.currentUser.uid);

}
});

});

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
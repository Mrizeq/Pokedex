import { fetchGalarDex } from "./api.js";
import { getEvolutionMethod } from "./evolution.js";
import { loadCaught, saveCaught } from "./storage.js";
import { capitalize } from "./utils.js";

const tableBody = document.querySelector("#dex tbody");
const searchInput = document.querySelector("#search");

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

saveCaught(caught);

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

loadDex();
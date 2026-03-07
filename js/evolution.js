import { fetchSpecies, fetchEvolutionChain } from "./api.js";
import { capitalize } from "./utils.js";

const evolutionCache = {};

export async function getEvolutionMethod(pokemonName){
let info = await getEvolutionInfo(pokemonName);
return info.method;
}

export async function getEvolutionInfo(pokemonName){
let species = await fetchSpecies(pokemonName);
let chainUrl = species.evolution_chain.url;

let evoData;

if(evolutionCache[chainUrl]){
evoData = evolutionCache[chainUrl];
}else{
evoData = await fetchEvolutionChain(chainUrl);
evolutionCache[chainUrl] = evoData;
}

return parseEvolution(evoData.chain, pokemonName);
}

function parseEvolution(chain, target){
let method = "";
let stone = "-";

function search(node){
let name = node.species.name;

if(name === target){
if(node.evolves_to.length === 0){
method = "Final evolution";
return;
}

let evo = node.evolves_to[0];
let details = evo.evolution_details[0];
let evoName = formatPokemonName(evo.species.name);

if(!details){
method = "Unknown";
return;
}

if(details.item){
method = details.item.name + " → " + evoName;
stone = details.item.name.includes("stone")
? formatItemName(details.item.name)
: "-";
}

else if(details.min_level){
method = "Level " + details.min_level + " → " + evoName;
}

else if(details.trigger.name === "trade"){
method = "Trade → " + evoName;
}

else{
method = details.trigger.name + " → " + evoName;
}
}

node.evolves_to.forEach(search);
}

search(chain);

return {
method: capitalize(method),
stone: stone
};
}

function formatPokemonName(name){
return name
.split("-")
.map(part => capitalize(part))
.join("-");
}

function formatItemName(itemName){
return itemName
.split("-")
.map(part => capitalize(part))
.join(" ");
}

import { fetchSpecies, fetchEvolutionChain } from "./api.js";
import { capitalize } from "./utils.js";

const evolutionCache = {};

export async function getEvolutionMethod(pokemonName){

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

let result = "";

function search(node){

let name = node.species.name;

if(name === target){

if(node.evolves_to.length === 0){
result = "Final evolution";
return;
}

let evo = node.evolves_to[0];
let details = evo.evolution_details[0];

if(!details){
result = "Unknown";
return;
}

if(details.item){
result = details.item.name + " → " + evo.species.name;
}

else if(details.min_level){
result = "Level " + details.min_level + " → " + evo.species.name;
}

else if(details.trigger.name === "trade"){
result = "Trade → " + evo.species.name;
}

else{
result = details.trigger.name + " → " + evo.species.name;
}

}

node.evolves_to.forEach(search);

}

search(chain);

return capitalize(result);

}
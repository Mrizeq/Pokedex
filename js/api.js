export async function fetchGalarDex(){

let res = await fetch("https://pokeapi.co/api/v2/pokedex/galar");

let data = await res.json();

return data.pokemon_entries;

}

export async function fetchSpecies(name){

let res = await fetch(
`https://pokeapi.co/api/v2/pokemon-species/${name}`
);

return await res.json();

}

export async function fetchEvolutionChain(url){

let res = await fetch(url);

return await res.json();

}

export async function fetchSwordLocations(){
let res = await fetch("./data/sword-locations.json");

if (!res.ok) {
return {};
}

return await res.json();
}

export async function fetchRaidSpecies(){
let res = await fetch("./data/sword-raid-species.json");

if (!res.ok) {
return [];
}

return await res.json();
}

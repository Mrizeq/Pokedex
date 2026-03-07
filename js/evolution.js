import { fetchSpecies, fetchEvolutionChain } from "./api.js";
import { capitalize } from "./utils.js";

const evolutionCache = {};

export async function getEvolutionMethod(pokemonName){
const info = await getEvolutionInfo(pokemonName);
return info.method;
}

export async function getEvolutionInfo(pokemonName){
const species = await fetchSpecies(pokemonName);
const chainUrl = species.evolution_chain.url;

let evoData;
if (evolutionCache[chainUrl]) {
evoData = evolutionCache[chainUrl];
} else {
evoData = await fetchEvolutionChain(chainUrl);
evolutionCache[chainUrl] = evoData;
}

return parseEvolution(chainUrl, evoData.chain, pokemonName);
}

function parseEvolution(chainUrl, chain, target){
const result = {
chainUrl,
method: "Unknown",
stone: "-",
forwardTrigger: "unknown",
isFinalEvolution: false,
parentName: null,
parentMethod: null,
parentStone: "-",
parentTrigger: null
};

function walk(node, parentNode, parentDetails){
if (node.species.name === target) {
result.parentName = parentNode ? formatPokemonName(parentNode.species.name) : null;

if (parentDetails) {
const parentMethod = formatForwardMethod(parentDetails, formatPokemonName(node.species.name));
result.parentMethod = parentMethod.method;
result.parentStone = parentMethod.stone;
result.parentTrigger = parentMethod.trigger;
}

if (node.evolves_to.length === 0) {
result.method = "Final evolution";
result.forwardTrigger = "none";
result.isFinalEvolution = true;
return;
}

const nextNode = node.evolves_to[0];
const details = nextNode.evolution_details[0];
const forwardMethod = formatForwardMethod(details, formatPokemonName(nextNode.species.name));
result.method = forwardMethod.method;
result.stone = forwardMethod.stone;
result.forwardTrigger = forwardMethod.trigger;
result.isFinalEvolution = false;
}

for (const child of node.evolves_to) {
walk(child, node, child.evolution_details[0]);
}
}

walk(chain, null, null);

return result;
}

function formatForwardMethod(details, nextName){
if (!details) {
return { method: "Unknown", stone: "-", trigger: "unknown" };
}

if (details.item) {
const itemName = formatItemName(details.item.name);
const isStone = details.item.name.includes("stone");
return {
method: `${itemName} → ${nextName}`,
stone: isStone ? itemName : "-",
trigger: isStone ? "stone" : "item"
};
}

if (details.min_level) {
return {
method: `Level ${details.min_level} → ${nextName}`,
stone: "-",
trigger: "level-up"
};
}

if (details.trigger?.name === "trade") {
return {
method: `Trade → ${nextName}`,
stone: "-",
trigger: "trade"
};
}

const triggerName = details.trigger?.name ? formatItemName(details.trigger.name) : "Unknown";
return {
method: `${triggerName} → ${nextName}`,
stone: "-",
trigger: details.trigger?.name || "unknown"
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

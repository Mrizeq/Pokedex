export function loadCaught(){

return JSON.parse(localStorage.getItem("caughtDex") || "{}");

}

export function saveCaught(data){

localStorage.setItem("caughtDex", JSON.stringify(data));

}
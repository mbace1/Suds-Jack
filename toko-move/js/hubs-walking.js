// Toko Move v2.12 — transfer hubs + deliberately simplified major-street walking network.
// Walking links are gameplay abstractions between real HSL-resolved anchors, not exact pedestrian routing.
export const TRANSFER_HUBS=['rautatientori','lasipalatsi','kamppi','hakaniemi','sornainen','toolontori','pasila','kauppatori','kalasatama','ooppera','lansiterminaali'];
export const WALK_STREETS=[
 {name:'Mannerheimintie',nodes:['rautatientori','lasipalatsi','toolontori','ooppera']},
 {name:'Helsinginkatu',nodes:['toolontori','kallionkirkko','sornainen']},
 {name:'Hämeentie',nodes:['hakaniemi','sornainen','arabia']},
 {name:'Kaivokatu / Simonkatu',nodes:['rautatientori','lasipalatsi','kamppi']},
 {name:'Bulevardi / Hietalahdenkatu',nodes:['kamppi','hietalahti','eira']},
 {name:'Kaivokatu / Kaisaniemi',nodes:['rautatientori','hakaniemi']},
 {name:'Eteläranta',nodes:['senaatintori','kauppatori','olympiaterminaali']},
 {name:'Tyynenmerenkatu',nodes:['hietalahti','lansiterminaali']},
 {name:'Kalasatama corridor',nodes:['sornainen','kalasatama']},
 {name:'Pasila corridor',nodes:['ooppera','pasila','messukeskus']}
];
export function isHub(id){return TRANSFER_HUBS.includes(id);}
export function walkLinks(){const out=[];for(const street of WALK_STREETS)for(let i=0;i<street.nodes.length-1;i++)out.push({from:street.nodes[i],to:street.nodes[i+1],street:street.name});return out;}
export function walksFrom(id){return walkLinks().filter(x=>x.from===id||x.to===id).map(x=>({...x,to:x.from===id?x.to:x.from,from:id}));}

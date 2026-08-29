// Toko Move v2 — compact Central Helsinki challenge board.
// Positions are an authored geographic diagram: north is up and the named districts keep
// their real relative relationships. This deliberately prioritises phone readability over
// street-level cartographic precision.
export const HELSINKI = {
  nodes: [
    { id:'pasila', name:'Pasila', x:34,y:5,tags:['transfer','work'],capacity:30 },
    { id:'toolontori', name:'Töölöntori', x:18,y:32,tags:['home','shop'],capacity:20 },
    { id:'kallionkirkko', name:'Kallion kirkko', x:48,y:31,tags:['home','service'],capacity:20 },
    { id:'sornainen', name:'Sörnäinen', x:66,y:29,tags:['transfer','work'],capacity:28 },
    { id:'kalasatama', name:'Kalasatama', x:82,y:40,tags:['transfer','home','shop'],capacity:28 },
    { id:'hakaniemi', name:'Hakaniemi', x:51,y:47,tags:['transfer','shop','work'],capacity:30 },
    { id:'kamppi', name:'Kamppi', x:27,y:67,tags:['transfer','shop','work'],capacity:30 },
    { id:'rautatientori', name:'Rautatientori', x:42,y:63,tags:['transfer','work','shop'],capacity:34 },
    { id:'kauppatori', name:'Kauppatori', x:58,y:78,tags:['shop','service'],capacity:22 },
  ],
  edges: [
    {id:'w_pas_tool',a:'pasila',b:'toolontori',mode:'walk',time:45,capacity:2},
    {id:'w_pas_kal',a:'pasila',b:'sornainen',mode:'walk',time:50,capacity:2},
    {id:'w_tool_kam',a:'toolontori',b:'kamppi',mode:'walk',time:32,capacity:2},
    {id:'w_tool_rail',a:'toolontori',b:'rautatientori',mode:'walk',time:34,capacity:2},
    {id:'w_kirk_hak',a:'kallionkirkko',b:'hakaniemi',mode:'walk',time:23,capacity:2},
    {id:'w_kirk_sor',a:'kallionkirkko',b:'sornainen',mode:'walk',time:28,capacity:2},
    {id:'w_sor_kal',a:'sornainen',b:'kalasatama',mode:'walk',time:24,capacity:2},
    {id:'w_sor_hak',a:'sornainen',b:'hakaniemi',mode:'walk',time:30,capacity:2},
    {id:'w_hak_rail',a:'hakaniemi',b:'rautatientori',mode:'walk',time:27,capacity:2},
    {id:'w_kam_rail',a:'kamppi',b:'rautatientori',mode:'walk',time:16,capacity:2},
    {id:'w_rail_market',a:'rautatientori',b:'kauppatori',mode:'walk',time:22,capacity:2},
    {id:'w_hak_market',a:'hakaniemi',b:'kauppatori',mode:'walk',time:42,capacity:2},
    {id:'m_kam_rail',a:'kamppi',b:'rautatientori',mode:'metro',time:8,capacity:6},
    {id:'m_rail_hak',a:'rautatientori',b:'hakaniemi',mode:'metro',time:10,capacity:6},
    {id:'m_hak_sor',a:'hakaniemi',b:'sornainen',mode:'metro',time:8,capacity:6},
    {id:'m_sor_kal',a:'sornainen',b:'kalasatama',mode:'metro',time:8,capacity:6},
    {id:'t_tool_kam',a:'toolontori',b:'kamppi',mode:'tram',time:20,capacity:4},
    {id:'t_tool_rail',a:'toolontori',b:'rautatientori',mode:'tram',time:23,capacity:4},
    {id:'t_rail_hak',a:'rautatientori',b:'hakaniemi',mode:'tram',time:18,capacity:4},
    {id:'t_hak_kirk',a:'hakaniemi',b:'kallionkirkko',mode:'tram',time:15,capacity:4},
    {id:'t_rail_market',a:'rautatientori',b:'kauppatori',mode:'tram',time:14,capacity:4},
    {id:'r_pas_rail',a:'pasila',b:'rautatientori',mode:'tram',time:18,capacity:5},
  ],
  lines: [
    {id:'M',name:'Metro',mode:'metro',nodes:['kamppi','rautatientori','hakaniemi','sornainen','kalasatama'],carriers:3,carrierCapacity:30},
    {id:'T',name:'Tram spine',mode:'tram',nodes:['toolontori','rautatientori','hakaniemi','kallionkirkko'],carriers:2,carrierCapacity:12},
    {id:'H',name:'Harbour tram',mode:'tram',nodes:['rautatientori','kauppatori'],carriers:1,carrierCapacity:10},
    {id:'R',name:'Commuter rail',mode:'tram',nodes:['pasila','rautatientori'],carriers:2,carrierCapacity:24},
  ],
};

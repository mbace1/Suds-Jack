// Helsinki — chapter 1's city definition. Data, not code: see js/city-build.js.
// Kept as a module rather than plain JSON so the runtime imports it with the
// rest of the graph and needs no second fetch. Geometry is NOT here — paths and
// stop sequences come from the committed HSL pack, exactly as published.
export const HELSINKI = /* generated from the v2.11 builder, then owned here */
{
 "id": "helsinki",
 "name": "Helsinki",
 "chapter": 1,
 "source": {
  "pack": "helsinki.json",
  "agency": "HSL",
  "licence": "CC BY 4.0"
 },
 "modes": {
  "SUBWAY": "metro",
  "TRAM": "tram"
 },
 "speedKmh": {
  "metro": 34,
  "tram": 18
 },
 "edgeCapacity": {
  "metro": 8,
  "tram": 5
 },
 "carriers": {
  "metro": {
   "count": 3,
   "seats": 30
  },
  "tram": {
   "count": 1,
   "seats": 12
  }
 },
 "anchors": {
  "pasila": {
   "aliases": [
    "Pasila",
    "Pasilan asema"
   ],
   "name": "Pasila",
   "tags": [
    "transfer",
    "work"
   ],
   "capacity": 30
  },
  "toolontori": {
   "aliases": [
    "Töölöntori"
   ],
   "name": "Töölöntori",
   "tags": [
    "home",
    "shop"
   ],
   "capacity": 20
  },
  "kallionkirkko": {
   "aliases": [
    "Karhupuisto",
    "Kallion virastotalo"
   ],
   "name": "Kallio",
   "tags": [
    "home",
    "service"
   ],
   "capacity": 20
  },
  "sornainen": {
   "aliases": [
    "Sörnäinen",
    "Sörnäinen (M)",
    "Sörnäisten metroasema"
   ],
   "name": "Sörnäinen",
   "tags": [
    "transfer",
    "work"
   ],
   "capacity": 28
  },
  "kalasatama": {
   "aliases": [
    "Kalasatama",
    "Kalasatama (M)",
    "Kalasataman metroasema"
   ],
   "name": "Kalasatama",
   "tags": [
    "transfer",
    "home",
    "shop"
   ],
   "capacity": 28
  },
  "hakaniemi": {
   "aliases": [
    "Hakaniemi",
    "Hakaniemen metroasema"
   ],
   "name": "Hakaniemi",
   "tags": [
    "transfer",
    "shop",
    "work"
   ],
   "capacity": 30
  },
  "kamppi": {
   "aliases": [
    "Kamppi",
    "Kamppi (M)",
    "Kampin metroasema",
    "Kampintori"
   ],
   "name": "Kamppi",
   "tags": [
    "transfer",
    "shop",
    "work"
   ],
   "capacity": 30
  },
  "rautatientori": {
   "aliases": [
    "Rautatientori",
    "Päärautatieasema",
    "Rautatientorin metroasema"
   ],
   "name": "Rautatientori",
   "tags": [
    "transfer",
    "work",
    "shop"
   ],
   "capacity": 34
  },
  "senaatintori": {
   "aliases": [
    "Senaatintori"
   ],
   "name": "Senaatintori",
   "tags": [
    "service",
    "shop"
   ],
   "capacity": 22
  },
  "ruoholahti": {
   "aliases": [
    "Ruoholahti",
    "Ruoholahden metroasema",
    "Ruoholahti (M)"
   ],
   "name": "Ruoholahti",
   "tags": [
    "transfer",
    "work",
    "home"
   ],
   "capacity": 24
  },
  "kauppatori": {
   "aliases": [
    "Kauppatori"
   ],
   "name": "Kauppatori",
   "tags": [
    "shop",
    "service"
   ],
   "capacity": 22
  },
  "katajanokka": {
   "aliases": [
    "Katajanokan puisto",
    "Katajanokan terminaali",
    "Vyökatu",
    "Katajanokan term.",
    "Katajanokan terminaali"
   ],
   "name": "Katajanokka",
   "tags": [
    "home",
    "service"
   ],
   "capacity": 20
  },
  "lasipalatsi": {
   "aliases": [
    "Lasipalatsi"
   ],
   "name": "Lasipalatsi",
   "tags": [
    "transfer",
    "shop"
   ],
   "capacity": 24
  },
  "ooppera": {
   "aliases": [
    "Ooppera"
   ],
   "name": "Ooppera",
   "tags": [
    "transfer",
    "service"
   ],
   "capacity": 22
  },
  "messukeskus": {
   "aliases": [
    "Messukeskus"
   ],
   "name": "Messukeskus",
   "tags": [
    "work",
    "service"
   ],
   "capacity": 24
  },
  "lansiterminaali": {
   "aliases": [
    "Länsiterminaali 2",
    "Länsiterminaali 1",
    "Länsiterminaali",
    "Länsiterminaali 2"
   ],
   "name": "Länsiterminaali",
   "tags": [
    "transfer",
    "service"
   ],
   "capacity": 26
  },
  "eira": {
   "aliases": [
    "Eiran sairaala",
    "Eira"
   ],
   "name": "Eira",
   "tags": [
    "home",
    "service"
   ],
   "capacity": 18
  },
  "kapyla": {
   "aliases": [
    "Käpylänaukio",
    "Pohjolanaukio",
    "Käpylänaukio"
   ],
   "name": "Käpylä",
   "tags": [
    "home",
    "service"
   ],
   "capacity": 20
  },
  "olympiaterminaali": {
   "aliases": [
    "Olympiaterminaali",
    "Olympiaterminaali"
   ],
   "name": "Olympiaterminaali",
   "tags": [
    "transfer",
    "service"
   ],
   "capacity": 22
  },
  "hietalahti": {
   "aliases": [
    "Hietalahti",
    "Hietalahdentori",
    "Hietalahdentori"
   ],
   "name": "Hietalahti",
   "tags": [
    "shop",
    "service"
   ],
   "capacity": 20
  },
  "meilahti": {
   "aliases": [
    "Meilahden sairaala",
    "Meilahti",
    "Meilahden sairaala"
   ],
   "name": "Meilahti",
   "tags": [
    "service",
    "work"
   ],
   "capacity": 24
  },
  "arabia": {
   "aliases": [
    "Arabianranta",
    "Arabiankatu",
    "Arabianranta"
   ],
   "name": "Arabia",
   "tags": [
    "home",
    "shop"
   ],
   "capacity": 22
  }
 },
 "walk": [
  [
   "pasila",
   "toolontori"
  ],
  [
   "pasila",
   "sornainen"
  ],
  [
   "pasila",
   "messukeskus"
  ],
  [
   "pasila",
   "kapyla"
  ],
  [
   "toolontori",
   "kamppi"
  ],
  [
   "toolontori",
   "rautatientori"
  ],
  [
   "toolontori",
   "ooppera"
  ],
  [
   "toolontori",
   "meilahti"
  ],
  [
   "ooppera",
   "lasipalatsi"
  ],
  [
   "ooppera",
   "pasila"
  ],
  [
   "ooppera",
   "meilahti"
  ],
  [
   "lasipalatsi",
   "rautatientori"
  ],
  [
   "lasipalatsi",
   "kamppi"
  ],
  [
   "kallionkirkko",
   "hakaniemi"
  ],
  [
   "kallionkirkko",
   "sornainen"
  ],
  [
   "kallionkirkko",
   "arabia"
  ],
  [
   "sornainen",
   "kalasatama"
  ],
  [
   "sornainen",
   "hakaniemi"
  ],
  [
   "sornainen",
   "arabia"
  ],
  [
   "hakaniemi",
   "rautatientori"
  ],
  [
   "hakaniemi",
   "senaatintori"
  ],
  [
   "kamppi",
   "rautatientori"
  ],
  [
   "kamppi",
   "ruoholahti"
  ],
  [
   "kamppi",
   "hietalahti"
  ],
  [
   "ruoholahti",
   "lansiterminaali"
  ],
  [
   "lansiterminaali",
   "hietalahti"
  ],
  [
   "lansiterminaali",
   "eira"
  ],
  [
   "hietalahti",
   "eira"
  ],
  [
   "eira",
   "kauppatori"
  ],
  [
   "eira",
   "olympiaterminaali"
  ],
  [
   "olympiaterminaali",
   "kauppatori"
  ],
  [
   "rautatientori",
   "senaatintori"
  ],
  [
   "senaatintori",
   "kauppatori"
  ],
  [
   "rautatientori",
   "kauppatori"
  ],
  [
   "kauppatori",
   "katajanokka"
  ],
  [
   "hakaniemi",
   "kauppatori"
  ]
 ]
};

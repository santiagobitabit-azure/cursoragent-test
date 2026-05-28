/** Fixture fase de grupos — Mundial FIFA 2026 */
const TEAM_FLAGS = {"Mexico": "🇲🇽", "South Africa": "🇿🇦", "Korea Republic": "🇰🇷", "Czechia": "🇨🇿", "Canada": "🇨🇦", "Bosnia and Herzegovina": "🇧🇦", "Qatar": "🇶🇦", "Switzerland": "🇨🇭", "USA": "🇺🇸", "Paraguay": "🇵🇾", "Australia": "🇦🇺", "Türkiye": "🇹🇷", "Haiti": "🇭🇹", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Brazil": "🇧🇷", "Morocco": "🇲🇦", "Côte d'Ivoire": "🇨🇮", "Ecuador": "🇪🇨", "Germany": "🇩🇪", "Curaçao": "🇨🇼", "Netherlands": "🇳🇱", "Japan": "🇯🇵", "Sweden": "🇸🇪", "Tunisia": "🇹🇳", "Saudi Arabia": "🇸🇦", "Uruguay": "🇺🇾", "Spain": "🇪🇸", "Cabo Verde": "🇨🇻", "IR Iran": "🇮🇷", "New Zealand": "🇳🇿", "Belgium": "🇧🇪", "Egypt": "🇪🇬", "France": "🇫🇷", "Senegal": "🇸🇳", "Iraq": "🇮🇶", "Norway": "🇳🇴", "Argentina": "🇦🇷", "Algeria": "🇩🇿", "Austria": "🇦🇹", "Jordan": "🇯🇴", "Ghana": "🇬🇭", "Panama": "🇵🇦", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Croatia": "🇭🇷", "Portugal": "🇵🇹", "Congo DR": "🇨🇩", "Uzbekistan": "🇺🇿", "Colombia": "🇨🇴"};
const TEAM_NAMES_ES = {"Mexico": "México", "South Africa": "Sudáfrica", "Korea Republic": "Corea del Sur", "Czechia": "República Checa", "Canada": "Canada", "Bosnia and Herzegovina": "Bosnia y Herzegovina", "Qatar": "Qatar", "Switzerland": "Switzerland", "USA": "Estados Unidos", "Paraguay": "Paraguay", "Australia": "Australia", "Türkiye": "Turquía", "Haiti": "Haiti", "Scotland": "Scotland", "Brazil": "Brazil", "Morocco": "Morocco", "Côte d'Ivoire": "Costa de Marfil", "Ecuador": "Ecuador", "Germany": "Germany", "Curaçao": "Curazao", "Netherlands": "Netherlands", "Japan": "Japan", "Sweden": "Sweden", "Tunisia": "Tunisia", "Saudi Arabia": "Saudi Arabia", "Uruguay": "Uruguay", "Spain": "Spain", "Cabo Verde": "Cabo Verde", "IR Iran": "Irán", "New Zealand": "Nueva Zelanda", "Belgium": "Belgium", "Egypt": "Egypt", "France": "France", "Senegal": "Senegal", "Iraq": "Iraq", "Norway": "Norway", "Argentina": "Argentina", "Algeria": "Algeria", "Austria": "Austria", "Jordan": "Jordan", "Ghana": "Ghana", "Panama": "Panama", "England": "England", "Croatia": "Croatia", "Portugal": "Portugal", "Congo DR": "RD Congo", "Uzbekistan": "Uzbekistan", "Colombia": "Colombia"};
const VENUES_ES = {"Mexico City Stadium": "Estadio Ciudad de México", "Estadio Guadalajara": "Estadio Guadalajara", "Toronto Stadium": "Estadio de Toronto", "Los Angeles Stadium": "Estadio de Los Ángeles", "Boston Stadium": "Estadio de Boston", "BC Place Vancouver": "BC Place · Vancouver", "New York New Jersey Stadium": "Estadio NY/NJ", "San Francisco Bay Area Stadium": "Área de San Francisco", "Philadelphia Stadium": "Estadio de Filadelfia", "Houston Stadium": "Estadio de Houston", "Dallas Stadium": "Estadio de Dallas", "Estadio Monterrey": "Estadio Monterrey", "Miami Stadium": "Estadio de Miami", "Atlanta Stadium": "Estadio de Atlanta", "Seattle Stadium": "Estadio de Seattle", "Kansas City Stadium": "Estadio de Kansas City"};
const WORLD_CUP_GROUPS = {"A": ["Mexico", "South Africa", "Korea Republic", "Czechia"], "B": ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"], "C": ["Brazil", "Morocco", "Haiti", "Scotland"], "D": ["USA", "Paraguay", "Australia", "Türkiye"], "E": ["Germany", "Curaçao", "Côte d'Ivoire", "Ecuador"], "F": ["Netherlands", "Japan", "Sweden", "Tunisia"], "G": ["Belgium", "Egypt", "IR Iran", "New Zealand"], "H": ["Spain", "Cabo Verde", "Saudi Arabia", "Uruguay"], "I": ["France", "Senegal", "Iraq", "Norway"], "J": ["Argentina", "Algeria", "Austria", "Jordan"], "K": ["Portugal", "Congo DR", "Uzbekistan", "Colombia"], "L": ["England", "Croatia", "Ghana", "Panama"]};
const GROUP_STAGE_MATCHES = [
  {
    "group": "A",
    "matchday": 1,
    "home": "Mexico",
    "away": "South Africa",
    "venue": "Mexico City Stadium",
    "kickoff": "2026-06-11T15:00:00-04:00"
  },
  {
    "group": "A",
    "matchday": 1,
    "home": "Korea Republic",
    "away": "Czechia",
    "venue": "Estadio Guadalajara",
    "kickoff": "2026-06-11T22:00:00-04:00"
  },
  {
    "group": "B",
    "matchday": 1,
    "home": "Canada",
    "away": "Bosnia and Herzegovina",
    "venue": "Toronto Stadium",
    "kickoff": "2026-06-12T15:00:00-04:00"
  },
  {
    "group": "D",
    "matchday": 1,
    "home": "USA",
    "away": "Paraguay",
    "venue": "Los Angeles Stadium",
    "kickoff": "2026-06-12T21:00:00-04:00"
  },
  {
    "group": "C",
    "matchday": 1,
    "home": "Haiti",
    "away": "Scotland",
    "venue": "Boston Stadium",
    "kickoff": "2026-06-13T21:00:00-04:00"
  },
  {
    "group": "D",
    "matchday": 1,
    "home": "Australia",
    "away": "Türkiye",
    "venue": "BC Place Vancouver",
    "kickoff": "2026-06-13T00:00:00-04:00"
  },
  {
    "group": "C",
    "matchday": 1,
    "home": "Brazil",
    "away": "Morocco",
    "venue": "New York New Jersey Stadium",
    "kickoff": "2026-06-13T18:00:00-04:00"
  },
  {
    "group": "B",
    "matchday": 1,
    "home": "Qatar",
    "away": "Switzerland",
    "venue": "San Francisco Bay Area Stadium",
    "kickoff": "2026-06-13T15:00:00-04:00"
  },
  {
    "group": "E",
    "matchday": 1,
    "home": "Côte d'Ivoire",
    "away": "Ecuador",
    "venue": "Philadelphia Stadium",
    "kickoff": "2026-06-14T19:00:00-04:00"
  },
  {
    "group": "E",
    "matchday": 1,
    "home": "Germany",
    "away": "Curaçao",
    "venue": "Houston Stadium",
    "kickoff": "2026-06-14T13:00:00-04:00"
  },
  {
    "group": "F",
    "matchday": 1,
    "home": "Netherlands",
    "away": "Japan",
    "venue": "Dallas Stadium",
    "kickoff": "2026-06-14T16:00:00-04:00"
  },
  {
    "group": "F",
    "matchday": 1,
    "home": "Sweden",
    "away": "Tunisia",
    "venue": "Estadio Monterrey",
    "kickoff": "2026-06-14T22:00:00-04:00"
  },
  {
    "group": "H",
    "matchday": 1,
    "home": "Saudi Arabia",
    "away": "Uruguay",
    "venue": "Miami Stadium",
    "kickoff": "2026-06-15T18:00:00-04:00"
  },
  {
    "group": "H",
    "matchday": 1,
    "home": "Spain",
    "away": "Cabo Verde",
    "venue": "Atlanta Stadium",
    "kickoff": "2026-06-15T12:00:00-04:00"
  },
  {
    "group": "G",
    "matchday": 1,
    "home": "IR Iran",
    "away": "New Zealand",
    "venue": "Los Angeles Stadium",
    "kickoff": "2026-06-15T21:00:00-04:00"
  },
  {
    "group": "G",
    "matchday": 1,
    "home": "Belgium",
    "away": "Egypt",
    "venue": "Seattle Stadium",
    "kickoff": "2026-06-15T15:00:00-04:00"
  },
  {
    "group": "I",
    "matchday": 1,
    "home": "France",
    "away": "Senegal",
    "venue": "New York New Jersey Stadium",
    "kickoff": "2026-06-16T15:00:00-04:00"
  },
  {
    "group": "I",
    "matchday": 1,
    "home": "Iraq",
    "away": "Norway",
    "venue": "Boston Stadium",
    "kickoff": "2026-06-16T18:00:00-04:00"
  },
  {
    "group": "J",
    "matchday": 1,
    "home": "Argentina",
    "away": "Algeria",
    "venue": "Kansas City Stadium",
    "kickoff": "2026-06-16T21:00:00-04:00"
  },
  {
    "group": "J",
    "matchday": 1,
    "home": "Austria",
    "away": "Jordan",
    "venue": "San Francisco Bay Area Stadium",
    "kickoff": "2026-06-16T00:00:00-04:00"
  },
  {
    "group": "L",
    "matchday": 1,
    "home": "Ghana",
    "away": "Panama",
    "venue": "Toronto Stadium",
    "kickoff": "2026-06-17T19:00:00-04:00"
  },
  {
    "group": "L",
    "matchday": 1,
    "home": "England",
    "away": "Croatia",
    "venue": "Dallas Stadium",
    "kickoff": "2026-06-17T16:00:00-04:00"
  },
  {
    "group": "K",
    "matchday": 1,
    "home": "Portugal",
    "away": "Congo DR",
    "venue": "Houston Stadium",
    "kickoff": "2026-06-17T13:00:00-04:00"
  },
  {
    "group": "K",
    "matchday": 1,
    "home": "Uzbekistan",
    "away": "Colombia",
    "venue": "Mexico City Stadium",
    "kickoff": "2026-06-17T22:00:00-04:00"
  },
  {
    "group": "A",
    "matchday": 2,
    "home": "Czechia",
    "away": "South Africa",
    "venue": "Atlanta Stadium",
    "kickoff": "2026-06-18T12:00:00-04:00"
  },
  {
    "group": "B",
    "matchday": 2,
    "home": "Switzerland",
    "away": "Bosnia and Herzegovina",
    "venue": "Los Angeles Stadium",
    "kickoff": "2026-06-18T15:00:00-04:00"
  },
  {
    "group": "B",
    "matchday": 2,
    "home": "Canada",
    "away": "Qatar",
    "venue": "BC Place Vancouver",
    "kickoff": "2026-06-18T18:00:00-04:00"
  },
  {
    "group": "A",
    "matchday": 2,
    "home": "Mexico",
    "away": "Korea Republic",
    "venue": "Estadio Guadalajara",
    "kickoff": "2026-06-18T21:00:00-04:00"
  },
  {
    "group": "C",
    "matchday": 2,
    "home": "Brazil",
    "away": "Haiti",
    "venue": "Philadelphia Stadium",
    "kickoff": "2026-06-19T20:30:00-04:00"
  },
  {
    "group": "C",
    "matchday": 2,
    "home": "Scotland",
    "away": "Morocco",
    "venue": "Boston Stadium",
    "kickoff": "2026-06-19T18:00:00-04:00"
  },
  {
    "group": "D",
    "matchday": 2,
    "home": "Türkiye",
    "away": "Paraguay",
    "venue": "San Francisco Bay Area Stadium",
    "kickoff": "2026-06-19T23:00:00-04:00"
  },
  {
    "group": "D",
    "matchday": 2,
    "home": "USA",
    "away": "Australia",
    "venue": "Seattle Stadium",
    "kickoff": "2026-06-19T15:00:00-04:00"
  },
  {
    "group": "E",
    "matchday": 2,
    "home": "Germany",
    "away": "Côte d'Ivoire",
    "venue": "Toronto Stadium",
    "kickoff": "2026-06-20T16:00:00-04:00"
  },
  {
    "group": "E",
    "matchday": 2,
    "home": "Ecuador",
    "away": "Curaçao",
    "venue": "Kansas City Stadium",
    "kickoff": "2026-06-20T20:00:00-04:00"
  },
  {
    "group": "F",
    "matchday": 2,
    "home": "Netherlands",
    "away": "Sweden",
    "venue": "Houston Stadium",
    "kickoff": "2026-06-20T13:00:00-04:00"
  },
  {
    "group": "F",
    "matchday": 2,
    "home": "Tunisia",
    "away": "Japan",
    "venue": "Estadio Monterrey",
    "kickoff": "2026-06-20T00:00:00-04:00"
  },
  {
    "group": "H",
    "matchday": 2,
    "home": "Uruguay",
    "away": "Cabo Verde",
    "venue": "Miami Stadium",
    "kickoff": "2026-06-21T18:00:00-04:00"
  },
  {
    "group": "H",
    "matchday": 2,
    "home": "Spain",
    "away": "Saudi Arabia",
    "venue": "Atlanta Stadium",
    "kickoff": "2026-06-21T12:00:00-04:00"
  },
  {
    "group": "G",
    "matchday": 2,
    "home": "Belgium",
    "away": "IR Iran",
    "venue": "Los Angeles Stadium",
    "kickoff": "2026-06-21T15:00:00-04:00"
  },
  {
    "group": "G",
    "matchday": 2,
    "home": "New Zealand",
    "away": "Egypt",
    "venue": "BC Place Vancouver",
    "kickoff": "2026-06-21T21:00:00-04:00"
  },
  {
    "group": "I",
    "matchday": 2,
    "home": "Norway",
    "away": "Senegal",
    "venue": "New York New Jersey Stadium",
    "kickoff": "2026-06-22T20:00:00-04:00"
  },
  {
    "group": "I",
    "matchday": 2,
    "home": "France",
    "away": "Iraq",
    "venue": "Philadelphia Stadium",
    "kickoff": "2026-06-22T17:00:00-04:00"
  },
  {
    "group": "J",
    "matchday": 2,
    "home": "Argentina",
    "away": "Austria",
    "venue": "Dallas Stadium",
    "kickoff": "2026-06-22T13:00:00-04:00"
  },
  {
    "group": "J",
    "matchday": 2,
    "home": "Jordan",
    "away": "Algeria",
    "venue": "San Francisco Bay Area Stadium",
    "kickoff": "2026-06-22T23:00:00-04:00"
  },
  {
    "group": "L",
    "matchday": 2,
    "home": "England",
    "away": "Ghana",
    "venue": "Boston Stadium",
    "kickoff": "2026-06-23T16:00:00-04:00"
  },
  {
    "group": "L",
    "matchday": 2,
    "home": "Panama",
    "away": "Croatia",
    "venue": "Toronto Stadium",
    "kickoff": "2026-06-23T19:00:00-04:00"
  },
  {
    "group": "K",
    "matchday": 2,
    "home": "Portugal",
    "away": "Uzbekistan",
    "venue": "Houston Stadium",
    "kickoff": "2026-06-23T13:00:00-04:00"
  },
  {
    "group": "K",
    "matchday": 2,
    "home": "Colombia",
    "away": "Congo DR",
    "venue": "Estadio Guadalajara",
    "kickoff": "2026-06-23T22:00:00-04:00"
  },
  {
    "group": "C",
    "matchday": 3,
    "home": "Scotland",
    "away": "Brazil",
    "venue": "Miami Stadium",
    "kickoff": "2026-06-24T18:00:00-04:00"
  },
  {
    "group": "C",
    "matchday": 3,
    "home": "Morocco",
    "away": "Haiti",
    "venue": "Atlanta Stadium",
    "kickoff": "2026-06-24T18:00:00-04:00"
  },
  {
    "group": "B",
    "matchday": 3,
    "home": "Switzerland",
    "away": "Canada",
    "venue": "BC Place Vancouver",
    "kickoff": "2026-06-24T15:00:00-04:00"
  },
  {
    "group": "B",
    "matchday": 3,
    "home": "Bosnia and Herzegovina",
    "away": "Qatar",
    "venue": "Seattle Stadium",
    "kickoff": "2026-06-24T15:00:00-04:00"
  },
  {
    "group": "A",
    "matchday": 3,
    "home": "Czechia",
    "away": "Mexico",
    "venue": "Mexico City Stadium",
    "kickoff": "2026-06-24T21:00:00-04:00"
  },
  {
    "group": "A",
    "matchday": 3,
    "home": "South Africa",
    "away": "Korea Republic",
    "venue": "Estadio Monterrey",
    "kickoff": "2026-06-24T21:00:00-04:00"
  },
  {
    "group": "E",
    "matchday": 3,
    "home": "Curaçao",
    "away": "Côte d'Ivoire",
    "venue": "Philadelphia Stadium",
    "kickoff": "2026-06-25T16:00:00-04:00"
  },
  {
    "group": "E",
    "matchday": 3,
    "home": "Ecuador",
    "away": "Germany",
    "venue": "New York New Jersey Stadium",
    "kickoff": "2026-06-25T16:00:00-04:00"
  },
  {
    "group": "F",
    "matchday": 3,
    "home": "Japan",
    "away": "Sweden",
    "venue": "Dallas Stadium",
    "kickoff": "2026-06-25T19:00:00-04:00"
  },
  {
    "group": "F",
    "matchday": 3,
    "home": "Tunisia",
    "away": "Netherlands",
    "venue": "Kansas City Stadium",
    "kickoff": "2026-06-25T19:00:00-04:00"
  },
  {
    "group": "D",
    "matchday": 3,
    "home": "Türkiye",
    "away": "USA",
    "venue": "Los Angeles Stadium",
    "kickoff": "2026-06-25T22:00:00-04:00"
  },
  {
    "group": "D",
    "matchday": 3,
    "home": "Paraguay",
    "away": "Australia",
    "venue": "San Francisco Bay Area Stadium",
    "kickoff": "2026-06-25T22:00:00-04:00"
  },
  {
    "group": "I",
    "matchday": 3,
    "home": "Norway",
    "away": "France",
    "venue": "Boston Stadium",
    "kickoff": "2026-06-26T15:00:00-04:00"
  },
  {
    "group": "I",
    "matchday": 3,
    "home": "Senegal",
    "away": "Iraq",
    "venue": "Toronto Stadium",
    "kickoff": "2026-06-26T15:00:00-04:00"
  },
  {
    "group": "G",
    "matchday": 3,
    "home": "Egypt",
    "away": "IR Iran",
    "venue": "Seattle Stadium",
    "kickoff": "2026-06-26T23:00:00-04:00"
  },
  {
    "group": "G",
    "matchday": 3,
    "home": "New Zealand",
    "away": "Belgium",
    "venue": "BC Place Vancouver",
    "kickoff": "2026-06-26T23:00:00-04:00"
  },
  {
    "group": "H",
    "matchday": 3,
    "home": "Cabo Verde",
    "away": "Saudi Arabia",
    "venue": "Houston Stadium",
    "kickoff": "2026-06-26T20:00:00-04:00"
  },
  {
    "group": "H",
    "matchday": 3,
    "home": "Uruguay",
    "away": "Spain",
    "venue": "Estadio Guadalajara",
    "kickoff": "2026-06-26T20:00:00-04:00"
  },
  {
    "group": "L",
    "matchday": 3,
    "home": "Panama",
    "away": "England",
    "venue": "New York New Jersey Stadium",
    "kickoff": "2026-06-27T17:00:00-04:00"
  },
  {
    "group": "L",
    "matchday": 3,
    "home": "Croatia",
    "away": "Ghana",
    "venue": "Philadelphia Stadium",
    "kickoff": "2026-06-27T17:00:00-04:00"
  },
  {
    "group": "J",
    "matchday": 3,
    "home": "Algeria",
    "away": "Austria",
    "venue": "Kansas City Stadium",
    "kickoff": "2026-06-27T22:00:00-04:00"
  },
  {
    "group": "J",
    "matchday": 3,
    "home": "Jordan",
    "away": "Argentina",
    "venue": "Dallas Stadium",
    "kickoff": "2026-06-27T22:00:00-04:00"
  },
  {
    "group": "K",
    "matchday": 3,
    "home": "Colombia",
    "away": "Portugal",
    "venue": "Miami Stadium",
    "kickoff": "2026-06-27T19:30:00-04:00"
  },
  {
    "group": "K",
    "matchday": 3,
    "home": "Congo DR",
    "away": "Uzbekistan",
    "venue": "Atlanta Stadium",
    "kickoff": "2026-06-27T19:30:00-04:00"
  }
];

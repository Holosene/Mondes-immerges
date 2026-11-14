// Les dix documentaires National Geographic présentés sur le globe, tous consacrés aux mondes aquatiques.
// Faits, équipes, photos et liens : pages officielles films.nationalgeographic.com et dossiers de presse
// National Geographic (detpress.com/natgeo), consultés en 2026.
// Textes rédigés et traduits pour ce projet ; photos servies par les CDN de National Geographic.

const CDN = 'https://lumiere-a.akamaihd.net/v1/images/';
const PRESS = 'https://www.detpress.com/storage/uploads/';

/**
 * URL d'une image National Geographic redimensionnée par leur CDN. Les fichiers préfixés « press: » viennent
 * du site presse, qui redimensionne aussi à la demande (suffixe -<largeur>x0 avant l'extension).
 */
export const image = (file, width = 1600) =>
    file.startsWith('press:')
        ? `${PRESS}${file.slice(6).replace(/(\.\w+)$/, `-${width}x0$1`)}`
        : `${CDN}${file}?width=${width}`;

export const SOURCE = 'https://films.nationalgeographic.com/';

export const FILMS = [
    {
        slug: 'into-the-okavango',
        title: 'Into the Okavango',
        year: 2018,
        date: '22 avril 2018',
        director: 'Neil Gelinas',
        place: 'Delta de l’Okavango',
        country: 'Angola · Namibie · Botswana',
        lat: -19.3,
        lng: 22.9,
        world: 'Eau douce',
        accent: '#f2b33d',
        pitch: 'Quatre mois en pirogue, des sources angolaises jusqu’au delta.',
        synopsis: [
            'Le bassin de l’Okavango fait vivre près d’un million de personnes, la plus grande population d’éléphants d’Afrique, des lions, des guépards et des centaines d’espèces d’oiseaux. Mais cette oasis encore intacte subit une pression humaine croissante.',
            'Le film suit une équipe d’explorateurs pendant une expédition de quatre mois et 2 400 kilomètres, à travers trois pays, pour protéger les rivières qui nourrissent le delta, l’une des dernières grandes zones humides sauvages de la planète.',
        ],
        facts: [
            { value: '1 million', label: 'de personnes vivent de l’eau du bassin' },
            { value: '2 400 km', label: 'parcourus en mokoro, la pirogue locale' },
            { value: '95 %', label: 'de l’eau du delta vient des hauts plateaux angolais' },
        ],
        poster: 'docfilmswebsite_1080x1600_okavango_3a6c3ca3.jpeg', // affiche officielle, portrait 2:3
        hero: 'intotheokavango_hero_e8b99097.jpeg',
        thumb: ['intotheokavango_ngm_42_1be68c4f.jpeg', '45% 50%'], // vignette du globe, choisie à l'œil
        gallery: [
            [
                'intotheokavango_ngm_42_1be68c4f.jpeg',
                'Un groupe d’éléphants traverse les eaux de crue annuelles, descendues des hauts plateaux angolais.',
                'Cory Richards',
            ],
            [
                'intotheokavango_ngm_47_e543ecc8.jpeg',
                'Près de Huambo, l’équipe met à l’eau pour la partie fluviale de l’expédition.',
                'Pete Muller',
            ],
            [
                'intotheokavango_ngm_01_3c703783.jpeg',
                'Un incendie embrase la plaine inondable face au bivouac, sur la rivière Cuito.',
                'James Kydd',
            ],
            [
                'intotheokavango_ngm_39_03f630f4.jpeg',
                'Des tantales ibis survolent l’Okavango.',
                'Cory Richards',
            ],
            [
                'intotheokavango_ngm_19_57bbee3f.jpeg',
                'Steve Boyes et Neil Gelinas chassent des nuées d’abeilles après une longue journée sur l’eau.',
                'Cory Richards',
            ],
            [
                'intotheokavango_ngm_40_973662f6.jpeg',
                'Une famille de babouins sur une termitière, aux dernières lueurs du jour.',
                'Cory Richards',
            ],
        ],
        people: [
            {
                name: 'Steve Boyes',
                role: 'Explorateur National Geographic',
                bio: 'Biologiste de la conservation, il dirige l’Okavango Wilderness Project et mène l’expédition depuis les sources angolaises jusqu’au delta.',
            },
            {
                name: 'Neil Gelinas',
                role: 'Réalisateur',
                bio: 'Cinéaste et explorateur, il filme l’expédition de l’intérieur, au rythme des pirogues.',
            },
        ],
        reviews: [],
        actions: [
            {
                label: 'Okavango Wilderness Project',
                url: 'https://www.nationalgeographic.org/projects/okavango/',
                text: 'Le programme de la National Geographic Society qui protège le bassin.',
            },
            {
                label: 'Okavango Eternal',
                url: 'https://nationalgeographic.org/explore/programs/okavango',
                text: 'Partenariat de dix ans pour préserver les sources du delta.',
            },
        ],
        credits: [
            ['Réalisation', 'Neil Gelinas'],
            ['Production', 'National Geographic Documentary Films'],
        ],
    },
    {
        slug: 'sea-of-shadows',
        title: 'Sea of Shadows',
        year: 2019,
        date: '12 juillet 2019',
        director: 'Richard Ladkani',
        place: 'Mer de Cortés',
        country: 'Mexique',
        lat: 31.0,
        lng: -114.6,
        world: 'Océan',
        accent: '#4fc3c9',
        pitch: 'Une course contre la montre pour sauver le plus petit cétacé du monde.',
        synopsis: [
            'Dans la mer de Cortés, cartels mexicains et trafiquants chinois s’associent pour pêcher le totoaba, un poisson dont la vessie natatoire vaut une fortune. Leurs filets dérivants menacent toute la vie marine de la région, dont le vaquita, le marsouin le plus rare de la planète.',
            'Scientifiques, défenseurs de l’environnement, journalistes d’investigation, agents infiltrés et marine mexicaine risquent leur vie pour sauver les derniers vaquitas. Un documentaire au rythme d’un thriller, prix du public au festival de Sundance.',
        ],
        facts: [
            { value: '< 15', label: 'vaquitas encore observés lors des derniers recensements' },
            { value: '1,5 m', label: 'de long : le plus petit cétacé du monde' },
            { value: 'Sundance', label: 'prix du public 2019' },
        ],
        poster: 'docfilmswebsite_1080x1600_sos_ec1ddec1.jpeg', // affiche officielle, portrait 2:3
        hero: 'sos-1900x792_2b2a5bbd.png',
        thumb: ['sos-1900x792_2b2a5bbd.png', '40% 50%'], // vignette du globe, choisie à l'œil
        gallery: [
            [
                'sos_07_45526f12.jpeg',
                'Un vaquita sous l’eau, l’un des derniers de son espèce.',
                'National Geographic',
            ],
            [
                'sos_01_05913518.jpeg',
                'Un navire de Sea Shepherd patrouille dans les eaux côtières.',
                'National Geographic',
            ],
            [
                'sos_02_b2c0e5a0.jpeg',
                'Jack Hutton examine un totoaba mort avec deux marins mexicains.',
                'National Geographic',
            ],
            ['sos_03_d9d4f3ca.jpeg', 'Un totoaba pris dans un filet.', 'National Geographic'],
            ['sos_04_babb6a62.jpeg', 'Un dépôt de filets fantômes récupérés en mer.', 'National Geographic'],
            [
                'sos_06_5b0bba4e.jpeg',
                'La marine mexicaine se prépare à traquer les braconniers.',
                'National Geographic',
            ],
        ],
        people: [
            {
                name: 'Richard Ladkani',
                role: 'Réalisateur et chef opérateur',
                photo: 'bio-richard_6ae583dd.jpeg',
                bio: 'Auteur de « The Ivory Game », présélectionné aux Oscars, il filme au plus près de l’action, comme si on y était.',
            },
            {
                name: 'Andrea Crosta',
                role: 'Earth League International',
                photo: 'bio-andrea_1214b22a.jpeg',
                bio: 'Il infiltre les réseaux de trafic d’espèces sauvages pour remonter jusqu’à leurs commanditaires.',
            },
            {
                name: 'Carlos Loret de Mola',
                role: 'Journaliste d’investigation',
                photo: 'carlos_4866c157.jpeg',
                bio: 'Figure majeure de la télévision mexicaine, il enquête sur la corruption qui protège le trafic.',
            },
            {
                name: 'Cynthia Smith',
                role: 'Vaquita CPR',
                photo: 'bio-cynthia_824eac32.jpeg',
                bio: 'Vétérinaire, elle tente un plan de sauvetage de la dernière chance : capturer des vaquitas pour les protéger.',
            },
            {
                name: 'Jack Hutton',
                role: 'Pilote de drone, Sea Shepherd',
                photo: 'bio-jack_7fa9f39c.jpeg',
                bio: 'Depuis le ciel, il repère les filets illégaux et les bateaux des braconniers.',
            },
        ],
        reviews: [
            {
                quote: 'Un drame haletant, plein de coups de feu, de cartels et de corruption.',
                source: 'The New York Times',
            },
            {
                quote: 'Une aventure bouleversante, aussi inspirante que déchirante.',
                source: 'The Hollywood Reporter',
            },
            { quote: 'Un réquisitoire qui prend aux tripes.', source: 'Variety' },
        ],
        actions: [
            {
                label: 'Earth League International',
                url: 'https://earthleagueinternational.org/',
                text: 'Enquêtes contre le trafic d’espèces sauvages.',
            },
            {
                label: 'Vaquita CPR',
                url: 'https://www.vaquitacpr.org/',
                text: 'Le programme scientifique de sauvetage du vaquita.',
            },
            {
                label: 'Sea Shepherd · Opération Milagro',
                url: 'https://seashepherd.org/campaigns/milagro/',
                text: 'Le retrait des filets illégaux dans la mer de Cortés.',
            },
            {
                label: 'Guide de discussion',
                url: 'https://www.nationalgeographic.com/content/dam/ngdotcom/rights-exempt/films/seaofshadows/seaofshadows_discussionguide_2019.pdf',
                text: 'Pour débattre du film en classe ou en groupe (PDF, en anglais).',
            },
        ],
        credits: [
            ['Réalisation et image', 'Richard Ladkani'],
            ['Production', 'Walter Köhler, Wolfgang Knöpfler'],
            ['Montage', 'Georg Fischer, Verena Schönauer'],
            ['Musique', 'H. Scott Salinas'],
            ['Production exécutive', 'Leonardo DiCaprio, Jennifer Davisson, Phillip Watson, Scott Z. Burns'],
        ],
    },
    {
        slug: 'the-last-ice',
        title: 'The Last Ice',
        year: 2020,
        date: '2020',
        director: 'Scott Ressler',
        place: 'Pikialasorsuaq',
        country: 'Canada · Groenland',
        lat: 77.0,
        lng: -72.0,
        world: 'Glace',
        accent: '#9fd8ff',
        pitch: 'Quand la banquise fond, tout un peuple défend son océan gelé.',
        synopsis: [
            'Entre le Canada et le Groenland, la banquise fond. Le monde extérieur y voit des occasions inédites : pétrole et gaz, routes maritimes plus courtes, tourisme, pêche. Mais pour plus de 100 000 Inuit qui vivent sur et autour de l’océan gelé, c’est tout un mode de vie qui est en jeu.',
            'Réalisé par Scott Ressler et produit par Enric Sala, fondateur de Pristine Seas, le film raconte le combat des communautés inuit pour protéger l’Arctique, leur foyer depuis des siècles.',
        ],
        facts: [
            { value: '100 000+', label: 'Inuit vivent autour de l’océan gelé' },
            { value: '2', label: 'pays, un seul peuple de part et d’autre de la glace' },
            { value: 'Pristine Seas', label: 'le programme de National Geographic pour protéger les océans' },
        ],
        poster: 'thelastice-poster_1080x1600_68f3c53e.jpeg', // affiche officielle, portrait 2:3
        hero: 'the-last-ice_bg_desktop_79a50875.jpeg',
        thumb: ['thelastice_aleqatsiaq_peary_d6259274.jpeg', '55% 50%'], // vignette du globe, choisie à l'œil
        gallery: [
            [
                '86059484ca1e2e52789192510cf4702f_4096x2304_8dc4b471.jpeg',
                'La banquise entre le Canada et le Groenland.',
                'National Geographic',
            ],
            [
                'thelastice_aleqatsiaq_peary_d6259274.jpeg',
                'Aleqatsiaq Peary, musicien et chasseur à Qaanaaq.',
                'National Geographic',
            ],
            [
                'thelastice_maatalii_okalik_54f550a5.jpeg',
                'Maatalii Okalik, porte-voix de la jeunesse inuit.',
                'National Geographic',
            ],
        ],
        people: [
            {
                name: 'Maatalii Okalik',
                role: 'Militante inuit',
                photo: 'thelastice_maatalii_okalik_54f550a5.jpeg',
                bio: 'Originaire de Panniqtuuq, au Nunavut, elle défend les droits de la jeunesse inuit au Canada et à l’international.',
            },
            {
                name: 'Aleqatsiaq Peary',
                role: 'Musicien et chasseur',
                photo: 'thelastice_aleqatsiaq_peary_d6259274.jpeg',
                bio: 'Il vit à Qaanaaq, au Groenland, l’une des villes les plus au nord du monde.',
            },
            {
                name: 'Scott Ressler',
                role: 'Réalisateur',
                photo: 'scott_ressler_191015_0250_a82b126a.jpeg',
                bio: 'Après dix ans à filmer les océans pour la National Geographic Society, il signe ici son premier long métrage.',
            },
            {
                name: 'Enric Sala',
                role: 'Producteur exécutif',
                photo: 'nationalgeographic_2729972_7171cd13.jpeg',
                bio: 'Ancien professeur devenu explorateur en résidence, il a fondé Pristine Seas pour protéger les derniers océans sauvages.',
            },
        ],
        reviews: [],
        actions: [
            {
                label: 'Pristine Seas',
                url: 'https://www.nationalgeographic.org/projects/pristine-seas/',
                text: 'Le programme qui aide à créer des aires marines protégées dans le monde.',
            },
        ],
        credits: [
            ['Réalisation', 'Scott Ressler'],
            ['Production exécutive', 'Enric Sala'],
            ['Montage et postproduction', 'Brian Newell'],
        ],
    },
    {
        slug: 'endurance',
        title: 'Endurance',
        year: 2024,
        date: '2024',
        director: 'E. Chai Vasarhelyi, Jimmy Chin, Natalie Hewit',
        place: 'Mer de Weddell',
        country: 'Antarctique',
        lat: -68.73,
        lng: -52.33,
        world: 'Glace',
        accent: '#c9e4f2',
        pitch: 'Un siècle après le naufrage de Shackleton, retrouver l’épave sous la glace.',
        synopsis: [
            'En 1915, le navire de l’explorateur Ernest Shackleton est broyé par la banquise. Pendant plus d’un an, il parvient à garder en vie ses 27 hommes d’équipage, au cœur de l’Antarctique.',
            'Plus d’un siècle plus tard, une équipe d’explorateurs part à la recherche de l’épave. Le film entrelace ces deux expéditions, unies par la même ténacité.',
        ],
        facts: [
            { value: '3 008 m', label: 'de profondeur : là où dort l’épave' },
            { value: '107 ans', label: 'entre le naufrage et la découverte, en 2022' },
            { value: '27', label: 'hommes d’équipage, tous revenus vivants' },
        ],
        poster: 'endurance_cover_f1c2b981.jpeg', // affiche officielle, portrait 2:3
        hero: 'ng_endurance_desktop_1920x792_1f8a7b66.png',
        thumb: ['endurance_004_9e394935.jpeg', '50% 50%'], // vignette du globe, choisie à l'œil
        gallery: [
            [
                'endurance_004_9e394935.jpeg',
                'La poupe de l’Endurance, intacte au fond de la mer de Weddell.',
                'National Geographic',
            ],
            [
                'endurance_003_c60f4507.jpeg',
                'Le S.A. Agulhas II dans la glace, en route vers les coordonnées du naufrage.',
                'National Geographic',
            ],
            ['endurance_048_5dccb933.jpeg', 'Le brise-glace vu depuis la banquise.', 'National Geographic'],
            [
                'endurance_085_1c1ff33a.jpeg',
                'L’équipage pose avec le robot sous-marin qui a retrouvé l’épave.',
                'National Geographic',
            ],
            [
                'endurance_140_fc9dbc3a.jpeg',
                'Mensun Bound et John Shears sur la glace de l’Antarctique.',
                'Esther Horvath',
            ],
            [
                'endurance_129_aa812e65.jpeg',
                'La géomètre Maeva Onde à bord du S.A. Agulhas II.',
                'National Geographic',
            ],
        ],
        people: [
            {
                name: 'John Shears',
                role: 'Chef d’expédition',
                photo: 'john_shears_stockpkg_mm9903_220210-02326_7b4cc95c.jpeg',
                bio: 'Géographe polaire britannique, il dirige l’expédition Endurance22.',
            },
            {
                name: 'Mensun Bound',
                role: 'Archéologue marin',
                photo: 'mensun_bound_stockpkg_mm9903_220220-05939_00a6d2b1.jpeg',
                bio: 'Né aux Malouines, il consacre sa vie aux épaves et dirige l’exploration du navire.',
            },
            {
                name: 'Nico Vincent',
                role: 'Ingénieur sous-marin',
                photo: 'nicolas_vincent_stockpkg_mm9903_220209-01707_17b1413f.jpeg',
                bio: 'Trente ans de projets en eaux profondes et de nombreuses épaves célèbres à son actif.',
            },
            {
                name: 'Dan Snow',
                role: 'Historien',
                photo: 'dan_snow_d0dabd5c.jpeg',
                bio: 'Présentateur primé aux BAFTA, il raconte l’histoire à ceux qui la revivent.',
            },
        ],
        reviews: [],
        actions: [
            {
                label: 'Impact Guild',
                url: 'https://www.impact-guild.org/',
                text: 'Les actions associées à la sortie du film.',
            },
        ],
        credits: [
            ['Réalisation et production', 'E. Chai Vasarhelyi, Jimmy Chin, Natalie Hewit'],
            ['Production', 'Ruth Johnston'],
            ['Production et montage', 'Bob Eisenhardt'],
            ['Images d’archives', 'Frank Hurley'],
        ],
    },
    {
        slug: 'becoming-cousteau',
        title: 'Becoming Cousteau',
        year: 2021,
        date: '22 octobre 2021',
        director: 'Liz Garbus',
        place: 'Méditerranée',
        country: 'France',
        lat: 43.0,
        lng: 6.0,
        world: 'Océan',
        accent: '#e2574c',
        pitch: 'L’homme au bonnet rouge, qui nous a fait découvrir le monde du silence.',
        synopsis: [
            'Aventurier, cinéaste, inventeur et défenseur des océans : Jacques-Yves Cousteau a ouvert les fonds marins au monde entier. Le film retrace sa vie, ses films devenus légendaires, ses inventions et les épreuves qui l’ont forgé.',
            'Il montre aussi un Cousteau précurseur, qui alertait déjà sur le réchauffement des mers et dont l’héritage inspire encore ceux qui protègent la planète.',
        ],
        facts: [
            { value: '1943', label: 'il co-invente le scaphandre autonome' },
            { value: 'Palme d’or', label: 'à Cannes en 1956 pour « Le Monde du silence »' },
            { value: 'Calypso', label: 'le navire de toutes ses expéditions' },
        ],
        poster: 'becomingcousteau_1080x1620_2e6100f4.jpeg', // affiche officielle, portrait 2:3
        hero: 'cousteau-big-bg_cc204399.png',
        thumb: ['becomingcousteau_00015811_83bb0930.jpeg', '55% 50%'], // vignette du globe, choisie à l'œil
        gallery: [
            [
                '4fe70020f3ad75f9d4543ea0fdafcdbb_3813x4096_edc45d06.jpeg',
                'Jacques Cousteau en tenue de plongée, 1972.',
                'Yousuf Karsh',
            ],
            [
                'a14d69eddaa624396c1ad1dbc7ce1b73_4096x2778_32177551.jpeg',
                'L’équipage de la Calypso plonge pour une scène du « Monde du silence ».',
                'National Geographic',
            ],
            [
                'becomingcousteau_00015811_83bb0930.jpeg',
                'Le célèbre bonnet rouge, à bord de la Calypso, années 1970.',
                'The Cousteau Society',
            ],
            [
                '940c4b3463ddd2923c1f1def935c3fad_4096x2751_07a0f467.jpeg',
                'En expédition à bord de la Calypso, 1960.',
                'Luis Marden',
            ],
            [
                'becomingcousteau_00003339_bd3d643e.jpeg',
                'Il filme une épave en Méditerranée, 1943.',
                'The Cousteau Society',
            ],
            [
                '42509042792a7c41bb28cb07fd87c030_4096x2855_d0d2326b.jpeg',
                'Repas avec l’équipage pendant une expédition dans l’océan Indien, 1955.',
                'National Geographic',
            ],
        ],
        people: [
            {
                name: 'Liz Garbus',
                role: 'Réalisatrice et productrice',
                photo: 'liz-garbus_31b4f03e.jpeg',
                bio: 'Deux fois nommée aux Oscars, elle a notamment réalisé « What Happened, Miss Simone? ».',
            },
            {
                name: 'Dan Cogan',
                role: 'Producteur',
                photo: 'dan-cogan_4011195e.jpeg',
                bio: 'Oscarisé pour « Icarus », c’est l’un des producteurs de documentaires les plus en vue.',
            },
            {
                name: 'Mridu Chandra',
                role: 'Productrice',
                photo: 'mridu-chandra_0b056149.jpeg',
                bio: 'Cinéaste new-yorkaise dont les films ont été présentés à Sundance.',
            },
            {
                name: 'Evan Hayes',
                role: 'Producteur',
                photo: 'evan-hayes_860232e1.png',
                bio: 'Primé aux Oscars, aux BAFTA et aux Emmy, il a produit « Free Solo ».',
            },
        ],
        reviews: [
            {
                quote: 'Un portrait merveilleusement intime du légendaire océanographe.',
                source: 'The Hollywood Reporter',
            },
            {
                quote: 'Un plongeon éblouissant dans les profondeurs du monde sous-marin.',
                source: 'IndieWire',
            },
            { quote: 'Une introduction vivifiante pour ceux qui le découvrent.', source: 'Deadline' },
        ],
        actions: [
            {
                label: 'The Cousteau Society',
                url: 'https://www.cousteau.org',
                text: 'La fondation qui poursuit son œuvre.',
            },
            {
                label: 'Guide de discussion',
                url: 'https://lumiere-a.akamaihd.net/v1/documents/becomingcousteau_discussionguide_2021_0798032b.pdf',
                text: 'Pour débattre du film en classe ou en groupe (PDF, en anglais).',
            },
        ],
        credits: [
            ['Réalisation', 'Liz Garbus'],
            ['Production', 'Liz Garbus, Dan Cogan, Mridu Chandra, Evan Hayes'],
            ['Scénario', 'Mark Monroe, Pax Wassermann'],
            ['Montage', 'Pax Wassermann'],
        ],
    },
    {
        slug: 'the-rescue',
        title: 'The Rescue',
        year: 2021,
        date: '8 octobre 2021',
        director: 'E. Chai Vasarhelyi, Jimmy Chin',
        place: 'Grotte de Tham Luang',
        country: 'Thaïlande',
        lat: 20.38,
        lng: 99.87,
        world: 'Grotte noyée',
        accent: '#f08a3c',
        pitch: 'Treize vies piégées sous la montagne, et des plongeurs pour aller les chercher.',
        synopsis: [
            'En juin 2018, douze jeunes footballeurs et leur entraîneur se retrouvent piégés par la mousson au fond de la grotte de Tham Luang, en Thaïlande. Le monde entier retient son souffle.',
            'Grâce à des images inédites, le film raconte le sauvetage du point de vue de ceux qui l’ont mené, en particulier une poignée de plongeurs spéléologues amateurs, prêts à tout risquer dans des galeries noyées et obscures.',
        ],
        facts: [
            { value: '13', label: 'personnes piégées : 12 enfants et leur entraîneur' },
            { value: '18 jours', label: 'sous la montagne avant la sortie du dernier' },
            { value: '4 km', label: 'de galeries, en partie noyées, jusqu’au groupe' },
        ],
        poster: 'therescue-poster_1080x1600_e9ca44a1.jpeg', // affiche officielle, portrait 2:3
        hero: 'signal-2021-09-27-144025_001_db43b4b2.jpeg',
        thumb: ['therescue_sg_016_de7a36d3.jpeg', '45% 50%'], // vignette du globe, choisie à l'œil
        gallery: [
            ['therescue_sg_001_6b421197.jpeg', 'Un plongeur dans une grotte noyée.', 'National Geographic'],
            [
                'therescue_sg_009_f6d07caa.jpeg',
                'Seule une lampe frontale guide le plongeur.',
                'National Geographic',
            ],
            [
                'therescue_sg_026_ff0bbd4c.jpeg',
                'Rick Stanton et John Volanthen dans la grotte.',
                'National Geographic',
            ],
            ['therescue_sg_016_de7a36d3.jpeg', 'Rick Stanton se prépare à plonger.', 'National Geographic'],
            ['therescue_sg_015_5d6f6861.jpeg', 'Un plongeur émerge de l’eau.', 'National Geographic'],
            ['therescue_sg_007_49a3f129.jpeg', 'Jason Mallinson.', 'National Geographic'],
        ],
        people: [
            {
                name: 'E. Chai Vasarhelyi',
                role: 'Réalisatrice et productrice',
                photo: '855e45303b42c78fb0a2f27fc24e714a_2730x4096_f69bb69c.jpeg',
                bio: 'Oscarisée pour « Free Solo », elle filme des exploits humains hors du commun.',
            },
            {
                name: 'Jimmy Chin',
                role: 'Réalisateur et producteur',
                photo: 'jimmychin_38_8f5b043d.jpeg',
                bio: 'Photographe pour National Geographic, alpiniste et skieur de l’extrême, oscarisé pour « Free Solo ».',
            },
            {
                name: 'John Volanthen',
                role: 'Plongeur spéléologue',
                photo: 'john_volanthen_39f0028a.jpeg',
                bio: 'Consultant en informatique, il fait partie des plongeurs qui ont retrouvé les enfants.',
            },
            {
                name: 'Richard Harris',
                role: 'Médecin et plongeur',
                photo: 'drrichardharris_ae92a40b.jpeg',
                bio: 'Anesthésiste australien, il a rendu possible l’évacuation des enfants sous l’eau.',
            },
            {
                name: 'Thanet Natisri',
                role: 'Expert des eaux souterraines',
                photo: 'thanet_headshot_bf5b6ef8.jpeg',
                bio: 'Il a aidé à détourner l’eau de la montagne pour gagner un temps précieux.',
            },
        ],
        reviews: [
            { quote: 'Un documentaire haletant, qui vous noue l’estomac.', source: 'IndieWire' },
            {
                quote: 'Un film qui célèbre l’humanité dans ce qu’elle a de plus généreux.',
                source: 'Variety',
            },
            { quote: 'Incroyablement émouvant et palpitant.', source: 'RogerEbert.com' },
        ],
        actions: [],
        credits: [
            ['Réalisation', 'E. Chai Vasarhelyi, Jimmy Chin'],
            ['Production', 'P.J. van Sandwijk, John Battsek, E. Chai Vasarhelyi, Jimmy Chin'],
            ['Image', 'David Katznelson, Picha Srisansanee, Ian Seabrook'],
            ['Montage', 'Bob Eisenhardt'],
            ['Musique', 'Daniel Pemberton'],
        ],
    },
    {
        slug: 'playing-with-sharks',
        title: 'Playing with Sharks',
        year: 2021,
        date: '23 juillet 2021',
        director: 'Sally Aitken',
        place: 'Côtes australiennes',
        country: 'Australie',
        lat: -35.0,
        lng: 136.0,
        world: 'Requins',
        accent: '#4fb3c8',
        page: null, // pas de page sur films.nationalgeographic.com
        pitch: 'Valerie Taylor, pionnière de la plongée, passée de la chasse aux requins à leur défense.',
        synopsis: [
            'Pionnière du cinéma sous-marin et de l’étude des requins, l’Australienne Valerie Taylor est une légende vivante du monde de la plongée : son travail est à la base d’une grande partie de ce que l’on sait aujourd’hui des requins.',
            'Grâce à des archives sous-marines remarquables et à ses propres témoignages, Sally Aitken retrace le parcours de cette exploratrice intrépide, de championne de chasse sous-marine à ardente protectrice des requins : des débuts de la plongée en cage à l’hystérie des « Dents de la mer », jusqu’à la plongée sans cage.',
        ],
        facts: [
            { value: 'Années 60', label: 'championne de chasse sous-marine, avant de défendre les requins' },
            { value: '1974', label: 'avec Ron Taylor, elle filme les vrais requins des « Dents de la mer »' },
            { value: 'Sundance', label: 'le film y est présenté en 2021' },
        ],
        poster: 'press:AD/B4/ADB4E513-6FA0-7805-2389-29ABBB1210FB/Playing-With-Sharks_Key-Art-Hero.jpg',
        hero: 'press:A0/D7/A0D74809-4699-77CC-A60D-D89FB00F75CC/PlayingWithSharks_45.jpg',
        thumb: ['press:A0/D7/A0D74809-4699-77CC-A60D-D89FB00F75CC/PlayingWithSharks_45.jpg', '50% 50%'],
        gallery: [
            [
                'press:A0/D7/A0D74809-4699-77CC-A60D-D89FB00F75CC/PlayingWithSharks_45.jpg',
                'Valerie Taylor tend la main vers un grand requin blanc depuis le bateau, dans les années 1970.',
                'Ron & Valerie Taylor',
            ],
            [
                'press:B7/8E/B78E1056-7826-8877-28B9-65CF7C9A3271/PlayingWithSharks_46.jpg',
                'En cotte de mailles, Valerie se laisse mordre au bras par un requin, en 1982.',
                'Ron & Valerie Taylor',
            ],
            [
                'press:AE/C8/AEC89BC7-BE18-D5EE-C317-875F31A543C9/PlayingWithSharks_47.jpg',
                'Sur le tournage des « Dents de la mer », à côté du requin factice, en 1974.',
                'Ron & Valerie Taylor',
            ],
            [
                'press:6B/59/6B596230-9295-9A58-0A33-D75753798479/PlayingWithSharks_54.jpg',
                'Valerie Taylor en plongée, fusil-harpon à la main, en 1961.',
                'Ron & Valerie Taylor',
            ],
            [
                'press:10/61/10615210-86E7-AE0C-1078-FBBFC70C7BA9/PlayingWithSharks_59.jpg',
                'Un requin à contre-jour sous la surface, vers 1971.',
                'Ron & Valerie Taylor',
            ],
            [
                'press:63/8C/638CC2E4-3D66-395F-F392-88B2EB174685/PlayingWithSharks_56_copy.jpg',
                'Ron et Valerie Taylor encadrés par une mâchoire de requin.',
                'Ron & Valerie Taylor',
            ],
        ],
        people: [
            {
                name: 'Valerie Taylor',
                role: 'Plongeuse et cinéaste',
                bio: 'Pionnière du cinéma sous-marin, elle a consacré sa vie à faire connaître et protéger les requins.',
            },
            {
                name: 'Sally Aitken',
                role: 'Réalisatrice',
                bio: 'Deux fois nommée aux Emmy Awards, elle signe le portrait de cette légende de la plongée.',
            },
            {
                name: 'Sylvia Earle',
                role: 'Biologiste marine',
                photo: 'press:40/5C/405CF538-9084-B0F0-D9D7-64C95D20C6D7/PlayingWithSharks_DrSylviaEarle.jpg',
                bio: 'Exploratrice en résidence de National Geographic depuis 1998, elle témoigne dans le film.',
            },
            {
                name: 'Jean-Michel Cousteau',
                role: 'Explorateur océanographique',
                photo: 'press:6D/F7/6DF7AEE4-7DBE-3CE5-6F6B-E8F33AF51A32/PlayingWithSharks_Jean-MichelCousteau.jpg',
                bio: 'Fils aîné de Jacques-Yves Cousteau, il a croisé la route des Taylor dans les années de la plongée pionnière.',
            },
        ],
        reviews: [],
        actions: [],
        credits: [
            ['Réalisation et scénario', 'Sally Aitken'],
            ['Production', 'Bettina Dalton, WildBear Entertainment'],
            ['Images d’archives', 'Ron & Valerie Taylor'],
        ],
    },
    {
        slug: 'secrets-of-the-whales',
        title: 'Secrets of the Whales',
        year: 2021,
        date: '22 avril 2021',
        director: 'Série produite par James Cameron',
        place: 'Faial, Açores',
        country: 'Portugal',
        lat: 38.58,
        lng: -28.7,
        world: 'Baleines',
        accent: '#6f9cf0',
        page: 'https://www.disneyplus.com/browse/entity-214a64b8-2468-4d71-a712-172b53e41e90',
        pitch: 'Au cœur de la culture des baleines : cinq espèces, leurs langages et leurs familles.',
        synopsis: [
            'La série plonge au cœur de la culture des baleines pour découvrir les extraordinaires capacités de communication et les structures sociales complexes de cinq espèces : orques, baleines à bosse, bélugas, narvals et cachalots.',
            'Filmé pendant trois ans dans vingt-quatre lieux, ce voyage révèle des animaux bien plus complexes, et bien plus proches de nous, qu’on ne l’imaginait.',
        ],
        facts: [
            { value: '5 espèces', label: 'orques, baleines à bosse, bélugas, narvals et cachalots' },
            { value: '24 lieux', label: 'de tournage à travers les océans' },
            { value: '3 ans', label: 'de tournage' },
        ],
        poster: 'press:F5/87/F5875C0E-8D37-4A45-B189-C7EF3C95715F/Secrets-of-the-Whales-2021_Key-Art-Hero.jpg',
        hero: 'press:A7/A3/A7A31C87-462B-A3BD-A0FC-98518D83190C/Ep101_SecretsOfTheWhales_016.jpg',
        thumb: [
            'press:AA/03/AA03E7DD-AAD6-A6D6-45AF-CF1F974B6238/SecretsOfTheWhales_NGSF000003_190625__67259.jpg',
            '50% 50%',
        ],
        gallery: [
            [
                'press:AA/03/AA03E7DD-AAD6-A6D6-45AF-CF1F974B6238/SecretsOfTheWhales_NGSF000003_190625__67259.jpg',
                'Une famille de cachalots se retrouve sous l’eau, au large de l’île de Faial, aux Açores.',
                'Brian Skerry',
            ],
            [
                'press:8C/98/8C987255-0492-6E0C-F5F6-529A6349757E/SecretsOfTheWhales_NGSF000003_190920__120696.jpg',
                'Une mère baleine à bosse et son petit, escortés par deux mâles, au large de Rarotonga, îles Cook.',
                'Brian Skerry',
            ],
            [
                'press:D9/7C/D97C783F-A8CD-5267-EC62-19C5D395C7A1/SecretsOfTheWhales_NGSF000003_190406__66056_F2.jpg',
                'Un grand cachalot mâle au large du Sri Lanka.',
                'Brian Skerry',
            ],
            [
                'press:A7/A3/A7A31C87-462B-A3BD-A0FC-98518D83190C/Ep101_SecretsOfTheWhales_016.jpg',
                'Une orque de Nouvelle-Zélande pose avec sa proie devant l’objectif de Brian Skerry.',
                'Brian Skerry',
            ],
        ],
        people: [
            {
                name: 'Brian Skerry',
                role: 'Photographe et explorateur National Geographic',
                bio: 'Photographe sous-marin, il a passé trois ans auprès des baleines pour la série.',
            },
            {
                name: 'Sigourney Weaver',
                role: 'Narration',
                bio: 'L’actrice prête sa voix au récit, en version originale.',
            },
            {
                name: 'James Cameron',
                role: 'Producteur exécutif',
                bio: 'Cinéaste et explorateur des grands fonds, il produit la série.',
            },
        ],
        reviews: [],
        actions: [],
        credits: [
            ['Production exécutive', 'James Cameron'],
            ['Photographie', 'Brian Skerry'],
            ['Narration', 'Sigourney Weaver'],
        ],
    },
    {
        slug: 'secrets-of-the-octopus',
        title: 'Secrets of the Octopus',
        year: 2024,
        date: '21 avril 2024',
        director: 'Série produite par James Cameron',
        place: 'Parc marin de Bunaken',
        country: 'Indonésie',
        lat: 1.62,
        lng: 124.76,
        world: 'Récif',
        accent: '#e0703a',
        page: null,
        pitch: 'Trois cœurs, un sang bleu, et une intelligence qui défie l’imagination.',
        synopsis: [
            'Les pieuvres sont comme des extraterrestres sur Terre : trois cœurs, un sang bleu et la capacité de se glisser dans un espace pas plus grand que leur œil. Mais ces animaux étranges et merveilleux cachent bien davantage.',
            'Assez intelligentes pour utiliser des outils, transformer leur corps pour imiter d’autres animaux, ou même communiquer avec d’autres espèces : les secrets de la pieuvre sont plus extraordinaires qu’on ne l’imaginait. La série prolonge « Secrets of the Whales ».',
        ],
        facts: [
            { value: '3 cœurs', label: 'et un sang bleu' },
            { value: 'Outils', label: 'certaines pieuvres s’en servent pour se protéger ou chasser' },
            { value: 'Mimétisme', label: 'elles changent de forme pour imiter d’autres animaux' },
        ],
        poster: 'press:F5/09/F5096B25-D7B5-C1A8-4E6A-C44661DE17E9/Secrets-of-the-Octopus-2024_Key-Art-Hero-2.jpg',
        hero: 'press:DF/DE/DFDE5014-6529-B446-5CBD-3F4CAAD7F4D7/103_SecretsOfTheOctopus_31_R.jpg',
        thumb: ['press:AB/70/AB70BEDF-758C-D7FA-4D76-69A81DAB0AAB/103_SecretsOfTheOctopus_14.jpg', '50% 50%'],
        gallery: [
            [
                'press:DF/DE/DFDE5014-6529-B446-5CBD-3F4CAAD7F4D7/103_SecretsOfTheOctopus_31_R.jpg',
                'Une pieuvre de jour déploie ses bras et sa palmure sur un massif de corail : aucune proie ne s’échappe.',
                'National Geographic/Craig Parry',
            ],
            [
                'press:AB/70/AB70BEDF-758C-D7FA-4D76-69A81DAB0AAB/103_SecretsOfTheOctopus_14.jpg',
                'Une pieuvre des algues dans son repaire, parc marin de Bunaken.',
                'National Geographic/Annabel Robinson',
            ],
            [
                'press:E1/60/E16053DA-9D60-2B1B-B578-77384F45C40F/103_SecretsOfTheOctopus_15.jpg',
                'Une pieuvre des algues fouille les algues et les herbiers de Bunaken.',
                'National Geographic/Annabel Robinson',
            ],
            [
                'press:00/21/00215FDB-F88C-8AAB-0FC3-6BC383BFB618/103_SecretsOfTheOctopus_27.jpg',
                'La chercheuse Alex Schnell observe une pieuvre de jour sur la Grande Barrière de corail.',
                'National Geographic/Craig Parry',
            ],
            [
                'press:BE/A7/BEA78EF2-AD90-07C7-60F0-1FD00A3325F4/103_SecretsOfTheOctopus_16.jpg',
                'En plongée, Crissy Huffard observe une pieuvre des algues dans son repaire.',
                'National Geographic/Annabel Robinson',
            ],
            [
                'press:07/4C/074C467B-FA87-25DF-D194-D8EA1F31F43F/103_SecretsOfTheOctopus_22.jpg',
                'Tournage sur la Grande Barrière de corail, royaume de la pieuvre de jour.',
                'National Geographic/Harriet Spark',
            ],
        ],
        people: [
            {
                name: 'Alex Schnell',
                role: 'Chercheuse',
                bio: 'Spécialiste de l’intelligence animale, elle suit les pieuvres de jour de la Grande Barrière de corail.',
            },
            {
                name: 'Crissy Huffard',
                role: 'Chercheuse',
                bio: 'Spécialiste des pieuvres, elle étudie la pieuvre des algues dans le parc marin de Bunaken.',
            },
            {
                name: 'Paul Rudd',
                role: 'Narration',
                bio: 'L’acteur prête sa voix au récit, en version originale.',
            },
        ],
        reviews: [],
        actions: [],
        credits: [
            ['Production exécutive', 'James Cameron'],
            ['Narration', 'Paul Rudd'],
        ],
    },
    {
        slug: 'ocean-with-david-attenborough',
        title: 'Ocean with David Attenborough',
        year: 2025,
        date: '8 mai 2025',
        director: 'Keith Scholey, Toby Nowlan, Colin Butfield',
        place: 'Atoll de Midway',
        country: 'Océan Pacifique',
        lat: 28.21,
        lng: -177.38,
        world: 'Haute mer',
        accent: '#38b3a8',
        page: null,
        pitch: 'David Attenborough et l’océan : rien n’est plus vital, ni plus capable de renaître.',
        synopsis: [
            'Avec « Ocean », David Attenborough montre qu’il n’existe pas de lieu plus vital pour notre survie, ni plus riche de vie et de surprises, que l’océan. Sa vie a coïncidé avec le grand âge de la découverte des mers.',
            'Des récifs coralliens aux forêts de kelp et à la haute mer, le film révèle pourquoi un océan en bonne santé garde toute la planète stable, et expose comme jamais le chalutage destructeur et le blanchissement des coraux. Mais son message est optimiste : l’océan peut se rétablir au-delà de tout ce qu’on a connu.',
        ],
        facts: [
            { value: '3 mondes', label: 'récifs coralliens, forêts de kelp et haute mer' },
            { value: 'Chalutage', label: 'les dégâts du chalutage de fond filmés comme jamais' },
            { value: 'Espoir', label: 'protégé, l’océan peut se rétablir' },
        ],
        poster: 'press:20/28/2028F803-499C-D419-D29F-F3E202D10D25/OCEAN_DA_v2_1180x800_SHOW1_PAGE.jpg',
        hero: 'press:4E/16/4E16DDAC-5015-9E60-565B-C45393EEEFE3/OceanWithDavidAttenborough_003.jpg',
        thumb: [
            'press:4E/16/4E16DDAC-5015-9E60-565B-C45393EEEFE3/OceanWithDavidAttenborough_003.jpg',
            '50% 50%',
        ],
        gallery: [
            [
                'press:4E/16/4E16DDAC-5015-9E60-565B-C45393EEEFE3/OceanWithDavidAttenborough_003.jpg',
                'Les récifs coralliens de Raja Ampat, en Indonésie.',
                'Olly Scholey',
            ],
            [
                'press:B5/22/B5229596-1D43-9F3D-AF04-9EFD6FCD3221/OceanWithDavidAttenborough_016.jpg',
                'Une forêt de kelp géant dans les îles Anglo-Normandes de Californie.',
                'Olly Scholey',
            ],
            [
                'press:C4/A4/C4A4C0C2-D2AF-C358-11C9-AF1F04673BC8/OceanWithDavidAttenborough_029.jpg',
                'Une mère baleine bleue et son petit dans le golfe de Californie, au Mexique.',
                'Olly Scholey',
            ],
            [
                'press:14/16/1416CFA5-CE50-F845-0BDC-11C3F385D704/OceanWithDavidAttenborough_056.jpg',
                'Un banc de poissons en boule, en haute mer près des Açores.',
                'Silverback Films et Open Planet Studios/Doug Anderson',
            ],
            [
                'press:DF/7D/DF7DE775-FBC1-214D-17BC-C8AFB334F01B/OceanWithDavidAttenborough_030.jpg',
                'Une colonie d’albatros de Laysan sur l’atoll de Midway.',
                'Silverback Films et Open Planet Studios/Toby Nowlan',
            ],
            [
                'press:33/BD/33BDA3C3-B856-98F1-58CE-3853EACAB7D9/OceanWithDavidAttenborough_057.jpg',
                'David Attenborough sur la côte du sud de l’Angleterre.',
                'Silverback Films et Open Planet Studios/Keith Scholey',
            ],
        ],
        people: [
            {
                name: 'David Attenborough',
                role: 'Naturaliste et narrateur',
                bio: 'Figure de l’histoire naturelle à la télévision, il raconte une vie passée à voir l’océan se révéler, et souffrir.',
            },
            {
                name: 'Keith Scholey',
                role: 'Coréalisateur',
                bio: 'Cofondateur de Silverback Films, il cosigne le film avec Toby Nowlan et Colin Butfield.',
            },
        ],
        reviews: [],
        actions: [],
        credits: [
            ['Réalisation', 'Keith Scholey, Toby Nowlan, Colin Butfield'],
            ['Production', 'Silverback Films, Open Planet Studios, National Geographic'],
            ['Narration', 'David Attenborough'],
        ],
    },
];

export const filmBySlug = (slug) => FILMS.find((f) => f.slug === slug);

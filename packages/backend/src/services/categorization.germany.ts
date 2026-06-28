/**
 * 🇩🇪 BASE DE CONHECIMENTO - MERCADO ALEMÃO (Deutschland)
 *
 * Espelha EXATAMENTE a taxonomia brasileira (mesmas category/subcategory/icon/color),
 * mudando apenas keywords e brands para o mercado alemão. Assim os budgets, gráficos
 * e a UI funcionam igual independentemente do país selecionado na importação.
 *
 * Para refinar: basta acrescentar brands/keywords reais que aparecem nos extratos.
 */
import type { CategoryRule } from './categorization.service';

export const GERMAN_CATEGORY_RULES: CategoryRule[] = [
  // 🛒 SUPERMÄRKTE (Supermercado / Compras de Mercado)
  {
    category: 'Supermercado',
    subcategory: 'Compras de Mercado',
    keywords: ['supermarkt', 'lebensmittel', 'markt', 'discounter', 'wochenmarkt'],
    brands: [
      'rewe', 'edeka', 'aldi', 'aldi sud', 'aldi süd', 'aldi nord', 'lidl', 'kaufland',
      'netto', 'penny', 'real', 'globus', 'norma', 'tegut', 'marktkauf', 'nahkauf',
      'famila', 'combi', 'hit', 'denns', 'denn s', 'biocompany', 'bio company', 'alnatura',
      'v-markt', 'v markt', 'wasgau', 'feneberg', 'kupsch',
    ],
    icon: '🛒',
    color: '#4CAF50',
    priority: 8,
  },

  // 🍕 RESTAURANTS & LIEFERDIENSTE (Alimentação / Restaurantes e Delivery)
  {
    category: 'Alimentação',
    subcategory: 'Restaurantes e Delivery',
    keywords: [
      'restaurant', 'imbiss', 'doner', 'döner', 'gaststatte', 'gaststätte', 'bistro',
      'lieferdienst', 'lieferung', 'pizzeria', 'kantine', 'food', 'takeaway',
    ],
    brands: [
      'lieferando', 'wolt', 'uber eats', 'ubereats', 'mcdonalds', 'mc donalds', 'burger king',
      'kfc', 'subway', 'vapiano', 'nordsee', 'l osteria', 'losteria', 'hans im gluck',
      'hans im glück', 'dominos', 'domino s', 'pizza hut', 'five guys', 'dean david',
      'starbucks', 'coffee fellows', 'backwerk', 'asia', 'sushi', 'block house', 'maredo',
      'peter pane', 'sausalitos', 'enchilada',
    ],
    icon: '🍕',
    color: '#FF5722',
    priority: 8,
  },

  // 🥖 BÄCKEREI (Alimentação / Padaria)
  {
    category: 'Alimentação',
    subcategory: 'Padaria',
    keywords: ['backerei', 'bäckerei', 'konditorei', 'brot', 'baeckerei'],
    brands: [
      'kamps', 'back factory', 'back-factory', 'ditsch', 'le crobag', 'der beck', 'wiener feinbacker',
      'wiener feinbäcker', 'steinecke', 'k&u', 'ku backerei', 'goldilocks', 'junge', 'dat backhus',
      'baeckerei', 'backerei', 'bäckerei', 'konditorei', 'stadtbackerei',
    ],
    icon: '🥖',
    color: '#D2691E',
    priority: 9,
  },

  // 🦷 ZAHNARZT (Saúde / Odontologia)
  {
    category: 'Saúde',
    subcategory: 'Odontologia',
    keywords: ['zahnarzt', 'zahnarztpraxis', 'kieferorthopade', 'kieferorthopäde', 'dental', 'zahn'],
    brands: ['zahnarzt', 'dental', 'kfo', 'zahnklinik', 'dentista'],
    icon: '🦷',
    color: '#00BCD4',
    priority: 9,
  },

  // 💊 APOTHEKE & DROGERIE (Saúde / Farmácias e Drogarias)
  {
    category: 'Saúde',
    subcategory: 'Farmácias e Drogarias',
    keywords: ['apotheke', 'drogerie', 'arzneimittel', 'medikament', 'pharmacy'],
    brands: [
      // Apotheken
      'apotheke', 'docmorris', 'doc morris', 'shop apotheke', 'shop-apotheke', 'sanicare', 'medpex',
      // Drogeriemärkte
      'dm', 'dm-drogerie', 'rossmann', 'müller', 'mueller', 'budni', 'budnikowsky', 'kodi',
    ],
    icon: '💊',
    color: '#009688',
    priority: 8,
  },

  // ⚕️ ÄRZTE & KLINIKEN / KRANKENKASSE (Saúde / Médicos e Clínicas)
  {
    category: 'Saúde',
    subcategory: 'Médicos e Clínicas',
    keywords: [
      'arzt', 'praxis', 'klinik', 'krankenhaus', 'facharzt', 'mvz', 'hausarzt', 'orthopade',
      'orthopäde', 'physiotherapie', 'krankenkasse', 'krankenversicherung', 'labor',
    ],
    brands: [
      'aok', 'techniker krankenkasse', 'tk', 'barmer', 'dak', 'ikk', 'kkh', 'hkk', 'big direkt',
      'klinikum', 'charite', 'charité', 'helios', 'sana', 'asklepios', 'vivantes',
    ],
    icon: '⚕️',
    color: '#009688',
    priority: 7,
  },

  // 🎮 FREIZEIT & UNTERHALTUNG (Entretenimento / Lazer e Diversão)
  {
    category: 'Entretenimento',
    subcategory: 'Lazer e Diversão',
    keywords: ['kino', 'theater', 'konzert', 'ticket', 'freizeitpark', 'museum', 'veranstaltung'],
    brands: [
      'cinestar', 'uci', 'cinemaxx', 'kinopolis', 'eventim', 'ticketmaster', 'europa-park',
      'europapark', 'phantasialand', 'heide park', 'legoland', 'tropical islands', 'steam',
      'playstation', 'psn', 'xbox', 'nintendo',
    ],
    icon: '🎮',
    color: '#9C27B0',
    priority: 8,
  },

  // 📺 STREAMING & ABOS (Entretenimento / Streaming e Assinaturas) — marcas internacionais
  {
    category: 'Entretenimento',
    subcategory: 'Streaming e Assinaturas',
    keywords: ['streaming', 'abo', 'subscription', 'premium'],
    brands: [
      'netflix', 'spotify', 'disney', 'disney+', 'amazon prime', 'prime video', 'dazn', 'sky',
      'wow', 'apple tv', 'apple music', 'youtube premium', 'audible', 'paramount', 'magenta tv',
      'deezer', 'mubi', 'crunchyroll',
    ],
    patterns: [/netflix/i, /spotify/i, /disney\+?/i, /\bdazn\b/i, /audible/i],
    icon: '📺',
    color: '#E91E63',
    priority: 10,
  },

  // 🚗 FAHRDIENSTE (Transporte / Apps de Transporte)
  {
    category: 'Transporte',
    subcategory: 'Apps de Transporte',
    keywords: ['taxi', 'fahrdienst', 'mitfahr'],
    brands: ['uber', 'bolt', 'free now', 'freenow', 'mytaxi', 'lyft', 'sixt ride', 'cleverShuttle'],
    icon: '🚗',
    color: '#2196F3',
    priority: 9,
  },

  // ⛽ TANKSTELLE & MAUT (Transporte / Combustível e Pedágio)
  {
    category: 'Transporte',
    subcategory: 'Combustível e Pedágio',
    keywords: ['tankstelle', 'tank', 'sprit', 'kraftstoff', 'benzin', 'diesel', 'maut'],
    brands: [
      'aral', 'shell', 'esso', 'total', 'totalenergies', 'jet', 'agip', 'eni', 'star', 'hem',
      'omv', 'avia', 'westfalen', 'classic tankstelle', 'raststatte', 'raststätte',
    ],
    icon: '⛽',
    color: '#FF9800',
    priority: 10,
  },

  // 🚌 ÖFFENTLICHER VERKEHR (Transporte / Transporte Público)
  {
    category: 'Transporte',
    subcategory: 'Transporte Público',
    keywords: [
      'bahn', 'ticket', 'fahrkarte', 'fahrschein', 'nahverkehr', 's-bahn', 'u-bahn', 'sbahn',
      'ubahn', 'bus', 'tram', 'verkehrsverbund', 'deutschlandticket', '49-euro', '9-euro',
    ],
    brands: [
      'deutsche bahn', 'db vertrieb', 'db bahn', 'db fernverkehr', 'flixbus', 'flixtrain',
      'bvg', 'mvg', 'mvv', 'hvv', 'vrr', 'vvs', 'rmv', 'vrs', 'vgn', 'kvb', 'rnv', 'vbb',
    ],
    icon: '🚌',
    color: '#3F51B5',
    priority: 8,
  },

  // 🅿️ PARKEN (Transporte / Estacionamentos)
  {
    category: 'Transporte',
    subcategory: 'Estacionamentos',
    keywords: ['parken', 'parkhaus', 'parkplatz', 'parkgebuhr', 'parkgebühr', 'parking'],
    brands: ['apcoa', 'q-park', 'qpark', 'contipark', 'parkster', 'easypark', 'paybyphone'],
    icon: '🅿️',
    color: '#607D8B',
    priority: 8,
  },

  // 🛍️ ONLINE-HANDEL (Compras / E-commerce)
  {
    category: 'Compras',
    subcategory: 'E-commerce',
    keywords: ['online', 'shop', 'bestellung', 'versand', 'marktplatz'],
    brands: [
      'amazon', 'amzn', 'ebay', 'otto', 'kaufland.de', 'idealo', 'aliexpress', 'temu', 'shein',
      'etsy', 'wish', 'check24 shop',
    ],
    icon: '🛍️',
    color: '#E91E63',
    priority: 7,
  },

  // 👕 MODE & BEKLEIDUNG (Compras / Moda e Vestuário)
  {
    category: 'Compras',
    subcategory: 'Moda e Vestuário',
    keywords: ['mode', 'bekleidung', 'kleidung', 'schuhe', 'fashion'],
    brands: [
      'zalando', 'about you', 'aboutyou', 'h&m', 'h und m', 'hennes', 'c&a', 'c und a', 'zara',
      'primark', 'peek', 'cloppenburg', 'p&c', 'deichmann', 'esprit', 's.oliver', 's oliver',
      'tk maxx', 'tkmaxx', 'snipes', 'jack jones', 'only', 'reno', 'gortz', 'görtz', 'breuninger',
      'engelhorn', 'sportscheck', 'decathlon', 'intersport',
    ],
    icon: '👕',
    color: '#FF4081',
    priority: 8,
  },

  // 📱 ELEKTRONIK & TECHNIK (Compras / Tecnologia)
  {
    category: 'Compras',
    subcategory: 'Tecnologia',
    keywords: ['elektronik', 'technik', 'computer', 'notebook', 'handy', 'smartphone'],
    brands: [
      'mediamarkt', 'media markt', 'saturn', 'apple', 'apple store', 'cyberport', 'notebooksbilliger',
      'conrad', 'gravis', 'alternate', 'mindfactory', 'expert', 'euronics', 'pearl', 'reichelt',
    ],
    icon: '📱',
    color: '#607D8B',
    priority: 7,
  },

  // 🏠 BAUMARKT (Casa / Construção e Reforma)
  {
    category: 'Casa',
    subcategory: 'Construção e Reforma',
    keywords: ['baumarkt', 'baustoff', 'renovierung', 'werkzeug', 'handwerk'],
    brands: ['obi', 'bauhaus', 'hornbach', 'toom', 'hagebau', 'hellweg', 'globus baumarkt', 'b1', 'sonderpreis baumarkt'],
    icon: '🏠',
    color: '#795548',
    priority: 7,
  },

  // 🛋️ MÖBEL & DEKO (Casa / Móveis e Decoração)
  {
    category: 'Casa',
    subcategory: 'Móveis e Decoração',
    keywords: ['mobel', 'möbel', 'einrichtung', 'deko', 'dekoration', 'haushalt'],
    brands: [
      'ikea', 'xxxlutz', 'xxl lutz', 'hoffner', 'höffner', 'roller', 'poco', 'segmuller', 'segmüller',
      'home24', 'depot', 'butlers', 'momax', 'mömax', 'westwing', 'maisons du monde', 'jysk', 'nanu nana',
    ],
    icon: '🛋️',
    color: '#8D6E63',
    priority: 7,
  },

  // 🏦 BANKEN & FINTECHS (Banco e Seguradoras / Bancos e Fintechs)
  {
    category: 'Banco e Seguradoras',
    subcategory: 'Bancos e Fintechs',
    keywords: ['bank', 'gebuhr', 'gebühr', 'kontofuhrung', 'kontoführung', 'entgelt', 'dispo'],
    brands: [
      'sparkasse', 'volksbank', 'raiffeisenbank', 'deutsche bank', 'commerzbank', 'ing', 'ing-diba',
      'dkb', 'n26', 'comdirect', 'postbank', 'targobank', 'hypovereinsbank', 'hvb', 'santander',
      'consorsbank', 'norisbank', 'revolut', 'trade republic', 'scalable', 'paypal', 'klarna',
      'vivid', 'tomorrow', 'c24 bank',
    ],
    icon: '🏦',
    color: '#673AB7',
    priority: 8,
  },

  // 🛡️ VERSICHERUNGEN (Banco e Seguradoras / Seguradoras)
  {
    category: 'Banco e Seguradoras',
    subcategory: 'Seguradoras',
    keywords: ['versicherung', 'versicherungen', 'police', 'beitrag versicherung'],
    brands: [
      'allianz', 'axa', 'huk', 'huk24', 'huk-coburg', 'ergo', 'devk', 'r+v', 'rv versicherung',
      'generali', 'cosmosdirekt', 'cosmos direkt', 'debeka', 'signal iduna', 'gothaer', 'wgv',
      'lvm', 'provinzial', 'continentale', 'hdi', 'zurich', 'die bayerische', 'check24 versicherung',
    ],
    icon: '🛡️',
    color: '#673AB7',
    priority: 9,
  },

  // 📱 TELEFON & INTERNET (Contas / Telefonia e Internet)
  {
    category: 'Contas',
    subcategory: 'Telefonia e Internet',
    keywords: ['mobilfunk', 'internet', 'telefon', 'dsl', 'glasfaser', 'tarif', 'handyvertrag'],
    brands: [
      'telekom', 'deutsche telekom', 't-mobile', 'magenta', 'vodafone', 'o2', 'telefonica',
      '1&1', '1 und 1', 'congstar', 'drillisch', 'pyur', 'unitymedia', 'mobilcom', 'blau',
      'aldi talk', 'lidl connect', 'winsim', 'simyo', 'klarmobil', 'fraenk',
    ],
    icon: '📱',
    color: '#00BCD4',
    priority: 8,
  },

  // ⚡ STROM, GAS & WASSER (Contas / Energia e Água)
  {
    category: 'Contas',
    subcategory: 'Energia e Água',
    keywords: ['strom', 'gas', 'wasser', 'energie', 'stadtwerke', 'abschlag', 'versorgung', 'heizung'],
    brands: [
      'eon', 'e.on', 'enbw', 'vattenfall', 'rwe', 'yello', 'yello strom', 'e wie einfach',
      'stromio', 'gruenwelt', 'grünwelt', 'gasag', 'naturstrom', 'lichtblick', 'eprimo', 'maingau',
      'stadtwerke', 'sw ', 'rheinenergie', 'mainova', 'entega',
    ],
    icon: '⚡',
    color: '#FFC107',
    priority: 8,
  },

  // 🏠 MIETE (Contas / Aluguel de Imóvel)
  {
    category: 'Contas',
    subcategory: 'Aluguel de Imóvel',
    keywords: ['miete', 'kaltmiete', 'warmmiete', 'nebenkosten', 'hausverwaltung', 'wohnung'],
    brands: [
      'vonovia', 'deutsche wohnen', 'leg', 'grand city', 'gcp', 'gewobag', 'degewo', 'saga',
      'vivawest', 'hausverwaltung', 'immobilien',
    ],
    icon: '🏠',
    color: '#8D6E63',
    priority: 10,
  },

  // 📚 BÜCHER & SCHREIBWAREN (Educação / Livrarias e Papelarias)
  {
    category: 'Educação',
    subcategory: 'Livrarias e Papelarias',
    keywords: ['buchhandlung', 'buch', 'bucher', 'bücher', 'schreibwaren', 'papeterie'],
    brands: ['thalia', 'hugendubel', 'weltbild', 'dussmann', 'mayersche', 'osiander', 'mcpaper', 'idee creativmarkt'],
    icon: '📚',
    color: '#5C6BC0',
    priority: 9,
  },

  // 🎓 KURSE & BILDUNG (Educação / Cursos e Ensino)
  {
    category: 'Educação',
    subcategory: 'Cursos e Ensino',
    keywords: ['kurs', 'bildung', 'schule', 'universitat', 'universität', 'hochschule', 'kita', 'studiengebuhr', 'seminar', 'nachhilfe'],
    brands: ['udemy', 'coursera', 'skillshare', 'volkshochschule', 'vhs', 'babbel', 'busuu', 'rosetta stone', 'lecturio'],
    icon: '🎓',
    color: '#3F51B5',
    priority: 7,
  },

  // 🏋️ FITNESS & SPORT (Saúde / Academia e Fitness)
  {
    category: 'Saúde',
    subcategory: 'Academia e Fitness',
    keywords: ['fitness', 'fitnessstudio', 'gym', 'sportverein', 'schwimmbad'],
    brands: [
      'mcfit', 'fitx', 'fit x', 'clever fit', 'cleverfit', 'fitness first', 'urban sports club',
      'john reed', 'golds gym', 'gold s gym', 'evo fitness', 'kieser training', 'easyfitness',
      'ai fitness', 'superfit', 'pfitzenmeier',
    ],
    icon: '🏋️',
    color: '#FF5722',
    priority: 8,
  },

  // 🦴 TIERBEDARF (Pet / Alimentação)
  {
    category: 'Pet',
    subcategory: 'Alimentação',
    keywords: ['tierbedarf', 'tierarzt', 'tierfutter', 'haustier', 'tier'],
    brands: ['fressnapf', 'das futterhaus', 'futterhaus', 'zooplus', 'zoo royal', 'zooroyal', 'tierarzt'],
    icon: '🦴',
    color: '#FF9800',
    priority: 8,
  },

  // 💰 GEHALT (Receitas / Salário e Rendimentos) — entradas
  {
    category: 'Receitas',
    subcategory: 'Salário e Rendimentos',
    keywords: ['gehalt', 'lohn', 'lohn/gehalt', 'bezuge', 'bezüge', 'entgelt gutschrift', 'verdienst', 'honorar', 'rente', 'kindergeld', 'arbeitslohn'],
    brands: [],
    icon: '💰',
    color: '#4CAF50',
    priority: 9,
  },
];

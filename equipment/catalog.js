/*
 * catalog.js — the searchable equipment library.
 *
 * Dimensions are nominal manufacturer figures in millimetres, width x depth x
 * height, rounded to the nearest 5 mm. They are here to get relative size on
 * the stage right, not to be a spec sheet — correct any entry you care about
 * and the plot updates the next time you drop it.
 *
 * mode:
 *   'real'   drawn to scale against the stage. Anything whose footprint
 *            actually matters: cabinets, risers, backline, people.
 *   'symbol' drawn at a fixed readable size. Microphones and small boxes,
 *            which would be a couple of pixels at true scale.
 */
window.EquipmentCatalog = (function () {
  'use strict';

  var CATEGORIES = [
    { id: 'speaker',  label: 'Speakers' },
    { id: 'mic',      label: 'Microphones' },
    { id: 'backline', label: 'Backline' },
    { id: 'stage',    label: 'Stage' },
    { id: 'other',    label: 'Other' }
  ];

  var items = [];
  var byId = {};

  function slug(s) {
    return String(s).toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /* rows: [brand, model, W, D, H (mm), icon, extraTags] */
  function add(cat, sub, mode, rows) {
    rows.forEach(function (row) {
      var brand = row[0], model = row[1];
      var item = {
        id: slug(brand + ' ' + model),
        brand: brand,
        model: model,
        name: brand ? brand + ' ' + model : model,
        cat: cat,
        sub: sub,
        mode: mode,
        w: row[2] / 1000,
        d: row[3] / 1000,
        h: row[4] / 1000,
        icon: row[5],
        tags: (row[6] || '')
      };
      item.search = (item.name + ' ' + item.sub + ' ' + item.cat + ' ' + item.tags).toLowerCase();
      if (!byId[item.id]) { items.push(item); byId[item.id] = item; }
    });
  }

  /* ==================== speakers ==================== */

  add('speaker', 'Line array', 'real', [
    ['d&b audiotechnik', 'V8',        528, 465, 320, 'speaker-array', 'v-series line array pa'],
    ['d&b audiotechnik', 'V10P',      528, 465, 320, 'speaker-array', 'v-series line array pa'],
    ['d&b audiotechnik', 'Y8',        522, 372, 265, 'speaker-array', 'y-series line array pa'],
    ['d&b audiotechnik', 'Y12',       522, 372, 265, 'speaker-array', 'y-series line array pa'],
    ['d&b audiotechnik', 'J8',       1250, 690, 415, 'speaker-array', 'j-series line array pa'],
    ['d&b audiotechnik', 'KSL8',      750, 512, 340, 'speaker-array', 'sl-series line array pa'],
    ['d&b audiotechnik', 'GSL8',     1120, 660, 380, 'speaker-array', 'sl-series line array pa'],
    ['d&b audiotechnik', 'AL60',      950, 400, 300, 'speaker-array', 'a-series column'],
    ['L-Acoustics', 'K1',            1340, 700, 700, 'speaker-array', 'line array pa'],
    ['L-Acoustics', 'K2',            1340, 600, 350, 'speaker-array', 'line array pa'],
    ['L-Acoustics', 'K3',            1130, 530, 350, 'speaker-array', 'line array pa'],
    ['L-Acoustics', 'Kara II',        750, 500, 250, 'speaker-array', 'line array pa'],
    ['L-Acoustics', 'Kiva II',        530, 340, 170, 'speaker-array', 'line array pa compact'],
    ['L-Acoustics', 'A15 Focus',      700, 460, 450, 'speaker-array', 'a-series constant curvature'],
    ['L-Acoustics', 'A10 Wide',       570, 400, 350, 'speaker-array', 'a-series constant curvature'],
    ['Meyer Sound', 'PANTHER',       1105, 686, 356, 'speaker-array', 'line array pa'],
    ['Meyer Sound', 'LEOPARD',        749, 508, 292, 'speaker-array', 'line array pa'],
    ['Meyer Sound', 'LINA',           546, 411, 213, 'speaker-array', 'line array pa compact'],
    ['Meyer Sound', 'MILO',           787, 570, 336, 'speaker-array', 'line array pa'],
    ['Meyer Sound', 'MICA',           660, 540, 300, 'speaker-array', 'line array pa'],
    ['Meyer Sound', 'MINA',           279, 349, 292, 'speaker-array', 'line array pa compact'],
    ['VUE Audiotechnik', 'al-4',      356, 279, 165, 'speaker-array', 'acoustic linear array compact'],
    ['VUE Audiotechnik', 'al-8',      660, 406, 254, 'speaker-array', 'acoustic linear array'],
    ['VUE Audiotechnik', 'al-12',    1090, 508, 330, 'speaker-array', 'acoustic linear array'],
    ['JBL', 'VTX A12',               1090, 620, 350, 'speaker-array', 'line array pa'],
    ['JBL', 'VTX V25',               1170, 690, 470, 'speaker-array', 'line array pa'],
    ['RCF', 'HDL 20-A',              1050, 400, 265, 'speaker-array', 'line array pa'],
    ['RCF', 'HDL 6-A',                660, 300, 190, 'speaker-array', 'line array pa compact'],
    ['Nexo', 'GEO M10',               570, 320, 210, 'speaker-array', 'line array pa'],
    ['Nexo', 'GEO M6',                340, 220, 140, 'speaker-array', 'line array pa compact'],
    ['Adamson', 'S10',                800, 465, 265, 'speaker-array', 'line array pa'],
    ['Adamson', 'S7',                 610, 405, 220, 'speaker-array', 'line array pa'],
    ['Adamson', 'E15',               1300, 700, 430, 'speaker-array', 'line array pa'],
    ['Martin Audio', 'WPS',           750, 450, 290, 'speaker-array', 'wavefront line array'],
    ['Martin Audio', 'W8LC',          900, 560, 330, 'speaker-array', 'wavefront line array']
  ]);

  add('speaker', 'Point source', 'real', [
    ['Meyer Sound', 'CQ-1',           552, 455, 1090, 'speaker-point', 'front fill foh'],
    ['Meyer Sound', 'CQ-2',           552, 455, 1090, 'speaker-point', 'front fill foh'],
    ['Meyer Sound', 'UPQ-D1',         355, 435, 620, 'speaker-point', 'fill'],
    ['Meyer Sound', 'UPJ-1P',         265, 355, 510, 'speaker-point', 'junior fill'],
    ['Meyer Sound', 'UPJunior',       225, 295, 420, 'speaker-point', 'fill'],
    ['Meyer Sound', 'UPM-1P',         210, 220, 305, 'speaker-point', 'ultra compact fill'],
    ['Meyer Sound', 'UP-4slim',       155, 210, 305, 'speaker-point', 'fill install'],
    ['Meyer Sound', 'ULTRA-X40',      290, 330, 495, 'speaker-point', 'fill'],
    ['Meyer Sound', 'ULTRA-X20',      220, 250, 370, 'speaker-point', 'fill compact'],
    ['d&b audiotechnik', 'E8',        260, 275, 400, 'speaker-point', 'e-series fill'],
    ['d&b audiotechnik', 'E6',        190, 200, 300, 'speaker-point', 'e-series fill'],
    ['d&b audiotechnik', 'E12',       390, 420, 600, 'speaker-point', 'e-series'],
    ['d&b audiotechnik', '5S',        200, 210, 330, 'speaker-point', 'xs-series fill'],
    ['d&b audiotechnik', '8S',        265, 280, 425, 'speaker-point', 'xs-series fill'],
    ['L-Acoustics', 'X8',             250, 240, 400, 'speaker-point', 'coaxial fill'],
    ['L-Acoustics', 'X12',            365, 345, 580, 'speaker-point', 'coaxial fill'],
    ['L-Acoustics', 'X4i',            120, 120, 140, 'speaker-point', 'coaxial fill install'],
    ['L-Acoustics', '5XT',            160, 165, 240, 'speaker-point', 'coaxial fill'],
    ['VUE Audiotechnik', 'h-5',       180, 215, 280, 'speaker-point', 'point source fill'],
    ['VUE Audiotechnik', 'h-8',       265, 320, 430, 'speaker-point', 'point source'],
    ['VUE Audiotechnik', 'h-12',      380, 430, 610, 'speaker-point', 'point source'],
    ['VUE Audiotechnik', 'i-4',       130, 150, 230, 'speaker-point', 'install fill'],
    ['QSC', 'K12.2',                  355, 360, 595, 'speaker-point', 'powered active pa'],
    ['QSC', 'K10.2',                  305, 320, 510, 'speaker-point', 'powered active pa'],
    ['QSC', 'K8.2',                   255, 280, 410, 'speaker-point', 'powered active pa'],
    ['Yamaha', 'DXR12',               360, 350, 605, 'speaker-point', 'powered active pa'],
    ['Yamaha', 'DXR15',               440, 395, 700, 'speaker-point', 'powered active pa'],
    ['Yamaha', 'DZR15',               450, 400, 710, 'speaker-point', 'powered active pa'],
    ['JBL', 'EON615',                 355, 325, 610, 'speaker-point', 'powered active pa'],
    ['JBL', 'PRX815W',                365, 340, 615, 'speaker-point', 'powered active pa'],
    ['JBL', 'SRX815P',                420, 420, 685, 'speaker-point', 'powered active pa'],
    ['JBL', 'Control 25',             165, 165, 235, 'speaker-point', 'install fill'],
    ['RCF', 'ART 712-A',              355, 345, 605, 'speaker-point', 'powered active pa'],
    ['RCF', 'ART 745-A',              430, 400, 700, 'speaker-point', 'powered active pa'],
    ['RCF', 'NX 45-A',                430, 400, 700, 'speaker-point', 'powered active pa'],
    ['Electro-Voice', 'ETX-12P',      375, 385, 620, 'speaker-point', 'powered active pa'],
    ['Electro-Voice', 'ZLX-12P',      355, 330, 605, 'speaker-point', 'powered active pa'],
    ['Nexo', 'PS15',                  450, 450, 690, 'speaker-point', 'pa'],
    ['Nexo', 'P12',                   385, 390, 595, 'speaker-point', 'pa'],
    ['Martin Audio', 'CDD12',         385, 355, 600, 'speaker-point', 'install pa'],
    ['Martin Audio', 'Blackline X12', 380, 360, 600, 'speaker-point', 'pa'],
    ['Bose', 'L1 Pro32',              195, 195, 1980, 'speaker-column', 'column array portable'],
    ['LD Systems', 'MAUI 28 G3',      285, 285, 2130, 'speaker-column', 'column array portable'],
    ['JBL', 'Boombox 3',              480, 200, 200, 'speaker-point', 'bluetooth portable boombox']
  ]);

  add('speaker', 'Subwoofer', 'real', [
    ['Meyer Sound', '750-LFC',       1170, 785, 585, 'speaker-sub', 'sub bass lfc'],
    ['Meyer Sound', '900-LFC',       1170, 850, 760, 'speaker-sub', 'sub bass lfc'],
    ['Meyer Sound', '2100-LFC',      1105, 785, 685, 'speaker-sub', 'sub bass lfc'],
    ['Meyer Sound', 'USW-210P',      1130, 570, 340, 'speaker-sub', 'sub bass'],
    ['d&b audiotechnik', 'B22',       600, 800, 1000, 'speaker-sub', 'sub bass'],
    ['d&b audiotechnik', 'V-SUB',     560, 780, 1050, 'speaker-sub', 'sub bass cardioid'],
    ['d&b audiotechnik', 'Y-SUB',     520, 570, 900, 'speaker-sub', 'sub bass cardioid'],
    ['L-Acoustics', 'KS28',          1340, 830, 690, 'speaker-sub', 'sub bass'],
    ['L-Acoustics', 'SB18',           600, 690, 550, 'speaker-sub', 'sub bass'],
    ['L-Acoustics', 'KS21',           650, 690, 550, 'speaker-sub', 'sub bass'],
    ['VUE Audiotechnik', 'hs-25',     600, 600, 700, 'speaker-sub', 'sub bass'],
    ['VUE Audiotechnik', 'hs-28',    1090, 760, 610, 'speaker-sub', 'sub bass'],
    ['QSC', 'KS118',                  560, 685, 610, 'speaker-sub', 'sub bass'],
    ['QSC', 'KW181',                  560, 620, 560, 'speaker-sub', 'sub bass'],
    ['Yamaha', 'DXS18',               560, 630, 640, 'speaker-sub', 'sub bass'],
    ['JBL', 'SRX818SP',               595, 660, 595, 'speaker-sub', 'sub bass'],
    ['RCF', 'SUB 8004-AS',            600, 750, 800, 'speaker-sub', 'sub bass'],
    ['Electro-Voice', 'ETX-18SP',     560, 680, 615, 'speaker-sub', 'sub bass']
  ]);

  add('speaker', 'Monitor / wedge', 'real', [
    ['Meyer Sound', 'MJF-212A',       675, 530, 355, 'speaker-wedge', 'wedge stage monitor'],
    ['Meyer Sound', 'MJF-210',        560, 445, 290, 'speaker-wedge', 'wedge stage monitor'],
    ['Meyer Sound', 'UM-1P',          560, 445, 290, 'speaker-wedge', 'wedge stage monitor'],
    ['d&b audiotechnik', 'M4',        595, 395, 305, 'speaker-wedge', 'wedge stage monitor'],
    ['d&b audiotechnik', 'M6',        610, 420, 320, 'speaker-wedge', 'wedge stage monitor'],
    ['d&b audiotechnik', 'MAX2',      540, 400, 300, 'speaker-wedge', 'wedge stage monitor'],
    ['L-Acoustics', 'X15 HiQ',        700, 460, 450, 'speaker-wedge', 'wedge stage monitor'],
    ['L-Acoustics', 'X12 wedge',      365, 580, 345, 'speaker-wedge', 'wedge stage monitor'],
    ['Nexo', '45-N-12',               610, 450, 330, 'speaker-wedge', 'wedge stage monitor'],
    ['Martin Audio', 'XD12',          580, 440, 340, 'speaker-wedge', 'wedge stage monitor'],
    ['QSC', 'K12.2 wedge',            595, 360, 355, 'speaker-wedge', 'wedge stage monitor'],
    ['Generic', 'Wedge 12"',          600, 420, 350, 'speaker-wedge', 'wedge stage monitor gulvmonitor'],
    ['Generic', 'Wedge 15"',          700, 470, 400, 'speaker-wedge', 'wedge stage monitor gulvmonitor'],
    ['Generic', 'Drum fill',          700, 600, 900, 'speaker-sub', 'drumfill monitor']
  ]);

  add('speaker', 'Studio / nearfield', 'real', [
    ['Genelec', '8010A',              120, 115, 195, 'speaker-studio', 'nearfield studio monitor'],
    ['Genelec', '8020D',              150, 140, 240, 'speaker-studio', 'nearfield studio monitor'],
    ['Genelec', '8030C',              190, 178, 300, 'speaker-studio', 'nearfield studio monitor'],
    ['Genelec', '8040B',              237, 223, 350, 'speaker-studio', 'nearfield studio monitor'],
    ['Genelec', '8050B',              285, 278, 450, 'speaker-studio', 'nearfield studio monitor'],
    ['Genelec', '1032C',              320, 330, 595, 'speaker-studio', 'midfield studio monitor'],
    ['Genelec', '7050C',              350, 320, 410, 'speaker-sub', 'studio subwoofer'],
    ['Yamaha', 'HS8',                 250, 390, 390, 'speaker-studio', 'nearfield studio monitor'],
    ['Yamaha', 'HS7',                 210, 285, 330, 'speaker-studio', 'nearfield studio monitor'],
    ['KRK', 'Rokit 8 G4',             270, 310, 400, 'speaker-studio', 'nearfield studio monitor'],
    ['Adam Audio', 'A7X',             200, 280, 340, 'speaker-studio', 'nearfield studio monitor'],
    ['Neumann', 'KH 120',             182, 244, 277, 'speaker-studio', 'nearfield studio monitor'],
    ['Focal', 'Alpha 65',             227, 285, 350, 'speaker-studio', 'nearfield studio monitor']
  ]);

  add('speaker', 'Install', 'real', [
    ['Generic', 'Ceiling speaker',    250, 250, 200, 'speaker-ceiling', 'takhøyttaler install'],
    ['Generic', 'Surround speaker',   200, 200, 300, 'speaker-point', 'surround install'],
    ['Generic', 'Delay speaker',      355, 360, 600, 'speaker-point', 'delay tower']
  ]);

  /* ==================== microphones ==================== */

  add('mic', 'Vocal', 'symbol', [
    ['Shure', 'SM58',                 51, 51, 162, 'mic-handheld', 'vocal dynamic handheld vokal sang'],
    ['Shure', 'Beta 58A',             50, 50, 160, 'mic-handheld', 'vocal dynamic supercardioid vokal'],
    ['Shure', 'Beta 87A',             48, 48, 185, 'mic-handheld', 'vocal condenser vokal'],
    ['Shure', 'SM86',                 48, 48, 180, 'mic-handheld', 'vocal condenser vokal'],
    ['Shure', 'KSM9',                 50, 50, 190, 'mic-handheld', 'vocal condenser vokal'],
    ['Sennheiser', 'e835',            48, 48, 180, 'mic-handheld', 'vocal dynamic vokal'],
    ['Sennheiser', 'e845',            48, 48, 180, 'mic-handheld', 'vocal dynamic vokal'],
    ['Sennheiser', 'e935',            48, 48, 180, 'mic-handheld', 'vocal dynamic vokal'],
    ['Sennheiser', 'e945',            48, 48, 180, 'mic-handheld', 'vocal dynamic supercardioid vokal'],
    ['Sennheiser', 'MD 435',          48, 48, 185, 'mic-handheld', 'vocal dynamic vokal'],
    ['Neumann', 'KMS 105',            48, 48, 180, 'mic-handheld', 'vocal condenser vokal'],
    ['AKG', 'D5',                     51, 51, 185, 'mic-handheld', 'vocal dynamic vokal'],
    ['Audix', 'OM7',                  50, 50, 180, 'mic-handheld', 'vocal dynamic vokal'],
    ['Telefunken', 'M80',             49, 49, 180, 'mic-handheld', 'vocal dynamic vokal'],
    ['Beyerdynamic', 'M 88 TG',       48, 48, 195, 'mic-handheld', 'vocal dynamic hypercardioid'],
    ['Shure', 'SM7B',                 96, 190, 96, 'mic-ribbon', 'broadcast dynamic vocal podcast']
  ]);

  add('mic', 'Wireless', 'symbol', [
    ['Shure', 'SLXD2/B58',            50, 50, 260, 'mic-wireless', 'wireless handheld trådløs'],
    ['Shure', 'QLXD2/SM58',           50, 50, 260, 'mic-wireless', 'wireless handheld trådløs'],
    ['Shure', 'ULXD2/KSM9',           50, 50, 260, 'mic-wireless', 'wireless handheld trådløs'],
    ['Shure', 'AD2/B58',              50, 50, 265, 'mic-wireless', 'wireless handheld trådløs axient'],
    ['Sennheiser', 'SKM 6000',        50, 50, 265, 'mic-wireless', 'wireless handheld trådløs'],
    ['Sennheiser', 'SKM 500 G4',      50, 50, 255, 'mic-wireless', 'wireless handheld trådløs'],
    ['Generic', 'Wireless handheld',  50, 50, 260, 'mic-wireless', 'wireless handheld trådløs håndholdt'],
    ['Shure', 'ULXD1 bodypack',       65, 20, 95, 'mic-bodypack', 'wireless bodypack sender beltpack'],
    ['Sennheiser', 'SK 500 G4',       65, 20, 95, 'mic-bodypack', 'wireless bodypack sender beltpack'],
    ['Generic', 'Bodypack',           65, 20, 95, 'mic-bodypack', 'wireless sender beltpack trådløs'],
    ['Shure', 'WL185 lav',            10, 10, 15, 'mic-lav', 'lavalier lapel mygg myggmikrofon'],
    ['Sennheiser', 'MKE 2 lav',       10, 10, 15, 'mic-lav', 'lavalier lapel mygg myggmikrofon'],
    ['DPA', '4061 lav',                5, 5, 12, 'mic-lav', 'lavalier miniature mygg myggmikrofon'],
    ['Countryman', 'B3 lav',           5, 5, 12, 'mic-lav', 'lavalier miniature mygg myggmikrofon'],
    ['Generic', 'Lavalier',    10, 10, 15, 'mic-lav', 'lavalier lapel mygg myggmikrofon'],
    ['DPA', 'd:fine 4066',            70, 60, 20, 'mic-headset', 'headset headworn hodebøyle'],
    ['Countryman', 'E6',              70, 60, 15, 'mic-headset', 'headset headworn hodebøyle'],
    ['Sennheiser', 'HSP 4',           70, 60, 20, 'mic-headset', 'headset headworn hodebøyle'],
    ['Shure', 'WH20 headset',         70, 60, 20, 'mic-headset', 'headset headworn hodebøyle'],
    ['Generic', 'Headset',            70, 60, 20, 'mic-headset', 'headset headworn hodebøyle']
  ]);

  add('mic', 'Instrument', 'symbol', [
    ['Shure', 'SM57',                 32, 32, 157, 'mic-dynamic-small', 'instrument dynamic snare guitar amp'],
    ['Shure', 'Beta 57A',             32, 32, 157, 'mic-dynamic-small', 'instrument dynamic snare guitar amp'],
    ['Sennheiser', 'e906',            35, 35, 140, 'mic-dynamic-small', 'guitar cab side address amp'],
    ['Sennheiser', 'MD 421-II',       49, 46, 215, 'mic-dynamic-small', 'tom guitar broadcast dynamic'],
    ['Sennheiser', 'MD 441-U',        45, 45, 220, 'mic-dynamic-small', 'dynamic supercardioid'],
    ['Sennheiser', 'MD 46',           48, 48, 190, 'mic-handheld', 'reporter dynamic interview'],
    ['Audix', 'i5',                   32, 32, 145, 'mic-dynamic-small', 'instrument dynamic snare amp'],
    ['Beyerdynamic', 'M 201',         30, 30, 155, 'mic-dynamic-small', 'instrument dynamic'],
    ['Beyerdynamic', 'M 160',         45, 45, 150, 'mic-ribbon', 'ribbon båndmikrofon'],
    ['Royer', 'R-121',                40, 40, 155, 'mic-ribbon', 'ribbon båndmikrofon guitar'],
    ['DPA', '4099',                   20, 20, 45, 'mic-clip', 'clip on instrument brass strings piano'],
    ['AKG', 'C519',                   20, 20, 40, 'mic-clip', 'clip on instrument brass'],
    ['Audio-Technica', 'ATM350a',     20, 20, 40, 'mic-clip', 'clip on instrument brass strings'],
    ['Sennheiser', 'e908',            20, 20, 40, 'mic-clip', 'clip on instrument brass'],
    ['Shure', 'Beta 98A',             20, 20, 40, 'mic-clip', 'clip on instrument tom brass']
  ]);

  add('mic', 'Drums', 'symbol', [
    ['Shure', 'Beta 52A',             90, 110, 165, 'mic-kick', 'kick drum bass stortromme'],
    ['AKG', 'D112 MkII',              90, 110, 160, 'mic-kick', 'kick drum bass stortromme'],
    ['Audix', 'D6',                   60, 70, 110, 'mic-kick', 'kick drum bass stortromme'],
    ['Electro-Voice', 'RE20',         55, 55, 220, 'mic-kick', 'kick broadcast dynamic'],
    ['Shure', 'Beta 91A',            110, 150, 25, 'mic-boundary', 'kick boundary halvgrense pzm inside'],
    ['Audio-Technica', 'AE2500',      90, 110, 165, 'mic-kick', 'kick dual element stortromme'],
    ['Shure', 'Beta 56A',             35, 35, 130, 'mic-dynamic-small', 'tom snare dynamic'],
    ['Sennheiser', 'e904',            35, 35, 100, 'mic-clip', 'tom clip on drum'],
    ['Sennheiser', 'e902',            90, 110, 160, 'mic-kick', 'kick drum stortromme'],
    ['Sennheiser', 'e901',           110, 130, 30, 'mic-boundary', 'kick boundary pzm inside'],
    ['Audix', 'D2',                   35, 35, 110, 'mic-dynamic-small', 'tom dynamic'],
    ['Audix', 'D4',                   35, 35, 110, 'mic-dynamic-small', 'floor tom dynamic'],
    ['Beyerdynamic', 'TG D70',        90, 110, 160, 'mic-kick', 'kick drum stortromme']
  ]);

  add('mic', 'Condenser', 'symbol', [
    ['Neumann', 'KM 184',             22, 22, 107, 'mic-pencil', 'small diaphragm overhead hihat acoustic'],
    ['Neumann', 'KM 185',             22, 22, 107, 'mic-pencil', 'small diaphragm hypercardioid'],
    ['Neumann', 'U 87 Ai',            56, 56, 200, 'mic-condenser-large', 'large diaphragm studio vocal'],
    ['Neumann', 'TLM 103',            60, 60, 130, 'mic-condenser-large', 'large diaphragm studio vocal'],
    ['AKG', 'C414 XLII',              50, 38, 160, 'mic-condenser-large', 'large diaphragm multipattern overhead'],
    ['AKG', 'C451 B',                 19, 19, 160, 'mic-pencil', 'small diaphragm overhead hihat'],
    ['AKG', 'C535 EB',                34, 34, 165, 'mic-handheld', 'condenser vocal'],
    ['AKG', 'C1000S',                 34, 34, 230, 'mic-pencil', 'small diaphragm condenser'],
    ['Shure', 'SM81',                 24, 24, 212, 'mic-pencil', 'small diaphragm acoustic overhead'],
    ['Shure', 'KSM137',               23, 23, 148, 'mic-pencil', 'small diaphragm overhead'],
    ['Shure', 'KSM32',                55, 55, 200, 'mic-condenser-large', 'large diaphragm studio'],
    ['Audio-Technica', 'AT4050',      50, 50, 170, 'mic-condenser-large', 'large diaphragm multipattern'],
    ['Audio-Technica', 'AT4040',      50, 50, 170, 'mic-condenser-large', 'large diaphragm studio'],
    ['Audio-Technica', 'AT4053b',     21, 21, 160, 'mic-pencil', 'small diaphragm hypercardioid'],
    ['DPA', '4006',                   19, 19, 45, 'mic-pencil', 'omni small diaphragm measurement'],
    ['DPA', '4011',                   19, 19, 45, 'mic-pencil', 'cardioid small diaphragm'],
    ['DPA', '2011C',                  19, 19, 60, 'mic-pencil', 'compact cardioid twin diaphragm'],
    ['Rode', 'NT5',                   20, 20, 117, 'mic-pencil', 'small diaphragm overhead pair'],
    ['Rode', 'NT1',                   50, 50, 187, 'mic-condenser-large', 'large diaphragm studio'],
    ['Earthworks', 'SR20',            22, 22, 200, 'mic-pencil', 'small diaphragm high definition'],
    ['Earthworks', 'QTC40',           22, 22, 210, 'mic-pencil', 'omni measurement']
  ]);

  add('mic', 'Specialist', 'symbol', [
    ['Sennheiser', 'MKH 416',         19, 19, 250, 'mic-shotgun', 'shotgun boom film retning'],
    ['Rode', 'NTG3',                  19, 19, 255, 'mic-shotgun', 'shotgun boom film retning'],
    ['Audio-Technica', 'BP4073',      21, 21, 230, 'mic-shotgun', 'shotgun line gradient'],
    ['Crown', 'PCC-160',             155, 60, 25, 'mic-boundary', 'boundary floor pzm scenekant'],
    ['Crown', 'PZM-30D',             160, 160, 20, 'mic-boundary', 'boundary plate pzm'],
    ['Audix', 'ADX60',               150, 60, 20, 'mic-boundary', 'boundary floor pzm scenekant'],
    ['Bartlett', 'Floor mic',        140, 55, 15, 'mic-boundary', 'boundary floor scenekant'],
    ['Audio-Technica', 'PRO 45',      21, 21, 65, 'mic-hanging', 'hanging choir kor hengende'],
    ['Shure', 'MX202',                20, 20, 60, 'mic-hanging', 'hanging choir kor hengende'],
    ['Audix', 'M1250B',               15, 15, 50, 'mic-hanging', 'hanging choir kor miniature'],
    ['Generic', 'Choir mic',        20, 20, 60, 'mic-hanging', 'hanging choir kor hengende kormikrofon'],
    ['Shure', 'MX412',                30, 30, 300, 'mic-gooseneck', 'gooseneck podium lectern talerstol'],
    ['AKG', 'CK99 gooseneck',         30, 30, 300, 'mic-gooseneck', 'gooseneck podium lectern talerstol'],
    ['Sennheiser', 'MEG 14-40',       30, 30, 400, 'mic-gooseneck', 'gooseneck podium lectern talerstol'],
    ['Generic', 'Lectern mic',  30, 30, 300, 'mic-gooseneck', 'gooseneck podium lectern talerstol talerstolmikrofon']
  ]);

  /* ==================== backline ==================== */

  add('backline', 'Drums', 'real', [
    ['', 'Drum kit',               2200, 1800, 1300, 'drumkit', 'drums drumkit backline slagverk trommesett'],
    ['', 'Drum kit, compact',       1700, 1400, 1200, 'drumkit', 'drums drumkit backline trommesett kompakt'],
    ['', 'Percussion',                1000, 800, 1200, 'stand-round', 'percussion congas backline perkusjon']
  ]);

  add('backline', 'Keys', 'real', [
    ['', 'Grand piano',                   1500, 2200, 1000, 'piano-grand', 'grand piano klaver flygel'],
    ['', 'Baby grand piano',               1500, 1700, 1000, 'piano-grand', 'baby grand piano klaver halvflygel'],
    ['', 'Upright piano',         1500, 600, 1200, 'piano-upright', 'upright piano klaver oppreist'],
    ['', 'Keyboard 88',              1400, 350, 150, 'keyboard', 'keys synth stage piano'],
    ['', 'Keyboard 61',              1000, 300, 120, 'keyboard', 'keys synth'],
    ['', 'Hammond + Leslie',         1250, 700, 1200, 'amp-cab', 'organ orgel leslie']
  ]);

  add('backline', 'Amps', 'real', [
    ['', 'Guitar combo',                600, 300, 500, 'amp-cab', 'guitar amp combo gitarforsterker gitarcombo'],
    ['', 'Guitar 4x12',                760, 360, 760, 'amp-cab', 'guitar cabinet stack gitarkabinett gitar 4x12'],
    ['', 'Bass rig 4x10',             640, 450, 650, 'amp-cab', 'bass amp cabinet bassforsterker bassrigg 4x10'],
    ['', 'Bass rig 8x10',             660, 450, 1200, 'amp-cab', 'bass amp cabinet fridge bassrigg 8x10'],
    ['', 'Acoustic combo',            450, 300, 450, 'amp-cab', 'acoustic amp combo akustisk']
  ]);

  /* ==================== stage ==================== */

  add('stage', 'Risers', 'real', [
    ['', 'Riser 2x1 m',             2000, 1000, 200, 'riser', 'riser platform podie scenepodie podium 2x1 m'],
    ['', 'Riser 1x1 m',             1000, 1000, 200, 'riser', 'riser platform podie scenepodie podium 1x1 m'],
    ['', 'Riser 2x1.5 m',           2000, 1500, 400, 'riser', 'riser platform podie podium 2x1 5 m'],
    ['', 'Riser 8x4 ft',            2440, 1220, 200, 'riser', 'riser platform deck stage podium 8x4 ft'],
    ['', 'Drum riser 2x2 m',       2000, 2000, 400, 'riser', 'drum riser podie trommepodium 2x2 m'],
    ['', 'Drum riser 3x2 m',       3000, 2000, 400, 'riser', 'drum riser podie trommepodium 3x2 m'],
    ['', 'Platform 1x2 m',        1000, 2000, 400, 'riser', 'riser platform praktikabel 1x2 m']
  ]);

  add('stage', 'Stands and furniture', 'real', [
    ['', 'Mic stand (boom)',    350, 350, 1600, 'stand-mic', 'mic stand boom mikrofonstativ galge'],
    ['', 'Mic stand (short)',     300, 300, 500, 'stand-mic', 'short boom mic stand lavt stativ mikrofonstativ'],
    ['', 'Mic stand (round base)',    280, 280, 1600, 'stand-round', 'round base mic stand mikrofonstativ rundt'],
    ['', 'Speaker stand',           1100, 1100, 1800, 'stand-mic', 'speaker stand tripod stativ høyttalerstativ'],
    ['', 'Music stand',                500, 300, 1200, 'music-stand', 'music stand notestativ'],
    ['', 'Chair',                      450, 450, 900, 'chair', 'chair stol'],
    ['', 'Stool',                     400, 400, 700, 'stand-round', 'stool krakk barstol'],
    ['', 'Table 1.2x0.6 m',           1200, 600, 750, 'table', 'table bord 1 2x0 6 m'],
    ['', 'Lectern',                 600, 450, 1200, 'table', 'lectern podium talerstol'],
    ['', 'Mix position (table)',         1600, 800, 750, 'table', 'foh mixer desk miksebord miksepult bord']
  ]);

  add('stage', 'People', 'real', [
    ['', 'Musician',                   550, 550, 1750, 'person', 'person musician performer musiker'],
    ['', 'Vocalist',                  550, 550, 1750, 'person', 'person singer vocalist vokalist'],
    ['', 'Actor',               550, 550, 1750, 'person', 'person actor skuespiller'],
    ['', 'Conductor',                  550, 550, 1750, 'person', 'person conductor dirigent']
  ]);

  /* ==================== other ==================== */

  add('other', 'Signal and power', 'symbol', [
    ['Radial', 'ProDI',              150, 100, 50, 'di-box', 'di box direct injection'],
    ['Radial', 'ProD2',              190, 120, 50, 'di-box', 'di box stereo direct injection'],
    ['BSS', 'AR-133',                150, 100, 50, 'di-box', 'di box active direct injection'],
    ['Countryman', 'Type 85',        150, 90, 50, 'di-box', 'di box active direct injection'],
    ['', 'DI box',                  150, 100, 50, 'di-box', 'di box direct injection boks'],
    ['', 'Power outlet',               200, 200, 100, 'power', 'power drop strøm 230v uttak strømuttak'],
    ['', 'Power 16A',           250, 250, 150, 'power', 'power 16a cee strøm kraftuttak'],
    ['', 'Multicore / stagebox',    400, 300, 150, 'di-box', 'stagebox multicore multikabel snake']
  ]);

  add('other', 'Screens and video', 'real', [
    ['', 'TV 32"',                    730, 250, 450, 'monitor-tv', 'screen monitor skjerm tv'],
    ['', 'TV 55"',                   1230, 300, 720, 'monitor-tv', 'screen monitor skjerm tv'],
    ['', 'TV 75"',                   1680, 350, 970, 'monitor-tv', 'screen monitor skjerm tv'],
    ['', 'Projection screen 4 m',    4000, 120, 2250, 'screen', 'projection screen lerret projeksjonslerret 4 m'],
    ['', 'Projection screen 2 m',    2000, 100, 1130, 'screen', 'projection screen lerret projeksjonslerret 2 m'],
    ['', 'Laptop',                    350, 250, 25, 'laptop', 'computer pc mac qlab'],
    ['', 'Confidence monitor',          730, 250, 450, 'monitor-tv', 'confidence monitor skjerm konfidansmonitor']
  ]);

  /* ---------------- lookup and search ---------------- */


  /* Item IDs are derived from brand + model, so translating a name moves its
     ID. Palettes are stored by ID, so every rename is recorded here and
     resolved on lookup — a palette saved before the UI was translated still
     finds its items. */
  var LEGACY_IDS = {
    'generic-tr-dl-s-h-ndholdt': 'generic-wireless-handheld',
    'generic-mygg-lavalier': 'generic-lavalier',
    'generic-kormikrofon': 'generic-choir-mic',
    'generic-talerstolmikrofon': 'generic-lectern-mic',
    'trommesett-kompakt': 'drum-kit-compact',
    'trommesett': 'drum-kit',
    'perkusjon': 'percussion',
    'halvflygel': 'baby-grand-piano',
    'flygel': 'grand-piano',
    'piano-oppreist': 'upright-piano',
    'gitarcombo': 'guitar-combo',
    'gitar-4x12': 'guitar-4x12',
    'bassrigg-4x10': 'bass-rig-4x10',
    'bassrigg-8x10': 'bass-rig-8x10',
    'akustisk-combo': 'acoustic-combo',
    'podium-2x1-5-m': 'riser-2x1-5-m',
    'podium-2x1-m': 'riser-2x1-m',
    'podium-1x1-m': 'riser-1x1-m',
    'podium-8x4-ft': 'riser-8x4-ft',
    'trommepodium-2x2-m': 'drum-riser-2x2-m',
    'trommepodium-3x2-m': 'drum-riser-3x2-m',
    'praktikabel-1x2-m': 'platform-1x2-m',
    'mikrofonstativ-galge': 'mic-stand-boom',
    'mikrofonstativ-lavt': 'mic-stand-short',
    'mikrofonstativ-rundt': 'mic-stand-round-base',
    'h-yttalerstativ': 'speaker-stand',
    'notestativ': 'music-stand',
    'stol': 'chair',
    'krakk': 'stool',
    'bord-1-2x0-6-m': 'table-1-2x0-6-m',
    'talerstol': 'lectern',
    'miksepult-bord': 'mix-position-table',
    'musiker': 'musician',
    'vokalist': 'vocalist',
    'skuespiller': 'actor',
    'dirigent': 'conductor',
    'di-boks': 'di-box',
    'str-muttak': 'power-outlet',
    'kraftuttak-16a': 'power-16a',
    'multikabel-stagebox': 'multicore-stagebox',
    'projeksjonslerret-4-m': 'projection-screen-4-m',
    'projeksjonslerret-2-m': 'projection-screen-2-m',
    'konfidansmonitor': 'confidence-monitor'
  };

  function resolveId(id) {
    if (byId[id]) return id;
    return LEGACY_IDS[id] || id;
  }

  function get(id) { return byId[resolveId(id)] || null; }

  function all() { return items.slice(); }

  function categories() { return CATEGORIES.slice(); }

  function categoryLabel(id) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === id) return CATEGORIES[i].label;
    }
    return id;
  }

  /**
   * Free-text search. Every space-separated term must appear somewhere in the
   * item, so "shure 58" and "d&b wedge" both narrow sensibly. Results are
   * ranked: model-name hits first, then a hit anywhere.
   */
  function search(query, limit) {
    var q = String(query || '').toLowerCase().trim();
    if (!q) return [];
    var terms = q.split(/\s+/);
    var hits = [];

    for (var i = 0; i < items.length; i++) {
      var it = items[i], ok = true;
      for (var t = 0; t < terms.length; t++) {
        if (it.search.indexOf(terms[t]) === -1) { ok = false; break; }
      }
      if (!ok) continue;

      var name = it.name.toLowerCase();
      var score = 0;
      if (name.indexOf(q) === 0) score = 100;
      else if (it.model.toLowerCase().indexOf(q) === 0) score = 90;
      else if (name.indexOf(q) !== -1) score = 70;
      else if (it.brand.toLowerCase().indexOf(terms[0]) === 0) score = 50;
      else score = 20;
      hits.push({ item: it, score: score });
    }

    hits.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.name.localeCompare(b.item.name);
    });

    return hits.slice(0, limit || 40).map(function (h) { return h.item; });
  }

  function inCategory(cat, sub) {
    return items.filter(function (it) {
      return it.cat === cat && (!sub || it.sub === sub);
    });
  }

  function subcategories(cat) {
    var seen = {}, out = [];
    items.forEach(function (it) {
      if (it.cat === cat && !seen[it.sub]) { seen[it.sub] = 1; out.push(it.sub); }
    });
    return out;
  }

  /* Items that reproduce the palette the tool shipped with. */
  var DEFAULT_PALETTE = [
    'vue-audiotechnik-al-8',
    'vue-audiotechnik-al-4',
    'vue-audiotechnik-h-5',
    'genelec-8030c',
    'genelec-8040b',
    'genelec-8050b',
    'meyer-sound-cq-1',
    'meyer-sound-upm-1p',
    'shure-sm58',
    'tv-55',
    'generic-lavalier',
    'jbl-boombox-3'
  ];

  return {
    all: all,
    get: get,
    search: search,
    categories: categories,
    categoryLabel: categoryLabel,
    inCategory: inCategory,
    subcategories: subcategories,
    defaultPalette: DEFAULT_PALETTE,
    resolveId: resolveId,
    /* let a user-defined item join the library at runtime */
    register: function (item) {
      if (!item || !item.id || byId[item.id]) return false;
      item.search = ((item.name || '') + ' ' + (item.sub || '') + ' ' + (item.cat || '') +
        ' ' + (item.tags || '')).toLowerCase();
      items.push(item); byId[item.id] = item;
      return true;
    }
  };
})();

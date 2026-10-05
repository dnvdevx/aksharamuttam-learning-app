// Complete Malayalam Alphabet Curriculum
const MALAYALAM_CURRICULUM = [
    // ── Vowels (സ്വരാക്ഷരങ്ങൾ - 15) ──────────────────────────
    { id: 'v1',  char: 'അ', roman: 'a',   type: 'vowel', word: 'അമ്മ',     translit: 'Amma',      meaning: 'Mother'   },
    { id: 'v2',  char: 'ആ', roman: 'aa',  type: 'vowel', word: 'ആന',      translit: 'Aana',      meaning: 'Elephant' },
    { id: 'v3',  char: 'ഇ', roman: 'i',   type: 'vowel', word: 'ഇല',      translit: 'Ila',       meaning: 'Leaf'     },
    { id: 'v4',  char: 'ഈ', roman: 'ee',  type: 'vowel', word: 'ഈച്ച',    translit: 'Eecha',     meaning: 'Fly'      },
    { id: 'v5',  char: 'ഉ', roman: 'u',   type: 'vowel', word: 'ഉറുമ്പ്',  translit: 'Urumbu',    meaning: 'Ant'      },
    { id: 'v6',  char: 'ഊ', roman: 'oo',  type: 'vowel', word: 'ഊഞ്ഞാൽ',  translit: 'Oonjal',    meaning: 'Swing'    },
    { id: 'v7',  char: 'ഋ', roman: 'ru',  type: 'vowel', word: 'ഋഷി',     translit: 'Rishi',     meaning: 'Sage'     },
    { id: 'v8',  char: 'എ', roman: 'e',   type: 'vowel', word: 'എലി',     translit: 'Eli',       meaning: 'Rat'      },
    { id: 'v9',  char: 'ഏ', roman: 'ae',  type: 'vowel', word: 'ഏണി',     translit: 'Aeni',      meaning: 'Ladder'   },
    { id: 'v10', char: 'ഐ', roman: 'ai',  type: 'vowel', word: 'ഐശ്വര്യം', translit: 'Aishwaryam', meaning: 'Prosperity' },
    { id: 'v11', char: 'ഒ', roman: 'o',   type: 'vowel', word: 'ഒട്ടകം',   translit: 'Ottakam',   meaning: 'Camel'    },
    { id: 'v12', char: 'ഓ', roman: 'oo',  type: 'vowel', word: 'ഓട്',     translit: 'Oadu',      meaning: 'Tile'     },
    { id: 'v13', char: 'ഔ', roman: 'au',  type: 'vowel', word: 'ഔഷധം',    translit: 'Aushadham', meaning: 'Medicine' },
    { id: 'v14', char: 'അം', roman: 'am', type: 'vowel', word: 'അംശം',    translit: 'Amsham',    meaning: 'Part'     },
    { id: 'v15', char: 'അഃ', roman: 'ah', type: 'vowel', word: 'ദുഃഖം',   translit: 'Duhkham',   meaning: 'Sorrow'   },

    // ── Consonants (വ്യഞ്ജനാക്ഷരങ്ങൾ - 36) ───────────────────
    // Kavarga (കവർഗ്ഗം)
    { id: 'c1',  char: 'ക', roman: 'ka',  type: 'consonant', word: 'കമലം',   translit: 'Kamalam',   meaning: 'Lotus'    },
    { id: 'c2',  char: 'ഖ', roman: 'kha', type: 'consonant', word: 'ഖരം',    translit: 'Kharam',    meaning: 'Rough'    },
    { id: 'c3',  char: 'ഗ', roman: 'ga',  type: 'consonant', word: 'ഗജം',    translit: 'Gajam',     meaning: 'Elephant' },
    { id: 'c4',  char: 'ഘ', roman: 'gha', type: 'consonant', word: 'ഘടം',    translit: 'Ghatam',    meaning: 'Pot'      },
    { id: 'c5',  char: 'ങ', roman: 'nga', type: 'consonant', word: 'ങ',      translit: 'Nga',       meaning: 'Ng sound' },

    // Chavarga (ചവർഗ്ഗം)
    { id: 'c6',  char: 'ച', roman: 'cha', type: 'consonant', word: 'ചന്ദ്രൻ', translit: 'Chandran',  meaning: 'Moon'     },
    { id: 'c7',  char: 'ഛ', roman: 'chha',type: 'consonant', word: 'ഛത്രം',  translit: 'Chhatram',  meaning: 'Umbrella' },
    { id: 'c8',  char: 'ജ', roman: 'ja',  type: 'consonant', word: 'ജലം',    translit: 'Jalam',     meaning: 'Water'    },
    { id: 'c9',  char: 'ഝ', roman: 'jha', type: 'consonant', word: 'ഝരം',    translit: 'Jharam',    meaning: 'Stream'   },
    { id: 'c10', char: 'ഞ', roman: 'nya', type: 'consonant', word: 'ഞണ്ട്',   translit: 'Njandu',    meaning: 'Crab'     },

    // Tavarga 1 (ടവർഗ്ഗം)
    { id: 'c11', char: 'ട', roman: 'tta', type: 'consonant', word: 'ടമാറ്റോ', translit: 'Tomato',   meaning: 'Tomato'   },
    { id: 'c12', char: 'ഠ', roman: 'ttha',type: 'consonant', word: 'ഠാവ്',    translit: 'Thaavu',    meaning: 'Sign'     },
    { id: 'c13', char: 'ഡ', roman: 'dda', type: 'consonant', word: 'ഡപ്പി',   translit: 'Dappi',     meaning: 'Tin box'  },
    { id: 'c14', char: 'ഢ', roman: 'ddha',type: 'consonant', word: 'ഢക്ക',    translit: 'Dhakka',    meaning: 'Drum'     },
    { id: 'c15', char: 'ണ', roman: 'nna', type: 'consonant', word: 'പണം',    translit: 'Panam',     meaning: 'Money'    },

    // Tavarga 2 (തവർഗ്ഗം)
    { id: 'c16', char: 'ത', roman: 'ta',  type: 'consonant', word: 'തവള',    translit: 'Thavala',   meaning: 'Frog'     },
    { id: 'c17', char: 'ഥ', roman: 'tha', type: 'consonant', word: 'രഥം',    translit: 'Ratham',    meaning: 'Chariot'  },
    { id: 'c18', char: 'ദ', roman: 'da',  type: 'consonant', word: 'ദന്തം',   translit: 'Dantham',   meaning: 'Tooth'    },
    { id: 'c19', char: 'ധ', roman: 'dha', type: 'consonant', word: 'ധനുസ്സ്', translit: 'Dhanussu',  meaning: 'Bow'      },
    { id: 'c20', char: 'ന', roman: 'na',  type: 'consonant', word: 'നദി',     translit: 'Nadi',      meaning: 'River'    },

    // Pavarga (പവർഗ്ഗം)
    { id: 'c21', char: 'പ', roman: 'pa',  type: 'consonant', word: 'പന്ത്',   translit: 'Panthu',    meaning: 'Ball'     },
    { id: 'c22', char: 'ഫ', roman: 'pha', type: 'consonant', word: 'ഫലം',    translit: 'Phalam',    meaning: 'Fruit'    },
    { id: 'c23', char: 'ബ', roman: 'ba',  type: 'consonant', word: 'ബസ്',     translit: 'Bus',       meaning: 'Bus'      },
    { id: 'c24', char: 'ഭ', roman: 'bha', type: 'consonant', word: 'ഭാരതം',   translit: 'Bharatham', meaning: 'India'    },
    { id: 'c25', char: 'മ', roman: 'ma',  type: 'consonant', word: 'മരം',     translit: 'Maram',     meaning: 'Tree'     },

    // Madhyasthangal & Ooshmakkal (മധ്യസ്ഥങ്ങളും ഊഷ്മാക്കളും)
    { id: 'c26', char: 'യ', roman: 'ya',  type: 'consonant', word: 'യാത്ര',   translit: 'Yaathra',   meaning: 'Journey'  },
    { id: 'c27', char: 'ര', roman: 'ra',  type: 'consonant', word: 'രവി',     translit: 'Ravi',      meaning: 'Sun'      },
    { id: 'c28', char: 'ല', roman: 'la',  type: 'consonant', word: 'ലത',     translit: 'Latha',     meaning: 'Creeper'  },
    { id: 'c29', char: 'വ', roman: 'va',  type: 'consonant', word: 'വനം',     translit: 'Vanam',     meaning: 'Forest'   },
    { id: 'c30', char: 'ശ', roman: 'sha', type: 'consonant', word: 'ശംഖ്',    translit: 'Shankhu',   meaning: 'Conch'    },
    { id: 'c31', char: 'ഷ', roman: 'ssa', type: 'consonant', word: 'ഷഡ്പദം',  translit: 'Shadpadam', meaning: 'Hexapod'  },
    { id: 'c32', char: 'സ', roman: 'sa',  type: 'consonant', word: 'സൂര്യൻ',  translit: 'Sooryan',   meaning: 'Sun'      },
    { id: 'c33', char: 'ഹ', roman: 'ha',  type: 'consonant', word: 'ഹംസം',   translit: 'Hamsam',    meaning: 'Swan'     },
    { id: 'c34', char: 'ള', roman: 'lla', type: 'consonant', word: 'വാള',    translit: 'Vaala',     meaning: 'Fish'     },
    { id: 'c35', char: 'ഴ', roman: 'zha', type: 'consonant', word: 'മഴ',     translit: 'Mazha',     meaning: 'Rain'     },
    { id: 'c36', char: 'റ', roman: 'rra', type: 'consonant', word: 'പറ',     translit: 'Para',      meaning: 'Measure'  },

    // ── Chillu Letters (ചില്ലക്ഷരങ്ങൾ - 5) ─────────────────────
    { id: 'ch1', char: 'ൺ', roman: 'n',  type: 'chillu', word: 'കേൺ',   translit: 'Kern',    meaning: 'Hear (imp.)' },
    { id: 'ch2', char: 'ൻ', roman: 'n',  type: 'chillu', word: 'മൻ',    translit: 'Man',     meaning: 'Mind'        },
    { id: 'ch3', char: 'ർ', roman: 'r',  type: 'chillu', word: 'കർ',    translit: 'Kar',     meaning: 'Hand'        },
    { id: 'ch4', char: 'ൽ', roman: 'l',  type: 'chillu', word: 'കൽ',    translit: 'Kal',     meaning: 'Stone'       },
    { id: 'ch5', char: 'ൾ', roman: 'l',  type: 'chillu', word: 'കൾ',    translit: 'Kal',     meaning: 'Stones'      },
];

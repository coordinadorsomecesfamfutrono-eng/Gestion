// Almacenamiento de datos en memoria
var DataStore = {
    profesionales: [
        // MÉDICOS
        { nombre: 'ROBERTO', profesion: 'MEDICO', establecimientos: ['CECOSF', 'LONCOPAN'], obs: null },
        { nombre: 'FABIAN', profesion: 'MEDICO', establecimientos: ['ISLA HUAPI'], obs: null },
        { nombre: 'EMILIO', profesion: 'MEDICO', establecimientos: ['LLIFEN', 'ARQUILHUE', 'CAUNAHUE'], obs: null },
        { nombre: 'CANELO', profesion: 'MEDICO', establecimientos: ['CURRIÑE', 'MAIHUE', 'CHABRANCO', 'HUEINAHUE'], obs: null },
        { nombre: 'DRA. CARO', profesion: 'MEDICO', establecimientos: ['NONTUELA', 'LAS QUEMAS'], obs: null },
        { nombre: 'DR. SEBA', profesion: 'MEDICO', establecimientos: ['NONTUELA'], obs: null },

        // MATRONES
        { nombre: 'STEPHANIE', profesion: 'MATRON', establecimientos: ['CECOSF', 'LONCOPAN', 'ISLA HUAPI'], obs: null },
        { nombre: 'MATRONA NONTUELA', profesion: 'MATRON', establecimientos: ['NONTUELA'], obs: null },

        // ODONTÓLOGOS
        { nombre: 'VALERIA', profesion: 'ODONTOLOGO', establecimientos: ['LLIFEN'], obs: 'SOLO ASISTE LUNES MARTES Y MIERCOLES' },
        { nombre: 'JUAN PABLO', profesion: 'ODONTOLOGO', establecimientos: ['LLIFEN', 'CURRIÑE', 'MAIHUE', 'HUEINAHUE'], obs: 'SOLO ASISTE JUEVES Y VIERNES' },
        { nombre: 'ODONT. NONTUELA', profesion: 'ODONTOLOGO', establecimientos: ['NONTUELA'], obs: null },

        // OTROS PROFESIONALES NONTUELA
        { nombre: 'ENF. NONTUELA', profesion: 'ENFERMERO', establecimientos: ['NONTUELA'], obs: null },
        { nombre: 'A. SOCIAL NONTUELA', profesion: 'ASISTENTE_SOCIAL', establecimientos: ['NONTUELA'], obs: null },
        { nombre: 'NUTRI NONTUELA', profesion: 'NUTRICIONISTA', establecimientos: ['NONTUELA'], obs: null },
        { nombre: 'PSICO NONTUELA', profesion: 'PSICOLOGO', establecimientos: ['NONTUELA'], obs: null }
    ],

    establecimientos: [
        { nombre: 'NONTUELA', boxes: 6, restriccion: null },
        { nombre: 'LLIFEN', boxes: 4, restriccion: null },
        { nombre: 'MAIHUE', boxes: 4, restriccion: null },
        { nombre: 'CURRIÑE', boxes: 4, restriccion: null },
        { nombre: 'CHABRANCO', boxes: 4, restriccion: 'LUNES_A_JUEVES' },
        { nombre: 'HUEINAHUE', boxes: 3, restriccion: 'SOLO_MIERCOLES' },
        { nombre: 'ARQUILHUE', boxes: 3, restriccion: null },
        { nombre: 'ISLA HUAPI', boxes: 3, restriccion: 'MARTES_Y_JUEVES_1_3' },
        { nombre: 'CECOSF', boxes: 5, restriccion: null },
        { nombre: 'LONCOPAN', boxes: 5, restriccion: null },
        { nombre: 'LAS QUEMAS', boxes: 2, restriccion: null },
        { nombre: 'CAUNAHUE', boxes: 2, restriccion: null }
    ],

    rondasMinimas: [
        // MÉDICOS
        { profesion: 'MEDICO', establecimiento: 'CECOSF', cantidad: 15 },
        { profesion: 'MEDICO', establecimiento: 'LONCOPAN', cantidad: 15 },
        { profesion: 'MEDICO', establecimiento: 'ISLA HUAPI', cantidad: 4 },
        { profesion: 'MEDICO', establecimiento: 'HUEINAHUE', cantidad: 4 },
        { profesion: 'MEDICO', establecimiento: 'LLIFEN', cantidad: 10 },
        { profesion: 'MEDICO', establecimiento: 'CURRIÑE', cantidad: 8 },
        { profesion: 'MEDICO', establecimiento: 'MAIHUE', cantidad: 8 },
        { profesion: 'MEDICO', establecimiento: 'NONTUELA', cantidad: 20 }, // Alta frecuencia
        { profesion: 'MEDICO', establecimiento: 'LAS QUEMAS', cantidad: 4 },
        { profesion: 'MEDICO', establecimiento: 'ARQUILHUE', cantidad: 4 },
        { profesion: 'MEDICO', establecimiento: 'CAUNAHUE', cantidad: 4 },

        // MATRONES
        { profesion: 'MATRON', establecimiento: 'CECOSF', cantidad: 10 },
        { profesion: 'MATRON', establecimiento: 'LONCOPAN', cantidad: 10 },
        { profesion: 'MATRON', establecimiento: 'ISLA HUAPI', cantidad: 4 },
        { profesion: 'MATRON', establecimiento: 'NONTUELA', cantidad: 15 },

        // ODONTÓLOGOS
        { profesion: 'ODONTOLOGO', establecimiento: 'LLIFEN', cantidad: 12 }, // Cubierto por 2 dentistas
        { profesion: 'ODONTOLOGO', establecimiento: 'CURRIÑE', cantidad: 6 },
        { profesion: 'ODONTOLOGO', establecimiento: 'MAIHUE', cantidad: 6 },
        { profesion: 'ODONTOLOGO', establecimiento: 'NONTUELA', cantidad: 15 },

        // OTROS
        { profesion: 'ENFERMERO', establecimiento: 'NONTUELA', cantidad: 20 },
        { profesion: 'NUTRICIONISTA', establecimiento: 'NONTUELA', cantidad: 10 },
        { profesion: 'PSICOLOGO', establecimiento: 'NONTUELA', cantidad: 10 },
        { profesion: 'ASISTENTE_SOCIAL', establecimiento: 'NONTUELA', cantidad: 10 }
    ]
};

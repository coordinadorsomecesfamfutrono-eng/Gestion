// Módulo de feriados chilenos
var FeriadosChile = {
    // Feriados fijos
    feriadosFijos: [
        { mes: 1, dia: 1, nombre: 'Año Nuevo' },
        { mes: 5, dia: 1, nombre: 'Día del Trabajo' },
        { mes: 5, dia: 21, nombre: 'Día de las Glorias Navales' },
        { mes: 7, dia: 16, nombre: 'Virgen del Carmen' },
        { mes: 8, dia: 15, nombre: 'Asunción de la Virgen' },
        { mes: 9, dia: 18, nombre: 'Independencia de Chile' },
        { mes: 9, dia: 19, nombre: 'Día de las Glorias del Ejército' },
        { mes: 11, dia: 1, nombre: 'Día de Todos los Santos' },
        { mes: 12, dia: 8, nombre: 'Inmaculada Concepción' },
        { mes: 12, dia: 25, nombre: 'Navidad' }
    ],

    // Calcular Semana Santa (Viernes y Sábado Santo)
    calcularSemanaSanta(anio) {
        // Algoritmo de Computus para calcular la Pascua
        const a = anio % 19;
        const b = Math.floor(anio / 100);
        const c = anio % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const mes = Math.floor((h + l - 7 * m + 114) / 31);
        const dia = ((h + l - 7 * m + 114) % 31) + 1;

        // Domingo de Pascua
        const pascua = new Date(anio, mes - 1, dia);

        // Viernes Santo (2 días antes)
        const viernesSanto = new Date(pascua);
        viernesSanto.setDate(pascua.getDate() - 2);

        // Sábado Santo (1 día antes)
        const sabadoSanto = new Date(pascua);
        sabadoSanto.setDate(pascua.getDate() - 1);

        return [
            { fecha: viernesSanto, nombre: 'Viernes Santo' },
            { fecha: sabadoSanto, nombre: 'Sábado Santo' }
        ];
    },

    // Verificar si una fecha es feriado
    esFeriado(fecha) {
        const dia = fecha.getDate();
        const mes = fecha.getMonth() + 1; // JavaScript usa 0-11
        const anio = fecha.getFullYear();

        // Verificar feriados fijos
        const esFeriadoFijo = this.feriadosFijos.some(f => f.mes === mes && f.dia === dia);
        if (esFeriadoFijo) return true;

        // Verificar Semana Santa
        const semanaSanta = this.calcularSemanaSanta(anio);
        const esSemanaSanta = semanaSanta.some(ss =>
            ss.fecha.getDate() === dia &&
            ss.fecha.getMonth() + 1 === mes
        );
        if (esSemanaSanta) return true;

        // Feriados que se mueven al lunes (ley de feriados irrenunciables)
        // San Pedro y San Pablo (29 junio)
        if (mes === 6 && dia === 29) {
            const diaSemana = fecha.getDay();
            // Si cae martes a viernes, se mueve al lunes siguiente
            // Si cae sábado o domingo, también se mueve al lunes siguiente
            // Solo es feriado el lunes
            return false; // El 29 original no es feriado, solo el lunes movido
        }

        // Verificar si es el lunes más cercano a San Pedro y San Pablo
        if (mes === 6 || mes === 7) {
            const sanPedro = new Date(anio, 5, 29); // 29 de junio
            const diaSemana = sanPedro.getDay();

            if (diaSemana >= 2 && diaSemana <= 5) {
                // Si cae martes a viernes, el feriado es el lunes siguiente
                const feriadoMovido = new Date(sanPedro);
                const diasHastaLunes = (8 - diaSemana) % 7 || 7;
                feriadoMovido.setDate(sanPedro.getDate() + diasHastaLunes);

                if (fecha.getDate() === feriadoMovido.getDate() &&
                    fecha.getMonth() === feriadoMovido.getMonth()) {
                    return true;
                }
            } else if (diaSemana === 0 || diaSemana === 1 || diaSemana === 6) {
                // Si cae domingo, sábado o lunes, el feriado es el lunes más cercano
                let diasAjuste = 0;
                if (diaSemana === 0) diasAjuste = 1; // Domingo -> Lunes siguiente
                if (diaSemana === 6) diasAjuste = 2; // Sábado -> Lunes siguiente

                const feriadoMovido = new Date(sanPedro);
                feriadoMovido.setDate(sanPedro.getDate() + diasAjuste);

                if (fecha.getDate() === feriadoMovido.getDate() &&
                    fecha.getMonth() === feriadoMovido.getMonth()) {
                    return true;
                }
            }
        }

        // Día de la Raza (12 octubre) - se mueve al lunes más cercano
        if (mes === 10) {
            const diaRaza = new Date(anio, 9, 12);
            const diaSemana = diaRaza.getDay();

            if (diaSemana >= 2 && diaSemana <= 5) {
                const feriadoMovido = new Date(diaRaza);
                const diasHastaLunes = (8 - diaSemana) % 7 || 7;
                feriadoMovido.setDate(diaRaza.getDate() + diasHastaLunes);

                if (fecha.getDate() === feriadoMovido.getDate() &&
                    fecha.getMonth() === feriadoMovido.getMonth()) {
                    return true;
                }
            } else if (diaSemana === 0 || diaSemana === 1 || diaSemana === 6) {
                let diasAjuste = 0;
                if (diaSemana === 0) diasAjuste = 1;
                if (diaSemana === 6) diasAjuste = 2;

                const feriadoMovido = new Date(diaRaza);
                feriadoMovido.setDate(diaRaza.getDate() + diasAjuste);

                if (fecha.getDate() === feriadoMovido.getDate() &&
                    fecha.getMonth() === feriadoMovido.getMonth()) {
                    return true;
                }
            }
        }

        return false;
    },

    // Obtener nombre del feriado
    getNombreFeriado(fecha) {
        const dia = fecha.getDate();
        const mes = fecha.getMonth() + 1;
        const anio = fecha.getFullYear();

        // Buscar en feriados fijos
        const feriadoFijo = this.feriadosFijos.find(f => f.mes === mes && f.dia === dia);
        if (feriadoFijo) return feriadoFijo.nombre;

        // Buscar en Semana Santa
        const semanaSanta = this.calcularSemanaSanta(anio);
        const esSS = semanaSanta.find(ss =>
            ss.fecha.getDate() === dia &&
            ss.fecha.getMonth() + 1 === mes
        );
        if (esSS) return esSS.nombre;

        return 'Feriado';
    }
};

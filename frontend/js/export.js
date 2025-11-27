var Exportador = {
    exportarCSV(distribucion) {
        let csv = 'Profesional,Profesión,Establecimiento,Rondas Requeridas,Rondas Asignadas,Días\\n';

        for (const asig of distribucion.asignaciones) {
            const dias = asig.dias.map(d => `${d.dia}-${d.diaSemana}`).join('; ');
            csv += `${asig.profesional},${asig.profesion},${asig.establecimiento},${asig.requeridas},${asig.asignadas},"${dias}"\\n`;
        }

        // Crear blob y descargar
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `distribucion_${distribucion.mes}_${distribucion.anio}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

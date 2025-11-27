// Módulo de exportación a PDF
var PDFExport = {
    exportarPDF(distribucion) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Título
        doc.setFontSize(18);
        doc.text(`Distribución de Personal - ${distribucion.mes}/${distribucion.anio}`, 14, 20);

        // Tabla
        const headers = [['Profesional', 'Profesión', 'Establecimiento', 'Req.', 'Asig.', 'Días']];
        const data = distribucion.asignaciones.map(a => [
            a.profesional,
            a.profesion,
            a.establecimiento,
            a.requeridas.toString(),
            a.asignadas.toString(),
            a.dias.map(d => d.dia).join(', ')
        ]);

        doc.autoTable({
            head: headers,
            body: data,
            startY: 30,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [44, 62, 80] } // Azul Navy
        });

        doc.save(`distribucion_${distribucion.mes}_${distribucion.anio}.pdf`);
    },

    async exportarCalendarioPDF() {
        const element = document.getElementById('calendarioContainer');
        if (!element) return;

        try {
            // Mostrar loader si existe o cambiar cursor
            document.body.style.cursor = 'wait';

            const canvas = await html2canvas(element, {
                scale: 2, // Mayor calidad
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;

            // Orientación horizontal (landscape) para el calendario
            const doc = new jsPDF('l', 'mm', 'a4');

            const imgWidth = 280; // A4 landscape width approx minus margins
            const pageHeight = 210;
            const imgHeight = canvas.height * imgWidth / canvas.width;

            doc.setFontSize(16);
            doc.text('Calendario de Distribución', 15, 15);

            doc.addImage(imgData, 'PNG', 10, 25, imgWidth, imgHeight);
            doc.save('calendario_distribucion.pdf');

        } catch (error) {
            console.error('Error al exportar calendario:', error);
            alert('Hubo un error al generar el PDF del calendario.');
        } finally {
            document.body.style.cursor = 'default';
        }
    }
};

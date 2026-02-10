/**
 * PDF Generator for Billing Reports
 * 
 * Generates professional PDFs using jsPDF + jspdf-autotable.
 * Returns a base64-encoded PDF string.
 */

/**
 * Generate a billing PDF for a given bill period data.
 * 
 * NOTE: jsPDF is a client-side library. This module is intended for
 * client-side use or can be used server-side with appropriate setup.
 * For server-side PDF generation in Next.js, we use dynamic import.
 * 
 * @param {Object} data - Bill period data
 * @returns {string} Base64 encoded PDF
 */
export async function generateBillingPDF(data) {
    // Dynamic import for server-side compatibility
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default

    const doc = new jsPDF()

    // Header
    doc.setFontSize(20)
    doc.setTextColor(59, 130, 246)
    doc.text('⚡ Stromabrechnung', 14, 22)

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, 14, 30)

    // Period Info
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text('Abrechnungszeitraum', 14, 45)

    doc.setFontSize(11)
    const fromDate = new Date(data.fromDate).toLocaleDateString('de-DE')
    const toDate = new Date(data.toDate).toLocaleDateString('de-DE')
    doc.text(`${fromDate}  →  ${toDate}  (${data.billingMonths} Monat${data.billingMonths !== 1 ? 'e' : ''})`, 14, 53)

    // Consumption Table
    doc.setFontSize(14)
    doc.text('Verbrauch', 14, 68)

    autoTable(doc, {
        startY: 72,
        head: [['Tarif', 'Verbrauch (kWh)']],
        body: [
            ['Hochtarif (HT)', `${data.diffHT.toFixed(1)} kWh`],
            ['Niedertarif (NT)', `${data.diffNT.toFixed(1)} kWh`],
            ['Gesamt', `${(data.diffHT + data.diffNT).toFixed(1)} kWh`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
    })

    // Cost Table
    const costStartY = doc.lastAutoTable.finalY + 15
    doc.setFontSize(14)
    doc.text('Kostenaufschlüsselung', 14, costStartY)

    autoTable(doc, {
        startY: costStartY + 4,
        head: [['Position', 'Betrag']],
        body: [
            ['Arbeitspreis (Strom)', `${data.energyCost.toFixed(2)} €`],
            ['Grundgebühr', `${data.baseFeeCost.toFixed(2)} €`],
            ['Gesamtbetrag', `${data.totalCost.toFixed(2)} €`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 11 }
    })

    // Footer
    const footerY = doc.lastAutoTable.finalY + 20
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.text('Automatisch generiert vom Stromabrechnung Portal', 14, footerY)

    return doc.output('datauristring')
}

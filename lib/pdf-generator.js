/**
 * PDF Generator for Billing Reports
 * 
 * Generates professional PDFs using jsPDF + jspdf-autotable.
 */

function formatCurrency(value) {
    return `${Number(value).toFixed(2)} EUR`
}

function formatReadingValue(value) {
    return `${Number(value).toFixed(1)} kWh`
}

async function createBillingPdfDocument(data) {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default

    const doc = new jsPDF()

    // Header
    doc.setFontSize(20)
    doc.setTextColor(59, 130, 246)
    doc.text('Stromabrechnung', 14, 22)

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
    doc.text(`${fromDate} -> ${toDate} (${data.billingMonths} Monat${data.billingMonths !== 1 ? 'e' : ''})`, 14, 53)

    doc.setFillColor(241, 245, 249)
    doc.roundedRect(14, 59, 182, 18, 3, 3, 'F')
    doc.setFontSize(11)
    doc.setTextColor(31, 41, 55)
    doc.text('Gesamtbetrag', 18, 67)
    doc.setFontSize(16)
    doc.setTextColor(16, 185, 129)
    doc.text(formatCurrency(data.totalCost), 18, 74)
    doc.setFontSize(10)
    doc.setTextColor(75, 85, 99)
    doc.text(`Erstellt fuer lokalen Export am ${new Date().toLocaleDateString('de-DE')}`, 110, 70, { align: 'left' })

    // Consumption Table
    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text('Verbrauch', 14, 89)

    autoTable(doc, {
        startY: 93,
        head: [['Tarif', 'Verbrauch (kWh)']],
        body: [
            ['Hochtarif (HT)', formatReadingValue(data.diffHT)],
            ['Niedertarif (NT)', formatReadingValue(data.diffNT)],
            ['Gesamt', formatReadingValue(data.diffHT + data.diffNT)]
        ],
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }
    })

    const readingStartY = doc.lastAutoTable.finalY + 15
    doc.setFontSize(14)
    doc.text('Zaehlerstaende', 14, readingStartY)

    autoTable(doc, {
        startY: readingStartY + 4,
        head: [['Messpunkt', 'Datum', 'HT', 'NT']],
        body: [
            [
                'Start',
                new Date(data.fromReading.date).toLocaleDateString('de-DE'),
                formatReadingValue(data.fromReading.valueHT),
                formatReadingValue(data.fromReading.valueNT)
            ],
            [
                'Ende',
                new Date(data.toReading.date).toLocaleDateString('de-DE'),
                formatReadingValue(data.toReading.valueHT),
                formatReadingValue(data.toReading.valueNT)
            ]
        ],
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] },
        styles: { fontSize: 10 }
    })

    // Cost Table
    const costStartY = doc.lastAutoTable.finalY + 15
    doc.setFontSize(14)
    doc.text('Kostenaufschluesselung', 14, costStartY)

    autoTable(doc, {
        startY: costStartY + 4,
        head: [['Position', 'Betrag']],
        body: [
            ['Arbeitspreis (Strom)', formatCurrency(data.energyCost)],
            ['Grundgebuehr', formatCurrency(data.baseFeeCost)],
            ['Gesamtbetrag', formatCurrency(data.totalCost)]
        ],
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 11 }
    })

    const priceStartY = doc.lastAutoTable.finalY + 15
    doc.setFontSize(14)
    doc.text('Preisgrundlage', 14, priceStartY)

    autoTable(doc, {
        startY: priceStartY + 4,
        head: [['Position', 'Wert']],
        body: [
            ['Gueltig ab', new Date(data.price.validFrom).toLocaleDateString('de-DE')],
            ['Arbeitspreis HT', `${Number(data.price.priceHT).toFixed(4)} EUR/kWh`],
            ['Arbeitspreis NT', `${Number(data.price.priceNT).toFixed(4)} EUR/kWh`],
            ['Grundgebuehr', `${Number(data.price.baseFee).toFixed(2)} EUR/Monat`],
            ['HT-Anteil Grundgebuehr', `${Number(data.price.baseFeeSplit).toFixed(0)} %`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [245, 158, 11] },
        styles: { fontSize: 10 }
    })

    // Footer
    const footerY = doc.lastAutoTable.finalY + 20
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.text('Automatisch generiert vom Stromabrechnung Portal', 14, footerY)

    return doc
}

/**
 * Generate a billing PDF as an ArrayBuffer for server-side responses.
 *
 * @param {Object} data - Bill period data
 * @returns {ArrayBuffer} Binary PDF content
 */
export async function generateBillingPDFBuffer(data) {
    const doc = await createBillingPdfDocument(data)
    return doc.output('arraybuffer')
}

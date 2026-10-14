'use client'

import { useState } from 'react'
import ReadingsForm from "./ReadingsForm"
import DeleteReadingButton from "./DeleteReadingButton"

export default function ReadingRow({ reading }) {
    const [editing, setEditing] = useState(false)

    return (
        <>
            <tr>
                <td style={{ fontWeight: 500 }}>{new Date(reading.date).toLocaleDateString('de-DE')}</td>
                <td>{reading.valueHT.toLocaleString('de-DE')} kWh</td>
                <td>{reading.valueNT.toLocaleString('de-DE')} kWh</td>
                <td>
                    {reading.billed ? (
                        <span className="badge badge-success">✓ Abgerechnet</span>
                    ) : (
                        <span className="badge badge-warning">Offen</span>
                    )}
                </td>
                <td style={{ color: 'var(--text-dim)' }}>
                    {reading.meterChange && (
                        <span className="badge badge-warning" title={`Endstand alter Zähler: HT ${reading.oldFinalHT} / NT ${reading.oldFinalNT}`}>Zählertausch</span>
                    )}{' '}
                    {reading.comment || (reading.meterChange ? '' : '—')}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                    {!reading.locked && (
                        <>
                            <button
                                type="button"
                                className="btn btn-outline"
                                style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', marginRight: '0.25rem' }}
                                onClick={() => setEditing((v) => !v)}
                                title="Bearbeiten"
                            >
                                ✏️ Bearbeiten
                            </button>
                            <DeleteReadingButton id={reading.id} />
                        </>
                    )}
                </td>
            </tr>
            {editing && !reading.locked && (
                <tr>
                    <td colSpan={6}>
                        <ReadingsForm reading={reading} onDone={() => setEditing(false)} />
                    </td>
                </tr>
            )}
        </>
    )
}

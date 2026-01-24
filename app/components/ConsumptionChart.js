'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from 'recharts';

export default function ConsumptionChart({ data }) {
    if (!data || data.length === 0) return null;

    return (
        <div style={{ width: '100%', height: 400 }}>
            <ResponsiveContainer>
                <ComposedChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 20,
                        bottom: 20,
                        left: 20,
                    }}
                >
                    <defs>
                        <linearGradient id="colorHT" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorNT" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8' }}
                        tickLine={{ stroke: '#94a3b8' }}
                    />
                    <YAxis
                        yAxisId="left"
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8' }}
                        tickLine={{ stroke: '#94a3b8' }}
                        label={{ value: 'Verbrauch (kWh)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#10b981"
                        tick={{ fill: '#10b981' }}
                        tickLine={{ stroke: '#10b981' }}
                        label={{ value: 'Kosten (€)', angle: 90, position: 'insideRight', fill: '#10b981' }}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', backdropFilter: 'blur(4px)' }}
                        itemStyle={{ color: '#f8fafc' }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="ht" name="HT Verbrauch" fill="url(#colorHT)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar yAxisId="left" dataKey="nt" name="NT Verbrauch" fill="url(#colorNT)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Line yAxisId="right" type="monotone" dataKey="cost" name="Kosten" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

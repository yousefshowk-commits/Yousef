import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAppState } from '../../store/AppStore';

/** Categorical slots (fixed order) — validated palette, light / dark steps. */
export const SERIES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
export const SERIES_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

function useChartTheme() {
  const dark = useAppState().settings.theme === 'dark';
  return {
    dark,
    series: dark ? SERIES_DARK : SERIES_LIGHT,
    primary: dark ? '#9085e9' : '#6d28d9',
    grid: dark ? 'rgba(255,255,255,.07)' : 'rgba(15,23,42,.06)',
    axis: dark ? '#94a3b8' : '#64748b',
    tooltip: {
      contentStyle: {
        borderRadius: 14,
        border: 'none',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,.3)',
        background: dark ? '#1e293b' : '#ffffff',
        color: dark ? '#f1f5f9' : '#0f172a',
        direction: 'rtl' as const,
        fontFamily: 'Tajawal, sans-serif',
      },
      labelStyle: { fontWeight: 700, color: dark ? '#f1f5f9' : '#0f172a' },
      itemStyle: { color: dark ? '#cbd5e1' : '#334155' },
    },
  };
}

const tick = (color: string) => ({ fill: color, fontSize: 12, fontFamily: 'Tajawal, sans-serif' });

export interface Point {
  label: string;
  value: number;
}

/** Single series trend over time (area). */
export function TrendChart({ data, height = 240, name = 'النقاط' }: { data: Point[]; height?: number; name?: string }) {
  const t = useChartTheme();
  return (
    <div dir="ltr"><ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.primary} stopOpacity={0.35} />
            <stop offset="100%" stopColor={t.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={t.grid} />
        <XAxis dataKey="label" reversed tick={tick(t.axis)} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={14} />
        <YAxis orientation="right" tick={tick(t.axis)} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
        <Tooltip {...t.tooltip} cursor={{ stroke: t.axis, strokeDasharray: '4 4' }} />
        <Area type="monotone" dataKey="value" name={name} stroke={t.primary} strokeWidth={2} fill="url(#trendFill)" activeDot={{ r: 5, strokeWidth: 2, stroke: t.dark ? '#0b1020' : '#fff' }} />
      </AreaChart>
    </ResponsiveContainer></div>
  );
}

/** Single series vertical bars (magnitude per period). */
export function ColumnChart({ data, height = 240, name = 'النقاط', highlightLast }: { data: Point[]; height?: number; name?: string; highlightLast?: boolean }) {
  const t = useChartTheme();
  return (
    <div dir="ltr"><ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke={t.grid} />
        <XAxis dataKey="label" reversed tick={tick(t.axis)} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={10} />
        <YAxis orientation="right" tick={tick(t.axis)} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
        <Tooltip {...t.tooltip} cursor={{ fill: t.grid }} />
        <Bar dataKey="value" name={name} radius={[4, 4, 0, 0]} maxBarSize={44}>
          {data.map((_, i) => (
            <Cell key={i} fill={t.series[0]} fillOpacity={highlightLast && i !== data.length - 1 ? 0.45 : 1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer></div>
  );
}

/** Horizontal ranked bars — used for categories like reasons/rewards (sorted by magnitude). */
export function RankedBars({ data, height, name = 'العدد' }: { data: Point[]; height?: number; name?: string }) {
  const t = useChartTheme();
  const h = height ?? Math.max(160, data.length * 36 + 20);
  return (
    <div dir="ltr"><ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 4, left: 16, bottom: 0 }} barCategoryGap="24%">
        <CartesianGrid horizontal={false} stroke={t.grid} />
        <XAxis type="number" reversed tick={tick(t.axis)} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="label" orientation="right" tick={tick(t.axis)} axisLine={false} tickLine={false} width={130} />
        <Tooltip {...t.tooltip} cursor={{ fill: t.grid }} />
        <Bar dataKey="value" name={name} fill={t.series[0]} radius={[4, 0, 0, 4]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer></div>
  );
}

/** Multi series lines (e.g. groups over weeks). Colors follow the entity's own color. */
export function MultiLineChart({ data, series, height = 260 }: { data: Record<string, number | string>[]; series: { key: string; name: string; color: string }[]; height?: number }) {
  const t = useChartTheme();
  return (
    <div dir="ltr"><ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={t.grid} />
        <XAxis dataKey="label" reversed tick={tick(t.axis)} axisLine={false} tickLine={false} />
        <YAxis orientation="right" tick={tick(t.axis)} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
        <Tooltip {...t.tooltip} cursor={{ stroke: t.axis, strokeDasharray: '4 4' }} />
        <Legend wrapperStyle={{ fontFamily: 'Tajawal, sans-serif', fontSize: 13, color: t.axis }} iconType="circle" />
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: t.dark ? '#0b1020' : '#fff' }} activeDot={{ r: 6 }} />
        ))}
      </LineChart>
    </ResponsiveContainer></div>
  );
}

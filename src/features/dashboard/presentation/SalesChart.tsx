import { useId } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate, formatPrice, formatPriceCompact } from '@/lib/format'

import type { SalesPoint } from '../domain/entities'

interface SalesChartProps {
  series: SalesPoint[] | undefined
  isLoading: boolean
  days: number
}

const shortDate = (iso: string) => formatDate(iso, { year: undefined })

export function SalesChart({ series, isLoading, days }: SalesChartProps) {
  const gradientId = useId()
  const total = series?.reduce((sum, point) => sum + point.sales, 0) ?? 0

  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Sales</CardTitle>
        <CardDescription>
          {isLoading || !series ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <>
              {formatPrice(total)} over the last {days} days
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !series ? (
          <Skeleton className="h-64 w-full" />
        ) : series.length === 0 ? (
          <p className="text-muted-foreground flex h-64 items-center justify-center text-sm">
            No sales recorded in this period.
          </p>
        ) : (
          <figure>
            <div
              className="h-64 w-full"
              role="img"
              aria-label={`Daily sales for the last ${days} days, totalling ${formatPrice(total)}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value: string) => shortDate(value)}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    minTickGap={24}
                  />
                  <YAxis
                    tickFormatter={(value: number) => formatPriceCompact(value)}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  />
                  <Tooltip
                    cursor={{ stroke: 'var(--border)' }}
                    contentStyle={{
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--popover)',
                      color: 'var(--popover-foreground)',
                      fontSize: 12,
                    }}
                    formatter={(value) => [formatPrice(Number(value)), 'Sales']}
                    labelFormatter={(label) => formatDate(String(label))}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="var(--chart-1)"
                    strokeWidth={1.5}
                    fill={`url(#${gradientId})`}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <figcaption className="sr-only">
              <table>
                <caption>Daily sales and order counts</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Sales</th>
                    <th scope="col">Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((point) => (
                    <tr key={point.date}>
                      <td>{formatDate(point.date)}</td>
                      <td>{formatPrice(point.sales)}</td>
                      <td>{point.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </figcaption>
          </figure>
        )}
      </CardContent>
    </Card>
  )
}

import { useRef, useEffect } from 'react'
import {
  Chart, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend,
} from 'chart.js'

Chart.register(BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

/**
 * Dual-axis bar + line chart.
 * Bar = % of orders per bucket (left Y-axis)
 * Line = cumulative % (right Y-axis)
 * Mirrors the chart config from ui_template.html exactly.
 */
export default function PanelChart({ chartData }) {
  const canvasRef = useRef(null)
  const chartRef  = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !chartData) return

    if (chartRef.current) {
      chartRef.current.destroy()
      chartRef.current = null
    }

    const labels = chartData.buckets.map((b) => b.bucket)
    const bars   = chartData.buckets.map((b) => b.percentage)
    const cumul  = chartData.buckets.map((b) => b.cumulative_percentage)

    const maxBar = Math.max(...bars)
    const yMax   = Math.ceil((maxBar + 10) / 10) * 10

    // Custom plugin: render data labels above bars
    const barLabels = {
      id: 'barLabels',
      afterDatasetsDraw(chart) {
        const { ctx } = chart
        chart.data.datasets.forEach((dataset, di) => {
          if (dataset.type !== 'bar') return
          const meta = chart.getDatasetMeta(di)
          meta.data.forEach((bar, i) => {
            const v = dataset.data[i]
            if (!v) return
            ctx.save()
            ctx.font = '8.5px DM Sans, sans-serif'
            ctx.fillStyle = '#9CA3AF'
            ctx.textAlign = 'center'
            ctx.fillText(`${v.toFixed(0)}%`, bar.x, bar.y - 4)
            ctx.restore()
          })
        })
      },
    }

    chartRef.current = new Chart(canvasRef.current, {
      plugins: [barLabels],
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Orders',
            data: bars,
            backgroundColor: 'rgba(27,153,112,.35)',
            hoverBackgroundColor: 'rgba(27,153,112,.65)',
            borderRadius: 3,
            yAxisID: 'y',
          },
          {
            type: 'line',
            label: 'Cumulative',
            data: cumul,
            borderColor: '#0D6B4F',
            backgroundColor: 'transparent',
            borderWidth: 1.8,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#0D6B4F',
            pointRadius: 3,
            tension: 0.3,
            yAxisID: 'y2',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(ctx) {
                return ctx.dataset.type === 'bar'
                  ? ` ${ctx.parsed.y.toFixed(1)}% of orders`
                  : ` ${ctx.parsed.y.toFixed(1)}% cumulative`
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10, family: 'DM Sans' }, color: '#9CA3AF' },
          },
          y: {
            position: 'left',
            min: 0,
            max: yMax,
            grid: { color: '#F0F2F5' },
            ticks: {
              font: { size: 10, family: 'DM Sans' },
              color: '#9CA3AF',
              callback: (v) => `${v}%`,
            },
          },
          y2: {
            position: 'right',
            min: 0,
            max: 100,
            grid: { display: false },
            ticks: {
              font: { size: 10, family: 'DM Sans' },
              color: '#9CA3AF',
              callback: (v) => `${v}%`,
            },
          },
        },
      },
    })

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [chartData])

  return (
    <div style={{ height: 180, position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  )
}

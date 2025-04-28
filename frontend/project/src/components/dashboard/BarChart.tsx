import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { AnomalyLog } from '../../services/supabase';
import { useTheme } from '../../contexts/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarChartProps {
  logs: AnomalyLog[];
}

const BarChart = ({ logs }: BarChartProps) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Count by log_type
  const counts: Record<string, number> = {};
  logs.forEach(l => {
    const key = l.log_type || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  });

  // Top 10 types
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const labels = sorted.map(([type]) => type);
  const dataPoints = sorted.map(([, cnt]) => cnt);

  // Generate gradient colors
  const getGradient = (ctx: any) => {
    if (!ctx) return null;
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    if (isDark) {
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.9)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');
    } else {
      gradient.addColorStop(0, 'rgba(37, 99, 235, 0.9)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.3)');
    }
    return gradient;
  };

  const data = {
    labels,
    datasets: [
      {
        label: 'Count',
        data: dataPoints,
        backgroundColor: function(context: any) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) {
            return isDark ? 'rgba(59,130,246,0.7)' : 'rgba(59,130,246,0.8)';
          }
          return getGradient(ctx);
        },
        borderColor: isDark ? 'rgba(59,130,246,1)' : 'rgba(37,99,235,1)',
        borderWidth: 1,
        borderRadius: 8,
        hoverBackgroundColor: isDark ? 'rgba(96,165,250,0.9)' : 'rgba(37,99,235,0.9)',
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? 'rgba(17,24,39,0.9)' : 'rgba(255,255,255,0.9)',
        titleColor: isDark ? '#fff' : '#111827',
        bodyColor: isDark ? '#e5e7eb' : '#374151',
        borderColor: isDark ? 'rgba(55,65,81,0.3)' : 'rgba(209,213,219,0.8)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        callbacks: {
          title: (items) => `${items[0].label}`,
          label: (context) => `Count: ${context.parsed.y}`,
        }
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { 
          color: isDark ? '#9ca3af' : '#4b5563',
          font: { size: 11 },
          maxRotation: 45,
          minRotation: 45
        },
      },
      y: {
        grid: { 
          color: isDark ? 'rgba(75,85,99,0.2)' : 'rgba(209,213,219,0.5)',
          // drawBorder: false,
        },
        ticks: { 
          color: isDark ? '#9ca3af' : '#4b5563',
          padding: 8,
          font: { size: 11 },
        },
        beginAtZero: true,
      },
    },
    animation: {
      duration: 1200,
      easing: 'easeOutQuart',
    },
    layout: {
      padding: 8,
    },
    transitions: {
      active: {
        animation: {
          duration: 300,
        },
      },
    },
  };

  if (!logs.length) {
    return (
      <div className="flex h-60 items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400 text-center">
          No data available
          <br />
          <span className="text-sm opacity-70">Try adjusting your filters</span>
        </p>
      </div>
    );
  }

  return (
    <div className="h-60">
      <Bar data={data} options={options} />
    </div>
  );
};

export default BarChart;
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartOptions } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { AnomalyLog } from '../../services/supabase';
import { useTheme } from '../../contexts/ThemeContext';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
  logs: AnomalyLog[];
}

const PieChart = ({ logs }: PieChartProps) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const normalCount = logs.filter(l => !l.anomaly_detected).length;
  const anomalyCount = logs.filter(l => l.anomaly_detected).length;

  const data = {
    labels: ['Normal', 'Anomalous'],
    datasets: [
      {
        data: [normalCount, anomalyCount],
        backgroundColor: [
          'rgba(16, 185, 129, 0.85)',  // emerald green
          'rgba(239, 68, 68, 0.85)',   // red
        ],
        borderColor: [
          'rgba(5, 150, 105, 1)',
          'rgba(220, 38, 38, 1)',
        ],
        borderWidth: 2,
        hoverBackgroundColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        hoverBorderColor: [
          'rgba(5, 150, 105, 1)',
          'rgba(185, 28, 28, 1)',
        ],
        hoverBorderWidth: 3,
      },
    ],
  };

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          color: isDark ? '#d1d5db' : '#374151',
          font: { size: 12, weight: 'bold' },
          boxWidth: 10,
          boxHeight: 10,
        },
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(17, 24, 39, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        titleColor: isDark ? '#fff' : '#111827',
        bodyColor: isDark ? '#e5e7eb' : '#374151',
        borderColor: isDark ? 'rgba(55, 65, 81, 0.3)' : 'rgba(209, 213, 219, 0.8)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        callbacks: {
          label(context) {
            const label = context.label || '';
            const value = context.raw as number;
            const arr = context.dataset.data as number[];
            const total = arr.reduce((sum, v) => sum + v, 0) || 0;
            const pct = total ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} (${pct}%)`;
          },
        },
      },
    },
    cutout: '55%',
    radius: '90%',
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1200,
      easing: 'easeOutQuart',
    },
    layout: {
      padding: 8,
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
      <Pie data={data} options={options} />
    </div>
  );
};

export default PieChart;
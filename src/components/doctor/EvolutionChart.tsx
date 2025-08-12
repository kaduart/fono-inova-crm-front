import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const EvolutionChart = ({ chartData }) => {
  if (!chartData || !chartData.dates || chartData.dates.length === 0 ||
    (!chartData.metrics && !chartData.evaluationTypes)) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center border border-gray-200">
        <p className="text-gray-700 font-medium">Dados insuficientes para visualização</p>
        <p className="text-sm text-gray-500 mt-1">
          Adicione mais avaliações com métricas para gerar gráficos de evolução
        </p>
      </div>
    );
  }

  // Mapeamento de cores para tipos de avaliação
  const typeColors = {
    language: { bg: 'rgba(54, 162, 235, 0.7)', border: 'rgb(54, 162, 235)' },
    motor: { bg: 'rgba(255, 99, 132, 0.7)', border: 'rgb(255, 99, 132)' },
    cognitive: { bg: 'rgba(75, 192, 192, 0.7)', border: 'rgb(75, 192, 192)' },
    behavior: { bg: 'rgba(153, 102, 255, 0.7)', border: 'rgb(153, 102, 255)' },
    social: { bg: 'rgba(255, 159, 64, 0.7)', border: 'rgb(255, 159, 64)' }
  };

  // Preparar dados para métricas
  const metricDatasets = Object.entries(chartData.metrics || {}).map(([name, data]) => {
    const config = data.config || {};
    return {
      label: name,
      data: data.values,
      borderColor: config.color || `hsl(${Math.random() * 360}, 70%, 50%)`,
      backgroundColor: config.color ? `${config.color}33` : `hsla(${Math.random() * 360}, 70%, 50%, 0.2)`,
      yAxisID: 'y',
      tension: 0.3,
      fill: config.fill || false,
      pointRadius: 5,
      pointHoverRadius: 7
    };
  });

  // Preparar dados para tipos de avaliação
  const evaluationDatasets = Object.entries(chartData.evaluationTypes || {}).map(([type]) => {
    const data = chartData.evaluationTypes[type];
    const colors = typeColors[type] || {
      bg: 'rgba(201, 203, 207, 0.7)',
      border: 'rgb(201, 203, 207)'
    };

    const label =
      type === 'language' ? 'Linguagem' :
        type === 'motor' ? 'Motor' :
          type === 'cognitive' ? 'Cognitivo' :
            type === 'behavior' ? 'Comportamento' : 'Social';

    return {
      label,
      data,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 4,
      barPercentage: 0.7
    };
  });

  // Opções comuns para os gráficos
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#333',
        bodyColor: '#666',
        borderColor: '#eee',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        usePointStyle: true
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Gráfico de Métricas */}
      {metricDatasets.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
          <h3 className="font-medium text-lg mb-4 text-gray-800">Evolução das Métricas</h3>
          <div className="h-72">
            <Line
              data={{
                labels: chartData.dates,
                datasets: metricDatasets
              }}
              options={{
                ...commonOptions,
                scales: {
                  y: {
                    beginAtZero: false,
                    grid: {
                      color: 'rgba(0, 0, 0, 0.05)'
                    },
                    title: {
                      display: true,
                      text: 'Valor',
                      color: '#666',
                      font: {
                        weight: 'bold'
                      }
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    }
                  }
                },
                interaction: {
                  intersect: false,
                  mode: 'index'
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Gráfico de Tipos de Avaliação */}
      {evaluationDatasets.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
          <h3 className="font-medium text-lg mb-4 text-gray-800">Distribuição de Áreas de Atuação</h3>
          <div className="h-72">
            <Bar
              data={{
                labels: chartData.dates,
                datasets: evaluationDatasets
              }}
              options={{
                ...commonOptions,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0,
                      stepSize: 1
                    },
                    grid: {
                      color: 'rgba(0, 0, 0, 0.05)'
                    },
                    title: {
                      display: true,
                      text: 'Quantidade de Avaliações',
                      color: '#666',
                      font: {
                        weight: 'bold'
                      }
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EvolutionChart;
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
import { useEffect, useRef, useState } from 'react';
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
  const chartRef = useRef(null);
  const [chartKey, setChartKey] = useState(0);

  // Forçar atualização do gráfico quando os dados mudarem
  useEffect(() => {
    setChartKey(prev => prev + 1);
  }, [chartData]);

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

  // Formatar datas para exibição
  const formattedDates = chartData.dates.map(date => {
    try {
      return new Date(date).toLocaleDateString('pt-BR');
    } catch {
      return date;
    }
  });

  // Preparar dados para métricas
  const metricDatasets = Object.entries(chartData.metrics || {}).map(([name, data]) => {
    const config = data.config || {};
    return {
      label: config.description || name,
      data: data.values,
      borderColor: config.color || `hsl(${Math.random() * 360}, 70%, 50%)`,
      backgroundColor: config.color ? `${config.color}20` : `hsla(${Math.random() * 360}, 70%, 50%, 0.1)`,
      yAxisID: 'y',
      tension: 0.4,
      fill: true,
      spanGaps: true,
      pointBackgroundColor: config.color || `hsl(${Math.random() * 360}, 70%, 50%)`,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8
    };
  });

  // Preparar dados para áreas de avaliação (evaluationAreas com scores)
  const evaluationDatasets = Object.entries(chartData.evaluationTypes || {}).map(([type, data]) => {
    const colors = typeColors[type] || {
      bg: 'rgba(201, 203, 207, 0.7)',
      border: 'rgb(201, 203, 207)'
    };

    const labelMap: Record<string, string> = {
      language: 'Linguagem',
      motor: 'Motor',
      cognitive: 'Cognitivo',
      behavior: 'Comportamento',
      social: 'Social',
      linguagem_expressiva: 'Linguagem Expressiva',
      linguagem_receptiva: 'Linguagem Receptiva',
      pragmatica: 'Pragmática',
      voz: 'Voz',
      motricidade_orofacial: 'Motricidade Orofacial',
      emocional: 'Emocional',
      autonomia: 'Autonomia',
      sensorial: 'Sensorial',
      avds: 'AVDs',
      praxia: 'Praxia',
      grafomotor: 'Grafomotor',
      postural: 'Controle Postural',
      marcha: 'Marcha',
      respiratorio: 'Respiratório',
      neuromotor: 'Neuromotor',
      atencao: 'Atenção',
      memoria: 'Memória',
      visuoespacial: 'Visuoespacial',
      executivo: 'Executivo',
      comunicacao: 'Comunicação',
      expressao_emocional: 'Expressão Emocional',
      socializacao: 'Socialização',
      motor_musical: 'Motor (via música)'
    };

    return {
      label: labelMap[type] || type,
      data: Array.isArray(data) ? data : (data as any)?.values,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      borderWidth: 2,
      borderRadius: 4,
      barPercentage: 0.6
    };
  });

  // Opções para gráfico de linha (métricas)
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          padding: 15,
          usePointStyle: true,
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#374151',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        usePointStyle: true,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y;
              // Adicionar unidade se disponível
              const metricKey = context.dataset.label;
              const metricConfig = chartData.metrics?.[metricKey]?.config;
              if (metricConfig?.unit) {
                label += ` ${metricConfig.unit}`;
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        suggestedMax: (() => {
          // Calcula max real das métricas para escala dinâmica
          let maxVal = 0;
          Object.values(chartData.metrics || {}).forEach((m: any) => {
            if (m?.values) {
              m.values.forEach((v: number | null) => {
                if (v !== null && v !== undefined && v > maxVal) maxVal = v;
              });
            }
          });
          return maxVal > 0 ? Math.ceil(maxVal * 1.2) : 10;
        })(),
        ticks: {
          stepSize: 1
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
  };

  // Opções para gráfico de barras (áreas)
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 12,
          padding: 15,
          usePointStyle: true,
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#374151',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        usePointStyle: true
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          stepSize: 1
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
  };

  return (
    <div className="space-y-8" key={chartKey}>
      {/* Gráfico de Métricas */}
      {metricDatasets.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-lg mb-4 text-gray-800 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Evolução das Métricas
          </h3>
          <div className="h-80">
            <Line
              ref={chartRef}
              data={{
                labels: formattedDates,
                datasets: metricDatasets
              }}
              options={lineOptions}
            />
          </div>

          {/* Legenda adicional */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(chartData.metrics || {}).map(([name, data]) => {
              const config = data.config || {};
              const currentValue = data.values?.[data.values.length - 1];
              return (
                <div key={name} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: config.color || '#6b7280' }}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {config.description || name}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {currentValue !== undefined ? currentValue : 'N/A'}
                    {config.unit ? ` ${config.unit}` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gráfico de Tipos de Avaliação */}
      {evaluationDatasets.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-lg mb-4 text-gray-800 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Distribuição de Áreas de Atuação
          </h3>
          <div className="h-80">
            <Bar
              data={{
                labels: formattedDates,
                datasets: evaluationDatasets
              }}
              options={barOptions}
            />
          </div>
        </div>
      )}

      {/* Debug - Mostrar dados recebidos */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <details>
            <summary className="cursor-pointer font-medium text-sm text-gray-700">
              Dados Recebidos (Debug)
            </summary>
            <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-auto max-h-40">
              {JSON.stringify({
                dates: chartData.dates,
                metrics: chartData.metrics,
                evaluationTypes: chartData.evaluationTypes
              }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default EvolutionChart;
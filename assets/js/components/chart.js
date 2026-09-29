import Chart from "chart.js/auto";
const charts = new Map();
export function chart(id, labels, datasets, type = "line") {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  charts.get(id)?.destroy();
  charts.set(
    id,
    new Chart(canvas, {
      type,
      data: {
        labels,
        datasets: datasets.map((d, i) => ({
          borderColor: i ? "#111" : "#c9aa32",
          backgroundColor: i ? "#232523" : "#c9aa32",
          borderWidth: 2,
          pointRadius: 2,
          tension: 0.35,
          ...d,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: datasets.length > 1, position: "bottom" },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: {
            beginAtZero: true,
            ticks: { precision: 0, font: { size: 10 } },
            grid: { color: "#f3f4f5" },
          },
        },
      },
    }),
  );
}

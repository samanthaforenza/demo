/*
  Stock Prediction Game using Alpha Vantage (real data only)
  API Key provided by user: MBX1XO94WJHYAW9P
*/

const API_KEY = "MBX1XO94WJHYAW9P";
const AV_URL = "https://www.alphavantage.co/query";

// UI elements
const tickerInput = document.getElementById("tickerInput");
const startBtn = document.getElementById("startBtn");
const errorMsg = document.getElementById("errorMsg");
const infoMsg = document.getElementById("infoMsg");
const currentTickerEl = document.getElementById("currentTicker");
const currentDateEl = document.getElementById("currentDate");
const currentPriceEl = document.getElementById("currentPrice");
const scoreEl = document.getElementById("score");
const upBtn = document.getElementById("upBtn");
const downBtn = document.getElementById("downBtn");
const endBtn = document.getElementById("endBtn");
const roundResultEl = document.getElementById("roundResult");
const chartCanvas = document.getElementById("priceChart");

let chart;
let gameState = null;

// Game state structure:
// {
//   ticker: string,
//   series: Array<{ date: string(YYYY-MM-DD), close: number }>, // ASC by date
//   startIndex: number, // index of starting date in series
//   latestShownIndex: number, // index of latest visible point on chart
//   score: number
// }

function setLoading(isLoading, message = "") {
  startBtn.disabled = isLoading;
  infoMsg.textContent = message;
}

function setError(message = "") {
  errorMsg.textContent = message;
}

function resetFeedback() {
  roundResultEl.textContent = "";
}

function formatDate(d) {
  if (typeof d === "string") return d;
  return new Date(d).toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateIso, numDays) {
  const d = new Date(dateIso + "T00:00:00");
  d.setDate(d.getDate() + numDays);
  return formatDate(d);
}

function compareISO(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

async function fetchDailySeries(symbol) {
  const url = `${AV_URL}?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${encodeURIComponent(symbol)}&outputsize=full&apikey=${API_KEY}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Network error: ${res.status}`);
  }
  const data = await res.json();

  if (data["Error Message"]) {
    throw new Error("Ticker not found. Please try a different symbol.");
  }
  if (!data["Time Series (Daily)"]) {
    if (data.Note) {
      throw new Error("API limit reached. Please wait a minute and try again.");
    }
    throw new Error("Unexpected response from data provider.");
  }

  const seriesRaw = data["Time Series (Daily)"];
  const series = Object.entries(seriesRaw)
    .map(([date, obj]) => ({ date, close: Number(obj["4. close"]) }))
    .filter(p => Number.isFinite(p.close))
    .sort((a, b) => compareISO(a.date, b.date));

  return series;
}

function pickRandomStartIndex(series) {
  const today = todayIso();
  const minDate = addDays(today, -100);
  const maxDate = addDays(today, -7);

  // Eligible trading days between [minDate, maxDate]
  const eligible = [];
  for (let i = 0; i < series.length; i++) {
    const d = series[i].date;
    if (d >= minDate && d <= maxDate) {
      eligible.push(i);
    }
  }
  if (eligible.length === 0) {
    throw new Error("Not enough recent trading data to start the game.");
  }

  const r = Math.floor(Math.random() * eligible.length);
  return eligible[r];
}

function buildInitialWindow(series, startIndex) {
  const start = Math.max(0, startIndex - 7);
  const end = startIndex; // include start date
  const window = series.slice(start, end + 1);
  return window;
}

function initChart(dataPoints) {
  const labels = dataPoints.map(p => p.date);
  const values = dataPoints.map(p => p.close);

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(chartCanvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Close Price",
          data: values,
          borderColor: "#4da3ff",
          backgroundColor: "rgba(77, 163, 255, 0.15)",
          borderWidth: 2,
          pointRadius: 2.5,
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: { display: true, text: "Date", color: "#9db0ca" },
          ticks: { color: "#9db0ca" },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
        y: {
          title: { display: true, text: "Price (USD)", color: "#9db0ca" },
          ticks: { color: "#9db0ca" },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
      },
      plugins: {
        legend: {
          labels: { color: "#9db0ca" },
        },
        tooltip: {
          callbacks: {
            label: ctx => `Close: ${Number(ctx.parsed.y).toFixed(2)}`,
          },
        },
      },
    },
  });
}

function appendPointToChart(point) {
  if (!chart) return;
  chart.data.labels.push(point.date);
  chart.data.datasets[0].data.push(point.close);
  chart.update();
}

function updateStatus(ticker, latestPoint, score) {
  currentTickerEl.textContent = ticker || "—";
  currentDateEl.textContent = latestPoint ? latestPoint.date : "—";
  currentPriceEl.textContent = latestPoint ? `$${latestPoint.close.toFixed(2)}` : "—";
  scoreEl.textContent = String(score ?? 0);
}

function setGameButtons(enabled) {
  upBtn.disabled = !enabled;
  downBtn.disabled = !enabled;
  endBtn.disabled = !enabled;
}

async function startGame() {
  const symbol = (tickerInput.value || "").trim().toUpperCase();
  setError("");
  resetFeedback();

  if (!symbol) {
    setError("Please enter a stock ticker symbol.");
    return;
  }

  setLoading(true, "Fetching real market data...");
  setGameButtons(false);

  try {
    const series = await fetchDailySeries(symbol);
    const startIndex = pickRandomStartIndex(series);
    const initialWindow = buildInitialWindow(series, startIndex);

    initChart(initialWindow);

    gameState = {
      ticker: symbol,
      series,
      startIndex,
      latestShownIndex: startIndex,
      score: 0,
    };

    const latestPoint = series[startIndex];
    updateStatus(symbol, latestPoint, 0);
    setGameButtons(true);
    setError("");
    infoMsg.textContent = `Starting on ${latestPoint.date}. Predict the next day's move.`;
  } catch (err) {
    console.error(err);
    setError(err.message || "Failed to load data.");
    updateStatus(null, null, 0);
  } finally {
    setLoading(false, "");
  }
}

function doPrediction(direction) {
  // direction: "up" | "down"
  if (!gameState) return;
  const { series } = gameState;
  const i = gameState.latestShownIndex;
  const nextIndex = i + 1;
  if (nextIndex >= series.length) {
    roundResultEl.textContent = "No more data available. Game over.";
    setGameButtons(false);
    return;
  }

  const todayPoint = series[i];
  const nextPoint = series[nextIndex];
  const todayPrice = todayPoint.close;
  const nextPrice = nextPoint.close;

  let correct = false;
  let note = "";
  if (nextPrice > todayPrice) {
    correct = direction === "up";
  } else if (nextPrice < todayPrice) {
    correct = direction === "down";
  } else {
    correct = false;
    note = " Price unchanged.";
  }

  if (correct) {
    gameState.score += 1;
    roundResultEl.textContent = `Correct! Next day close was $${nextPrice.toFixed(2)}.`;
  } else {
    roundResultEl.textContent = `Wrong. Next day close was $${nextPrice.toFixed(2)}.${note}`;
  }

  // Reveal next day
  appendPointToChart(nextPoint);
  gameState.latestShownIndex = nextIndex;
  updateStatus(gameState.ticker, nextPoint, gameState.score);

  // Prepare next round message
  const afterNext = nextIndex + 1;
  if (afterNext < series.length) {
    infoMsg.textContent = `Now at ${nextPoint.date}. Predict the next day's move.`;
  } else {
    infoMsg.textContent = "You've reached the end of available data.";
    setGameButtons(false);
  }
}

function endGame() {
  if (!gameState) return;
  setGameButtons(false);
  infoMsg.textContent = `Game ended. Final score: ${gameState.score}`;
}

// Wire up events
startBtn.addEventListener("click", startGame);
tickerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    startGame();
  }
});
upBtn.addEventListener("click", () => doPrediction("up"));
downBtn.addEventListener("click", () => doPrediction("down"));
endBtn.addEventListener("click", endGame);


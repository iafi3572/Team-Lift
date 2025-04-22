let exerciseCharts = {};

document.addEventListener("DOMContentLoaded", () => {
  const timezoneData = document.getElementById("timezone-data");
  const serverTimeZone = timezoneData?.dataset.timezone || "UTC";
  const clientTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (clientTimeZone !== serverTimeZone) {
    window.location.href = `/tracking?tz=${encodeURIComponent(clientTimeZone)}`;
    return;
  }

  if (document.getElementById("goals-list")) {
    loadGoals();
  }

  if (document.querySelector(".exercise-card")) {
    loadAverages();
  }

  const exerciseForm = document.getElementById("exercise-form");
  if (exerciseForm) {
    exerciseForm.addEventListener("submit", handleFormSubmit);
  }

  setInterval(checkTimeZone, 3600000);
});

async function handleFormSubmit(e) {
  e.preventDefault();
  try {
    const exercises = Array.from(
      document.querySelectorAll(".exercise-card")
    ).map((card) => {
      const name = card.querySelector("h3").textContent;
      return {
        name: name,
        reps: document.getElementById(`${name}-reps`).value,
        weight: document.getElementById(`${name}-weight`).value,
      };
    });

    for (const exercise of exercises) {
      await fetch("/api/exercise-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exercise),
      });
    }

    await loadAverages();
    e.target.reset();
    alert("Workout saved successfully!");
  } catch (error) {
    console.error("Save error:", error);
    alert("Error saving workout");
  }
}

// Goals functionality
async function loadGoals() {
  const response = await fetch("/api/goals");
  const goals = await response.json();
  const goalsList = document.getElementById("goals-list");

  goalsList.innerHTML = goals
    .map(
      (goal) => `
                <div class="goal-item" data-id="${goal.goal_id}">
                    <input type="checkbox" ${goal.completed ? "checked" : ""} 
                           onchange="toggleGoal(${goal.goal_id}, this.checked)">
                    <span class="${goal.completed ? "completed" : ""}">${
        goal.goal_text
      }</span>
                    <button onclick="deleteGoal(${
                      goal.goal_id
                    })" class="btn-outline-light-green login-secondary-btn-green bg-steel text-light-green">×</button>
                </div>
            `
    )
    .join("");
}

async function addGoal() {
  const input = document.getElementById("new-goal");
  await fetch("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goalText: input.value }),
  });
  input.value = "";
  loadGoals();
}

async function toggleGoal(id, completed) {
  await fetch(`/api/goals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed }),
  });
  loadGoals();
}

async function deleteGoal(id) {
  await fetch(`/api/goals/${id}`, { method: "DELETE" });
  loadGoals();
}

// Exercise Log functionality
document
  .getElementById("exercise-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const exercises = Array.from(
      document.querySelectorAll(".exercise-card")
    ).map((card) => {
      const name = card.querySelector("h3").textContent;
      return {
        name: name,
        reps: document.getElementById(`${name}-reps`).value,
        weight: document.getElementById(`${name}-weight`).value,
      };
    });

    try {
      for (const exercise of exercises) {
        await fetch("/api/exercise-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(exercise),
        });
      }

      loadAverages();
      e.target.reset();
      alert("Workout saved successfully!");
    } catch (error) {
      alert("Error saving workout");
    }
  });

async function loadAverages() {
  const exerciseCards = document.querySelectorAll(".exercise-card");

  for (const card of exerciseCards) {
    const exerciseName = card.querySelector("h3").textContent;
    try {
      const avgResponse = await fetch(
        `/api/averages/${encodeURIComponent(exerciseName)}`
      );
      const avgData = await avgResponse.json();

      const historyResponse = await fetch(
        `/api/history/${encodeURIComponent(exerciseName)}`
      );
      const historyData = await historyResponse.json();

      if (avgData) {
        card.querySelector(".reps-avg").textContent = avgData.avg_reps
          ? Math.round(avgData.avg_reps)
          : "-";
        card.querySelector(".weight-avg").textContent = avgData.avg_weight
          ? Math.round(avgData.avg_weight * 10) / 10
          : "-";
      }

      renderChart(exerciseName, historyData);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }
}

function renderChart(exerciseName, data) {
  const ctx = document.getElementById(`${exerciseName}-chart`);

  if (exerciseCharts[exerciseName]) {
    exerciseCharts[exerciseName].destroy();
  }

  const labels = data.map((entry) =>
    new Date(entry.log_date).toLocaleDateString()
  );
  const repsData = data.map((entry) => entry.reps);
  const weightData = data.map((entry) => entry.weight);

  exerciseCharts[exerciseName] = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Reps",
          data: repsData,
          borderColor: "#0984e3",
          tension: 0.1,
          yAxisID: "reps",
        },
        {
          label: "Weight (kg)",
          data: weightData,
          borderColor: "#00b894",
          tension: 0.1,
          yAxisID: "weight",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        reps: {
          type: "linear",
          display: true,
          position: "left",
          title: { display: true, text: "Reps" },
        },
        weight: {
          type: "linear",
          display: true,
          position: "right",
          title: { display: true, text: "Weight (kg)" },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

function checkTimeZone() {
  const timezoneData = document.getElementById("timezone-data");
  const serverTimeZone = timezoneData?.dataset.timezone || "UTC";
  const currentTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (currentTZ !== serverTimeZone) {
    window.location.href = `/tracking?tz=${encodeURIComponent(currentTZ)}`;
  }
}

checkTimeZone();
setInterval(checkTimeZone, 3600000);

loadGoals();
loadAverages();

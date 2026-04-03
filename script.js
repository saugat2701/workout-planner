const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

let workoutData = {};
let state = {
  name: '', age: 0, weight: 0, height: 0, gender: 'male', goal: '',
  weekProgress: [null,null,null,null,null,null,null],
  exercisesDone: [[],[],[],[],[],[],[]],
  streak: 0,
  startDate: null,
  history: []
};
let selectedGoal = '';


async function loadWorkouts() {
  const res = await fetch('workouts.json');
  workoutData = await res.json();
}


function loadState() {
  const saved = localStorage.getItem('fittrack_state');
  if (saved) { state = JSON.parse(saved); return true; }
  return false;
}


function saveState() {
  localStorage.setItem('fittrack_state', JSON.stringify(state));
}


function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}


function goToForm() {
  showScreen('screen-form');
}


function selectGoal(el, goal) {
  document.querySelectorAll('.goal-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedGoal = goal;
}


function buildPlan() {
  const name   = document.getElementById('inp-name').value.trim();
  const age    = parseInt(document.getElementById('inp-age').value);
  const weight = parseFloat(document.getElementById('inp-weight').value);
  const height = parseFloat(document.getElementById('inp-height').value);
  const gender = document.getElementById('inp-gender').value;

  if (!name || !age || !weight || !height || !selectedGoal) {
    alert('Please fill in all fields and select a goal!');
    return;
  }

  state = {
    name, age, weight, height, gender,
    goal: selectedGoal,
    weekProgress: [null,null,null,null,null,null,null],
    exercisesDone: [[],[],[],[],[],[],[]],
    streak: 0,
    startDate: new Date().toISOString(),
    history: []
  };

  saveState();
  showDashboard();
}


function switchTab(tab, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  btn.classList.add('active');
  if (tab === 'history') renderHistory();
  if (tab === 'bmi') renderBMI();
}


function showDashboard() {
  showScreen('screen-dashboard');
  const initials = state.name.charAt(0).toUpperCase();
  document.getElementById('user-avatar').textContent = initials;
  document.getElementById('greeting-text').textContent = 'HEY, ' + state.name.toUpperCase() + '!';
  document.getElementById('streak-count').textContent = state.streak;

  const goalLabels = { weightloss:'Weight Loss', muscle:'Muscle Gain', stamina:'Stamina', fit:'Stay Fit' };
  document.getElementById('stat-goal').textContent = goalLabels[state.goal] || '—';

  renderWeekGrid();
  renderTodayWorkout();
  renderStats();
}


function renderWeekGrid() {
  const grid = document.getElementById('week-grid');
  const today = new Date(state.startDate);
  const todayIdx = new Date().getDay();
  const adjustedToday = todayIdx === 0 ? 6 : todayIdx - 1;

  grid.innerHTML = '';
  DAYS.forEach((day, i) => {
    const workout = workoutData[state.goal][i];
    const status  = state.weekProgress[i];
    const isToday = i === adjustedToday;
    const card    = document.createElement('div');

    card.className = 'day-card' +
      (isToday ? ' today' : '') +
      (status === 'done' ? ' done' : '') +
      (status === 'skipped' ? ' skipped' : '');

    card.innerHTML = `
      <div class="day-name">${day}</div>
      <div class="day-num">${i + 1}</div>
      <div class="day-type">${workout.rest ? 'Rest' : 'Work'}</div>
      ${status === 'done' ? '<div class="day-check">✓</div>' : ''}
    `;
    card.onclick = () => jumpToDay(i);
    grid.appendChild(card);
  });
}


function renderTodayWorkout() {
  const container = document.getElementById('today-workout-container');
  const todayIdx  = new Date().getDay();
  const adjusted  = todayIdx === 0 ? 6 : todayIdx - 1;
  const workout   = workoutData[state.goal][adjusted];
  const done      = state.exercisesDone[adjusted] || [];

  if (workout.rest) {
    container.innerHTML = `
      <div class="rest-card">
        <div class="rest-icon">😴</div>
        <div class="rest-title">REST DAY</div>
        <p class="rest-desc">Your body grows when it rests.<br>Hydrate, sleep well, and come back stronger tomorrow!</p>
      </div>`;
    return;
  }

  const exerciseHTML = workout.exercises.map((ex, i) => `
    <div class="exercise-item ${done.includes(i) ? 'completed' : ''}" onclick="toggleExercise(${adjusted}, ${i})">
      <div class="exercise-num">${done.includes(i) ? '✓' : i + 1}</div>
      <div class="exercise-info">
        <div class="exercise-name">${ex.name}</div>
        <div class="exercise-detail">${ex.detail}</div>
      </div>
      <div class="exercise-badge">${ex.muscle}</div>
    </div>`).join('');

  container.innerHTML = `
    <div class="today-workout">
      <div class="workout-header">
        <div>
          <div class="workout-title">${workout.name}</div>
          <div class="workout-meta">${workout.exercises.length} exercises · ${workout.duration}</div>
        </div>
        <div class="workout-tag">Day ${adjusted + 1}</div>
      </div>
      <div class="exercise-list">${exerciseHTML}</div>
      <div class="workout-actions">
        <button class="btn-done" onclick="markDay('done')">✓ Mark Complete</button>
        <button class="btn-skip" onclick="markDay('skipped')">Skip</button>
      </div>
    </div>`;
}

function toggleExercise(dayIdx, exIdx) {
  if (!state.exercisesDone[dayIdx]) state.exercisesDone[dayIdx] = [];
  const arr = state.exercisesDone[dayIdx];
  const pos = arr.indexOf(exIdx);
  if (pos === -1) arr.push(exIdx);
  else arr.splice(pos, 1);
  saveState();
  renderTodayWorkout();
}


function markDay(status) {
  const todayIdx = new Date().getDay();
  const adjusted = todayIdx === 0 ? 6 : todayIdx - 1;

  state.weekProgress[adjusted] = status;

  
  if (status === 'done') {
    state.streak += 1;
  } else {
    state.streak = 0;
  }


  const workout = workoutData[state.goal][adjusted];
  state.history.unshift({
    date: new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }),
    name: workout.name,
    status: status
  });

  saveState();
  showDashboard();
}


function jumpToDay(idx) {
  const workout = workoutData[state.goal][idx];
  alert(`Day ${idx + 1}: ${workout.name}\n${workout.rest ? 'Rest Day 😴' : workout.duration + ' · ' + workout.exercises.length + ' exercises'}`);
}


function renderStats() {
  const done = state.weekProgress.filter(p => p === 'done').length;
  const skip = state.weekProgress.filter(p => p === 'skipped').length;
  const pct  = Math.round((done / 7) * 100);

  document.getElementById('stat-done').textContent = done;
  document.getElementById('stat-skip').textContent = skip;
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-label').textContent = done + '/7 days done';
  document.getElementById('progress-pct').textContent = pct + '%';
  document.getElementById('streak-count').textContent = state.streak;
}


function renderHistory() {
  const list = document.getElementById('history-list');
  if (!state.history || state.history.length === 0) {
    list.innerHTML = '<div class="empty-state">No workouts yet.<br>Complete your first workout to see history!</div>';
    return;
  }
  list.innerHTML = state.history.map(h => `
    <div class="history-item">
      <div class="hist-dot ${h.status === 'done' ? 'hist-done' : 'hist-skip'}"></div>
      <div class="hist-info">
        <div class="hist-title">${h.name}</div>
        <div class="hist-date">${h.date}</div>
      </div>
      <div class="hist-badge ${h.status === 'done' ? 'done' : 'skip'}">${h.status === 'done' ? 'Done' : 'Skipped'}</div>
    </div>`).join('');
}


function renderBMI() {
  if (!state.weight || !state.height) return;
  const bmi      = state.weight / Math.pow(state.height / 100, 2);
  const bmiFixed = bmi.toFixed(1);
  let status, color, desc, barWidth, barColor;

  if (bmi < 18.5) {
    status = 'Underweight'; color = '#60a5fa'; desc = 'You are below the healthy weight range. Consider a nutrition-rich diet.'; barWidth = 15; barColor = '#60a5fa';
  } else if (bmi < 25) {
    status = 'Normal'; color = '#c8f135'; desc = 'Great! You are in the healthy weight range. Keep it up!'; barWidth = 40; barColor = '#c8f135';
  } else if (bmi < 30) {
    status = 'Overweight'; color = '#fb923c'; desc = 'You are slightly above the healthy range. Your workout plan will help!'; barWidth = 65; barColor = '#fb923c';
  } else {
    status = 'Obese'; color = '#ff5252'; desc = 'Your BMI is high. Stay consistent with your plan and consult a doctor.'; barWidth = 90; barColor = '#ff5252';
  }

  document.getElementById('bmi-number').textContent = bmiFixed;
  document.getElementById('bmi-status').textContent = status;
  document.getElementById('bmi-status').style.cssText = `background:${color}22;color:${color};border:1px solid ${color}44;padding:5px 14px;border-radius:50px;font-size:13px;font-weight:600;`;
  document.getElementById('bmi-desc').textContent = desc;
  document.getElementById('bmi-bar').style.width = barWidth + '%';
  document.getElementById('bmi-bar').style.background = barColor;

  document.getElementById('stat-grid').innerHTML = `
    <div class="detail-item"><div class="detail-label">Weight</div><div class="detail-value">${state.weight} <span style="font-size:14px;color:var(--text-muted)">kg</span></div></div>
    <div class="detail-item"><div class="detail-label">Height</div><div class="detail-value">${state.height} <span style="font-size:14px;color:var(--text-muted)">cm</span></div></div>
    <div class="detail-item"><div class="detail-label">Age</div><div class="detail-value">${state.age} <span style="font-size:14px;color:var(--text-muted)">yrs</span></div></div>
    <div class="detail-item"><div class="detail-label">Gender</div><div class="detail-value" style="font-size:18px;">${state.gender}</div></div>
  `;
}


function resetApp() {
  if (confirm('Reset your profile and start over?')) {
    localStorage.removeItem('fittrack_state');
    location.reload();
  }
}


async function init() {
  await loadWorkouts();
  if (loadState() && state.name) {
    showDashboard();
  } else {
    showScreen('screen-welcome');
  }
}

init();
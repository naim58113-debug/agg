const studentBody = document.getElementById('studentBody');
const rowTemplate = document.getElementById('rowTemplate');
const csvInput = document.getElementById('csvInput');
const fillExampleBtn = document.getElementById('fillExampleBtn');
const resetBtn = document.getElementById('resetBtn');
const addRowBtn = document.getElementById('addRowBtn');
const generateBtn = document.getElementById('generateBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const exportTxtBtn = document.getElementById('exportTxtBtn');
const groupCountEl = document.getElementById('groupCount');
const scoreWeightEl = document.getElementById('scoreWeight');
const genderWeightEl = document.getElementById('genderWeight');
const randomWeightEl = document.getElementById('randomWeight');
const scoreWeightValue = document.getElementById('scoreWeightValue');
const genderWeightValue = document.getElementById('genderWeightValue');
const randomWeightValue = document.getElementById('randomWeightValue');
const resultEl = document.getElementById('result');
const summaryEl = document.getElementById('summary');

let lastGroups = [];

function addRow(data = {}) {
  const clone = rowTemplate.content.cloneNode(true);
  const tr = clone.querySelector('tr');
  clone.querySelector('.name').value = data.name || '';
  clone.querySelector('.score').value = data.score ?? '';
  clone.querySelector('.gender').value = data.gender || 'L';
  clone.querySelector('.removeRow').addEventListener('click', () => tr.remove());
  studentBody.appendChild(clone);
}

function clearRows() {
  studentBody.innerHTML = '';
  for (let i = 0; i < 4; i++) addRow();
}

function readStudents() {
  return [...studentBody.querySelectorAll('tr')]
    .map(row => ({
      name: row.querySelector('.name').value.trim(),
      score: Number(row.querySelector('.score').value),
      gender: row.querySelector('.gender').value
    }))
    .filter(s => s.name);
}

function normalize(value, min, max) {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

function scoreStudents(students, weights) {
  const scores = students.map(s => s.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const maleCount = students.filter(s => s.gender === 'L').length;
  const femaleCount = students.filter(s => s.gender === 'P').length;
  const total = students.length || 1;
  const maleRatio = maleCount / total;
  const femaleRatio = femaleCount / total;

  return students.map(s => {
    const scoreN = normalize(s.score, minScore, maxScore);
    const genderScore = s.gender === 'L' ? femaleRatio : maleRatio;
    const randomPart = Math.random() * (weights.random / 100);

    return {
      ...s,
      hybrid:
        scoreN * (weights.score / 100) +
        genderScore * (weights.gender / 100) +
        randomPart
    };
  });
}

function createGroups(students, groupCount) {
  const groups = Array.from({ length: groupCount }, () => ({
    members: [],
    totalScore: 0,
    genderCount: { L: 0, P: 0 }
  }));

  [...students].sort((a, b) => b.hybrid - a.hybrid).forEach((student, index) => {
    const group = groups[index % groupCount];
    group.members.push(student);
    group.totalScore += student.score;
    group.genderCount[student.gender] = (group.genderCount[student.gender] || 0) + 1;
  });

  return groups;
}

function renderGroups(groups) {
  if (!groups.length) {
    resultEl.innerHTML = '<div class="result-empty">Belum ada hasil.</div>';
    return;
  }

  resultEl.innerHTML = groups.map((group, index) => {
    const genderText = Object.entries(group.genderCount)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ');

    return `
      <div class="group">
        <h3>Kelompok ${index + 1} (${group.members.length} orang)</h3>
        <div class="meta">Total nilai: ${group.totalScore} | ${genderText || 'Gender: -'}</div>
        <ul>
          ${group.members.map(s => `<li>${s.name} — Nilai ${s.score}, ${s.gender}</li>`).join('')}
        </ul>
      </div>
    `;
  }).join('');
}

function renderSummary(students) {
  const avgScore = students.reduce((a, b) => a + b.score, 0) / students.length;
  const male = students.filter(s => s.gender === 'L').length;
  const female = students.filter(s => s.gender === 'P').length;

  summaryEl.innerHTML = `
    <div class="summary-grid">
      <span class="badge">Total mahasiswa: ${students.length}</span>
      <span class="badge">Rata-rata nilai: ${avgScore.toFixed(2)}</span>
      <span class="badge">Laki-laki: ${male}</span>
      <span class="badge">Perempuan: ${female}</span>
    </div>
  `;
}

function parseCSV(text) {
  return text.split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 3) return null;
      return {
        name: parts[0],
        score: Number(parts[1]) || 0,
        gender: (parts[2] || 'L').toUpperCase() === 'P' ? 'P' : 'L'
      };
    })
    .filter(Boolean);
}

function loadRowsFromData(data) {
  studentBody.innerHTML = '';
  data.forEach(item => addRow(item));
}

function escapeCsv(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildExportData() {
  return lastGroups.map((group, index) => ({
    group: index + 1,
    totalScore: group.totalScore,
    members: group.members.map(m => ({
      name: m.name,
      score: m.score,
      gender: m.gender
    }))
  }));
}

function exportAsCSV() {
  if (!lastGroups.length) return alert('Belum ada hasil untuk diexport.');

  const rows = [];
  rows.push(['Kelompok', 'Nama', 'Nilai', 'Gender'].map(escapeCsv).join(','));
  lastGroups.forEach((group, index) => {
    group.members.forEach(member => {
      rows.push([
        `Kelompok ${index + 1}`,
        member.name,
        member.score,
        member.gender
      ].map(escapeCsv).join(','));
    });
  });

  downloadFile('hasil-kelompok.csv', rows.join('\n'), 'text/csv;charset=utf-8');
}

function exportAsJSON() {
  if (!lastGroups.length) return alert('Belum ada hasil untuk diexport.');
  const data = buildExportData();
  downloadFile('hasil-kelompok.json', JSON.stringify(data, null, 2), 'application/json');
}

function exportAsTXT() {
  if (!lastGroups.length) return alert('Belum ada hasil untuk diexport.');

  const lines = [];
  lastGroups.forEach((group, index) => {
    lines.push(`Kelompok ${index + 1} (Total nilai: ${group.totalScore})`);
    group.members.forEach(member => {
      lines.push(`- ${member.name} | Nilai: ${member.score} | Gender: ${member.gender}`);
    });
    lines.push('');
  });

  downloadFile('hasil-kelompok.txt', lines.join('\n'), 'text/plain;charset=utf-8');
}

csvInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const data = parseCSV(text);
  if (!data.length) return alert('CSV kosong atau format tidak sesuai. Gunakan: Nama,Nilai,Gender');
  loadRowsFromData(data);
});

fillExampleBtn.addEventListener('click', () => {
  loadRowsFromData([
    { name: 'Andi', score: 85, gender: 'L' },
    { name: 'Budi', score: 72, gender: 'L' },
    { name: 'Citra', score: 91, gender: 'P' },
    { name: 'Dewi', score: 68, gender: 'P' },
    { name: 'Eka', score: 77, gender: 'L' },
    { name: 'Fajar', score: 80, gender: 'L' },
    { name: 'Gita', score: 88, gender: 'P' },
    { name: 'Hadi', score: 74, gender: 'L' }
  ]);
});

resetBtn.addEventListener('click', () => {
  csvInput.value = '';
  groupCountEl.value = 2;
  scoreWeightEl.value = 70;
  genderWeightEl.value = 20;
  randomWeightEl.value = 10;
  scoreWeightValue.textContent = '70';
  genderWeightValue.textContent = '20';
  randomWeightValue.textContent = '10';
  lastGroups = [];
  clearRows();
  resultEl.innerHTML = '<div class="result-empty">Belum ada hasil.</div>';
  summaryEl.innerHTML = '<div class="result-empty">Belum ada ringkasan.</div>';
});

addRowBtn.addEventListener('click', () => addRow());

scoreWeightEl.addEventListener('input', () => scoreWeightValue.textContent = scoreWeightEl.value);
genderWeightEl.addEventListener('input', () => genderWeightValue.textContent = genderWeightEl.value);
randomWeightEl.addEventListener('input', () => randomWeightValue.textContent = randomWeightEl.value);

generateBtn.addEventListener('click', () => {
  const students = readStudents();
  const groupCount = Number(groupCountEl.value);

  if (students.length < 2) return alert('Masukkan minimal 2 mahasiswa.');
  if (!groupCount || groupCount < 2) return alert('Jumlah kelompok minimal 2.');

  const weights = {
    score: Number(scoreWeightEl.value || 70),
    gender: Number(genderWeightEl.value || 20),
    random: Number(randomWeightEl.value || 10)
  };

  if (weights.score + weights.gender > 100) {
    return alert('Bobot nilai + gender tidak boleh lebih dari 100%.');
  }

  const scored = scoreStudents(students, weights);
  lastGroups = createGroups(scored, groupCount);

  renderGroups(lastGroups);
  renderSummary(students);
});

exportCsvBtn.addEventListener('click', exportAsCSV);
exportJsonBtn.addEventListener('click', exportAsJSON);
exportTxtBtn.addEventListener('click', exportAsTXT);

clearRows();
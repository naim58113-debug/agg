const studentBody = document.getElementById('studentBody');
const nameInput = document.getElementById('name');
const scoreInput = document.getElementById('score');
const genderInput = document.getElementById('gender');
const saveBtn = document.getElementById('saveBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const searchInput = document.getElementById('searchInput');
const fillExampleBtn = document.getElementById('fillExampleBtn');
const resetBtn = document.getElementById('resetBtn');
const csvInput = document.getElementById('csvInput');
const groupCountEl = document.getElementById('groupCount');
const scoreWeightEl = document.getElementById('scoreWeight');
const genderWeightEl = document.getElementById('genderWeight');
const randomWeightEl = document.getElementById('randomWeight');
const scoreWeightValue = document.getElementById('scoreWeightValue');
const genderWeightValue = document.getElementById('genderWeightValue');
const randomWeightValue = document.getElementById('randomWeightValue');
const generateBtn = document.getElementById('generateBtn');
const resultEl = document.getElementById('result');
const summaryEl = document.getElementById('summary');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const exportTxtBtn = document.getElementById('exportTxtBtn');
const rowTemplate = document.createElement('template');

rowTemplate.innerHTML = `
  <tr>
    <td class="rowIndex"></td>
    <td class="rowName"></td>
    <td class="rowScore"></td>
    <td class="rowGender"></td>
    <td>
      <button type="button" class="editRow">Edit</button>
      <button type="button" class="removeRow">Hapus</button>
    </td>
  </tr>
`;

let students = [];
let editIndex = -1;
let lastGroups = [];

function syncToLocal() {
  localStorage.setItem('students', JSON.stringify(students));
}

function loadFromLocal() {
  const saved = localStorage.getItem('students');
  if (saved) students = JSON.parse(saved);
}

function clearForm() {
  nameInput.value = '';
  scoreInput.value = '';
  genderInput.value = 'L';
  editIndex = -1;
  saveBtn.textContent = 'Simpan';
}

function renderTable() {
  const keyword = searchInput.value.toLowerCase().trim();
  studentBody.innerHTML = '';

  students.forEach((s, index) => {
    const match =
      s.name.toLowerCase().includes(keyword) ||
      s.gender.toLowerCase().includes(keyword) ||
      String(s.score).includes(keyword);

    if (!match) return;

    const clone = rowTemplate.content.cloneNode(true);
    const tr = clone.querySelector('tr');

    clone.querySelector('.rowIndex').textContent = index + 1;
    clone.querySelector('.rowName').textContent = s.name;
    clone.querySelector('.rowScore').textContent = s.score;
    clone.querySelector('.rowGender').textContent = s.gender;

    clone.querySelector('.editRow').addEventListener('click', () => {
      editIndex = index;
      nameInput.value = s.name;
      scoreInput.value = s.score;
      genderInput.value = s.gender;
      saveBtn.textContent = 'Simpan Perubahan';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    clone.querySelector('.removeRow').addEventListener('click', () => {
      if (!confirm(`Yakin ingin menghapus data ${s.name}?`)) return;
      students.splice(index, 1);
      if (editIndex === index) clearForm();
      syncToLocal();
      renderTable();
    });

    studentBody.appendChild(tr);
  });
}

function saveStudent() {
  const name = nameInput.value.trim();
  const score = Number(scoreInput.value);
  const gender = genderInput.value;

  if (!name) return alert('Nama tidak boleh kosong.');
  if (Number.isNaN(score) || score < 0 || score > 100) return alert('Nilai harus 0-100.');

  const data = { name, score, gender };

  if (editIndex === -1) {
    students.push(data);
  } else {
    students[editIndex] = data;
  }

  syncToLocal();
  renderTable();
  clearForm();
}

function parseCSV(text) {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 3) return null;
      return {
        name: parts[0],
        score: Number(parts[1]) || 0,
        gender: parts[2].toUpperCase() === 'P' ? 'P' : 'L'
      };
    })
    .filter(Boolean);
}

function addMany(data) {
  students = data;
  syncToLocal();
  renderTable();
  clearForm();
}

function scoreStudents(list, weights) {
  const scores = list.map(s => s.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const male = list.filter(s => s.gender === 'L').length;
  const female = list.filter(s => s.gender === 'P').length;
  const total = list.length || 1;

  return list.map(s => {
    const scoreN = maxScore === minScore ? 0.5 : (s.score - minScore) / (maxScore - minScore);
    const genderScore = s.gender === 'L' ? female / total : male / total;
    const randomPart = Math.random() * (weights.random / 100);
    return {
      ...s,
      hybrid: scoreN * (weights.score / 100) + genderScore * (weights.gender / 100) + randomPart
    };
  });
}

function createGroups(list, groupCount) {
  const groups = Array.from({ length: groupCount }, () => ({
    members: [],
    totalScore: 0,
    genderCount: { L: 0, P: 0 }
  }));

  [...list].sort((a, b) => b.hybrid - a.hybrid).forEach((student, index) => {
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

  resultEl.innerHTML = groups.map((group, index) => `
    <div class="group">
      <h3>Kelompok ${index + 1} (${group.members.length} orang)</h3>
      <div class="meta">Total nilai: ${group.totalScore} | L: ${group.genderCount.L} | P: ${group.genderCount.P}</div>
      <ul>
        ${group.members.map(s => `<li>${s.name} — Nilai ${s.score}, ${s.gender}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}

function renderSummary() {
  if (!students.length) {
    summaryEl.innerHTML = '<div class="result-empty">Belum ada ringkasan.</div>';
    return;
  }

  const avg = students.reduce((a, b) => a + b.score, 0) / students.length;
  const male = students.filter(s => s.gender === 'L').length;
  const female = students.filter(s => s.gender === 'P').length;

  summaryEl.innerHTML = `
    <div class="badge">Total mahasiswa: ${students.length}</div>
    <div class="badge">Rata-rata nilai: ${avg.toFixed(2)}</div>
    <div class="badge">Laki-laki: ${male}</div>
    <div class="badge">Perempuan: ${female}</div>
  `;
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV() {
  if (!lastGroups.length) return alert('Belum ada hasil untuk diexport.');
  const rows = [['Kelompok', 'Nama', 'Nilai', 'Gender']];
  lastGroups.forEach((g, i) => {
    g.members.forEach(m => rows.push([`Kelompok ${i + 1}`, m.name, m.score, m.gender]));
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadFile('hasil-kelompok.csv', csv, 'text/csv;charset=utf-8');
}

function exportJSON() {
  if (!lastGroups.length) return alert('Belum ada hasil untuk diexport.');
  const data = lastGroups.map((g, i) => ({
    group: i + 1,
    totalScore: g.totalScore,
    members: g.members
  }));
  downloadFile('hasil-kelompok.json', JSON.stringify(data, null, 2), 'application/json');
}

function exportTXT() {
  if (!lastGroups.length) return alert('Belum ada hasil untuk diexport.');
  const text = lastGroups.map((g, i) => {
    const members = g.members.map(m => `- ${m.name} | ${m.score} | ${m.gender}`).join('\n');
    return `Kelompok ${i + 1}\n${members}\nTotal nilai: ${g.totalScore}\n`;
  }).join('\n');
  downloadFile('hasil-kelompok.txt', text, 'text/plain;charset=utf-8');
}

saveBtn.addEventListener('click', saveStudent);
cancelEditBtn.addEventListener('click', clearForm);
searchInput.addEventListener('input', renderTable);

fillExampleBtn.addEventListener('click', () => {
  addMany([
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
  if (!confirm('Semua data akan dihapus. Lanjutkan?')) return;
  students = [];
  lastGroups = [];
  localStorage.removeItem('students');
  clearForm();
  renderTable();
  renderSummary();
  resultEl.innerHTML = '<div class="result-empty">Belum ada hasil.</div>';
});

csvInput.addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const data = parseCSV(text);
  if (!data.length) return alert('CSV kosong atau format tidak sesuai. Gunakan: Nama,Nilai,Gender');
  addMany(data);
});

scoreWeightEl.addEventListener('input', () => scoreWeightValue.textContent = scoreWeightEl.value);
genderWeightEl.addEventListener('input', () => genderWeightValue.textContent = genderWeightEl.value);
randomWeightEl.addEventListener('input', () => randomWeightValue.textContent = randomWeightEl.value);

generateBtn.addEventListener('click', () => {
  if (students.length < 2) {
    alert('Masukkan minimal 2 mahasiswa.');
    return;
  }

  const groupCount = Number(groupCountEl.value);
  if (!groupCount || groupCount < 2) {
    alert('Jumlah kelompok minimal 2.');
    return;
  }

  const weights = {
    score: Number(scoreWeightEl.value),
    gender: Number(genderWeightEl.value),
    random: Number(randomWeightEl.value)
  };

  const scored = scoreStudents(students, weights);
  lastGroups = createGroups(scored, groupCount);
  renderGroups(lastGroups);
  renderSummary();
});

exportCsvBtn.addEventListener('click', exportCSV);
exportJsonBtn.addEventListener('click', exportJSON);
exportTxtBtn.addEventListener('click', exportTXT);

loadFromLocal();
renderTable();
renderSummary();
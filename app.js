(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const form = $('registration-form');
  const regionIds = ['province', 'city', 'district', 'village'];
  const regionLabels = ['provinsi', 'kota', 'kecamatan', 'kelurahan'];
  let registrations = KRS_DATA.examples.map(([student, course, classGroup], index) => ({
    ...KRS_DATA.students[student], id: `demo-${index + 1}`, course, classGroup,
    lecturer: KRS_DATA.courses[KRS_DATA.students[student].program].find((item) => item.id === course).lecturers[0]
  }));
  let editingId = null;
  let pendingDeleteId = null;
  let currentPage = 1;
  let pageSize = 5;
  let toastTimer;
  let suggestedStudents = [];
  let activeSuggestion = -1;

  function getCourse(record) {
    return KRS_DATA.courses[record.program]?.find((course) => course.id === record.course);
  }

  function getPostalCode(record) {
    return KRS_DATA.regions[record.province]?.[record.city]?.[record.district]?.[record.village] || '';
  }

  function setOptions(select, options, placeholder) {
    select.replaceChildren(new Option(placeholder, ''));
    options.forEach(([value, label]) => select.add(new Option(label, value)));
    select.disabled = options.length === 0;
  }

  function updateCourses() {
    const program = $('program').value;
    const courses = KRS_DATA.courses[program] || [];
    setOptions($('course'), courses.map((item) => [item.id, `${item.name} (${item.credits} SKS)`]),
      program ? 'Pilih mata kuliah' : 'Pilih prodi terlebih dahulu');
    updateCourseInfo();
    updateLecturers();
  }

  function updateLecturers() {
    const course = getCourse({ program: $('program').value, course: $('course').value });
    setOptions($('lecturer'), (course?.lecturers || []).map((id) => [id, KRS_DATA.lecturers[id]]),
      course ? 'Pilih dosen pengampu' : 'Pilih mata kuliah dahulu');
    clearFieldError('lecturer');
  }

  function closeSuggestions() {
    $('name-suggestions').hidden = true;
    $('name').setAttribute('aria-expanded', 'false');
    $('name').removeAttribute('aria-activedescendant');
    activeSuggestion = -1;
  }

  function showSuggestions() {
    const query = $('name').value.trim().toLocaleLowerCase('id');
    suggestedStudents = query ? KRS_DATA.students.filter((student) => student.name.toLocaleLowerCase('id').includes(query)) : [];
    $('name-suggestions').replaceChildren(...suggestedStudents.map((student, index) => {
      const option = document.createElement('div');
      option.id = `student-option-${index}`;
      option.dataset.index = index;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      const name = document.createElement('strong');
      name.textContent = student.name;
      const details = document.createElement('small');
      details.textContent = `${student.nim} · ${KRS_DATA.programs[student.program]}`;
      option.append(name, details);
      return option;
    }));
    activeSuggestion = -1;
    $('name').removeAttribute('aria-activedescendant');
    $('name-suggestions').hidden = suggestedStudents.length === 0;
    $('name').setAttribute('aria-expanded', String(suggestedStudents.length > 0));
  }

  function chooseStudent(index) {
    const student = suggestedStudents[index];
    if (!student) return;
    $('name').value = student.name;
    $('nim').value = student.nim;
    if ($('program').value !== student.program) {
      $('program').value = student.program;
      updateCourses();
    }
    ['name', 'nim', 'program'].forEach(clearFieldError);
    closeSuggestions();
    $('name').focus();
  }

  function updateCourseInfo() {
    const course = getCourse({ program: $('program').value, course: $('course').value });
    $('course-info').textContent = course ? `${course.id} · ${KRS_DATA.programs[$('program').value]}` : 'Detail mata kuliah akan muncul di sini.';
    $('course-credits').textContent = `${course?.credits || 0} SKS`;
  }

  // Reset semua pilihan turunan supaya tidak menyimpan alamat dari induk lama.
  function updateRegions(startIndex) {
    for (let index = startIndex; index < regionIds.length; index += 1) {
      let options = KRS_DATA.regions;
      for (let parent = 0; parent < index; parent += 1) {
        options = options?.[$(regionIds[parent]).value];
      }
      const entries = Object.keys(options || {}).map((value) => [value, value]);
      const placeholder = entries.length ? `Pilih ${regionLabels[index]}` : `Pilih ${regionLabels[index - 1]} dahulu`;
      setOptions($(regionIds[index]), entries, placeholder);
      clearFieldError(regionIds[index]);
    }
    updatePostalCode();
  }

  function updatePostalCode() {
    const record = Object.fromEntries(regionIds.map((id) => [id, $(id).value]));
    const code = getPostalCode(record);
    $('postal-code').value = code;
    $('postal-hint').textContent = code ? `${record.village}, ${record.city}` : 'Pilih kelurahan untuk melihat kode pos.';
  }

  function clearFieldError(id) {
    $(id).removeAttribute('aria-invalid');
    $(`${id}-error`).textContent = '';
  }

  function clearValidation() {
    ['name', 'nim', 'program', 'course', 'lecturer', 'class-group', ...regionIds].forEach(clearFieldError);
    $('form-alert').hidden = true;
    $('form-alert').textContent = '';
  }

  function showError(message, fields = {}) {
    $('form-alert').textContent = message;
    $('form-alert').hidden = false;
    Object.entries(fields).forEach(([id, error]) => {
      $(id).setAttribute('aria-invalid', 'true');
      $(`${id}-error`).textContent = error;
    });
    const first = Object.keys(fields).map($).find((field) => !field.disabled);
    (first || $('submit-button')).focus();
  }

  function clearForm() {
    editingId = null;
    closeSuggestions();
    form.reset();
    clearValidation();
    updateCourses();
    updateRegions(1);
    $('form-title').textContent = 'Registrasi baru';
    $('submit-label').textContent = 'Simpan registrasi';
    $('cancel-button').textContent = 'Kosongkan form';
  }

  function toast(message) {
    clearTimeout(toastTimer);
    $('toast').textContent = message;
    $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
  }

  function filteredRecords() {
    const query = $('search').value.trim().toLocaleLowerCase('id');
    return registrations.filter((record) => {
      const course = getCourse(record);
      const searchable = [record.name, record.nim, KRS_DATA.programs[record.program],
        course.name, course.id, KRS_DATA.lecturers[record.lecturer], `Kelas ${record.classGroup}`, record.province,
        record.city, record.district, record.village, getPostalCode(record)].join(' ');
      return searchable.toLocaleLowerCase('id').includes(query);
    });
  }

  function makeAction(action, record, icon) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `action-button ${action}`;
    button.dataset.action = action;
    button.dataset.id = record.id;
    const label = `${action === 'edit' ? 'Edit' : 'Hapus'} ${record.name}, ${getCourse(record).name}`;
    button.setAttribute('aria-label', label);
    button.title = label;
    // Markup ikon statis. Data dari input hanya ditulis dengan textContent.
    button.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-${icon}"/></svg>`;
    return button;
  }

  function createRow(record) {
    const course = getCourse(record);
    const row = document.createElement('tr');
    row.dataset.id = record.id;
    row.innerHTML = '<td><div class="student-cell"><span class="avatar" aria-hidden="true"></span><div><strong class="cell-title"></strong><span class="cell-sub"></span></div></div></td><td><strong class="cell-title"></strong><span class="cell-sub"></span><span class="cell-sub lecturer"></span><div class="course-tags"><span class="mini-badge"></span><span class="mini-badge neutral"></span></div></td><td><strong class="postal-label"></strong><span class="cell-sub village"></span><span class="cell-sub city"></span></td><td><div class="row-actions"></div></td>';
    const cells = row.cells;
    const avatar = cells[0].querySelector('.avatar');
    avatar.textContent = record.name.split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join('').toUpperCase();
    avatar.dataset.tone = String(Number(record.nim.slice(-1)) % 3);
    cells[0].querySelector('.cell-title').textContent = record.name;
    cells[0].querySelector('.cell-sub').textContent = record.nim;
    cells[1].querySelector('.cell-title').textContent = course.name;
    cells[1].querySelector('.cell-sub').textContent = `${course.id} · ${KRS_DATA.programs[record.program]}`;
    cells[1].querySelector('.lecturer').textContent = KRS_DATA.lecturers[record.lecturer];
    cells[1].querySelector('.mini-badge').textContent = `${course.credits} SKS`;
    cells[1].querySelector('.neutral').textContent = `Kelas ${record.classGroup}`;
    cells[2].querySelector('.postal-label').textContent = getPostalCode(record);
    cells[2].querySelector('.village').textContent = record.village;
    cells[2].querySelector('.city').textContent = record.city;
    cells[3].querySelector('.row-actions').append(makeAction('edit', record, 'edit'), makeAction('delete', record, 'trash'));
    return row;
  }

  // Satu fungsi render untuk menyelaraskan tabel, hasil pencarian, badge, dan halaman.
  function render() {
    const filtered = filteredRecords();
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * pageSize;
    $('registration-rows').replaceChildren(...filtered.slice(start, start + pageSize).map(createRow));
    $('total-records').textContent = registrations.length;
    $('total-students').textContent = new Set(registrations.map((record) => record.nim)).size;
    $('total-credits').textContent = registrations.reduce((total, record) => total + getCourse(record).credits, 0);
    $('list-count').textContent = filtered.length;
    $('pagination-info').textContent = filtered.length
      ? `${start + 1}–${Math.min(start + pageSize, filtered.length)} dari ${filtered.length} registrasi`
      : '0 registrasi ditampilkan';
    $('prev-page').disabled = currentPage === 1;
    $('next-page').disabled = currentPage === totalPages;
    const pages = [];
    for (let page = 1; page <= totalPages; page += 1) {
      if (page !== 1 && page !== totalPages && Math.abs(page - currentPage) > 1) {
        if (pages.at(-1)?.textContent !== '…') {
          const gap = document.createElement('span');
          gap.textContent = '…';
          gap.setAttribute('aria-hidden', 'true');
          pages.push(gap);
        }
        continue;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = page;
      button.dataset.page = page;
      button.setAttribute('aria-label', `Halaman ${page}`);
      if (page === currentPage) button.setAttribute('aria-current', 'page');
      pages.push(button);
    }
    $('page-numbers').replaceChildren(...pages);
    $('empty-state').hidden = filtered.length > 0;
    const isSearching = $('search').value.trim().length > 0;
    $('empty-title').textContent = isSearching ? 'Tidak ada hasil yang cocok' : 'Belum ada registrasi';
    $('empty-message').textContent = isSearching ? 'Coba nama, NIM, mata kuliah, atau kode pos lain.' : 'Isi form untuk memulai rencana studimu.';
    $('clear-search').hidden = !isSearching;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearValidation();
    const record = {
      id: editingId || (globalThis.crypto?.randomUUID?.() || `reg-${Date.now()}-${Math.random().toString(36).slice(2)}`),
      name: $('name').value.trim().replace(/\s+/g, ' '), nim: $('nim').value.trim(),
      program: $('program').value, course: $('course').value, classGroup: $('class-group').value,
      lecturer: $('lecturer').value,
      ...Object.fromEntries(regionIds.map((id) => [id, $(id).value]))
    };
    const errors = {};
    if (record.name.length < 2) errors.name = 'Isi nama minimal 2 karakter.';
    if (!/^\d{6,15}$/.test(record.nim)) errors.nim = 'NIM harus terdiri dari 6–15 digit angka.';
    if (!KRS_DATA.programs[record.program]) errors.program = 'Pilih program studi.';
    if (!getCourse(record)) errors.course = 'Pilih mata kuliah sesuai program studi.';
    if (!getCourse(record)?.lecturers.includes(record.lecturer)) errors.lecturer = 'Pilih dosen sesuai mata kuliah.';
    if (!['A', 'B'].includes(record.classGroup)) errors['class-group'] = 'Pilih kelas A atau B.';
    let branch = KRS_DATA.regions;
    regionIds.forEach((id, index) => {
      if (!Object.hasOwn(branch || {}, record[id])) errors[id] = `Pilih ${regionLabels[index]} yang sesuai.`;
      branch = branch?.[record[id]];
    });
    if (Object.keys(errors).length) {
      showError('Registrasi belum lengkap. Periksa kolom yang ditandai merah.', errors);
      return;
    }
    const otherRecords = registrations.filter((item) => item.id !== editingId && item.nim === record.nim);
    if (otherRecords.some((item) => item.course === record.course)) {
      showError('Mata kuliah ini sudah terdaftar untuk NIM tersebut, termasuk di kelas lain.', { course: 'Pilih mata kuliah lain.' });
      return;
    }
    const totalCredits = otherRecords.reduce((total, item) => total + getCourse(item).credits, 0) + getCourse(record).credits;
    if (totalCredits > 24) {
      showError(`Total menjadi ${totalCredits} SKS. Batas latihan ini adalah 24 SKS per NIM.`, { course: 'Pilihan ini melebihi batas SKS.' });
      return;
    }
    const wasEditing = editingId !== null;
    if (wasEditing) registrations = registrations.map((item) => item.id === editingId ? record : item);
    else registrations.unshift(record);
    $('search').value = '';
    currentPage = 1;
    clearForm();
    render();
    toast(wasEditing ? 'Perubahan registrasi berhasil disimpan.' : 'Registrasi berhasil ditambahkan.');
  });

  function editRecord(record) {
    clearValidation();
    closeSuggestions();
    editingId = record.id;
    $('name').value = record.name;
    $('nim').value = record.nim;
    $('program').value = record.program;
    updateCourses();
    $('course').value = record.course;
    updateCourseInfo();
    updateLecturers();
    $('lecturer').value = record.lecturer;
    $('class-group').value = record.classGroup;
    regionIds.forEach((id, index) => {
      $(id).value = record[id];
      if (index < regionIds.length - 1) updateRegions(index + 1);
    });
    updatePostalCode();
    $('form-title').textContent = 'Edit registrasi';
    $('submit-label').textContent = 'Simpan perubahan';
    $('cancel-button').textContent = 'Batal edit';
    $('registration-form').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    $('name').focus({ preventScroll: true });
  }

  $('registration-rows').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const record = registrations.find((item) => item.id === button.dataset.id);
    if (!record) return;
    if (button.dataset.action === 'edit') editRecord(record);
    else {
      pendingDeleteId = record.id;
      $('delete-description').textContent = `${getCourse(record).name} untuk ${record.name} (${record.nim}) akan dihapus dari daftar.`;
      $('delete-dialog').returnValue = '';
      $('delete-dialog').showModal();
    }
  });

  $('delete-dialog').addEventListener('close', () => {
    if ($('delete-dialog').returnValue === 'delete' && pendingDeleteId) {
      registrations = registrations.filter((record) => record.id !== pendingDeleteId);
      if (editingId === pendingDeleteId) clearForm();
      render();
      $('search').focus();
      toast('Registrasi berhasil dihapus.');
    }
    pendingDeleteId = null;
  });

  $('program').addEventListener('change', () => { updateCourses(); clearFieldError('course'); });
  $('course').addEventListener('change', () => { updateCourseInfo(); updateLecturers(); });
  regionIds.forEach((id, index) => $(id).addEventListener('change', () => {
    if (index < regionIds.length - 1) updateRegions(index + 1);
    else updatePostalCode();
  }));
  ['name', 'nim', 'program', 'course', 'lecturer', 'class-group', ...regionIds].forEach((id) => {
    $(id).addEventListener('input', () => clearFieldError(id));
  });
  $('name').addEventListener('input', showSuggestions);
  $('name').addEventListener('focus', showSuggestions);
  $('name').addEventListener('blur', closeSuggestions);
  $('name-suggestions').addEventListener('mousedown', (event) => event.preventDefault());
  $('name-suggestions').addEventListener('click', (event) => {
    const option = event.target.closest('[data-index]');
    if (option) chooseStudent(Number(option.dataset.index));
  });
  $('name').addEventListener('keydown', (event) => {
    if (event.key === 'Escape' || event.key === 'Tab') { closeSuggestions(); return; }
    if (event.key === 'Enter' && !$('name-suggestions').hidden && activeSuggestion >= 0) {
      event.preventDefault(); chooseStudent(activeSuggestion); return;
    }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    if ($('name-suggestions').hidden) showSuggestions();
    if (!suggestedStudents.length) return;
    event.preventDefault();
    activeSuggestion = activeSuggestion < 0 ? (event.key === 'ArrowDown' ? 0 : suggestedStudents.length - 1)
      : (activeSuggestion + (event.key === 'ArrowDown' ? 1 : -1) + suggestedStudents.length) % suggestedStudents.length;
    [...$('name-suggestions').children].forEach((option, index) => option.setAttribute('aria-selected', String(index === activeSuggestion)));
    $('name').setAttribute('aria-activedescendant', `student-option-${activeSuggestion}`);
  });
  $('cancel-button').addEventListener('click', () => { clearForm(); $('name').focus(); });
  $('search').addEventListener('input', () => { currentPage = 1; render(); });
  $('clear-search').addEventListener('click', () => { $('search').value = ''; currentPage = 1; render(); $('search').focus(); });
  $('page-size').addEventListener('change', () => { pageSize = Number($('page-size').value); currentPage = 1; render(); });
  $('prev-page').addEventListener('click', () => { currentPage -= 1; render(); });
  $('next-page').addEventListener('click', () => { currentPage += 1; render(); });
  $('page-numbers').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-page]');
    if (button) { currentPage = Number(button.dataset.page); render(); $('page-numbers').querySelector('[aria-current="page"]').focus(); }
  });

  setOptions($('program'), Object.entries(KRS_DATA.programs), 'Pilih prodi');
  updateRegions(0);
  render();
})();

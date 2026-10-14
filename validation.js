(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const fields = ['lab-name', 'lab-address', 'lab-email', 'lab-password', 'lab-course', 'lab-college', 'lab-agree'];

  function clearErrors() {
    fields.forEach((id) => {
      $(id).removeAttribute('aria-invalid');
      $(`${id}-error`).textContent = '';
    });
    $('lab-alert').hidden = true;
    $('lab-success').hidden = true;
  }

  $('lab-form').addEventListener('submit', (event) => {
    event.preventDefault();
    clearErrors();
    const errors = {};
    if ($('lab-name').value.trim().length < 2) errors['lab-name'] = 'Nama minimal 2 karakter.';
    if (!$('lab-address').value.trim()) errors['lab-address'] = 'Alamat wajib diisi.';
    $('lab-email').value = $('lab-email').value.trim();
    if (!$('lab-email').checkValidity()) errors['lab-email'] = 'Isi email dengan format yang benar.';
    if ($('lab-password').value.length < 8) errors['lab-password'] = 'Password minimal 8 karakter.';
    if (!$('lab-password').value.trim()) errors['lab-password'] = 'Password tidak boleh hanya berisi spasi.';
    if (!$('lab-course').value) errors['lab-course'] = 'Pilih salah satu kursus.';
    if (!$('lab-college').value.trim()) errors['lab-college'] = 'Nama perguruan tinggi wajib diisi.';
    if (!$('lab-agree').checked) errors['lab-agree'] = 'Centang persetujuan terlebih dahulu.';
    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([id, message]) => {
        $(id).setAttribute('aria-invalid', 'true');
        $(`${id}-error`).textContent = message;
      });
      $('lab-alert').textContent = 'Form belum valid. Periksa kolom yang ditandai merah.';
      $('lab-alert').hidden = false;
      $(Object.keys(errors)[0]).focus();
      return;
    }
    $('lab-success').textContent = `Registrasi ${$('lab-name').value.trim()} untuk kursus ${$('lab-course').value} valid. Seluruh pemeriksaan berhasil.`;
    $('lab-success').hidden = false;
    // Password tidak dimasukkan ke hasil, disimpan, atau dikirim.
    $('lab-password').value = '';
  });

  $('lab-form').addEventListener('reset', clearErrors);
  fields.forEach((id) => $(id).addEventListener('input', () => {
    $(id).removeAttribute('aria-invalid');
    $(`${id}-error`).textContent = '';
    $('lab-success').hidden = true;
  }));

  $('email-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const email = $('email-check');
    email.value = email.value.trim();
    const valid = email.checkValidity();
    $('email-feedback').textContent = valid ? 'Format email valid.' : email.value ? 'Format email tidak valid. Contoh: nama@domain.com.' : 'Email tidak boleh kosong.';
    $('email-feedback').className = `email-feedback ${valid ? 'feedback-success' : 'feedback-danger'}`;
    email.setAttribute('aria-invalid', String(!valid));
    if (!valid) email.focus();
  });
  $('email-check').addEventListener('input', () => {
    $('email-feedback').textContent = '';
    $('email-check').removeAttribute('aria-invalid');
  });
})();

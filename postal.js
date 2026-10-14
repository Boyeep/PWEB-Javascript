(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const fields = ['lookup-province', 'lookup-city', 'lookup-district'];
  const labels = ['provinsi', 'kabupaten/kota', 'kecamatan'];

  function clearError() {
    $('lookup-error').hidden = true;
    fields.forEach((id) => $(id).removeAttribute('aria-invalid'));
  }

  function updateChoices(start) {
    for (let index = start; index < fields.length; index += 1) {
      let branch = KRS_DATA.regions;
      for (let parent = 0; parent < index; parent += 1) branch = branch?.[$(fields[parent]).value];
      const names = Object.keys(branch || {});
      $(fields[index]).replaceChildren(new Option(names.length ? `Pilih ${labels[index]}` : `Pilih ${labels[index - 1]} dahulu`, ''));
      names.forEach((name) => $(fields[index]).add(new Option(name, name)));
      $(fields[index]).disabled = names.length === 0;
    }
    clearError();
    $('lookup-results').replaceChildren();
    $('lookup-summary').textContent = 'Pilih wilayah, lalu tekan Cari kode pos.';
  }

  fields.forEach((id, index) => $(id).addEventListener('change', () => updateChoices(index + 1)));

  $('postal-search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    clearError();
    let branch = KRS_DATA.regions;
    const invalid = fields.findIndex((id) => {
      const value = $(id).value;
      const valid = Object.hasOwn(branch || {}, value);
      branch = branch?.[value];
      return !valid;
    });
    if (invalid >= 0) {
      $('lookup-error').textContent = `Pilih ${labels[invalid]} terlebih dahulu.`;
      $('lookup-error').hidden = false;
      $(fields[invalid]).setAttribute('aria-invalid', 'true');
      $(fields[invalid]).focus();
      $('lookup-results').replaceChildren();
      $('lookup-summary').textContent = 'Lengkapi tiga pilihan wilayah untuk mencari kode pos.';
      return;
    }
    const [province, city, district] = fields.map((id) => $(id).value);
    const query = $('lookup-keyword').value.trim().toLocaleLowerCase('id');
    const matches = Object.entries(branch).filter(([village, code]) => `${village} ${code}`.toLocaleLowerCase('id').includes(query));
    const cards = matches.map(([village, code]) => {
      const card = document.createElement('article');
      card.className = 'postal-result';
      const title = document.createElement('h3');
      title.textContent = village;
      const postal = document.createElement('strong');
      postal.className = 'result-code';
      postal.textContent = code;
      const details = document.createElement('dl');
      [['Provinsi', province], ['Kabupaten / Kota', city], ['Kecamatan', district], ['Kelurahan', village]].forEach(([label, value]) => {
        const term = document.createElement('dt');
        term.textContent = label;
        const description = document.createElement('dd');
        description.textContent = value;
        details.append(term, description);
      });
      card.append(title, postal, details);
      return card;
    });
    $('lookup-results').replaceChildren(...cards);
    $('lookup-summary').textContent = matches.length
      ? `${matches.length} daerah ditemukan di Kecamatan ${district}, ${city}${query ? ` untuk "${$('lookup-keyword').value.trim()}"` : ''}.`
      : 'Tidak ada hasil yang cocok. Coba nama kelurahan atau kode pos lain.';
  });

  updateChoices(0);
})();

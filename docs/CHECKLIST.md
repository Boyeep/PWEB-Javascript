# Checklist kesesuaian latihan

| No. | Ketentuan tugas | Status | Implementasi dan bukti |
|---|---|---|---|
| 1 | Form nama mahasiswa, NIM, mata kuliah, dan dosen. Ketikan nama memunculkan rekomendasi. | Selesai | Form di `index.html`; `showSuggestions()` dan `chooseStudent()` di `app.js`. Rekomendasi mendukung mouse, Arrow Up/Down, Enter, Escape, dan Tab. Pilihan mengisi NIM/prodi; nama baru tetap dapat diketik. [Screenshot autocomplete](../screenshots/autocomplete.png). |
| 2 | Pencarian kode pos Indonesia dari provinsi, kabupaten/kota, dan kecamatan; output kode pos dan informasi daerah. | Selesai untuk dataset latihan | Bagian `#postal-search` di `index.html`, logika di `postal.js`. Hasil menampilkan kelurahan, kecamatan, kota, provinsi, dan kode pos; bisa disaring dengan kata kunci opsional. [Screenshot hasil](../screenshots/postal-search.png). |
| 3 | Latihan JavaScript 1: registration form dan email validation. | Selesai | `latihan-validasi.html` dan `validation.js`. Kolom nama, alamat, email, password, kursus, perguruan tinggi, checkbox, submit/reset, serta form validasi email mandiri. [Screenshot form](../screenshots/form-validation.png). |
| 4 | Membuat list dropdown dinamis. | Selesai | Prodi → mata kuliah → dosen dan provinsi → kota → kecamatan → kelurahan. Pilihan turunan direset/dinonaktifkan ketika induk berubah. Pencarian kode pos mempunyai dropdown terpisah sampai kecamatan. |

**Lingkup dataset:** dua provinsi, dua kota, empat kecamatan, dan enam kelurahan di Makassar serta Bandung. Aplikasi ini memakai contoh wilayah Indonesia dan tidak memuat seluruh wilayah nasional. Nama mahasiswa, NIM, dosen, dan katalog mata kuliah merupakan simulasi.

**Validasi:** 28 kelompok pemeriksaan lolos, tanpa error JavaScript/console. Bukti rinci tersedia di [qa-report.json](../qa-report.json) dan pengujian dapat diulang menggunakan `python tests/check_app.py`.

**Tambahan pada proyek:** CRUD registrasi, pencarian tabel, pagination, ringkasan SKS, pencegahan mata kuliah ganda, dan batas simulasi 24 SKS per NIM.

**Hasil akhir:** [repository GitHub](https://github.com/Boyeep/PWEB-Javascript), [demo utama](https://boyeep.github.io/PWEB-Javascript/), [demo latihan validasi](https://boyeep.github.io/PWEB-Javascript/latihan-validasi.html), dan [artikel Blogspot](blogspot.html).

Referensi latihan dan sumber kode pos tersedia di [SOURCES.md](SOURCES.md).

"""Uji alur pengguna dan screenshot. Jalankan dari folder proyek: python tests/check_app.py."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import os
import sys

from playwright.sync_api import sync_playwright, expect

sys.stdout.reconfigure(encoding='utf-8')
PROJECT = Path(__file__).resolve().parents[1]
SCREENSHOTS = PROJECT / 'screenshots'
SCREENSHOTS.mkdir(exist_ok=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def fill_registration(page, name='Mahasiswa Uji', nim='5025259999', program='IF',
                      course='IF301', group='A', province='Sulawesi Selatan',
                      city='Makassar', district='Panakkukang', village='Masale'):
    for field, value in [('name', name), ('nim', nim)]:
        page.locator(f'#{field}').fill(value)
    for field, value in [('program', program), ('course', course), ('class-group', group),
                         ('province', province), ('city', city), ('district', district), ('village', village)]:
        page.locator(f'#{field}').select_option(value)
        if field == 'course':
            page.locator('#lecturer').select_option(index=1)


checks, errors = [], []


def record(label):
    checks.append(label)
    print('PASS:', label, flush=True)


def screenshot(page, filename):
    # Full-page capture dimulai dari atas agar elemen fixed tidak terekam di posisi scroll lama.
    page.evaluate('document.activeElement.blur(); window.scrollTo({top: 0, behavior: "instant"})')
    if page.locator('#toast').count():
        expect(page.locator('#toast')).to_be_hidden(timeout=6000)
    page.screenshot(path=str(SCREENSHOTS / filename), full_page=True)


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(PROJECT)))
Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}'
try:
    with sync_playwright() as pw:
        chrome = os.environ.get('CHROME_PATH', 'C:/Program Files/Google/Chrome/Application/chrome.exe')
        browser = pw.chromium.launch(headless=True, **({'executable_path': chrome} if Path(chrome).exists() else {}))
        page = browser.new_page(viewport={'width': 1440, 'height': 1050}, device_scale_factor=1)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
        assert page.goto(url).status == 200
        expect(page.locator('#total-records')).to_have_text('8')
        expect(page.locator('#total-students')).to_have_text('3')
        expect(page.locator('#total-credits')).to_have_text('26')
        expect(page.locator('#registration-rows tr')).to_have_count(5)
        screenshot(page, 'desktop.png')
        record('Halaman awal, 8 data contoh, 3 NIM, 26 SKS, dan 5 baris')

        page.locator('#name').fill('Na')
        expect(page.locator('#name-suggestions')).to_be_visible()
        expect(page.locator('#name-suggestions')).to_contain_text('Nadia Putri')
        expect(page.locator('#name')).to_have_attribute('aria-expanded', 'true')
        page.locator('.form-panel').screenshot(path=str(SCREENSHOTS / 'autocomplete.png'))
        page.locator('#name').press('ArrowDown')
        expect(page.locator('#name')).to_have_attribute('aria-activedescendant', 'student-option-0')
        page.locator('#name').press('Enter')
        expect(page.locator('#name')).to_have_value('Nadia Putri')
        expect(page.locator('#nim')).to_have_value('5025251001')
        expect(page.locator('#program')).to_have_value('IF')
        expect(page.locator('#name-suggestions')).to_be_hidden()
        page.locator('#name').fill('ra')
        page.locator('#name-suggestions [role=option]').filter(has_text='Raka Pratama').click()
        expect(page.locator('#nim')).to_have_value('5025251002')
        page.locator('#name').fill('a')
        page.locator('#name').press('Escape')
        expect(page.locator('#name-suggestions')).to_be_hidden()
        page.locator('#name').fill('Nama di luar rekomendasi')
        expect(page.locator('#name-suggestions')).to_be_hidden()
        page.locator('#cancel-button').click()
        record('Autocomplete nama, pilihan mouse/keyboard, Escape, autofill NIM/prodi, dan nama baru')

        page.locator('#program').select_option('IF')
        page.locator('#course').select_option('IF301')
        page.locator('#lecturer').select_option('D01')
        page.locator('#course').select_option('IF302')
        expect(page.locator('#lecturer')).to_have_value('')
        assert page.locator('#lecturer option').evaluate_all('(options) => options.every(o => !o.value || ["D02", "D03"].includes(o.value))')
        page.locator('#program').select_option('')
        expect(page.locator('#lecturer')).to_be_disabled()
        page.locator('#cancel-button').click()
        record('Dropdown dosen mengikuti mata kuliah dan mereset pilihan saat kuliah/prodi berubah')

        page.locator('#next-page').click()
        expect(page.locator('#registration-rows tr')).to_have_count(3)
        expect(page.locator('#pagination-info')).to_have_text('6–8 dari 8 registrasi')
        expect(page.locator('#next-page')).to_be_disabled()
        page.get_by_role('button', name='Halaman 1', exact=True).click()
        expect(page.locator('#prev-page')).to_be_disabled()
        page.locator('#page-size').select_option('10')
        expect(page.locator('#registration-rows tr')).to_have_count(8)
        page.locator('#page-size').select_option('5')
        record('Pagination, tombol batas halaman, dan pilihan 5/10 baris')

        for query, count in [('NADIA', 3), ('5025251002', 2), ('IF303', 1), ('ARIF', 2), ('90245', 3), ('Sarijadi', 0)]:
            page.locator('#search').fill(query)
            expect(page.locator('#list-count')).to_have_text(str(count))
        expect(page.locator('#empty-state')).to_be_visible()
        page.locator('#clear-search').click()
        expect(page.locator('#list-count')).to_have_text('8')
        record('Pencarian real-time berdasarkan nama, NIM, kode kuliah, dosen, kode pos, dan hasil kosong')

        page.locator('#submit-button').click()
        expect(page.locator('#form-alert')).to_be_visible()
        expect(page.locator('#name')).to_have_attribute('aria-invalid', 'true')
        assert page.locator('#form-alert').evaluate('(el) => getComputedStyle(el).color') == 'rgb(180, 35, 48)'
        screenshot(page, 'validation.png')
        record('Form kosong ditolak, danger berwarna merah, dan error pada kolom')

        fill_registration(page, nim='12abc')
        page.locator('#submit-button').click()
        expect(page.locator('#nim-error')).to_contain_text('6–15 digit')
        expect(page.locator('#total-records')).to_have_text('8')
        page.locator('#cancel-button').click()
        record('NIM nonangka ditolak tanpa menambah data')

        fill_registration(page)
        page.locator('#lecturer').select_option('')
        page.locator('#submit-button').click()
        expect(page.locator('#lecturer-error')).to_contain_text('Pilih dosen')
        expect(page.locator('#total-records')).to_have_text('8')
        page.locator('#cancel-button').click()
        record('Dosen wajib diisi sebelum registrasi disimpan')

        page.locator('#program').select_option('IF')
        page.locator('#course').select_option('IF303')
        expect(page.locator('#course-credits')).to_have_text('4 SKS')
        page.locator('#program').select_option('SI')
        expect(page.locator('#course')).to_have_value('')
        assert page.locator('#course option').evaluate_all('(items) => items.every(i => !i.value || i.value.startsWith("SI"))')
        page.locator('#program').select_option('')
        expect(page.locator('#course')).to_be_disabled()
        record('Dropdown mata kuliah mengikuti prodi dan mereset pilihan lama')

        fill_registration(page)
        expect(page.locator('#postal-code')).to_have_value('90231')
        page.locator('#district').select_option('Tamalanrea')
        expect(page.locator('#village')).to_have_value('')
        expect(page.locator('#postal-code')).to_have_value('')
        page.locator('#village').select_option('Tamalanrea Indah')
        expect(page.locator('#postal-code')).to_have_value('90245')
        page.locator('#province').select_option('Jawa Barat')
        expect(page.locator('#city')).to_have_value('')
        expect(page.locator('#district')).to_be_disabled()
        expect(page.locator('#village')).to_be_disabled()
        expect(page.locator('#postal-code')).to_have_value('')
        page.locator('#city').select_option('Bandung')
        page.locator('#district').select_option('Sukasari')
        page.locator('#village').select_option('Sarijadi')
        expect(page.locator('#postal-code')).to_have_value('40151')
        assert page.locator('#postal-code').evaluate('(el) => el.readOnly')
        page.locator('#city').select_option('')
        expect(page.locator('#district')).to_be_disabled()
        expect(page.locator('#postal-code')).to_have_value('')
        page.locator('#submit-button').click()
        expect(page.locator('#form-alert')).to_be_visible()
        record('Cascade wilayah, perubahan induk, kode pos otomatis/read-only, dan alamat tidak lengkap ditolak')

        fill_registration(page)
        page.locator('#submit-button').click()
        expect(page.locator('#total-records')).to_have_text('9')
        expect(page.locator('#total-students')).to_have_text('4')
        expect(page.locator('#total-credits')).to_have_text('29')
        expect(page.locator('#registration-rows tr').first).to_contain_text('Mahasiswa Uji')
        expect(page.locator('#toast')).to_contain_text('ditambahkan')
        expect(page.locator('#name')).to_have_value('')
        record('Tambah data, ringkasan SKS/NIM, toast, dan form kembali kosong')

        fill_registration(page, group='B')
        page.locator('#submit-button').click()
        expect(page.locator('#form-alert')).to_contain_text('sudah terdaftar')
        expect(page.locator('#total-records')).to_have_text('9')
        page.locator('#cancel-button').click()
        record('Mata kuliah ganda untuk NIM yang sama ditolak meskipun kelas berbeda')

        page.locator('#registration-rows tr').first.locator('button[data-action=edit]').click()
        expect(page.locator('#form-title')).to_have_text('Edit registrasi')
        for field, value in [('program', 'IF'), ('course', 'IF301'), ('lecturer', 'D01'), ('province', 'Sulawesi Selatan'),
                             ('city', 'Makassar'), ('district', 'Panakkukang'), ('village', 'Masale'), ('postal-code', '90231')]:
            expect(page.locator(f'#{field}')).to_have_value(value)
        screenshot(page, 'edit.png')
        page.locator('#name').fill('Mahasiswa Teredit')
        page.locator('#province').select_option('Jawa Barat')
        page.locator('#city').select_option('Bandung')
        page.locator('#district').select_option('Coblong')
        page.locator('#village').select_option('Dago')
        page.locator('#submit-button').click()
        expect(page.locator('#total-records')).to_have_text('9')
        expect(page.locator('#registration-rows tr').first).to_contain_text('Mahasiswa Teredit')
        expect(page.locator('#registration-rows tr').first).to_contain_text('40135')
        record('Edit memuat semua dropdown dan menyimpan perubahan alamat tanpa menggandakan data')

        page.locator('#registration-rows tr').first.locator('button[data-action=edit]').click()
        page.locator('#name').fill('Perubahan dibatalkan')
        page.locator('#cancel-button').click()
        expect(page.locator('#form-title')).to_have_text('Registrasi baru')
        expect(page.locator('#registration-rows tr').first).to_contain_text('Mahasiswa Teredit')
        record('Batal edit tidak mengubah data dan mengakhiri mode edit')

        page.locator('#registration-rows tr').first.locator('button[data-action=delete]').click()
        expect(page.locator('#delete-dialog')).to_be_visible()
        page.keyboard.press('Escape')
        expect(page.locator('#total-records')).to_have_text('9')
        page.locator('#registration-rows tr').first.locator('button[data-action=delete]').click()
        page.get_by_role('button', name='Batal', exact=True).click()
        expect(page.locator('#total-records')).to_have_text('9')
        page.locator('#registration-rows tr').first.locator('button[data-action=delete]').click()
        page.get_by_role('button', name='Ya, hapus', exact=True).click()
        expect(page.locator('#total-records')).to_have_text('8')
        expect(page.locator('#total-students')).to_have_text('3')
        record('Konfirmasi hapus, Escape, batal, dan penghapusan beserta pembaruan badge')

        for course in ['IF301', 'IF302', 'IF303', 'IF304', 'IF305', 'IF306', 'IF307']:
            fill_registration(page, name='Batas SKS', nim='5025258888', course=course)
            page.locator('#submit-button').click()
            expect(page.locator('#form-alert')).to_be_hidden()
        fill_registration(page, name='Batas SKS', nim='5025258888', course='IF308')
        page.locator('#submit-button').click()
        expect(page.locator('#form-alert')).to_contain_text('26 SKS')
        expect(page.locator('#total-records')).to_have_text('15')
        page.locator('#cancel-button').click()
        # Mengedit data 23 SKS tetap boleh karena registrasi lama tidak dihitung dua kali.
        page.locator('#registration-rows tr').first.locator('button[data-action=edit]').click()
        page.locator('#class-group').select_option('B')
        page.locator('#submit-button').click()
        expect(page.locator('#form-alert')).to_be_hidden()
        expect(page.locator('#total-records')).to_have_text('15')
        record('Batas 24 SKS per NIM dan perhitungan ulang yang benar saat edit')

        fill_registration(page, name='<img src=x onerror=alert(1)>', nim='5025257777')
        page.locator('#submit-button').click()
        expect(page.locator('#registration-rows tr').first).to_contain_text('<img src=x onerror=alert(1)>')
        expect(page.locator('#registration-rows img')).to_have_count(0)
        record('Input mirip HTML ditampilkan sebagai teks tanpa dieksekusi')

        page.reload()
        expect(page.locator('#total-records')).to_have_text('8')
        expect(page.locator('#course')).to_be_disabled()
        expect(page.locator('#postal-code')).to_have_value('')
        record('Refresh memulai sesi baru dengan data contoh sesuai model array memori')

        # Hapus data pada halaman terakhir untuk memeriksa clamp halaman aktif.
        page.locator('#next-page').click()
        for _ in range(3):
            page.locator('#registration-rows tr').first.locator('button[data-action=delete]').click()
            page.get_by_role('button', name='Ya, hapus', exact=True).click()
        expect(page.locator('#pagination-info')).to_have_text('1–5 dari 5 registrasi')
        expect(page.locator('#prev-page')).to_be_disabled()
        for _ in range(5):
            page.locator('#registration-rows tr').first.locator('button[data-action=delete]').click()
            page.get_by_role('button', name='Ya, hapus', exact=True).click()
        expect(page.locator('#empty-title')).to_have_text('Belum ada registrasi')
        expect(page.locator('#total-credits')).to_have_text('0')
        expect(page.locator('#total-students')).to_have_text('0')
        page.reload()
        record('Halaman dijepit setelah baris terakhir dihapus dan kondisi seluruh data kosong')

        page.locator('#postal-search-form button[type=submit]').click()
        expect(page.locator('#lookup-error')).to_contain_text('provinsi')
        page.locator('#lookup-province').select_option('Sulawesi Selatan')
        page.locator('#lookup-city').select_option('Makassar')
        page.locator('#lookup-district').select_option('Panakkukang')
        page.locator('#postal-search-form button[type=submit]').click()
        expect(page.locator('.postal-result')).to_have_count(2)
        expect(page.locator('#lookup-results')).to_contain_text('90231')
        expect(page.locator('#lookup-results')).to_contain_text('Masale')
        expect(page.locator('#lookup-results')).to_contain_text('Karampuang')
        expect(page.locator('#lookup-results')).to_contain_text('Sulawesi Selatan')
        page.locator('#postal-search').screenshot(path=str(SCREENSHOTS / 'postal-search.png'))
        record('Pencarian kode pos terpisah, pilihan wajib sampai kecamatan, dan output informasi dua daerah')

        page.locator('#lookup-keyword').fill('masale')
        page.locator('#postal-search-form button[type=submit]').click()
        expect(page.locator('.postal-result')).to_have_count(1)
        page.locator('#lookup-keyword').fill('90231')
        page.locator('#postal-search-form button[type=submit]').click()
        expect(page.locator('.postal-result')).to_have_count(2)
        page.locator('#lookup-keyword').fill('99999')
        page.locator('#postal-search-form button[type=submit]').click()
        expect(page.locator('.postal-result')).to_have_count(0)
        expect(page.locator('#lookup-summary')).to_contain_text('Tidak ada hasil')
        page.locator('#lookup-province').select_option('Jawa Barat')
        expect(page.locator('#lookup-city')).to_have_value('')
        expect(page.locator('#lookup-district')).to_be_disabled()
        expect(page.locator('#lookup-results')).to_be_empty()
        page.locator('#lookup-keyword').fill('')
        page.locator('#lookup-city').select_option('Bandung')
        page.locator('#lookup-district').select_option('Sukasari')
        page.locator('#postal-search-form button[type=submit]').click()
        expect(page.locator('#lookup-results')).to_contain_text('40151')
        expect(page.locator('#lookup-results')).to_contain_text('Sarijadi')
        record('Filter nama/kode pos, hasil kosong, reset wilayah, dan pencarian Bandung')

        for width, height in [(375, 812), (768, 1024), (812, 375), (1024, 768), (1440, 1050)]:
            page.set_viewport_size({'width': width, 'height': height})
            assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'Overflow halaman {width}px'
            for field in ['name', 'nim', 'program', 'course', 'province', 'city', 'district', 'village']:
                box = page.locator(f'#{field}').bounding_box()
                assert box['width'] >= 80, (width, field, box)
            if width == 375:
                screenshot(page, 'mobile.png')
        record('Layout 375, 768, landscape 812, 1024, dan 1440 piksel tanpa overflow halaman')

        page.emulate_media(reduced_motion='reduce')
        assert page.locator('html').evaluate('(el) => getComputedStyle(el).scrollBehavior') == 'auto'
        page.keyboard.press('Control+Home')
        page.locator('.skip-link').focus()
        page.keyboard.press('Enter')
        expect(page.locator('#main')).to_be_focused()
        page.locator('#name').focus()
        assert page.locator('#name').evaluate('(el) => !!el.labels.length')
        record('Reduced motion, skip link, label form, dan interaksi keyboard')

        page.goto(url + '/latihan-validasi.html')
        screenshot(page, 'form-validation.png')
        page.locator('#lab-form button[type=submit]').click()
        expect(page.locator('#lab-alert')).to_be_visible()
        expect(page.locator('#lab-name-error')).to_contain_text('Nama')
        expect(page.locator('#lab-agree-error')).to_contain_text('persetujuan')
        page.locator('#lab-name').fill('Peserta Latihan')
        page.locator('#lab-address').fill('Jalan Kampus 10')
        page.locator('#lab-email').fill('email-salah')
        page.locator('#lab-password').fill('123')
        page.locator('#lab-course').select_option('JavaScript')
        page.locator('#lab-college').fill('Perguruan Tinggi Contoh')
        page.locator('#lab-form button[type=submit]').click()
        expect(page.locator('#lab-email-error')).to_contain_text('format')
        expect(page.locator('#lab-password-error')).to_contain_text('8 karakter')
        expect(page.locator('#lab-success')).to_be_hidden()
        record('Latihan JavaScript 1: kolom wajib, format email, password pendek, dan checkbox persetujuan')

        page.locator('#lab-email').fill('peserta@example.com')
        page.locator('#lab-password').fill('contoh123')
        page.locator('#lab-agree').check()
        page.locator('#lab-form button[type=submit]').click()
        expect(page.locator('#lab-success')).to_contain_text('Seluruh pemeriksaan berhasil')
        expect(page.locator('#lab-password')).to_have_value('')
        page.locator('#lab-form button[type=reset]').click()
        expect(page.locator('#lab-name')).to_have_value('')
        expect(page.locator('#lab-agree')).not_to_be_checked()
        expect(page.locator('#lab-success')).to_be_hidden()
        expect(page.locator('#lab-alert')).to_be_hidden()
        record('Registrasi umum valid, password tidak ditampilkan/disimpan, dan reset form')

        page.locator('#email-form button').click()
        expect(page.locator('#email-feedback')).to_have_text('Email tidak boleh kosong.')
        page.locator('#email-check').fill('bukan-email')
        page.locator('#email-form button').click()
        expect(page.locator('#email-feedback')).to_contain_text('tidak valid')
        page.locator('#email-check').fill('peserta@example.com')
        page.locator('#email-form button').click()
        expect(page.locator('#email-feedback')).to_have_text('Format email valid.')
        expect(page.locator('#email-check')).to_have_attribute('aria-invalid', 'false')
        record('Form validasi email mandiri: kosong, format salah, dan format benar')

        for width in [375, 768, 812, 1024, 1440]:
            page.set_viewport_size({'width': width, 'height': 900})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        record('Halaman latihan validasi responsif pada lima ukuran layar')

        assert not errors, errors
        record('Tidak ada error JavaScript atau console selama pengujian')
        browser.close()
    report = {'status': 'passed', 'browser': 'Chromium / Chrome headless', 'checks': checks,
              'passed': len(checks), 'javascript_errors': errors,
              'viewports': [375, 768, 812, 1024, 1440]}
    (PROJECT / 'qa-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
finally:
    server.shutdown()

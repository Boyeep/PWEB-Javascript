// Dataset kecil untuk latihan dropdown. Detail sumber kode pos ada di docs/SOURCES.md.
const KRS_DATA = {
  programs: { IF: 'Informatika', SI: 'Sistem Informasi' },
  lecturers: {
    D01: 'Dr. Arif Santoso', D02: 'Maya Puspita, M.Kom.',
    D03: 'Bima Saputra, M.Kom.', D04: 'Dewi Lestari, M.Kom.'
  },
  courses: {
    IF: [
      { id: 'IF301', name: 'Pemrograman Web', credits: 3 },
      { id: 'IF302', name: 'Basis Data', credits: 3 },
      { id: 'IF303', name: 'Algoritma & Struktur Data', credits: 4 },
      { id: 'IF304', name: 'Interaksi Manusia & Komputer', credits: 3 },
      { id: 'IF305', name: 'Jaringan Komputer', credits: 3 },
      { id: 'IF306', name: 'Sistem Operasi', credits: 3 },
      { id: 'IF307', name: 'Rekayasa Perangkat Lunak', credits: 4 },
      { id: 'IF308', name: 'Matematika Diskrit', credits: 3 }
    ],
    SI: [
      { id: 'SI301', name: 'Pemrograman Web', credits: 3 },
      { id: 'SI302', name: 'Manajemen Basis Data', credits: 3 },
      { id: 'SI303', name: 'Analisis & Desain Sistem', credits: 4 },
      { id: 'SI304', name: 'Proses Bisnis', credits: 3 },
      { id: 'SI305', name: 'Manajemen Proyek TI', credits: 3 },
      { id: 'SI306', name: 'Sistem Informasi Akuntansi', credits: 3 },
      { id: 'SI307', name: 'Pengembangan Aplikasi', credits: 4 },
      { id: 'SI308', name: 'Statistika', credits: 3 }
    ]
  },
  regions: {
    'Sulawesi Selatan': {
      Makassar: {
        Panakkukang: { Masale: '90231', Karampuang: '90231' },
        Tamalanrea: { Tamalanrea: '90245', 'Tamalanrea Indah': '90245' }
      }
    },
    'Jawa Barat': {
      Bandung: { Coblong: { Dago: '40135' }, Sukasari: { Sarijadi: '40151' } }
    }
  },
  // Nama dan NIM fiktif; katalog serta batas SKS merupakan aturan simulasi.
  students: [
    { name: 'Nadia Putri', nim: '5025251001', program: 'IF', province: 'Sulawesi Selatan', city: 'Makassar', district: 'Panakkukang', village: 'Masale' },
    { name: 'Raka Pratama', nim: '5025251002', program: 'IF', province: 'Jawa Barat', city: 'Bandung', district: 'Coblong', village: 'Dago' },
    { name: 'Alya Ramadhani', nim: '5025252001', program: 'SI', province: 'Sulawesi Selatan', city: 'Makassar', district: 'Tamalanrea', village: 'Tamalanrea Indah' }
  ],
  examples: [
    [0, 'IF301', 'A'], [1, 'IF303', 'B'], [2, 'SI303', 'A'],
    [0, 'IF302', 'A'], [1, 'IF305', 'B'], [2, 'SI304', 'A'],
    [0, 'IF304', 'B'], [2, 'SI302', 'A']
  ]
};

// Setiap mata kuliah memiliki pilihan dosen contoh untuk dropdown dinamis.
Object.values(KRS_DATA.courses).forEach((courses) => courses.forEach((course, index) => {
  const lecturerIds = Object.keys(KRS_DATA.lecturers);
  course.lecturers = [lecturerIds[index % 4], lecturerIds[(index + 1) % 4]];
}));

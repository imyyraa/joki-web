import ExcelJS from 'exceljs'
import { createClient } from '@supabase/supabase-js'

// ===== PENGATURAN =====
// kode game di web : nama sheet di Excel
const GAME_SHEET = {
  HI3: 'HI3',
  GI: 'GI',
  HSR: 'HSR',
  WUWA: 'WUWA',
  ZZZ: 'ZZZ',
  AK: 'AKOG',
  AKE: 'AKEND',
  BA: 'BA',
  NTE: 'NTE',
  OTHER: 'OTHER',
}
// penulisan lain di kolom "Game Yang Dijoki" pada Rekap
const ALIAS_GAME = { AKOG: 'AK', AKEND: 'AKE' }
const PAKSA_NORMAL = ['adit'] // nama (huruf kecil) yang tetap dipotong
const PAKSA_BEBAS = [] // nama (huruf kecil) yang tidak dipotong
const PERSEN_NORMAL = 10
const PERSEN_BEBAS = 0 // pekerja dengan catatan CS atau admin di panel sheet
const BARIS_ORDER = 9
const BARIS_REKAP = 10
const BARIS_MAKS = 400
// ======================

const DAFTAR_GAME = Object.entries(GAME_SHEET)
const KODE_GAME = DAFTAR_GAME.map(([g]) => g)

const argumen = process.argv.slice(2)
const berkas = argumen.find((a) => !a.startsWith('--'))
const TULIS = argumen.includes('--tulis')

if (!berkas) {
  console.error('Pemakaian: node --env-file=.env.local scripts/impor.mjs data-impor/NAMA.xlsx [--tulis]')
  process.exit(1)
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const kunci = process.env.SUPABASE_SECRET_KEY
if (!url || !kunci) {
  console.error('NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SECRET_KEY belum terbaca dari .env.local')
  process.exit(1)
}

const db = createClient(url, kunci, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const HARI_INI = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })

// ---------- pembantu ----------
function isi(sel) {
  let v = sel.value
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if ('result' in v) v = v.result
    else if ('richText' in v) v = v.richText.map((x) => x.text).join('')
    else if ('text' in v) v = v.text
    else if ('error' in v) v = v.error
  }
  return v === undefined ? null : v
}
const teks = (v) =>
  (v === null || v === undefined ? '' : String(v)).replace(/\s+/g, ' ').trim()
const kosong = (v) => v === null || v === undefined || v === ''
const kunciNama = (n) => teks(n).toLowerCase()
const rp = (n) => 'Rp' + Number(n).toLocaleString('id-ID')

function uang(v) {
  if (kosong(v)) return 0
  if (typeof v === 'number') return Math.round(v)
  const s = String(v).replace(/rp/gi, '').replace(/[,\s]/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n) : NaN
}

function tanggalIso(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'number') {
    return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10)
  }
  const m = teks(v).match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/)
  if (!m) return null
  const d = Number(m[1])
  const mo = Number(m[2])
  let y = Number(m[3])
  if (m[3].length === 2) y += 2000
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null
  }
  return dt.toISOString().slice(0, 10)
}

function koreksiTahun(iso) {
  if (iso <= HARI_INI) return { iso, diubah: false }
  const kandidat = HARI_INI.slice(0, 4) + iso.slice(4)
  if (kandidat <= HARI_INI) return { iso: kandidat, diubah: true }
  return { iso, diubah: false, bermasalah: true }
}

function nomorCus(v) {
  const s = teks(v)
  if (!s) return { nilai: null, diperbaiki: false }
  if (/^8/.test(s)) return { nilai: '0' + s, diperbaiki: true }
  return { nilai: s, diperbaiki: false }
}

const hariKe = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86400000)
}

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b)
  const t = Math.floor(s.length / 2)
  return s.length % 2 ? s[t] : (s[t - 1] + s[t]) / 2
}

function tukarHariBulan(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  if (d > 12 || d === m) return null
  return `${y}-${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}`
}

async function sisip(tabel, baris, pilih = 'id') {
  const hasil = []
  for (let i = 0; i < baris.length; i += 100) {
    const { data, error } = await db.from(tabel).insert(baris.slice(i, i + 100)).select(pilih)
    if (error) throw new Error(`${tabel}: ${error.message}`)
    hasil.push(...(data ?? []))
  }
  return hasil
}

// ---------- baca berkas ----------
const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(berkas)

const galat = []
const peringatan = []

// Rekap
const rekap = new Map()
const wsRekap = wb.getWorksheet('Rekap')
if (!wsRekap) {
  console.error('Sheet "Rekap" tidak ditemukan.')
  process.exit(1)
}
for (let r = BARIS_REKAP; r <= 80; r++) {
  const baris = wsRekap.getRow(r)
  const nama = teks(isi(baris.getCell(1)))
  if (!nama) continue
  rekap.set(kunciNama(nama), {
    nama,
    games: teks(isi(baris.getCell(5)))
      .split(/[,;&]+/)
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean),
    rekening: teks(isi(baris.getCell(6))) || null,
    orderan: Number(isi(baris.getCell(2))),
    penghasilan: uang(isi(baris.getCell(3))),
    kas: uang(isi(baris.getCell(4))),
  })
}

// Panel worker per game
const pekerja = new Map()
const panel = new Map()
for (const [k, rk] of rekap) {
  pekerja.set(k, { nama: rk.nama, rekening: rk.rekening, bebas: false })
}
for (const [kodeGame, namaSheet] of DAFTAR_GAME) {
  const ws = wb.getWorksheet(namaSheet)
  if (!ws) {
    galat.push(`Sheet "${namaSheet}" tidak ditemukan di berkas.`)
    continue
  }
  const daftar = []
  for (let r = 9; r <= 60; r++) {
    const nama = teks(isi(ws.getRow(r).getCell(15)))
    if (!nama) break
    const cat = teks(isi(ws.getRow(r).getCell(19)))
    const k = kunciNama(nama)
    if (!pekerja.has(k)) {
      pekerja.set(k, { nama, rekening: null, bebas: false })
      peringatan.push(`Worker "${nama}" ada di panel ${namaSheet} tetapi tidak ada di Rekap.`)
    }
    if (/\bcs\b|\badmin\b/i.test(cat)) pekerja.get(k).bebas = true
    daftar.push({ k, cadangan: /backup|cadangan/i.test(cat) })
  }
  panel.set(kodeGame, daftar)
}
for (const [k, w] of pekerja) {
  if (PAKSA_BEBAS.includes(k)) w.bebas = true
  if (PAKSA_NORMAL.includes(k)) w.bebas = false
}

// Cocokkan game di Rekap dengan panel
const bersih = (g) => g.replace(/\(.*\)/, '').trim()
for (const [k, rk] of rekap) {
  const dariPanel = KODE_GAME.filter((g) => (panel.get(g) ?? []).some((x) => x.k === k))
  const dariRekap = rk.games.map((g) => ALIAS_GAME[bersih(g)] ?? bersih(g))
  const beda = [
    ...dariPanel.filter((g) => !dariRekap.includes(g)),
    ...dariRekap.filter((g) => !dariPanel.includes(g)),
  ]
  if (beda.length) {
    peringatan.push(
      `Game ${rk.nama} berbeda antara Rekap (${dariRekap.join(', ')}) dan panel (${dariPanel.join(', ')}).`
    )
  }
}

// Data dari database
const { data: gamesDb, error: errGame } = await db
  .from('games')
  .select('id, kode, awalan_kode')
if (errGame) throw new Error(errGame.message)
const gameDb = new Map((gamesDb ?? []).map((g) => [g.kode, g]))

const { data: pekerjaDb } = await db.from('workers').select('id, nama, potongan_persen')
const dbPekerja = new Map((pekerjaDb ?? []).map((w) => [kunciNama(w.nama), w]))

const { data: orderDb } = await db.from('orders').select('game_id, kode')
const adaDb = new Set((orderDb ?? []).map((o) => `${o.game_id}|${o.kode}`))

for (const kodeGame of KODE_GAME) {
  if (!gameDb.has(kodeGame)) {
    galat.push(`Game "${kodeGame}" belum ada di database. Jalankan SQL 2 terlebih dahulu.`)
  }
}

const rateDari = (k) => {
  const di = dbPekerja.get(k)
  if (di) return Number(di.potongan_persen)
  return pekerja.get(k).bebas ? PERSEN_BEBAS : PERSEN_NORMAL
}

// ---------- baca order ----------
const orders = []
const ringkas = []
const koreksi = []
let nomorDiperbaiki = 0

for (const [kodeGame, namaSheet] of DAFTAR_GAME) {
  const ws = wb.getWorksheet(namaSheet)
  const game = gameDb.get(kodeGame)
  if (!ws || !game) continue

  let placeholder = 0
  const kodeDilihat = new Set()
  const daftarSheet = []

  for (let r = BARIS_ORDER; r <= Math.min(ws.rowCount, BARIS_MAKS); r++) {
    const row = ws.getRow(r)
    const v = (c) => isi(row.getCell(c))
    const kode = teks(v(1)).toUpperCase()
    const joki = teks(v(2))
    const namaPekerja = teks(v(3))
    const lokasi = `${namaSheet} baris ${r} (${kode || 'tanpa kode'})`

    if (/^KODE\s*JOKI$/.test(kode)) continue

    if (!joki && kosong(v(4))) {
      if (namaPekerja || !kosong(v(5)) || !kosong(v(6))) {
        peringatan.push(`${lokasi}: baris tidak lengkap (tanpa jenis joki dan harga) dilewati.`)
      } else if (kode) {
        placeholder++
      }
      continue
    }

    const m = kode.match(/^#([A-Z0-9]*?[A-Z])(\d+)$/)
    if (!m) {
      galat.push(`${lokasi}: format kode tidak dikenali.`)
      continue
    }
    if (m[1] !== game.awalan_kode) {
      peringatan.push(`${lokasi}: awalan kode (${m[1]}) tidak sama dengan awalan game (${game.awalan_kode}).`)
    }
    if (kodeDilihat.has(kode)) {
      galat.push(`${lokasi}: kode ganda di sheet ${namaSheet}.`)
      continue
    }
    kodeDilihat.add(kode)

    const k = kunciNama(namaPekerja)
    if (!pekerja.has(k)) {
      galat.push(`${lokasi}: worker "${namaPekerja}" tidak dikenal.`)
      continue
    }

    const harga = uang(v(4))
    const charge = uang(v(10))
    const awal = uang(v(9))
    if (!Number.isFinite(harga) || harga <= 0) {
      galat.push(`${lokasi}: harga tidak valid.`)
      continue
    }
    if (!Number.isFinite(charge) || !Number.isFinite(awal) || charge < 0 || awal < 0) {
      galat.push(`${lokasi}: charge atau pencairan awal tidak valid.`)
      continue
    }

        const mentahTgl = v(5)
    const tglMentah = tanggalIso(mentahTgl)
    if (!tglMentah) {
      galat.push(`${lokasi}: tanggal kosong atau tidak terbaca. Isi tanggalnya di sheet.`)
      continue
    }
    let tgl = tglMentah
    if (Number(tgl.slice(0, 4)) < 2000) {
      const baru = HARI_INI.slice(0, 4) + tgl.slice(4)
      koreksi.push(`${lokasi}: tahun salah ketik ${tgl} menjadi ${baru}`)
      tgl = baru
    }
    const thn = koreksiTahun(tgl)
    if (thn.diubah) {
      koreksi.push(`${lokasi}: ${tgl} menjadi ${thn.iso}`)
      tgl = thn.iso
    }
    // Sel tanggal asli Excel berasal dari ketikan hari/bulan yang terbaca terbalik
    if (mentahTgl instanceof Date || typeof mentahTgl === 'number') {
      const tukar = tukarHariBulan(tgl)
      if (tukar) {
        if (tukar <= HARI_INI) {
          koreksi.push(`${lokasi}: ${tgl} menjadi ${tukar} (hari dan bulan ditukar)`)
          tgl = tukar
        } else {
          peringatan.push(`${lokasi}: tanggal ${tgl} mungkin terbalik, tetapi hasil tukarnya ${tukar} di masa depan. Periksa.`)
        }
      }
    }

    const pRaw = teks(v(7))
    const kRaw = teks(v(8))
    if (pRaw && !/selesai|progress/i.test(pRaw)) peringatan.push(`${lokasi}: progress "${pRaw}" tidak dikenal, dianggap Progress.`)
    if (kRaw && !/dibayar|disimpan/i.test(kRaw)) peringatan.push(`${lokasi}: kas "${kRaw}" tidak dikenal, dianggap Disimpan.`)
    if (!pRaw || !kRaw) peringatan.push(`${lokasi}: progress atau kas kosong, dianggap Progress dan Disimpan.`)
    const progress = /selesai/i.test(pRaw) ? 'selesai' : 'progress'
    const kas = /dibayar/i.test(kRaw) ? 'dibayarkan' : 'disimpan'

    const nomor = nomorCus(v(6))
    if (nomor.diperbaiki) nomorDiperbaiki++

    const rate = rateDari(k)
    const bagian = Math.round(((harga + charge) * (100 - rate)) / 100)

    const pencairan = []
    if (awal > 0) pencairan.push({ jumlah: awal, pelunasan: false, catatan: 'Impor: pencairan awal' })
    if (kas === 'dibayarkan') {
      const sisa = bagian - awal
      if (sisa > 0) pencairan.push({ jumlah: sisa, pelunasan: true, catatan: 'Impor: pelunasan' })
    }
    const dicairkan = pencairan.reduce((a, b) => a + b.jumlah, 0)
    const dana = bagian - dicairkan
    if (dana < 0) peringatan.push(`${lokasi}: pencairan melebihi bagian worker (kelebihan ${rp(-dana)}).`)

    if (kas === 'disimpan' && !pekerja.get(k).bebas) {
      const danaSheet = uang(v(11))
      if (Number.isFinite(danaSheet) && danaSheet !== dana) {
        peringatan.push(`${lokasi}: dana di kas sheet ${rp(danaSheet)} berbeda dari hitungan ${rp(dana)}.`)
      }
    }

    daftarSheet.push({
      lokasi,
      kodeGame,
      gameId: game.id,
      kode,
      nomorUrut: Number(m[2]),
      joki: joki || '-',
      k,
      harga,
      charge,
      tanggal: tgl,
      progress,
      kas,
      nomor: nomor.nilai,
      catatan: teks(v(13)) || null,
      pencairan,
      dana,
    })
  }

    // Peringatan bila tanggal jauh berbeda dari order di sekitarnya
  const hariList = daftarSheet.map((o) => hariKe(o.tanggal))
  daftarSheet.forEach((o, i) => {
    const tetangga = []
    for (let j = Math.max(0, i - 3); j <= Math.min(daftarSheet.length - 1, i + 3); j++) {
      if (j !== i) tetangga.push(hariList[j])
    }
    if (tetangga.length < 2) return
    if (Math.abs(hariList[i] - median(tetangga)) > 45) {
      peringatan.push(`${o.lokasi}: tanggal ${o.tanggal} janggal dibanding order di sekitarnya, periksa.`)
    }
  })

  for (const o of daftarSheet) {
    if (o.tanggal > HARI_INI) {
      galat.push(`${o.lokasi}: tanggal ${o.tanggal} di masa depan dan tidak bisa dikoreksi otomatis.`)
    }
    if (o.tanggal < '2026-01-01') {
      peringatan.push(`${o.lokasi}: tanggal ${o.tanggal} terlalu lama, periksa.`)
    }
    orders.push(o)
  }
  ringkas.push({ kodeGame, namaSheet, jumlah: daftarSheet.length, placeholder })
}

// ---------- laporan ----------
console.log('\n=== RINGKASAN PER GAME ===')
for (const s of ringkas) {
  console.log(`${s.kodeGame} (sheet ${s.namaSheet}): ${s.jumlah} order, ${s.placeholder} baris kerangka kosong dilewati`)
}
console.log(`Total order dibaca: ${orders.length}`)
console.log(`Nomor customer yang diperbaiki (ditambah 0 di depan): ${nomorDiperbaiki}`)

console.log('\n=== PEKERJA TANPA POTONGAN (CS atau admin) ===')
console.log(
  [...pekerja.values()].filter((w) => w.bebas).map((w) => w.nama).join(', ') || '(tidak ada)'
)

console.log(`\n=== KOREKSI TANGGAL (${koreksi.length}) ===`)
koreksi.forEach((x) => console.log(' ' + x))

console.log(`\n=== PERINGATAN (${peringatan.length}) ===`)
peringatan.forEach((x) => console.log(' ' + x))

console.log('\n=== RINGKASAN PER PEKERJA HASIL IMPOR ===')
const statistik = new Map()
for (const o of orders) {
  const s = statistik.get(o.k) ?? { orderan: 0, penghasilan: 0, kas: 0 }
  s.orderan++
  s.penghasilan += o.harga + o.charge
  s.kas += Math.max(o.dana, 0)
  statistik.set(o.k, s)
}
let totalKas = 0
for (const [k, w] of pekerja) {
  const s = statistik.get(k) ?? { orderan: 0, penghasilan: 0, kas: 0 }
  totalKas += s.kas
  console.log(
    ` ${w.nama}${w.bebas ? ' (bebas potongan)' : ''}: ${s.orderan} order, penghasilan ${rp(s.penghasilan)}, kas ${rp(s.kas)}`
  )
}
console.log(`Total kas tersimpan hasil impor: ${rp(totalKas)}`)

console.log(`\n=== KESALAHAN (${galat.length}) ===`)
galat.forEach((x) => console.log(' ' + x))

if (!TULIS) {
  console.log('\nMODE UJI COBA: tidak ada data yang ditulis. Perbaiki sheet bila perlu, lalu jalankan lagi dengan --tulis.')
  process.exit(0)
}
if (galat.length > 0) {
  console.log('\nAda kesalahan. Perbaiki sheet atau database dulu, lalu ulangi. Tidak ada yang ditulis.')
  process.exit(1)
}

// ---------- tulis ----------
const baru = orders.filter((o) => !adaDb.has(`${o.gameId}|${o.kode}`))
console.log(`\nMenulis: ${baru.length} order baru (${orders.length - baru.length} sudah ada dan dilewati)...`)

const barisPekerja = []
for (const [k, w] of pekerja) {
  if (!dbPekerja.has(k)) {
    barisPekerja.push({
      nama: w.nama,
      rekening: w.rekening,
      potongan_persen: w.bebas ? PERSEN_BEBAS : PERSEN_NORMAL,
    })
  }
}
if (barisPekerja.length) await sisip('workers', barisPekerja)
console.log(`Worker baru: ${barisPekerja.length}`)

const { data: semuaPekerja } = await db.from('workers').select('id, nama')
const idPekerja = new Map((semuaPekerja ?? []).map((w) => [kunciNama(w.nama), w.id]))

const { data: tugasAktif } = await db
  .from('worker_games')
  .select('worker_id, game_id')
  .is('selesai', null)
const sudahBertugas = new Set((tugasAktif ?? []).map((t) => `${t.worker_id}|${t.game_id}`))

const tanggalAwal = new Map()
for (const o of baru) {
  const kk = `${o.k}|${o.gameId}`
  if (!tanggalAwal.has(kk) || o.tanggal < tanggalAwal.get(kk)) tanggalAwal.set(kk, o.tanggal)
}

const barisTugas = []
for (const [kodeGame, daftar] of panel) {
  const game = gameDb.get(kodeGame)
  for (const x of daftar) {
    const workerId = idPekerja.get(x.k)
    if (sudahBertugas.has(`${workerId}|${game.id}`)) continue
    barisTugas.push({
      worker_id: workerId,
      game_id: game.id,
      status: x.cadangan ? 'cadangan' : 'normal',
      mulai: tanggalAwal.get(`${x.k}|${game.id}`) ?? HARI_INI,
    })
  }
}
if (barisTugas.length) await sisip('worker_games', barisTugas)
console.log(`Penugasan game: ${barisTugas.length}`)

const barisOrder = baru.map((o) => ({
  kode: o.kode,
  game_id: o.gameId,
  worker_id: idPekerja.get(o.k),
  nama_joki: o.joki,
  harga: o.harga,
  charge: o.charge,
  tanggal: o.tanggal,
  progress: o.progress,
  kas: o.kas,
  catatan: o.catatan,
}))
const tersimpan = await sisip('orders', barisOrder, 'id, game_id, kode')
const idOrder = new Map(tersimpan.map((x) => [`${x.game_id}|${x.kode}`, x.id]))
console.log(`Order tersimpan: ${tersimpan.length}`)

const barisPrivat = baru
  .filter((o) => o.nomor)
  .map((o) => ({ order_id: idOrder.get(`${o.gameId}|${o.kode}`), no_customer: o.nomor }))
if (barisPrivat.length) await sisip('order_privat', barisPrivat, 'order_id')
console.log(`Nomor customer tersimpan: ${barisPrivat.length}`)

const barisCair = []
for (const o of baru) {
  const orderId = idOrder.get(`${o.gameId}|${o.kode}`)
  for (const p of o.pencairan) {
    barisCair.push({
      order_id: orderId,
      jenis: 'pencairan',
      jumlah: p.jumlah,
      tanggal: `${o.tanggal}T12:00:00+07:00`,
      catatan: p.catatan,
      pelunasan: p.pelunasan,
    })
  }
}
if (barisCair.length) await sisip('pencairan', barisCair, 'id')
console.log(`Riwayat pencairan: ${barisCair.length}`)

const terakhir = new Map()
for (const o of orders) {
  terakhir.set(o.gameId, Math.max(terakhir.get(o.gameId) ?? 0, o.nomorUrut))
}
for (const [gameId, angka] of terakhir) {
  const { data: ada } = await db
    .from('game_urutan')
    .select('terakhir')
    .eq('game_id', gameId)
    .maybeSingle()
  const nilai = Math.max(angka, ada?.terakhir ?? 0)
  const { error } = await db
    .from('game_urutan')
    .upsert({ game_id: gameId, terakhir: nilai }, { onConflict: 'game_id' })
  if (error) throw new Error(`game_urutan: ${error.message}`)
}

console.log('\nSELESAI. Cocokkan hasilnya dengan query verifikasi.')
/**
 * Denpasar berstatus kota, sembilan wilayah lain berstatus kabupaten.
 * Dipakai agar penyebutan wilayah konsisten di seluruh halaman publik.
 */
export function districtLabel(name: string) {
  return name === 'Denpasar' ? 'Kota Denpasar' : `Kabupaten ${name}`
}

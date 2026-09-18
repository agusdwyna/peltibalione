/**
 * Master Data Lapangan §1 — pengisi form hanya menempel link Google Maps;
 * latitude/longitude diturunkan sistem dan tidak pernah diminta sebagai input.
 *
 * Bentuk link yang didukung (tanpa memanggil jaringan — link pendek goo.gl
 * tidak bisa diurai dan menghasilkan null, yang memang diperbolehkan):
 *   .../@-8.6500,115.2166,17z
 *   ...!3d-8.6500!4d115.2166
 *   ...?q=-8.6500,115.2166   (juga &query=, &ll=, &center=)
 *   "-8.6500, 115.2166"      (koordinat ditempel langsung)
 */
export function parseMapsCoordinates(input?: string | null): { latitude: number; longitude: number } | null {
  if (!input) return null
  const value = input.trim()
  if (!value) return null

  const patterns = [
    /@(-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/,
    /!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/,
    /[?&](?:q|query|ll|center|daddr|sll)=(-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/,
    /^(-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)$/,
  ]

  for (const pattern of patterns) {
    const match = value.match(pattern)
    if (!match) continue
    const latitude = Number(match[1])
    const longitude = Number(match[2])
    // Reject out-of-range hits — a URL slug can look like a coordinate pair.
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue
    return { latitude, longitude }
  }

  return null
}

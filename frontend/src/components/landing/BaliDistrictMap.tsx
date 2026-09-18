import { useEffect, useRef, useState } from 'react'
import type { District } from '../../types/auth'

type Props = { districts: District[]; disabledCodes?: string[]; onDetail: (district: District) => void; onManage: (district: District) => void; onDoubleClick: (district: District) => void }
type HoveredRegion = { code: string; x: number; y: number }

const sourceTitleToCode: Record<string, string> = { BADUNG: 'BDG', BANGLI: 'BGL', BULELENG: 'BLL', 'KOTA DENPASAR': 'DPS', GIANYAR: 'GYN', JEMBRANA: 'JBR', KARANGASEM: 'KRA', KLUNGKUNG: 'KLG', TABANAN: 'TAB' }

/** Uses the original district SVG source and binds workspace-picker events to its anchors. */
export default function BaliDistrictMap({ districts, disabledCodes = [], onDetail, onManage, onDoubleClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | null>(null)
  const [markup, setMarkup] = useState('')
  const [hovered, setHovered] = useState<HoveredRegion | null>(null)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  const clearClose = () => { if (closeTimer.current) window.clearTimeout(closeTimer.current) }
  const scheduleClose = () => { clearClose(); closeTimer.current = window.setTimeout(() => { setHovered(null); mapRef.current?.querySelectorAll('.pelti-map-hover').forEach((element) => element.classList.remove('pelti-map-hover')) }, 280) }
  const getAnchor = (target: EventTarget | null) => {
    const element = target instanceof Element ? target.closest('a') : null
    const title = element?.getAttribute('xlink:title') ?? element?.getAttribute('title')
    const code = title ? sourceTitleToCode[title.trim().toUpperCase()] : undefined
    return code ? { element, code, district: districts.find((item) => item.code === code) } : null
  }
  const isEnabled = (found: ReturnType<typeof getAnchor>): found is NonNullable<ReturnType<typeof getAnchor>> => Boolean(found?.district && !disabledCodes.includes(found.code))
  const updateHovered = (target: EventTarget | null) => {
    const found = getAnchor(target)
    if (!isEnabled(found)) return
    clearClose()
    mapRef.current?.querySelectorAll('.pelti-map-hover').forEach((element) => element.classList.remove('pelti-map-hover'))
    found.element?.classList.add('pelti-map-hover')
    const mapRect = mapRef.current?.getBoundingClientRect()
    const regionRect = found.element?.getBoundingClientRect()
    if (!mapRect || !regionRect) return
    setHovered({ code: found.code, x: regionRect.left - mapRect.left + regionRect.width / 2, y: regionRect.top - mapRect.top + regionRect.height / 2 })
  }
  const selectAnchor = (target: EventTarget | null) => {
    const found = getAnchor(target)
    if (!isEnabled(found)) return null
    setSelectedCode(found.code)
    mapRef.current?.querySelectorAll('.pelti-map-selected').forEach((element) => element.classList.remove('pelti-map-selected'))
    found.element?.classList.add('pelti-map-selected')
    return found
  }

  useEffect(() => { let active = true; fetch('/bali-district-map.svg').then((response) => { if (!response.ok) throw Error(); return response.text() }).then((text) => { if (active) setMarkup(text) }).catch(() => setMarkup('')); return () => { active = false } }, [])

  const activeDistrict = hovered ? districts.find((district) => district.code === hovered.code) : null
  return <div
    ref={mapRef}
    className="pelti-map-source relative w-full"
    aria-label="Pilih workspace kabupaten atau kota di Bali"
    onPointerOver={(event) => updateHovered(event.target)}
    onPointerOut={(event) => { const next = event.relatedTarget; if (next instanceof Node && event.currentTarget.contains(next)) return; scheduleClose() }}
    onClick={(event) => {
      const found = selectAnchor(event.target)
      if (found) { event.preventDefault(); event.stopPropagation() }
    }}
    onDoubleClick={(event) => {
      const found = selectAnchor(event.target)
      if (!found) return
      event.preventDefault()
      event.stopPropagation()
      onDoubleClick(found.district)
    }}
    onKeyDown={(event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      const found = selectAnchor(event.target)
      if (!found) return
      event.preventDefault()
      onDoubleClick(found.district)
    }}
  >
    <div dangerouslySetInnerHTML={{ __html: markup }} />
    {activeDistrict && hovered && <div className="absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800" style={{ left: hovered.x, top: hovered.y }} onPointerEnter={clearClose} onPointerLeave={scheduleClose}>
      <p className="whitespace-nowrap text-xs font-semibold text-gray-800 dark:text-gray-100">{activeDistrict.name}</p>
      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-gray-500"><span>Atlet</span><strong>{activeDistrict._count?.players ?? 0}</strong><span>Pelatih</span><strong>{activeDistrict._count?.coaches ?? 0}</strong><span>Satpras</span><strong>{activeDistrict._count?.facilities ?? 0}</strong><span>Wasit</span><strong>{activeDistrict._count?.referees ?? 0}</strong></div>
      <div className="mt-2 flex gap-3 border-t border-gray-100 pt-2 dark:border-gray-700/60"><button className="text-[11px] font-medium text-gray-600 hover:text-violet-600 dark:text-gray-300" onClick={() => onDetail(activeDistrict)}>Detail</button><button className="text-[11px] font-medium text-violet-600 hover:text-violet-700" onClick={() => onManage(activeDistrict)}>Manage</button></div>
    </div>}
    {selectedCode && <span className="sr-only" aria-live="polite">Workspace {districts.find((district) => district.code === selectedCode)?.name ?? selectedCode} dipilih. Double-click untuk membuka.</span>}
  </div>
}

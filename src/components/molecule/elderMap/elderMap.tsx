'use client'

import { useTranslations } from 'next-intl'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { ElderLocation } from '@/shared/types'

// Fix Leaflet's broken default marker icons under webpack/Next.js
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

export type ElderMapProps = {
  locations: ElderLocation[]
}

export function ElderMap({ locations }: ElderMapProps) {
  const t = useTranslations('caregiver.dashboard')

  if (locations.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        {t('noLocation')}
      </p>
    )
  }

  const center: [number, number] = [locations[0].lat, locations[0].lng]
  const osmAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ height: '300px', width: '100%' }}
      className="rounded-lg"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution={osmAttribution}
      />
      {locations.map((loc) => (
        <Marker
          key={loc.elderId}
          position={[loc.lat, loc.lng]}
          icon={markerIcon}
        >
          <Popup>
            {t('locationUpdated')}{' '}
            {new Date(loc.capturedAt).toLocaleString('th-TH')}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

import { render, screen } from '@testing-library/react'
import { ElderMap } from '../elderMap'

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: React.PropsWithChildren) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: React.PropsWithChildren) => <div data-testid="map-marker">{children}</div>,
  Popup: ({ children }: React.PropsWithChildren) => <div data-testid="map-popup">{children}</div>,
}))

jest.mock('leaflet', () => ({
  icon: jest.fn(() => ({})),
}))

jest.mock('leaflet/dist/leaflet.css', () => {})

describe('ElderMap', () => {
  it('shows noLocation message when locations is empty', () => {
    render(<ElderMap locations={[]} />)
    expect(screen.getByText('noLocation')).toBeInTheDocument()
  })

  it('renders map when locations provided', () => {
    const locations = [
      { elderId: 'e1', lat: 13.7563, lng: 100.5018, accuracy: 10, capturedAt: '2026-01-01T00:00:00Z' },
    ]
    render(<ElderMap locations={locations} />)
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
    expect(screen.getByTestId('map-marker')).toBeInTheDocument()
  })

  it('renders a marker for each location', () => {
    const locations = [
      { elderId: 'e1', lat: 13.0, lng: 100.0, accuracy: 5, capturedAt: '2026-01-01T00:00:00Z' },
      { elderId: 'e2', lat: 14.0, lng: 101.0, accuracy: 5, capturedAt: '2026-01-01T00:00:00Z' },
    ]
    render(<ElderMap locations={locations} />)
    const markers = screen.getAllByTestId('map-marker')
    expect(markers).toHaveLength(2)
  })

  it('renders popup with locationUpdated label', () => {
    const locations = [
      { elderId: 'e1', lat: 13.7563, lng: 100.5018, accuracy: 10, capturedAt: '2026-01-01T00:00:00Z' },
    ]
    render(<ElderMap locations={locations} />)
    const popup = screen.getByTestId('map-popup')
    expect(popup).toBeInTheDocument()
    expect(popup).toHaveTextContent('locationUpdated')
  })
})

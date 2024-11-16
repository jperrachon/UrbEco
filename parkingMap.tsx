'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from 'lucide-react'

type ParkingSpot = {
    id: number
    lat: number
    lng: number
    name: string
    availableSpots: number
}

// Función para generar puntos de estacionamiento aleatorios
const generateParkingSpots = (count: number): ParkingSpot[] => {
    const spots: ParkingSpot[] = []
    const centerLat = -34.9011
    const centerLng = -56.1645
    const spread = 0.03 // Aproximadamente 3km en cada dirección

    for (let i = 0; i < count; i++) {
        const lat = centerLat + (Math.random() - 0.5) * spread
        const lng = centerLng + (Math.random() - 0.5) * spread
        spots.push({
            id: i + 1,
            lat,
            lng,
            name: `Estacionamiento ${i + 1}`,
            availableSpots: Math.floor(Math.random() * 10) + 1 // 1 a 10 espacios disponibles
        })
    }

    return spots
}

const parkingSpots = generateParkingSpots(200) // Generamos 200 puntos de estacionamiento

const createMarkerIcon = (availableSpots: number) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${availableSpots > 5 ? 'green' : 'orange'}; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; justify-content: center; align-items: center; font-weight: bold;">${availableSpots}</div>`,
    })
}

const createClusterIcon = (cluster: L.MarkerCluster) => {
    const childMarkers = cluster.getAllChildMarkers()
    const totalAvailableSpots = childMarkers.reduce((total, marker) => {
        const parkingSpot = marker.options.parkingSpot as ParkingSpot
        return total + parkingSpot.availableSpots
    }, 0)

    let className = 'custom-cluster-icon'
    if (totalAvailableSpots < 10) className += ' small'
    else if (totalAvailableSpots < 50) className += ' medium'
    else className += ' large'

    return L.divIcon({
        html: `<div><span>${totalAvailableSpots}</span></div>`,
        className: className,
        iconSize: L.point(40, 40)
    })
}

function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap()
    map.setView(center, zoom)
    return null
}

export default function ParkingMap() {
    const [center, setCenter] = useState<[number, number]>([-34.9011, -56.1645])
    const [zoom, setZoom] = useState(13)
    const [searchQuery, setSearchQuery] = useState('')
    const mapRef = useRef<L.Map | null>(null)

    useEffect(() => {
        // Add custom CSS for animations
        const style = document.createElement('style')
        style.textContent = `
      .custom-marker {
        transition: all 0.3s ease;
      }
      .custom-cluster-icon {
        background-color: rgba(255, 255, 255, 0.7);
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        font-weight: bold;
        transition: all 0.3s ease;
      }
      .custom-cluster-icon > div {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 50%;
        background-color: rgba(74, 144, 226, 0.7);
        transition: all 0.3s ease;
      }
      .custom-cluster-icon.small > div {
        background-color: rgba(74, 144, 226, 0.7);
      }
      .custom-cluster-icon.medium > div {
        background-color: rgba(245, 166, 35, 0.7);
      }
      .custom-cluster-icon.large > div {
        background-color: rgba(208, 2, 27, 0.7);
      }
      .custom-cluster-icon:hover > div {
        transform: scale(1.1);
      }
    `
        document.head.appendChild(style)

        return () => {
            document.head.removeChild(style)
        }
    }, [])

    const handleGetNearestSpot = useCallback(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                const userLat = position.coords.latitude
                const userLng = position.coords.longitude

                let nearestSpot: ParkingSpot | null = null
                let minDistance = Infinity

                parkingSpots.forEach((spot) => {
                    if (spot.availableSpots > 0) {
                        const distance = Math.sqrt(
                            Math.pow(spot.lat - userLat, 2) + Math.pow(spot.lng - userLng, 2)
                        )
                        if (distance < minDistance) {
                            minDistance = distance
                            nearestSpot = spot
                        }
                    }
                })

                if (nearestSpot) {
                    setCenter([nearestSpot.lat, nearestSpot.lng])
                    setZoom(18)

                    if (mapRef.current) {
                        const markerElement = mapRef.current.getContainer().querySelector(`[title="${nearestSpot.name}"]`)
                        if (markerElement) {
                            (markerElement as HTMLElement).click()
                        }
                    }
                } else {
                    alert('Lo sentimos, no hay estacionamientos disponibles en este momento.')
                }
            }, (error) => {
                console.error("Error getting user location:", error)
                alert('No se pudo obtener tu ubicación. Por favor, verifica que has dado permiso de ubicación a la aplicación.')
            })
        } else {
            alert('Geolocalización no está disponible en tu navegador.')
        }
    }, [])

    const handleSearch = useCallback(async () => {
        if (!searchQuery) return

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}, Montevideo&limit=1`)
            const data = await response.json()

            if (data && data.length > 0) {
                const { lat, lon } = data[0]
                setCenter([parseFloat(lat), parseFloat(lon)])
                setZoom(18)
            } else {
                alert('No se encontró la dirección. Por favor, intenta con una búsqueda más específica.')
            }
        } catch (error) {
            console.error('Error searching for address:', error)
            alert('Hubo un error al buscar la dirección. Por favor, inténtalo de nuevo.')
        }
    }, [searchQuery])

    return (
        <div className="h-screen w-full flex flex-col">
            <header className="bg-background p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center">
                    <div className="w-10 h-10 bg-primary rounded-full mr-2"></div>
                    <h1 className="text-xl font-bold">ParkSpot Montevideo</h1>
                </div>
                <div className="flex w-full sm:w-auto gap-2">
                    <Input
                        type="text"
                        placeholder="Buscar dirección..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-grow"
                    />
                    <Button onClick={handleSearch} className="bg-primary hover:bg-primary-dark">
                        <Search className="w-4 h-4 mr-2" />
                        Buscar
                    </Button>
                    <Button
                        onClick={handleGetNearestSpot}
                        className="bg-green-400 hover:bg-green-500 text-primary-foreground whitespace-nowrap"
                    >
                        Estacionamiento cercano
                    </Button>
                </div>
            </header>

            <div className="flex-grow relative">
                <MapContainer
                    center={center}
                    zoom={zoom}
                    className="h-full w-full"
                    ref={mapRef}
                >
                    <ChangeView center={center} zoom={zoom} />
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <MarkerClusterGroup
                        chunkedLoading
                        iconCreateFunction={createClusterIcon}
                        spiderfyOnMaxZoom={false}
                        showCoverageOnHover={false}
                        zoomToBoundsOnClick={true}
                        maxClusterRadius={60}
                        animate={true}
                    >
                        {parkingSpots.map((spot) => (
                            <Marker
                                key={spot.id}
                                position={[spot.lat, spot.lng]}
                                icon={createMarkerIcon(spot.availableSpots)}
                                title={spot.name}
                                parkingSpot={spot}
                            >
                                <Popup>
                                    <div>
                                        <h3 className="font-bold">{spot.name}</h3>
                                        <p>Espacios disponibles: {spot.availableSpots}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MarkerClusterGroup>
                </MapContainer>
            </div>

            <footer className="bg-muted p-4 text-center">
                <div className="max-w-md mx-auto bg-background rounded-lg p-2 shadow-md">
                    <p className="text-sm text-muted-foreground">Espacio para publicidad</p>
                </div>
            </footer>
        </div>
    )
}
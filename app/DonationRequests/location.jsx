"use client"
import { useEffect, useState } from "react"

const UserCity = () => {
  const [city, setCity] = useState("Detecting...")

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          console.log("Latitude:", latitude, "Longitude:", longitude)

          try {
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
            )
            const data = await response.json()
            console.log("Free API Response:", data)

            const cityName = data.city || data.locality || data.principalSubdivision || "City not found"
            setCity(cityName)
          } catch (error) {
            console.error("Free API error:", error)
            setCity("Error fetching city")
          }
        },
        (error) => {
          console.error("Geolocation error:", error)
          setCity("Location permission denied")
        },
      )
    } else {
      setCity("Geolocation not supported")
    }
  }, [])

  return <div></div>
}

export default UserCity

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DangerZone {
  id: string
  location_id: string
  location_name: string
  center_lat: number
  center_lng: number
  danger_level: 'high' | 'medium' | 'low'
  affected_demographics: string[]
  polygon_points: Array<{lat: number, lng: number}>
  reasons: string[]
  time_based: boolean
  active_times?: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { user_id, radius_miles = 50 } = await req.json()

    if (!user_id) {
      throw new Error('user_id is required')
    }

    // Get user's demographics
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user_id)
      .single()

    if (!userProfile) {
      throw new Error('User profile not found')
    }

    // Get dangerous locations within radius
    // Using safety score < 3 as danger threshold
    const { data: dangerousLocations } = await supabase
      .from('safety_scores')
      .select(`
        *,
        locations!inner(
          id,
          name,
          latitude,
          longitude,
          place_type
        )
      `)
      .lt('avg_overall_score', 3)
      .or(`demographic_value.cs.{${userProfile.race_ethnicity?.join(',')}},demographic_value.eq.${userProfile.gender}`)

    const dangerZones: DangerZone[] = []

    if (dangerousLocations && dangerousLocations.length > 0) {
      // Group by location to find patterns
      const locationGroups = dangerousLocations.reduce((acc, score) => {
        const locId = score.location_id
        if (!acc[locId]) {
          acc[locId] = {
            location: score.locations,
            scores: []
          }
        }
        acc[locId].scores.push(score)
        return acc
      }, {} as Record<string, any>)

      // Create danger zones
      for (const [locationId, data] of Object.entries(locationGroups)) {
        const { location, scores } = data
        
        // Check if this location is particularly dangerous for user's demographics
        const userDemoScores = scores.filter((s: any) => {
          return (userProfile.race_ethnicity?.includes(s.demographic_value) ||
                  s.demographic_value === userProfile.gender ||
                  (s.demographic_type === 'lgbtq_status' && userProfile.lgbtq_status))
        })

        if (userDemoScores.length === 0) continue

        // Calculate average danger level for user's demographics
        const avgScore = userDemoScores.reduce((sum: number, s: any) => 
          sum + Number(s.avg_overall_score), 0) / userDemoScores.length

        let dangerLevel: 'high' | 'medium' | 'low'
        if (avgScore < 2) dangerLevel = 'high'
        else if (avgScore < 2.5) dangerLevel = 'medium'
        else dangerLevel = 'low'

        // Create 2-mile radius polygon (octagon for simplicity)
        const centerLat = Number(location.latitude)
        const centerLng = Number(location.longitude)
        const radiusInDegrees = 2 / 69 // Approximately 2 miles in degrees

        const polygonPoints = []
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI * 2) / 8
          polygonPoints.push({
            lat: centerLat + (Math.sin(angle) * radiusInDegrees),
            lng: centerLng + (Math.cos(angle) * radiusInDegrees * Math.cos(centerLat * Math.PI / 180))
          })
        }

        // Determine affected demographics and reasons
        const affectedDemographics = new Set<string>()
        const reasons = new Set<string>()

        userDemoScores.forEach((score: any) => {
          if (score.avg_overall_score < 3) {
            affectedDemographics.add(`${score.demographic_type}: ${score.demographic_value}`)
            
            if (score.avg_overall_score < 2) {
              reasons.add(`Severe safety concerns for ${score.demographic_value}`)
            } else {
              reasons.add(`Reported discrimination against ${score.demographic_value}`)
            }
          }
        })

        // Check for time-based patterns using pattern-detector
        const { data: patterns } = await supabase
          .rpc('get_discrimination_patterns', {
            location_id: locationId,
            threshold: 1.5
          })

        let timeBased = false
        let activeTimes: string[] = []

        if (patterns && patterns.length > 0) {
          const timePattern = patterns.find((p: any) => 
            p.pattern_type === 'time_based_discrimination'
          )
          if (timePattern) {
            timeBased = true
            activeTimes = timePattern.evidence?.active_times || ['evening', 'night']
            reasons.add('Increased risk during certain times')
          }
        }

        dangerZones.push({
          id: `zone_${locationId}`,
          location_id: locationId,
          location_name: location.name,
          center_lat: centerLat,
          center_lng: centerLng,
          danger_level: dangerLevel,
          affected_demographics: Array.from(affectedDemographics),
          polygon_points: polygonPoints,
          reasons: Array.from(reasons),
          time_based: timeBased,
          active_times: activeTimes.length > 0 ? activeTimes : undefined
        })
      }
    }

    // Sort by danger level (high first)
    dangerZones.sort((a, b) => {
      const levels = { high: 0, medium: 1, low: 2 }
      return levels[a.danger_level] - levels[b.danger_level]
    })

    return new Response(
      JSON.stringify({
        user_id,
        danger_zones: dangerZones,
        total_zones: dangerZones.length,
        user_demographics: {
          race_ethnicity: userProfile.race_ethnicity,
          gender: userProfile.gender,
          lgbtq_status: userProfile.lgbtq_status
        },
        generated_at: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
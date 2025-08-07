import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DiscriminationPattern {
  location_id: string
  location_name: string
  pattern_type: 'demographic_disparity' | 'sudden_change' | 'outlier_reviews' | 'systematic_bias'
  severity: 'low' | 'medium' | 'high'
  affected_demographics: string[]
  evidence: {
    score_disparity?: number
    review_count?: number
    time_period?: string
    specific_issues?: string[]
  }
  recommendation: string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { 
      location_id, 
      scan_all = false,
      threshold = 2.0 // Score difference threshold for flagging
    } = await req.json()

    const patterns: DiscriminationPattern[] = []

    if (scan_all) {
      // Scan all locations for patterns
      const { data: allLocations } = await supabase
        .from('locations')
        .select('id, name')
      
      for (const location of allLocations || []) {
        const locationPatterns = await analyzeLocation(supabase, location.id, location.name, threshold)
        patterns.push(...locationPatterns)
      }
    } else {
      // Analyze specific location
      if (!location_id) {
        throw new Error('location_id is required when scan_all is false')
      }

      const { data: location } = await supabase
        .from('locations')
        .select('name')
        .eq('id', location_id)
        .single()

      const locationPatterns = await analyzeLocation(supabase, location_id, location?.name || 'Unknown', threshold)
      patterns.push(...locationPatterns)
    }

    // Sort by severity
    const sortedPatterns = patterns.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })

    return new Response(
      JSON.stringify({
        patterns_detected: sortedPatterns.length,
        patterns: sortedPatterns,
        scan_type: scan_all ? 'full_scan' : 'single_location',
        threshold_used: threshold,
        timestamp: new Date().toISOString()
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

async function analyzeLocation(
  supabase: any, 
  locationId: string, 
  locationName: string,
  threshold: number
): Promise<DiscriminationPattern[]> {
  const patterns: DiscriminationPattern[] = []

  // Get all safety scores for this location
  const { data: safetyScores } = await supabase
    .from('safety_scores')
    .select('*')
    .eq('location_id', locationId)

  if (!safetyScores || safetyScores.length < 2) {
    return patterns // Need at least 2 demographic groups to compare
  }

  // Find overall score
  const overallScore = safetyScores.find(s => s.demographic_type === 'overall')
  if (!overallScore) return patterns

  const overallAvg = Number(overallScore.avg_overall_score)

  // Pattern 1: Demographic Disparity
  const demographicScores = safetyScores.filter(s => s.demographic_type !== 'overall')
  
  for (const score of demographicScores) {
    const scoreAvg = Number(score.avg_overall_score)
    const disparity = Math.abs(scoreAvg - overallAvg)
    
    if (disparity >= threshold) {
      const affected = `${score.demographic_type}: ${score.demographic_value}`
      
      patterns.push({
        location_id: locationId,
        location_name: locationName,
        pattern_type: 'demographic_disparity',
        severity: disparity >= 3 ? 'high' : disparity >= 2 ? 'medium' : 'low',
        affected_demographics: [affected],
        evidence: {
          score_disparity: Number(disparity.toFixed(2)),
          review_count: score.review_count,
          specific_issues: [
            `${affected} rates this location ${scoreAvg.toFixed(1)}/5`,
            `Overall average is ${overallAvg.toFixed(1)}/5`,
            `Disparity of ${disparity.toFixed(1)} points`
          ]
        },
        recommendation: scoreAvg < overallAvg 
          ? `Investigate why ${affected} users feel less safe at this location`
          : `This location is particularly welcoming to ${affected} users`
      })
    }
  }

  // Pattern 2: Statistical Outliers (need review data)
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, user_profiles!inner(race_ethnicity, gender, lgbtq_status, religion)')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })

  if (reviews && reviews.length >= 5) {
    // Check for outlier reviews (1-2 stars when average is 4+, or vice versa)
    const avgRating = reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length
    
    const outliers = reviews.filter(r => 
      Math.abs(r.overall_rating - avgRating) >= 2.5
    )

    if (outliers.length > 0) {
      // Check if outliers share demographics
      const outlierDemographics = new Map<string, number>()
      
      outliers.forEach(review => {
        const demo = review.user_profiles
        if (demo.race_ethnicity?.length > 0) {
          demo.race_ethnicity.forEach((race: string) => {
            const key = `race: ${race}`
            outlierDemographics.set(key, (outlierDemographics.get(key) || 0) + 1)
          })
        }
        if (demo.gender) {
          const key = `gender: ${demo.gender}`
          outlierDemographics.set(key, (outlierDemographics.get(key) || 0) + 1)
        }
        if (demo.lgbtq_status) {
          const key = 'lgbtq: yes'
          outlierDemographics.set(key, (outlierDemographics.get(key) || 0) + 1)
        }
      })

      // If most outliers share a demographic, it's a pattern
      const commonDemographics = Array.from(outlierDemographics.entries())
        .filter(([_, count]) => count >= outliers.length * 0.6) // 60% threshold
        .map(([demo, _]) => demo)

      if (commonDemographics.length > 0) {
        patterns.push({
          location_id: locationId,
          location_name: locationName,
          pattern_type: 'outlier_reviews',
          severity: outliers.length >= 3 ? 'high' : 'medium',
          affected_demographics: commonDemographics,
          evidence: {
            review_count: outliers.length,
            specific_issues: [
              `${outliers.length} reviews significantly differ from average`,
              `Average rating: ${avgRating.toFixed(1)}, outlier average: ${(outliers.reduce((sum, r) => sum + r.overall_rating, 0) / outliers.length).toFixed(1)}`,
              `Affected groups: ${commonDemographics.join(', ')}`
            ]
          },
          recommendation: 'Review content suggests systematic issues affecting specific demographics'
        })
      }
    }
  }

  // Pattern 3: Sudden temporal changes
  if (reviews && reviews.length >= 10) {
    // Split reviews into old vs recent
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentReviews = reviews.filter(r => new Date(r.created_at) > thirtyDaysAgo)
    const olderReviews = reviews.filter(r => new Date(r.created_at) <= thirtyDaysAgo)
    
    if (recentReviews.length >= 3 && olderReviews.length >= 3) {
      const recentAvg = recentReviews.reduce((sum, r) => sum + r.overall_rating, 0) / recentReviews.length
      const olderAvg = olderReviews.reduce((sum, r) => sum + r.overall_rating, 0) / olderReviews.length
      const change = Math.abs(recentAvg - olderAvg)
      
      if (change >= 1.5) {
        patterns.push({
          location_id: locationId,
          location_name: locationName,
          pattern_type: 'sudden_change',
          severity: change >= 2.5 ? 'high' : 'medium',
          affected_demographics: ['all users'],
          evidence: {
            score_disparity: Number(change.toFixed(2)),
            time_period: 'last 30 days',
            specific_issues: [
              `Recent average: ${recentAvg.toFixed(1)}/5 (${recentReviews.length} reviews)`,
              `Previous average: ${olderAvg.toFixed(1)}/5 (${olderReviews.length} reviews)`,
              recentAvg < olderAvg ? 'Significant decline in ratings' : 'Significant improvement in ratings'
            ]
          },
          recommendation: recentAvg < olderAvg 
            ? 'Investigate recent changes that may have affected customer experience'
            : 'Recent improvements are working - maintain current practices'
        })
      }
    }
  }

  return patterns
}
// ============================================================
// SHARED RATE LIMITER
// Sliding window, Postgres-backed, per authenticated user.
// Used by all core Edge Functions.
// ============================================================

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { EDGE_CONFIG } from './config.ts';

export interface RateLimitResult {
    allowed: boolean;
    current_count: number;
    limit_max: number;
    retry_after_seconds?: number;
}

type FunctionName = keyof typeof EDGE_CONFIG.FUNCTION_RATE_LIMITS;

export async function checkRateLimit(
    supabase: SupabaseClient,
    userId: string,
    functionName: FunctionName,
): Promise<RateLimitResult> {
    const { limit, window_seconds } = EDGE_CONFIG.FUNCTION_RATE_LIMITS[functionName];

    const { data, error } = await supabase.rpc('check_and_record_rate_limit', {
        p_user_id: userId,
        p_function_name: functionName,
        p_limit: limit,
        p_window_seconds: window_seconds,
    });

    if (error) {
        // Fail open — log but do not block the user if the rate limit check itself errors
        console.error(`[rate-limiter] RPC error for ${functionName}:`, error.message);
        return { allowed: true, current_count: 0, limit_max: limit };
    }

    const result = data[0];

    return {
        allowed: result.allowed,
        current_count: result.current_count,
        limit_max: result.limit_max,
        retry_after_seconds: result.allowed ? undefined : window_seconds,
    };
}

export function rateLimitResponse(result: RateLimitResult): Response {
    return new Response(
        JSON.stringify({
            error: 'Too many requests',
            limit: result.limit_max,
            current_count: result.current_count,
            retry_after_seconds: result.retry_after_seconds,
        }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': String(result.limit_max),
                'X-RateLimit-Remaining': '0',
                'Retry-After': String(result.retry_after_seconds ?? 3600),
            },
        },
    );
}
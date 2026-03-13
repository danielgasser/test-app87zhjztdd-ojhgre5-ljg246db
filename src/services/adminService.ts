// src/services/adminService.ts

import { TesterMetadata } from '@/components/admin/AddTesterModal';
import { supabase } from './supabase';
import { Json } from '@/types/database.types';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// ─── Types ────────────

export interface AdminUser {
    id: string;
    username: string | null;
    full_name: string | null;
    role: string | null;
    subscription_tier: string | null;
    total_reviews: number | null;
    created_at: string | null;
    email?: string; // joined from auth.users via RPC
    is_protected?: boolean;
}
export interface AdminLocation {
    id: string;
    name: string;
    address: string;
    city: string;
    state_province: string;
    place_type: string;
    active: boolean | null;
    review_count: number | null;
    avg_overall_score: number | null;
    created_at: string | null;
}

export interface AdminReview {
    id: string;
    status: string;
    overall_rating: number;
    safety_rating: number | null;
    comment: string | null;
    created_at: string | null;
    user_id: string;
    location_id: string;
    location_name?: string; // joined
    username?: string | null; // joined
}

export interface BlockedWord {
    id: string;
    word: string;
    created_at: string | null;
    created_by: string | null;
}

export interface TestUser {
    id: string;
    email: string;
    name: string | null;
    status: string;
    metadata: Json | null;
    created_at: string | null;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export const adminFetchUsers = async (): Promise<AdminUser[]> => {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('id, username, full_name, role, subscription_tier, total_reviews, created_at')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
};

export const adminUpdateUserRole = async (
    userId: string,
    role: 'admin' | 'user'
): Promise<void> => {
    const { error } = await supabase
        .from('user_profiles')
        .update({ role })
        .eq('id', userId);

    if (error) throw error;
};

export const adminUpdateUserSubscription = async (
    userId: string,
    subscription_tier: 'free' | 'premium' | 'enterprise'
): Promise<void> => {
    const { error } = await supabase
        .from('user_profiles')
        .update({ subscription_tier })
        .eq('id', userId);

    if (error) throw error;
};

// ─── TEST Users ───────────────────────────────────────────────────────────────────

export const adminFetchTestUsers = async (): Promise<TestUser[]> => {
    const { data, error } = await supabase
        .from('test_users')
        .select('id, email, name, status, metadata, created_at')
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data.map((row) => ({
        ...row,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    }));
};

export const adminAddTestUser = async (params: {
    email: string;
    name?: string;
    metadata?: Record<string, any>;
}): Promise<TestUser> => {
    const { data, error } = await supabase
        .from('test_users')
        .insert({
            email: params.email.trim().toLowerCase(),
            name: params.name ?? null,
            metadata: params.metadata ?? null,
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

export const adminUpdateTestUserStatus = async (
    id: string,
    status: string
): Promise<void> => {
    const { error } = await supabase
        .from('test_users')
        .update({ status })
        .eq('id', id);

    if (error) throw new Error(error.message);
};

export const adminDeleteTestUser = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('test_users')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
};

// ─── Locations ────────────────────────────────────────────────────────────────

export const adminFetchLocations = async (): Promise<AdminLocation[]> => {
    const { data, error } = await supabase
        .from('locations')
        .select('id, name, address, city, state_province, place_type, active, review_count, avg_overall_score, created_at')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
};

export const adminToggleLocationActive = async (
    locationId: string,
    active: boolean
): Promise<void> => {
    const { error } = await supabase
        .from('locations')
        .update({ active })
        .eq('id', locationId);

    if (error) throw error;
};

export const adminDeleteLocation = async (locationId: string): Promise<void> => {
    const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', locationId);

    if (error) throw error;
};

// ─── Reviews ─────────────────────────────────────────────────────────────────

export const adminFetchReviews = async (): Promise<AdminReview[]> => {
    const { data, error } = await supabase
        .from('reviews')
        .select(`
      id, status, overall_rating, safety_rating, content, created_at, user_id, location_id,
      locations ( name )
    `)
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) throw error;

    // Fetch usernames separately
    const userIds = [...new Set((data ?? []).map((r: any) => r.user_id))];

    let usernameMap: Record<string, string | null> = {};
    if (userIds.length > 0) {
        const { data: profiles } = await supabase
            .from('user_profiles')
            .select('id, username')
            .in('id', userIds);

        (profiles ?? []).forEach((p: any) => {
            usernameMap[p.id] = p.username;
        });
    }

    return (data ?? []).map((r: any) => ({
        id: r.id,
        status: r.status,
        overall_rating: r.overall_rating,
        safety_rating: r.safety_rating,
        comment: r.content,
        created_at: r.created_at,
        user_id: r.user_id,
        location_id: r.location_id,
        location_name: r.locations?.name ?? null,
        username: usernameMap[r.user_id] ?? null,
    }));
};

export const adminUpdateReviewStatus = async (
    reviewId: string,
    status: 'active' | 'flagged' | 'hidden' | 'deleted'
): Promise<void> => {
    const { error } = await supabase
        .from('reviews')
        .update({ status })
        .eq('id', reviewId);

    if (error) throw new Error(error.message);
};

export const adminDeleteReview = async (reviewId: string): Promise<void> => {
    const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

    if (error) throw new Error(error.message);
};

export const adminDeleteUser = async (userId: string): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-user`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ user_id: userId }),
        }
    );

    const result = await response.json();
    if (!result.success) throw new Error(result.error);
};

// Content
export const adminFetchBlockedWords = async (): Promise<BlockedWord[]> => {
    const { data, error } = await supabase
        .from('blocked_words')
        .select('id, word, created_at, created_by')
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
};

export const adminAddBlockedWord = async (
    word: string,
    userId: string
): Promise<BlockedWord> => {
    const { data, error } = await supabase
        .from('blocked_words')
        .insert({ word: word.toLowerCase().trim(), created_by: userId })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return data;
};

export const adminDeleteBlockedWord = async (id: string): Promise<void> => {
    const { error } = await supabase
        .from('blocked_words')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
};

export const exportTestUsersCSV = async (testers: TestUser[]): Promise<void> => {
    const headers = ['name', 'email', 'status', 'platform', 'source', 'notes', 'created_at'];

    const rows = testers.map((t) => {
        const meta = (typeof t.metadata === 'string' ? JSON.parse(t.metadata) : t.metadata) as TesterMetadata | null;
        return [
            t.name ?? '',
            t.email,
            t.status,
            meta?.platform ?? '',
            meta?.source ?? '',
            meta?.notes ?? '',
            t.created_at ? new Date(t.created_at).toLocaleDateString() : '',
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const file = new File(Paths.cache, `test_users_${Date.now()}.csv`);
    file.create();
    file.write(csv);
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export Testers' });
};
import { supabase } from '@/services/supabase';
import { profaneWords, Profanity, ProfanityOptions } from '@2toad/profanity';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';
import { useState } from 'react';

const options = new ProfanityOptions();
options.wholeWord = true;

const profanity = new Profanity(options);

/**
 * Returns true if the text contains profane language.
 * Safe to call with null/undefined.
 */
export function isProfane(text: string | null | undefined): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    if (customBlockedWords.some(w => lower.includes(w))) return true;
    return profanity.exists(text);
}
/**
 * Throws a user-friendly error if the text contains profane language.
 * Use this at form submission boundaries.
 */
export function assertClean(text: string | null | undefined): void {
    if (isProfane(text)) {
        throw new Error(
            'Your text contains inappropriate language. Please revise before submitting.'
        );
    }
}

const BLOCKED_WORDS_LIST_KEY = '@safepath_cache:blocked_words:list';
const BLOCKED_WORDS_MODIFIED_KEY = '@safepath_cache:blocked_words:last_modified';

let customBlockedWords: string[] = [];

export async function loadBlockedWords(): Promise<void> {
    try {
        const [storedModified, storedList] = await Promise.all([
            AsyncStorage.getItem(BLOCKED_WORDS_MODIFIED_KEY),
            AsyncStorage.getItem(BLOCKED_WORDS_LIST_KEY),
        ]);

        // Check DB for latest modified timestamp
        const { data, error } = await supabase
            .from('blocked_words')
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            // DB unavailable — fall back to cache
            if (storedList) {
                customBlockedWords = JSON.parse(storedList);
            }
            return;
        }

        const dbModified: string | null = data?.created_at ?? null;
        if (dbModified && dbModified === storedModified && storedList) {
            // Cache is fresh
            customBlockedWords = JSON.parse(storedList);
            return;
        }

        // Fetch full list
        const { data: rows, error: fetchError } = await supabase
            .from('blocked_words')
            .select('word')
            .order('created_at', { ascending: false });

        if (fetchError) {
            if (storedList) customBlockedWords = JSON.parse(storedList);
            return;
        }

        const words = (rows ?? []).map((r: { word: string }) => r.word);
        customBlockedWords = words;

        await AsyncStorage.setItem(BLOCKED_WORDS_LIST_KEY, JSON.stringify(words));
        if (dbModified) {
            await AsyncStorage.setItem(BLOCKED_WORDS_MODIFIED_KEY, dbModified);
        }
    } catch (error) {
        logger.error('loadBlockedWords failed:', error);
    }
}

export function resetBlockedWordsCache(): void {
    customBlockedWords = [];
}

// TODO: post-launch — extend to support multiple languages for international users
// profaneWords.get('es'), profaneWords.get('fr'), etc.

export function getBuiltInWords(): string[] {
    return profaneWords.get('en') ?? [];
}
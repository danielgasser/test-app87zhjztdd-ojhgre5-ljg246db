import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { logger } from '@/utils/logger';

const QUEUE_KEY = 'offline_review_queue';

interface QueuedReview {
    reviewData: any;
    queuedAt: number;
    userId: string;
}

export const offlineQueue = {
    async add(reviewData: any, userId: string): Promise<void> {
        const queue = await this.getAll();
        queue.push({ reviewData, queuedAt: Date.now(), userId });
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        logger.info('Review queued for offline sync');
    },

    async getAll(): Promise<QueuedReview[]> {
        const data = await AsyncStorage.getItem(QUEUE_KEY);
        return data ? JSON.parse(data) : [];
    },

    async remove(queuedAt: number): Promise<void> {
        const queue = await this.getAll();
        const filtered = queue.filter(item => item.queuedAt !== queuedAt);
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    },

    async processAll(): Promise<number> {
        const queue = await this.getAll();
        let successCount = 0;

        for (const item of queue) {
            try {
                const { data, error } = await supabase
                    .from('reviews')
                    .insert({ ...item.reviewData, user_id: item.userId })
                    .select()
                    .single();

                if (!error) {
                    await this.remove(item.queuedAt);
                    successCount++;
                    logger.info('Queued review synced successfully');
                }
            } catch (error) {
                logger.error('Failed to sync queued review:', error);
            }
        }

        return successCount;
    },

    async count(): Promise<number> {
        const queue = await this.getAll();
        return queue.length;
    }
};
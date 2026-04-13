import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAppDispatch } from '../store/hooks';
import { addReviewToFeed } from '../store/locationsSlice';

export const useRealtimeReviews = (userId: string | null = null) => {
    const dispatch = useAppDispatch();

    useEffect(() => {
        // No subscription without a userId
        if (!userId) return;
        let channel: ReturnType<typeof supabase.channel> | null = null;

        const setupChannel = async () => {
            await supabase.realtime.setAuth();
            channel = supabase
                .channel(`navigation-alerts:${userId}`, { config: { private: true } })
                .on('broadcast', { event: 'dangerous-review' }, (payload) => {

                    const review = payload.payload;
                    if (!review) return;

                    dispatch(addReviewToFeed({
                        id: review.id,
                        user_id: review.user_id,
                        location_id: review.location_id,
                        title: review.title,
                        location_name: review.location_name,
                        location_address: review.location_address,
                        location_latitude: review.location_latitude,
                        location_longitude: review.location_longitude,
                        safety_rating: review.safety_rating,
                        overall_rating: review.overall_rating,
                        content: review.content,
                        created_at: review.created_at,
                    }));
                })
                .subscribe();
        };
        // Cleanup: unsubscribe when component unmounts
        setupChannel();

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [userId, dispatch]);
};
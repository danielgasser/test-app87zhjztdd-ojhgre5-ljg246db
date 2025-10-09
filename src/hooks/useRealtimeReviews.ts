import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAppDispatch } from '../store/hooks';
import { addReviewToFeed, fetchTrendingLocations } from '../store/locationsSlice';

export const useRealtimeReviews = () => {
    const dispatch = useAppDispatch();

    useEffect(() => {
        // Create a channel for reviews table
        const channel = supabase
            .channel('reviews-channel')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'reviews',
                    filter: 'status=eq.active'
                },
                async (payload) => {
                    // Fetch the location name for the new review
                    const { data: location } = await supabase
                        .from('locations')
                        .select('name, address')
                        .eq('id', payload.new.location_id)
                        .single();

                    // Format the review to match our expected structure
                    const formattedReview = {
                        id: payload.new.id,
                        user_id: payload.new.user_id,
                        location_id: payload.new.location_id,
                        title: payload.new.title,
                        location_name: location?.name || 'Unknown Location',
                        location_address: location?.address || '',
                        safety_rating: payload.new.safety_rating,
                        overall_rating: payload.new.overall_rating,
                        content: payload.new.content,
                        created_at: payload.new.created_at,
                    };

                    // Dispatch to Redux
                    dispatch(addReviewToFeed(formattedReview));

                    // Refetch trending locations since a new review affects trending
                    dispatch(fetchTrendingLocations({}));
                }
            )
            .subscribe();

        // Cleanup: unsubscribe when component unmounts
        return () => {
            supabase.removeChannel(channel);
        };
    }, [dispatch]);
};
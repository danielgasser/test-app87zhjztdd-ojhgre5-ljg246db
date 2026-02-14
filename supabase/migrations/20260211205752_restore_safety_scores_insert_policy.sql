-- Restore INSERT policy for safety_scores table
-- This is needed for the auto_calculate_safety_scores trigger
-- The trigger runs in the context of the user inserting the review

CREATE POLICY "Allow safety score calculation from triggers"
ON public.safety_scores
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also restore UPDATE policy for recalculations
CREATE POLICY "Allow safety score updates from triggers"
ON public.safety_scores
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
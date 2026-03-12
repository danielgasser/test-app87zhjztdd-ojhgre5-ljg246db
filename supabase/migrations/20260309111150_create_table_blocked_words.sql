CREATE TABLE public.blocked_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

-- Only admins can read/write
ALTER TABLE public.blocked_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage blocked words"
ON public.blocked_words
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);
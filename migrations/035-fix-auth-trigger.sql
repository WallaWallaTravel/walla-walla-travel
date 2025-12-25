-- ============================================================================
-- FIX AUTH TRIGGER FOR USER PROFILE CREATION
-- ============================================================================
-- Creates profiles automatically when users sign up
-- Handles both Auditor's Dream and Walla Walla Travel contexts
-- ============================================================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_operator_id UUID;
BEGIN
    -- Check if the user has operator metadata from signup
    -- For now, create a basic profile without operator link
    -- Operator linking happens separately via admin interface

    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail user creation
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON public.profiles TO supabase_auth_admin;

-- Comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile record when a new user signs up via Supabase Auth';

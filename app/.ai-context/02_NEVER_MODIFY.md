# NEVER MODIFY THESE FILES

These files are core infrastructure. Modifying them will break the application.

## Protected Files
- /lib/supabase.ts - Supabase client configuration
- /app/layout.tsx - After initial setup
- /.env.local - Environment variables
- /middleware.ts - Auth middleware (once created)
- /package.json - Dependencies (only add, never remove)
- /.ai-context/* - These instruction files

## Protected Directories
- /.next/ - Build output
- /node_modules/ - Dependencies
- /.git/ - Version control

## If Changes Needed
If you think these need changes:
1. STOP
2. Explain why to the user
3. Wait for explicit approval
4. Create backup first
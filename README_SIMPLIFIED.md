# PromptHub — simplified profile version

The marketplace, products, buying/selling, seller dashboard/profile, Binance/payment UI, and admin marketplace pages have been removed. The site name and main visual identity remain PromptHub.

## Important: run the database migration
In your existing Supabase project, open SQL Editor and run:
`supabase/profile-migration.sql`

The current profile page uses your existing `profiles` table and the existing `product-media` storage bucket for compatibility with your live project. The bucket name is only an internal storage name; no product/store feature is shown in the site.

## Deploy
Replace the files in your GitHub repository with the contents of this ZIP and push the commit. Your existing GitHub/Vercel setup should then redeploy automatically.

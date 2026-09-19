# PromptHub

A small static prompt store (plain HTML/JS) on top of Supabase. Customers sign up, order a prompt,
submit their payment reference, and the prompt unlocks once the admin approves the payment.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Store front, loads products from Supabase |
| `product.html?id=N` | Product page. Shows the prompt only to customers with a paid order |
| `account.html` | Sign up / login / password reset, orders + payment submission, unlocked prompts, support chat |
| `admin.html` | Admin panel: products, payments, customers, chats |
| `legal.html` | Terms & Privacy **template** (edit before going live) |
| `assets/common.js` | Shared config + helpers. **Edit `CONFIG` here** |
| `supabase/schema.sql` | Tables, Row Level Security, server-side functions |

## Setup

1. **Database:** Supabase Dashboard -> SQL Editor -> paste and run `supabase/schema.sql`.
   It is written for a fresh project. If your project already has tables named `profiles`, `products`,
   `orders`, `payment_submissions`, `conversations` or `messages`, compare them first.
2. **Config:** open `assets/common.js` and set your payment instructions and support email.
   Only the *publishable* key belongs in front-end code. Never use the `service_role` key here.
3. **Auth settings** (Supabase -> Authentication): add your site URL under *URL Configuration*
   (needed for password-reset links) and decide whether email confirmation is required.
4. **First admin:** sign up on `account.html`, then run this once in the SQL Editor:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
   Roles cannot be changed from the browser, only from the SQL Editor.
5. **Products:** open `admin.html` -> Products. The four starter products are inactive and contain a
   placeholder prompt: edit each one, paste the real prompt, tick *Active*.

## How the paywall works

The prompt text is stored in `product_prompts`, which no browser role can read. It is only returned by
`get_my_prompt()` / `get_my_prompts()` to the admin or to a customer with a `paid` order. Prices are
read from the database on the server when an order is created, and only `review_payment()` (admin only)
can mark an order paid. **Do not put paid prompts in the HTML/JS files or in a public Git repo.**

## Before going live

- Pin the `@supabase/supabase-js` version in the `<script>` tags (currently `@2`) and add an
  `integrity` hash, or host the file yourself.
- Fill in and review `legal.html`.
- Test the full flow with a second account: order -> submit payment -> approve in admin -> prompt unlocks.

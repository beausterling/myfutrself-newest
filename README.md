# Future Self App

A goal-setting and motivation application that helps users visualize their future selves through AI-generated photos and personalized coaching.

## Features

- **Photo Capture & AI Generation**: Take or upload current photos and generate AI-powered future self images
- **Goal Setting**: Create and track personal goals across different categories
- **Voice Coaching**: Personalized voice coaching with multiple voice options
- **Progress Tracking**: Monitor your journey towards your goals
- **Secure Authentication**: User authentication powered by Clerk

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Clerk account

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Supabase Edge Functions

This application uses Supabase Edge Functions for AI photo processing, file uploads, and user management. The functions are located in the `supabase/functions/` directory:

- `clerk-webhook`: Handles user creation and deletion events from Clerk
- `ageify-user`: Generates future self photos using OpenAI's image editing API
- `upload-current-photo`: Handles photo uploads and storage

### Deploying Edge Functions

**Important**: Edge Functions need to be deployed to your Supabase project to work properly. Since this is a development environment, the Edge Functions are not automatically deployed.

To deploy the Edge Functions to your Supabase project:

1. Install the Supabase CLI: https://supabase.com/docs/guides/cli
2. Login to your Supabase account:
   ```bash
   supabase login
   ```
3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
4. Deploy the functions:
   ```bash
   supabase functions deploy clerk-webhook
   supabase functions deploy ageify-user
   supabase functions deploy upload-current-photo
   ```

### Clerk Webhook Setup

The `clerk-webhook` function handles user lifecycle events from Clerk. To set it up:

1. **Deploy the function** (see above)

2. **Get your webhook endpoint URL**:
   ```
   https://your-project-ref.supabase.co/functions/v1/clerk-webhook
   ```

3. **Configure the webhook in Clerk Dashboard**:
   - Go to your Clerk Dashboard → Webhooks
   - Click "Add Endpoint"
   - Enter your webhook URL: `https://your-project-ref.supabase.co/functions/v1/clerk-webhook`
   - Select events: `user.created`, `user.deleted`, `user.updated`
   - Copy the webhook secret (you'll need this for step 4)

4. **Set environment variables in Supabase**:
   - Go to your Supabase Dashboard → Settings → Edge Functions
   - Add the following environment variable:
     - `CLERK_WEBHOOK_SECRET`: The webhook secret from step 3

5. **Test the webhook**:
   - Create a test user in your application
   - Check the Supabase logs to ensure the webhook is working
   - Verify that a new row appears in the `user_profiles` table

### Edge Function Environment Variables

The Edge Functions require the following environment variables to be set in your Supabase project:

1. Go to your Supabase Dashboard
2. Navigate to Settings > Edge Functions
3. Add the following environment variables:
   - `CLERK_WEBHOOK_SECRET`: Your Clerk webhook secret for user lifecycle events
   - `OPENAI_API_KEY`: Your OpenAI API key for image generation
   - `SUPABASE_URL`: Your Supabase project URL (usually auto-populated)
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

### Fallback Behavior

If the Edge Functions are not deployed or not available:

- **clerk-webhook**: New user accounts won't create user profiles automatically (authentication will fail)
- **ageify-user**: AI photo generation will show user-friendly error messages
- **upload-current-photo**: Photos will be saved directly to the database without storage optimization

The application will:
- Save photos directly to the database (without storage optimization)
- Show user-friendly error messages for AI photo generation
- Allow users to continue with the onboarding process
- Display clear information about missing functionality

**Important**: The `clerk-webhook` function is critical for user authentication to work properly. Without it, new users cannot complete the signup process.

## Database Schema

The application uses the following main tables:

- `user_profiles`: User profile information and photos
- `categories`: Goal categories (default and custom)
- `goals`: User goals linked to categories
- `motivations`: User motivations and obstacles for goals
- `user_selected_categories`: User's selected goal categories
- `waitlist`: Email waitlist for early access

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Supabase (Database, Authentication, Storage, Edge Functions)
- **Authentication**: Clerk
- **AI Integration**: OpenAI GPT-4 Vision and Image Generation APIs
- **Voice**: ElevenLabs API
- **Deployment**: Netlify (frontend), Supabase (backend)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary and confidential.
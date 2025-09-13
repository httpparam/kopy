# KOPY

A secure text sharing application that encrypts content client-side and stores it in Supabase with automatic expiration after 10 minutes.

## Features

- 🔐 **End-to-End Encryption**: Content is encrypted client-side before storage
- ⏰ **Auto-Expiration**: Content automatically deletes after 10 minutes
- 🔗 **Secure Sharing**: Share via encrypted links with embedded decryption keys
- 🎨 **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS
- 🚀 **Fast & Secure**: Built with TypeScript and Supabase

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor in your Supabase dashboard
3. Run the SQL commands from `supabase-schema.sql` to create the database schema
4. Get your project URL and anon key from Settings > API

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## How It Works

1. **Encryption**: When you paste content, it's encrypted using AES encryption with a randomly generated key
2. **Storage**: The encrypted content is stored in Supabase with an expiration timestamp
3. **Sharing**: A shareable URL is generated that includes the decryption key in the hash fragment
4. **Viewing**: When someone visits the link, the content is decrypted client-side and displayed
5. **Expiration**: Content automatically expires after 10 minutes and is cleaned up

## Security Features

- **Client-side encryption**: Content is never stored in plain text
- **Key separation**: Decryption keys are only in the URL hash (not sent to server)
- **Automatic cleanup**: Expired content is automatically deleted
- **One-time viewing**: Each paste can only be viewed while it's valid

## Database Schema

The application uses a single `pastes` table with the following structure:

- `id`: Unique identifier for the paste
- `encrypted_content`: AES-encrypted content
- `created_at`: Timestamp when the paste was created
- `expires_at`: Timestamp when the paste expires (10 minutes after creation)

## API Endpoints

- `GET /`: Main application interface
- `GET /view/[id]`: View a shared paste (requires decryption key in URL hash)

## Technologies Used

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Supabase**: Backend-as-a-Service for database
- **CryptoJS**: Client-side encryption
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Beautiful icons

## License

MIT License - feel free to use this project for your own needs!

# Flowfoundry - Project Management Application

A modern, full-featured project management application built with Next.js, Supabase, and TypeScript.

## Features

- **User Authentication** - Secure sign-up, login, and password recovery
- **Workspaces** - Create and manage multiple workspaces for different teams
- **Projects** - Organize work into projects within workspaces
- **Task Management** - Create, assign, and track tasks with priorities and due dates
- **Real-time Updates** - Live updates using Supabase real-time subscriptions
- **Notifications** - In-app notification system with customizable preferences
- **User Profiles** - Customizable profiles with avatar upload
- **Responsive Design** - Mobile-friendly interface that works on all devices
- **Dark/Light Mode** - Theme support with system preference detection

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Form Validation**: Zod + React Hook Form
- **Icons**: Lucide React
- **Notifications**: Sonner

## Project Structure

```
Project-Management-App/
├── app/                          # Next.js app directory
│   ├── (pages)/                  # Route groups
│   │   ├── (auth)/              # Authentication pages
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── forgot-password/
│   │   └── profile/             # User profile page
│   ├── actions/                 # Server actions
│   ├── api/                     # API routes
│   ├── context/                 # React context providers
│   ├── providers/               # App-level providers
│   ├── projects/                # Projects pages
│   ├── tasks/                   # Tasks pages
│   ├── workspaces/              # Workspaces pages
│   └── layout.tsx               # Root layout
├── components/                   # React components
│   ├── chat/                    # Chat/messaging components
│   ├── notifications/           # Notification components
│   ├── profile/                 # Profile-related components
│   ├── projects/                # Project components
│   ├── providers/               # Component providers
│   ├── ui/                      # shadcn/ui components
│   └── workspaces/              # Workspace components
├── hooks/                       # Custom React hooks
├── lib/                         # Utility functions
│   ├── notifications/           # Notification utilities
│   ├── clipboard.ts             # Clipboard helper
│   ├── time.ts                  # Time formatting utilities
│   ├── useLocalStorage.ts       # Local storage hook
│   └── utils.ts                 # General utilities
├── types/                       # TypeScript type definitions
│   ├── profile.ts               # Profile-related types
│   └── workspaces.ts            # Workspace types
├── utils/                       # Utility functions
│   └── supabase/                # Supabase client utilities
└── public/                      # Static assets

```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Project-Management-App
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory with the following variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The application uses the following main tables in Supabase:

- **profiles** - User profile information
- **workspaces** - Workspace data
- **workspace_members** - Workspace membership
- **projects** - Project information
- **tasks** - Task data
- **notifications** - User notifications
- **messages** - Chat messages
- **threads** - Message threads

## Key Features Explained

### Authentication
- Uses Supabase Auth for secure authentication
- Supports email/password authentication
- Password recovery via email

### Workspaces
- Multi-tenant architecture
- Role-based access control
- Invite system for adding members

### Projects
- Nested under workspaces
- Support for archiving
- Full CRUD operations

### Tasks
- Assignable to workspace members
- Priority levels (P1-P5)
- Status tracking (todo, in_progress, done)
- Due date management
- Filtering and grouping options

### Notifications
- Real-time notification system
- Customizable notification preferences
- Mark as read/unread functionality

### Profile Management
- Avatar upload to Supabase Storage
- Customizable display name and job title
- Theme preferences
- Notification settings

## Development

### Code Style
- TypeScript for type safety
- ESLint for code linting
- Consistent component structure
- Meaningful comments for complex logic

### Component Organization
- Reusable UI components in `components/ui/`
- Feature-specific components in dedicated folders
- Server components by default, client components marked with `"use client"`

### State Management
- React Context for global state (auth, theme)
- Local state with useState/useReducer
- Server state with React Query (via QueryProvider)
- Local storage for user preferences

## Deployment

The application can be deployed to Vercel, Netlify, or any platform that supports Next.js:

1. Build the application:
```bash
npm run build
```

2. Set environment variables in your deployment platform

3. Deploy using your platform's CLI or dashboard

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is private and proprietary.

## Support

For support, please contact the development team.

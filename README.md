# Flowfoundry - Project Management Application

A modern, full-featured project management application built with Next.js 16, Supabase, and TypeScript. Features real-time collaboration, drag-and-drop task management, and a beautiful theme-aware interface.

## ✨ Features

### Core Functionality
- **User Authentication** - Secure sign-up, login, and password recovery with Supabase Auth
- **Workspaces** - Multi-tenant architecture with role-based access control
- **Projects** - Organize work into projects with full CRUD operations
- **Kanban Board** - Drag-and-drop task management with status columns (To Do, In Progress, Done)
- **Task Management** - Create, assign, and track tasks with:
  - Priority levels (P1-P5) with color coding
  - Due date tracking with smart categorization (Overdue, Today, Next Week)
  - Assignee management
  - Real-time status updates
- **Real-time Collaboration** - Live updates using Supabase real-time subscriptions
- **Messaging System** - In-app chat with threads and real-time messaging
- **Notifications** - Comprehensive notification system with:
  - Real-time in-app notifications
  - Notification bell with unread count
  - Mark as read/unread functionality
  - Clear all notifications
  - Click-outside to close dropdown
- **User Profiles** - Customizable profiles with:
  - Avatar upload to Supabase Storage
  - Display name and job title
  - Theme preferences (Light/Dark/System)
- **People Management** - View workspace members with their roles and positions

### UI/UX
- **Responsive Design** - Mobile-first interface that works on all devices
- **Dark/Light Mode** - Full theme support with:
  - System preference detection
  - Instant theme switching
  - Consistent theme variables throughout
- **Modern UI** - Built with shadcn/ui components and Tailwind CSS
- **Smooth Animations** - Polished transitions and interactions
- **Accessible** - WCAG AA compliant with proper contrast ratios

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Form Handling**: React Hook Form + Zod validation
- **State Management**: 
  - React Context (Auth, Theme)
  - TanStack Query (Server state)
  - Local Storage (User preferences)
- **Icons**: Lucide React + React Icons
- **Drag & Drop**: @dnd-kit/core
- **Notifications**: Sonner (Toast notifications)
- **Theme**: next-themes

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Row Level Security (RLS)
- **Storage**: Supabase Storage (Avatar uploads)
- **Real-time**: Supabase Real-time subscriptions
- **API**: Next.js API Routes (App Router)

### Development
- **Type Safety**: TypeScript with strict mode
- **Code Quality**: ESLint
- **Package Manager**: npm

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

## 🔑 Key Features Explained

### Authentication & Security
- **Supabase Auth** - Enterprise-grade authentication
- **Email/Password** - Secure credential-based login
- **Password Recovery** - Email-based password reset flow
- **Row Level Security (RLS)** - Database-level access control
- **Protected Routes** - Middleware-based route protection
- **Session Management** - Automatic session refresh and validation

### Workspaces
- **Multi-tenant Architecture** - Isolated data per workspace
- **Role-based Access Control** - Owner, Admin, Member roles
- **Invite System** - Email-based workspace invitations
- **Member Management** - Add, remove, and manage team members
- **Real-time Updates** - Live workspace data synchronization

### Projects
- **Nested Structure** - Projects organized within workspaces
- **Full CRUD Operations** - Create, Read, Update, Delete
- **Project Details** - Name, description, and metadata
- **Access Control** - Workspace-level permissions

### Kanban Task Board
- **Drag & Drop** - Intuitive task movement between columns
- **Three Status Columns** - To Do, In Progress, Done
- **Visual Feedback** - Hover states and drop indicators
- **Assignee-only Drag** - Only assigned users can move tasks
- **Real-time Sync** - Instant updates across all users
- **Optimistic Updates** - Immediate UI feedback

### Task Management
- **Quick Add** - Fast task creation with inline form
- **Assignee Selection** - Searchable user dropdown
- **Priority Levels** - P1 (High) to P5 (Low) with color coding
- **Due Dates** - Date picker with smart categorization:
  - Overdue (red badge)
  - Due Today (amber badge)
  - Next Week (blue badge)
  - No Due Date (neutral badge)
- **Inline Editing** - Edit tasks directly in the board
- **Filtering** - Filter by due date category
- **Permission Control** - Only task creator can edit/delete

### Notifications
- **Real-time System** - Supabase-powered notifications
- **Notification Bell** - Unread count badge in navbar
- **Dropdown Panel** - Quick access to recent notifications
- **Notification Types**:
  - Task assignments
  - Task updates
  - Workspace invites
  - Message mentions
- **Actions**:
  - Mark individual as read/unread
  - Mark all as read
  - Clear all notifications
  - Click-outside to close
- **Profile Page** - Full notification history with management

### Messaging System
- **Thread-based Chat** - Organized conversations
- **Real-time Messages** - Instant message delivery
- **Message Panel** - Dedicated chat interface
- **Thread List** - View all conversations
- **Unread Indicators** - Visual unread message counts

### Profile Management
- **Avatar Upload** - Image upload to Supabase Storage (2MB limit)
- **Profile Fields**:
  - Full name
  - Job title
  - Display name
  - Email (read-only)
- **Theme Preferences** - Light/Dark/System mode selection
- **Instant Updates** - Changes apply immediately
- **Real-time Sync** - Profile updates across all sessions

### Theme System
- **Three Modes** - Light, Dark, System
- **Instant Switching** - No page reload required
- **Persistent** - Saved to local storage
- **Consistent Variables** - Theme tokens throughout app
- **WCAG AA Compliant** - Proper contrast ratios
- **Smooth Transitions** - Animated theme changes

## 🔔 Notification System Architecture

The application uses a **custom-built notification system** powered by Supabase (not Novu or third-party services):

### Database Schema
```sql
notifications (
  id: uuid
  user_id: uuid (foreign key to users)
  type: text (task_assigned, task_update, workspace_invite, message_mention)
  title: text
  body: text
  data: jsonb (additional metadata)
  is_read: boolean
  created_at: timestamp
  workspace_id: uuid (optional)
  ref_id: uuid (optional reference to related entity)
)
```

### Real-time Subscriptions
- Uses Supabase Real-time to push notifications instantly
- Client subscribes to `notifications` table filtered by `user_id`
- New notifications appear immediately without polling

### Components
- **NotificationBell** - Navbar dropdown with unread count
- **NotificationsList** - Full notification history in profile
- **Toast Notifications** - Sonner for temporary feedback messages

### API Routes
- `POST /api/notifications` - Create notification
- `GET /api/notifications` - Fetch user notifications
- `PATCH /api/notifications` - Mark as read/unread

### Utilities
- `utils/supabase/notifications.ts` - CRUD operations
- `lib/notifications/subscribe.ts` - Real-time subscription logic

## 💻 Development

### Code Style
- **TypeScript** - Strict mode enabled for type safety
- **ESLint** - Code linting with Next.js config
- **Consistent Structure** - Organized component patterns
- **Meaningful Comments** - Clear documentation for complex logic
- **No Console Logs** - Production code is clean (debug logs removed)

### Component Organization
- **Reusable UI** - `components/ui/` (shadcn/ui components)
- **Feature Components** - Dedicated folders per feature
- **Server Components** - Default for better performance
- **Client Components** - Marked with `"use client"` directive
- **Colocation** - Related files grouped together

### State Management
- **React Context** - Global state (auth, theme)
- **TanStack Query** - Server state with caching
- **Local State** - useState/useReducer for component state
- **Local Storage** - User preferences persistence
- **Optimistic Updates** - Immediate UI feedback

### Theme System
- **CSS Variables** - Theme tokens in `globals.css`
- **Tailwind Classes** - `text-foreground`, `bg-background`, etc.
- **next-themes** - Theme provider with system detection
- **No Hardcoded Colors** - All colors use theme variables
- **Dark Mode First** - Designed for both modes from start

## Deployment

The application can be deployed to Vercel, Netlify, or any platform that supports Next.js:

1. Build the application:
```bash
npm run build
```

2. Set environment variables in your deployment platform

3. Deploy using your platform's CLI or dashboard


## 📄 License

**Copyright © 2025 Flowfoundry. All Rights Reserved.**

This project is proprietary software. Unauthorized copying, distribution, modification, or use is strictly prohibited. See the [LICENSE](LICENSE) file for full terms and conditions.

### What This Means:
- ❌ **No Distribution** - Cannot share or publish this code
- ❌ **No Modification** - Cannot create derivative works
- ❌ **No Commercial Use** - Cannot use for commercial purposes
- ❌ **No Public Hosting** - Cannot deploy publicly without permission
- ✅ **Personal Use Only** - For development and testing purposes

For licensing inquiries or permissions, please contact the copyright holder.


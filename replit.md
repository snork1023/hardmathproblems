# Nothing Suspicious At All Just Homework Application

## Overview

This is a full-stack HTTP/HTTPS proxy server application built with React frontend and Express backend. The application allows users to make proxy requests through a web interface, track request statistics, and manage server operations. It features a modern UI built with shadcn/ui components and real-time data updates for monitoring proxy activity.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod schema validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints for proxy operations and statistics
- **Request Logging**: Custom middleware for API request/response logging
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Development**: Hot reload with Vite integration in development mode

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Neon Database serverless PostgreSQL connection
- **In-Memory Fallback**: MemStorage class for development/testing without database
- **Data Models**: Proxy requests and server statistics tracking

### Authentication and Authorization
- **Session Management**: Express sessions with PostgreSQL session store (connect-pg-simple)
- **Security**: No explicit authentication system implemented - appears to be designed for internal/development use

### External Dependencies
- **Database**: Neon Database (serverless PostgreSQL)
- **UI Components**: Extensive use of Radix UI primitives for accessibility
- **Icons**: Lucide React for consistent iconography
- **Date Handling**: date-fns for date formatting and manipulation
- **HTTP Proxy**: Built-in Node.js capabilities with custom middleware
- **Development Tools**: Replit-specific plugins for development environment integration

### Key Architectural Decisions

**Monorepo Structure**: The application uses a monorepo approach with shared schema definitions between frontend and backend, ensuring type safety across the full stack.

**Type Safety**: Heavy emphasis on TypeScript throughout the stack with Zod schemas for runtime validation and Drizzle for compile-time database type safety.

**Real-time Updates**: Uses React Query with polling intervals to provide real-time updates of proxy statistics and request logs without WebSocket complexity.

**Component Architecture**: Follows shadcn/ui patterns with compound component design and proper separation of concerns between UI components and business logic.

**Database Strategy**: Flexible storage implementation allowing for both PostgreSQL production usage and in-memory development/testing scenarios.

**Build Strategy**: Separate build processes for frontend (Vite) and backend (esbuild) with proper static file serving in production.
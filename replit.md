# Nothing Suspicious At All Just Homework Application

## Overview

This is a full-stack web application disguised as "Nothing Suspicious At All Just Homework" - an Advanced Algebra and Calculus study helper that secretly functions as an HTTP/HTTPS proxy server. The application allows users to access websites through a proxy interface while maintaining the appearance of a homework application. It features a comprehensive settings panel with panic button functionality, dark theme support, and detailed system monitoring.

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

## Recent Changes (January 2025)

**Proxy Functionality Enhancement**: Fixed proxy server implementation by replacing middleware approach with direct HTTP fetch requests, improving reliability and compatibility.

**Steganographic Interface**: Transformed the application interface to appear as an "Advanced Algebra and Calculus" homework helper while maintaining full proxy functionality underneath.

**Panic Button Feature**: Added emergency redirect functionality in settings panel that allows users to quickly navigate to a configurable URL (default: Google) for situations requiring immediate appearance of legitimate browsing.

**Comprehensive Settings Panel**: Expanded settings with multiple privacy and usability options including:
- Dark/Light theme toggle (defaults to light)
- Auto-refresh for statistics
- Notification system
- Request logging toggle
- Compact mode interface
- IP masking capabilities
- Editable panic button URL

**Enhanced Status Display**: Redesigned status card to show study-themed information including "Problems Solved" (proxy requests), "Study Time" (uptime), "Active Sessions" (connections), and privacy indicators.

**Complete Dark Theme**: Implemented full dark mode support across all components, pages, and UI elements with proper contrast and accessibility.
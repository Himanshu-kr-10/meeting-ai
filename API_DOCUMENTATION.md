# Meeting AI - API Documentation

## Overview

Meeting AI is a Next.js application that allows users to create and manage AI agents for meetings. The application features a modular architecture with type-safe APIs using tRPC, modern UI components, and comprehensive authentication.

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth
- **API**: tRPC for type-safe APIs
- **UI**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # Reusable UI components
├── db/                  # Database configuration and schema
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
├── modules/             # Feature modules
│   ├── agents/          # Agent management
│   ├── auth/            # Authentication
│   ├── dashboard/       # Dashboard interface
│   └── home/            # Landing page
├── trpc/                # tRPC configuration and routers
└── constants.ts         # Application constants
```

## Core Constants

### Pagination Constants
**File**: `src/constants.ts`

```typescript
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
export const MIN_PAGE_SIZE = 1;
```

**Usage**:
```typescript
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@/constants';

// Use in pagination
const queryOptions = {
  page: DEFAULT_PAGE,
  pageSize: DEFAULT_PAGE_SIZE
};
```

## Database Schema

### User Table
**File**: `src/db/schema.ts`

```typescript
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

### Agents Table
```typescript
export const agents = pgTable('agents', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  name: text('name').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  instructions: text('instructions').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

### Session, Account, and Verification Tables
- **session**: User session management
- **account**: OAuth account linking
- **verification**: Email verification tokens

## Authentication

### Auth Configuration
**File**: `src/lib/auth.ts`

```typescript
export const auth = betterAuth({
  emailAndPassword: { enabled: true },
  database: drizzleAdapter(db, { provider: "pg", schema }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
})
```

**Usage**:
```typescript
// Server-side authentication check
const session = await auth.api.getSession({ headers });
```

### Auth Client
**File**: `src/lib/auth-client.ts`

```typescript
import { createAuthClient } from "better-auth/client";
export const authClient = createAuthClient();
```

## tRPC API

### tRPC Configuration
**File**: `src/trpc/init.ts`

#### Base Procedures
```typescript
export const baseProcedure = t.procedure;
export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
  }
  return next({ ctx: { ...ctx, auth: session } });
});
```

#### Router Creation
```typescript
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
```

### Agents API
**File**: `src/modules/agents/server/procedures.ts`

#### Create Agent
```typescript
create: protectedProcedure
  .input(createAgentSchema)
  .mutation(async ({ input, ctx }) => {
    const [createdAgent] = await db
      .insert(agents)
      .values({ ...input, userId: ctx.auth.user.id })
      .returning();
    return createdAgent;
  })
```

**Usage**:
```typescript
const trpc = useTRPC();
const createAgent = trpc.agents.create.useMutation({
  onSuccess: (agent) => {
    console.log('Agent created:', agent);
  }
});

// Create an agent
createAgent.mutate({
  name: "Customer Support Agent",
  instructions: "Provide helpful customer support responses"
});
```

#### Get Many Agents
```typescript
getMany: protectedProcedure
  .input(z.object({
    page: z.number().default(DEFAULT_PAGE),
    pageSize: z.number().min(MIN_PAGE_SIZE).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    search: z.string().nullish()
  }))
  .query(async ({ ctx, input }) => {
    // Returns paginated agents with total count
  })
```

**Usage**:
```typescript
const { data } = trpc.agents.getMany.useQuery({
  page: 1,
  pageSize: 10,
  search: "customer"
});
```

#### Get Single Agent
```typescript
getOne: protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ input, ctx }) => {
    // Returns single agent with meeting count
  })
```

#### Update Agent
```typescript
update: protectedProcedure
  .input(updateAgentSchema)
  .mutation(async ({ ctx, input }) => {
    // Updates agent and returns updated record
  })
```

#### Remove Agent
```typescript
remove: protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // Deletes agent and returns deleted record
  })
```

## Validation Schemas

### Agent Schemas
**File**: `src/modules/agents/schema.ts`

```typescript
export const createAgentSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  instructions: z.string().min(1, { message: "Instructions are required" }),
});

export const updateAgentSchema = createAgentSchema.extend({
  id: z.string().min(1, { message: "Id is required" }),
});
```

**Usage**:
```typescript
import { createAgentSchema } from '@/modules/agents/schema';

// Validate input
const result = createAgentSchema.safeParse({
  name: "My Agent",
  instructions: "Follow these instructions..."
});

if (result.success) {
  // Data is valid
  const validData = result.data;
}
```

## Custom Hooks

### useIsMobile
**File**: `src/hooks/use-mobile.ts`

```typescript
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);
  
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
```

**Usage**:
```typescript
import { useIsMobile } from '@/hooks/use-mobile';

function MyComponent() {
  const isMobile = useIsMobile();
  
  return (
    <div>
      {isMobile ? 'Mobile View' : 'Desktop View'}
    </div>
  );
}
```

### useConfirm
**File**: `src/hooks/use-confirm.tsx`

```typescript
export const useConfirm = (
  title: string,
  description: string
): [() => JSX.Element, () => Promise<unknown>] => {
  // Returns [ConfirmationDialog, confirm function]
}
```

**Usage**:
```typescript
import { useConfirm } from '@/hooks/use-confirm';

function MyComponent() {
  const [ConfirmationDialog, confirm] = useConfirm(
    "Delete Agent",
    "Are you sure you want to delete this agent?"
  );

  const handleDelete = async () => {
    const confirmed = await confirm();
    if (confirmed) {
      // Proceed with deletion
    }
  };

  return (
    <div>
      <button onClick={handleDelete}>Delete</button>
      <ConfirmationDialog />
    </div>
  );
}
```

### useAgentsFilters
**File**: `src/modules/agents/hooks/use-agents-filters.ts`

```typescript
export const useAgentsFilters = () => {
  return useQueryStates({
    search: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
    page: parseAsInteger.withDefault(DEFAULT_PAGE).withOptions({ clearOnDefault: true })
  });
}
```

**Usage**:
```typescript
import { useAgentsFilters } from '@/modules/agents/hooks/use-agents-filters';

function AgentsPage() {
  const [filters, setFilters] = useAgentsFilters();

  return (
    <div>
      <input
        value={filters.search}
        onChange={(e) => setFilters({ search: e.target.value })}
        placeholder="Search agents..."
      />
      <div>Page: {filters.page}</div>
    </div>
  );
}
```

## UI Components

### Core Components

#### Button
**File**: `src/components/ui/button.tsx`

```typescript
interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  // Implementation
}
```

**Usage**:
```typescript
import { Button } from '@/components/ui/button';

function MyForm() {
  return (
    <div>
      <Button variant="default" size="lg">
        Primary Button
      </Button>
      <Button variant="outline" size="sm">
        Secondary Button
      </Button>
      <Button variant="destructive">
        Delete
      </Button>
    </div>
  );
}
```

#### Input
**File**: `src/components/ui/input.tsx`

```typescript
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  // Implementation with proper styling and accessibility
}
```

**Usage**:
```typescript
import { Input } from '@/components/ui/input';

function LoginForm() {
  return (
    <form>
      <Input type="email" placeholder="Email" />
      <Input type="password" placeholder="Password" />
    </form>
  );
}
```

#### Form Components
**File**: `src/components/ui/form.tsx`

```typescript
// Form components for React Hook Form integration
export const Form = FormProvider;
export const FormField = /* Controller wrapper */;
export const FormItem = /* Form item container */;
export const FormLabel = /* Form label */;
export const FormControl = /* Form control wrapper */;
export const FormDescription = /* Form description */;
export const FormMessage = /* Form error message */;
```

**Usage**:
```typescript
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

function MyForm() {
  const form = useForm();

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input placeholder="Enter your email" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}
```

### Custom Components

#### ResponsiveDialog
**File**: `src/components/responsive-dialog.tsx`

```typescript
interface ResponsiveDialogProps {
  title: string;
  description: string;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ResponsiveDialog = ({ title, description, children, open, onOpenChange }: ResponsiveDialogProps) => {
  const isMobile = useIsMobile();
  // Renders as Dialog on desktop, Drawer on mobile
}
```

**Usage**:
```typescript
import { ResponsiveDialog } from '@/components/responsive-dialog';

function MyComponent() {
  const [open, setOpen] = useState(false);

  return (
    <ResponsiveDialog
      title="Edit Agent"
      description="Update your agent's settings"
      open={open}
      onOpenChange={setOpen}
    >
      <div>Dialog content here</div>
    </ResponsiveDialog>
  );
}
```

#### GeneratedAvatar
**File**: `src/components/generated-avatar.tsx`

```typescript
interface GeneratedAvatarProps {
  seed: string;
  className?: string;
  variant?: 'botttsNeutral' | 'initials';
}

export const GeneratedAvatar = ({ seed, className, variant }: GeneratedAvatarProps) => {
  // Generates avatar using DiceBear
}
```

**Usage**:
```typescript
import { GeneratedAvatar } from '@/components/generated-avatar';

function UserProfile({ user }) {
  return (
    <div>
      <GeneratedAvatar 
        seed={user.email} 
        variant="initials" 
        className="w-10 h-10" 
      />
      <span>{user.name}</span>
    </div>
  );
}
```

#### State Components

##### LoadingState
**File**: `src/components/loading-state.tsx`

```typescript
interface Props {
  title: string;
  description: string;
}

export const LoadingState = ({ title, description }: Props) => {
  // Displays loading spinner with title and description
}
```

##### ErrorState
**File**: `src/components/error-state.tsx`

```typescript
interface Props {
  title: string;
  description: string;
}

export const ErrorState = ({ title, description }: Props) => {
  // Displays error icon with title and description
}
```

##### EmptyState
**File**: `src/components/empty-state.tsx`

```typescript
interface Props {
  title: string;
  description: string;
}

export const EmptyState = ({ title, description }: Props) => {
  // Displays empty state illustration with title and description
}
```

**Usage**:
```typescript
import { LoadingState, ErrorState, EmptyState } from '@/components/...';

function DataView({ data, loading, error }) {
  if (loading) {
    return <LoadingState title="Loading agents..." description="Please wait while we fetch your agents" />;
  }
  
  if (error) {
    return <ErrorState title="Error loading agents" description="There was a problem loading your agents" />;
  }
  
  if (data.length === 0) {
    return <EmptyState title="No agents found" description="Create your first agent to get started" />;
  }
  
  return <div>{/* Render data */}</div>;
}
```

## Agent Module Components

### AgentForm
**File**: `src/modules/agents/ui/components/agent-form.tsx`

```typescript
interface AgentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialValues?: AgentGetOne;
}

export const AgentForm = ({ onSuccess, onCancel, initialValues }: AgentFormProps) => {
  // Form for creating/editing agents
}
```

**Usage**:
```typescript
import { AgentForm } from '@/modules/agents/ui/components/agent-form';

function CreateAgentDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <AgentForm
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
```

### AgentsView
**File**: `src/modules/agents/ui/views/agents-view.tsx`

```typescript
export const AgentsView = () => {
  // Main view for listing agents with pagination and search
}

export const AgentsViewLoading = () => {
  // Loading state for agents view
}

export const AgentsViewError = () => {
  // Error state for agents view
}
```

**Usage**:
```typescript
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { AgentsView, AgentsViewLoading, AgentsViewError } from '@/modules/agents/ui/views/agents-view';

function AgentsPage() {
  return (
    <ErrorBoundary fallback={<AgentsViewError />}>
      <Suspense fallback={<AgentsViewLoading />}>
        <AgentsView />
      </Suspense>
    </ErrorBoundary>
  );
}
```

## Utility Functions

### Class Name Utility
**File**: `src/lib/utils.ts`

```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Usage**:
```typescript
import { cn } from '@/lib/utils';

function MyComponent({ className, isActive }) {
  return (
    <div className={cn(
      'base-styles',
      isActive && 'active-styles',
      className
    )}>
      Content
    </div>
  );
}
```

## tRPC Client Setup

### Client Provider
**File**: `src/trpc/client.tsx`

```typescript
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  // Provides tRPC client to React components
}
```

**Usage**:
```typescript
// In your app layout
import { TRPCReactProvider } from '@/trpc/client';

export default function RootLayout({ children }) {
  return (
    <TRPCReactProvider>
      {children}
    </TRPCReactProvider>
  );
}

// In components
import { useTRPC } from '@/trpc/client';

function MyComponent() {
  const trpc = useTRPC();
  
  const { data } = trpc.agents.getMany.useQuery({
    page: 1,
    pageSize: 10
  });
  
  return <div>{/* Component content */}</div>;
}
```

## Type Definitions

### Agent Types
**File**: `src/modules/agents/types.ts`

```typescript
import { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

export type AgentGetOne = inferRouterOutputs<AppRouter>["agents"]["getOne"];
```

**Usage**:
```typescript
import type { AgentGetOne } from '@/modules/agents/types';

function AgentCard({ agent }: { agent: AgentGetOne }) {
  return (
    <div>
      <h3>{agent.name}</h3>
      <p>{agent.instructions}</p>
      <span>Meetings: {agent.meetingCount}</span>
    </div>
  );
}
```

## Error Handling

### tRPC Error Handling
```typescript
// Server-side error throwing
import { TRPCError } from '@trpc/server';

if (!existingAgent) {
  throw new TRPCError({ 
    code: "NOT_FOUND", 
    message: "Agent not found" 
  });
}

// Client-side error handling
const createAgent = trpc.agents.create.useMutation({
  onError: (error) => {
    toast.error(error.message);
  }
});
```

## Environment Variables

Required environment variables:

```env
# Database
DATABASE_URL=postgresql://...

# Authentication
BETTER_AUTH_SECRET=your-secret-key

# OAuth Providers
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Best Practices

### 1. API Usage
- Always use type-safe tRPC procedures
- Handle loading and error states
- Implement proper pagination
- Use optimistic updates where appropriate

### 2. Component Development
- Use TypeScript interfaces for props
- Implement proper error boundaries
- Follow accessibility guidelines
- Use responsive design patterns

### 3. Database Operations
- Use transactions for related operations
- Implement proper error handling
- Use type-safe schema definitions
- Follow database normalization principles

### 4. Authentication
- Always check authentication in protected procedures
- Use proper session management
- Implement CSRF protection
- Follow OAuth best practices

## Development Commands

```bash
# Development
npm run dev

# Build
npm run build

# Start production server
npm run start

# Linting
npm run lint

# Database operations
npm run db:push    # Push schema changes
npm run db:studio  # Open database studio
```

This documentation provides a comprehensive overview of all public APIs, functions, and components in the Meeting AI application. Each section includes practical examples and usage instructions to help developers understand and work with the codebase effectively.
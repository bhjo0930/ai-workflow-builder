# AI Workflow Builder

A visual workflow builder application built with React, TypeScript, and Vite.

## Features

- Visual drag-and-drop workflow creation
- Four node types: User Input, Generate, Output, Add Assets
- Node connections with data flow
- Workflow execution engine
- Save/load workflows

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Canvas**: React Flow (@xyflow/react)
- **State Management**: Zustand with Immer
- **UI Components**: Headless UI
- **Icons**: Lucide React
- **File Handling**: React Dropzone, File-saver

## Development Tools

- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier
- **Type Checking**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Scripts

```bash
# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Code formatting
npm run format
npm run format:check
```

## Project Structure

```
src/
├── components/          # React components
│   ├── nodes/          # Node-specific components
│   └── ui/             # Reusable UI components
├── stores/             # Zustand stores
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── hooks/              # Custom React hooks
└── App.tsx             # Main application component
```

## Core Types

The application uses strongly-typed interfaces for:

- **Node**: Workflow nodes with type, position, config, and status
- **Connection**: Links between nodes with source/target information
- **Workflow**: Complete workflow with nodes, connections, and metadata
- **NodeConfig**: Type-specific configuration for each node type

## State Management

Uses Zustand with Immer for immutable state updates:

- Workflow state (nodes, connections, metadata)
- Node selection and editing
- Workflow operations (add, remove, update)

## Next Steps

This is the foundation setup. The next tasks will implement:

1. Canvas component with React Flow
2. Toolbar for node creation
3. Individual node components
4. Properties panel
5. Execution engine
6. Persistence layer
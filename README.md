# Japanese Menu Translator - Frontend

A modern React/Next.js frontend application for translating Japanese restaurant menus using Google Vision API and OpenAI GPT-4.

## 🚀 Features

- **Drag & Drop File Upload**: Easy image upload with preview
- **Real-time Translation**: Extract text from menu images and translate to English
- **Detailed Descriptions**: Get comprehensive explanations of Japanese dishes
- **Beautiful UI**: Modern design with smooth animations using Framer Motion
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Error Handling**: Comprehensive error handling with user-friendly messages

## 🛠 Tech Stack

### Framework & Runtime
- **Next.js 15** - React-based full-stack framework
- **React 19** - UI library with latest features
- **TypeScript** - Type-safe JavaScript

### Styling & UI
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Lucide React** - Beautiful icon library

### State Management & HTTP
- **Zustand** - Lightweight state management
- **Axios** - HTTP client for API communication

### File Handling
- **React Dropzone** - Drag & drop file upload
- **clsx** - Conditional className utility

### Testing & Quality
- **Jest** - Test runner and framework
- **Testing Library** - React component testing utilities
- **TypeScript** - Compile-time type checking

## 📋 Prerequisites

- Node.js 18.0 or higher
- npm or yarn package manager
- Backend server running (see ../menu_sensor_backend/)

## 🔧 Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file in the project root:
   ```
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏃‍♂️ Usage

1. **Start the backend server** (see backend README for instructions)
2. **Upload a menu image** by dragging & dropping or clicking to browse
3. **Click "Translate Menu"** to process the image
4. **View the results** with extracted text and detailed translations

## 🔧 Configuration

### Environment Variables

- `NEXT_PUBLIC_API_BASE_URL`: Backend API base URL (default: http://localhost:8000)

### API Endpoints

The frontend communicates with these backend endpoints:
- `POST /translate` - Upload and translate menu image
- `GET /health` - Health check

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── FileUpload.tsx     # File upload with drag & drop
│   ├── MenuTranslator.tsx # Main application component
│   └── TranslationResult.tsx # Results display
├── lib/                   # Utilities
│   ├── api.ts            # API client
│   └── store.ts          # Zustand state management
└── types/                # TypeScript type definitions
    └── index.ts
```

## 🧩 Components

### MenuTranslator
Main application component that orchestrates the translation workflow.

### FileUpload
Handles file upload with drag & drop functionality, image preview, and validation.

### TranslationResult
Displays extracted text and translated menu items with beautiful formatting.

## 🔄 State Management

Using Zustand for simple and efficient state management:

```typescript
interface TranslationState {
  isLoading: boolean;
  result: TranslationResponse | null;
  error: string | null;
  selectedFile: File | null;
}
```

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in CI environment
npm run test:ci
```

## 🧪 Testing

This project includes comprehensive tests for all major components and functionality:

### Test Coverage
- **Store Tests**: State management, progress tracking, data filtering
- **API Tests**: HTTP requests, SSE connections, error handling  
- **Component Tests**: UI interactions, file upload, responsive design
- **Integration Tests**: End-to-end user workflows

### Test Structure
```
__tests__/
├── store/                 # Zustand store tests
│   └── menuStore.test.ts
├── api/                   # API layer tests  
│   └── translationApi.test.ts
├── components/            # React component tests
│   └── HomePage.test.tsx
└── utils/                 # Test utilities
    └── testHelpers.ts
```

### Testing Technologies
- **Jest** - Test runner and framework
- **@testing-library/react** - React component testing
- **@testing-library/user-event** - User interaction simulation
- **@testing-library/jest-dom** - Additional Jest matchers

### Running Specific Tests
```bash
# Run store tests only
npm test store

# Run component tests only  
npm test components

# Run API tests only
npm test api

# Run tests matching a pattern
npm test HomePage
```

### Test Quality Standards
- **70%+ Coverage**: Minimum code coverage requirement
- **Unit Tests**: All core functions and components
- **Integration Tests**: Critical user workflows
- **Error Scenarios**: Comprehensive error handling tests

## 🤝 Backend Integration

This frontend is designed to work with the FastAPI backend located in `../menu_sensor_backend/`. Make sure the backend is running before using the frontend application.

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🐛 Troubleshooting

### Common Issues

1. **Backend Connection Error**
   - Ensure the backend server is running on port 8000
   - Check the `NEXT_PUBLIC_API_BASE_URL` environment variable

2. **File Upload Issues**
   - Supported formats: JPG, PNG, GIF
   - Maximum file size: 10MB

3. **Translation Errors**
   - Verify backend API keys are configured
   - Check backend logs for detailed error messages

## 📄 License

This project is part of the Japanese Menu Translator application.

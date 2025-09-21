# SwachTrack API

A TypeScript Express.js API designed for civic issue management and reporting in Indian municipalities, deployable on Netlify.

## Features

- 🚀 Express.js with TypeScript
- 🌐 Netlify Functions support
- 🔒 Security middleware (Helmet, CORS)
- 🤖 AI-powered civic issue classification and analysis
- 💬 Interactive chat interface with AI agent
- 🏥 Health check endpoint
- 📝 Environment configuration
- 🇮🇳 Tailored for Indian municipal contexts

## API Endpoints

> Read the API Docs [here](https://github.com/debangshu919/swachtrack-api/blob/main/API_Documentation.md)

### Health & Status

- `GET /health` - Health check endpoint
- `GET /` - API information
- `GET /api/status` - API status and features

### AI-Powered Civic Issue Management

- `POST /api/classify` - Classify civic issues into categories
- `POST /api/analyze` - Analyze issues and provide estimates
- `POST /api/report` - Complete pipeline (classify + analyze)
- `POST /api/chat` - Interactive AI chat for issue reporting

### Chat Features

- Natural language processing for civic issue descriptions
- Intelligent routing to appropriate API endpoints
- Conversation history and session management
- Automatic report generation with unique IDs
- Friendly, conversational responses in Indian context

## Development Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Set up environment variables:**

   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Run in development mode:**
   ```bash
   pnpm run dev
   ```

### OR

4. **Build for production:**

   ```bash
   pnpm run build
   ```

5. **Start production server:**
   ```bash
   pnpm start
   ```

## Project Structure

```
├── src/
│   ├── index.ts          # Main Express application
    ├── openai_client.ts  # OpenAI API client
    ├── controllers/
         ├── analyze.ts   # Controller for /analyze endpoint
         ├── chat.ts      # Controller for /chat endpoint
         ├── classify.ts  # Controller for /classify endpoint
         └── report.ts    # Controller for /report endpoint
│   └── routes/
│       └── api.ts        # API routes
├── netlify/
│   └── functions/
│       └── server.ts     # Netlify serverless function
├── dist/                 # Build output
├── netlify.toml          # Netlify configuration
├── tsconfig.json         # TypeScript configuration
├── .env                  # Secret variables
├── API_Documentation.md  # API Endpoints documentation
└── package.json          # Dependencies and scripts
```

## Chat API Usage

The `/api/chat` endpoint provides an interactive AI assistant for civic issue reporting:

### Basic Usage

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to report a pothole on MG Road"}'
```

### With Session Management

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can you tell me more about this report?",
    "session_id": "session_1703123456789_abc123"
  }'
```

### Response Format

```json
{
  "response": "AI assistant response text",
  "session_id": "session_1703123456789_abc123",
  "report_id": "RPT-1703123456789",
  "next_steps": ["Forward to municipal department", "..."],
  "conversation_history": [...]
}
```

## Environment Variables

- `NEBIUS` - Nebius AI Studio API key for AI functionality

## Scripts

- `npm run dev` - Development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run netlify:build` - Build for Netlify deployment
- `npm run netlify:dev` - Local Netlify development

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

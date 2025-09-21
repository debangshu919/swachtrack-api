# SwachTrack API Documentation

This document provides detailed information about the main API endpoints of the SwachTrack civic issue management system.

**BASE URL:** `http://swachtrack.netlify.app/api`
**API VERSION:** `1.0.0`

---

## 1. Classify Endpoint

**Endpoint:** `POST /classify`

**Description:**
AI-powered civic issue classification endpoint that categorizes reported issues and extracts key information.

**Purpose:**

- Classifies civic issues into predefined categories relevant to Indian urban contexts
- Extracts location information from issue descriptions
- Assesses severity indicators based on various factors
- Uses OpenAI GPT model for intelligent classification

**Input Format:**

```json
{
  "issue": "string" // required
}
```

**Example Request:**

```json
{
  "issue": "There's a large pothole on MG Road near the metro station causing traffic jams during peak hours. It's been raining heavily and the hole is getting deeper."
}
```

**Success Response (200 OK):**

```json
{
  "issue": "string",
  "category": "string",
  "location": "string",
  "severity_indicators": "string"
}
```

**Example Response:**

```json
{
  "issue": "There's a large pothole on MG Road near the metro station causing traffic jams during peak hours. It's been raining heavily and the hole is getting deeper.",
  "category": "potholes",
  "location": "MG Road near metro station",
  "severity_indicators": "High severity due to traffic impact during peak hours, monsoon conditions worsening the issue, and potential safety hazards for vehicles"
}
```

**Categories:**

- streetlights
- potholes
- overflowing dustbins
- water logging
- roadblocks
- broken footpaths
- garbage dumping
- other civic issues

**Error Responses:**

- `500 Internal Server Error`: `{ "error": "Failed to classify issue" }`

---

## 2. Analyze Endpoint

**Endpoint:** `POST /analyze`

**Description:**
AI-powered civic issue analysis endpoint that provides detailed estimates and recommendations for classified issues.

**Purpose:**

- Estimates time, cost, and manpower required to fix the issue
- Recommends suitable Indian companies or local contractors
- Assesses severity level (low, medium, high)
- Generates comprehensive summary with resource estimates

**Input Format:**

```json
{
  "issue": "string", // required
  "category": "string", // required
  "location": "string", // required
  "severity_indicators": "string" // required
}
```

**Example Request:**

```json
{
  "issue": "Large pothole on MG Road near metro station",
  "category": "potholes",
  "location": "MG Road near metro station",
  "severity_indicators": "High severity due to traffic impact during peak hours, monsoon conditions worsening the issue"
}
```

**Success Response (200 OK):**

```json
{
  "time_estimate": "string",
  "cost_estimate": "string",
  "manpower_required": "string",
  "recommended_company": "string",
  "severity": "string",
  "summary": "string"
}
```

**Example Response:**

```json
{
  "time_estimate": "2 days",
  "cost_estimate": "₹35,000",
  "manpower_required": "5 workers",
  "recommended_company": "Delhi Urban Services Ltd.",
  "severity": "high",
  "summary": "Water logging reported near MG Road, Mumbai. Estimated repair time 2 days with moderate cost. Delhi Urban Services Ltd. recommended due to proven expertise. Severity high due to monsoon season and heavy traffic."
}
```

**Severity Levels:**

- low: Minor issues with minimal impact
- medium: Moderate issues requiring attention
- high: Critical issues requiring immediate action

**Error Responses:**

- `500 Internal Server Error`: `{ "error": "Failed to analyze issue" }`

---

## 3. Report Endpoint

**Endpoint:** `POST /report`

**Description:**
Complete pipeline endpoint that performs both classification and analysis in a single request.

**Purpose:**

- Combines classification and analysis functionality
- Provides comprehensive civic issue report
- Generates unique report ID and timestamp
- Includes next steps for municipal action
- Streamlines the entire civic issue processing workflow

**Input Format:**

```json
{
  "issue": "string" // required
}
```

**Example Request:**

```json
{
  "issue": "There's a large pothole on MG Road near the metro station causing traffic jams during peak hours. It's been raining heavily and the hole is getting deeper."
}
```

**Success Response (200 OK):**

```json
{
  "report_id": "string",
  "timestamp": "string",
  "original_issue": "string",
  "classification": {
    "issue": "string",
    "category": "string",
    "location": "string",
    "severity_indicators": "string"
  },
  "analysis": {
    "time_estimate": "string",
    "cost_estimate": "string",
    "manpower_required": "string",
    "recommended_company": "string",
    "severity": "string",
    "summary": "string"
  },
  "status": "string",
  "next_steps": ["string", "string", "string", "string"]
}
```

**Example Response:**

```json
{
  "report_id": "RPT-1703123456789",
  "timestamp": "2023-12-21T10:30:45.123Z",
  "original_issue": "There's a large pothole on MG Road near the metro station causing traffic jams during peak hours. It's been raining heavily and the hole is getting deeper.",
  "classification": {
    "issue": "Large pothole on MG Road near metro station",
    "category": "potholes",
    "location": "MG Road near metro station",
    "severity_indicators": "High severity due to traffic impact during peak hours, monsoon conditions worsening the issue"
  },
  "analysis": {
    "time_estimate": "2 days",
    "cost_estimate": "₹35,000",
    "manpower_required": "5 workers",
    "recommended_company": "Delhi Urban Services Ltd.",
    "severity": "high",
    "summary": "Pothole repair on MG Road. Estimated repair time 2 days with moderate cost. Delhi Urban Services Ltd. recommended due to proven expertise. Severity high due to monsoon season and heavy traffic."
  },
  "status": "processed",
  "next_steps": [
    "Forward to municipal department",
    "Assign to recommended contractor",
    "Schedule repair work",
    "Monitor progress"
  ]
}
```

**Error Responses:**

- `400 Bad Request`: `{ "error": "Issue description is required" }`
- `500 Internal Server Error`: `{ "error": "Failed to process civic issue report", "details": "string" }`

---

## 4. Chat Endpoint

**Endpoint:** `POST /chat`

**Description:**
AI-powered interactive chat endpoint that provides conversational interface for civic issue reporting and management.

**Purpose:**

- Provides conversational AI interface for citizens to report issues
- Acts as an intelligent agent that can call other API endpoints
- Maintains conversation history and context
- Guides users through the civic issue reporting process
- Can classify, analyze, and create reports through natural conversation

**Input Format:**

```json
{
  "message": "string", // required
  "session_id": "string", // optional
  "conversation_history": [
    /* array of ChatMessage objects */
  ] // optional
}
```

**Example Request:**

```json
{
  "message": "I want to report a pothole on MG Road that's causing traffic issues",
  "session_id": "session_1703123456789_abc123"
}
```

**Success Response (200 OK):**

```json
{
  "response": "string",
  "session_id": "string",
  "report_id": "string", // optional
  "next_steps": ["string"], // optional
  "conversation_history": [
    /* array of ChatMessage objects */
  ]
}
```

**Example Response:**

```json
{
  "response": "✅ **Report Created Successfully!**\n\n**Report ID:** RPT-1703123456789\n**Status:** processed\n**Timestamp:** 2023-12-21T10:30:45.123Z\n\n**Issue Summary:**\n- Category: potholes\n- Location: MG Road\n- Severity: high\n- Estimated Cost: ₹35,000\n- Time Required: 2 days\n\n**Next Steps:**\n1. Forward to municipal department\n2. Assign to recommended contractor\n3. Schedule repair work\n4. Monitor progress\n\nYour report has been forwarded to the municipal authorities. You can use the Report ID to track the progress.",
  "session_id": "session_1703123456789_abc123",
  "report_id": "RPT-1703123456789",
  "next_steps": [
    "Forward to municipal department",
    "Assign to recommended contractor",
    "Schedule repair work",
    "Monitor progress"
  ],
  "conversation_history": [
    {
      "role": "user",
      "content": "I want to report a pothole on MG Road that's causing traffic issues",
      "timestamp": "2023-12-21T10:30:15.000Z"
    },
    {
      "role": "assistant",
      "content": "✅ **Report Created Successfully!...",
      "timestamp": "2023-12-21T10:30:45.123Z"
    }
  ]
}
```

**Chat Features:**

- Natural language processing for civic issue descriptions
- Intelligent routing to appropriate API endpoints (classify, analyze, report)
- Conversation context maintenance across multiple messages
- Session-based conversation management
- Automatic report generation with unique IDs
- Friendly, conversational responses in Indian context

**Agent Capabilities:**
The chat AI can automatically:

1. Classify civic issues using the `/classify` endpoint
2. Analyze issues using the `/analyze` endpoint
3. Create comprehensive reports using the `/report` endpoint
4. Provide estimates, recommendations, and next steps
5. Answer questions about civic issues and municipal services

**Error Responses:**

- `400 Bad Request`: `{ "error": "Message is required" }`
- `500 Internal Server Error`: `{ "error": "Failed to process chat message", "details": "string" }`

---

## Additional Endpoints

**Status Endpoint:**

- `GET /status`
- Health check endpoint
- Response: `{ "message": "SwachTrack API is operational", "version": "1.0.0" }`

---

## Technical Details

- **AI Model:** OpenAI GPT-OSS-20B
- **Response Format:** JSON Schema enforced
- **Content Type:** application/json
- **Authentication:** Not specified (check with deployment)

---

## Usage Examples

1. **Simple Classification:**

   - `POST /classify`
   - Body: `{ "issue": "Broken streetlight on Park Street" }`

2. **Analysis of Classified Issue:**

   - `POST /analyze`
   - Body: {
     "issue": "Broken streetlight on Park Street",
     "category": "streetlights",
     "location": "Park Street",
     "severity_indicators": "Medium severity - affects pedestrian safety at night"
     }

3. **Complete Report Processing:**

   - `POST /report`
   - Body: `{ "issue": "Broken streetlight on Park Street" }`

4. **Interactive Chat for Issue Reporting:**

   - `POST /chat`
   - Body: `{ "message": "I want to report a broken streetlight on Park Street" }`
   - Response will include AI conversation and automatic report creation with ID.

5. **Chat with Session Management:**
   - `POST /chat`
   - Body: {
     "message": "Can you tell me more about this report?",
     "session_id": "session_1703123456789_abc123"
     }

---

## Notes

- All endpoints use AI-powered processing with structured JSON responses
- The system is specifically designed for Indian municipal contexts
- Cost estimates are provided in Indian Rupees (₹)
- Company recommendations are tailored to Indian contractors and service providers
- The system considers Indian urban factors like monsoon seasons, traffic patterns, and population density
- Report IDs are generated using timestamp format: `RPT-{timestamp}`
- All timestamps are in ISO 8601 format

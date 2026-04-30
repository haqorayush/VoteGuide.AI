# VoteGuide AI 🗳️ (Hack2Skill x Google for Developers)

**VoteGuide AI** is a high-performance civic engagement platform engineered to demystify the Indian electoral journey through advanced AI orchestration. Developed with a modern **React-Node.js** architecture, the system integrates **Google Gemini 1.5 Flash** to power a multi-stage conversational state machine. 
**VoteGuide AI** is a civic guidance application that helps Indian citizens understand the voter-registration and polling-day journey through a structured conversational interface.

Technical highlights include a custom **Zero-Shot Intent Classifier** for natural language state transitions, **IP-based session persistence** for seamless user context, and a secure API layer hardened with **Helmet and Express-Rate-Limiting**. The platform enhances civic readiness by combining generative AI responses with deterministic logic, featuring automated PDF generation via **jsPDF** and real-time geolocation-based polling booth identification.
The project uses a **React + TypeScript frontend** and an **Express.js backend**. The backend combines deterministic state-machine logic with **Google Gemini** for intent classification and civic Q&A. Gemini is pinned to `gemini-2.5-flash-lite` with a high output-token ceiling so the application avoids unstable `latest` aliases while retaining a large supported context/output window.

The current implementation includes IP-based session continuity, English/Hindi response support, a guided election journey, a separate AI chat mode, Form 6 checklist export, election timeline actions, polling-day simulation, geolocation-assisted booth lookup, and a light-mode-first interface.

## 🌟 The Problem & Vertical
**Vertical Chosen**: Election Process Education

Navigating the electoral process in India can be daunting for first-time voters. Information regarding eligibility, forms (like Form 6), document requirements, and polling day procedures is scattered, leading to voter apathy. 
First-time voters often have to piece together information about eligibility, Form 6, required documents, electoral roll verification, and polling-day procedures from multiple sources. This can make the process feel harder than it needs to be, especially for users who are unfamiliar with official election terminology.

VoteGuide AI focuses on turning that journey into a clear, step-by-step civic assistant experience.

## 🧠 Approach and Logic
VoteGuide AI is built around a **Conversational State Machine**. Instead of a traditional web form, users are guided through a natural, chat-based flow. 
The logic is driven by checking sequential milestones: Eligibility -> Registration Status -> Electoral Roll Check -> Voting Preparation. 
To ensure a fluid experience, we implemented a **Gemini-powered Intent Classifier**. Rather than strictly requiring rigid inputs like "yes" or "no", Gemini understands variations of user intent in natural language (e.g., "I'm 20", "I already got my card") and seamlessly routes them to the next state in the journey.
VoteGuide AI is built around a **Conversational State Machine**. The guided flow progresses through the main voter journey:

Eligibility -> Registration Status -> Electoral Roll Check -> Voting Preparation -> Completion

The backend stores lightweight session state by client IP and returns a structured response contract containing:

- `stage`: the user's current journey stage
- `next_step`: the immediate recommended action
- `actions`: UI instructions for the frontend, such as showing the checklist, timeline, electoral roll link, simulation, or completion state
- `suggestions`: guided quick replies for the next user response

Gemini is used as an assistive classifier for natural-language replies, while keyword fallbacks keep the core journey functional if the model is unavailable or rate-limited. The frontend now consumes the full backend contract, including `/api/state`, `next_step`, and every backend-driven UI action.

## ⚙️ How the Solution Works
1. **Context-Aware Chat**: The user interacts with the Civic Assistant. Depending on the user's current stage, the Node.js backend responds with specific, localized guidance.
2. **Intent Classification**: Every user message is securely analyzed by the Gemini 2.5 Flash model. It classifies the message into intents (`affirmative`, `negative`, `age`, `question`) to advance the state machine.
3. **Dynamic Sidebar & Timeline**: As the user progresses, the frontend updates a gamified visual timeline and surfaces relevant action cards (like a downloadable PDF checklist).
4. **Interactive EVM Simulation**: A built-in textual and visual walkthrough of polling day, ensuring first-time voters know exactly how to operate an EVM and verify their vote on a VVPAT.
5. **Post-Journey Unlock**: Once the core registration journey is completed, the restrictive state machine unlocks. The user can then ask any open-ended questions about the election, which are routed directly to Gemini for detailed, generative responses.
6. **Geolocation & Mapping**: Users can click "Find Polling Booth" to fetch their coordinates and instantly map it, complete with a quick-copy feature for Google Maps routing.
1. **Context-Aware Chat**: The Civic Assistant responds according to the user's current backend stage and keeps the journey focused on the next required step.
2. **Intent Classification**: Gemini classifies flexible user replies into intents such as `affirmative`, `negative`, `age`, `question`, and `unknown`. Deterministic fallbacks handle common guided replies.
3. **Dynamic Sidebar & Timeline**: The sidebar reflects the backend state, next step, Voter ID status, timeline progress, and stage-specific action cards.
4. **Interactive EVM Simulation**: The app walks users through ID verification, the EVM interaction, VVPAT confirmation, and the final voting-day completion state.
5. **Post-Journey Unlock**: After the guided journey is completed, the user can continue with open-ended civic questions through Gemini-powered Q&A.
6. **Geolocation & Mapping**: The app can request browser geolocation, show an embedded map view, and generate a Google Maps search link for navigation.
7. **Light-Mode-First UI**: The default interface now loads in light mode, with dark mode available through the theme toggle.

## 🌐 Google Services Integration
- **Google Gemini API**: Powers the core intelligence of the application. It acts as both a *Zero-Shot Intent Classifier* during the strict registration flow, and as a *Generative Q&A engine* for general civic education after the flow is complete.
- **Google Maps Ecosystem**: The application translates the user's browser geolocation into direct Google Maps search URLs, allowing them to route directly to their local polling booth on their mobile devices.
- **Google Gemini API**: Powers AI chat, post-journey Q&A, and natural-language intent classification. The model is hard-locked to `gemini-2.5-flash-lite` and configured with `maxOutputTokens: 65536`.
- **Google Maps Ecosystem**: The app creates Google Maps search links from browser geolocation coordinates, allowing users to open the location on their own device.

## 🛠️ Tech Stack
- **Frontend**: React (Vite), TypeScript, Framer Motion, Lucide React, Vanilla CSS (CSS Variables)
- **Backend**: Node.js, Express.js (Secured with Helmet, Rate Limiting, and restricted CORS)
- **Architecture**: RESTful API communicating with a Gemini-powered intent classifier and a conversational state machine.
- **Frontend**: React, TypeScript, Vite, Framer Motion, Lucide React, React Markdown, jsPDF, CSS variables
- **Backend**: Node.js, Express.js, Helmet, Express Rate Limit, CORS, dotenv
- **AI**: Google Gemini API via `@google/genai`
- **Architecture**: REST API endpoints for guided chat, AI chat, and backend state hydration

Main API endpoints:

- `POST /api/chat`: guided election journey and state-machine responses
- `POST /api/ai-chat`: free-form civic Q&A through Gemini
- `GET /api/state`: current backend session state for frontend hydration

## 🤔 Assumptions Made
- **User Device**: Users have access to modern desktop browsers and basic internet connectivity.
- **Language**: The initial MVP caters to English and Hindi users (`hi` translation dictionary implemented).
- **Session Handling**: For simplicity in this hackathon submission, session state is tied to the user's IP address rather than a fully authenticated user account.
- **Accuracy**: The checklist and timelines mirror the general process of the Election Commission of India (ECI), but real-world dates and forms are subject to change by the ECI.
- **User Device**: Users have access to a modern browser with JavaScript enabled.
- **Language**: English and Hindi are supported for the guided flow through backend translations.
- **Session Handling**: Session state is tied to client IP for simplicity. A production version should replace this with authenticated or anonymous session IDs backed by persistent storage.
- **Accuracy**: Election forms, timelines, and portal links are based on the general Election Commission of India process. Real dates, constituency details, and accepted documents may change and should be verified with official ECI sources.
- **Location**: The polling-booth feature uses browser geolocation as a convenience layer. It does not verify the user's official assigned booth.

## 🚀 Running the Project Locally

1. **Clone the repository** and navigate to the project folder.

2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start both the Backend API and the Frontend Server**:
   You can run both concurrently by starting the node server in the background and vite in the foreground:

3. **Create a `.env` file** with your Gemini API key:
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the backend API**:
   ```bash

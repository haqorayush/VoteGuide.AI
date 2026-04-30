# VoteGuide AI 🗳️ (Hack2Skill x Google for Developers)

**VoteGuide AI** is a civic guidance application that helps Indian citizens understand the voter-registration and polling-day journey through a structured conversational interface.

The project uses a **React + TypeScript frontend** and an **Express.js backend**. The backend combines deterministic state-machine logic with **Google Gemini** for intent classification and civic Q&A. Gemini is pinned to `gemini-2.5-flash-lite` with a high output-token ceiling so the application avoids unstable `latest` aliases while retaining a large supported context/output window.

The current implementation includes IP-based session continuity, English/Hindi response support, a guided election journey, a separate AI chat mode, Form 6 checklist export, election timeline actions, polling-day simulation, geolocation-assisted booth lookup, and a light-mode-first interface.

## 🌟 The Problem & Vertical
**Vertical Chosen**: Election Process Education

First-time voters often have to piece together information about eligibility, Form 6, required documents, electoral roll verification, and polling-day procedures from multiple sources. This can make the process feel harder than it needs to be, especially for users who are unfamiliar with official election terminology.

VoteGuide AI focuses on turning that journey into a clear, step-by-step civic assistant experience.

## 🧠 Approach and Logic
VoteGuide AI is built around a **Conversational State Machine**. The guided flow progresses through the main voter journey:

Eligibility -> Registration Status -> Electoral Roll Check -> Voting Preparation -> Completion

The backend stores lightweight session state by client IP and returns a structured response contract containing:

- `stage`: the user's current journey stage
- `next_step`: the immediate recommended action
- `actions`: UI instructions for the frontend, such as showing the checklist, timeline, electoral roll link, simulation, or completion state
- `suggestions`: guided quick replies for the next user response

Gemini is used as an assistive classifier for natural-language replies, while keyword fallbacks keep the core journey functional if the model is unavailable or rate-limited. The frontend now consumes the full backend contract, including `/api/state`, `next_step`, and every backend-driven UI action.

## ⚙️ How the Solution Works
1. **Context-Aware Chat**: The Civic Assistant responds according to the user's current backend stage and keeps the journey focused on the next required step.
2. **Intent Classification**: Gemini classifies flexible user replies into intents such as `affirmative`, `negative`, `age`, `question`, and `unknown`. Deterministic fallbacks handle common guided replies.
3. **Dynamic Sidebar & Timeline**: The sidebar reflects the backend state, next step, Voter ID status, timeline progress, and stage-specific action cards.
4. **Interactive EVM Simulation**: The app walks users through ID verification, the EVM interaction, VVPAT confirmation, and the final voting-day completion state.
5. **Post-Journey Unlock**: After the guided journey is completed, the user can continue with open-ended civic questions through Gemini-powered Q&A.
6. **Geolocation & Mapping**: The app can request browser geolocation, show an embedded map view, and generate a Google Maps search link for navigation.
7. **Light-Mode-First UI**: The default interface now loads in light mode, with dark mode available through the theme toggle.

## 🌐 Google Services Integration
- **Google Gemini API**: Powers AI chat, post-journey Q&A, and natural-language intent classification. The model is hard-locked to `gemini-2.5-flash-lite` and configured with `maxOutputTokens: 65536`.
- **Google Maps Ecosystem**: The app creates Google Maps search links from browser geolocation coordinates, allowing users to open the location on their own device.

## 🛠️ Tech Stack
- **Frontend**: React, TypeScript, Vite, Framer Motion, Lucide React, React Markdown, jsPDF, CSS variables
- **Backend**: Node.js, Express.js, Helmet, Express Rate Limit, CORS, dotenv
- **AI**: Google Gemini API via `@google/genai`
- **Architecture**: REST API endpoints for guided chat, AI chat, and backend state hydration

Main API endpoints:

- `POST /api/chat`: guided election journey and state-machine responses
- `POST /api/ai-chat`: free-form civic Q&A through Gemini
- `GET /api/state`: current backend session state for frontend hydration

## 🤔 Assumptions Made
- **User Device**: Users have access to a modern browser (Desktop Only) with JavaScript enabled.
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

3. **Create a `.env` file** with your Gemini API key:
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the backend API**:
   ```bash
   node server.js
   ```

   The backend defaults to `http://localhost:3000`. You can change the port with:
   ```bash
   PORT=3001 node server.js
   ```

5. **Start the frontend server**:
   ```bash
   npm run dev
   ```

   If your backend is not on port `3000`, point Vite at the correct API base:
   ```bash
   VITE_API_BASE_URL=http://localhost:3001 npm run dev
   ```

6. **Access the App**:
   Open [http://localhost:5173](http://localhost:5173) in your browser.

Useful verification commands:

```bash
npm run lint
npm run build
node test_gemini.js
```

## 🔮 Future Roadmap (Scaling the Impact)
- **Performance Optimization**: Lazy-load PDF generation, reduce always-on visual effects, and streamline chat rendering for lower-end devices.
- **Persistent Sessions**: Replace IP-based state with durable anonymous sessions or authenticated profiles.
- **Official Polling Data Integration**: Connect to official or verified polling-station lookup sources when available.
- **Accessibility Improvements**: Add voice input/output, stronger keyboard navigation, and improved screen-reader labels.
- **Expanded Civic Education**: Add structured explainers, quizzes, and localized election-readiness checklists.

---
*Built for the Hack2Skill x Google for Developers Hackathon.*

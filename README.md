# VoteGuide AI 🗳️ (Hack2Skill x Google for Developers)

**VoteGuide AI** is a high-performance civic engagement platform engineered to demystify the Indian electoral journey through advanced AI orchestration. Developed with a modern **React-Node.js** architecture, the system integrates **Google Gemini 1.5 Flash** to power a multi-stage conversational state machine. 

Technical highlights include a custom **Zero-Shot Intent Classifier** for natural language state transitions, **IP-based session persistence** for seamless user context, and a secure API layer hardened with **Helmet and Express-Rate-Limiting**. The platform enhances civic readiness by combining generative AI responses with deterministic logic, featuring automated PDF generation via **jsPDF** and real-time geolocation-based polling booth identification.

## 🌟 The Problem & Vertical
**Vertical Chosen**: Election Process Education

Navigating the electoral process in India can be daunting for first-time voters. Information regarding eligibility, forms (like Form 6), document requirements, and polling day procedures is scattered, leading to voter apathy. 

## 🧠 Approach and Logic
VoteGuide AI is built around a **Conversational State Machine**. Instead of a traditional web form, users are guided through a natural, chat-based flow. 
The logic is driven by checking sequential milestones: Eligibility -> Registration Status -> Electoral Roll Check -> Voting Preparation. 
To ensure a fluid experience, we implemented a **Gemini-powered Intent Classifier**. Rather than strictly requiring rigid inputs like "yes" or "no", Gemini understands variations of user intent in natural language (e.g., "I'm 20", "I already got my card") and seamlessly routes them to the next state in the journey.

## ⚙️ How the Solution Works
1. **Context-Aware Chat**: The user interacts with the Civic Assistant. Depending on the user's current stage, the Node.js backend responds with specific, localized guidance.
2. **Intent Classification**: Every user message is securely analyzed by the Gemini 2.5 Flash model. It classifies the message into intents (`affirmative`, `negative`, `age`, `question`) to advance the state machine.
3. **Dynamic Sidebar & Timeline**: As the user progresses, the frontend updates a gamified visual timeline and surfaces relevant action cards (like a downloadable PDF checklist).
4. **Interactive EVM Simulation**: A built-in textual and visual walkthrough of polling day, ensuring first-time voters know exactly how to operate an EVM and verify their vote on a VVPAT.
5. **Post-Journey Unlock**: Once the core registration journey is completed, the restrictive state machine unlocks. The user can then ask any open-ended questions about the election, which are routed directly to Gemini for detailed, generative responses.
6. **Geolocation & Mapping**: Users can click "Find Polling Booth" to fetch their coordinates and instantly map it, complete with a quick-copy feature for Google Maps routing.

## 🌐 Google Services Integration
- **Google Gemini API**: Powers the core intelligence of the application. It acts as both a *Zero-Shot Intent Classifier* during the strict registration flow, and as a *Generative Q&A engine* for general civic education after the flow is complete.
- **Google Maps Ecosystem**: The application translates the user's browser geolocation into direct Google Maps search URLs, allowing them to route directly to their local polling booth on their mobile devices.

## 🛠️ Tech Stack
- **Frontend**: React (Vite), TypeScript, Framer Motion, Lucide React, Vanilla CSS (CSS Variables)
- **Backend**: Node.js, Express.js (Secured with Helmet, Rate Limiting, and restricted CORS)
- **Architecture**: RESTful API communicating with a Gemini-powered intent classifier and a conversational state machine.

## 🤔 Assumptions Made
- **User Device**: Users have access to modern browsers (desktop or mobile) and basic internet connectivity.
- **Language**: The initial MVP caters to English and Hindi users (`hi` translation dictionary implemented).
- **Session Handling**: For simplicity in this hackathon submission, session state is tied to the user's IP address rather than a fully authenticated user account.
- **Accuracy**: The checklist and timelines mirror the general process of the Election Commission of India (ECI), but real-world dates and forms are subject to change by the ECI.

## 🚀 Running the Project Locally

1. **Clone the repository** and navigate to the project folder.
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start both the Backend API and the Frontend Server**:
   You can run both concurrently by starting the node server in the background and vite in the foreground:
   ```bash
   node server.js & npm run dev
   ```
4. **Access the App**:
   Open [http://localhost:5173](http://localhost:5173) in your browser. The backend API runs on `http://localhost:3000`.

## 🔮 Future Roadmap (Scaling the Impact)
- **Deeper Google Gemini Integration**: The app currently uses Gemini for intent classification and post-journey Q&A. We plan to expand this to dynamically generate quizzes on local candidates and manifestos.
- **Google Maps API**: Integrating the official Google Maps Places API to help users physically locate their designated polling station with precise route guidance.
- **Voice Navigation**: Implementing Speech-to-Text and Text-to-Speech to make the assistant fully accessible to visually impaired voters.

---
*Built for the Hack2Skill x Google for Developers Hackathon.*

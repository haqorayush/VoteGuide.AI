import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const port = 3000;

// Initialize Gemini API (Will be null if key is missing)
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Add security headers
app.use(helmet());

// Apply rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Restrict CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Restrict to frontend origin
  methods: ['GET', 'POST']
}));
app.use(bodyParser.json());

// Simple state management (in a real app, this would be tied to a session/user ID in a DB)
const userStates = new Map();

const getUserState = (ip) => {
  if (!userStates.has(ip)) {
    userStates.set(ip, {
      age: null,
      location: null,
      has_voter_id: 'unknown',
      stage: 'unknown',
      simulation_step: null
    });
  }
  return userStates.get(ip);
};

const resetUserState = (ip) => {
  userStates.set(ip, {
    age: null,
    location: null,
    has_voter_id: 'unknown',
    stage: 'unknown',
    simulation_step: null
  });
};

const hindiDictionary = {
  "Hello! I am VoteGuide AI, your guide to the Indian election process. Let's get started. Are you 18 years or older?": "नमस्ते! मैं वोटगाइड एआई हूं, जो भारतीय चुनाव प्रक्रिया में आपका मार्गदर्शक है। क्या आप 18 वर्ष या उससे अधिक के हैं?",
  "Great, you are eligible to vote! Next step is to register for a Voter ID. Have you already applied for or received your Voter ID?": "बहुत बढ़िया, आप वोट देने के पात्र हैं! अगला कदम वोटर आईडी के लिए पंजीकरण करना है। क्या आपने अपना वोटर आईडी प्राप्त कर लिया है?",
  "Excellent! Since you are registered, your next step is to ensure your name is on the electoral roll. Have you checked the voter list recently?": "शानदार! चूंकि आप पंजीकृत हैं, आपका अगला कदम यह सुनिश्चित करना है कि आपका नाम मतदाता सूची में है। क्या आपने हाल ही में सूची देखी है?",
  "Perfect. You are ready to vote! Familiarize yourself with the candidates in your constituency, and remember your polling station location. Would you like to try a simulation of voting day?": "बिल्कुल सही। आप वोट देने के लिए तैयार हैं! क्या आप मतदान के दिन का सिमुलेशन आजमाना चाहेंगे?",
  "You are all set for voting day! Remember to bring your Voter ID or another approved photo ID. Would you like a walkthrough of the booth?": "आप मतदान के दिन के लिए पूरी तरह तैयार हैं! अपना वोटर आईडी लाना न भूलें। क्या आप बूथ का पूर्वाभ्यास चाहेंगे?",
  "Welcome to the Voting Day Simulation! First, you'll enter the polling booth. A polling officer will check your name on the voter list and ask for your ID. Do you have an approved ID ready?": "मतदान दिवस सिमुलेशन में आपका स्वागत है! सबसे पहले, आप मतदान केंद्र में प्रवेश करेंगे। क्या आपके पास एक अनुमोदित आईडी तैयार है?",
  "Great! Next, you will be directed to the voting compartment. You will see the Electronic Voting Machine (EVM) with blue buttons next to candidate names and symbols. Do you know how to cast your vote on it?": "बहुत बढ़िया! इसके बाद, आपको वोटिंग कम्पार्टमेंट में भेजा जाएगा। क्या आप जानते हैं कि ईवीएम पर अपना वोट कैसे डालना है?",
  "Excellent! You press the blue button, see the red light, hear the beep, and verify on the VVPAT. Simulation complete! You are fully prepared for the real day. Just reply 'voted' when you actually cast your vote!": "शानदार! सिमुलेशन पूरा हुआ! आप वास्तविक दिन के लिए पूरी तरह तैयार हैं।",
  "Congratulations on exercising your right to vote! Thank you for participating in the democratic process.": "अपने वोट देने के अधिकार का प्रयोग करने पर बधाई! लोकतांत्रिक प्रक्रिया में भाग लेने के लिए धन्यवाद।",
  "It looks like you are under 18 and currently not eligible to vote. You can apply once you turn 18. Would you still like to learn about how the process works for the future?": "ऐसा लगता है कि आप 18 वर्ष से कम हैं और वर्तमान में वोट देने के पात्र नहीं हैं। भविष्य के लिए प्रक्रिया सीखना चाहेंगे?",
  "No problem. You can apply online via the Voters' Service Portal using Form 6. I've brought up the checklist of documents you will need.": "कोई बात नहीं। आप फॉर्म 6 का उपयोग करके ऑनलाइन आवेदन कर सकते हैं। मैंने आवश्यक दस्तावेजों की चेकलिस्ट प्रदान कर दी है।",
  "Have you already applied for or received your Voter ID?": "क्या आपने अपना वोटर आईडी प्राप्त कर लिया है?",
  "I don't have access to your personal electoral records for privacy reasons. However, you can easily verify it yourself using the official portal. I've sent the link below.": "गोपनीयता कारणों से मेरे पास आपके रिकॉर्ड तक पहुंच नहीं है। आप आधिकारिक पोर्टल का उपयोग करके इसे स्वयं सत्यापित कर सकते हैं।",
  "Here is the link to the official Electoral Search portal. You can search by your EPIC (Voter ID) number. Let me know when you are done!": "यह आधिकारिक इलेक्टोरल सर्च पोर्टल का लिंक है। पूरा होने पर मुझे बताएं!",
  "It's important to check your name on the electoral roll before voting day, even if you have a card. You can do this on the official portal. Let me know once you've confirmed it.": "वोटिंग से पहले मतदाता सूची में अपना नाम जांचना महत्वपूर्ण है। आप इसे पोर्टल पर कर सकते हैं।",
  "You have already completed your election journey! Thank you for participating in the democratic process. If you would like to start over, just type 'restart'.": "आपने पहले ही अपनी चुनाव यात्रा पूरी कर ली है! यदि आप फिर से शुरू करना चाहते हैं, तो 'restart' टाइप करें।",
  "Remember, you must bring a valid ID like Voter ID, Aadhaar, or PAN. Once verified, you proceed to the EVM machine. Do you know how to cast your vote on the EVM?": "याद रखें, आपको एक वैध आईडी लानी होगी। सत्यापित होने के बाद, आप ईवीएम मशीन पर जाते हैं। क्या आप जानते हैं कि ईवीएम पर अपना वोट कैसे डालना है?",
  "It's simple: press the blue button next to your chosen candidate's symbol. A red light will glow, and you'll hear a beep. Check the VVPAT machine to see a printed slip of your vote for 7 seconds. Simulation complete! Reply 'voted' on election day!": "यह बहुत आसान है: अपने चुने हुए उम्मीदवार के चुनाव चिह्न के पास वाला नीला बटन दबाएँ। एक लाल बत्ती जलेगी और आपको एक 'बीप' की आवाज़ सुनाई देगी। VVPAT मशीन में देखें, आपको अपने वोट की एक पर्ची 7 सेकंड के लिए दिखाई देगी। अभ्यास पूरा हुआ! चुनाव के दिन 'voted' लिखकर जवाब दें!",
  "Here is the general timeline for the upcoming elections. Make sure you register before the cutoff date!": "आगामी चुनावों की सामान्य समयरेखा यहाँ दी गई है। कटऑफ तिथि से पहले पंजीकरण करना सुनिश्चित करें!",
  "If you don't have a standard address proof, you can use recent utility bills (water/electricity/gas), a bank/post office passbook, or a registered rent agreement. Are you ready to apply online via the Voters' Service Portal?": "यदि आपके पास पते का प्रमाण नहीं है, तो आप हाल के बिल या पासबुक का उपयोग कर सकते हैं। क्या आप आवेदन करने के लिए तैयार हैं?",
  "If you lack a birth certificate, you can use your 10th or 12th class mark sheet, PAN card, Aadhaar card, or a driving license as proof of age. Are you ready to apply?": "यदि आपके पास जन्म प्रमाण पत्र नहीं है, तो आप 10वीं/12वीं की मार्कशीट, पैन, आधार या ड्राइविंग लाइसेंस का उपयोग कर सकते हैं।",
  "If you are missing certain documents, the Election Commission accepts several alternatives. For example, Aadhaar can serve as both age and identity proof. Shall I bring up the checklist so you can apply?": "यदि कुछ दस्तावेज नहीं हैं, तो चुनाव आयोग कई विकल्पों को स्वीकार करता है। क्या मैं चेकलिस्ट लाऊं?",
  "Yes, I am 18+": "हाँ, मैं 18+ हूँ",
  "No, I am under 18": "नहीं, मैं 18 से कम हूँ",
  "Yes, I have it": "हाँ, मेरे पास है",
  "No, I need to apply": "नहीं, मुझे आवेदन करना है",
  "Yes, I checked": "हाँ, मैंने जाँच की है",
  "No, not yet": "नहीं, अभी नहीं",
  "Start Walkthrough": "वॉकथ्रू शुरू करें",
  "I have voted!": "मैंने वोट दे दिया है!",
  "Done, I applied!": "हो गया, मैंने आवेदन कर दिया!",
  "Restart Journey": "यात्रा फिर से शुरू करें",
  "Done, I checked": "हो गया, मैंने जाँच ली",
  "Show me the link": "मुझे लिंक दिखाएं",
  "Yes, I'm ready": "हाँ, मैं तैयार हूँ",
  "I need more info": "मुझे और जानकारी चाहिए",
  "Yes, tell me more": "हाँ, मुझे और बताएं",
  "No, thanks": "नहीं, धन्यवाद",
  "Yes, I know": "हाँ, मुझे पता है",
  "No, explain please": "नहीं, कृपया समझाएं",
  "I have my Voter ID": "मेरे पास मेरी वोटर आईडी है",
  "Yes, I have my ID": "हाँ, मेरे पास मेरी आईडी है",
  "No, I don't": "नहीं, मेरे पास नहीं है",
  "Registration Completion Message": "Congratulations! You have successfully completed your voter registration process.\n\nHere is what happens next:\n1. **Reference Number**: You will soon receive a Reference Number for your application on your registered mobile number or email ID.\n2. **Track Application Status**: You can track the status of your application online using this Reference Number. You can visit the National Voters' Service Portal (NVSP - nvsp.in) or use the Voter Helpline App. Click on the 'Track Application Status' option and enter your Reference Number.\n3. **Name in Electoral Roll**: Once your application is accepted, your name will be added to the electoral roll.\n4. **EPIC Card**: After that, your Voter ID Card (EPIC Card) will be sent to your address by post or you can obtain it through your Booth Level Officer (BLO).\n5. **Keep Checking**: It is always a good idea to keep checking your name in the voter list periodically or before elections to ensure your details are correct.\n\nCongratulations on taking an active role in India's democracy! Do vote and exercise your right.\n\nIf you have any more questions or need any further assistance, feel free to ask.",
  "Congratulations! You have successfully completed your voter registration process.\n\nHere is what happens next:\n1. **Reference Number**: You will soon receive a Reference Number for your application on your registered mobile number or email ID.\n2. **Track Application Status**: You can track the status of your application online using this Reference Number. You can visit the National Voters' Service Portal (NVSP - nvsp.in) or use the Voter Helpline App. Click on the 'Track Application Status' option and enter your Reference Number.\n3. **Name in Electoral Roll**: Once your application is accepted, your name will be added to the electoral roll.\n4. **EPIC Card**: After that, your Voter ID Card (EPIC Card) will be sent to your address by post or you can obtain it through your Booth Level Officer (BLO).\n5. **Keep Checking**: It is always a good idea to keep checking your name in the voter list periodically or before elections to ensure your details are correct.\n\nCongratulations on taking an active role in India's democracy! Do vote and exercise your right.\n\nIf you have any more questions or need any further assistance, feel free to ask.": "बधाई हो! आपने सफलतापूर्वक अपनी मतदाता पंजीकरण प्रक्रिया पूरी कर ली है।\n\nअब आगे क्या होगा, इसकी जानकारी यहाँ दी गई है:\n1. **संदर्भ संख्या (Reference Number)**: आपको जल्द ही आपके पंजीकृत मोबाइल नंबर या ईमेल आईडी पर आपके आवेदन का एक संदर्भ संख्या प्राप्त होगा।\n2. **आवेदन की स्थिति ट्रैक करें**: आप इस संदर्भ संख्या का उपयोग करके अपने आवेदन की स्थिति को ऑनलाइन ट्रैक कर सकते हैं। इसके लिए आप राष्ट्रीय मतदाता सेवा पोर्टल (NVSP – nvsp.in) पर जा सकते हैं या वोटर हेल्पलाइन ऐप (Voter Helpline App) का उपयोग कर सकते हैं। 'ट्रैक एप्लीकेशन स्टेटस' (Track Application Status) विकल्प पर क्लिक करके अपना संदर्भ संख्या दर्ज करें।\n3. **मतदाता सूची में नाम**: एक बार जब आपका आवेदन स्वीकृत हो जाता है, तो आपका नाम मतदाता सूची में जोड़ दिया जाएगा।\n4. **मतदाता पहचान पत्र (EPIC Card)**: इसके बाद आपको आपका मतदाता पहचान पत्र (EPIC Card) डाक द्वारा आपके पते पर भेज दिया जाएगा या आप इसे अपने बूथ स्तर अधिकारी (BLO) के माध्यम से प्राप्त कर सकते हैं।\n5. **जाँच करते रहें**: चुनावों से पहले या समय-समय पर मतदाता सूची में अपना नाम जांचते रहना हमेशा एक अच्छा विचार है ताकि यह सुनिश्चित हो सके कि आपका नाम सही है।\n\nभारत के लोकतंत्र में एक सक्रिय भूमिका निभाने के लिए आपको बहुत-बहुत बधाई! मतदान अवश्य करें और अपने अधिकार का प्रयोग करें।\n\nयदि आपके कोई और प्रश्न हैं या आपको किसी और सहायता की आवश्यकता है, तो बेझिझक पूछें।"
};

const fallbackOrGemini = async (message, language, fallbackResponse) => {
  // Only allow Gemini to answer when the user has completed the full journey
  if (ai && message.trim() !== '' && fallbackResponse.stage === 'completed') {
    try {
      const langPrompt = language === 'hi' ? "Keep your answer entirely in Hindi." : "Keep your answer in English.";
      const aiResponse = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: `You are VoteGuide AI, an assistant helping an Indian citizen with the election process. ${langPrompt} Keep your answer brief, friendly, and helpful (max 3 sentences). User asks: ${message}`
      });
      return {
        message: aiResponse.text,
        stage: fallbackResponse.stage,
        next_step: 'gemini_answered',
        actions: fallbackResponse.actions
      };
    } catch (err) {
      console.error("Gemini API Error:", err);
      return fallbackResponse;
    }
  }
  return fallbackResponse;
};

// Use Gemini to classify intent so natural language advances the form
const classifyIntent = async (message, currentStage) => {
  if (!ai) return { intent: 'unknown', value: null };

  const stageContext = {
    'unknown': 'The bot just asked if the user is 18 years or older.',
    'eligible_not_registered': 'The bot just asked if the user has already applied for or received a Voter ID.',
    'registered': 'The bot just asked if the user has checked their name on the electoral roll.',
    'ready_to_vote': 'The bot asked if the user is ready for voting day or wants a booth simulation walkthrough.',
    'not_eligible': 'The user is under 18 and not eligible. The bot asked if they want to learn about the process.',
    'completed': 'The user has completed the journey.',
  };

  const prompt = `You are a classification assistant for VoteGuide AI. Context: ${stageContext[currentStage] || 'Unknown stage.'}

User message: "${message}"

Classify this message into exactly ONE of these intents and respond with ONLY a JSON object with no extra text:
- {"intent": "affirmative"} — User is saying yes, confirming, agreeing, or providing a positive answer to the bot's question (e.g. 'yes', 'I am 25', 'I have it', 'I got my card', 'sure', 'done', 'checked it', 'yep', 'absolutely')
- {"intent": "negative"} — User is saying no, denying, or providing a negative answer (e.g. 'no', 'not yet', 'I don't have it', 'I haven't applied')
- {"intent": "age", "value": NUMBER} — User is providing their age explicitly (e.g. 'I am 20 years old', 'I'm 17', '25 years')
- {"intent": "question"} — User is asking a general knowledge question unrelated to the current step (e.g. 'what is lok sabha?', 'how many seats in parliament?', 'what is EVM?')
- {"intent": "unknown"} — Cannot be determined`;

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: { temperature: 0 }
    });
    const text = result.text.trim().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch (e) {
    console.error('Intent classification error:', e.message);
    return { intent: 'unknown', value: null };
  }
};

const getChatResponse = async (message, language, ip) => {
  const msg = message.toLowerCase();
  let userState = getUserState(ip);

  // Reset/Restart
  if (msg.includes('restart') || msg.includes('start over') || (msg.includes('यात्रा') && msg.includes('शुरू'))) {
    resetUserState(ip);
    return {
      message: "Hello! I am VoteGuide AI, your guide to the Indian election process. Let's get started. Are you 18 years or older?",
      stage: 'unknown',
      next_step: 'confirm_age',
      actions: [],
      suggestions: ['Yes, I am 18+', 'No, I am under 18']
    };
  }

  // Handle Simulation Mode Steps
  if (userState.simulation_step) {
    if (userState.simulation_step === 'id_check') {
      userState.simulation_step = 'evm_machine';
      const isAffirmativeInput = msg.includes('yes') || msg.includes('i have') || msg.includes('yep') || msg.includes('हाँ') || msg.includes('हा') || msg.includes('मेरे पास है');
      if (isAffirmativeInput) {
        return {
          message: "Great! Next, you will be directed to the voting compartment. You will see the Electronic Voting Machine (EVM) with blue buttons next to candidate names and symbols. Do you know how to cast your vote on it?",
          stage: 'ready_to_vote',
          next_step: 'simulation_evm',
          actions: [],
          suggestions: ['Yes, I know', 'No, explain please']
        };
      } else {
        return await fallbackOrGemini(message, language, {
          message: "Remember, you must bring a valid ID like Voter ID, Aadhaar, or PAN. Once verified, you proceed to the EVM machine. Do you know how to cast your vote on the EVM?",
          stage: 'ready_to_vote',
          next_step: 'simulation_evm',
          actions: [],
          suggestions: ['Yes, I know', 'No, explain please']
        });
      }
    } else if (userState.simulation_step === 'evm_machine') {
      userState.simulation_step = null; // End simulation
      const isAffirmativeInput = msg.includes('yes') || msg.includes('i know') || msg.includes('yep') || msg.includes('yeah') || msg.includes('ok') || msg.includes('हाँ') || msg.includes('पता है') || msg.includes('ठीक');
      if (isAffirmativeInput) {
        return {
          message: "Excellent! You press the blue button, see the red light, hear the beep, and verify on the VVPAT. Simulation complete! You are fully prepared for the real day. Just reply 'voted' when you actually cast your vote!",
          stage: 'ready_to_vote',
          next_step: 'simulation_complete',
          actions: [],
          suggestions: ['I have voted!', 'Start Walkthrough']
        };
      } else {
        return await fallbackOrGemini(message, language, {
          message: "It's simple: press the blue button next to your chosen candidate's symbol. A red light will glow, and you'll hear a beep. Check the VVPAT machine to see a printed slip of your vote for 7 seconds. Simulation complete! Reply 'voted' on election day!",
          stage: 'ready_to_vote',
          next_step: 'simulation_complete',
          actions: [],
          suggestions: ['I have voted!', 'Start Walkthrough']
        });
      }
    }
  }

  // Handle Simulation Mode Trigger
  if (msg.includes('start_simulation') || msg.includes('simulate') || msg.includes('how to vote on voting day') || msg.includes('start walkthrough') || msg.includes('वॉकथ्रू') || msg.includes('शुरू')) {
    userState.simulation_step = 'id_check';
    return {
      message: "Welcome to the Voting Day Simulation! First, you'll enter the polling booth. A polling officer will check your name on the voter list and ask for your ID. Do you have an approved ID ready?",
      stage: 'ready_to_vote',
      next_step: 'simulation_id_check',
      actions: [{ type: 'ui_action', name: 'start_simulation' }],
      suggestions: ['Yes, I have my ID', 'No, I don\'t']
    };
  }

  // Handle Timeline Mode
  if (msg.includes('show_timeline') || msg.includes('dates') || msg.includes('when')) {
    return {
      message: "Here is the general timeline for the upcoming elections. Make sure you register before the cutoff date!",
      stage: userState.stage, // Keep current stage
      next_step: 'review_timeline',
      actions: [{ type: 'ui_action', name: 'show_timeline' }]
    };
  }

  // Classify intent using Gemini before stage-specific logic
  const intentResult = await classifyIntent(message, userState.stage);
  console.log(`[Intent] Stage: ${userState.stage} | Message: "${message}" | Intent: ${JSON.stringify(intentResult)}`);

  // Keyword fallbacks — always work even if Gemini intent classifier returns 'unknown'
  const affirmativeKeywords = ['yes', 'yeah', 'yep', 'yup', 'sure', 'okay', 'ok', 'done',
    'correct', 'absolutely', 'of course', 'definitely', 'indeed', 'affirmative',
    'checked', 'confirmed', 'i have', 'i do', 'i got', 'already',
    'हाँ', 'हा', 'सहीं', 'ठीक', 'किया', 'हो गया', 'जी हाँ', 'पास है', 'पता है', 'वोट दे दिया'];
  const negativeKeywords = ['no', 'nope', 'nah', 'not yet', 'haven\'t', 'don\'t have',
    'do not have', 'not done', 'i don\'t', 'i have not', 'negative',
    'नहीं', 'नही', 'नहीं किया', 'अभी नहीं', 'जी नहीं', 'नहीं पता'];

  const keywordAffirmative = affirmativeKeywords.some(k => msg.includes(k));
  const keywordNegative = negativeKeywords.some(k => msg.includes(k));

  const isAffirmative = intentResult.intent === 'affirmative' || (intentResult.intent === 'unknown' && keywordAffirmative && !keywordNegative);
  const isNegative = intentResult.intent === 'negative' || (intentResult.intent === 'unknown' && keywordNegative);
  const isQuestion = intentResult.intent === 'question';
  const isAge = intentResult.intent === 'age';
  const userAge = isAge ? intentResult.value : null;

  // If Gemini is sure it's a question, gate it based on stage
  if (isQuestion) {
    if (userState.stage === 'completed') {
      // Stage is completed — Gemini is unlocked, answer freely
      return await fallbackOrGemini(message, language, {
        message: "I'm not sure how to answer that.",
        stage: 'completed',
        next_step: 'gemini_answered',
        actions: []
      });
    } else {
      // Still in the form — block AI and nudge the user
      const nudgeMsg = language === 'hi'
        ? "🤖 AI सहायक केवल आपकी पूरी चुनाव यात्रा समाप्त होने के बाद उपलब्ध होगा। कृपया पहले अपनी यात्रा पूरी करें!"
        : "🤖 AI-powered Q&A unlocks after you complete your election journey! Please continue with the process — I'll be able to answer all your questions at the end.";
      return {
        message: nudgeMsg,
        stage: userState.stage,
        next_step: 'continue',
        actions: []
      };
    }
  }

  // Current Stage: unknown (usually means we need to check age)
  if (userState.stage === 'unknown') {
    const ageNum = userAge || parseInt(msg);
    if (isAffirmative || (ageNum >= 18)) {
      userState.stage = 'eligible_not_registered';
      userState.age = ageNum || 18;
      return {
        message: "Great, you are eligible to vote! Next step is to register for a Voter ID. Have you already applied for or received your Voter ID?",
        stage: 'eligible_not_registered',
        next_step: 'check_voter_id',
        actions: [],
        suggestions: ['Yes, I have it', 'No, I need to apply']
      };
    } else if (isNegative || (ageNum > 0 && ageNum < 18)) {
      userState.stage = 'not_eligible';
      userState.age = ageNum || null;
      return {
        message: "It looks like you are under 18 and currently not eligible to vote. You can apply once you turn 18. Would you still like to learn about how the process works for the future?",
        stage: 'not_eligible',
        next_step: 'offer_education',
        actions: [],
        suggestions: ['Yes, tell me more', 'No, thanks']
      };
    } else {
      return await fallbackOrGemini(message, language, {
        message: "Hello! I am VoteGuide AI, your guide to the Indian election process. Let's get started. Are you 18 years or older?",
        stage: 'unknown',
        next_step: 'confirm_age',
        actions: [],
        suggestions: ['Yes, I am 18+', 'No, I am under 18']
      });
    }
  }

  // Current Stage: eligible_not_registered (Checking Voter ID status)
  if (userState.stage === 'eligible_not_registered') {
    if (isAffirmative || msg.includes('i have it') || msg.includes('already')) {
      userState.stage = 'registered';
      userState.has_voter_id = 'yes';
      return {
        message: "Excellent! Since you are registered, your next step is to ensure your name is on the electoral roll. Have you checked the voter list recently?",
        stage: 'registered',
        next_step: 'check_electoral_roll',
        actions: [],
        suggestions: ['Yes, I checked', 'No, not yet']
      };
    } else if (isNegative || msg.includes('do not have') || msg.includes("don't have") || (msg.includes('no') && msg.includes('proof')) || msg.includes('without') || msg.includes('missing') || msg.includes('lack')) {
      if (msg.includes('address')) {
        return {
          message: "If you don't have a standard address proof, you can use recent utility bills (water/electricity/gas), a bank/post office passbook, or a registered rent agreement. Are you ready to apply online via the Voters' Service Portal?",
          stage: 'eligible_not_registered',
          next_step: 'apply_voter_id',
          actions: [{ type: 'ui_action', name: 'show_checklist' }],
          suggestions: ['Yes, I\'m ready', 'I need more info']
        };
      } else if (msg.includes('age') || msg.includes('birth')) {
        return {
          message: "If you lack a birth certificate, you can use your 10th or 12th class mark sheet, PAN card, Aadhaar card, or a driving license as proof of age. Are you ready to apply?",
          stage: 'eligible_not_registered',
          next_step: 'apply_voter_id',
          actions: [{ type: 'ui_action', name: 'show_checklist' }],
          suggestions: ['Yes, I\'m ready', 'I need more info']
        };
      } else if (msg.includes('applied') || msg.includes('ho gaya') || msg.includes('kar diya')) {
        userState.stage = 'registered';
        return {
          message: "Congratulations! You have successfully completed your voter registration process.\n\nHere is what happens next:\n1. **Reference Number**: You will soon receive a Reference Number for your application on your registered mobile number or email ID.\n2. **Track Application Status**: You can track the status of your application online using this Reference Number. You can visit the National Voters' Service Portal (NVSP - nvsp.in) or use the Voter Helpline App. Click on the 'Track Application Status' option and enter your Reference Number.\n3. **Name in Electoral Roll**: Once your application is accepted, your name will be added to the electoral roll.\n4. **EPIC Card**: After that, your Voter ID Card (EPIC Card) will be sent to your address by post or you can obtain it through your Booth Level Officer (BLO).\n5. **Keep Checking**: It is always a good idea to keep checking your name in the voter list periodically or before elections to ensure your details are correct.\n\nCongratulations on taking an active role in India's democracy! Do vote and exercise your right.\n\nIf you have any more questions or need any further assistance, feel free to ask.",
          stage: 'registered',
          next_step: 'check_electoral_roll',
          actions: [],
          suggestions: ['Done, I checked', 'Show me the link']
        };
      } else {
        return {
          message: "No problem. You can apply online via the Voters' Service Portal using Form 6. I've brought up the checklist of documents you will need.",
          stage: 'eligible_not_registered',
          next_step: 'apply_voter_id',
          actions: [{ type: 'ui_action', name: 'show_checklist' }],
          suggestions: ['Done, I applied!', 'I have my Voter ID']
        };
      }
    } else {
      return await fallbackOrGemini(message, language, {
        message: "Have you already applied for or received your Voter ID?",
        stage: 'eligible_not_registered',
        next_step: 'check_voter_id',
        actions: [],
        suggestions: ['Yes, I have it', 'No, I need to apply']
      });
    }
  }

  // Current Stage: registered (Checking Electoral Roll)
  if (userState.stage === 'registered') {
    if (isAffirmative || msg.includes('checked') || msg.includes('done')) {
      userState.stage = 'ready_to_vote';
      return {
        message: "Perfect. You are ready to vote! Familiarize yourself with the candidates in your constituency, and remember your polling station location. Would you like to try a simulation of voting day?",
        stage: 'ready_to_vote',
        next_step: 'prepare_for_voting',
        actions: [{ type: 'ui_action', name: 'offer_simulation' }],
        suggestions: ['Start Walkthrough', 'I have voted!']
      };
    } else if (isNegative || msg.includes('check for me') || msg.includes('confirm it') || msg.includes('you check') || msg.includes('check it')) {
      return {
        message: "I don't have access to your personal electoral records for privacy reasons. However, you can easily verify it yourself using the official portal. I've sent the link below.",
        stage: 'registered',
        next_step: 'check_electoral_roll',
        actions: [{ type: 'ui_action', name: 'show_electoral_roll_link' }],
        suggestions: ['Done, I checked', 'Show me the link']
      };
    } else if (msg.includes('link') || msg.includes('where') || msg.includes('portal')) {
      return {
        message: "Here is the link to the official Electoral Search portal. You can search by your EPIC (Voter ID) number. Let me know when you are done!",
        stage: 'registered',
        next_step: 'check_electoral_roll',
        actions: [{ type: 'ui_action', name: 'show_electoral_roll_link' }],
        suggestions: ['Done, I checked']
      };
    } else {
      return await fallbackOrGemini(message, language, {
        message: "It's important to check your name on the electoral roll before voting day, even if you have a card. You can do this on the official portal. Let me know once you've confirmed it.",
        stage: 'registered',
        next_step: 'check_electoral_roll',
        actions: [{ type: 'ui_action', name: 'show_electoral_roll_link' }],
        suggestions: ['Yes, I checked', 'No, not yet']
      });
    }
  }

  // Current Stage: ready_to_vote
  if (userState.stage === 'ready_to_vote') {
    if (isAffirmative || msg.includes('voted') || msg.includes('done') || msg.includes('वोट') || msg.includes('दे दिया')) {
      userState.stage = 'completed';
      return {
        message: "Congratulations on exercising your right to vote! Thank you for participating in the democratic process.",
        stage: 'completed',
        next_step: 'none',
        actions: [{ type: 'ui_action', name: 'show_celebration' }],
        suggestions: ['Restart Journey']
      };
    }
    return await fallbackOrGemini(message, language, {
      message: "You are all set for voting day! Remember to bring your Voter ID or another approved photo ID. Would you like a walkthrough of the booth?",
      stage: 'ready_to_vote',
      next_step: 'go_vote',
      actions: [{ type: 'ui_action', name: 'offer_simulation' }],
      suggestions: ['Start Walkthrough', 'I have voted!']
    });
  }

  // Current Stage: completed — Gemini is now fully unlocked
  if (userState.stage === 'completed') {
    const langPrompt = language === 'hi' ? "Keep your answer entirely in Hindi." : "Keep your answer in English.";
    if (ai) {
      try {
        const aiResponse = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: `You are VoteGuide AI, an expert assistant on the Indian election process. The user has just completed their full voter registration journey. ${langPrompt} Answer their question helpfully and clearly. User says: ${message}`
        });
        return {
          message: aiResponse.text,
          stage: 'completed',
          next_step: 'gemini_answered',
          actions: []
        };
      } catch (err) {
        console.error("Gemini API Error:", err);
      }
    }
    return {
      message: "You have completed your election journey! If you would like to start over, just type 'restart'.",
      stage: 'completed',
      next_step: 'none',
      actions: []
    };
  }

  // Absolute default fallback if somehow stage is missing
  return await fallbackOrGemini(message, language, {
    message: "Hello! I am VoteGuide AI, your guide to the Indian election process. Let's get started. Are you 18 years or older?",
    stage: 'unknown',
    next_step: 'confirm_age',
    actions: []
  });
};

app.post('/api/chat', async (req, res) => {
  const { message, language } = req.body;
  const lang = language || "en";
  const clientIp = req.ip || req.connection.remoteAddress;
  const response = await getChatResponse(message || "", lang, clientIp);

  if (lang === 'hi') {
    if (hindiDictionary[response.message]) {
      response.message = hindiDictionary[response.message];
    }
    if (response.suggestions && Array.isArray(response.suggestions)) {
      response.suggestions = response.suggestions.map(s => hindiDictionary[s] || s);
    }
  }

  res.json(response);
});

// Dedicated AI Chat endpoint — free-form Gemini Q&A (no state machine)
app.post('/api/ai-chat', async (req, res) => {
  const { message, language } = req.body;
  const lang = language || 'en';
  const langPrompt = lang === 'hi' ? 'Keep your answer entirely in Hindi.' : 'Keep your answer in English.';

  if (!ai) {
    return res.json({ message: 'AI Assistant is not available. Please add a GEMINI_API_KEY to enable this feature.' });
  }

  try {
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: `You are VoteGuide AI, an expert assistant on the Indian election process, voting rights, democracy, and civic education. ${langPrompt} Answer the user's question helpfully, clearly, and concisely (max 4-5 sentences). If the question is completely unrelated to elections or civics, politely redirect them. User asks: ${message}`
    });
    res.json({ message: aiResponse.text });
  } catch (err) {
    console.error('AI Chat Error:', err.message);
    res.json({ message: 'Sorry, I encountered an error processing your question. Please try again.' });
  }
});

app.get('/api/state', (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  res.json(getUserState(clientIp));
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`VoteGuide AI API running on http://localhost:${port}`);
  });
}

export default app;

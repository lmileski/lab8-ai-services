/**
 * Eliza-style Pattern Matching Module
 *
 * This module provides simple pattern matching for chatbot responses.
 * Import this module to use the getBotResponse() function in your chat implementations.
 *
 * Usage:
 *   import { getBotResponse } from './eliza.js';
 *   const response = getBotResponse("Hello there!");
 */

// Eliza-style response patterns
const patterns = [
  {
    pattern: /hello|hi|hey|howdy/i,
    responses: [
      "Hello! How are you doing today?",
      "Hi there! What's on your mind?",
      "Hey! How can I help you?",
      "Howdy! What would you like to talk about?"
    ]
  },
  {
    pattern: /how are you/i,
    responses: [
      "I'm just a program, but I'm functioning well! How are you?",
      "I'm doing great! Thanks for asking. How about you?",
      "I'm here and ready to chat! How are you feeling?"
    ]
  },
  {
    pattern: /help|what can you do/i,
    responses: [
      "I'm a simple chatbot built with Eliza-style pattern matching. I can respond to your messages based on keywords. Try asking me questions!",
      "I can have a basic conversation with you. Ask me anything and I'll do my best to respond!",
      "I use pattern matching to respond to your messages. Try different phrases and see how I react!"
    ]
  },
  {
    pattern: /your name|who are you/i,
    responses: [
      "I'm a simple chat assistant, built to demonstrate component-based thinking!",
      "I'm a chatbot created for educational purposes. Nice to meet you!",
      "You can call me ChatBot. I'm here to demonstrate different web component approaches."
    ]
  },
  {
    pattern: /\b(why|how|what|when|where|who)\b.*\?/i,
    responses: [
      "That's an interesting question. What do you think?",
      "I'm not sure I have a good answer for that. Can you tell me more?",
      "Hmm, that's thought-provoking. What's your perspective on it?",
      "Good question! What led you to ask about that?"
    ]
  },
  {
    pattern: /sorry|apologize/i,
    responses: [
      "No need to apologize! Everything's fine.",
      "It's okay! No worries at all.",
      "Don't worry about it. We're all good!"
    ]
  },
  {
    pattern: /thank you|thanks/i,
    responses: [
      "You're welcome! Happy to help!",
      "No problem at all!",
      "Glad I could help! Is there anything else you'd like to know?"
    ]
  },
  {
    pattern: /bye|goodbye|see you|farewell/i,
    responses: [
      "Goodbye! It was nice chatting with you!",
      "See you later! Have a great day!",
      "Farewell! Come back anytime!",
      "Bye! Take care!"
    ]
  },
  {
    pattern: /\b(yes|yeah|yep|sure|okay|ok)\b/i,
    responses: [
      "Great! What would you like to talk about?",
      "Awesome! Tell me more.",
      "Cool! What's next?"
    ]
  },
  {
    pattern: /\b(no|nope|nah)\b/i,
    responses: [
      "Okay, no problem! What else is on your mind?",
      "Fair enough. Is there something else you'd like to discuss?",
      "I understand. What would you like to talk about instead?"
    ]
  },
  {
    pattern: /I am (.*)/i,
    responses: [
      "How long have you been $1?",
      "Why do you think you are $1?",
      "How does being $1 make you feel?"
    ]
  },
  {
    pattern: /I feel (.*)/i,
    responses: [
      "Why do you feel $1?",
      "How often do you feel $1?",
      "What makes you feel $1?"
    ]
  },
  {
    pattern: /I think (.*)/i,
    responses: [
      "What makes you think $1?",
      "Why do you believe $1?",
      "Tell me more about why you think $1."
    ]
  }
];

// Default responses when no pattern matches
const defaultResponses = [
  "Tell me more about that.",
  "I see. Can you elaborate?",
  "That's interesting. What else?",
  "Go on, I'm listening.",
  "How does that make you feel?",
  "What do you mean by that?",
  "Can you explain that a bit more?"
];

/**
 * Get a bot response using Eliza-style pattern matching
 * @param {string} message - User's message
 * @returns {string} - Bot's response
 */
export function getBotResponse(message) {
  // Check each pattern
  for (let i = 0; i < patterns.length; i++) {
    const match = message.match(patterns[i].pattern);
    if (match) {
      // Get a random response from the matched pattern
      const responses = patterns[i].responses;
      let response = responses[Math.floor(Math.random() * responses.length)];

      // Replace captured groups (e.g., $1, $2) with matched text
      if (match.length > 1) {
        for (let j = 1; j < match.length; j++) {
          response = response.replace('$' + j, match[j]);
        }
      }

      return response;
    }
  }

  // If no pattern matched, return a default response
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}
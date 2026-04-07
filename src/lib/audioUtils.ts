import { BallEvent } from '../types/cricket';

export const getHypeCommentary = (ball: BallEvent) => {
  if (ball.isWicket) return "Khatam! Tata! Bye Bye! 💀 Gaya Bhai 🚶‍♂️";
  if (ball.runs === 6) return "Bawaal 6! 🚀🔥 Khatarnak Chhakka!";
  if (ball.runs === 4) return "Chauka! 💥 Boundary paar!";
  if (ball.isExtra) return "Faltu Ball! 🙄 (Extra)";
  if (ball.runs === 0) return "Shanti 🤫 Dot Ball";
  return `${ball.runs} Run(s) 🏏`;
};

export const speakHype = (text: string) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  
  // Cancel any ongoing speech
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'hi-IN';
  utterance.rate = 1.1;
  
  // Some browsers require a user gesture to start speech synthesis
  // We'll try to speak, but it might be blocked initially
  window.speechSynthesis.speak(utterance);
};

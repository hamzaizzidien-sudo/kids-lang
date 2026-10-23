import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// UI language (English UK at launch), separate from the target language (CLAUDE.md §7).
// Every line here is spoken to the child; text is for grown-ups and screen readers.
export const enGB = {
  profiles: { title: "Who's playing?", add: "Add a child", grownUps: "Grown-ups" },
  language: { title: "Which language shall we learn?" },
  world: { intro: "Let's explore {{unit}}!", soon: "Coming soon", home: "Back to players" },
  units: {
    "hello-goodbye": "Hello and goodbye",
    colours: "Colours",
    numbers: "Numbers",
    animals: "Animals",
    family: "Family",
    "food-fruit": "Food and fruit",
    body: "My body",
    clothes: "Clothes",
    toys: "Toys",
    feelings: "Feelings",
  },
  lesson: {
    listenTap: "Can you find…",
    dragMatch: "Listen, and drag each word to its picture!",
    sayIt: "Can you say…",
    sayItTurn: "Your turn! Tap the microphone and say it.",
    correct: ["Yes!", "Well done!", "Brilliant!", "You did it!"],
    oops: "Oops! Try again!",
    exit: "Hold to leave",
  },
  reward: {
    sticker: "You earned a sticker!",
    world: "Your {{unit}} world is growing!",
    goodbye: "Bye bye! See you soon!",
    home: "Back to the map",
  },
  parent: {
    gateTitle: "Grown-ups only",
    gateQuestion: "Tap the number fifty-seven",
    settings: "Settings",
    language: "Language",
    players: "Players",
    addPlayer: "Add a player",
    nickname: "Nickname",
    nicknameHint: "Please use a nickname, not a real name.",
    avatar: "Character",
    save: "Save",
    delete: "Delete",
    resetProgress: "Reset progress",
    cast: "Cast gallery (dev)",
    done: "Done",
  },
};

void i18n.use(initReactI18next).init({
  lng: "en-GB",
  fallbackLng: "en-GB",
  resources: { "en-GB": { translation: enGB } },
  interpolation: { escapeValue: false },
  returnObjects: true,
});

export default i18n;

// Daily writing prompts. Everyone sees the same one each day; writers can
// shuffle for another.
export const PROMPTS = [
  "Write about a room you can only return to in memory.",
  "Begin with the last thing someone said to you today.",
  "A letter to the person you were five years ago.",
  "Describe a colour to someone who has never seen it.",
  "Write the poem your hands would write if they could.",
  "Something small you lost, and what it took with it.",
  "The weather inside a long silence.",
  "Write about a kitchen at night.",
  "An apology to an object you've neglected.",
  "What the window has seen that you haven't.",
  "A love poem with no mention of love.",
  "Begin every line with “Today”.",
  "The sound of your street at 3 a.m.",
  "A map of a place that doesn't exist.",
  "Write from the point of view of a coat left on a train.",
  "Something your grandmother knew without being told.",
  "A list of everything the rain touched this morning.",
  "The moment just before you said yes.",
  "Write about a name you've stopped saying out loud.",
  "What would you keep if the house were made of water?",
  "Three things you've never told the moon.",
  "A field guide to one ordinary feeling.",
  "The first warm day after a long winter.",
  "Write about hands — yours, or someone else's.",
  "A conversation you rehearse but never have.",
  "The smell that takes you home.",
  "Write a poem that ends in the middle of a sentence.",
  "Something growing where it shouldn't.",
  "The quietest thing that has ever changed your mind.",
  "Describe a goodbye without using the word.",
  "A poem for the version of you that stayed.",
];

export function promptOfTheDay(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - start) / 86400000);
  return PROMPTS[dayOfYear % PROMPTS.length];
}

export function randomPrompt(except) {
  const options = PROMPTS.filter((p) => p !== except);
  return options[Math.floor(Math.random() * options.length)];
}

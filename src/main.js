import { GuardrailsGame } from "./game.js";

const canvas = document.querySelector("#gameCanvas");
const game = new GuardrailsGame(canvas, {
  meters: document.querySelector("#meters"),
  stageLine: document.querySelector("#stageLine"),
  messageLog: document.querySelector("#messageLog"),
  guardrailButton: document.querySelector("#guardrailButton"),
  kidButton: document.querySelector("#kidButton"),
  pauseButton: document.querySelector("#pauseButton")
});

window.__guardrailsGame = game;

const holdOptions = { passive: false };

const bindHold = (button, input) => {
  const on = (event) => {
    event.preventDefault();
    if (button.setPointerCapture) {
      try {
        button.setPointerCapture(event.pointerId);
      } catch {
        // Some mobile browsers reject capture during synthetic pointer events.
      }
    }
    game.setInput(input, true);
  };
  const off = (event) => {
    event.preventDefault();
    if (button.releasePointerCapture) {
      try {
        button.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore double-release after pointer cancellation.
      }
    }
    game.setInput(input, false);
  };
  button.addEventListener("pointerdown", on, holdOptions);
  button.addEventListener("pointerup", off, holdOptions);
  button.addEventListener("pointercancel", off, holdOptions);
};

bindHold(document.querySelector("#leftButton"), "left");
bindHold(document.querySelector("#rightButton"), "right");
bindHold(document.querySelector("#fastButton"), "fast");
bindHold(document.querySelector("#slowButton"), "slow");

document.querySelector("#guardrailButton").addEventListener("click", () => game.buildGuardrail());
document.querySelector("#kidButton").addEventListener("click", () => game.addKid());
document.querySelector("#pauseButton").addEventListener("click", () => game.togglePause());

const keys = new Map([
  ["ArrowLeft", "left"],
  ["a", "left"],
  ["ArrowRight", "right"],
  ["d", "right"],
  ["ArrowUp", "fast"],
  ["w", "fast"],
  ["ArrowDown", "slow"],
  ["s", "slow"]
]);

window.addEventListener("keydown", (event) => {
  const input = keys.get(event.key);
  if (input) {
    event.preventDefault();
    game.setInput(input, true);
  }
  if ((event.key === " " || event.key === "p") && !event.repeat) {
    event.preventDefault();
    game.togglePause();
  }
  if (event.key === "g" && !event.repeat) game.buildGuardrail();
  if (event.key === "k" && !event.repeat) game.addKid();
});

window.addEventListener("keyup", (event) => {
  const input = keys.get(event.key);
  if (input) {
    event.preventDefault();
    game.setInput(input, false);
  }
});

game.updateUi(true);
game.loop();

import { STAGES, getStage, getStageProgress } from "./systems/stages.js";
import { createInfluence, influencePush } from "./systems/influences.js";
import { createEvent, createObjective, applyEventMitigation } from "./systems/events.js";
import { createChild, createPendingKid, updateChild, childMeter } from "./systems/children.js";
import {
  applyMeterDelta,
  calculatePurposeGain,
  clamp,
  createMeters,
  guardrailDamageReduction,
  resourcePressureCost
} from "./systems/scoring.js";

const COLORS = {
  asphalt: "#30343b",
  asphaltLine: "#f2d264",
  shoulder: "#70836d",
  offroad: "#435248",
  rail: "#d7dde8",
  player: "#f4f1e8",
  playerEdge: "#1f2329",
  parent: "#4c78a8",
  resource: "#70b77e",
  warning: "#d65f5f",
  purpose: "#f2a65a",
  child: "#9fd3c7"
};

export class GuardrailsGame {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = ui;
    this.width = canvas.width;
    this.height = canvas.height;
    this.pixelRatio = 1;
    this.input = { left: false, right: false, fast: false, slow: false, childInfluence: 0 };
    this.paused = false;
    this.startedAt = performance.now();
    this.lastTime = performance.now();
    this.messages = [];
    this.lastUiRenderAt = 0;
    this.lastMetersHtml = "";
    this.lastStageLine = "";
    this.reset();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  reset() {
    this.age = 0;
    this.worldY = 0;
    this.speed = 1.04;
    this.player = { x: this.width * 0.5, vx: 0 };
    this.meters = createMeters();
    this.objects = [];
    this.influences = [];
    this.children = [];
    this.pendingKids = [];
    this.floaters = [];
    this.nextObjectiveAt = 320;
    this.nextInfluenceAt = 240;
    this.nextEventAt = 900;
    this.nextUnexpectedKidAt = 6200;
    this.stage = getStage(this.age);
    this.stageSeen = new Set([this.stage.id]);
    this.pushMessage("Childhood: dependence. Parents help, but imperfectly.");
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const rawRatio = window.devicePixelRatio || 1;
    const mobile = rect.width < 700;
    const ratio = Math.min(rawRatio, mobile ? 1.25 : 1.6);
    const targetWidth = Math.max(320, Math.floor(rect.width * ratio));
    const targetHeight = Math.max(420, Math.floor(rect.height * ratio));
    if (this.canvas.width !== targetWidth || this.canvas.height !== targetHeight) {
      const previousWidth = this.width || targetWidth;
      const scaleX = targetWidth / previousWidth;
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
      this.width = targetWidth;
      this.height = targetHeight;
      this.pixelRatio = ratio;
      if (this.player) this.player.x *= scaleX;
      for (const object of [...(this.objects ?? []), ...(this.influences ?? [])]) object.x *= scaleX;
      for (const child of this.children ?? []) child.x *= scaleX;
    }
  }

  setInput(key, value) {
    if (key in this.input) this.input[key] = value;
  }

  togglePause() {
    this.paused = !this.paused;
    this.ui.pauseButton.textContent = this.paused ? "Resume" : "Pause";
  }

  buildGuardrail() {
    if (this.meters.resources < 12) {
      this.pushMessage("Not enough resources to build a guardrail.");
      return;
    }
    applyMeterDelta(this.meters, { resources: -12, guardrails: 13, freedom: -2, stability: 4 });
    this.pushMessage("You built a support system. It costs now and protects later.");
  }

  addKid(unexpected = false) {
    const stageAllowsKids = ["young-adult", "adult-pressure", "parenthood"].includes(this.stage.id);
    if (!stageAllowsKids && !unexpected) {
      this.pushMessage("Parenthood is not available in this stage yet.");
      return;
    }
    if (!unexpected && this.meters.resources < 14) {
      this.pushMessage("You need more resources before choosing to add a kid.");
      return;
    }
    if (!unexpected) applyMeterDelta(this.meters, { resources: -14, freedom: -8, purpose: 5 });
    const pending = createPendingKid(this.worldY, Math.random, unexpected);
    this.pendingKids.push(pending);
    this.pushMessage(unexpected ? "A delayed life event begins to unfold." : "You chose parenthood. The change arrives after a delay.");
  }

  loop(time = performance.now()) {
    const dt = Math.min(0.033, (time - this.lastTime) / 1000 || 0);
    this.lastTime = time;
    if (!this.paused) this.update(dt);
    this.render();
    requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  update(dt) {
    this.age = Math.min(80, this.worldY / 145);
    this.stage = getStage(this.age);
    if (!this.stageSeen.has(this.stage.id)) {
      this.stageSeen.add(this.stage.id);
      this.pushMessage(`${this.stage.name}: ${this.stage.lesson}.`);
    }

    const road = this.getRoad(this.worldY);
    const steer = (this.input.right ? 1 : 0) - (this.input.left ? 1 : 0);
    const speedIntent = (this.input.fast ? 0.58 : 0) - (this.input.slow ? 0.44 : 0);
    this.speed = clamp(this.speed + speedIntent * dt, 0.62, 2.1);

    const parentCorrection = Math.sign(road.center - this.player.x) * this.stage.parentGuardrail * 0.34;
    const playerControl = steer * this.stage.control * 18 * dt;
    let influenceForce = 0;
    for (const influence of this.influences) {
      const screenY = this.screenY(influence.y);
      if (screenY > this.height * 0.22 && screenY < this.height * 0.78) {
        influence.active = true;
        if (!influence.applied) {
          influence.applied = true;
          applyMeterDelta(this.meters, influence.effect ?? {});
          this.addFloater(influence.effectLabel, influence.x, screenY, influence.color);
          this.pushMessage(influence.message);
        }
        influenceForce += influencePush(influence, this.player.x, road.center) * 8 * dt;
      }
    }

    this.player.vx += playerControl + parentCorrection * dt + influenceForce;
    this.player.vx *= Math.pow(0.88, dt * 60);
    this.player.x += this.player.vx * dt * 220;
    this.player.x = clamp(this.player.x, 35, this.width - 35);
    this.worldY += this.speed * dt * 185;

    const offRoad = Math.abs(this.player.x - road.center) > road.width * 0.5;
    const objectiveHit = this.checkObjectiveHits();
    const damageReduction = guardrailDamageReduction(this.meters);
    applyMeterDelta(this.meters, {
      stability: offRoad ? -0.12 * this.stage.risk * damageReduction * dt * 60 : 0.035 * dt * 60,
      resources: -resourcePressureCost(this.stage, this.speed) * dt * 60,
      freedom: (this.stage.freedom - this.meters.freedom) * 0.003 * dt * 60,
      purpose: calculatePurposeGain({ onRoad: !offRoad, objectiveHit, childCount: this.children.length, stage: this.stage }) * dt * 60
    });

    this.spawnObjects();
    this.updateChildren(dt, road);
    this.resolvePendingKids(road);
    this.updateFloaters(dt);
    this.cleanObjects();
    this.updateUi();
  }

  spawnObjects() {
    const road = this.getRoad(this.worldY + this.height);
    if (this.worldY > this.nextObjectiveAt) {
      this.objects.push(createObjective(this.stage, road.center, this.worldY + this.height * 1.05));
      this.nextObjectiveAt += 520 / this.stage.objectiveRate;
    }
    if (this.worldY > this.nextInfluenceAt) {
      this.influences.push(createInfluence(this.stage, road.center, this.worldY + this.height * 1.08));
      this.nextInfluenceAt += 650 / Math.max(0.7, this.stage.eventRate);
    }
    if (this.worldY > this.nextEventAt) {
      const event = createEvent(this.stage);
      applyMeterDelta(this.meters, applyEventMitigation(event, this.meters));
      this.pushMessage(event.message);
      this.nextEventAt += 1050 / this.stage.eventRate + Math.random() * 650;
    }
    if (this.worldY > this.nextUnexpectedKidAt && ["young-adult", "adult-pressure", "parenthood"].includes(this.stage.id)) {
      this.addKid(true);
      this.nextUnexpectedKidAt += 5200 + Math.random() * 2600;
    }
  }

  updateChildren(dt, road) {
    this.input.childInfluence = ((this.input.right ? 1 : 0) - (this.input.left ? 1 : 0)) * 0.7;
    let conflicts = 0;
    for (const child of this.children) {
      const childRoad = this.getRoad(this.worldY - child.yOffset);
      const result = updateChild(child, this.player, this.stage, childRoad.center, childRoad.width, this.input.childInfluence, dt);
      if (result.conflict) conflicts += 1;
      if (child.leaving) {
        this.pushMessage(`${child.name} leaves direct influence with ${Math.round(child.stability)} stability.`);
      }
    }
    this.children = this.children.filter((child) => !child.leaving);
    this.meters.childStability = childMeter(this.children);
    if (conflicts > 0) applyMeterDelta(this.meters, { stability: -0.01 * conflicts * dt * 60, purpose: 0.01 * dt * 60 });
  }

  resolvePendingKids(road) {
    for (const pending of this.pendingKids) {
      if (!pending.notified && this.worldY > pending.dueAt - 450) {
        pending.notified = true;
        this.pushMessage(pending.unexpected ? "Unexpected kid event: your plans change soon." : "A child is about to arrive.");
      }
      if (this.worldY >= pending.dueAt) {
        const child = createChild(this.children.length, road.center, this.worldY);
        this.children.push(child);
        applyMeterDelta(this.meters, { purpose: 10, freedom: -10, resources: -8, stability: -3 });
        this.pushMessage(`${child.name} arrives. You can influence, not control.`);
      }
    }
    this.pendingKids = this.pendingKids.filter((pending) => this.worldY < pending.dueAt);
  }

  checkObjectiveHits() {
    let hit = false;
    for (const objective of this.objects) {
      if (objective.collected) continue;
      const y = this.screenY(objective.y);
      const close = Math.abs(this.player.x - objective.x) < 52 && Math.abs(y - this.height * 0.68) < 58;
      if (close) {
        objective.collected = true;
        applyMeterDelta(this.meters, objective.delta);
        this.addFloater(objective.summary, objective.x, y, objective.color);
        this.pushMessage(`${objective.label}: ${objective.summary}`);
        hit = true;
      }
    }
    return hit;
  }

  cleanObjects() {
    const cutoff = this.worldY - 220;
    this.objects = this.objects.filter((object) => object.y > cutoff && !object.collected);
    this.influences = this.influences.filter((object) => object.y > cutoff);
    this.floaters = this.floaters.filter((floater) => floater.age < floater.duration);
  }

  addFloater(text, x, y, color = "#f4f1e8") {
    if (!text) return;
    this.floaters.push({ text, x, y, color, age: 0, duration: 1.25 });
    this.floaters = this.floaters.slice(-8);
  }

  updateFloaters(dt) {
    for (const floater of this.floaters) {
      floater.age += dt;
      floater.y -= dt * 34;
    }
  }

  updateUi(force = false) {
    const now = performance.now();
    if (!force && now - this.lastUiRenderAt < 120) return;
    this.lastUiRenderAt = now;

    const progress = getStageProgress(this.age, this.stage);
    const stageLine = `${this.stage.name} · age ${Math.floor(this.age)} · ${Math.round(progress * 100)}%`;
    if (stageLine !== this.lastStageLine) {
      this.ui.stageLine.textContent = stageLine;
      this.lastStageLine = stageLine;
    }

    const meters = [
      ["Stability", this.meters.stability],
      ["Resources", this.meters.resources],
      ["Freedom", this.meters.freedom],
      ["Purpose", this.meters.purpose],
      ["Guardrails", this.meters.guardrails]
    ];
    if (this.children.length) meters.push(["Kids", this.meters.childStability]);

    const metersHtml = meters
      .map(([label, value]) => {
        const rounded = Math.round(value);
        return `
          <div class="meter">
            <span>${label}</span>
            <strong>${rounded}</strong>
            <i style="--value: ${rounded}%"></i>
          </div>
        `;
      })
      .join("");
    if (metersHtml !== this.lastMetersHtml) {
      this.ui.meters.innerHTML = metersHtml;
      this.lastMetersHtml = metersHtml;
    }

    this.ui.kidButton.disabled = !["young-adult", "adult-pressure", "parenthood"].includes(this.stage.id);
    this.ui.guardrailButton.disabled = this.meters.resources < 12;
  }

  pushMessage(message) {
    this.messages.unshift({ message, at: performance.now() });
    this.messages = this.messages.slice(0, 4);
    this.ui.messageLog.innerHTML = this.messages.map((item) => `<p>${item.message}</p>`).join("");
  }

  getRoad(y) {
    const center =
      this.width * 0.5 +
      Math.sin(y / 510) * this.width * 0.18 +
      Math.sin(y / 980 + 1.4) * this.width * 0.11;
    const stageNarrowing = this.stage.pressure * 24;
    const width = Math.max(180, this.width * 0.58 - stageNarrowing + Math.sin(y / 800) * 24);
    return { center, width };
  }

  screenY(worldY) {
    return this.height * 0.68 - (worldY - this.worldY);
  }

  objectiveSummary(delta) {
    return Object.entries(delta)
      .map(([key, value]) => `${value > 0 ? "+" : ""}${Math.round(value)} ${key}`)
      .join(", ");
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawTerrain(ctx);
    this.drawRoad(ctx);
    this.drawObjects(ctx);
    this.drawChildren(ctx);
    this.drawPlayer(ctx);
    this.drawFloaters(ctx);
    this.drawStageRibbon(ctx);
    if (this.paused) this.drawPause(ctx);
  }

  drawTerrain(ctx) {
    const grd = ctx.createLinearGradient(0, 0, 0, this.height);
    grd.addColorStop(0, "#1d332d");
    grd.addColorStop(0.55, "#38533f");
    grd.addColorStop(1, "#20332f");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 16; i += 1) {
      const y = (i * 126 - (this.worldY % 126)) * (this.height / 900);
      ctx.fillStyle = i % 2 ? "#8fbf88" : "#d1c17b";
      ctx.fillRect(0, y, this.width, 3);
    }
    ctx.globalAlpha = 1;
  }

  drawRoad(ctx) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const segments = [];
    const step = Math.max(42, Math.floor(this.height / 18));
    for (let y = -80; y < this.height + 120; y += step) {
      const world = this.worldY + (this.height * 0.68 - y);
      const road = this.getRoad(world);
      segments.push({ y, ...road });
    }

    ctx.beginPath();
    segments.forEach((point, index) => {
      const x = point.center - point.width / 2 - 20;
      index ? ctx.lineTo(x, point.y) : ctx.moveTo(x, point.y);
    });
    [...segments].reverse().forEach((point) => ctx.lineTo(point.center + point.width / 2 + 20, point.y));
    ctx.closePath();
    ctx.fillStyle = "rgba(177, 164, 112, 0.42)";
    ctx.fill();

    ctx.beginPath();
    segments.forEach((point, index) => {
      const x = point.center - point.width / 2;
      index ? ctx.lineTo(x, point.y) : ctx.moveTo(x, point.y);
    });
    [...segments].reverse().forEach((point) => ctx.lineTo(point.center + point.width / 2, point.y));
    ctx.closePath();
    const roadGradient = ctx.createLinearGradient(0, 0, this.width, 0);
    roadGradient.addColorStop(0, "#232830");
    roadGradient.addColorStop(0.5, "#363b43");
    roadGradient.addColorStop(1, "#232830");
    ctx.fillStyle = roadGradient;
    ctx.fill();

    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(28, this.width * 0.065);
    ctx.beginPath();
    segments.forEach((point, index) => {
      index ? ctx.lineTo(point.center, point.y) : ctx.moveTo(point.center, point.y);
    });
    ctx.stroke();
    ctx.globalAlpha = 1;

    this.strokeRoadEdge(ctx, segments, -1);
    this.strokeRoadEdge(ctx, segments, 1);

    ctx.setLineDash([22, 24]);
    ctx.strokeStyle = COLORS.asphaltLine;
    ctx.lineWidth = Math.max(3, this.width * 0.006);
    ctx.beginPath();
    segments.forEach((point, index) => {
      index ? ctx.lineTo(point.center, point.y) : ctx.moveTo(point.center, point.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  strokeRoadEdge(ctx, segments, side) {
    ctx.strokeStyle = side < 0 ? "#bac3cc" : "#e2e7ed";
    ctx.lineWidth = 5 + this.meters.guardrails * 0.045;
    ctx.beginPath();
    segments.forEach((point, index) => {
      const x = point.center + side * point.width * 0.5;
      index ? ctx.lineTo(x, point.y) : ctx.moveTo(x, point.y);
    });
    ctx.stroke();
  }

  roundRectPath(ctx, x, y, width, height, radius) {
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, width, height, radius);
      return;
    }

    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  drawArrowHead(ctx, fromX, fromY, toX, toY, color) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    const length = 12;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - length * Math.cos(angle - 0.45), toY - length * Math.sin(angle - 0.45));
    ctx.lineTo(toX - length * Math.cos(angle + 0.45), toY - length * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fill();
  }

  drawObjects(ctx) {
    for (const objective of this.objects) {
      const y = this.screenY(objective.y);
      if (y < -90 || y > this.height + 90) continue;
      const radius = Math.max(28, this.width * 0.045);
      const cardW = Math.max(116, this.width * 0.24);
      const cardH = Math.max(58, this.height * 0.06);
      const cardX = objective.x - cardW / 2;
      const cardY = y - cardH / 2;

      ctx.globalAlpha = objective.outside ? 0.98 : 0.94;
      ctx.fillStyle = objective.outside ? "rgba(214, 95, 95, 0.92)" : "rgba(244, 241, 232, 0.95)";
      ctx.beginPath();
      this.roundRectPath(ctx, cardX, cardY, cardW, cardH, 10);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = objective.color;
      ctx.beginPath();
      ctx.arc(cardX + radius, y, radius * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#11151a";
      ctx.font = `700 ${Math.max(18, this.width * 0.026)}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(objective.icon, cardX + radius, y + 1);

      ctx.fillStyle = objective.outside ? "#fff7f2" : "#11151a";
      ctx.font = `800 ${Math.max(15, this.width * 0.023)}px system-ui`;
      ctx.textAlign = "left";
      ctx.fillText(objective.label, cardX + radius * 1.75, y - 10);
      ctx.font = `${Math.max(11, this.width * 0.017)}px system-ui`;
      ctx.fillText(objective.summary, cardX + radius * 1.75, y + 12);

      if (objective.outside) {
        ctx.strokeStyle = "#ffd7d0";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(objective.x, y, cardW * 0.58, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    for (const influence of this.influences) {
      const y = this.screenY(influence.y);
      if (y < -90 || y > this.height + 90) continue;
      const active = y > this.height * 0.22 && y < this.height * 0.78;
      const size = active ? 34 : 29;
      const road = this.getRoad(influence.y);
      const arrowEnd = influence.force >= 0 ? road.center : influence.x + influence.side * 68;

      ctx.globalAlpha = active ? 0.22 : 0.12;
      ctx.fillStyle = influence.color;
      ctx.beginPath();
      ctx.arc(influence.x, y, size * 1.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = influence.force >= 0 ? "#dbe9ff" : "#ffd2d2";
      ctx.lineWidth = active ? 5 : 3;
      ctx.beginPath();
      ctx.moveTo(influence.x, y);
      ctx.lineTo(arrowEnd, y);
      ctx.stroke();
      this.drawArrowHead(ctx, influence.x, y, arrowEnd, y, influence.force >= 0 ? "#dbe9ff" : "#ffd2d2");

      ctx.fillStyle = influence.color;
      ctx.beginPath();
      ctx.arc(influence.x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `800 ${Math.max(18, this.width * 0.026)}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(influence.icon, influence.x, y + 1);

      ctx.fillStyle = "rgba(13, 18, 22, 0.82)";
      ctx.beginPath();
      this.roundRectPath(ctx, influence.x - 52, y + size + 7, 104, 34, 8);
      ctx.fill();
      ctx.fillStyle = "#f4f1e8";
      ctx.font = `700 ${Math.max(11, this.width * 0.017)}px system-ui`;
      ctx.fillText(influence.label, influence.x, y + size + 19);
      ctx.font = `${Math.max(10, this.width * 0.015)}px system-ui`;
      ctx.fillText(influence.effectLabel, influence.x, y + size + 31);
    }
  }

  drawPlayer(ctx) {
    const y = this.height * 0.68;
    ctx.fillStyle = COLORS.playerEdge;
    ctx.beginPath();
    ctx.arc(this.player.x, y, 31, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(this.player.x, y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1f2329";
    ctx.font = `${Math.max(18, this.width * 0.022)}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("you", this.player.x, y + 5);

    const road = this.getRoad(this.worldY);
    if (this.stage.parentGuardrail > 0.05) {
      ctx.strokeStyle = COLORS.parent;
      ctx.lineWidth = 3 + this.stage.parentGuardrail * 7;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(road.center, y + 72);
      ctx.lineTo(this.player.x, y + 12);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawChildren(ctx) {
    for (const child of this.children) {
      const y = this.height * 0.68 + child.yOffset;
      if (y > this.height + 48) continue;
      ctx.strokeStyle = `rgba(159, 211, 199, ${0.7 - child.independence * 0.35})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.height * 0.68 + 24);
      ctx.lineTo(child.x, y - 20);
      ctx.stroke();
      ctx.fillStyle = child.independence > 0.68 ? "#f0c36d" : COLORS.child;
      ctx.beginPath();
      ctx.arc(child.x, y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#14201d";
      ctx.font = `${Math.max(17, this.width * 0.021)}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText(child.name, child.x, y + 5);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(child.x - 24, y + 31, 48, 5);
      ctx.fillStyle = child.stability > 45 ? "#70b77e" : COLORS.warning;
      ctx.fillRect(child.x - 24, y + 31, 48 * (child.stability / 100), 5);
    }
  }

  drawFloaters(ctx) {
    for (const floater of this.floaters) {
      const alpha = Math.max(0, 1 - floater.age / floater.duration);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(13, 18, 22, 0.78)";
      ctx.beginPath();
      this.roundRectPath(ctx, floater.x - 70, floater.y - 18, 140, 36, 8);
      ctx.fill();
      ctx.fillStyle = floater.color;
      ctx.font = `800 ${Math.max(13, this.width * 0.019)}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(floater.text, floater.x, floater.y);
      ctx.globalAlpha = 1;
    }
  }

  drawStageRibbon(ctx) {
    const barWidth = this.width * 0.82;
    const x = (this.width - barWidth) / 2;
    const y = 22;
    ctx.fillStyle = "rgba(13, 18, 22, 0.68)";
    ctx.beginPath();
    this.roundRectPath(ctx, x, y, barWidth, 42, 12);
    ctx.fill();
    STAGES.forEach((stage, index) => {
      const w = barWidth / STAGES.length;
      ctx.fillStyle = stage.id === this.stage.id ? "#f2d264" : "rgba(255,255,255,0.32)";
      ctx.fillRect(x + index * w + 4, y + 30, w - 8, 4);
    });
    ctx.fillStyle = "#fff";
    ctx.font = `${Math.max(18, this.width * 0.022)}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText(this.stage.lesson, this.width / 2, y + 20);
  }

  drawPause(ctx) {
    ctx.fillStyle = "rgba(7, 10, 13, 0.62)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#fff";
    ctx.font = `${Math.max(34, this.width * 0.05)}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("Paused", this.width / 2, this.height / 2);
  }
}

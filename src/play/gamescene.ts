import { appWindow } from "@tauri-apps/api/window";
import { EaseFunc, KEventController } from "kaplay";
import { cam } from "../core/camera";
import { GAME } from "../core/game";
import { GameSave } from "../core/save";
import { KaplayState } from "../core/scenes/KaplayState";
import { Sound } from "../core/sound";
import { getDancer } from "../data/dancer";
import EventHandler from "../data/event/handler";
import { utils } from "../utils";
import { updateJudgement } from "./objects/judgement";
import { ChartNote, NoteGameObj, notesSpawner, setTimeForStrum, TIME_FOR_STRUM } from "./objects/note";
import { getClosestNote, Scoring } from "./objects/scoring";
import { inputHandler, introGo, paramsGame, StateGame } from "./PlayState";
import { StateDeath } from "./scenes/DeathScene";

KaplayState.scene("StateGame", (params: paramsGame) => {
	const GameState = new StateGame(params);

	setBackground(RED.lighten(60));

	// ==== SETS UP SOME IMPORTANT STUFF ====
	notesSpawner(GameState);

	GameState.gameInputEnabled = true;
	// ==== DANCER + UI =====
	GameState.dancer.onUpdate(() => {
		if (GameState.dancer.waitForIdle) GameState.dancer.waitForIdle.paused = GameState.paused;
	});

	add([
		sprite(getDancer().bgSpriteName),
		pos(center()),
		anchor("center"),
		layer("background"),
		z(0),
	]);

	let hasPlayedGo = false;
	let timeToFinishSong = false;

	if (!isFocused()) GameState.paused = true;

	onUpdate(() => {
		GameState.conductor.paused = GameState.paused;

		if (GameState.conductor.timeInSeconds >= -(TIME_FOR_STRUM / 2) && !hasPlayedGo) {
			introGo();
			hasPlayedGo = true;
		}

		if (GameState.song.chart.notes.length > 2) {
			if (
				GameState.conductor.timeInSeconds >= GameState.song.chart.notes[GameState.song.chart.notes.length - 1].time
				&& GameState.conductor.timeInSeconds + 5 < GameState.conductor.audioPlay.duration() && !timeToFinishSong
			) {
				timeToFinishSong = true;
				tween(GameState.conductor.audioPlay.volume, 0, 5, (p) => GameState.conductor.audioPlay.volume = p).onEnd(() => {
					GameState.finishSong();
				});
			}
		}

		// HANDLE CAM
		const camValue = EventHandler["cam-move"](
			GameState.conductor.timeInSeconds,
			GameState.song.chart.events,
		);

		cam.pos.x = center().x + camValue.x;
		cam.pos.y = center().y + camValue.y;
		cam.angle = camValue.angle;

		// OTHER STUFF
		inputHandler(GameState);
		GameState.gameUI.missesText.misses = GameState.tally.misses;
		GameState.gameUI.timeText.time = GameState.conductor.timeInSeconds < 0
			? 0
			: GameState.conductor.timeInSeconds;
		GameState.gameUI.healthText.health = lerp(GameState.gameUI.healthText.health, GameState.health, 0.5);
		GameState.gameUI.scoreText.score = lerp(GameState.gameUI.scoreText.score, GameState.tally.score, 0.5);
	});

	onHide(() => {
		if (!GameState.paused) {
			GameState.paused = true;
		}
	});

	GameState.conductor.onStepHit((curStep) => {
		const camValue = EventHandler["cam-move"](GameState.conductor.timeInSeconds, GameState.song.chart.events);
		if (curStep % (Math.round(GameState.conductor.stepsPerBeat / camValue.bop_rate)) == 0) {
			// handling zoom
			tween(
				camValue.zoom * camValue.bop_strength,
				camValue.zoom,
				GameState.conductor.stepInterval,
				(p) => {
					cam.zoom = vec2(p);
				},
				easings[camValue.easing],
			);
		}
	});

	GameState.conductor.onBeatHit((curBeat) => {
		if (GameState.health <= 25) {
			Sound.playSound("lowHealth", { detune: curBeat % 2 == 0 ? 0 : 25 });
		}

		if (GameState.dancer.currentMove == "idle") {
			GameState.dancer.moveBop();
		}
	});

	GameState.events.onNoteHit((chartNote: ChartNote) => {
		let judgement = Scoring.judgeNote(GameState.conductor.timeInSeconds, chartNote);

		if (judgement == "Miss") {
			GameState.events.trigger("miss", chartNote);
			return;
		}

		// the judgement isn't a miss, you did well :)
		GameState.tally[judgement.toLowerCase() + "s"] += 1;
		GameState.combo += 1;
		if (GameState.combo > GameState.highestCombo) GameState.highestCombo = GameState.combo;

		// score stuff
		let scorePerDiff = Scoring.getScorePerDiff(GameState.conductor.timeInSeconds, chartNote);
		GameState.addScore(scorePerDiff);
		GameState.hitNotes.push(chartNote);

		if (GameState.health < 100) GameState.health += randi(2, 6);

		updateJudgement(judgement);

		// this updates last move don't worry
		GameState.dancer.doMove(chartNote.move);

		if (chartNote.length) {
			let keyRelease: KEventController = null;

			const noteObj = get("noteObj", { recursive: true }).find((obj: NoteGameObj) => obj.chartNote == chartNote) as NoteGameObj;
			if (noteObj) noteObj.opacity = 0;

			keyRelease = onKeyRelease(GameSave.getKeyForMove(chartNote.move), () => {
				keyRelease.cancel();
				noteObj.destroy();
			});
		}
	});

	GameState.events.onMiss((note: ChartNote) => {
		GameState.dancer.currentMove = note.move;
		GameState.dancer.miss();

		// Sound.playSound("noteMiss");
		updateJudgement("Miss");

		const closestNote = getClosestNote(GameState.song.chart.notes, GameState.conductor.timeInSeconds);
		const scoreDiff = Scoring.getScorePerDiff(GameState.conductor.timeInSeconds, closestNote);
		if (GameState.tally.score > 0) GameState.tally.score -= scoreDiff;

		if (GameState.tally.score > 0) {
			GameState.gameUI.scoreDiffText.value = -scoreDiff;
			GameState.gameUI.scoreDiffText.opacity = 1;
			GameState.gameUI.scoreDiffText.bop({ startScale: vec2(1.1), endScale: vec2(1) });
		}
		else GameState.gameUI.scoreDiffText.value = 0;

		GameState.tally.misses += 1;
		GameState.combo = 0;
		GameState.health -= randi(2, 8);

		if (GameState.health <= 0) {
			GameState.conductor.audioPlay.stop();
			KaplayState.switchState(StateDeath, this);
		}
	});

	GameState.events.onRestart(() => GameState.dancer.doMove("idle"));

	// END SONG
	GameState.conductor.audioPlay.onEnd(() => {
		GameState.finishSong();
	});

	utils.runInDesktop(() => {
		appWindow.setTitle(GAME.NAME + " - " + GameState.params.song.manifest.name);
	});

	onSceneLeave(() => {
		cam.reset();
	});
});

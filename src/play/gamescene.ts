import { appWindow } from "@tauri-apps/api/window";
import { EaseFunc, KEventController, TweenController } from "kaplay";
import { cam } from "../core/camera";
import { gameCursor } from "../core/cursor";
import { GAME } from "../core/init";
import { GameSave } from "../core/save";
import { KaplayState } from "../core/scenes/scenes";
import { playSound } from "../core/sound";
import { utils } from "../utils";
import { ChartEvent } from "./event";
import { ChartNote, NoteGameObj, notesSpawner, setTimeForStrum, TIME_FOR_STRUM } from "./objects/note";
import { addComboText, addJudgement, getClosestNote, Scoring } from "./objects/scoring";
import { inputHandler, introGo, paramsGameScene, StateGame } from "./PlayState";
import { StateDeath } from "./scenes/DeathScene";
import { StateResults } from "./scenes/ResultsScene";
import { SaveScore } from "./song";

KaplayState.scene("game", (GameState: StateGame) => {
	GameState.add();

	setBackground(RED.lighten(60));

	// ==== SETS UP SOME IMPORTANT STUFF ====
	notesSpawner(GameState);

	GameState.gameInputEnabled = true;
	gameCursor.hide();

	// ==== DANCER + UI =====
	GameState.dancer.onUpdate(() => {
		if (GameState.dancer.waitForIdle) GameState.dancer.waitForIdle.paused = GameState.paused;
	});

	let dancerHasBg = false;
	getSprite(`bg_` + GameState.params.dancerName).onLoad((data) => {
		if (data != null) dancerHasBg = true;
	});

	if (dancerHasBg) {
		add([
			sprite("bg_" + GameState.params.dancerName),
			pos(center()),
			anchor("center"),
			layer("background"),
			z(0),
		]);
	}

	let hasPlayedGo = false;

	if (!isFocused()) GameState.paused = true;

	onUpdate(() => {
		// debug.log(GameState.dancer.exists());

		if (GameState.conductor.timeInSeconds >= -(TIME_FOR_STRUM / 2) && !hasPlayedGo) {
			introGo();
			hasPlayedGo = true;
		}

		// HANDLE CAM
		const camThing = ChartEvent.handle["cam-move"](
			GameState.conductor.timeInSeconds,
			GameState.song.chart.events,
		);
		cam.pos.x = camThing.x;
		cam.pos.y = camThing.y;
		cam.angle = camThing.angle;
		cam.zoom = vec2(camThing.zoom);

		// HANDLE SCROLL SPEED
		const scrollSpeedThing = ChartEvent.handle["change-scroll"](
			GameState.conductor.timeInSeconds,
			GameState.song.chart.events,
		);
		setTimeForStrum(1.25 / scrollSpeedThing.speed / GameSave.scrollSpeed);

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

	GameState.conductor.onBeatHit((curBeat) => {
		if (GameState.health <= 25) {
			playSound("lowhealth", { detune: curBeat % 2 == 0 ? 0 : 25 });
		}

		if (GameState.dancer.getMove() == "idle") {
			GameState.dancer.play("idle");
			GameState.dancer.moveBop();
		}

		const camMoveEV = ChartEvent.getAtTime(
			"cam-move",
			GameState.song.chart.events,
			GameState.conductor.timeInSeconds,
		);

		if (camMoveEV) {
			const easingFunc = easings[camMoveEV.value.easing[0]] as EaseFunc;
			cam.bop(
				vec2(camMoveEV.value.bopStrength),
				vec2(1),
				camMoveEV.value.duration,
				easingFunc,
			);
		}
	});

	GameState.events.onNoteHit((chartNote: ChartNote) => {
		let judgement = Scoring.judgeNote(GameState.conductor.timeInSeconds, chartNote);

		if (judgement == "Miss") {
			GameState.events.trigger("miss");
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

		const judgementText = addJudgement(judgement);

		if (Scoring.tally(GameState.tally).isPerfect()) judgementText.text += "!!";
		else if (GameState.tally.misses < 1) judgementText.text += "!";

		addComboText(GameState.combo);
		GameState.dancer.doMove(chartNote.move);

		if (chartNote.length) {
			let keyRelease: KEventController = null;

			const noteObj = get("noteObj", { recursive: true }).find((obj: NoteGameObj) =>
				obj.chartNote == chartNote
			) as NoteGameObj;
			noteObj.opacity = 0;

			keyRelease = onKeyRelease(GameSave.getKeyForMove(chartNote.move), () => {
				keyRelease.cancel();
				noteObj.destroy();
			});
		}
	});

	GameState.events.onMiss((harm: boolean) => {
		GameState.dancer.miss();

		if (harm == false) return;
		playSound("missnote");
		addJudgement("Miss");
		if (GameState.combo > 0) {
			addComboText("break");
		}

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
			KaplayState.switchState(new StateDeath(GameState));
		}
	});

	GameState.events.onRestart(() => GameState.dancer.doMove("idle"));

	// END SONG
	GameState.conductor.audioPlay.onEnd(() => {
		const songSaveScore = new SaveScore();
		songSaveScore.uuid = GameState.params.song.manifest.uuid_DONT_CHANGE;
		songSaveScore.tally = GameState.tally;
		GameSave.songsPlayed.push(songSaveScore);
		GameSave.save();
		KaplayState.switchState(new StateResults(GameState));
	});

	utils.runInDesktop(() => {
		appWindow.setTitle(GAME.NAME + " - " + GameState.params.song.manifest.name);
	});
});

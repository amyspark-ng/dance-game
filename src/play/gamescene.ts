import { appWindow } from "@tauri-apps/api/window";
import { KEventController, TweenController } from "kaplay";
import { onBeatHit, onMiss, onNoteHit, onReset, onStepHit, triggerEvent } from "../core/events";
import { GameSave } from "../core/gamesave";
import { GAME } from "../core/initGame";
import { dancers } from "../core/loader";
import { cam } from "../core/plugins/features/camera";
import { gameCursor } from "../core/plugins/features/gameCursor";
import { playSound } from "../core/plugins/features/sound";
import { goScene } from "../core/scenes";
import { utils } from "../utils";
import { ChartNote, NoteGameObj, notesSpawner, setTimeForStrum, TIME_FOR_STRUM } from "./objects/note";
import { addComboText, addJudgement, getClosestNote, Scoring } from "./objects/scoring";
import { getKeyForMove, inputHandler, introGo, paramsGameScene, StateGame } from "./PlayState";
import { SaveScore } from "./song";
import { paramsDeathScene } from "./ui/DeathScene";
import { addPauseUI } from "./ui/pauseScreen";
import { paramsResultsScene } from "./ui/ResultsScene";

export function GameScene() {
	scene("game", (params: paramsGameScene) => {
		setBackground(RED.lighten(60));
		const GameState = new StateGame(params);

		// ==== SETS UP SOME IMPORTANT STUFF ====
		notesSpawner(GameState);

		GameState.gameInputEnabled = true;
		gameCursor.hide();

		// ==== DANCER + UI =====
		GameState.dancer.onUpdate(() => {
			if (GameState.dancer.waitForIdle) GameState.dancer.waitForIdle.paused = GameState.paused;
		});

		let dancerHasBg = false;
		getSprite(`bg_` + params.dancer).onLoad((data) => {
			if (data != null) dancerHasBg = true;
		});

		if (dancerHasBg) {
			add([
				sprite("bg_" + params.dancer),
				pos(center()),
				anchor("center"),
				layer("background"),
				z(0),
			]);
		}

		let hasPlayedGo = false;

		const camTweens: TweenController[] = [];

		if (!isFocused()) GameState.setPause(true);

		onUpdate(() => {
			if (GameState.conductor.timeInSeconds >= -(TIME_FOR_STRUM / 2) && !hasPlayedGo) {
				introGo();
				hasPlayedGo = true;
			}

			GameState.song.chart.events.forEach((ev) => {
				if (GameState.conductor.timeInSeconds >= ev.time && !GameState.eventsDone.includes(ev)) {
					GameState.eventsDone.push(ev);

					if (ev.id == "change-scroll") {
						tween(
							TIME_FOR_STRUM,
							(1.25 / ev.value.speed) / GameSave.scrollSpeed,
							ev.value.duration,
							(p) => setTimeForStrum(p),
							easings[ev.value.easing],
						);
					}
					else if (ev.id == "cam-move") {
						const posToArr = vec2(ev.value.x, ev.value.y);
						const zoomToArr = vec2(ev.value.zoom);
						const camAngle = ev.value.angle;
						const camPosTween = tween(
							cam.pos,
							center().add(posToArr),
							ev.value.duration,
							(p) => cam.pos = p,
							easings[ev.value.easing],
						);
						const camZoomTween = tween(
							cam.zoom,
							zoomToArr,
							ev.value.duration,
							(p) => cam.zoom = p,
							easings[ev.value.easing],
						);
						const camRotationTween = tween(
							cam.rotation,
							camAngle,
							ev.value.duration,
							(p) => cam.rotation = p,
							easings[ev.value.easing],
						);

						camTweens.push(camPosTween);
						camTweens.push(camZoomTween);
						camTweens.push(camRotationTween);
					}
					else if (ev.id == "play-anim") {
						if (GameState.dancer.getAnim(ev.value.anim) == null) {
							console.warn("Animation not found for dancer: " + ev.value.anim);
							return;
						}

						GameState.dancer.forcedAnim = ev.value.force;

						// @ts-ignore
						const animSpeed = GameState.dancer.getAnim(ev.value.anim)?.speed;
						GameState.dancer.play(ev.value.anim, {
							speed: animSpeed * ev.value.speed,
							loop: true,
							pingpong: ev.value.ping_pong,
						});

						GameState.dancer.onAnimEnd((animEnded) => {
							if (animEnded != ev.value.anim) return;
							GameState.dancer.forcedAnim = false;
							GameState.dancer.play("idle");
						});
					}
					else if (ev.id == "change-dancer") {
						if (!dancers.map((names) => names.dancerName).includes(ev.value.dancer)) {
							console.warn("Dancer not found: " + ev.value.dancer);
							return;
						}

						GameState.dancer.sprite = "dancer_" + ev.value.dancer;
					}
				}
			});

			camTweens.forEach((tweenT) => {
				tweenT.paused = GameState.paused;
			});

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
				GameState.setPause(true);
			}
		});

		onBeatHit(() => {
			if (GameState.health <= 25) {
				playSound("lowhealth", { detune: GameState.conductor.currentBeat % 2 == 0 ? 0 : 25 });
			}

			if (GameState.dancer.getMove() == "idle") {
				GameState.dancer.moveBop();
			}
		});

		onNoteHit((chartNote: ChartNote) => {
			let judgement = Scoring.judgeNote(GameState.conductor.timeInSeconds, chartNote);

			if (judgement == "Miss") {
				triggerEvent("onMiss");
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

			if (Scoring.tally.isPerfect(GameState.tally)) judgementText.text += "!!";
			else if (GameState.tally.misses < 1) judgementText.text += "!";

			addComboText(GameState.combo);
			GameState.dancer.doMove(chartNote.move);

			if (chartNote.length) {
				let keyRelease: KEventController = null;

				const noteObj = get("noteObj", { recursive: true }).find((obj: NoteGameObj) => obj.chartNote == chartNote) as NoteGameObj;
				noteObj.opacity = 0;
				const stepHit = onStepHit(() => {
					noteObj.visualLength -= 1;

					if (noteObj.visualLength >= 0) {
						GameState.addScore(scorePerDiff);
					}
					else {
						keyRelease?.cancel();
						stepHit.cancel();
						noteObj.destroy();
					}
				});

				keyRelease = onKeyRelease(getKeyForMove(chartNote.move), () => {
					keyRelease.cancel();
					stepHit.cancel();

					noteObj.destroy();
				});
			}
		});

		onMiss((harm: boolean) => {
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
				goScene("death", { GameState: GameState } as paramsDeathScene);
			}
		});

		onReset(() => GameState.dancer.doMove("idle"));

		// END SONG
		GameState.conductor.audioPlay.onEnd(() => {
			const songSaveScore = new SaveScore();
			songSaveScore.uuid = params.song.manifest.uuid_DONT_CHANGE;
			songSaveScore.tally = GameState.tally;
			GameSave.songsPlayed.push(songSaveScore);
			GameSave.save();
			goScene("results", { GameState: GameState } as paramsResultsScene);
		});

		utils.runInDesktop(() => {
			appWindow.setTitle(GAME.NAME + " - " + params.song.manifest.name);
		});
	});
}

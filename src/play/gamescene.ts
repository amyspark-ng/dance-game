import { addDancer, DANCER_POS, getDancer } from "./objects/dancer"
import { playSound } from "../core/plugins/features/sound"
import { onBeatHit, onMiss, onNoteHit, onReset, triggerEvent } from "../core/events"
import { addStrumline, getStrumline } from "./objects/strumline"
import { ChartNote, notesSpawner, setTimeForStrum, TIME_FOR_STRUM } from "./objects/note"
import { SaveScore } from "./song"
import { goScene } from "../core/scenes"
import { addComboText, addJudgement, getClosestNote, Scoring } from "./objects/scoring"
import { GameSave } from "../core/gamesave"
import { utils } from "../utils"
import { addUI } from "./ui/gameUi"
import { paramsGameScene, StateGame, manageInput, setupSong, stopPlay, introGo } from "./playstate"
import { paramsDeathScene } from "./ui/deathScene"
import { paramsResultsScene } from "./ui/resultsScene"
import { appWindow } from "@tauri-apps/api/window"
import { PRODUCT } from "../core/initGame"
import { gameCursor } from "../core/plugins/features/gameCursor"
import { cam } from "../core/plugins/features/camera"

export function GameScene() { scene("game", (params: paramsGameScene) => {
	setBackground(RED.lighten(60))

	const GameState = new StateGame()
	GameState.params = params;
	GameState.song = params.songZip;
	setupSong(params, GameState)

	// ==== SETS UP SOME IMPORTANT STUFF ====
	addStrumline(GameState);
	notesSpawner(GameState);

	GameState.gameInputEnabled = true
	gameCursor.hide()

	// ==== DANCER + UI =====
	const dancer = addDancer(params.dancer)
	dancer.pos = Vec2.fromArray(DANCER_POS)
	dancer.onUpdate(() => {
		if (dancer.waitForIdle) dancer.waitForIdle.paused = GameState.paused;
	})

	let dancerHasBg = false
	getSprite(`bg_` + params.dancer).onLoad((data) => {
		if (data != null) dancerHasBg = true
	})

	if (dancerHasBg) {
		add([
			sprite("bg_" + params.dancer),
			pos(center()),
			anchor("center"),
			layer("background"),
			z(0),
		])
	}

	const ui = addUI()

	let hasPlayedGo = false

	onUpdate(() => {
		if (GameState.conductor.timeInSeconds >= -(TIME_FOR_STRUM / 2) && !hasPlayedGo) {
			introGo()
			hasPlayedGo = true
		}
		
		GameState.song.chart.events.forEach((ev) => {
			if (GameState.conductor.timeInSeconds >= ev.time && !GameState.eventsDone.includes(ev)) {
				if (ev.id == "change-scoll") {
					tween(TIME_FOR_STRUM, 1.25 / ev.value / GameSave.scrollSpeed, ev.duration, (p) => setTimeForStrum(p), ev.easing)
				}

				else if (ev.id == "cam-stuff") {
					const posToArr = Vec2.fromArray(ev.value.pos)
					const zoomToArr = Vec2.fromArray(ev.value.scale)
					const camAngle = ev.value.angle
					tween(cam.pos, posToArr, ev.duration, (p) => cam.pos = p, ev.easing)
					tween(cam.zoom, zoomToArr, ev.duration, (p) => cam.zoom = p, ev.easing)
					tween(cam.rotation, camAngle, ev.duration, (p) => cam.rotation = p, ev.easing)
				}
			}
		})

		manageInput(GameState);
		ui.missesText.text = `X | ${GameState.tally.misses}`;
		const time = GameState.conductor.timeInSeconds < 0 ? 0 : GameState.conductor.timeInSeconds
		ui.timeText.text = `${utils.formatTime(time)}`;
		
		ui.healthText.value = lerp(ui.healthText.value, GameState.health, 0.5)
		ui.scoreText.value = lerp(ui.scoreText.value, GameState.tally.score, 0.5)
	})
	
	onHide(() => {
		if (!GameState.paused) {
			GameState.managePause(true)
		}
	})

	onBeatHit(() => {
		if (GameState.health <= 25) playSound("lowhealth", { detune: GameState.conductor.currentBeat % 2 == 0 ? 0 : 25 })

		if (dancer.getMove() == "idle") {
			dancer.moveBop()
		}
	})

	onNoteHit((chartNote:ChartNote) => {
		let judgement = Scoring.judgeNote(GameState.conductor.timeInSeconds, chartNote)
		
		if (judgement == "Miss") {
			triggerEvent("onMiss")
			return;
		}

		// the judgement isn't a miss, you did well :)
		GameState.tally[judgement.toLowerCase() + "s"] += 1
		GameState.combo += 1
		if (GameState.combo > GameState.highestCombo) GameState.highestCombo = GameState.combo

		// score stuff
		let scorePerDiff = Scoring.getScorePerDiff(GameState.conductor.timeInSeconds, chartNote)
		GameState.tally.score += scorePerDiff
		GameState.hitNotes.push(chartNote)

		ui.scoreDiffText.value = scorePerDiff
		ui.scoreDiffText.opacity = 1
		ui.scoreDiffText.bop({ startScale: vec2(1.1), endScale: vec2(1) })

		if (GameState.health < 100) GameState.health += randi(2, 6)

		const judgementText = addJudgement(judgement)
		
		if (Scoring.tally.isPerfect(GameState.tally)) judgementText.text += "!!"
		else if (GameState.tally.misses < 1) judgementText.text += "!"
		
		addComboText(GameState.combo)
		getDancer().doMove(chartNote.move)
	})

	onMiss((harm:boolean) => {
		getDancer().miss()
		
		if (harm == false) return
		playSound("missnote");
		addJudgement("Miss")
		if (GameState.combo > 0) {
			addComboText("break")
		}

		const closestNote = getClosestNote(GameState.song.chart.notes, GameState.conductor.timeInSeconds)
		const scoreDiff = Scoring.getScorePerDiff(GameState.conductor.timeInSeconds, closestNote)
		if (GameState.tally.score > 0) GameState.tally.score -= scoreDiff

		if (GameState.tally.score > 0) {
			ui.scoreDiffText.value = -(scoreDiff)
			ui.scoreDiffText.opacity = 1
			ui.scoreDiffText.bop({ startScale: vec2(1.1), endScale: vec2(1) })
		} else ui.scoreDiffText.value = 0

		GameState.tally.misses += 1
		GameState.combo = 0
		GameState.health -= randi(2, 8)

		if (GameState.health <= 0) {
			GameState.conductor.audioPlay.stop()
			goScene("death", { GameState: GameState } as paramsDeathScene)
		}
	})

	onReset(() => getDancer().doMove("idle"))

	// END SONG
	GameState.conductor.audioPlay.onEnd(() => {
		const songSaveScore = new SaveScore()
		songSaveScore.uuid = params.songZip.manifest.uuid_DONT_CHANGE
		songSaveScore.tally = GameState.tally
		GameSave.songsPlayed.push(songSaveScore)
		GameSave.save()
		goScene("results", { GameState: GameState } as paramsResultsScene)
	})

	utils.runInDesktop(() => {
		appWindow.setTitle(PRODUCT.NAME + " - " + params.songZip.manifest.name)
	})
})}
import { addDancer, DANCER_POS, getDancer } from "./objects/dancer"
import { playSound } from "../core/plugins/features/sound"
import { onBeatHit, onMiss, onNoteHit, onReset, triggerEvent } from "../core/events"
import { addStrumline } from "./objects/strumline"
import { ChartNote, notesSpawner, TIME_FOR_STRUM } from "./objects/note"
import { saveScore } from "./song"
import { goScene } from "../core/scenes"
import { addComboText, addJudgement, getJudgement, getScorePerDiff, tallyUtils } from "./objects/scoring"
import { GameSave } from "../core/gamesave"
import { utils } from "../utils"
import { addUI } from "./ui/gameUi"
import { paramsGameScene, StateGame, manageInput, setupSong, stopPlay } from "./playstate"
import { paramsDeathScene } from "./ui/deathScene"
import { paramsResultsScene } from "./ui/resultsScene"
import { appWindow } from "@tauri-apps/api/window"
import { PRODUCT } from "../core/initGame"

export function GameScene() { scene("game", (params: paramsGameScene) => {
	setBackground(RED.lighten(60))

	const GameState = new StateGame()
	GameState.params = params;
	GameState.song = params.song;
	setupSong(params, GameState)

	// ==== SETS UP SOME IMPORTANT STUFF ====
	addStrumline(GameState);
	notesSpawner(GameState);

	GameState.gameInputEnabled = true

	// ==== DANCER + UI =====
	const dancer = addDancer(params.dancer)
	dancer.pos = Vec2.fromArray(DANCER_POS)
	dancer.onUpdate(() => {
		if (dancer.waitForIdle) dancer.waitForIdle.paused = GameState.paused;
	})

	const ui = addUI()

	onUpdate(() => {
		manageInput(GameState);
		ui.missesText.text = `X | ${GameState.tally.misses}`;
		const time = GameState.conductor.timeInSeconds < 0 ? 0 : GameState.conductor.timeInSeconds
		ui.timeText.text = `${utils.formatTime(time)}`;
		ui.healthText.text = GameState.health.toString();
		ui.scoreText.text = GameState.tally.score.toString();
	})
	
	onHide(() => {
		if (!GameState.paused) {
			GameState.managePause(true)
		}
	})

	onBeatHit(() => {
		if (dancer.getMove() == "idle") {
			dancer.moveBop()
		}
	})

	onNoteHit((chartNote:ChartNote) => {
		let judgement = getJudgement(GameState.conductor.timeInSeconds, chartNote)
		
		if (judgement == "Miss") {
			triggerEvent("onMiss")
			return;
		}

		// the judgement isn't a miss, you did well :)
		GameState.tally[judgement.toLowerCase() + "s"] += 1
		GameState.combo += 1
		if (GameState.combo > GameState.highestCombo) GameState.highestCombo = GameState.combo

		GameState.tally.score += getScorePerDiff(GameState.conductor.timeInSeconds, chartNote)
		GameState.hitNotes.push(chartNote)

		if (GameState.health < 100) GameState.health += randi(2, 6)

		const judgementText = addJudgement(judgement)
		
		if (tallyUtils.perfectSoFar(GameState.tally)) judgementText.text += "!!"
		else if (GameState.tally.misses < 1) judgementText.text += "!"
		
		addComboText(GameState.combo)
		getDancer().doMove(chartNote.dancerMove)
	})

	onMiss(() => {
		getDancer().miss()
		playSound("missnote");
		addJudgement("Miss")
		if (GameState.combo > 0) {
			addComboText("break")
		}

		GameState.tally.misses += 1
		GameState.combo = 0
		GameState.health -= randi(2, 8)

		if (GameState.health <= 0) {
			GameState.conductor.audioPlay.windDown()
			goScene("death", { GameState: GameState } as paramsDeathScene)
		}
	})

	onReset(() => getDancer().doMove("idle"))

	// END SONG
	GameState.conductor.audioPlay.onEnd(() => {
		const songSaveScore = new saveScore()
		songSaveScore.idTitle = params.song.idTitle
		songSaveScore.tally = GameState.tally
		GameSave.songsPlayed.push(songSaveScore)
		GameSave.save()
		goScene("results", { GameState: GameState } as paramsResultsScene)
	})

	utils.runInDesktop(() => {
		appWindow.setTitle(PRODUCT.NAME + " - " + params.song.title)
	})
})}
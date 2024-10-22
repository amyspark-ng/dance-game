import { addDancer, getDancer } from "./objects/dancer"
import { playSound } from "../core/plugins/features/sound"
import { onBeatHit, onMiss, onNoteHit, triggerEvent } from "../core/events"
import { addStrumline } from "./objects/strumline"
import { ChartNote, notesSpawner } from "./objects/note"
import { saveScore } from "./song"
import { goScene } from "../core/scenes"
import { addComboText, addJudgement, getJudgement, getScorePerDiff } from "./objects/scoring"
import { GameSave } from "../core/gamesave"
import { utils } from "../utils"
import { addUI } from "./ui/gameUi"
import { paramsGameScene, StateGame, manageInput, setupSong } from "./playstate"
import { paramsDeathScene } from "./ui/deathScene"
import { paramsResultsScene } from "./ui/resultsScene"

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
	const DANCER_POS = vec2(518, 377)
	const dancer = addDancer(params.dancer)
	dancer.pos = DANCER_POS
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

		// the judgement isn't a miss
		addJudgement(judgement)
		addComboText(GameState.combo)
		getDancer().doMove(chartNote.dancerMove)
	
		GameState.tally[judgement.toLowerCase() + "s"] += 1
		GameState.combo += 1
		if (GameState.combo > GameState.highestCombo) GameState.highestCombo = GameState.combo

		GameState.tally.score += getScorePerDiff(GameState.conductor.timeInSeconds, chartNote)
		GameState.hitNotes.push(chartNote)
		
		if (GameState.health < 100) GameState.health += 5
	})

	onMiss(() => {
		GameState.tally.misses += 1
		GameState.combo = 0
		GameState.health -= 5
		
		// if (getDancer().getCurAnim().name == "miss") {
			getDancer().miss()
			playSound("missnote", { volume: 0.1 });
			addJudgement("Miss")
			addComboText("break")
		// }

		if (GameState.health <= 0) goScene("death", { GameState: GameState } as paramsDeathScene)
	})

	// END SONG
	GameState.conductor.audioPlay.onEnd(() => {
		const songSaveScore = new saveScore()
		songSaveScore.idTitle = params.song.idTitle
		songSaveScore.tally = GameState.tally
		GameSave.songsPlayed.push(songSaveScore)
		goScene("results", { GameState: GameState } as paramsResultsScene)
	})

	onSceneLeave(() => {
		GameState.conductor.paused = true;
		GameState.conductor.audioPlay.stop()
	})
})}
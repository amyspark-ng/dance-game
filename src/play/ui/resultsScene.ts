import { Color, Texture } from "kaplay"
import { GameSave } from "../../core/gamesave"
import { songCharts } from "../../core/loader"
import { playSound } from "../../core/plugins/features/sound"
import { goScene } from "../../core/scenes"
import { paramsSongSelect } from "../../ui/songselectscene"
import { utils } from "../../utils"
import { Ranking, tallyUtils } from "../objects/scoring"
import { StateGame } from "../playstate"

/** Parameters for the result scene */
export type paramsResultsScene = {
	GameState: StateGame
}

export function getAnimsAccordingToRanking(ranking: Ranking) {
	if (ranking == "S+" || ranking == "S" || ranking == "A") return { initial: "idle", end: "victory" }
	else if (ranking == "B" || ranking == "C") return { initial: "miss", end: "victory" }
	else if (ranking == "F") return { initial: "victory", end: "miss" }
}

export function ResultsScene() { scene("results", (params: paramsResultsScene) => {
	setBackground(RED.lighten(60))
	
	/** Class that contains a dumb thing for each line in the tally countering */
	class tallyContainer {
		title: string; 
		value: number;
		color: Color;
	}

	const tallyThings:tallyContainer[] = [
		{ title: "score", value: params.GameState.tally.score, color: WHITE },
		{ title: "total notes", value: params.GameState.song.notes.length, color: WHITE },
		{ title: "hit notes", value: tallyUtils.hitNotes(params.GameState.tally), color: WHITE },
		{ title: "awesomes", value: params.GameState.tally.awesomes, color: BLUE.lighten(50) },
		{ title: "goods", value: params.GameState.tally.goods, color: GREEN.lighten(50) },
		{ title: "ehhs", value: params.GameState.tally.ehhs, color: BLACK.lighten(50) },
		{ title: "misses", value: params.GameState.tally.misses, color: utils.blendColors(BLUE, BLACK.lighten(50), 0.6) },
	]

	const initialX = 40
	const initialY = 40

	/** How cleared was the song */
	const cleared = tallyUtils.cleared(params.GameState.tally)

	/** The ranking you're gonna get */
	const ranking = tallyUtils.ranking(params.GameState.tally)

	/** The animations of the dancer according to the ranking you got */
	const anims = getAnimsAccordingToRanking(ranking)

	const drumroll = playSound("drumroll", { volume: 1 })
	const durationPerTally = drumroll.duration() / tallyThings.length

	tallyThings.forEach((tallyT, index) => {
		wait((durationPerTally + durationPerTally * index) / 2, () => {
			const tallyKeyF = tallyT.title.charAt(0).toUpperCase() + tallyT.title.slice(1) + ": "

			let textSize = 0
			if (tallyT.title == "score") textSize = 60
			else if (tallyT.title == "total notes" || tallyT.title == "hit notes") textSize = 50
			else textSize = 40

			const tallyText = add([
				text(tallyKeyF, { align: "left", size: textSize }),
				pos(-100, initialY + (textSize * 1.1) * index),
				anchor("left"),
				color(tallyT.color),
				{
					value: 0,
					update() {
						this.value = lerp(this.value, tallyT.value, 0.25)
						this.text = tallyKeyF + Math.round(this.value)
					}
				}
			])

			tween(tallyText.pos.x, initialX, 1, (p) => tallyText.pos.x = p, easings.easeOutQuint)
		})
	})

	wait(drumroll.duration() * 0.1, () => {
		const yourRankingText = add([
			text("Your ranking: ", { align: "left", size: 30 }),
			pos(initialX, height() - 50),
			anchor("left"),
		])
	})

	wait(drumroll.duration() * 0.8, () => {
		const endScale = vec2(1.2)
		
		const rankingObj = add([
			sprite("rank_" + ranking),
			pos(130, 395),
			scale(1.2),
			opacity(),
			anchor("center"),
		])
	
		rankingObj.fadeIn(0.25)
		tween(vec2(5), endScale, 0.25, (p) => rankingObj.scale = p)
	})

	const dancer = add([
		sprite("dancer_" + params.GameState.params.dancer),
		pos(),
		anchor("bot"),
		scale(0.8),
		z(1),
	])

	dancer.play(anims.initial, { loop: true })

	const clearObj = add([
		text("0%", { align: "center", size: 65 }),
		pos(center().x * 1.6, height() + 70 + dancer.height),
		anchor("center"),
		z(0),
		{
			value: 0,
			update() {
				this.text = Math.round(this.value) + "%"
			}
		}
	])

	clearObj.onUpdate(() => {
		dancer.pos.x = clearObj.pos.x
		dancer.pos.y = clearObj.pos.y - clearObj.height / 6
	})

	tween(clearObj.pos.y, height() - 80, drumroll.duration() / 2, (p) => clearObj.pos.y = p, easings.easeOutQuint)

	tween(clearObj.value, cleared, drumroll.duration(), (p) => {
		let oldValue = Math.round(clearObj.value)
		clearObj.value = p
		let newValue = Math.round(clearObj.value)
		if (oldValue != newValue) playSound("noteMove", { detune: 2 * cleared })
	}, easings.easeOutCirc)

	wait(drumroll.duration() + 1, () => {
		// what happens when the dancer reacts to the ranking
		dancer.play(anims.end, { loop: true })
	})

	onKeyPress("escape", () => {
		const indexOfSong = songCharts.indexOf(params.GameState.song)
		goScene("songselect", { index: indexOfSong > -1 ? indexOfSong : 0 } as paramsSongSelect)
	})
})}
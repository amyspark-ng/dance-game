import { GameSave } from "../../core/gamesave"
import { songCharts } from "../../core/loader"
import { playSound } from "../../core/plugins/features/sound"
import { goScene } from "../../core/scenes"
import { paramsSongSelect } from "../../ui/songselectscene"
import { utils } from "../../utils"
import { StateGame } from "../playstate"

/** Parameters for the result scene */
export type paramsResultsScene = {
	GameState: StateGame
}

export function ResultsScene() { scene("results", (params: paramsResultsScene) => {
	const dancer = add([
		sprite("dancer_" + params.GameState.params.dancer, { anim: "idle" }),
		pos(center().x + 100, center().y),
		anchor("center"),
	])	

	const tallyAndColor = {
		"awesomes": BLUE.lighten(50),
		"goods": GREEN.lighten(50),
		"ehhs": BLACK.lighten(50),
		"misses": utils.blendColors(BLUE, BLACK.lighten(50), 0.6),
	}

	const drumroll = playSound("drumroll")
	const durationPerTally = drumroll.duration() / Object.keys(tallyAndColor).length

	Object.keys(tallyAndColor).forEach((tallyKey, index) => {
		wait((durationPerTally + durationPerTally * index) / 2, () => {
			const tallyKeyF = tallyKey.charAt(0).toUpperCase() + tallyKey.slice(1) + ": "

			const tallyText = add([
				text(tallyKey, { align: "left" }),
				pos(-100, 50 + 50 * index),
				anchor("left"),
				color(tallyAndColor[tallyKey]),
				{
					value: 0,
					update() {
						this.value = lerp(this.value, params.GameState.tally[tallyKey], 0.25)
						this.text = tallyKeyF + Math.round(this.value)
					}
				}
			])

			tween(tallyText.pos.x, 50, 1, (p) => tallyText.pos.x = p, easings.easeOutQuint)
		})
	})

	wait(durationPerTally * Object.keys(tallyAndColor).length + drumroll.duration() + 0.5, () => {
		if (params.GameState.tally.cleared == 100) {
			dancer.play("victory", { loop: true })
		}
	
		else if (params.GameState.tally.cleared > 50) {
			dancer.play("victory", { loop: true })
		}
	
		else {
			dancer.play("victory", { loop: true })
		}
	})

	onKeyPress("escape", () => {
		const indexOfSong = songCharts.indexOf(params.GameState.song)
		goScene("songselect", { index: indexOfSong > -1 ? indexOfSong : 0 } as paramsSongSelect)
	})
})}
import kaplay, { KAPLAYOpt } from "kaplay"
import "kaplay/global"

import { utils } from "./utils"
import { initGame, PRODUCT } from "./core/initGame"

// # KAPLAY
const libraryOpts = {
	width: 1024,
	height: 576,
	canvas: document.querySelector("#kanva"),
	debugKey: "f2",
	debug: PRODUCT.DEBUG,
	loadingScreen: true,
	crisp: false,
	backgroundAudio: false,
	stretch: false,
	letterbox: false,
	maxFPS: 90,
	font: "lambdao",
} as KAPLAYOpt

utils.runInDesktop(() => {
	libraryOpts.stretch = true;
	libraryOpts.letterbox = true
})

console.log("EXECUTED GAME")
const k = kaplay(libraryOpts)

// // ===== WHERE THE GAME ACTUALLY STARTS =====
await initGame()
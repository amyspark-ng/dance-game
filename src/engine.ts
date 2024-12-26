import kaplay, { KAPLAYOpt } from "kaplay"
import "kaplay/global"

import { utils } from "./utils";

// # KAPLAY
const libraryOpts = {
	width: 1024,
	height: 576,
	canvas: document.querySelector("#kanva"),
	debugKey: "f1",
	debug: true,
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

console.log("EXECUTED KAPLAY")
const k = kaplay(libraryOpts)
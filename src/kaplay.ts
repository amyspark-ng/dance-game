import kaplay, { KAPLAYOpt } from "kaplay";
import "kaplay/global";

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
	font: "geo",
} as KAPLAYOpt;

utils.runInDesktop(() => {
	libraryOpts.stretch = true;
	libraryOpts.letterbox = true;
});

console.log("EXECUTED KAPLAY");
const k = kaplay(libraryOpts);

import { configure, InMemory } from "@zenfs/core";
import { IndexedDB } from "@zenfs/dom";

await configure({
	mounts: {
		"/tmp": InMemory,
		"/home": IndexedDB,
	},
	addDevices: true,
});

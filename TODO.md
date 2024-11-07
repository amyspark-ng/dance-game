- WHAT IF....
	* Cool system to create new songs from the chart editor scene
	* Create dialog system to ask to create new song and import sound file
	* Then be able to download it as a zip file which has the chart and the sound file

- SORTA BUNCH OF STUFF like all of the input being on playstate, all of that system could be better organized
- Game: Add the backgrounds system
- Game: Playback speed doesn't work at all
- Game: Fix the score increase/decrease text workings when missing, they don't display - when missing

- Chart Editor: Make camera follow the leading note in a way that it's always in the center of the grid row

- Results: Rehaul it, AGAIN, make it so it smoothly transitions from gameplay
- Results: Add combo and name of the song

- Pause: Doesn't say the song that is currently playing (bad)
- Pause: Dancer doesn't move leave fast enough so there's 2 dancers at the same time
- Pause: Sometimes the buttons stay after pausing and unpausing too fast
	Should rehaul the pause ui system it's kinda sucky

- Save: Add unlocked dancers system
- Options: Add something to the noteskins to signify which one is currently selected

<!-- - Add events for bpm changes, this can be done with having an array of ChartBPM which would have something like this
```ts
class ChartBPM {
	time: 20.6
	value: 160,
	tweenSpeed: 0,
}
```

And then a song will have an array of that and when time is reached a tween will get triggered which will be linear and will take 'tweenSpeed' seconds, and then do Conductor.changeBPM(p) -->
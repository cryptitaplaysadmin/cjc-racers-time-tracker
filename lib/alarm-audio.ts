'use client'

let audio: HTMLAudioElement | null = null
let previewTimeout: ReturnType<typeof setTimeout> | undefined
function player() {
  if (!audio) { audio = new Audio('/alarm-ringtone.mp3'); audio.preload = 'auto' }
  return audio
}
export async function playRingtone() {
  clearTimeout(previewTimeout)
  const element = player()
  element.loop = true
  await element.play()
}
export function stopRingtone() {
  clearTimeout(previewTimeout)
  if (audio) { audio.pause(); audio.currentTime = 0 }
}
// Called directly from a click, reusing the same media element for future alarms.
export async function previewRingtone() {
  stopRingtone()
  await playRingtone()
  previewTimeout = setTimeout(stopRingtone, 3000)
}

/* Fig. 5's search for every eclipse over Kathmandu, 1900 to 2100. Each one takes tens of milliseconds
   to find, and the search runs just as the reader arrives at the section, so it has its own thread. */
import {nextSolarEclipseAt, julianDayFromDate, dateFromJulianDay} from '@grahan/core';

const OBS = {latitude: 27.7172, longitude: 85.324};
const MAX = Date.UTC(2100, 11, 31, 18);
const toMs = jd => dateFromJulianDay(jd).getTime();

let j = julianDayFromDate(new Date(Date.UTC(1900, 0, 1, 6)));
for (;;) {
  let e = null;
  try { e = nextSolarEclipseAt(j, OBS); } catch (err) { /* past the engine's range */ }
  if (!e || toMs(e.maximum) > MAX) break;
  postMessage({c1: toMs(e.firstContact), max: toMs(e.maximum), c4: toMs(e.fourthContact), mag: e.magnitude, obs: e.obscuration, type: e.type});
  j = e.fourthContact + 1;
}
postMessage(null);

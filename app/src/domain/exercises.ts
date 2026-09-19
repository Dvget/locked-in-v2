// Exercise library (public domain data, see src/data/exercises/ExerciseLibrary-LICENSE.txt), German display names,
// bilingual search and user-created custom exercises (D-043). Port of ExerciseLibrary/ExerciseCatalog/ExerciseSearch.
import library from '../data/exercises/exercise-library.json';
import displayNamesJson from '../data/exercises/exercise-display-names.json';
import variants from '../data/exercises/exercise-variants.json';
import { newId } from './dates';
import type { PlannedExercise, TrainingPlan } from './plans';
import { CATALOG_LINKS, legacyRepsOnly, stableExerciseID } from './strength';

export interface LibraryExercise {
  id: string;
  name: string;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

export interface ExerciseDefinition {
  id: string;
  name: string;
  shortName: string;
  repsOnly: boolean;
  defaultIncrement: number;
  equipment: string;
  group: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  isCustom: boolean;
}

export interface CustomExercise {
  id: string;
  name: string;
  equipment: string | null;
  primaryMuscles: string[];
  repsOnly: boolean;
}

const displayNames = displayNamesJson as Record<string, string>;
const collator = new Intl.Collator('de', { numeric: true });

export const allLibraryExercises: LibraryExercise[] = [
  ...(library as LibraryExercise[]),
  ...(variants as LibraryExercise[]),
].sort((a, b) => collator.compare(a.name, b.name));

const lookup = new Map(allLibraryExercises.map((e) => [e.id, e]));

let customExercises: CustomExercise[] = [];

export function setCustomExercises(list: CustomExercise[]): void {
  customExercises = list.slice();
}
export function getCustomExercises(): CustomExercise[] {
  return customExercises;
}
export function newCustomExercise(name: string, equipment: string | null, muscle: string, repsOnly: boolean): CustomExercise {
  return { id: `custom:${newId()}`, name: name.trim(), equipment, primaryMuscles: [muscle], repsOnly };
}

export function muscleGroup(muscle: string): string {
  switch (muscle) {
    case 'chest':
      return 'Brust';
    case 'lats':
    case 'middle back':
    case 'lower back':
    case 'traps':
      return 'Rücken';
    case 'shoulders':
      return 'Schultern';
    case 'biceps':
    case 'triceps':
    case 'forearms':
      return 'Arme';
    case 'quadriceps':
    case 'hamstrings':
    case 'calves':
    case 'adductors':
    case 'abductors':
    case 'glutes':
      return 'Beine & Gesäß';
    case 'abdominals':
      return 'Bauch';
    default:
      return 'Weitere';
  }
}

export const MUSCLE_GROUPS = ['Brust', 'Rücken', 'Schultern', 'Arme', 'Beine & Gesäß', 'Bauch', 'Weitere'] as const;

export function equipmentName(equipment: string | null | undefined): string {
  switch (equipment) {
    case 'dumbbell':
      return 'Kurzhantel';
    case 'barbell':
    case 'e-z curl bar':
      return 'Langhantel';
    case 'cable':
      return 'Kabelzug';
    case 'machine':
      return 'Maschine';
    case 'body only':
    case null:
    case undefined:
      return 'Körpergewicht';
    case 'kettlebells':
      return 'Kettlebell';
    case 'bands':
      return 'Band';
    default:
      return 'Sonstiges';
  }
}

export function defaultIncrement(id: string): number {
  const item = lookup.get(CATALOG_LINKS[id] ?? id);
  if (item?.equipment) {
    switch (item.equipment) {
      case 'dumbbell':
      case 'kettlebells':
        return 2;
      case 'barbell':
      case 'e-z curl bar':
        return 5;
      default:
        return 2.5;
    }
  }
  if (['db_bench_flat', 'goblet_squat', 'rdl_dumbbell', 'lateral_dumbbell'].includes(id)) return 2;
  if (['bb_bench_incline', 'bb_bench_flat', 'barbell_squat', 'rdl_barbell', 'leg_press'].includes(id)) return 5;
  return 2.5;
}

const LEGACY_IDS = new Set([
  'db_bench_flat', 'bb_bench_incline', 'bb_bench_flat', 'barbell_squat', 'leg_press', 'goblet_squat',
  'pullup_straight', 'pullup_wide_angle', 'pullup_narrow', 'pullup_narrow_angle', 'rdl_barbell', 'rdl_dumbbell',
  'row_narrow', 'row_wide', 'lateral_dumbbell', 'lateral_cable', 'hyperextensions', 'cable_crunch',
  'hanging_knee_raise', 'plank',
]);

/** Resolves any exercise id (historical, library or custom). Unknown ids yield null. */
export function exerciseDefinition(id: string): ExerciseDefinition | null {
  const custom = customExercises.find((c) => c.id === id);
  if (custom) {
    const muscle = custom.primaryMuscles[0] ?? '';
    return {
      id: custom.id, name: custom.name, shortName: custom.name, repsOnly: custom.repsOnly,
      defaultIncrement: 2.5, equipment: equipmentName(custom.equipment), group: muscleGroup(muscle),
      primaryMuscles: custom.primaryMuscles, secondaryMuscles: [], isCustom: true,
    };
  }
  const item = lookup.get(CATALOG_LINKS[id] ?? id);
  if (!item) return null;
  const stable = stableExerciseID(id);
  const name = displayNames[item.id] ?? item.name;
  return {
    id: stable,
    name,
    shortName: name,
    repsOnly: LEGACY_IDS.has(stable) ? legacyRepsOnly(stable) : item.equipment === 'body only',
    defaultIncrement: defaultIncrement(id),
    equipment: equipmentName(item.equipment),
    group: muscleGroup(item.primaryMuscles[0] ?? ''),
    primaryMuscles: item.primaryMuscles,
    secondaryMuscles: item.secondaryMuscles,
    isCustom: false,
  };
}

/** Best available display name; falls back to the id (history must never break). */
export function exerciseName(id: string, fallback?: string): string {
  return exerciseDefinition(id)?.name ?? fallback ?? id;
}

/** Resolver used by the strength metrics. Unknown ids fall back to the legacy rule. */
export function isRepsOnlyExercise(id: string): boolean {
  return exerciseDefinition(id)?.repsOnly ?? legacyRepsOnly(id);
}

// ------------------------------------------------------------ search

function normalized(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join(' ');
}

// Whole movement phrases, not just muscle names, to avoid irrelevant results.
const ALIAS_SOURCE: [string, string][] = [
  ['bench press', 'Bankdrücken Brustdrücken'], ['dumbbell press', 'Kurzhanteldrücken'],
  ['incline', 'Schrägbank schräg'], ['decline', 'Negativbank negativ'],
  ['incline dumbbell press', 'Schrägbankdrücken Bankdrücken'], ['incline barbell', 'Schrägbankdrücken'],
  ['decline dumbbell press', 'Negativbankdrücken Bankdrücken'],
  ['chest press', 'Brustpresse Bankdrücken Brustdrücken'], ['floor press', 'Bodendrücken Bankdrücken'],
  ['fly', 'Fliegende Flys Butterfly'], ['flies', 'Fliegende Flys Butterfly'],
  ['crossover', 'Kabelüberkreuzen Butterfly'], ['push up', 'Liegestütz Liegestütze'],
  ['pushup', 'Liegestütz Liegestütze'], ['push ups', 'Liegestütz Liegestütze'],
  ['pullover', 'Überzug Überzüge'], ['squat', 'Kniebeuge Kniebeugen Squats'],
  ['front squat', 'Frontkniebeuge'], ['goblet', 'Goblet Kelch'], ['hack', 'Hackenschmidt'],
  ['leg press', 'Beinpresse'], ['leg extension', 'Beinstrecker Beinstrecken'],
  ['leg curl', 'Beinbeuger Beinbeugen'], ['hamstring curl', 'Beinbeuger Beinbeugen'],
  ['lunge', 'Ausfallschritt Ausfallschritte'], ['split squat', 'Ausfallschritt Bulgarische Kniebeuge'],
  ['step up', 'Aufsteigen Aufsteiger'], ['deadlift', 'Kreuzheben'],
  ['romanian', 'Rumänisch Rumänisches RDL'], ['stiff leg', 'Gestreckte Beine'],
  ['straight leg', 'Gestreckte Beine'], ['good morning', 'Rumpfbeugen Goodmornings'],
  ['hip thrust', 'Hüftheben Beckenheben'], ['glute bridge', 'Gluteusbrücke Hüftheben Beckenheben'],
  ['glute kickback', 'Gesäßstrecken Hüftstrecken'], ['butt lift', 'Beckenheben Hüftheben'],
  ['calf', 'Wadenheben Waden'], ['calves', 'Wadenheben Waden'], ['adductor', 'Adduktoren'],
  ['adduction', 'Adduktion Adduktoren'], ['abductor', 'Abduktoren'], ['abduction', 'Abduktion Abduktoren'],
  ['pull up', 'Klimmzug Klimmzüge'], ['pullup', 'Klimmzug Klimmzüge'],
  ['chin up', 'Klimmzug Klimmzüge Untergriff'], ['chinup', 'Klimmzug Klimmzüge Untergriff'],
  ['pulldown', 'Latzug Latziehen'], ['pull down', 'Latzug Latziehen'], ['row', 'Rudern Ruderzug'],
  ['bent over', 'Vorgebeugt vorgebeugtes'], ['t bar', 'T Stange'], ['face pull', 'Gesichtziehen Facepull'],
  ['shrug', 'Schulterheben Nackenheben'],
  ['back extension', 'Rückenstrecken Rückenstrecker Hyperextension'],
  ['hyperextension', 'Rückenstrecken Rückenstrecker'], ['superman', 'Rückenstrecken'],
  ['shoulder press', 'Schulterdrücken Überkopfdrücken'], ['military press', 'Schulterdrücken Überkopfdrücken'],
  ['overhead press', 'Schulterdrücken Überkopfdrücken'], ['arnold', 'Arnolddrücken Schulterdrücken'],
  ['lateral raise', 'Seitheben'], ['side lateral', 'Seitheben'], ['front raise', 'Frontheben'],
  ['rear delt', 'Hintere Schulter Reverse Butterfly'],
  ['reverse fly', 'Reverse Butterfly Vorgebeugtes Seitheben'], ['upright row', 'Aufrechtes Rudern'],
  ['curl', 'Beugen Curls'], ['bicep', 'Bizeps Bizepsbeugen'], ['hammer', 'Hammergriff Hammercurls'],
  ['preacher', 'Scott Scottbank'], ['concentration', 'Konzentrationscurl'],
  ['incline dumbbell curl', 'Schrägbankcurls'], ['triceps', 'Trizeps'], ['tricep', 'Trizeps'],
  ['pushdown', 'Trizepsdrücken Trizepsstrecken'], ['push down', 'Trizepsdrücken Trizepsstrecken'],
  ['triceps extension', 'Trizepsstrecken Trizepsdrücken'], ['skullcrusher', 'Stirndrücken Frenchpress'],
  ['skull crusher', 'Stirndrücken Frenchpress'], ['kickback', 'Kickbacks Rückwärtsstrecken'],
  ['dip', 'Dips Barrenstütz'], ['wrist curl', 'Unterarmcurl Handgelenkbeugen'],
  ['wrist roller', 'Unterarmroller'], ['crunch', 'Bauchpressen Bauchpresse Bauchbeugen'],
  ['sit up', 'Rumpfheben Situps'], ['situp', 'Rumpfheben Situps'], ['leg raise', 'Beinheben'],
  ['knee raise', 'Knieheben'], ['knee hip raise', 'Knieheben Hüftheben'], ['plank', 'Unterarmstütz'],
  ['side plank', 'Seitstütz Seitlicher Unterarmstütz'], ['ab roller', 'Bauchroller'],
  ['ab rollout', 'Bauchroller'], ['russian twist', 'Russische Drehung Rumpfdrehen'],
  ['woodchop', 'Holzhacker Rumpfdrehen'], ['wood chop', 'Holzhacker Rumpfdrehen'],
  ['side bend', 'Seitbeugen'], ['mountain climber', 'Bergsteiger'], ['hanging', 'Hängend hängendes'],
  ['clean', 'Umsetzen'], ['snatch', 'Reißen'], ['jerk', 'Stoßen'], ['swing', 'Schwingen'],
  ['turkish get up', 'Türkisches Aufstehen'], ['farmer', 'Bauernlauf Tragen'], ['carry', 'Tragen'],
  ['jump', 'Sprung Springen'], ['rope', 'Seil'], ['box', 'Box Kasten'], ['burpee', 'Burpees Liegestützsprung'],
  ['running', 'Laufen'], ['walking', 'Gehen gehend'], ['cycling', 'Radfahren'], ['bicycling', 'Radfahren'],
  ['treadmill', 'Laufband'], ['elliptical', 'Crosstrainer'], ['stretch', 'Dehnen Dehnung'],
  ['foam roll', 'Faszienrolle'], ['neck', 'Nacken Hals'], ['rotation', 'Drehung Rotation'],
  ['dumbbell', 'Kurzhantel KH'], ['barbell', 'Langhantel LH'], ['cable', 'Kabelzug Seilzug'],
  ['machine', 'Maschine Gerät'], ['smith', 'Multipresse Smithmaschine'], ['ez', 'SZ Stange'],
  ['e z', 'SZ Stange'], ['band', 'Widerstandsband Gummiband'], ['body only', 'Körpergewicht Eigengewicht'],
  ['bodyweight', 'Körpergewicht Eigengewicht'], ['seated', 'Sitzend sitzendes'],
  ['standing', 'Stehend stehendes'], ['lying', 'Liegend liegendes'], ['supine', 'Rückenlage'],
  ['prone', 'Bauchlage'], ['single arm', 'Einarmig einarmiges'], ['one arm', 'Einarmig einarmiges'],
  ['single leg', 'Einbeinig einbeiniges'], ['one leg', 'Einbeinig einbeiniges'],
  ['alternating', 'Abwechselnd alternierend'], ['close grip', 'Enger Griff eng'],
  ['wide grip', 'Breiter Griff breit'], ['reverse grip', 'Untergriff'], ['underhand', 'Untergriff'],
  ['overhand', 'Obergriff'], ['neutral grip', 'Neutralgriff Parallelgriff'],
  ['assisted', 'Unterstützt assistiert'], ['weighted', 'Zusatzgewicht gewichtet'],
  ['flat', 'Flach Flachbank'], ['incline bench', 'Schrägbank'], ['chest', 'Brust'],
  ['shoulder', 'Schulter'], ['back', 'Rücken'], ['abdominal', 'Bauch'], ['hamstring', 'Beinbeuger'],
  ['quadriceps', 'Quadrizeps Beinstrecker'],
];
const ALIASES = ALIAS_SOURCE.map(([en, de]) => [normalized(en), normalized(de)] as const);
const indexCache = new Map<string, string>();

function searchIndex(id: string, name: string, group: string, equipment: string): string {
  const key = `${id}|${name}|${group}|${equipment}`;
  const cached = indexCache.get(key);
  if (cached !== undefined) return cached;
  const original = normalized(`${id} ${name}`);
  let index = `${original} ${normalized(`${group} ${equipment}`)}`;
  for (const [en, de] of ALIASES) if (original.includes(en)) index += ` ${de}`;
  const eq = normalized(equipment);
  if (eq.includes('kurzhantel')) index += ' kh';
  if (eq.includes('langhantel')) index += ' lh';
  index += ` ${index.replace(/ /g, '')}`;
  indexCache.set(key, index);
  return index;
}

export function exerciseMatchesQuery(query: string, id: string, name: string, group: string, equipment: string): boolean {
  const terms = normalized(query).split(' ').filter(Boolean);
  if (terms.length === 0) return true;
  const index = searchIndex(id, name, group, equipment);
  return terms.every((t) => index.includes(t));
}

/** All exercises (custom first, then library) matching the query, as resolved definitions. */
export function searchExercises(query: string, limit = 60): ExerciseDefinition[] {
  const out: ExerciseDefinition[] = [];
  const push = (def: ExerciseDefinition | null) => {
    if (def && exerciseMatchesQuery(query, def.id, def.name, def.group, def.equipment)) out.push(def);
  };
  for (const c of customExercises) {
    push(exerciseDefinition(c.id));
    if (out.length >= limit) return out;
  }
  const seen = new Set<string>();
  for (const item of allLibraryExercises) {
    const def = exerciseDefinition(item.id);
    if (!def || seen.has(def.id)) continue;
    seen.add(def.id);
    push(def);
    if (out.length >= limit) break;
  }
  return out;
}

// ------------------------------------------------------------ legacy default plan

const LEGACY_SLOTS: { defaultID: string; alternatives: string[] }[] = [
  { defaultID: 'db_bench_flat', alternatives: ['bb_bench_incline', 'bb_bench_flat'] },
  { defaultID: 'barbell_squat', alternatives: ['leg_press', 'goblet_squat'] },
  { defaultID: 'pullup_straight', alternatives: ['pullup_wide_angle', 'pullup_narrow', 'pullup_narrow_angle'] },
  { defaultID: 'rdl_barbell', alternatives: ['rdl_dumbbell'] },
  { defaultID: 'row_narrow', alternatives: ['row_wide'] },
  { defaultID: 'lateral_dumbbell', alternatives: ['lateral_cable'] },
  { defaultID: 'hyperextensions', alternatives: ['cable_crunch', 'hanging_knee_raise', 'plank'] },
];

/** The legacy "Full Body" plan, seeded once on first launch. */
export function defaultFullBodyPlan(): TrainingPlan {
  const entries: PlannedExercise[] = LEGACY_SLOTS.map((slot) => ({
    id: newId(),
    exerciseID: slot.defaultID,
    alternativeIDs: slot.alternatives,
    sets: 3,
    startingWeight: 0,
    startingReps: 8,
    weightIncrement: defaultIncrement(slot.defaultID),
    restSeconds: null,
    catalogID: null,
  }));
  return { id: newId(), name: 'Full Body', weeklyFrequency: 2, entries, workoutType: 'Ganzkörper' };
}
